import { ClipboardEvent, DragEvent } from 'react';
import { Edge, Connection, OnSelectionChangeParams, ReactFlowInstance, NodeSelectionChange, EdgeSelectionChange } from '@xyflow/react';
import { atom } from 'jotai';
import { FactoryNodeType } from '../components/rf/BaseNode';
import { generateId, pickMainEdgeProp, pickMainNodeProp, splitHandleId } from './data';
import {
  store,
  edgesAtom,
  nodesAtom,
  nodesMapAtom,
  selectedFlowAtom,
  edgesMapAtom,
  addError,
  HistoryEvent,
  pushHistoryEvent,
  ExtendedNode,
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

const CLIPBOARD_DATA_TYPE = 'application/json+satisfactory-flow';
type ClipboardData = { nodes: ExtendedNode[]; edges: Edge[]; viewport: ReturnType<ReactFlowInstance['getViewport']> };

export function onCopy(e: ClipboardEvent<HTMLDivElement>) {
  e.preventDefault();
  // Copies all selected nodes and edges to clipboard as JSON
  const nodes = store.get(nodesMapAtom);
  const edges = store.get(edgesMapAtom);
  const selectedIds = store.get(selectedIdsAtom);

  const copiedNodes: ExtendedNode[] = [];
  const copiedEdges: Edge[] = [];

  const nodeDeselectChanges: NodeSelectionChange[] = [];
  const edgeDeselectChanges: EdgeSelectionChange[] = [];
  for (const id of selectedIds) {
    if (nodes.has(id)) {
      copiedNodes.push(pickMainNodeProp(nodes.get(id)!));
      nodeDeselectChanges.push({ id, type: 'select', selected: false });
    } else if (edges.has(id)) {
      copiedEdges.push(pickMainEdgeProp(edges.get(id)!));
      edgeDeselectChanges.push({ id, type: 'select', selected: false });
    } else {
      throw new Error('Invalid selected id');
    }
  }

  const copiedData: ClipboardData = { nodes: copiedNodes, edges: copiedEdges, viewport: store.get(reactflowInstanceAtom)!.getViewport() };
  e.clipboardData?.setData(CLIPBOARD_DATA_TYPE, JSON.stringify(copiedData));
  store.set(nodesAtom, nodeDeselectChanges);
  store.set(edgesAtom, edgeDeselectChanges);
}

export function onPaste(e: ClipboardEvent<HTMLDivElement>) {
  // If clipboard contains JSON
  //  Parse JSON
  // If there is one node selected and copied
  //  Modify the selected node with the data from the copied node
  // If there are none or multiple nodes or any edges selected
  //  Deselect all nodes and edges
  //  Add the copied nodes and edges to the flow wiht it selected
  e.preventDefault();
  const clipboardData = e.clipboardData?.getData('application/json+satisfactory-flow');
  if (!clipboardData) {
    addError('Unknown/Empty clipboard data');
    return;
  }

  try {
    const { nodes: copiedNodes, edges: copiedEdges, viewport: copiedViewport } = JSON.parse(clipboardData) as ClipboardData;
    const selectedIds = store.get(selectedIdsAtom);
    const nodes = store.get(nodesMapAtom);
    const edges = store.get(edgesMapAtom);
    const selectedIsSame = selectedIds.length === copiedNodes.length && copiedNodes.every(({ id }) => selectedIds.includes(id));
    if (selectedIds.length === copiedNodes.length && copiedNodes.length === 1 && copiedEdges.length === 0 && !selectedIsSame) {
      const selectedNode = nodes.get(selectedIds[0])!;
      const copiedNode = copiedNodes[0];
      store.set(nodesAtom, [
        {
          id: selectedNode.id,
          type: 'replace',
          item: { ...selectedNode, data: copiedNode.data },
        },
      ]);
    } else {
      store.set(selectedIdsAtom, []);
      const currentHistoryEvent: HistoryEvent = [];
      const newNodes = new Map<string, ExtendedNode>(nodes);
      const newEdges = new Map<string, Edge>(edges);
      const newNodeIdMap = new Map<string, string>();
      const viewport = store.get(reactflowInstanceAtom)!.getViewport();
      const nodeXOffset = viewport.x === copiedViewport.x ? 72 : copiedViewport.x - viewport.x;
      const nodeYOffset = viewport.y === copiedViewport.y ? 72 : copiedViewport.y - viewport.y;
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
    }
  } catch (error) {
    if (e instanceof SyntaxError) {
      addError('Invalid clipboard data');
    }
    throw error;
  }
}
