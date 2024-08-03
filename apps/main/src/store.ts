// Application Store using Jotai
import { delEdges, delNodes, FlowData, getEdges, getFlows, getNodes, openFlowDb, setEdges, setNodes } from './db';
import { atom, useAtom } from 'jotai';
import { Node, Edge, NodeChange, EdgeChange, addEdge, Connection } from '@xyflow/react';
import { atomWithLocation } from 'jotai-location';
import examples from './examples';
import { nanoid } from 'nanoid';

const generateId = () => nanoid(16);

export const locationAtom = atomWithLocation();

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

const _nodesMapAtom = atom<Map<string, Node>>(new Map());
const _edgesMapAtom = atom<Map<string, Edge>>(new Map());
const _nodesArrayAtom = atom<Node[]>([]); // Used for rendering
const _edgesArrayAtom = atom<Edge[]>([]); // Used for rendering

const _nodesAtom = atom(
  get => get(_nodesMapAtom),
  (_get, set, nodes: Map<string, Node>) => {
    set(_nodesMapAtom, nodes);
    set(_nodesArrayAtom, Array.from(nodes.values()));
  },
);

const _edgesAtom = atom(
  get => get(_edgesMapAtom),
  (_get, set, edges: Map<string, Edge>) => {
    set(_edgesMapAtom, edges);
    set(_edgesArrayAtom, Array.from(edges.values()));
  },
);

const _isSavePendingAtom = atom(false);
const _debouncedSaveIds = new Set<string>();
let _debouncedSaveTimeout: ReturnType<typeof setTimeout> | null = null;

// Abuse atoms write-only atoms to act as function that can access other atoms
const _saveChangesAtom = atom(null, (get, set, force?: true) => {
  const selFlow = get(_selectedFlowAtom);
  if (selFlow?.source !== 'db') {
    _debouncedSaveIds.clear();
    return;
  }
  if (_debouncedSaveTimeout && !force) {
    return;
  }
  set(_isSavePendingAtom, true);
  _debouncedSaveTimeout = setTimeout(async () => {
    try {
      const ids = Array.from(_debouncedSaveIds);
      _debouncedSaveIds.clear();
      const db = await openFlowDb(selFlow!.flowId);
      const nodes = get(_nodesAtom);
      const edges = get(_edgesAtom);

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

      set(_isSavePendingAtom, false);
      _debouncedSaveTimeout = null;
    } catch (error) {
      console.error('Error saving changes:', error);
    }
  }, 30000);
});

export const nodesAtom = atom(
  get => get(_nodesArrayAtom),
  (get, set, changes: NodeChange<Node>[]) => {
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
          }
        }
      }
    }
    set(_nodesAtom, nodes);
    set(_saveChangesAtom); // "Call" the write-only atom to save changes
  },
);

export const edgesAtom = atom(
  get => get(_edgesArrayAtom),
  (get, set, changes: EdgeChange<Edge>[]) => {
    // Reimplement of applyEdgeChanges to work with Map
    const edges = get(_edgesAtom);
    for (const change of changes) {
      _debouncedSaveIds.add('edge-' + ('id' in change ? change.id : change.item.id));
      switch (change.type) {
        case 'add':
          edges.set(change.item.id, change.item);
          break;
        case 'remove':
          edges.delete(change.id);
          break;
        case 'replace':
          edges.set(change.id, change.item);
          break;
        case 'select': {
          const prevEdge = edges.get(change.id);
          if (prevEdge) {
            edges.set(change.id, { ...prevEdge, selected: change.selected });
          }
          break;
        }
      }
    }
    set(_edgesAtom, edges);
    set(_saveChangesAtom); // "Call" the write-only atom to save changes
  },
);

// Write-only atoms to add edges
export const addEdgeAtom = atom(null, (_get, set, edgeParams: Edge | Connection) => {
  console.log('addEdgeAtom', edgeParams);
  set(edgesAtom, [
    {
      type: 'add',
      item: {
        id: generateId(),
        source: edgeParams.source,
        target: edgeParams.target,
        sourceHandle: edgeParams.sourceHandle ?? undefined,
        targetHandle: edgeParams.targetHandle ?? undefined,
      },
    },
  ]);
});

export function useMyReactFlow() {
  const [nodes, applyNodeChanges] = useAtom(nodesAtom);
  const [edges, applyEdgeChanges] = useAtom(edgesAtom);
  const [, addEdge] = useAtom(addEdgeAtom);

  return { nodes, edges, applyNodeChanges, applyEdgeChanges, addEdge };
}

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
        set(_saveChangesAtom, true); // "Call" the write-only atom to save changes
      }
    }
    set(_selectedFlowAtom, update);
    if (update) {
      try {
        if (update.source === 'db') {
          const flowDb = await openFlowDb(update!.flowId);
          const nodes = await getNodes(flowDb);
          const edges = await getEdges(flowDb);
          flowDb.close();
          set(_nodesAtom, new Map(nodes.map(node => [node.id, node])));
          set(_edgesAtom, new Map(edges.map(edge => [edge.id, edge])));
        } else if (update.source === 'example') {
          const data = await examples.get(update.flowId)?.getData();
          if (data) {
            const { nodes, edges } = data.default;
            set(_nodesAtom, new Map(nodes.map(node => [node.id, node])));
            set(_edgesAtom, new Map(edges.map(edge => [edge.id, edge])));
          }
        }

        // Set URL to /{source}/{id}
        set(locationAtom, { pathname: `/flows/${update.source}/${update.flowId}` });
      } catch (error) {
        console.error('Error switching flow:', error);
        set(switchFlowError, 'Error switching flow');
      }
    } else {
      set(_nodesAtom, new Map());
      set(_edgesAtom, new Map());
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
