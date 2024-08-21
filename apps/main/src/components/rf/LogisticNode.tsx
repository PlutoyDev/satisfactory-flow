import { useMemo } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import {
  type FactoryItemForm,
  type FactoryInterfaceType,
  FACTORY_INTERFACE_DIR,
  LogisticType,
  type FactoryLogisticNodeData,
  resolveLogisticNodeData,
} from '../../lib/data';
import { OutputFilterRule } from '../form/OutputFilterRule';
import { RotationAndColorFields } from '../form/RotationAndColor';
import { FactoryInterface, FactoryNodeWrapper, useEditorField } from './BaseNode';

const defaultSize = 96;

export function LogisticNode(props: NodeProps<Node<FactoryLogisticNodeData>>) {
  const { type: logisticType, pipeJuncInt } = resolveLogisticNodeData(props.data);

  const interfaces = useMemo(() => {
    if (!logisticType) return {};
    const interfaces: FactoryInterface = {};
    for (const dir of FACTORY_INTERFACE_DIR) {
      let itemForm: FactoryItemForm;
      let intType: FactoryInterfaceType;
      if (logisticType === 'pipeJunc') {
        itemForm = 'fluid';
        intType = dir === 'left' ? 'in' : (pipeJuncInt[dir] ?? 'out');
      } else {
        itemForm = 'solid';
        intType = (logisticType === 'merger' ? dir !== 'right' : dir === 'left') ? 'in' : 'out';
      }
      interfaces[dir] = [{ type: intType, form: itemForm }];
    }
    return interfaces;
  }, [logisticType, pipeJuncInt]);

  if (!logisticType) {
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
