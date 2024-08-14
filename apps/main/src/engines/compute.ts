import { Edge, Node } from '@xyflow/react';
import { isDeepEqual, isShallowEqual } from 'remeda';
import { AdditionalNodeProperties, DocsMapped } from '../lib/store';
import {
  FactoryBeltOrPipeData,
  FactoryItemNodeData,
  FactoryLogisticNodeData,
  FactoryRecipeNodeData,
  ResolvedFactoryItemNodeData,
  ResolvedFactoryLogisticNodeData,
  ResolvedFactoryRecipeNodeData,
  resolveItemNodeData,
  resolveLogisticNodeData,
  resolveRecipeNodeData,
} from './data';

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

export const FACTORY_INTERFACE_DIR = ['left', 'top', 'right', 'bottom'] as const;
export type FactoryInterfaceDir = (typeof FACTORY_INTERFACE_DIR)[number];
export const FACTORY_INTERFACE_ITEM_FORM = ['solid', 'fluid'] as const;
export type FactoryItemForm = (typeof FACTORY_INTERFACE_ITEM_FORM)[number];
export const FACTORY_INTERFACE_TYPE = ['in', 'out'] as const;
export type FactoryInterfaceType = (typeof FACTORY_INTERFACE_TYPE)[number];
export const FACTORY_INTERFACE_INDEX = [0, 1, 2, 3] as const;
export type FactoryInterfaceIndex = (typeof FACTORY_INTERFACE_INDEX)[number];

export function splitHandleId(id: string, validate = false) {
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

export function joinIntoHandleId(a: {
  dir: FactoryInterfaceDir;
  form: FactoryItemForm;
  type: FactoryInterfaceType;
  index: FactoryInterfaceIndex;
}) {
  return `${a.dir}-${a.form}-${a.type}-${a.index}`;
}

export interface ComputeArgs {
  nodeId: string;
  docsMapped: DocsMapped;
  nodeMap: Map<string, Node>;
  edgeMap: Map<string, Edge>;
  additionalNodePropMap: Map<string, AdditionalNodeProperties>;
  startedAtNodeId?: string;
  // Do not ask the nodes connected here for their compute result
  ignoreHandleIds?: string[];
}

export interface ComputeResult<BasedOnData extends Record<string, unknown> = Record<string, string>> {
  // HandleId to ItemKey to expect speedThou
  expectItemsSpeed: Record<string, Record<string, number>>;
  // HandleId to ItemKey to actual speedThou
  actualItemsSpeed: Record<string, Record<string, number>>;
  // Data calculated based on
  basedOn: BasedOnData;
  // Use to specify that this result might be incomplete
  ignoreHandleIds?: string[];
}

export function computeFactoryItemNode(args: ComputeArgs): ComputeResult | null {
  const { nodeId, docsMapped, nodeMap, additionalNodePropMap, ignoreHandleIds } = args;
  const prevResult = additionalNodePropMap.get(nodeId)?.computeResult as ComputeResult<ResolvedFactoryItemNodeData>;

  const nullableNodeData = nodeMap.get(nodeId)?.data as FactoryItemNodeData | undefined;
  if (!nullableNodeData) return null;
  const nodeData = resolveItemNodeData(nullableNodeData);
  const { itemKey, speedThou, interfaceKind } = nodeData;
  if (prevResult) {
    if (isShallowEqual(ignoreHandleIds, prevResult.ignoreHandleIds) && isDeepEqual(nodeData, prevResult.basedOn)) {
      return prevResult;
    }
  }

  if (!itemKey) return null;
  const item = docsMapped.items.get(itemKey);
  if (!item) {
    console.error(`Item ${itemKey} not found`);
    return null;
  }

  const itemForm = item.form === 'solid' ? 'solid' : 'fluid';
  const ret: ComputeResult = { expectItemsSpeed: {}, actualItemsSpeed: {}, basedOn: nodeData };

  if (interfaceKind === 'both' || interfaceKind === 'in') {
    const intId = `left-${itemForm}-in-0`;
    ret.expectItemsSpeed[intId] = { [itemKey]: speedThou };
    // TODO: Actual speed will depends on the node connected at the output if interfaceKind is both
  }

  if (interfaceKind === 'both' || interfaceKind === 'out') {
    const intId = `right-${itemForm}-out-0`;
    ret.expectItemsSpeed[intId] = { [itemKey]: speedThou };
    // TODO: Actual speed will depends on the node connected at the input if interfaceKind is both
  }

  return ret;
}

export function computeFactoryRecipeNode(args: ComputeArgs): ComputeResult | null {
  const { nodeId, docsMapped, nodeMap, additionalNodePropMap, ignoreHandleIds } = args;
  const prevResult = additionalNodePropMap.get(nodeId)?.computeResult as ComputeResult<ResolvedFactoryRecipeNodeData>;

  const nullableNodeData = nodeMap.get(nodeId)?.data as FactoryRecipeNodeData | undefined;
  if (!nullableNodeData) return null;
  const nodeData = resolveRecipeNodeData(nullableNodeData);
  const { recipeKey, clockSpeedThou } = nodeData;
  if (prevResult) {
    if (isShallowEqual(ignoreHandleIds, prevResult.ignoreHandleIds) && isDeepEqual(nodeData, prevResult.basedOn)) {
      return prevResult;
    }
  }

  if (!recipeKey) return null;
  const recipe = docsMapped.recipes.get(recipeKey);
  if (!recipe) {
    console.error(`Recipe ${recipeKey} not found`);
    return null;
  }

  const ret: ComputeResult = { expectItemsSpeed: {}, actualItemsSpeed: {}, basedOn: nodeData };
  const { ingredients, products, manufactoringDuration } = recipe;

  const durationThou = manufactoringDuration / (clockSpeedThou / 100_00); // Duration in thousandths of a second
  const itemsLength = ingredients.length + products.length;
  const IntTypeCount = { in: 0, out: 0 };

  for (let i = 0; i < itemsLength; i++) {
    const isIngredient = i < ingredients.length;
    const itemAmt = isIngredient ? ingredients[i] : products[products.length - (i - ingredients.length) - 1];
    const { itemKey, amount } = itemAmt;
    const item = docsMapped.items.get(itemKey);
    if (!item) {
      throw new Error(`Item ${itemKey} not found for recipe ${recipeKey}`);
    }

    const itemForm = item.form === 'solid' ? 'solid' : 'fluid';
    const type = isIngredient ? 'in' : 'out';
    const intTypeIdx = IntTypeCount[type]++;
    const intId = `${isIngredient ? 'left' : 'right'}-${itemForm}-${type}-${intTypeIdx}`;
    const expectSpeedThou = ((isIngredient ? -amount : amount) / durationThou) * 60;
    ret.expectItemsSpeed[intId] = { [itemKey]: expectSpeedThou };
    // TODO: Actual speed will depends on the nodes connected at the input and output, which will determine its efficiency
    // If output is demanding less than the expected, the input will be throttled
    // If input is providing less than the expected, the output will be throttled
    // For both input and output, the actual speed will be the minimum of the two, and the other will be adjusted accordingly
  }

  return ret;
}

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
  - any: The output will behave just like a normal Splitter. Parts will be evenly distributed across this output and any other available outputs. Appears by default in the center output.
  - none: The output is unused. Appears by default in the right and left outputs.
  - anyUndefined: Only parts that do not have their own Item rule will pass through. For example, if a  Rotor has its own output, no Rotors will ever pass through.
  - overflow: This output will only be used if there are no other outputs to use (due to being full, or having no suitable rule). If multiple outputs have this filter, overflowing parts will be distributed evenly among them.
  - item-${string}: Only the selected item will pass through. Its recipe has to be unlocked first for it to appear in the list.  
*/
export function computeFactoryLogisticsNode(args: ComputeArgs): ComputeResult | null {
  const { nodeId, nodeMap, edgeMap, additionalNodePropMap, ignoreHandleIds } = args;
  const nodeAdditionalProperty = additionalNodePropMap.get(nodeId);
  const prevResult = nodeAdditionalProperty?.computeResult as ComputeResult<ResolvedFactoryLogisticNodeData>;

  const nullableNodeData = nodeMap.get(nodeId)?.data as FactoryLogisticNodeData | undefined;
  if (!nullableNodeData) return null;
  const nodeData = resolveLogisticNodeData(nullableNodeData);
  const { type: logisticType, smartProRules, pipeJuncInt } = nodeData;
  if (!logisticType) {
    return null;
  }

  if (prevResult) {
    if (isShallowEqual(ignoreHandleIds, prevResult.ignoreHandleIds) && isDeepEqual(nodeData, prevResult.basedOn)) {
      return prevResult;
    }
  }

  const ret: ComputeResult = { expectItemsSpeed: {}, actualItemsSpeed: {}, basedOn: nodeData };
  if (ignoreHandleIds && ignoreHandleIds.length > 0) {
    ret.ignoreHandleIds = ignoreHandleIds;
  }

  const remainingItemsSpeed: Map<string, number> = new Map();
  const handleIdToEdgeIdMap = nodeAdditionalProperty?.edges;
  // Connected in and outs
  const inHandleIds: string[] = [];
  const outHandleIds: string[] = [];
  const anyOutHandleIds: string[] = [];
  const overflowOutHandleIds: string[] = [];
  const specificItemOutHandleIds: Record<string, string[]> = {};
  const anyUndefinedOutHandleIds: string[] = [];

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

    // Find the connected edge and the other node
    const handleId = `${dir}-${itemForm}-${intType}-0`;
    ret.expectItemsSpeed[handleId] = intType === 'in' ? { any: -Infinity } : { any: Infinity }; // Expects to demand everything or provide everything

    const edgeId = handleIdToEdgeIdMap?.get(handleId);
    if (edgeId && !ignoreHandleIds?.includes(handleId)) {
      // Connected to an edge with id ${edgeId}
      const edge = edgeMap.get(edgeId);
      if (!edge) {
        console.error(`Edge ${edgeId} not found`);
        continue;
      }
      const otherNodeId = intType === 'in' ? edge.source : edge.target;
      const otherHandleId = intType === 'in' ? edge.sourceHandle : edge.targetHandle;
      if (!otherHandleId) {
        console.error(`Invalid handleId ${otherHandleId} connected with edge ${edgeId} at node ${otherNodeId}`);
        continue;
      }
      const otherNodeAdditionalProperty = additionalNodePropMap.get(otherNodeId);
      if (!otherNodeAdditionalProperty) {
        console.error(`Node ${otherNodeId} not found`);
        continue;
      }
      const nodeComputeResult =
        otherNodeAdditionalProperty.computeResult ??
        computeNode({ startedAtNodeId: otherNodeId, ...args, nodeId: otherNodeId, ignoreHandleIds: [otherHandleId] });
      if (!nodeComputeResult) {
        console.error(`Unable to compute node ${otherNodeId}`);
        continue;
      }
      const nodeItemSpeed = nodeComputeResult.actualItemsSpeed[otherHandleId] ?? nodeComputeResult.expectItemsSpeed[otherHandleId];
      if (!nodeItemSpeed) {
        console.warn(`Item speed not found for handleId ${otherHandleId} at node ${otherNodeId}`);
        continue;
      }
      for (const itemKey in nodeItemSpeed) {
        const speedThou = nodeItemSpeed[itemKey];
        ret.actualItemsSpeed[handleId] ??= {};
        ret.actualItemsSpeed[handleId][itemKey] = speedThou;

        const newValue = (remainingItemsSpeed.get(itemKey) ?? 0) + speedThou;
        if (newValue === 0) {
          remainingItemsSpeed.delete(itemKey);
        } else {
          remainingItemsSpeed.set(itemKey, newValue);
        }
      }

      if (intType === 'in') {
        inHandleIds.push(handleId);
      } else if (dir !== 'left') {
        // Left is always in for all logistic nodes, doing this just prevent typescript error
        outHandleIds.push(handleId);
        if (logisticType === 'splitterSmart' || logisticType === 'splitterPro') {
          // Need do split based on the rules here
          const rules = smartProRules[dir] ?? ['none'];
          if (rules[0] === 'none') continue; // Don't distribute to this node
          if (rules[0] === 'any') {
            anyOutHandleIds.push(handleId);
          } else if (rules[0] === 'overflow') {
            overflowOutHandleIds.push(handleId);
          } else if (rules[0] === 'anyUndefined') {
            anyUndefinedOutHandleIds.push(handleId);
          } else {
            for (const rule of rules) {
              if (!rule.startsWith('item-')) {
                console.error(`Invalid rule ${rule} for node ${nodeId}`);
                continue;
              }
              const itemKey = rule.slice(5);
              specificItemOutHandleIds[itemKey] ??= [];
              specificItemOutHandleIds[itemKey].push(handleId);
            }
          }
        } else {
          // Normal splitter / merger / pipeJunc
          anyOutHandleIds.push(handleId);
        }
      }
    }
  }

  const hasSpecificItemOutAndAnyUndefinedOut = Object.keys(specificItemOutHandleIds).length > 0 && anyUndefinedOutHandleIds.length > 0;

  // Distribute remaining items based on the rules
  for (const [itemKey, speedThou] of remainingItemsSpeed) {
    if (speedThou === 0) continue;
    let handleIds: string[]; // Handle Ids to distribute the item to
    if (speedThou < 0) {
      // if negative speedThou, it means the item is being consumed more than what is provided
      handleIds = inHandleIds.length > 0 ? inHandleIds : outHandleIds;
    } else {
      if (itemKey in specificItemOutHandleIds) {
        // If the item has been specified to go to a specific output
        handleIds = specificItemOutHandleIds[itemKey];
        handleIds.push(...anyOutHandleIds); //If there are any out, it will be distributed to any out also
      } else if (hasSpecificItemOutAndAnyUndefinedOut) {
        // If the item isn't specified to go to a specific output.
        // But this node has specific item out and any undefined out
        // So it needs to be distributed to anyUndefined output
        handleIds = anyUndefinedOutHandleIds;
        handleIds.push(...anyOutHandleIds); //If there are any out, it will be distributed to any out also
      } else {
        handleIds = anyOutHandleIds;
      }
      if (handleIds.length === 0) {
        // if no handleId to distribute to, floor the speedThou in the negHandleIds
        handleIds = inHandleIds;
      }
    }

    // TODO: Handle Overflow
    const itemSpeed = Math.floor(speedThou / handleIds.length);
    for (const handleId of handleIds) {
      ret.actualItemsSpeed[handleId] ??= {};
      ret.actualItemsSpeed[handleId][itemKey] += itemSpeed;
    }
  }

  return ret;
}

export function computeNode(args: ComputeArgs) {
  const { nodeId, nodeMap } = args;
  const node = nodeMap.get(nodeId);
  if (!node) return null;
  switch (node.type) {
    case 'item':
      return computeFactoryItemNode(args);
    case 'recipe':
      return computeFactoryRecipeNode(args);
    case 'logistic':
      return computeFactoryLogisticsNode(args);
    default:
      console.error(`Unknown node type ${node.data.type}`);
      return null;
  }
}

type EdgeComputeArgs = Omit<ComputeArgs, 'nodeId' | 'startedAtNodeId' | 'ignoreHandleIds'> & { edgeId: string };

export function computeFactoryBeltOrPieEdge(args: EdgeComputeArgs): FactoryBeltOrPipeData | undefined {
  const { edgeId, docsMapped, edgeMap, additionalNodePropMap } = args;
  const { source, sourceHandle, target, targetHandle } = edgeMap.get(edgeId)!;

  const sourceANP = additionalNodePropMap.get(source)!;
  const targetANP = additionalNodePropMap.get(target)!;

  let startLabel: string = '';
  let centerLabel: string = '';
  let endLabel: string = '';
  let colorMode: FactoryBeltOrPipeData['colorMode'] = 'default';
  if (!sourceHandle || !targetHandle) {
    colorMode = 'error';
    centerLabel = 'Invalid Node (please submit a bug report)';
  } else if (!sourceANP.computeResult || !targetANP.computeResult) {
    return undefined;
  } else {
    const sourceResult = sourceANP.computeResult;
    const targetResult = targetANP.computeResult;
    // Has computed result
    const sourceItemsSpeed = sourceResult.actualItemsSpeed[sourceHandle] ?? sourceResult.expectItemsSpeed[sourceHandle] ?? {};
    const targetItemsSpeed = targetResult.actualItemsSpeed[targetHandle] ?? targetResult.expectItemsSpeed[targetHandle] ?? {};
    console.log({ sourceItemsSpeed, targetItemsSpeed });
    // Compare the source and target items speed and show warning if they are not equal
    const itemKeys = new Set<string>([...Object.keys(sourceItemsSpeed), ...Object.keys(targetItemsSpeed)]);
    for (const key of itemKeys) {
      const item = docsMapped.items.get(key);
      const sourceValue = sourceItemsSpeed[key];
      const targetValue = targetItemsSpeed[key];
      const sum = (sourceValue ?? 0) + (targetValue ?? 0); // Input is negative, output is positive, so sum should be 0 if they are equal
      if (sum < 0) {
        colorMode = 'warning';
        startLabel += `Underproducing: ${item?.displayName}`;
        endLabel += `Overconsuming: ${item?.displayName}`;
      } else if (sum > 0) {
        colorMode = 'warning';
        startLabel += `Overproducing: ${item?.displayName}`;
        endLabel += `Underconsuming: ${item?.displayName}`;
      }
    }
  }

  return { colorMode, centerLabel, startLabel, endLabel };
}
