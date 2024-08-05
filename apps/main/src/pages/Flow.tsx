import { useAtom } from 'jotai';
import { edgesAtom, nodesAtom, selectedFlowAtom, selectedFlowDataAtom } from '../lib/store';
import { addEdge, onSelectionChange, selectedNodeOrEdge } from '../lib/rfListeners';
import { FilePen, Home, Save } from 'lucide-react';
import { Background, Panel, ReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { customNodeEditors, customNodes } from '../components/rf';
import { Suspense } from 'react';

function FlowPage() {
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
          >
            <Background gap={36} />
            {/* TODO: Top (Left/Right) Panel: Node Selection (Item, Recipe, Logistic)*/}
            {/* TODO: Bottom (Left/Right) Panel: Node/Edge Property Editor*/}
            <PropertyEditor />
          </ReactFlow>
        </Suspense>
      </div>
    </div>
  );
}

function PropertyEditor() {
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
