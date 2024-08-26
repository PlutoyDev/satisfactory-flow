import { Suspense, useCallback, useState } from 'react';
import { Background, ConnectionMode, Edge, Node, Panel, ReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import debounce from 'debounce';
import { useAtom } from 'jotai';
import { FilePen, Home, OctagonX, Redo, Save, Undo, X } from 'lucide-react';
import { customEdges, customNodeEditors, customNodes } from '../components/rf';
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
import {
  alignmentAtom,
  edgesAtom,
  edgesMapAtom,
  errorsAtom,
  historyActionAtom,
  nodesAtom,
  nodesMapAtom,
  selectedFlowAtom,
  selectedFlowDataAtom,
} from '../lib/store';

function FlowPage() {
  const [errors] = useAtom(errorsAtom);
  const [isDraggingNode] = useAtom(isDraggingNodeAtom);
  const [rfInstance, setReactFlowInstance] = useAtom(reactflowInstanceAtom);
  const [selectedFlow, setSelectedFlow] = useAtom(selectedFlowAtom);
  const [selFlowData, setSelFlowData] = useAtom(selectedFlowDataAtom);
  const [isRenaming, setRenaming] = useState(false);
  const [nodes, applyNodeChanges] = useAtom(nodesAtom);
  const [edges, applyEdgeChanges] = useAtom(edgesAtom);
  const [{ undoable, redoable }, applyHistoryAction] = useAtom(historyActionAtom);
  const [{ x: alignLineX, y: alignLineY }] = useAtom(alignmentAtom);

  if (!selectedFlow) {
    return <div>404 Not Found</div>;
  }

  return (
    <div>
      <div className='navbar w-full'>
        <div className='navbar-start'>
          <a href='/' className='btn btn-ghost' onClick={e => (e.preventDefault(), setSelectedFlow(null))}>
            <Home size={32} className='stroke-2' />
          </a>
        </div>
        <div className='navbar-center'>
          <h2 className='text-xl font-semibold '>{selFlowData?.name}</h2>
          <button className='btn btn-ghost btn-xs mr-2' disabled={selectedFlow.source !== 'db'} onClick={() => setRenaming(true)}>
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
            maxZoom={1.5}
            snapToGrid={true}
            snapGrid={[6, 6]}
            attributionPosition='bottom-left'
            // Node
            nodes={nodes}
            nodeTypes={customNodes}
            nodeOrigin={[0.5, 0.5]}
            onNodesChange={applyNodeChanges}
            elevateNodesOnSelect={true}
            // Edge
            edges={edges}
            edgeTypes={customEdges}
            defaultEdgeOptions={{ type: 'smoothstep' }}
            onEdgesChange={applyEdgeChanges}
            elevateEdgesOnSelect={true}
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
            <Background gap={18} bgColor='#202030' />

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
            <Panel position='top-center'>
              <div className='flex flex-row'>
                <button className='btn btn-ghost' disabled={!undoable} onClick={() => applyHistoryAction('undo')}>
                  <Undo />
                </button>
                <button className='btn btn-ghost' disabled={!redoable} onClick={() => applyHistoryAction('redo')}>
                  <Redo />
                </button>
              </div>
            </Panel>
            {/* Drawing the alignment line on screen */}
            {rfInstance && alignLineX && (
              <div
                className='fixed pointer-events-none border-l border-success border-dashed'
                style={{ left: rfInstance.flowToScreenPosition({ x: alignLineX, y: rfInstance.getViewport().y }).x, top: 0, bottom: 0 }}
              />
            )}
            {rfInstance && alignLineY && (
              <div
                className='fixed pointer-events-none border-t border-success border-dashed'
                style={{ top: rfInstance.flowToScreenPosition({ x: rfInstance.getViewport().x, y: alignLineY }).y, left: 0, right: 0 }}
              />
            )}
            {
              // Renaming dialog
              isRenaming && (
                <>
                  {/* Overlay */}
                  <div className='fixed bg-base-300 bg-opacity-80 w-full h-full top-0 left-0 z-40' onClick={() => setRenaming(false)} />
                  {/* Dialog */}
                  <div className='fixed bg-base-300 bg-opacity-90 rounded-box w-96 p-4 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50'>
                    <h2 className='text-lg font-semibold'>Rename Flow</h2>
                    <input
                      type='text'
                      className='input input-sm mt-2 w-full'
                      defaultValue={selFlowData?.name}
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          setSelFlowData({ ...selFlowData, name: (e.target as HTMLInputElement).value });
                          setRenaming(false);
                        }
                      }}
                    />
                    <div className='flex justify-end mt-2'>
                      <button
                        className='btn btn-sm btn-error'
                        onClick={() => {
                          setRenaming(false);
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        className='btn btn-sm btn-accent ml-2'
                        onClick={() => {
                          setSelFlowData({ ...selFlowData, name: (document.querySelector('.input') as HTMLInputElement).value });
                          setRenaming(false);
                        }}
                      >
                        Rename
                      </button>
                    </div>
                  </div>
                </>
              )
            }
          </ReactFlow>
        </Suspense>
      </div>
      {/* Error Display */}
      {errors.size > 0 && (
        <div className='fixed top-16 left-0 bg-transparent flex flex-col gap-y-2 p-2 right-1/2'>
          {Array.from(errors).map((error, id) => (
            <div key={id} className='alert alert-error'>
              <OctagonX />
              <p>{error}</p>
            </div>
          ))}
        </div>
      )}
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
  const [nodesMap] = useAtom(nodesMapAtom);
  const [edgesMap] = useAtom(edgesMapAtom);
  const [, applyNodeChanges] = useAtom(nodesAtom);
  const [, applyEdgeChanges] = useAtom(edgesAtom);

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
          newData = name ? { ...prevValue.data, [name]: updateOrUpdater(prevValue.data) } : updateOrUpdater(prevValue.data);
        } else {
          newData = name ? { ...prevValue.data, [name]: updateOrUpdater } : updateOrUpdater;
        }

        const newValue = { ...prevValue, data: newData };
        // const newValue = typeof update === 'function' ? update(name ? prevValue.data[name] : prevValue.data) : { ...prevValue, data: name ? { ...prevValue.data, [name]: update } : { ...prevValue.data, ...update } };
        if (selectedType === 'node') {
          applyNodeChanges([{ type: 'replace', id: selectedIds[0], item: newValue as Node }]);
        } else if (selectedType === 'edge') {
          applyEdgeChanges([{ type: 'replace', id: selectedIds[0], item: newValue as Edge }]);
        }
      };

      if (debounceMs > 0) {
        return debounce(setValue, debounceMs);
      } else {
        return setValue;
      }
    },
    [selNodeOrEdge, selectedType, selectedIds, applyNodeChanges, applyEdgeChanges],
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

  return (
    <Panel position='bottom-right'>
      <FactoryEditorContextProvider
        key={selectedIds[0]}
        getValue={getValue}
        createSetValue={createSetValue}
        nodeOrEdge={selNodeOrEdge}
        selectedType={selectedType}
      >
        <div className='bg-base-300 rounded-box min-w-64 px-3 py-1'>
          <h2 className='text-lg font-semibold inline'>Properties</h2>
          <p className='float-right text-xs text-gray-500 mt-2'>{selectedIds[0]}</p>
          <div className='divider m-0 mb-2 h-1' />
          <div className='flex flex-col gap-y-2'>{typeof Editor === 'function' ? <Editor /> : Editor}</div>
        </div>
      </FactoryEditorContextProvider>
    </Panel>
  );
}

export default FlowPage;
