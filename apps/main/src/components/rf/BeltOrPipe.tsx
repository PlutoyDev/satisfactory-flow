import { BaseEdge, Edge, EdgeLabelRenderer, EdgeProps, getSmoothStepPath } from '@xyflow/react';
import { FactoryBeltOrPipeData } from '../../engines/data';

export function BeltOrPipe(props: EdgeProps<Edge<FactoryBeltOrPipeData>>) {
  const { sourceX, sourceY, targetX, targetY, selected } = props;
  const { startLabel, centerLabel, endLabel, colorMode, displayOnSelect } = props.data ?? {};
  const [edgePath, labelX, labelY] = getSmoothStepPath(props);

  return (
    <>
      <BaseEdge id={props.id} path={edgePath} />
      {(!displayOnSelect || selected) && (
        <EdgeLabelRenderer>
          {!startLabel && !centerLabel && !endLabel && (
            <p className='absolute p-2 text-xs' style={{ transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)` }}>
              <span className='loading loading-spinner'>Loading...</span>
            </p>
          )}
          {startLabel && (
            <p className='absolute p-2 text-xs' style={{ transform: `translate(${sourceX}px, ${sourceY}px)` }}>
              {startLabel}
            </p>
          )}
          {centerLabel && (
            <p className='absolute p-2 text-xs' style={{ transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)` }}>
              {centerLabel}
            </p>
          )}
          {endLabel && (
            <p className='absolute p-2 text-xs' style={{ transform: `translate(-100%, -100%) translate(${targetX}px,${targetY}px)` }}>
              {endLabel}
            </p>
          )}
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export default BeltOrPipe;
