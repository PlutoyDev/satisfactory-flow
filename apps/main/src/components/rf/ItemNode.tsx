import { FactoryNodeEditorWrapper, FactoryNodeWrapper } from './BaseNode';
import { FactoryItemNodeData } from '../../engines/data';
import { additionNodePropMapAtom, docsMappedAtom, nodesMapAtom } from '../../lib/store';
import { NodeProps, Node } from '@xyflow/react';
import { useAtom } from 'jotai';
import { useMemo } from 'react';
import { computeFactoryItemNode } from '../../engines/compute';
import ItemComboBox from '../form/ItemComboBox';
import NumberInput from '../form/NumberInput';

const defaultSize = 90;

export function ItemNode(props: NodeProps<Node<FactoryItemNodeData>>) {
  const { itemKey, speedThou = 0 } = props.data;
  const [docsMapped] = useAtom(docsMappedAtom);
  const usedAPM = useAtom(additionNodePropMapAtom);
  const [nodeMap] = useAtom(nodesMapAtom);

  const item = itemKey && docsMapped.items.get(itemKey);
  const res = useMemo(
    () =>
      item &&
      computeFactoryItemNode({
        nodeId: props.id,
        docsMapped,
        nodeMap: nodeMap,
        usedAdditionalNodePropMapAtom: usedAPM,
      }),
    [props.data, item],
  );

  if (!itemKey) {
    return (
      <FactoryNodeWrapper {...props} factoryInterfaces={[]} size={defaultSize}>
        <p>Unset</p>
      </FactoryNodeWrapper>
    );
  }
  if (!item || !res) {
    return (
      <FactoryNodeWrapper {...props} factoryInterfaces={[]} size={defaultSize}>
        <p>Item not found</p>
      </FactoryNodeWrapper>
    );
  }

  return (
    <FactoryNodeWrapper {...props} factoryInterfaces={res.interfaces} size={defaultSize}>
      {item.iconPath && <img src={'/extracted/' + item.iconPath} alt={item.displayName} className='h-6 w-6' />}
      <p className='whitespace-pre-wrap text-center'>
        {(speedThou / 1000)
          .toFixed(3)
          .replace(/\B(?=(\d{3})+(?!\d))/g, ',')
          .replace(/\.?0*$/, '')}
        <span> /min</span>
      </p>
    </FactoryNodeWrapper>
  );
}

export function ItemNodeEditor() {
  return (
    <FactoryNodeEditorWrapper>
      <div className='flex w-full items-center justify-between'>
        <p className='label-text mr-4 text-lg'>Item: </p>
        <ItemComboBox />
      </div>
      <div className='flex w-full items-center justify-between'>
        <p className='label-text mr-4 text-lg'>Item Speed: </p>
        <NumberInput name='speedThou' defaultValue={0} unit='/ min' step={0.1} />
      </div>
    </FactoryNodeEditorWrapper>
  );
}
