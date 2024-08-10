import { NodeProps, Node } from '@xyflow/react';
import { useAtom } from 'jotai';
import { computeFactoryLogisticsNode } from '../../engines/compute';
import { FactoryLogisticNodeData, LogisticType } from '../../engines/data';
import { docsMappedAtom, additionNodePropMapAtom, nodesMapAtom, edgesMapAtom } from '../../lib/store';
import { RotationAndColorFields } from '../form/RotationAndColor';
import { FactoryNodeWrapper, useEditorField } from './BaseNode';
import { OutputFilterRule } from '../form/OutputFilterRule';

const defaultSize = 36;

export function LogisticNode(props: NodeProps<Node<FactoryLogisticNodeData>>) {
  const [docsMapped] = useAtom(docsMappedAtom);
  const usedAPM = useAtom(additionNodePropMapAtom);
  const [nodeMap] = useAtom(nodesMapAtom);
  const [edgeMap] = useAtom(edgesMapAtom);

  const res = computeFactoryLogisticsNode({
    nodeId: props.id,
    docsMapped,
    nodeMap,
    edgeMap,
    usedAdditionalNodePropMapAtom: usedAPM,
  });

  if (!res) {
    return (
      <FactoryNodeWrapper {...props} factoryInterfaces={[]} size={defaultSize}>
        <p>Item not found</p>
      </FactoryNodeWrapper>
    );
  }

  return <FactoryNodeWrapper {...props} factoryInterfaces={res?.interfaces} size={defaultSize} />;
}

const LogisticMachineName = {
  splitter: 'Splitter',
  merger: 'Merger',
  splitterSmart: 'Smart Splitter',
  splitterPro: 'Programmable Splitter',
  pipeJunc: 'Pipe Junction',
} as const satisfies Record<LogisticType, string>;

export function LogisticNodeEditor() {
  const { currentValue: logisticType, setValue: setLogisticType } = useEditorField<LogisticType>('type');
  return (
    <>
      <div className='flex w-full items-center justify-between'>
        <label>Type: </label>
        <select
          name='type'
          className='select select-sm select-ghost'
          value={logisticType}
          onChange={e => {
            setLogisticType(e.target.value as LogisticType);
          }}
        >
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
