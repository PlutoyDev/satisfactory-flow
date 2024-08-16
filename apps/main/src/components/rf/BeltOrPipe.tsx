import { CSSProperties } from 'react';
import { BaseEdge, Edge, EdgeLabelRenderer, EdgeProps, getSmoothStepPath, Position } from '@xyflow/react';
import { FactoryBeltOrPipeData } from '../../engines/data';

const getLabelStyle = (position: Position, x: number, y: number): CSSProperties => {
  switch (position) {
    case 'left':
      return { transform: `translate(${x}px, ${y}px) translate(-100%, 0)` };
    case 'right':
      return { transform: `translate(${x}px, ${y}px)` };
    case 'top':
      return { transform: `translate(${x}px, ${y}px) rotate(-90deg)`, transformOrigin: 'top left' };
    case 'bottom':
      return { transform: `translate(${x}px, ${y}px) rotate(90deg)`, transformOrigin: 'top left' };
  }
  return {};
};

export function BeltOrPipe(props: EdgeProps<Edge<FactoryBeltOrPipeData>>) {
  const { sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, selected } = props;
  const { startLabel, centerLabel, endLabel, colorMode, displayOnSelect } = props.data ?? {};
  const [edgePath, labelX, labelY] = getSmoothStepPath(props);

  return (
    <>
      <BaseEdge id={props.id} path={edgePath} />
      {(!displayOnSelect || selected) && (
        <EdgeLabelRenderer>
          {!startLabel && !centerLabel && !endLabel && (
            <p className='absolute p-2 text-xs' style={{ transform: `translate(${labelX}px,${labelY}px)` }}>
              <span className='loading loading-spinner'>Loading...</span>
            </p>
          )}
          {startLabel && (
            <p className='absolute p-2 text-xs transition-transform' style={getLabelStyle(sourcePosition, sourceX, sourceY)}>
              {startLabel}
            </p>
          )}
          {centerLabel && (
            <p className='absolute p-2 text-xs' style={{ transform: `translate(-50%, 50%) translate(${labelX}px,${labelY}px)` }}>
              {centerLabel}
            </p>
          )}
          {endLabel && (
            <p className='absolute p-2 text-xs transition-transform' style={getLabelStyle(targetPosition, targetX, targetY)}>
              {endLabel}
            </p>
          )}
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export default BeltOrPipe;
