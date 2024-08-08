import { Node, Edge, Connection, OnSelectionChangeParams, ReactFlowInstance } from '@xyflow/react';
import { atom } from 'jotai';
import { store, generateId, edgesAtom, edgesMapAtom, nodesMapAtom, nodesAtom, additionNodePropMapAtom } from './store';
import { DragEvent } from 'react';
import { FactoryNodeType } from '../components/rf/BaseNode';
import { splitInterfaceId } from '../engines/compute';

export const connectionErrorReasonAtom = atom<string | null>(null);
export const isDraggingNodeAtom = atom(false);
export const reactflowInstanceAtom = atom<ReactFlowInstance | null>(null);

export function isValidConnection(params: Connection | Edge): boolean {
  const { source, sourceHandle, target, targetHandle } = params;
  if (source === target) {
    store.set(connectionErrorReasonAtom, 'Cannot connect a node to itself');
    return false;
  }
  if (!sourceHandle || !targetHandle) {
    store.set(connectionErrorReasonAtom, 'Invalid Node (please submit a bug report)');
    return false;
  }
  const sourceIntData = splitInterfaceId(sourceHandle);
  const targetIntData = splitInterfaceId(targetHandle);
  if (sourceIntData.type === targetIntData.type) {
    store.set(connectionErrorReasonAtom, `Cannot connect ${sourceIntData.type}put to ${targetIntData.type}put`);
    return false;
  }
  if (sourceIntData.form !== targetIntData.form) {
    store.set(connectionErrorReasonAtom, `Cannot connect ${sourceIntData.form} to ${targetIntData.form}`);
    return false;
  }
  const sourceNodeAdditionalProp = store.get(additionNodePropMapAtom).get(source)!;
  if (sourceNodeAdditionalProp.edges?.has(sourceHandle)) {
    store.set(connectionErrorReasonAtom, `Source already connected`);
    return false;
  }
  const targetNodeAdditionalProp = store.get(additionNodePropMapAtom).get(target)!;
  if (targetNodeAdditionalProp.edges?.has(targetHandle)) {
    store.set(connectionErrorReasonAtom, `Target already connected`);
    return false;
  }

  store.set(connectionErrorReasonAtom, null);
  return true;
}

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
  node?: ((prev: Node) => Node) | Partial<Omit<Node, 'id' | 'type'>>;
  edge?: ((prev: Edge) => Edge) | Partial<Omit<Edge, 'id' | 'type'>>;
}

export const selectedNodeOrEdge = atom(
  get => {
    const selectedIds = get(selectedIdsAtom);
    const nodes = get(nodesMapAtom);
    const edges = get(edgesMapAtom);
    if (selectedIds.length === 1) {
      if (nodes.has(selectedIds[0])) {
        return { node: nodes.get(selectedIds[0]) } as { node: Node };
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
