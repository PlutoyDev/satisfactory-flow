import { useAtom } from 'jotai';
import { edgesAtom, nodesAtom, selectedFlowAtom } from '../store';

function FlowPage() {
  const [selectedFlow] = useAtom(selectedFlowAtom);
  const [nodes, applyNodeChanges] = useAtom(nodesAtom);
  const [edges, applyEdgeChanges] = useAtom(edgesAtom);

  if (!selectedFlow) {
    return <div>404 Not Found</div>;
  }

  return <div>FlowPage</div>;
}

export default FlowPage;
