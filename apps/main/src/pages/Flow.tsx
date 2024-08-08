import { useAtom } from 'jotai';
import { edgesAtom, nodesAtom, selectedFlowAtom, selectedFlowDataAtom } from '../lib/store';
import { addEdge, isDraggingNodeAtom, isValidConnection, onDrop, onSelectionChange, reactflowInstanceAtom, selectedNodeOrEdge } from '../lib/rfListeners';
import { FilePen, Home, Save, X } from 'lucide-react';
import { Background, Panel, ReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { customNodeEditors, customNodes } from '../components/rf';
import { Suspense } from 'react';
import { FACTORY_NODE_DEFAULT_COLORS, FACTORY_NODE_TYPES, FactoryNodeType } from '../components/rf/BaseNode';
import ConnectionLine from '../components/rf/ConnectionLine';

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
            nodes={nodes}
            edges={edges}
            onConnect={addEdge}
            onNodesChange={applyNodeChanges}
            onEdgesChange={applyEdgeChanges}
            attributionPosition='bottom-left'
            colorMode='dark'
            defaultEdgeOptions={{ type: 'smoothstep' }}
            nodeTypes={customNodes}
            snapToGrid={true}
            snapGrid={[6, 6]}
            onSelectionChange={onSelectionChange}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={e => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
            }}
            isValidConnection={isValidConnection}
            connectionLineComponent={ConnectionLine}
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
  const [selNodeOrEdge] = useAtom(selectedNodeOrEdge);
  if (!selNodeOrEdge) {
    return null;
  }

  const Editor =
    'node' in selNodeOrEdge ? (
      selNodeOrEdge.node.type && selNodeOrEdge.node.type in customNodeEditors ? (
        customNodeEditors[selNodeOrEdge.node.type as keyof typeof customNodeEditors]
      ) : (
        <p>Unknown node type: {selNodeOrEdge.node.type}</p>
      )
    ) : 'edge' in selNodeOrEdge ? (
      <p>TODO: Edge Editor</p>
    ) : (
      <p>Unknown selection</p>
    );

  return (
    <Panel position='bottom-right'>
      <div className='bg-base-300 rounded-box min-w-64 px-3 py-1'>
        <h2 className='text-lg font-semibold'>Properties</h2>
        <div className='divider m-0 mb-2 h-1' />
        {Editor && (typeof Editor === 'function' ? <Editor /> : Editor)}
      </div>
    </Panel>
  );
}

export default FlowPage;
