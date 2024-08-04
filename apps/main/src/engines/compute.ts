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

import type { Item } from 'docs-parser';
import { FactoryItemNodeData } from './data';

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
  const [dir, form, type, index] = parts as [FactoryInterfaceDir, FactoryItemForm, FactoryInterfaceType, FactoryInterfaceIndex];
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
  speedThou: number;
}

export interface ComputeResult {
  interfaces: string[];
  itemSpeed: Record<string, ItemSpeed>;
}

export function computeFactoryItemNode(
  data: FactoryItemNodeData,
  itemGetterOrItem: ((key: string) => Item | undefined) | Item,
): null | ComputeResult {
  const { itemKey, speedThou = 0, interfaceKind = 'both' } = data;

  if (!itemKey) return null;
  const item = typeof itemGetterOrItem === 'function' ? itemGetterOrItem(itemKey) : itemGetterOrItem;
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

  return ret;
}
