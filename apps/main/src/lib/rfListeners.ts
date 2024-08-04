import { Edge, Connection, OnSelectionChangeParams } from "@xyflow/react";
import { atom } from "jotai";
import { store, generateId, edgesAtom } from "./store";

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

const _selectedIdsAtom = atom<string[]>([]);

export function onSelectionChange(params: OnSelectionChangeParams) {
  const selectedIds = [...params.nodes.map(node => node.id), ...params.edges.map(edge => edge.id)];
  store.set(_selectedIdsAtom, selectedIds);
}
