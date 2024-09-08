// Factory Interface Engine
// Returns avilable interface for a particular node type
// Store the result in a store until the node data changed
import { atom, getDefaultStore } from 'jotai';
import { FactoryInterface } from '../components/rf/BaseNode';
import {
  FACTORY_INTERFACE_DIR,
  FACTORY_MACHINE_PROPERTIES,
  FactoryBaseNodeData,
  FactoryInterfaceType,
  FactoryItemForm,
  FactoryItemNodeData,
  FactoryLogisticNodeData,
  FactoryRecipeNodeData,
  resolveItemNodeData,
  resolveLogisticNodeData,
  resolveRecipeNodeData,
} from '../lib/data';
import { DocsMapped } from '../lib/store';

// Store the factory interface for each item node
type CachedFactoryInterface<Data extends FactoryBaseNodeData = FactoryBaseNodeData> = {
  data: Data; // Use to check if the data is changed
  interfaces: FactoryInterface;
};

const factoryInterfaceAtom = atom<Map<string, CachedFactoryInterface>>(new Map());

type FactoryInterfaceParams<Data extends FactoryBaseNodeData = FactoryBaseNodeData> = {
  nodeId: string;
  data: Data;
  docsMapped: DocsMapped;
  memo?: boolean; //Control if store the result in a store
};

const memoDefault = true; // Default value of toMemo, usefull when testing

export function getFactoryInterfaceForItemNode({
  nodeId,
  data,
  docsMapped,
  memo = memoDefault,
}: FactoryInterfaceParams<FactoryItemNodeData>) {
  const resolvedData = resolveItemNodeData(data);
  const { itemKey, interfaceKind } = resolvedData;
  if (memo) {
    const store = getDefaultStore();
    const cached = store.get(factoryInterfaceAtom).get(nodeId) as CachedFactoryInterface<FactoryItemNodeData> | undefined;
    if (cached) {
      const { data: cachedData, interfaces } = cached;
      if (cachedData.itemKey === itemKey && cachedData.interfaceKind === interfaceKind) {
        return interfaces;
      }
    }
  }

  const item = itemKey && docsMapped.items.get(itemKey);

  if (!item) {
    return null;
  }

  const interfaces: FactoryInterface = {};
  const itemForm = item.form === 'solid' ? 'solid' : 'fluid';

  if (interfaceKind === 'both' || interfaceKind === 'in') {
    interfaces.left = [{ type: 'in', form: itemForm }];
  }

  if (interfaceKind === 'both' || interfaceKind === 'out') {
    interfaces.right = [{ type: 'out', form: itemForm }];
  }

  if (memo) {
    const store = getDefaultStore();
    store.get(factoryInterfaceAtom).set(nodeId, { data: resolvedData, interfaces });
  }

  return interfaces;
}

export function getFactoryInterfaceForRecipeNode({
  nodeId,
  data,
  docsMapped,
  memo = memoDefault,
}: FactoryInterfaceParams<FactoryRecipeNodeData>) {
  const resolvedData = resolveRecipeNodeData(data);
  const { recipeKey } = resolvedData;

  if (memo) {
    const store = getDefaultStore();
    const cached = store.get(factoryInterfaceAtom).get(nodeId) as CachedFactoryInterface<FactoryRecipeNodeData> | undefined;
    if (cached) {
      const { data: cachedData, interfaces } = cached;
      if (cachedData.recipeKey === recipeKey) {
        return interfaces;
      }
    }
  }

  const recipe = recipeKey && docsMapped.recipes.get(recipeKey);

  if (!recipe) {
    return null;
  }

  const { producedIn } = recipe;

  if (!(producedIn in FACTORY_MACHINE_PROPERTIES)) {
    console.error(`Recipe ${recipeKey} produced in unknown machine ${producedIn}`);
    // TODO: If the machine is not hardcoded yet, use the ingredient list to determine the interfaces
    return null;
  }

  const interfaces: FactoryInterface = { left: [], right: [] };
  const { solidIn, solidOut, fluidIn, fluidOut } = FACTORY_MACHINE_PROPERTIES[producedIn];

  for (let i = 0; i < solidIn + fluidIn; i++) {
    interfaces.left!.push({ form: i < solidIn ? 'solid' : 'fluid', type: 'in' });
  }

  for (let i = 0; i < solidOut + fluidOut; i++) {
    interfaces.right!.push({ form: i < solidOut ? 'solid' : 'fluid', type: 'out' });
  }

  if (memo) {
    const store = getDefaultStore();
    store.get(factoryInterfaceAtom).set(nodeId, { data: resolvedData, interfaces });
  }

  return interfaces;
}

export function getFactoryInterfaceForLogisticNode({
  nodeId,
  data,
  memo = memoDefault,
}: Omit<FactoryInterfaceParams<FactoryLogisticNodeData>, 'docsMapped'>) {
  const resolvedData = resolveLogisticNodeData(data);
  const { type: logisticType, pipeJuncInt } = resolvedData;

  if (memo) {
    const store = getDefaultStore();
    const cached = store.get(factoryInterfaceAtom).get(nodeId) as CachedFactoryInterface | undefined;
    if (cached) {
      const { data: cachedData, interfaces } = cached;
      if (cachedData.logisticType === logisticType && cachedData.pipeJuncInt === pipeJuncInt) {
        return interfaces;
      }
    }
  }

  if (!logisticType) {
    return null;
  }

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

  if (memo) {
    const store = getDefaultStore();
    store.get(factoryInterfaceAtom).set(nodeId, { data: resolvedData, interfaces });
  }

  return interfaces;
}

export function getFactoryInterfaceForSinkNode() {
  return { left: [{ type: 'in', form: 'solid' }] };
}
