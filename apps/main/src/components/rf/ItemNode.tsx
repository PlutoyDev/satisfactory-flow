import { useMemo } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { useAtom } from 'jotai';
import { FactoryItemNodeData, resolveItemNodeData, speedThouToString } from '../../engines/data';
import { docsMappedAtom } from '../../lib/store';
import ItemComboBox from '../form/ItemComboBox';
import NumberInput from '../form/NumberInput';
import { RotationAndColorFields } from '../form/RotationAndColor';
import { FactoryInterface, FactoryNodeWrapper, useEditorField } from './BaseNode';

const defaultSize = 90;

export function ItemNode(props: NodeProps<Node<FactoryItemNodeData>>) {
  const { itemKey, interfaceKind, speedThou } = resolveItemNodeData(props.data);
  const [docsMapped] = useAtom(docsMappedAtom);

  const item = itemKey && docsMapped.items.get(itemKey);

  const interfaces = useMemo(() => {
    if (!item) return {};
    const interfaces: FactoryInterface = {};
    const itemForm = item.form === 'solid' ? 'solid' : 'fluid';

    if (interfaceKind === 'both' || interfaceKind === 'in') {
      interfaces.left = [{ type: 'in', form: itemForm }];
    }
    if (interfaceKind === 'both' || interfaceKind === 'out') {
      interfaces.right = [{ type: 'out', form: itemForm }];
    }
    return interfaces;
  }, [item, interfaceKind]);

  if (!itemKey) {
    return (
      <FactoryNodeWrapper {...props} size={defaultSize}>
        <p>Unset</p>
      </FactoryNodeWrapper>
    );
  }
  if (!item) {
    return (
      <FactoryNodeWrapper {...props} size={defaultSize}>
        <p>Item not found</p>
      </FactoryNodeWrapper>
    );
  }

  return (
    <FactoryNodeWrapper {...props} factoryInterfaces={interfaces} size={defaultSize}>
      {item.iconPath && <img src={'/extracted/' + item.iconPath} alt={item.displayName} className='h-6 w-6' />}
      <p className='whitespace-pre-wrap text-center'>
        {speedThouToString(speedThou)}
        <span> /min</span>
      </p>
    </FactoryNodeWrapper>
  );
}

const interfaceCycle = {
  both: 'in',
  in: 'out',
  out: 'both',
} as const;

const interfaceText = {
  both: 'Input & Output',
  in: 'Input Only',
  out: 'Output Only',
} as const;

export function ItemNodeEditor() {
  const { currentValue: interfaceKind = 'both', setValue: setInterfaceKind } =
    useEditorField<FactoryItemNodeData['interfaceKind']>('interfaceKind');
  return (
    <>
      <div className='flex w-full items-center justify-between'>
        <p className='label-text mr-4 text-lg'>Item: </p>
        <ItemComboBox />
      </div>
      <div className='flex w-full items-center justify-between'>
        <p className='label-text mr-4 text-lg'>Item Speed: </p>
        <NumberInput name='speedThou' defaultValue={0} unit='/ min' step={0.1} />
      </div>
      <div className='flex w-full items-center justify-between'>
        <p className='label-text mr-4 text-lg'>Available Interface: </p>
        <button className='btn btn-sm' onClick={() => setInterfaceKind(interfaceCycle[interfaceKind])}>
          {interfaceText[interfaceKind]}
        </button>
      </div>
      <RotationAndColorFields />
    </>
  );
}
