import { Suspense, useCallback } from 'react';
import { Background, ConnectionMode, Edge, Node, Panel, ReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import debounce from 'debounce';
import { useAtom } from 'jotai';
import { FilePen, Home, Save, X } from 'lucide-react';
import { customNodeEditors, customNodes } from '../components/rf';
import { FACTORY_NODE_DEFAULT_COLORS, FACTORY_NODE_TYPES, FactoryEditorContextProvider, FactoryNodeType } from '../components/rf/BaseNode';
import ConnectionLine from '../components/rf/ConnectionLine';
import {
  addEdge,
  isDraggingNodeAtom,
  isValidConnection,
  onDrop,
  onSelectionChange,
  reactflowInstanceAtom,
  selectedIdsAtom,
} from '../lib/rfListeners';
import { edgesAtom, edgesMapAtom, nodesAtom, nodesMapAtom, selectedFlowAtom, selectedFlowDataAtom } from '../lib/store';

function FlowPage() {
  const [isDraggingNode] = useAtom(isDraggingNodeAtom);
  const [, setReactFlowInstance] = useAtom(reactflowInstanceAtom);
  const [selectedFlow, setSelectedFlow] = useAtom(selectedFlowAtom);
  const [selFlowData, setSelFlowData] = useAtom(selectedFlowDataAtom);
  const [nodes, applyNodeChanges] = useAtom(nodesAtom);
  const [edges, applyEdgeChanges] = useAtom(edgesAtom);

  if (!selectedFlow) {
    return <div>404 Not Found</div>;
  }

  return (
    <div>
      <div className='bg-base-300 navbar w-full'>
        <div className='navbar-start'>
          <a href='/' className='btn btn-ghost' onClick={e => (e.preventDefault(), setSelectedFlow(null))}>
            <Home size={32} className='stroke-2' />
          </a>
        </div>
        <div className='navbar-center'>
          <h2 className='text-xl font-semibold'>{selFlowData?.name}</h2>
          <button className='btn btn-ghost btn-xs mr-2' disabled={selectedFlow.source !== 'db'}>
            {/* TODO: Implment edit flow name button */}
            <FilePen size={24} />
          </button>
        </div>
        <div className='navbar-end'>
          <button className='btn btn-ghost'>
            <Save size={32} className='stroke-2' />
          </button>
        </div>
      </div>
      <div className='fixed bottom-0 left-0 right-0 top-16'>
        <Suspense fallback={<div>Loading...</div>}>
          <ReactFlow
            // Viewport
            minZoom={0.05}
            maxZoom={1}
            snapToGrid={true}
            snapGrid={[6, 6]}
            attributionPosition='bottom-left'
            // Node
            nodes={nodes}
            nodeTypes={customNodes}
            nodeOrigin={[0.5, 0.5]}
            onNodesChange={applyNodeChanges}
            // Edge
            edges={edges}
            defaultEdgeOptions={{ type: 'smoothstep' }}
            onEdgesChange={applyEdgeChanges}
            // Connection
            connectionRadius={36}
            connectionMode={ConnectionMode.Loose}
            connectionLineComponent={ConnectionLine}
            isValidConnection={isValidConnection}
            onConnect={addEdge}
            // Misc
            colorMode='dark'
            onInit={setReactFlowInstance}
            onSelectionChange={onSelectionChange}
            // Drag and Drop
            onDrop={onDrop}
            onDragOver={e => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
            }}
            // Keyboard Props
            deleteKeyCode={['Delete', 'Backspace']}
            selectionKeyCode={['Shift', 'Control']}
          >
            <Background gap={36} />

            {[isDraggingNode].some(b => b) && (
              <div className='fixed bottom-0 left-0 right-0 top-16 bg-gray-400 bg-opacity-10'>
                {/* overlay */}
                {/* Center */}
                <div className='rounded-box absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform px-3 py-1'>
                  {isDraggingNode && <p className='text-lg font-semibold'>Drop here to add node</p>}
                </div>
              </div>
            )}
            <NodeSelectionPanel />
            <PropertyEditorPanel />
          </ReactFlow>
        </Suspense>
      </div>
    </div>
  );
}

const NODE_NAMES = {
  item: 'Item',
  recipe: 'Recipe',
  logistic: 'Logistic',
} as const satisfies Record<FactoryNodeType, string>;

function NodeSelectionPanel() {
  const [isDraggingNode, setDraggingNode] = useAtom(isDraggingNodeAtom);
  return (
    <Panel position='top-right'>
      <div
        className='bg-base-300 rounded-box w-40 select-none px-3 py-1'
        onDrop={e => {
          e.preventDefault();
          e.stopPropagation();
          setDraggingNode(false);
        }}
        onDragOver={e => {
          e.dataTransfer.effectAllowed = 'none';
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <h2 className='text-lg font-semibold'>Node Selection</h2>
        <p className='text-sm text-gray-500'>Drag from here</p>
        <div className='divider m-0 mb-2 h-1' />
        <div className='flex flex-col gap-y-2'>
          {FACTORY_NODE_TYPES.map(type => (
            <div
              key={type}
              style={{ backgroundColor: FACTORY_NODE_DEFAULT_COLORS[type] }}
              className='text-base-300 w-full cursor-pointer rounded-md px-2 py-1 text-center'
              draggable
              onDragStart={e => {
                e.dataTransfer.setData('application/reactflow', type);
                e.dataTransfer.effectAllowed = 'move';
                setDraggingNode(true);
              }}
            >
              {NODE_NAMES[type]}
            </div>
          ))}
          {isDraggingNode && (
            <div className='border-base-300 h-20 w-full rounded-md border-2 border-dashed bg-gray-600 bg-opacity-10 px-2 pt-4'>
              <X size={24} className='text-error mx-auto' />
              <p className='text-error w-full text-center'>Cancel</p>
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}

function PropertyEditorPanel() {
  // const [selNodeOrEdge] = useAtom(selectedNodeOrEdge);
  // if (!selNodeOrEdge) {
  //   return null;
  // }
  const [nodesMap, setNodesMap] = useAtom(nodesMapAtom);
  const [edgesMap, setEdgesMap] = useAtom(edgesMapAtom);
  const [selectedIds] = useAtom(selectedIdsAtom);

  let selNodeOrEdge: Node | Edge | undefined = undefined;
  let selectedType: 'node' | 'edge' | undefined = undefined;
  if (nodesMap.has(selectedIds[0])) {
    selNodeOrEdge = nodesMap.get(selectedIds[0])!;
    selectedType = 'node';
  } else if (edgesMap.has(selectedIds[0])) {
    selNodeOrEdge = edgesMap.get(selectedIds[0])!;
    selectedType = 'edge';
  }

  const getValue = useCallback(
    (key?: string) => {
      if (!selNodeOrEdge) {
        console.error('Selected node or edge not found');
        return undefined;
      }
      selNodeOrEdge.data ??= {};
      if (key) {
        return selNodeOrEdge.data && key in selNodeOrEdge.data ? selNodeOrEdge.data[key] : undefined;
      } else {
        return selNodeOrEdge.data;
      }
    },
    [selNodeOrEdge],
  );

  const createSetValue = useCallback(
    (name?: string, debounceMs: number = 0) => {
      const setValue = (updateOrUpdater: any | ((prev: any) => any)) => {
        const prevValue = selNodeOrEdge;
        if (!prevValue) {
          console.error('Selected node or edge not found');
          return;
        }
        // Can only update data, other properties cannot be changed

        let newData: Record<string, any>;
        prevValue.data ??= {};
        if (typeof updateOrUpdater === 'function') {
          newData = name ? updateOrUpdater(prevValue.data[name]) : updateOrUpdater(prevValue.data);
        } else {
          newData = name ? { ...prevValue.data, [name]: updateOrUpdater } : updateOrUpdater;
        }

        const newValue = { ...prevValue, data: newData };
        // const newValue = typeof update === 'function' ? update(name ? prevValue.data[name] : prevValue.data) : { ...prevValue, data: name ? { ...prevValue.data, [name]: update } : { ...prevValue.data, ...update } };
        if (selectedType === 'node') {
          console.log('Setting node', selectedIds[0], newValue);
          setNodesMap(new Map(nodesMap.set(selectedIds[0], newValue as Node)));
        } else if (selectedType === 'edge') {
          setEdgesMap(new Map(edgesMap.set(selectedIds[0], newValue as Edge)));
        }
      };

      if (debounceMs > 0) {
        return debounce(setValue, debounceMs);
      } else {
        return setValue;
      }
    },
    [selNodeOrEdge, setNodesMap, setEdgesMap],
  );

  if (selectedIds.length !== 1 || !selNodeOrEdge || !selectedType) {
    // For now, only support editing one node or edge at a time
    // TODO: Provide ways to deselect all nodes or edges in the future
    // TODO: Support editing multiple nodes or edges at a time
    return null;
  }

  const Editor =
    selectedType === 'node' ? (
      selNodeOrEdge.type && selNodeOrEdge.type in customNodeEditors ? (
        customNodeEditors[selNodeOrEdge.type as FactoryNodeType]
      ) : (
        <p>Node type not supported</p>
      )
    ) : selectedType === 'edge' ? (
      <p>Edge editing not supported</p>
    ) : (
      <p>Unknown type</p>
    );

  console.log('render');

  return (
    <Panel position='bottom-right'>
      <FactoryEditorContextProvider
        getValue={getValue}
        createSetValue={createSetValue}
        nodeOrEdge={selNodeOrEdge}
        selectedType={selectedType}
      >
        <div className='bg-base-300 rounded-box min-w-64 px-3 py-1'>
          <h2 className='text-lg font-semibold'>Properties</h2>
          <div className='divider m-0 mb-2 h-1' />
          {typeof Editor === 'function' ? <Editor /> : Editor}
        </div>
      </FactoryEditorContextProvider>
    </Panel>
  );
}

export default FlowPage;
