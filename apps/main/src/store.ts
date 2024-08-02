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
