import { BaseEdge, Edge, EdgeProps, getSmoothStepPath } from '@xyflow/react';

export function BeltOrPipe(props: EdgeProps<Edge>) {
  const { selected } = props;
  const [edgePath, labelX, labelY] = getSmoothStepPath(props);

  return (
    <>
      <BaseEdge
        id={props.id}
        path={edgePath}
        style={{
          // stroke: colorMode === 'info' ? '#3498db' : colorMode === 'warning' ? '#f39c12' : colorMode === 'error' ? '#e74c3c' : '#bdc3c7',
          strokeWidth: selected ? 3 : 1,
        }}
      />
    </>
  );
}

export default BeltOrPipe;
