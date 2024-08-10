import { getSmoothStepPath, ConnectionLineComponentProps } from '@xyflow/react';
import { useAtom } from 'jotai';
import { connectionErrorReasonAtom } from '../../lib/rfListeners';

export function ConnectionLine({ fromX, fromY, toX, toY, fromPosition, toPosition, connectionStatus }: ConnectionLineComponentProps) {
  const connectionErrorReason = useAtom(connectionErrorReasonAtom)[0];
  const [dAttr, labelX, labelY] = getSmoothStepPath({
    sourceX: fromX,
    sourceY: fromY,
    sourcePosition: fromPosition,
    targetX: toX,
    targetY: toY,
    targetPosition: toPosition,
  });

  const isError = connectionStatus === 'invalid' && connectionErrorReason;

  return (
    <g className='react-flow__connection pointer-events-none z-50' d={dAttr}>
      <path
        d={dAttr}
        strokeWidth={2}
        fill='none'
        className={`react-flow__connection-path ${isError ? 'stroke-rose-700' : connectionStatus === 'valid' ? 'stroke-success' : ''}`}
      />
      {connectionStatus === 'invalid' && (
        <text x={labelX} y={labelY + 20} textAnchor='middle' className='fill-rose-700 bg-base-100 text-sm font-semibold'>
          {connectionErrorReason}
        </text>
      )}
      {/* TODO: Display itemSpeed for this connection using fromNode and fromHandle and getting pre computed result from store */}
    </g>
  );
}

export default ConnectionLine;
