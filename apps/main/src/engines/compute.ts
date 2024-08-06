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
  startedAtNodeId?: string;
}

export interface ComputeResult {
  interfaces: string[];
  itemsSpeed: Record<string, ItemSpeed[]>;
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
  const ret: ComputeResult = { interfaces: [], itemsSpeed: {} };

  if (interfaceKind === 'both' || interfaceKind === 'in') {
    const intId = `left-${itemForm}-in-0`;
    ret.interfaces.push(intId);
    ret.itemsSpeed[intId] = [{ itemKey, speedThou: speedThou }];
  }

  if (interfaceKind === 'both' || interfaceKind === 'out') {
    const intId = `right-${itemForm}-out-0`;
    ret.interfaces.push(intId);
    ret.itemsSpeed[intId] = [{ itemKey, speedThou: speedThou }];
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

  const ret: ComputeResult = { interfaces: [], itemsSpeed: {} };
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
    ret.itemsSpeed[intId] = [{ itemKey, speedThou: Math.floor((amount / durationThou) * 60) }];
  }

  dispatchAdditionNodePropMap({ type: 'compute', nodeId, result: ret });
  return ret;
}

export function computeFactoryLogisticsNode(args: ComputeArgs): ComputeResult | null {
  const {
    nodeId,
    docsMapped,
    nodeMap,
    edgeMap,
    usedAdditionalNodePropMapAtom: [additionNodePropMap, dispatchAdditionNodePropMap],
    startedAtNodeId,
  } = args;
  const nodeAdditionalProperty = additionNodePropMap.get(nodeId);
  const prevResult = nodeAdditionalProperty?.computeResult;
  if (prevResult) return prevResult;
  const nodeData = nodeMap.get(nodeId)?.data as FactoryLogisticNodeData | undefined;
  if (!nodeData) return null;
  const { type, smartProRules = { center: ['any'] }, pipeJuncInt = { left: 'in' } } = nodeData;

  /*
  Logistics nodes are a bit more complex than the other nodes.
  There item speed calculation are based on the connected nodes.

  For future reference, 
  1. Get all connected edges and the nodes they connect to.
  2. Get the connected nodes' compute results. (If not computed, compute them)
  3. Sum the item speeds of the connected nodes into a map of itemKey to speedThou.
  4. Distribute the items evenly based on the rules.
  
  if type is pipe junction (pipeJunc), for a POC, the inputs and outputs must be configured manually and stored in pipeJuncInt.
  - pipeJuncInt is a record of direction to type (in/out)

  if type is smart / programmable splitter (splitterSmart / splitterPro), the rules can be configured.
    any: The output will behave just like a normal Splitter. Parts will be evenly distributed across this output and any other available outputs. Appears by default in the center output.
    none: The output is unused. Appears by default in the right and left outputs.
    anyUndefined: Only parts that do not have their own Item rule will pass through. For example, if a  Rotor has its own output, no Rotors will ever pass through.
    overflow: This output will only be used if there are no other outputs to use (due to being full, or having no suitable rule). If multiple outputs have this filter, overflowing parts will be distributed evenly among them.
    item-${string}: Only the selected item will pass through. Its recipe has to be unlocked first for it to appear in the list.  
   */

  
}
