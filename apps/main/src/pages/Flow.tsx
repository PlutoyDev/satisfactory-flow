import { useAtom } from 'jotai';
import { edgesAtom, nodesAtom, selectedFlowAtom } from '../store';

function FlowPage() {
  const [selectedFlow] = useAtom(selectedFlowAtom);
  const [nodes, applyNodeChanges] = useAtom(nodesAtom);
  const [edges, applyEdgeChanges] = useAtom(edgesAtom);

  if (!selectedFlow) {
    return <div>404 Not Found</div>;
  }

  return <div>
    {/* TODO: HEADER: Home Button, FlowName and Rename button, Save Button */}
    {/* TODO: Body: xyflow (grid 6,6)*/}
    {/* TODO: Top (Left/Right) Panel: Node Selection (Item, Recipe, Logistic)*/}
    {/* TODO: Bottom (Left/Right) Panel: Node/Edge Property Editor*/}
    </div>;
}

export default FlowPage;
