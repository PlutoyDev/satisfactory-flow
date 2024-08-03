import { useAtom } from 'jotai';
import { selectedFlowAtom, selectedFlowDataAtom, useMyReactFlow } from '../store';
import { FilePen, Home, Save } from 'lucide-react';
import { Background, ReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

function FlowPage() {
  const [selectedFlow, setSelectedFlow] = useAtom(selectedFlowAtom);
  const [selFlowData, setSelFlowData] = useAtom(selectedFlowDataAtom);
  const { nodes, edges, applyEdgeChanges, applyNodeChanges, addEdge } = useMyReactFlow();

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
      <div className='fixed bottom-0 left-0 right-0 top-16 h-full'>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onConnect={addEdge}
          onNodesChange={applyNodeChanges}
          onEdgesChange={applyEdgeChanges}
          attributionPosition='bottom-left'
          colorMode='dark'
          defaultEdgeOptions={{ type: 'smoothstep' }}
        >
          <Background />
        </ReactFlow>
      </div>
      {/* TODO: Top (Left/Right) Panel: Node Selection (Item, Recipe, Logistic)*/}
      {/* TODO: Bottom (Left/Right) Panel: Node/Edge Property Editor*/}
    </div>
  );
}

export default FlowPage;
