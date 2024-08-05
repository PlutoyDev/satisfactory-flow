import { Edge, Connection, OnSelectionChangeParams, ReactFlowInstance } from '@xyflow/react';
import { atom } from 'jotai';
import { store, generateId, edgesAtom, edgesMapAtom, nodesMapAtom, ExtNode, nodesAtom } from './store';
import { DragEvent } from 'react';
import { FactoryNodeType } from '../components/rf/BaseNode';

export const isDraggingNodeAtom = atom(false);
export const reactflowInstanceAtom = atom<ReactFlowInstance | null>(null);

export function addEdge(edgeParams: Edge | Connection) {
  store.set(edgesAtom, [
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

const selectedIdsAtom = atom<string[]>([]);

export function onSelectionChange(params: OnSelectionChangeParams) {
  const selectedIds = [...params.nodes.map(node => node.id), ...params.edges.map(edge => edge.id)];
  store.set(selectedIdsAtom, selectedIds);
}

interface SelectedNodeOrEdgeUpdater {
  node?: ((prev: ExtNode) => ExtNode) | Partial<Omit<ExtNode, 'id' | 'type'>>;
  edge?: ((prev: Edge) => Edge) | Partial<Omit<Edge, 'id' | 'type'>>;
}

export const selectedNodeOrEdge = atom(
  get => {
    const selectedIds = get(selectedIdsAtom);
    const nodes = get(nodesMapAtom);
    const edges = get(edgesMapAtom);
    if (selectedIds.length === 1) {
      if (nodes.has(selectedIds[0])) {
        return { node: nodes.get(selectedIds[0]) } as { node: ExtNode };
      } else if (edges.has(selectedIds[0])) {
        return { edge: edges.get(selectedIds[0]) } as { edge: Edge };
      }
    }
    return null;
  },
  (get, set, updater: SelectedNodeOrEdgeUpdater) => {
    const selectedIds = get(selectedIdsAtom);
    const nodes = get(nodesMapAtom);
    const edges = get(edgesMapAtom);
    if (selectedIds.length === 1) {
      if (nodes.has(selectedIds[0])) {
        if (updater.node) {
          const prev = nodes.get(selectedIds[0])!;
          const next = typeof updater.node === 'function' ? updater.node(prev) : { ...prev, ...updater.node };
          set(nodesAtom, [{ type: 'replace', item: next, id: selectedIds[0] }]);
        } else {
          throw new Error('Selected a node but no node updater provided');
        }
      } else if (edges.has(selectedIds[0])) {
        if (updater.edge) {
          const prev = edges.get(selectedIds[0])!;
          const next = typeof updater.edge === 'function' ? updater.edge(prev) : { ...prev, ...updater.edge };
          set(edgesAtom, [{ type: 'replace', item: next, id: selectedIds[0] }]);
        } else {
          throw new Error('Selected an edge but no edge updater provided');
        }
      }
    } else {
      console.error('Selected multiple nodes/edges, not updating');
    }
    return null;
  },
);
