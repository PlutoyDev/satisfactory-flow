import { NodeProps, Node } from '@xyflow/react';
import { useAtom } from 'jotai';
import { getFactoryInterfaceForItemNode } from '../../engines/interface';
import { FactoryItemNodeData, resolveItemNodeData, speedThouToString } from '../../lib/data';
import { docsMappedAtom } from '../../lib/store';
import ItemOrRecipeComboBox from '../form/ItemOrRecipeComboBox';
import NumberInput from '../form/NumberInput';
import { RotationAndColorFields } from '../form/RotationAndColor';
import { FactoryNodeWrapper, useEditorField } from './BaseNode';

const defaultSize = 96;
// const MachineSize = {
//   Build_MinerMk1_C: [336, 144],
// Build_MinerMk2_C: [336,144],
// Build_MinerMk3_C: [336,144],
//   Build_OilPump_C: [336, 192],
//   Build_WaterPump_C: [480, 468],
//   Build_FrackingSmasher_C: [480, 480],
// } as const satisfies Record<string, [number, number]>;

export function ItemNode(props: NodeProps<Node<FactoryItemNodeData>>) {
  const { itemKey, speedThou } = resolveItemNodeData(props.data);
  const [docsMapped] = useAtom(docsMappedAtom);

  const item = itemKey && docsMapped.items.get(itemKey);

  const interfaces = getFactoryInterfaceForItemNode({
    nodeId: props.id,
    data: props.data,
    docsMapped,
  });

  if (!interfaces) {
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

  // const size =
  //   item.form === 'solid'
  //     ? MachineSize.Build_MinerMk1_C
  //     : item.form === 'gas'
  //       ? MachineSize.Build_FrackingSmasher_C
  //       : item.key === 'Desc_Water_C'
  //         ? MachineSize.Build_WaterPump_C
  //         : item.key === 'Desc_LiquidOil_C'
  //           ? MachineSize.Build_OilPump_C
  //           : defaultSize;

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
  const { currentValue: itemKey, setValue: setItemKey } = useEditorField<string | undefined>('itemKey');
  return (
    <>
      <div className='flex w-full items-center justify-between'>
        <p className='label-text mr-4 text-lg'>Item: </p>
        <ItemOrRecipeComboBox type='item' defaultKey={itemKey} onKeySelected={setItemKey} />
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
