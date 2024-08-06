// TODO: Computation engine
/*
Will be Modified from: 
  https://github.com/PlutoyDev/satisfactory-planning-tool/blob/e0e7999f0542e5ad068c8c414c426fb904b8f6fa/src/lib/factoryCompute.ts

Computation of factory inputs and outputs, using the properties of the nodes and edges in the graph.
Each edge connecting two nodes represents a belt (or pipe), and the nodes represent machines.

Satisfactory machines are split into 4 categories:
- Items (e.g Miners, Containers) - Produces or Consumes items
- Recipes (e.g Smelters, Constructors) - Converts items
- Logistics (e.g Splitters, Mergers) - Distributes items
- Generators (e.g Biomass Burners, Coal Generators) - Consumes items to produce power (and for some, produces waste)

"Interfaces", refering to input/output are represented as a combination of 
- direction (left, top, right, bottom)
- itemForm (solid, fluid)
- type (in, out)
- index (0, 1, 2, 3)

Interfaces are represented as a lowercase string joined by a hyphen, e.g. "left-solid-in-0". 
They also correspond as the handleId of the node.

Each "machine" will have a compute function that will take node and edge data and return:
- interfaces (`${direction}-${itemForm}-${type}-${index}`)
- itemRate (items per minute)

---

Due to floating point precision, all computations will be done in integers by multiplying floats by 1000 and then dividing by 1000 at the end.
Any variable that is "mimicking" a float will be suffixed with "Thou" (short for thousandth) ie clockSpeedThou, itemRateThou, etc.
FYI: the "Thou" suffix is pronounced "th-ow" (like "thousandth" but without the "sandth"), and it came from thousandth of an inch (thou) in engineering. (I'm just bad at naming things)
*/

import { FactoryItemNodeData, FactoryLogisticNodeData, FactoryRecipeNodeData } from './data';
import { type additionNodePropMapAtom, DocsMapped, UsedAtom } from '../lib/store';
import { Edge, Node } from '@xyflow/react';

export const FACTORY_INTERFACE_DIR = ['left', 'top', 'right', 'bottom'] as const;
export type FactoryInterfaceDir = (typeof FACTORY_INTERFACE_DIR)[number];
export const FACTORY_INTERFACE_ITEM_FORM = ['solid', 'fluid'] as const;
export type FactoryItemForm = (typeof FACTORY_INTERFACE_ITEM_FORM)[number];
export const FACTORY_INTERFACE_TYPE = ['in', 'out'] as const;
export type FactoryInterfaceType = (typeof FACTORY_INTERFACE_TYPE)[number];
export const FACTORY_INTERFACE_INDEX = [0, 1, 2, 3] as const;
export type FactoryInterfaceIndex = (typeof FACTORY_INTERFACE_INDEX)[number];

export function splitInterfaceId(id: string, validate = false) {
  const parts = id.split('-');
  if (validate && parts.length !== 4) {
    throw new Error('Invalid Interface ID');
  }
  const [dir, form, type, indexStr] = parts as [FactoryInterfaceDir, FactoryItemForm, FactoryInterfaceType, '0' | '1' | '2' | '3'];
  const index = parseInt(indexStr) as FactoryInterfaceIndex;
  if (isNaN(index)) {
    throw new Error('Invalid Interface Index');
  }
  if (validate) {
    if (!FACTORY_INTERFACE_DIR.includes(dir)) {
      throw new Error('Invalid Interface Direction');
    }
    if (!FACTORY_INTERFACE_ITEM_FORM.includes(form)) {
      throw new Error('Invalid Interface Item Form');
    }
    if (!FACTORY_INTERFACE_TYPE.includes(type)) {
      throw new Error('Invalid Interface Type');
    }
    if (!FACTORY_INTERFACE_INDEX.includes(index)) {
      throw new Error('Invalid Interface Index');
    }
  }
  return { dir, form, type, index };
}

// Compute for machines
export interface ItemSpeed {
  itemKey: string;
  /** Items per minute */
  speedThou: number;
}

export interface ComputeArgs {
  nodeId: string;
  docsMapped: DocsMapped;
  nodeMap: Map<string, Node>;
  edgeMap: Map<string, Edge>;
  usedAdditionalNodePropMapAtom: UsedAtom<typeof additionNodePropMapAtom>;
}

export interface ComputeResult {
  interfaces: string[];
  itemSpeed: Record<string, ItemSpeed>;
}

export function computeFactoryItemNode(args: ComputeArgs): ComputeResult | null {
  const {
    nodeId,
    docsMapped,
    nodeMap,
    usedAdditionalNodePropMapAtom: [additionNodePropMapAtom, dispatchAdditionNodePropMap],
  } = args;
  const prevResult = additionNodePropMapAtom.get(nodeId)?.computeResult;
  if (prevResult) return prevResult;

  const nodeData = nodeMap.get(nodeId)?.data as FactoryItemNodeData | undefined;
  if (!nodeData) return null;
  const { itemKey, speedThou = 0, interfaceKind = 'both' } = nodeData;

  if (!itemKey) return null;
  const item = docsMapped.items.get(itemKey);
  if (!item) {
    console.error(`Item ${itemKey} not found`);
    return null;
  }

  const itemForm = item.form === 'solid' ? 'solid' : 'fluid';
  const ret: ComputeResult = { interfaces: [], itemSpeed: {} };

  if (interfaceKind === 'both' || interfaceKind === 'in') {
    const intId = `left-${itemForm}-in-0`;
    ret.interfaces.push(intId);
    ret.itemSpeed[intId] = { itemKey, speedThou: speedThou };
  }

  if (interfaceKind === 'both' || interfaceKind === 'out') {
    const intId = `right-${itemForm}-out-0`;
    ret.interfaces.push(intId);
    ret.itemSpeed[intId] = { itemKey, speedThou: speedThou };
  }

  dispatchAdditionNodePropMap({ type: 'compute', nodeId, result: ret });
  return ret;
}

export function computeFactoryRecipeNode(args: ComputeArgs): ComputeResult | null {
  const {
    nodeId,
    docsMapped,
    nodeMap,
    usedAdditionalNodePropMapAtom: [additionNodePropMapAtom, dispatchAdditionNodePropMap],
  } = args;
  const prevResult = additionNodePropMapAtom.get(nodeId)?.computeResult;
  if (prevResult) return prevResult;

  const nodeData = nodeMap.get(nodeId)?.data as FactoryRecipeNodeData | undefined;
  if (!nodeData) return null;
  const { recipeKey, clockSpeedThou = 1000 } = nodeData;

  if (!recipeKey) return null;
  const recipe = docsMapped.recipes.get(recipeKey);
  if (!recipe) {
    console.error(`Recipe ${recipeKey} not found`);
    return null;
  }

  const ret: ComputeResult = { interfaces: [], itemSpeed: {} };
  const { ingredients, products, manufactoringDuration } = recipe;

  const durationThou = manufactoringDuration / clockSpeedThou; // Duration in thousandths of a second
  const itemsLength = ingredients.length + products.length;
  const IntTypeCount = { in: 0, out: 0 };

  for (let i = 0; i < itemsLength; i++) {
    const itemAmt = i < ingredients.length ? ingredients[i] : products[products.length - (i - ingredients.length) - 1];
    const { itemKey, amount } = itemAmt;
    const item = docsMapped.items.get(itemKey);
    if (!item) {
      throw new Error(`Item ${itemKey} not found for recipe ${recipeKey}`);
    }

    const itemForm = item.form === 'solid' ? 'solid' : 'fluid';
    const isIngredient = i < ingredients.length;
    const type = isIngredient ? 'in' : 'out';
    const intTypeIdx = IntTypeCount[type]++;
    const intId = `${isIngredient ? 'left' : 'right'}-${itemForm}-${type}-${intTypeIdx}`;
    ret.interfaces.push(intId);
    ret.itemSpeed[intId] = { itemKey, speedThou: Math.floor((amount / durationThou) * 60) };
  }

  dispatchAdditionNodePropMap({ type: 'compute', nodeId, result: ret });
  return ret;
}
