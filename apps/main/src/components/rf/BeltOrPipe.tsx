import { BaseEdge, EdgeProps, getSmoothStepPath } from '@xyflow/react';
import { useAtom } from 'jotai';
import { additionNodePropMapAtom } from '../../lib/store';

export function BeltOrPipe(props: EdgeProps) {
  const { source, target, sourceHandleId, targetHandleId, data } = props;
  const [edgePath, labelX, labelY] = getSmoothStepPath(props);
  const [nodeAPM] = useAtom(additionNodePropMapAtom);

  const sourceANP = nodeAPM.get(source)!;
  const targetANP = nodeAPM.get(target)!;

  let isLoading = false;
  let text: string;
  let textType: 'success' | 'error' | 'warning' | 'info' | 'default' = 'default';
  if (!sourceHandleId || !targetHandleId) {
    text = 'Invalid Node (please submit a bug report)';
    textType = 'error';
  } else if (!sourceANP.computeResult || !targetANP.computeResult) {
    isLoading = true;
  } else {
    const sourceResult = sourceANP.computeResult;
    const targetResult = targetANP.computeResult;
    // Has computed result
    const sourceItemsSpeed = sourceResult.actualItemsSpeed[sourceHandleId] ?? sourceResult.expectItemsSpeed[sourceHandleId] ?? 0;
    const targetItemsSpeed = targetResult.actualItemsSpeed[targetHandleId] ?? targetResult.expectItemsSpeed[targetHandleId] ?? 0;
    // TODO: Compare the source and target items speed and show warning if they are not equal
  }

  return (
    <>
      <BaseEdge path={edgePath} />
    </>
  );
}

export default BeltOrPipe;
