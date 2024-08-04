import { Edge, Connection, OnSelectionChangeParams } from '@xyflow/react';
import { atom } from 'jotai';
import { store, generateId, edgesAtom, edgesMapAtom, nodesMapAtom, ExtNode } from './store';

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

const selectedIdsAtom = atom<string[]>([]);

export function onSelectionChange(params: OnSelectionChangeParams) {
  const selectedIds = [...params.nodes.map(node => node.id), ...params.edges.map(edge => edge.id)];
  store.set(selectedIdsAtom, selectedIds);
}

export const selectedNodeOrEdge = atom(get => {
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
});
