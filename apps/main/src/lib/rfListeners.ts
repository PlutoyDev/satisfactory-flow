import { ClipboardEvent, DragEvent } from 'react';
import { Edge, Connection, OnSelectionChangeParams, ReactFlowInstance, XYPosition } from '@xyflow/react';
import { atom } from 'jotai';
import { isDeepEqual } from 'remeda';
import { z } from 'zod';
import { FactoryNodeType } from '../components/rf/BaseNode';
import {
  generateId,
  MAIN_EDGE_PROP_SCHEMA,
  MAIN_NODE_PROP_SCHEMA,
  MainEdgeProp,
  MainNodeProp,
  pickMainEdgeProp,
  pickMainNodeProp,
  splitHandleId,
} from './data';
import {
  store,
  edgesAtom,
  nodesAtom,
  nodesMapAtom,
  selectedFlowAtom,
  edgesMapAtom,
  HistoryEvent,
  pushHistoryEvent,
  ExtendedNode,
  appendStatusMessage,
  pushAndTriggerDebouncedAction,
} from './store';

export const connectionErrorReasonAtom = atom<string | null>(null);
export const isDraggingNodeAtom = atom(false);
export const reactflowInstanceAtom = atom<ReactFlowInstance | null>(null);

export function isValidConnection(params: Connection | Edge): boolean {
  const selectedFlow = store.get(selectedFlowAtom);
  if (selectedFlow?.source !== 'db') {
    store.set(connectionErrorReasonAtom, 'Cannot modify this flow');
    return false;
  }
  const { source, sourceHandle, target, targetHandle } = params;
  if (source === target) {
    store.set(connectionErrorReasonAtom, 'Cannot connect a node to itself');
    return false;
  }
  if (!sourceHandle || !targetHandle) {
    store.set(connectionErrorReasonAtom, 'Invalid Node (please submit a bug report)');
    return false;
  }
  const sourceIntData = splitHandleId(sourceHandle);
  const targetIntData = splitHandleId(targetHandle);
  if (sourceIntData.type === targetIntData.type) {
    store.set(connectionErrorReasonAtom, `Cannot connect ${sourceIntData.type}put to ${targetIntData.type}put`);
    return false;
  }
  if (sourceIntData.form !== targetIntData.form) {
    store.set(connectionErrorReasonAtom, `Cannot connect ${sourceIntData.form} to ${targetIntData.form}`);
    return false;
  }
  const sourceNodeAdditionalProp = store.get(nodesMapAtom).get(source);
  if (sourceNodeAdditionalProp?.edges?.has(sourceHandle)) {
    store.set(connectionErrorReasonAtom, `Source already connected`);
    return false;
  }
  const targetNodeAdditionalProp = store.get(nodesMapAtom).get(target);
  if (targetNodeAdditionalProp?.edges?.has(targetHandle)) {
    store.set(connectionErrorReasonAtom, `Target already connected`);
    return false;
  }

  store.set(connectionErrorReasonAtom, null);
  return true;
}

export function addEdge(edgeParams: Edge | Connection) {
  const edgeType = splitHandleId(edgeParams.sourceHandle!)?.form === 'solid' ? 'belt' : 'pipe';
  store.set(edgesAtom, [
    {
      type: 'add',
      item: {
        id: generateId(),
        type: edgeType,
        source: edgeParams.source,
        target: edgeParams.target,
        sourceHandle: edgeParams.sourceHandle ?? undefined,
        targetHandle: edgeParams.targetHandle ?? undefined,
      },
    },
  ]);
}

export function onDrop(event: DragEvent<HTMLDivElement>) {
  event.preventDefault();
  const rfInstance = store.get(reactflowInstanceAtom);
  if (!rfInstance) {
    return;
  }
  const type = event.dataTransfer.getData('application/reactflow') as FactoryNodeType;
  const position = rfInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
  store.set(nodesAtom, [
    {
      type: 'add',
      item: { id: generateId(), position, type, data: {} },
    },
  ]);
  store.set(isDraggingNodeAtom, false);
}

export const selectedIdsAtom = atom<string[]>([]);

export function onSelectionChange(params: OnSelectionChangeParams) {
  const selectedIds = [...params.nodes.map(node => node.id), ...params.edges.map(edge => edge.id)];
  store.set(selectedIdsAtom, selectedIds);
}

type AlignAxis = 'x' | 'y';
type AlignTo = 'start' | 'center' | 'end';

type AlignOptions = {
  axis: AlignAxis;
  to: AlignTo;
};

export function alignSelectedNodes(opt: AlignOptions) {
  const selectedIds = store.get(selectedIdsAtom);
  const nodes = new Map(store.get(nodesMapAtom));
  // Accumulation
  const selectedNodes: ExtendedNode[] = [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const id of selectedIds) {
    const node = nodes.get(id);
    if (!node) continue; // Skip if node is not found, ie an edge
    if (!node.measured?.width || !node.measured?.height) {
      appendStatusMessage({ type: 'error', message: 'Try again later' });
      return;
    }
    selectedNodes.push(node);
    minX = Math.min(minX, node.position.x - node.measured.width / 2);
    minY = Math.min(minY, node.position.y - node.measured.height / 2);
    maxX = Math.max(maxX, node.position.x + node.measured.width / 2);
    maxY = Math.max(maxY, node.position.y + node.measured.height / 2);
  }
  if (selectedNodes.length < 2) {
    appendStatusMessage({ type: 'error', message: 'At least 2 nodes required' });
    return;
  }
  const rangeX = maxX - minX;
  const rangeY = maxY - minY;
  const midX = minX + rangeX / 2;
  const midY = minY + rangeY / 2;

  const crossAxis = opt.axis === 'x' ? 'y' : 'x';
  const crossAxisPosition = { startx: minX, starty: minY, centerx: midX, centery: midY, endx: maxX, endy: maxY }[`${opt.to}${crossAxis}`];

  const ids: string[] = [];
  const currentHistoryEvent: HistoryEvent = [];
  for (let i = 0; i < selectedNodes.length; i++) {
    const node = selectedNodes[i];
    const newPosition: XYPosition = { ...node.position };
    if (crossAxisPosition) {
      const size = node.measured![crossAxis === 'x' ? 'width' : 'height']!;
      newPosition[crossAxis] = crossAxisPosition - (opt.to === 'start' ? -size / 2 : opt.to === 'end' ? size / 2 : 0);
    }
    currentHistoryEvent.push({ type: 'change', itemType: 'node', itemId: node.id, patch: { position: node.position } });
    nodes.set(node.id, { ...node, position: newPosition });
    ids.push(node.id);
  }
  store.set(nodesMapAtom, nodes);
  pushHistoryEvent(currentHistoryEvent);
  pushAndTriggerDebouncedAction({ nodes: ids });
}

const CLIPBOARD_DATA_SCHEMA = z.object({
  clipDataId: z.string(),
  nodes: z.array(MAIN_NODE_PROP_SCHEMA),
  edges: z.array(MAIN_EDGE_PROP_SCHEMA),
  viewport: z.object({ x: z.number(), y: z.number(), zoom: z.number() }),
});

type ClipboardData = z.infer<typeof CLIPBOARD_DATA_SCHEMA>;

let clipDataId: string | undefined;
let pasteCount = 0;

function toClipboardData(isCut: boolean) {
  // Copies all selected nodes and edges to clipboard as JSON
  const nodes = store.get(nodesMapAtom);
  const edges = store.get(edgesMapAtom);
  const selectedIds = store.get(selectedIdsAtom);

  if (selectedIds.length === 0) {
    throw new Error('No selected nodes or edges');
  }

  const copiedNodes: MainNodeProp[] = [];
  const copiedEdges: MainEdgeProp[] = [];

  const currentHistoryEvent: HistoryEvent = [];
  for (const id of selectedIds) {
    if (nodes.has(id)) {
      const pickedNode = pickMainNodeProp(nodes.get(id)!);
      copiedNodes.push(pickedNode);
      if (isCut) {
        currentHistoryEvent.push({ type: 'remove', itemType: 'node', itemId: id, item: pickedNode });
        nodes.delete(id);
      }
    } else if (edges.has(id)) {
      const pickedEdge = pickMainEdgeProp(edges.get(id)!);
      copiedEdges.push(pickedEdge);
      if (isCut) {
        currentHistoryEvent.push({ type: 'remove', itemType: 'edge', itemId: id, item: pickedEdge });
        edges.delete(id);
      }
    } else {
      throw new Error('Invalid selected id');
    }

    if (isCut) {
      store.set(nodesMapAtom, new Map(nodes));
      store.set(edgesMapAtom, new Map(edges));
      pushHistoryEvent(currentHistoryEvent);
    }
  }

  clipDataId = generateId();
  pasteCount = isCut ? -1 : 0;

  const copiedData: ClipboardData = {
    clipDataId,
    nodes: copiedNodes,
    edges: copiedEdges,
    viewport: store.get(reactflowInstanceAtom)!.getViewport(),
  };
  // e.clipboardData?.setData(CLIPBOARD_DATA_TYPE, JSON.stringify(copiedData));
  pasteCount = 0;
  appendStatusMessage({
    type: 'info',
    message: `${isCut ? 'Cuting' : 'Copying'} ${copiedNodes.length} nodes and ${copiedEdges.length} edges`,
  });
  return JSON.stringify(copiedData);
}

export function onCutOrCopy(e: ClipboardEvent<HTMLDivElement>) {
  console.log('onCutOrCopy', e.currentTarget);
  try {
    e.preventDefault();
    const isCut = e.type === 'cut';
    const data = toClipboardData(isCut);
    e.clipboardData?.setData('text/plain', data);
    appendStatusMessage({ type: 'info', message: `${isCut ? 'Cut' : 'Copied'} to clipboard` });
  } catch (error) {
    if (error instanceof Error) {
      appendStatusMessage({ type: 'error', message: `Failed to ${e.type}: ${error.message}` });
    } else {
      appendStatusMessage({ type: 'error', message: `Failed to ${e.type}: Unknown error` });
      console.error(error);
    }
  }
}

export async function excuteCustomCutOrCopy(isCut: boolean) {
  // Custom implementation of cut/copy for custom context menu and toolbar
  // Uses the browser's navigator.clipboard API
  try {
    const data = toClipboardData(isCut);
    await navigator.clipboard.writeText(data);
    appendStatusMessage({ type: 'info', message: `${isCut ? 'Cut' : 'Copied'} to clipboard` });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotAllowedError') {
      // NotAllowedError: The request is not allowed by the user agent or the platform in the current context, possibly because the user denied permission.
      appendStatusMessage({ type: 'error', message: `Clipboard access denied: ${error.message}` });
      if (isCut)
        appendStatusMessage({
          type: 'info',
          message: 'Alternatively, you can use (Ctrl/Cmd)+X to cut which does not require clipboard access',
        });
      else
        appendStatusMessage({
          type: 'info',
          message: 'Alternatively, you can use (Ctrl/Cmd)+C to copy which does not require clipboard access',
        });
    } else if (error instanceof Error) {
      appendStatusMessage({ type: 'error', message: `Failed to ${isCut ? 'cut' : 'copy'}: ${error.message}` });
    } else {
      appendStatusMessage({ type: 'error', message: `Failed to ${isCut ? 'cut' : 'copy'}: Unknown error` });
      console.error(error);
    }
  }
}

function fromClipboardData(data: string) {
  // If clipboard contains JSON
  //  Parse JSON
  // If there is one node selected and copied
  //  Modify the selected node with the data from the copied node
  // If there are none or multiple nodes or any edges selected
  //  Deselect all nodes and edges
  //  Add the copied nodes and edges to the flow wiht it selected
  try {
    const copiedData = JSON.parse(data);
    const { nodes: copiedNodes, edges: copiedEdges, viewport: copiedViewport } = CLIPBOARD_DATA_SCHEMA.parse(copiedData);
    pasteCount = copiedData.clipDataId === clipDataId ? pasteCount + 1 : 1;
    const nodes = store.get(nodesMapAtom);
    const edges = store.get(edgesMapAtom);
    const selectedIds = store.get(selectedIdsAtom);
    if (
      selectedIds.length === copiedNodes.length &&
      copiedNodes.length === 1 &&
      copiedEdges.length === 0 &&
      selectedIds[0] !== copiedNodes[0].id
    ) {
      const selectedNode = nodes.get(selectedIds[0])!;
      const copiedNode = copiedNodes[0];
      if (selectedNode.type === copiedNode.type && !isDeepEqual(selectedNode.data, copiedNode.data)) {
        store.set(nodesAtom, [
          {
            id: selectedNode.id,
            type: 'replace',
            item: { ...selectedNode, data: copiedNode.data },
          },
        ]);
        return;
      }
    }
    store.set(selectedIdsAtom, []);
    const currentHistoryEvent: HistoryEvent = [];
    const newNodes = new Map<string, ExtendedNode>();
    const newEdges = new Map<string, Edge>();
    // Deselct all nodes and edges
    for (const node of nodes.values()) {
      if (node.selected) newNodes.set(node.id, { ...node, selected: false });
      else newNodes.set(node.id, node);
    }
    for (const edge of edges.values()) {
      if (edge.selected) newEdges.set(edge.id, { ...edge, selected: false });
      else newEdges.set(edge.id, edge);
    }
    // Add copied nodes and edges (with new ids) to the flow
    const newNodeIdMap = new Map<string, string>();
    const newEdgeIds = new Set<string>();
    const viewport = store.get(reactflowInstanceAtom)!.getViewport();
    copiedData.viewport = viewport;
    const nodeXOffset = viewport.x === copiedViewport.x ? pasteCount * 72 : copiedViewport.x - viewport.x + (pasteCount - 1) * 72;
    const nodeYOffset = viewport.y === copiedViewport.y ? pasteCount * 72 : copiedViewport.y - viewport.y + (pasteCount - 1) * 72;

    for (const node of copiedNodes) {
      const newNodeId = generateId();
      newNodeIdMap.set(node.id, newNodeId);
      currentHistoryEvent.push({ type: 'add', itemType: 'node', itemId: newNodeId });
      newNodes.set(newNodeId, {
        ...node,
        id: newNodeId,
        position: { x: node.position.x + nodeXOffset, y: node.position.y + nodeYOffset },
        selected: true,
        edges: new Map(),
      });
    }
    for (const edge of copiedEdges) {
      const newEdgeId = generateId();
      newEdgeIds.add(newEdgeId);
      const sourceId = newNodeIdMap.get(edge.source);
      const targetId = newNodeIdMap.get(edge.target);
      // Skip the edge if either source or target is not copied
      if (!sourceId || !targetId) continue;
      currentHistoryEvent.push({ type: 'add', itemType: 'edge', itemId: newEdgeId });
      newEdges.set(newEdgeId, { ...edge, id: newEdgeId, source: sourceId, target: targetId });
      newNodes.get(sourceId)!.edges!.set(edge.sourceHandle!, newEdgeId);
      newNodes.get(targetId)!.edges!.set(edge.targetHandle!, newEdgeId);
    }
    store.set(nodesMapAtom, newNodes);
    store.set(edgesMapAtom, newEdges);

    pushHistoryEvent(currentHistoryEvent);
    pushAndTriggerDebouncedAction({ nodes: newNodeIdMap.values(), edges: newEdgeIds });
    appendStatusMessage({ type: 'info', message: `Pasted ${copiedNodes.length} nodes and ${copiedEdges.length} edges` });
  } catch (error) {
    if (error instanceof z.ZodError) {
      appendStatusMessage({ type: 'error', message: `Invalid clipboard data: ${error.errors.map(e => e.message).join(', ')}` });
    } else if (error instanceof SyntaxError) {
      appendStatusMessage({ type: 'error', message: 'Invalid clipboard data' });
    } else {
      appendStatusMessage({ type: 'error', message: 'Unknown error' });
      throw error;
    }
  }
}

export function onPaste(e: ClipboardEvent<HTMLDivElement>) {
  e.preventDefault();
  const clipboardData = e.clipboardData?.getData('text/plain');
  if (!clipboardData) {
    appendStatusMessage({ type: 'error', message: 'Unknown/Empty clipboard data' });
    return;
  }

  fromClipboardData(clipboardData);
}

export async function excuteCustomPaste() {
  try {
    const clipboardData = await navigator.clipboard.readText();
    fromClipboardData(clipboardData);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotAllowedError') {
      // NotAllowedError: The request is not allowed by the user agent or the platform in the current context, possibly because the user denied permission.
      appendStatusMessage({ type: 'error', message: `Clipboard access denied: ${error.message}` });
      appendStatusMessage({
        type: 'info',
        message: 'Alternatively, you can use (Ctrl/Cmd)+V to paste which does not require clipboard access',
      });
    } else if (error instanceof Error) {
      appendStatusMessage({ type: 'error', message: `Failed to paste: ${error.message}` });
    } else {
      appendStatusMessage({ type: 'error', message: `Failed to paste: Unknown error` });
      console.error(error);
    }
  }
}
