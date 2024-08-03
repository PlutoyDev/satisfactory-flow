import { useAtom } from 'jotai';
import { edgesAtom, nodesAtom, selectedFlowAtom } from '../store';

function FlowPage() {
  const [selectedFlow] = useAtom(selectedFlowAtom);
  const [nodes, applyNodeChanges] = useAtom(nodesAtom);
  const [edges, applyEdgeChanges] = useAtom(edgesAtom);

  console.log(nodes, edges);

  return <div>FlowPage</div>;
}

export default FlowPage;
