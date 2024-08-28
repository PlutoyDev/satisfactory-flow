import { Node, NodeProps } from '@xyflow/react';
import { FactoryNodeWrapper } from './BaseNode';
import { RotationAndColorFields } from '../form/RotationAndColor';

export function SinkNode(props: NodeProps<Node>) {
  return (
    <FactoryNodeWrapper
      {...props}
      size={[384, 312]}
      factoryInterfaces={{
        left: [{ type: 'in', form: 'solid' }],
      }}
    >
      Sink
    </FactoryNodeWrapper>
  );
}

export function SinkNodeEditor() {
  return (
    <>
      <RotationAndColorFields />
    </>
  )
}