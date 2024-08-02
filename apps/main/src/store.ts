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
      // TODO: Save the changes to DB
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
        case 'select': {
          const node = nodes.get(change.id);
          if (node) {
            node.selected = change.selected;
          }
          break;
        }
        case 'position': {
          const node = nodes.get(change.id);
          if (node) {
            if (typeof change.position !== 'undefined') {
              node.position = change.position;
            }

            if (typeof change.dragging !== 'undefined') {
              node.dragging = change.dragging;
            }
          }
          break;
        }
        case 'dimensions': {
          const node = nodes.get(change.id);
          if (node) {
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
          }
          break;
        }
      }
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
      // TODO: Save the changes to DB
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
          const edge = edges.get(change.id);
          if (edge) {
            edge.selected = change.selected;
          }
          break;
        }
      }
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
