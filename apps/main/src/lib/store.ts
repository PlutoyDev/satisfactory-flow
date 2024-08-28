import { Node, Edge, NodeChange, EdgeChange } from '@xyflow/react';
import type { ParsedOutput } from 'docs-parser';
import { Atom, atom, getDefaultStore, PrimitiveAtom, SetStateAction, WritableAtom } from 'jotai';
import { atomWithLocation } from 'jotai-location';
import { computeFactoryGraph } from '../engines/itemSpeed';
import examples from '../examples';
import {
  generateId,
  FlowInfo,
  MainNodeProp,
  MainEdgeProp,
  pickMainNodeProp,
  diffMainNodeProp,
  pickMainEdgeProp,
  applyMainEdgePropPatch,
  applyMainNodePropPatch,
  FullFlowData,
} from './data';
import { delEdges, delNodes, getEdges, getFlows, getNodes, openFlowDb, setEdges, setFlow, setNodes } from './db';

// Application Store using Jotai
// Get the types for docs.json

export const store = getDefaultStore();

export const locationAtom = atomWithLocation();

type StatusMessage = { message: string; type: 'success' | 'info' | 'warning' | 'error'; timeout?: ReturnType<typeof setTimeout> };
export const statusMessagesAtom = atom<Map<string, StatusMessage>>(new Map());

type AppendStatusMessageOptions = Omit<StatusMessage, 'timeout'> & { key?: string; hideAfter?: number };
export function appendStatusMessage(options: AppendStatusMessageOptions) {
  const { message, type, hideAfter = 5000 } = options;
  let statusMessage: StatusMessage = { message, type };
  const key = options.key ?? generateId();
  const messages = store.get(statusMessagesAtom);
  if (messages.has(key)) {
    const existing = messages.get(key)!;
    if (existing.timeout) clearTimeout(existing.timeout);
    statusMessage = existing;
  }
  if (hideAfter > 0) {
    statusMessage.timeout = setTimeout(() => {
      const newMessages = new Map([...store.get(statusMessagesAtom)]);
      newMessages.delete(key);
      store.set(statusMessagesAtom, newMessages);
    }, hideAfter);
  }
  if (!messages.has(key)) {
    // If message exists, can just mutate the timeout value, since its not react using it :)
    store.set(statusMessagesAtom, new Map([...messages, [key, statusMessage]]));
  }
}

(window as any).appendStatusMessage = appendStatusMessage;

// Read only atom to fetch parsedDocs.json and map it to a Map
export type DocsMapped = { [key in keyof ParsedOutput]: ParsedOutput[key] extends Record<string, infer U> ? Map<string, U> : never };

export const docsMappedAtom = atom(async () => {
  try {
    const res = await fetch('/extracted/parsedDocs.json');
    const data = (await res.json()) as ParsedOutput;
    const mapped = {} as DocsMapped;
    for (const key in data) {
      mapped[key as keyof ParsedOutput] = new Map(Object.entries(data[key as keyof ParsedOutput]));
    }
    return mapped;
  } catch (error) {
    throw error;
  }
});

const _flowsAtom = atom<Map<string, FlowInfo>>(new Map());
_flowsAtom.onMount = set =>
  void getFlows()
    .then(flows => new Map(flows.map(flow => [flow.id, flow])))
    .then(set);
export const flowsAtom = atom(get => Array.from(get(_flowsAtom).values()).filter(flow => !flow.id.startsWith('imported-')));

const flowSource = ['db', 'example', 'import'] as const;
type FlowSource = (typeof flowSource)[number];
interface SelectedFlow {
  flowId: string;
  source: FlowSource;
}

const _selectedFlowAtom = atom<SelectedFlow | null>(null);

export interface ExtendedNode extends Node {
  /** Handle ID to Edge ID mapping */
  edges?: Map<string, string>;
}

export interface NodeAddEdgeChange {
  id: string;
  type: 'addEdge';
  handleId: string;
  edgeId: string;
}

export interface NodeRemoveEdgeChange {
  id: string;
  type: 'removeEdge';
  handleId: string;
}

export type ExtendedNodeChange = NodeChange | NodeAddEdgeChange | NodeRemoveEdgeChange;

const _nodesMapAtom = atom<Map<string, ExtendedNode>>(new Map());
const _edgesMapAtom = atom<Map<string, Edge>>(new Map());

const _nodesArrayAtom = atom<Node[]>([]); // Used for rendering
const _edgesArrayAtom = atom<Edge[]>([]); // Used for rendering

export const nodesMapAtom = atom(
  get => get(_nodesMapAtom),
  (_get, set, nodes: Map<string, Node>) => {
    console.log('Setting nodes:', nodes);
    set(_nodesMapAtom, nodes);
    set(_nodesArrayAtom, Array.from(nodes.values()));
  },
);

export const edgesMapAtom = atom(
  get => get(_edgesMapAtom),
  (_get, set, edges: Map<string, Edge>) => {
    set(_edgesMapAtom, edges);
    set(_edgesArrayAtom, Array.from(edges.values()));
  },
);

interface AddItemOperation {
  type: 'add';
  itemType: 'node' | 'edge';
  itemId: string;
}

interface RemoveItemOperation {
  type: 'remove';
  itemType: 'node' | 'edge';
  itemId: string;
  item: MainNodeProp | MainEdgeProp;
}

interface ChangeItemOperation {
  type: 'change';
  itemType: 'node' | 'edge';
  itemId: string;
  patch: Record<string, any>;
}

type Operation = AddItemOperation | RemoveItemOperation | ChangeItemOperation;
export type HistoryEvent = Operation[];

const _undoHistoryAtom = atom<HistoryEvent[]>([]);
const _redoHistoryAtom = atom<HistoryEvent[]>([]);

export const historyActionAtom = atom(
  get => {
    if (get(_selectedFlowAtom)?.source !== 'db') {
      // Not possible to undo or redo
      return { undoable: false, redoable: false };
    }
    return { undoable: get(_undoHistoryAtom).length > 0, redoable: get(_redoHistoryAtom).length > 0 };
  },
  (get, set, action: 'undo' | 'redo') => {
    const undoHistory = get(_undoHistoryAtom);
    const redoHistory = get(_redoHistoryAtom);
    if ((action === 'undo' && !undoHistory.length) || (action === 'redo' && !redoHistory.length)) {
      // Not possible to undo or redo
      return;
    }

    const lastEvent = action === 'undo' ? undoHistory[undoHistory.length - 1] : redoHistory[redoHistory.length - 1];
    const nodes = new Map(get(nodesMapAtom));
    const edges = new Map(get(edgesMapAtom));
    const reverseEvent: HistoryEvent = [];
    for (const op of lastEvent) {
      _debouncedIds.add(`${op.itemType}-${op.itemId}`);
      if (op.type === 'add') {
        if (op.itemType === 'node') {
          const node = nodes.get(op.itemId);
          if (node) {
            reverseEvent.push({ type: 'remove', itemType: op.itemType, itemId: op.itemId, item: pickMainNodeProp(node) });
            removeAlignmentXYs(node);
            nodes.delete(op.itemId);
          }
        } else if (op.itemType === 'edge') {
          const edge = edges.get(op.itemId);
          if (edge) {
            reverseEvent.push({ type: 'remove', itemType: op.itemType, itemId: op.itemId, item: pickMainEdgeProp(edge) });
            edges.delete(op.itemId);
          }
        }
      } else if (op.type === 'remove') {
        if (op.itemType === 'node') {
          nodes.set(op.itemId, op.item as ExtendedNode);
          addAlignmentXYs(op.item as Node);
        } else if (op.itemType === 'edge') {
          edges.set(op.itemId, op.item as Edge);
          nodes.get((op.item as Edge).source)?.edges?.set((op.item as Edge).sourceHandle ?? 'output', op.itemId);
          nodes.get((op.item as Edge).target)?.edges?.set((op.item as Edge).targetHandle ?? 'input', op.itemId);
        }
        reverseEvent.push({ type: 'add', itemType: op.itemType, itemId: op.itemId });
      } else if (op.type === 'change') {
        if (op.itemType === 'node') {
          const node = { ...nodes.get(op.itemId)! };
          if (node) {
            const reversePatch = applyMainNodePropPatch(node, op.patch);
            reverseEvent.push({ type: 'change', itemType: op.itemType, itemId: op.itemId, patch: reversePatch });
          }
          nodes.set(op.itemId, node);
        } else if (op.itemType === 'edge') {
          const edge = { ...edges.get(op.itemId)! };
          if (edge) {
            const reversePatch = applyMainEdgePropPatch(edge, op.patch);
            reverseEvent.push({ type: 'change', itemType: op.itemType, itemId: op.itemId, patch: reversePatch });
          }
          edges.set(op.itemId, edge);
        }
      }
    }
    set(nodesMapAtom, nodes);
    set(edgesMapAtom, edges);

    if (action === 'undo') {
      set(_undoHistoryAtom, undoHistory.slice(0, undoHistory.length - 1));
      set(_redoHistoryAtom, [...redoHistory, reverseEvent]);
    } else {
      set(_undoHistoryAtom, [...undoHistory, reverseEvent]);
      set(_redoHistoryAtom, redoHistory.slice(0, redoHistory.length - 1));
    }
    deboucedAction();
  },
);

export function pushHistoryEvent(event: HistoryEvent) {
  store.set(_undoHistoryAtom, [...store.get(_undoHistoryAtom), event]);
  store.set(_redoHistoryAtom, []); // Clear redo history
}

export const alignXs = new Map<number, Set<string>>(); // Map of X position to Node IDs
export const alignYs = new Map<number, Set<string>>(); // Map of Y position to Node IDs

function getAlignmentValue(value: number, size: number) {
  const half = size / 2;
  return [value, value - half, value + half];
}

function addAlignmentXYs(node: Node) {
  // Each node has 3xs and 3ys for alignment (start, center, end)
  if (!node.measured || !node.measured.width || !node.measured.height) return;
  const xs = getAlignmentValue(node.position.x, node.measured.width);
  const ys = getAlignmentValue(node.position.y, node.measured.height);
  for (const x of xs) {
    if (!alignXs.has(x)) alignXs.set(x, new Set());
    alignXs.get(x)!.add(node.id);
  }
  for (const y of ys) {
    if (!alignYs.has(y)) alignYs.set(y, new Set());
    alignYs.get(y)!.add(node.id);
  }
}

function removeAlignmentXYs(node: Node) {
  if (!node.measured || !node.measured.width || !node.measured.height) return;
  const xs = getAlignmentValue(node.position.x, node.measured.width);
  const ys = getAlignmentValue(node.position.y, node.measured.height);
  for (const x of xs) {
    if (alignXs.get(x)?.size === 1) alignXs.delete(x);
    else alignXs.get(x)?.delete(node.id);
  }
  for (const y of ys) {
    if (alignYs.get(y)?.size === 1) alignYs.delete(y);
    else alignYs.get(y)?.delete(node.id);
  }
}

export const alignmentAtom = atom<{ x: number | undefined; y: number | undefined }>({ x: undefined, y: undefined });

const _isDebouncePendingAtom = atom(false);
const _debouncedIds = new Set<string>();
let _debouncedTimeout: ReturnType<typeof setTimeout> | null = null;

async function deboucedAction(force?: true) {
  if ((!_debouncedIds.size || _debouncedTimeout) && !force) {
    console.log('debounced action (ignored):', _debouncedIds.size, _debouncedTimeout, force);
    return;
  }
  store.set(_isDebouncePendingAtom, true);
  _debouncedTimeout = setTimeout(async () => {
    console.log('Debounced action');
    try {
      const ids = Array.from(_debouncedIds);
      _debouncedIds.clear();
      const nodes = store.get(nodesMapAtom);
      const edges = store.get(edgesMapAtom);
      const docsMapped = await store.get(docsMappedAtom);

      const updatedNodes: Node[] = [];
      const updatedEdges: Edge[] = [];
      const deletedNodes: string[] = [];
      const deletedEdges: string[] = [];
      for (const id of ids) {
        // const [type, itemId] = id.split('-') as ['node' | 'edge', string];
        const type = id.substring(0, 4) as 'node' | 'edge';
        const itemId = id.substring(5);
        if (type === 'node') {
          const node = nodes.get(itemId);
          if (node) updatedNodes.push(node);
          else deletedNodes.push(itemId);
        } else if (type === 'edge') {
          const edge = edges.get(itemId);
          if (edge) updatedEdges.push(edge);
          else deletedEdges.push(itemId);
        }
      }

      computeFactoryGraph({ docsMapped, nodeMap: nodes, edgeMap: edges });
      store.set(nodesMapAtom, new Map(nodes));
      store.set(edgesMapAtom, new Map(edges));

      const selFlow = store.get(_selectedFlowAtom);
      if (selFlow?.source === 'db') {
        const db = await openFlowDb(selFlow!.flowId);
        // Save changes
        await Promise.all([
          setNodes(db, updatedNodes),
          delNodes(db, deletedNodes),
          setEdges(db, updatedEdges),
          delEdges(db, deletedEdges),
        ]).finally(() => db.close());
      }

      store.set(alignmentAtom, { x: undefined, y: undefined });
      store.set(_isDebouncePendingAtom, false);
      _debouncedTimeout = null;
    } catch (error) {
      console.error('Error saving changes:', error);
    }
  }, 2000);
}

export const nodesAtom = atom(
  get => get(_nodesArrayAtom),
  (get, set, changes: ExtendedNodeChange[]) => {
    const selectedFlow = get(_selectedFlowAtom);
    if (selectedFlow?.source !== 'db' && changes[0].type !== 'select' && changes[0].type !== 'dimensions') {
      appendStatusMessage({ message: 'Cannot modify this flow, please duplicate it', type: 'error', key: 'readonly-flow' });
      return;
    }
    // Reimplement of applyNodeChanges to work with Map
    const historyEvents = get(_undoHistoryAtom);
    const currentHistoryEvent: HistoryEvent = [];
    const nodes = get(_nodesMapAtom);
    let needSetAlignment = false;
    let alignmentValue: { x: number | undefined; y: number | undefined } = { x: undefined, y: undefined };
    for (const change of changes) {
      // _debouncedIds.add('node-' + ('id' in change ? change.id : change.item.id));
      switch (change.type) {
        case 'add':
          currentHistoryEvent.push({ type: 'add', itemType: 'node', itemId: change.item.id });
          nodes.set(change.item.id, change.item);
          _debouncedIds.add('node-' + change.item.id);
          break;
        case 'remove':
          currentHistoryEvent.push({ type: 'remove', itemType: 'node', itemId: change.id, item: pickMainNodeProp(nodes.get(change.id)!) });
          removeAlignmentXYs(nodes.get(change.id)!);
          nodes.delete(change.id);
          _debouncedIds.add('node-' + change.id);
          break;
        case 'replace':
          const prev = nodes.get(change.id)!;
          const patch = diffMainNodeProp(prev, change.item);
          const prevHistoryEvent = historyEvents[historyEvents.length - 1];
          // Seach for the last change event for the same node
          const matchingOperation = prevHistoryEvent?.find(
            op => op.type === 'change' && op.itemType === 'node' && op.itemId === change.id,
          ) as ChangeItemOperation | undefined;
          if (!matchingOperation || Object.keys(patch).some(key => !(key in matchingOperation.patch))) {
            // If there is no previous change event for the same node or the patch is applied for a different property
            currentHistoryEvent.push({ type: 'change', itemType: 'node', itemId: change.id, patch });
          }
          nodes.set(change.id, change.item);
          _debouncedIds.add('node-' + change.id);
          break;
        default: {
          const node = nodes.get(change.id);
          if (!node) {
            console.error('Node not found:', change.id);
            continue;
          }
          switch (change.type) {
            case 'select':
              nodes.set(change.id, { ...node, selected: change.selected });
              break;
            case 'position':
              if (!node.dragging && change.dragging) {
                // When dragging starts, save the current position
                currentHistoryEvent.push({ type: 'change', itemType: 'node', itemId: change.id, patch: { position: node.position } });
                removeAlignmentXYs(node);
              }
              if (node.dragging && !change.dragging) {
                // When dragging ends
                addAlignmentXYs(node);
                set(alignmentAtom, { x: undefined, y: undefined });
              } else if (change.position && node.measured) {
                alignmentValue.x ??= getAlignmentValue(change.position.x, node.measured.width!).find(x => alignXs.has(x));
                alignmentValue.y ??= getAlignmentValue(change.position.y, node.measured.height!).find(y => alignYs.has(y));
                needSetAlignment = true;
              }
              nodes.set(change.id, { ...node, position: change.position ?? node.position, dragging: change.dragging ?? node.dragging });
              _debouncedIds.add('node-' + change.id);
              break;
            case 'dimensions':
              if (typeof change.dimensions !== 'undefined') {
                node.measured ??= {};
                node.measured.width = change.dimensions.width;
                node.measured.height = change.dimensions.height;
                addAlignmentXYs(node);
                if (change.setAttributes) {
                  node.width = change.dimensions.width;
                  node.height = change.dimensions.height;
                }
              }
              if (typeof change.resizing === 'boolean') {
                node.resizing = change.resizing;
              }
              nodes.set(change.id, { ...node });
              break;
            case 'addEdge':
              node.edges ??= new Map();
              node.edges.set(change.handleId, change.edgeId);
              break;
            case 'removeEdge':
              node.edges?.delete(change.handleId);
              break;
          }
        }
      }
    }
    if (needSetAlignment) {
      set(alignmentAtom, { x: alignmentValue.x, y: alignmentValue.y });
    }
    if (currentHistoryEvent.length) {
      set(_undoHistoryAtom, [...historyEvents, currentHistoryEvent]);
      set(_redoHistoryAtom, []); // Clear redo history
    }
    set(nodesMapAtom, nodes);
    deboucedAction();
  },
);

export const edgesAtom = atom(
  get => get(_edgesArrayAtom),
  (get, set, changes: EdgeChange<Edge>[]) => {
    const selectedFlow = get(_selectedFlowAtom);
    if (selectedFlow?.source !== 'db' && changes[0]?.type !== 'select') {
      appendStatusMessage({ message: 'Cannot modify this flow, please duplicate it', type: 'error', key: 'readonly-flow' });
      return;
    }
    // Reimplement of applyEdgeChanges to work with Map
    const historyEvents = get(_undoHistoryAtom);
    const currentHistoryEvent: HistoryEvent = [];
    const edges = get(edgesMapAtom);
    for (const change of changes) {
      switch (change.type) {
        case 'add':
          currentHistoryEvent.push({ type: 'add', itemType: 'edge', itemId: change.item.id });
          edges.set(change.item.id, change.item);
          set(nodesAtom, [
            { type: 'addEdge', id: change.item.source, handleId: change.item.sourceHandle ?? 'output', edgeId: change.item.id },
            { type: 'addEdge', id: change.item.target, handleId: change.item.targetHandle ?? 'input', edgeId: change.item.id },
          ]);
          _debouncedIds.add('edge-' + change.item.id);
          break;
        case 'replace':
        case 'remove': {
          const edge = edges.get(change.id);
          if (!edge) {
            break;
          }
          currentHistoryEvent.push({ type: 'remove', itemType: 'edge', itemId: change.id, item: pickMainEdgeProp(edge) });
          if (change.type === 'remove') {
            edges.delete(change.id);
            set(nodesAtom, [
              { type: 'removeEdge', id: edge.source, handleId: edge.sourceHandle ?? 'output' },
              { type: 'removeEdge', id: edge.target, handleId: edge.targetHandle ?? 'input' },
            ]);
          } else if (change.type === 'replace') {
            currentHistoryEvent.push({ type: 'add', itemType: 'edge', itemId: change.item.id });
            edges.set(change.item.id, change.item);
            set(nodesAtom, [
              { type: 'addEdge', id: change.item.source, handleId: change.item.sourceHandle ?? 'output', edgeId: change.item.id },
              { type: 'addEdge', id: change.item.target, handleId: change.item.targetHandle ?? 'input', edgeId: change.item.id },
            ]);
          }
          _debouncedIds.add('edge-' + change.id);
          break;
        }
        case 'select': {
          const prevEdge = edges.get(change.id);
          if (prevEdge) {
            edges.set(change.id, { ...prevEdge, selected: change.selected });
          }
          break;
        }
      }
    }
    if (currentHistoryEvent.length) {
      set(_undoHistoryAtom, [...historyEvents, currentHistoryEvent]);
      set(_redoHistoryAtom, []); // Clear redo history
    }
    set(edgesMapAtom, edges);
    deboucedAction();
  },
);

export const isSwitchingFlow = atom(false);
export const switchFlowError = atom<string | null>(null);
export const selectedFlowAtom = atom(
  get => get(_selectedFlowAtom),
  async (get, set, update: SelectedFlow | null, data?: FullFlowData) => {
    set(isSwitchingFlow, true);
    const prev = get(_selectedFlowAtom);
    if (prev) {
      if (_debouncedTimeout) {
        clearTimeout(_debouncedTimeout!);
        _debouncedTimeout = null;
        await deboucedAction(true);
      }
    }
    set(_selectedFlowAtom, update);
    if (update) {
      try {
        let nodes: Node[] = [];
        let edges: Edge[] = [];
        if (update.source === 'db') {
          const flowDb = await openFlowDb(update!.flowId);
          nodes = await getNodes(flowDb);
          edges = await getEdges(flowDb);
          flowDb.close();
        } else if (update.source === 'example') {
          const data = await examples.get(update.flowId)?.getData();
          if (data) {
            nodes = data.default.nodes;
            edges = data.default.edges;
          }
        } else if (update.source === 'import' && data) {
          console.log('Imported flow:', data);
          nodes = data.nodes;
          edges = data.edges;
          const flowInfos = get(_flowsAtom);
          if (!flowInfos.has(update.flowId)) {
            set(_flowsAtom, new Map([...flowInfos, [update.flowId, { ...data.info, id: 'imported-' + update.flowId }]]));
          }
        }

        const nodesMap = new Map(nodes.map(node => [node.id, { ...node, edges: new Map() }] as [string, ExtendedNode]));
        const edgesMap = new Map(
          edges.map(edge => {
            const sourceNode = nodesMap.get(edge.source);
            if (sourceNode) sourceNode.edges!.set(edge.sourceHandle ?? 'output', edge.id);

            const targetNode = nodesMap.get(edge.target);
            if (targetNode) targetNode.edges!.set(edge.targetHandle ?? 'input', edge.id);

            return [edge.id, edge];
          }),
        );
        set(nodesMapAtom, nodesMap);
        set(edgesMapAtom, edgesMap);
        // Set URL to /{source}/{id}
        set(locationAtom, { pathname: `/flows/${update.source}/${update.flowId}` });
      } catch (error) {
        console.error('Error switching flow:', error);
        set(switchFlowError, 'Error switching flow');
      }
    } else {
      set(nodesMapAtom, new Map());
      set(edgesMapAtom, new Map());
      set(locationAtom, { pathname: '/' });
    }
    set(isSwitchingFlow, false);
    deboucedAction(true);
  },
);

export const selectedFlowDataAtom = atom(
  get => {
    const selectedFlow = get(selectedFlowAtom);
    if (selectedFlow) {
      if (selectedFlow.source === 'db' || selectedFlow.source === 'import') {
        return get(_flowsAtom).get(selectedFlow.flowId);
      } else if (selectedFlow.source === 'example') {
        return {
          ...examples.get(selectedFlow.flowId)!,
          updated: new Date(0),
          created: new Date(0),
        } satisfies FlowInfo;
      }
    } else {
      return null;
    }
  },
  (get, set, update: Pick<FlowInfo, 'name' | 'description'>) => {
    const selectedFlow = get(selectedFlowAtom);
    if (selectedFlow && selectedFlow.source === 'db') {
      const flow = get(_flowsAtom).get(selectedFlow.flowId);
      if (flow) {
        flow.name = update.name;
        flow.description = update.description;
        setFlow(flow);
        set(_flowsAtom, new Map(get(_flowsAtom).entries()));
      }
    } else {
      console.error('Cannot update example flow data');
    }
  },
);

selectedFlowAtom.onMount = set => {
  const [flows, source, flowId] = location.pathname.split('/').slice(1);
  if (flows === 'flows' && flowSource.includes(source as FlowSource) && source !== 'import' && flowId) {
    set({ flowId, source: source as FlowSource });
  }
};

// Jotai Utitlity Types for useAtom return type
export type UnawaitUsedAtom<A> =
  A extends PrimitiveAtom<infer V>
    ? [V, (args: SetStateAction<V>) => V]
    : A extends WritableAtom<infer V, infer Args, infer Result>
      ? [V, (...args: Args) => Result]
      : A extends Atom<infer V>
        ? [V, never]
        : 'Unaccounted / Invalid Atom';

export type UsedAtom<A> = UnawaitUsedAtom<A> extends [infer V, infer F] ? [Awaited<V>, F] : never;

export function useAtomOutsideReact<A extends Atom<unknown>>(atom: A): UnawaitUsedAtom<A> {
  // @ts-ignore
  return [store.get(atom) as any, (...args: any[]) => store.set(atom, ...args) as any] as UnawaitUsedAtom<A>;
}

export async function createFlow(name: string, flowData?: { nodes: Node[]; edges: Edge[] }) {
  const newFlowId = generateId();
  // Create flow db
  const flowDb = await openFlowDb(newFlowId, false);
  // Load the data into the db if provided
  if (flowData) {
    const { nodes, edges } = flowData;
    await Promise.all([setNodes(flowDb, nodes), setEdges(flowDb, edges)]);
  }

  // Create flow record in main db
  await setFlow({ id: newFlowId, name, created: new Date(), updated: new Date() });
  store.set(selectedFlowAtom, { source: 'db', flowId: newFlowId });
}
