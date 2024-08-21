import { CSSProperties } from 'react';
import { BaseEdge, Edge, EdgeLabelRenderer, EdgeProps, getSmoothStepPath, Position } from '@xyflow/react';
import { FactoryBeltOrPipeData } from '../../engines/data';

const getLabelStyle = (position: Position | 'center', x: number, y: number, selected: boolean = false): CSSProperties => {
  const properties: CSSProperties = {
    transform: `translate(${x}px, ${y}px)`,
    textShadow: '0 2px 4px oklch(var(--b1))',
    zIndex: selected ? 1000 : undefined,
  };
  if (position === 'left') {
    properties.transform += ' translate(-100%, -100%)';
  }
  if (position === 'top') {
    properties.transform += ' rotate(-90deg)';
    properties.transformOrigin = 'top left';
  }
  if (position === 'bottom') {
    properties.transform += ' rotate(90deg)';
    properties.transformOrigin = 'top left';
  }
  if (position === 'center') {
    properties.transform += ' translate(-50%, -50%)';
  }
  return properties;
};

export function BeltOrPipe(props: EdgeProps<Edge<FactoryBeltOrPipeData>>) {
  const { sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, selected } = props;
  const { startLabel, centerLabel, endLabel, colorMode, displayOnSelect } = props.data ?? {};
  const [edgePath, labelX, labelY] = getSmoothStepPath(props);

  return (
    <>
      <BaseEdge
        id={props.id}
        path={edgePath}
        style={{
          stroke: colorMode === 'info' ? '#3498db' : colorMode === 'warning' ? '#f39c12' : colorMode === 'error' ? '#e74c3c' : '#bdc3c7',
          strokeWidth: selected ? 3 : 1,
        }}
      />
      {(!displayOnSelect || selected) && (
        <EdgeLabelRenderer>
          {!startLabel && !centerLabel && !endLabel && (
            <p className='absolute p-2 text-xs' style={{ transform: `translate(${labelX}px,${labelY}px)` }}>
              <span className='loading loading-spinner'>Loading...</span>
            </p>
          )}
          {startLabel && (
            <p className='absolute p-2 text-xs' style={getLabelStyle(sourcePosition, sourceX, sourceY, selected)}>
              {startLabel}
            </p>
          )}
          {centerLabel && (
            <p className='absolute p-2 text-xs' style={getLabelStyle('center', labelX, labelY, selected)}>
              {centerLabel}
            </p>
          )}
          {endLabel && (
            <p className='absolute p-2 text-xs' style={getLabelStyle(targetPosition, targetX, targetY, selected)}>
              {endLabel}
            </p>
          )}
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export default BeltOrPipe;
