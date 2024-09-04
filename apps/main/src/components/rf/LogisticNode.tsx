import { NodeProps, Node } from '@xyflow/react';
import { getFactoryInterfaceForLogisticNode } from '../../engines/interface';
import { LogisticType, type FactoryLogisticNodeData } from '../../lib/data';
import { OutputFilterRule } from '../form/OutputFilterRule';
import { RotationAndColorFields } from '../form/RotationAndColor';
import { FactoryNodeWrapper, useEditorField } from './BaseNode';

const defaultSize = 96;

export function LogisticNode(props: NodeProps<Node<FactoryLogisticNodeData>>) {
  const interfaces = getFactoryInterfaceForLogisticNode({ nodeId: props.id, data: props.data });

  if (!interfaces) {
    return (
      <FactoryNodeWrapper {...props} size={defaultSize}>
        <p className='text-xs'>Unset</p>
      </FactoryNodeWrapper>
    );
  }

  return <FactoryNodeWrapper {...props} factoryInterfaces={interfaces} size={defaultSize} />;
}

const LogisticMachineName = {
  splitter: 'Splitter',
  merger: 'Merger',
  splitterSmart: 'Smart Splitter',
  splitterPro: 'Programmable Splitter',
  pipeJunc: 'Pipe Junction',
} as const satisfies Record<LogisticType, string>;

export function LogisticNodeEditor() {
  const { currentValue: logisticType, setValue: setLogisticType } = useEditorField<LogisticType | undefined>('type');
  return (
    <>
      <div className='flex w-full items-center justify-between'>
        <label>Type: </label>
        <select
          name='type'
          className='select select-sm select-ghost'
          value={logisticType}
          onChange={e => {
            if (e.target.value === 'unset') {
              setLogisticType(undefined);
            } else {
              setLogisticType(e.target.value as LogisticType);
            }
          }}
        >
          <option value='unset'>Unset</option>
          {Object.entries(LogisticMachineName).map(([key, value]) => (
            <option key={key} value={key}>
              {value}
            </option>
          ))}
        </select>
      </div>
      <OutputFilterRule />
      <RotationAndColorFields />
    </>
  );
}
