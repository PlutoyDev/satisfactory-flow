// Application Store using Jotai
import { delEdges, delNodes, FlowData, getEdges, getFlows, getNodes, openFlowDb, setEdges, setNodes } from './db';
import { atom, getDefaultStore } from 'jotai';
import { Node, Edge, NodeChange, EdgeChange } from '@xyflow/react';
import { atomWithLocation } from 'jotai-location';
import examples from '../examples';
import { nanoid } from 'nanoid';
import type { ParsedOutput } from 'docs-parser'; // Get the types for docs.json

export interface ExtNode<NodeData extends Record<string, unknown> = Record<string, unknown>, NodeType extends string = string>
  extends Node<NodeData, NodeType> {
  edges?: Map<string, string>; // Map of handleId to edgeId
}

export type NodeEdgesChange = {
  type: 'edges';
  id: string;
  handleId: string;
  edgeId: string | null; // null to remove edge
};

export type ExtNodeChange = NodeChange | NodeEdgesChange;

export const generateId = () => nanoid(16);

export const store = getDefaultStore();

export const locationAtom = atomWithLocation();

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
    // TODO: Handle error
    console.error('Error handling parsedDocs.json:', error);
    throw error;
  }
});

const _flowsAtom = atom<Map<string, FlowData>>(new Map());
_flowsAtom.onMount = set =>
  void getFlows()
    .then(flows => new Map(flows.map(flow => [flow.id, flow])))
    .then(set);
export const flowsAtom = atom(get => Array.from(get(_flowsAtom).values()));

const flowSource = ['db', 'example'] as const;
type FlowSource = (typeof flowSource)[number];
interface SelectedFlow {
  flowId: string;
  source: FlowSource;
}

const _selectedFlowAtom = atom<SelectedFlow | null>(null);

const _nodesMapAtom = atom<Map<string, ExtNode>>(new Map());
const _edgesMapAtom = atom<Map<string, Edge>>(new Map());
const _nodesArrayAtom = atom<Node[]>([]); // Used for rendering
const _edgesArrayAtom = atom<Edge[]>([]); // Used for rendering

export const nodesMapAtom = atom(
  get => get(_nodesMapAtom),
  (_get, set, nodes: Map<string, ExtNode>) => {
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

const _isSavePendingAtom = atom(false);
const _debouncedSaveIds = new Set<string>();
let _debouncedSaveTimeout: ReturnType<typeof setTimeout> | null = null;

async function saveChanges(force?: true) {
  const selFlow = store.get(_selectedFlowAtom);
  if (selFlow?.source !== 'db') {
    _debouncedSaveIds.clear();
    return;
  }
  if (_debouncedSaveTimeout && !force) {
    return;
  }
  store.set(_isSavePendingAtom, true);
  _debouncedSaveTimeout = setTimeout(async () => {
    try {
      const ids = Array.from(_debouncedSaveIds);
      _debouncedSaveIds.clear();
      const db = await openFlowDb(selFlow!.flowId);
      const nodes = store.get(nodesMapAtom);
      const edges = store.get(edgesMapAtom);

      const updatedNodes: Node[] = [];
      const updatedEdges: Edge[] = [];
      const deletedNodes: string[] = [];
      const deletedEdges: string[] = [];
      for (const id of ids) {
        const [type, itemId] = id.split('-') as ['node' | 'edge', string];
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

      await Promise.all([
        setNodes(db, updatedNodes),
        delNodes(db, deletedNodes),
        setEdges(db, updatedEdges),
        delEdges(db, deletedEdges),
      ]).finally(() => db.close());

      store.set(_isSavePendingAtom, false);
      _debouncedSaveTimeout = null;
    } catch (error) {
      console.error('Error saving changes:', error);
    }
  }, 30000);
}

export const nodesAtom = atom(
  get => get(_nodesArrayAtom),
  (get, set, changes: ExtNodeChange[]) => {
    // Reimplement of applyNodeChanges to work with Map
    const nodes = get(_nodesMapAtom);
    for (const change of changes) {
      _debouncedSaveIds.add('node-' + ('id' in change ? change.id : change.item.id));
      switch (change.type) {
        case 'add':
          nodes.set(change.item.id, change.item);
          break;
        case 'remove':
          nodes.delete(change.id);
          break;
        case 'replace':
          nodes.set(change.id, change.item);
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
              nodes.set(change.id, { ...node, position: change.position ?? node.position, dragging: change.dragging ?? node.dragging });
              break;
            case 'dimensions':
              if (typeof change.dimensions !== 'undefined') {
                node.measured ??= {};
                node.measured.width = change.dimensions.width;
                node.measured.height = change.dimensions.height;
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
            case 'edges':
              const extNode = node;
              if (change.edgeId) {
                extNode.edges ??= new Map();
                extNode.edges.set(change.handleId, change.edgeId);
              } else {
                extNode.edges?.delete(change.handleId);
              }
              nodes.set(change.id, extNode);
              break;
          }
        }
      }
    }
    set(nodesMapAtom, nodes);
    saveChanges();
  },
);

export const edgesAtom = atom(
  get => get(_edgesArrayAtom),
  (get, set, changes: EdgeChange<Edge>[]) => {
    // Reimplement of applyEdgeChanges to work with Map
    const nodeChanges: ExtNodeChange[] = [];
    const edges = get(edgesMapAtom);
    for (const change of changes) {
      _debouncedSaveIds.add('edge-' + ('id' in change ? change.id : change.item.id));
      switch (change.type) {
        case 'add':
          edges.set(change.item.id, change.item);
          nodeChanges.push({
            type: 'edges',
            id: change.item.source,
            handleId: change.item.sourceHandle ?? 'output',
            edgeId: change.item.id,
          });
          nodeChanges.push({
            type: 'edges',
            id: change.item.target,
            handleId: change.item.targetHandle ?? 'input',
            edgeId: change.item.id,
          });
          break;
        case 'replace':
        case 'remove': {
          const edge = edges.get(change.id);
          if (!edge) {
            break;
          }
          nodeChanges.push({ type: 'edges', id: edge.source, handleId: edge.sourceHandle ?? 'output', edgeId: null });
          nodeChanges.push({ type: 'edges', id: edge.target, handleId: edge.targetHandle ?? 'input', edgeId: null });
          if (change.type === 'remove') {
            edges.delete(change.id);
          } else if (change.type === 'replace') {
            edges.set(change.item.id, change.item);
            nodeChanges.push({
              type: 'edges',
              id: change.item.source,
              handleId: change.item.sourceHandle ?? 'output',
              edgeId: change.item.id,
            });
            nodeChanges.push({
              type: 'edges',
              id: change.item.target,
              handleId: change.item.targetHandle ?? 'input',
              edgeId: change.item.id,
            });
          }
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
    set(edgesMapAtom, edges);
    if (nodeChanges.length) {
      set(nodesAtom, nodeChanges);
    } else {
      saveChanges();
    }
  },
);

export const isSwitchingFlow = atom(false);
export const switchFlowError = atom<string | null>(null);
export const selectedFlowAtom = atom(
  get => get(_selectedFlowAtom),
  async (get, set, update: SelectedFlow | null) => {
    set(isSwitchingFlow, true);
    const prev = get(_selectedFlowAtom);
    if (prev) {
      if (_debouncedSaveTimeout) {
        clearTimeout(_debouncedSaveTimeout!);
        _debouncedSaveTimeout = null;
        await saveChanges(true);
      }
    }
    set(_selectedFlowAtom, update);
    if (update) {
      try {
        let nodes: ExtNode[] = [];
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
        }

        const nodesMap = new Map(nodes.map(node => [node.id, node]));
        const edgesMap = new Map(
          edges.map(edge => {
            const sourceNode = nodesMap.get(edge.source);
            if (sourceNode) {
              sourceNode.edges ??= new Map();
              sourceNode.edges.set(edge.sourceHandle ?? 'output', edge.id);
            }
            const targetNode = nodesMap.get(edge.target);
            if (targetNode) {
              targetNode.edges ??= new Map();
              targetNode.edges.set(edge.targetHandle ?? 'input', edge.id);
            }
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
  },
);

export const selectedFlowDataAtom = atom(
  get => {
    const selectedFlow = get(selectedFlowAtom);
    if (selectedFlow) {
      if (selectedFlow.source === 'db') {
        return get(_flowsAtom).get(selectedFlow.flowId) as Pick<FlowData, 'name' | 'description'> | undefined;
      } else if (selectedFlow.source === 'example') {
        return examples.get(selectedFlow.flowId) as Pick<FlowData, 'name' | 'description'> | undefined;
      }
    } else {
      return null;
    }
  },
  (get, set, update: Pick<FlowData, 'name' | 'description'>) => {
    const selectedFlow = get(selectedFlowAtom);
    if (selectedFlow && selectedFlow.source === 'db') {
      const flow = get(_flowsAtom).get(selectedFlow.flowId);
      if (flow) {
        flow.name = update.name;
        flow.description = update.description;
        set(_flowsAtom, new Map(get(_flowsAtom).entries()));
      }
    } else {
      console.error('Cannot update example flow data');
    }
  },
);

selectedFlowAtom.onMount = set => {
  const [flows, source, flowId] = location.pathname.split('/').slice(1);
  if (flows === 'flows' && flowSource.includes(source as FlowSource) && flowId) {
    set({ flowId, source: source as FlowSource });
  }
};
