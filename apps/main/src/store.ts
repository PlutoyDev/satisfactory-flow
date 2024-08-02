// Application Store using Jotai
import { delEdges, delNodes, FlowData, getFlows, openFlowDb, setEdges, setNodes } from './db';
import { atom } from 'jotai';
import { Node, Edge, NodeChange, EdgeChange } from '@xyflow/react';

const _flowsAtom = atom<FlowData[]>([]);
_flowsAtom.onMount = set => void getFlows().then(set);
export const flowsAtom = atom(get => get(_flowsAtom)); // Export the read-only atom

interface SelectedFlow {
  id: string;
  source: 'db' | 'example';
}

const _selectedFlowAtom = atom<SelectedFlow | null>(null);
const _nodesAtom = atom<Map<string, Node>>(new Map());
const _edgesAtom = atom<Map<string, Edge>>(new Map());

export const nodesAtom = atom(
  get => Array.from(get(_nodesAtom).values()),
  (get, set, changes: NodeChange<Node>[]) => {
    // Reimplement of applyNodeChanges to work with Map
    const nodes = get(_nodesAtom);
    for (const change of changes) {
      // TODO: Apply changes to the map and save the changes
    }
    // TODO: Test if there is a need to make a copy of the map
    set(_nodesAtom, nodes);
  },
);

export const edgesAtom = atom(
  get => Array.from(get(_edgesAtom).values()),
  (get, set, changes: EdgeChange<Edge>[]) => {
    // Reimplement of applyEdgeChanges to work with Map
    const edges = get(_edgesAtom);
    for (const change of changes) {
      // TODO: Apply changes to the map and save the changes
    }
    // TODO: Test if there is a need to make a copy of the map
    set(_edgesAtom, edges);
  },
);

export const selectedFlowAtom = atom(
  get => get(_selectedFlowAtom),
  (get, set, update: SelectedFlow | null) => {
    const prev = get(_selectedFlowAtom);
    if (prev) {
      // TODO - Ensure changes are saved before switching flows
    }
    set(_selectedFlowAtom, update);
    // TODO - Load flow from db
    if (update) {
      // Set URL to /{source}/{id}
      const url = `/${update.source}/${update.id}`;
      window.history.pushState(null, '', url);
    } else {
      window.history.pushState(null, '', '/');
    }
  },
);
