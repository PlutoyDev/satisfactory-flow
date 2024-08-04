import { FactoryNodeWrapper } from './BaseNode';
import { FactoryItemNodeData } from '../../engines/data';
import { docsMappedAtom } from '../../lib/store';
import { NodeProps, Node } from '@xyflow/react';
import { useAtom } from 'jotai';
import { useMemo } from 'react';
import { computeFactoryItemNode } from '../../engines/compute';

const defaultBgColor = '#89dceb';
const defaultSize = 60;

export function ItemNode(props: NodeProps<Node<FactoryItemNodeData>>) {
  const { itemKey, speedThou = 0 } = props.data;
  const [docsMapped] = useAtom(docsMappedAtom);

  const item = itemKey && docsMapped.items.get(itemKey);
  const res = useMemo(() => item && computeFactoryItemNode(props.data, item)!, [props.data, item]);

  if (!itemKey) {
    return (
      <FactoryNodeWrapper {...props} defBgColor={defaultBgColor} factoryInterfaces={[]} counterRotate='images' size={defaultSize}>
        <p>Unset</p>
      </FactoryNodeWrapper>
    );
  }
  if (!item || !res) {
    return (
      <FactoryNodeWrapper {...props} defBgColor={defaultBgColor} factoryInterfaces={[]} counterRotate='images' size={defaultSize}>
        <p>Item not found</p>
      </FactoryNodeWrapper>
    );
  }

  return (
    <FactoryNodeWrapper {...props} defBgColor={defaultBgColor} factoryInterfaces={res.interfaces} counterRotate='images' size={defaultSize}>
      {item.iconPath && <img src={item.iconPath} alt={item.displayName} />}
      <p>{(speedThou / 1000).toPrecision(3).replace('.000', '')} items/s</p>
    </FactoryNodeWrapper>
  );
}
