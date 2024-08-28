import { Edge } from '@xyflow/react';
import {
  FACTORY_INTERFACE_DIR,
  FactoryBeltOrPipeData,
  FactoryInterfaceType,
  FactoryItemForm,
  FactoryItemNodeData,
  FactoryLogisticNodeData,
  FactoryRecipeNodeData,
  resolveItemNodeData,
  resolveLogisticNodeData,
  resolveRecipeNodeData,
  speedThouToString,
} from '../lib/data';
import { appendStatusMessage, DocsMapped, ExtendedNode } from '../lib/store';

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
*/

export interface ComputeArgs {
  nodeId: string;
  docsMapped: DocsMapped;
  nodeMap: Map<string, ExtendedNode>;
  edgeMap: Map<string, Edge>;
  visitedNode?: string[];
  // Do not ask the nodes connected here for their compute result
  ignoreHandleIds?: string[];
  nodesComputeResult: Map<string, ComputeResult>;
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
  const { nodeId, docsMapped, nodeMap } = args;

  const nullableNodeData = nodeMap.get(nodeId)?.data as FactoryItemNodeData | undefined;
  if (!nullableNodeData) return null;
  const nodeData = resolveItemNodeData(nullableNodeData);
  const { itemKey, speedThou, interfaceKind } = nodeData;

  if (!itemKey) return null;
  const item = docsMapped.items.get(itemKey);
  if (!item) {
    appendStatusMessage({ type: 'error', message: `Item ${itemKey} not found` });
    return null;
  }

  const itemForm = item.form === 'solid' ? 'solid' : 'fluid';
  const ret: ComputeResult = { expectItemsSpeed: {}, actualItemsSpeed: {}, basedOn: nodeData };

  if (interfaceKind === 'both' || interfaceKind === 'in') {
    const intId = `left-${itemForm}-in-0`;
    ret.expectItemsSpeed[intId] = { [itemKey]: -speedThou };
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
  const { nodeId, docsMapped, nodeMap } = args;

  const nullableNodeData = nodeMap.get(nodeId)?.data as FactoryRecipeNodeData | undefined;
  if (!nullableNodeData) return null;
  const nodeData = resolveRecipeNodeData(nullableNodeData);
  const { recipeKey, clockSpeedThou } = nodeData;

  if (!recipeKey) return null;
  const recipe = docsMapped.recipes.get(recipeKey);
  if (!recipe) {
    appendStatusMessage({ type: 'error', message: `Recipe ${recipeKey} not found` });
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
      appendStatusMessage({ type: 'error', message: `Item ${itemKey} not found` });
      continue;
    }

    const itemForm = item.form === 'solid' ? 'solid' : 'fluid';
    const type = isIngredient ? 'in' : 'out';
    const intTypeIdx = IntTypeCount[type]++;
    const intId = `${isIngredient ? 'left' : 'right'}-${itemForm}-${type}-${intTypeIdx}`;
    // Fluids are stored are stored as "liters" in recipe but when dealing with speed its usually done in m³ / min
    const expectSpeedThou = (((isIngredient ? -amount : amount) / durationThou) * 60) / (itemForm === 'solid' ? 1 : 1000);
    ret.expectItemsSpeed[intId] = { [itemKey]: Math.floor(expectSpeedThou) };
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
  const { visitedNode = [], nodeId, nodeMap, edgeMap, ignoreHandleIds, nodesComputeResult } = args;
  if (visitedNode.includes(nodeId)) {
    console.error(`Circular dependency detected at node ${nodeId}`);
    return null;
  }
  const nodeAdditionalProperty = nodeMap.get(nodeId);

  const nullableNodeData = nodeMap.get(nodeId)?.data as FactoryLogisticNodeData | undefined;
  if (!nullableNodeData) return null;
  const nodeData = resolveLogisticNodeData(nullableNodeData);
  const { type: logisticType, smartProRules, pipeJuncInt } = nodeData;
  if (!logisticType) {
    return null;
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
    ret.expectItemsSpeed[handleId] = intType === 'in' ? { any: 0 } : { any: 0 }; // Expects to demand everything or provide everything

    const edgeId = handleIdToEdgeIdMap?.get(handleId);
    if (edgeId) {
      // Connected to an edge with id ${edgeId}
      try {
        if (ignoreHandleIds?.includes(handleId)) throw null;
        const edge = edgeMap.get(edgeId);
        if (!edge) throw `error: Edge ${edgeId} not found`;
        const otherNodeId = intType === 'in' ? edge.source : edge.target;
        const otherHandleId = intType === 'in' ? edge.sourceHandle : edge.targetHandle;
        if (!otherHandleId) throw `error: HandleId not found for edge ${edgeId}`;
        const nodeComputeResult =
          nodesComputeResult.get(otherNodeId) ??
          computeNode({ ...args, nodeId: otherNodeId, ignoreHandleIds: [otherHandleId], visitedNode: [nodeId, ...visitedNode] });
        if (!nodeComputeResult) throw `warn: Unable to compute node ${otherNodeId}`;
        // nodesComputeResult.set(otherNodeId, nodeComputeResult);

        const nodeItemSpeed = nodeComputeResult.actualItemsSpeed[otherHandleId] ?? nodeComputeResult.expectItemsSpeed[otherHandleId];
        if (!nodeItemSpeed) throw `error: Item speed not found for handleId ${otherHandleId} at node ${otherNodeId}`;

        for (const itemKey in nodeItemSpeed) {
          const speedThou = nodeItemSpeed[itemKey] ?? 0;
          if (itemKey === 'any') {
            continue;
          }
          ret.actualItemsSpeed[handleId] ??= {};
          ret.actualItemsSpeed[handleId][itemKey] = -speedThou;

          const newValue = (remainingItemsSpeed.get(itemKey) ?? 0) + speedThou;
          if (newValue === 0) {
            remainingItemsSpeed.delete(itemKey);
          } else {
            remainingItemsSpeed.set(itemKey, newValue);
          }
        }
      } catch (e) {
        if (e && typeof e === 'string') {
          if (e.startsWith('log:')) appendStatusMessage({ type: 'info', message: e.slice(4) });
          else if (e.startsWith('warn:')) appendStatusMessage({ type: 'warning', message: e.slice(5) });
          else if (e.startsWith('error:')) appendStatusMessage({ type: 'error', message: e.slice(6) });
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
          if (rules[0] === 'any') {
            anyOutHandleIds.push(handleId);
          } else if (rules[0] === 'overflow') {
            overflowOutHandleIds.push(handleId);
          } else if (rules[0] === 'anyUndefined') {
            anyUndefinedOutHandleIds.push(handleId);
          } else if (rules[0] !== 'none') {
            for (const rule of rules) {
              if (!rule.startsWith('item-')) {
                // console.error(`Invalid rule ${rule} for node ${nodeId}`);
                appendStatusMessage({ type: 'error', message: `Invalid rule ${rule} for node ${nodeId}` });
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
    let positiveHandleIds: string[]; // Handle Ids to distribute the item to
    let negativeHandleIds: string[]; // Handle Ids to take the item from
    if (speedThou < 0) {
      // if negative speedThou, it means the item is being consumed more than what is provided
      positiveHandleIds = inHandleIds;
      negativeHandleIds = outHandleIds;
    } else {
      if (itemKey in specificItemOutHandleIds) {
        // If the item has been specified to go to a specific output
        positiveHandleIds = specificItemOutHandleIds[itemKey];
        positiveHandleIds.push(...anyOutHandleIds); //If there are any out, it will be distributed to any out also
      } else if (hasSpecificItemOutAndAnyUndefinedOut) {
        // If the item isn't specified to go to a specific output.
        // But this node has specific item out and any undefined out
        // So it needs to be distributed to anyUndefined output
        positiveHandleIds = anyUndefinedOutHandleIds;
        positiveHandleIds.push(...anyOutHandleIds); //If there are any out, it will be distributed to any out also
      } else {
        positiveHandleIds = anyOutHandleIds;
      }
      negativeHandleIds = inHandleIds;
    }

    // TODO: Handle Overflow
    if (positiveHandleIds.length > 0) {
      const distrubutedPositiveItemSpeed = Math.floor(speedThou / positiveHandleIds.length);
      for (const handleId of positiveHandleIds) {
        ret.actualItemsSpeed[handleId] ??= {};
        ret.actualItemsSpeed[handleId][itemKey] = (ret.actualItemsSpeed[handleId][itemKey] ?? 0) + distrubutedPositiveItemSpeed;
      }
    }

    if (negativeHandleIds.length > 0) {
      const distrubutedNegativeItemSpeed = Math.floor(speedThou / negativeHandleIds.length);
      for (const handleId of negativeHandleIds) {
        ret.actualItemsSpeed[handleId] ??= {};
        ret.actualItemsSpeed[handleId][itemKey] = (ret.actualItemsSpeed[handleId][itemKey] ?? 0) + distrubutedNegativeItemSpeed;
      }
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
  const { edgeId, docsMapped, edgeMap, nodesComputeResult } = args;
  const { source, sourceHandle, target, targetHandle } = edgeMap.get(edgeId)!;

  const sourceResult = nodesComputeResult.get(source)!;
  const targetResult = nodesComputeResult.get(target)!;

  let startLabel: string = '';
  let centerLabel: string = '';
  let endLabel: string = '';
  let displayOnSelect: boolean | undefined = undefined;
  let colorMode: FactoryBeltOrPipeData['colorMode'] | undefined = undefined;
  if (!sourceHandle || !targetHandle) {
    colorMode = 'error';
    centerLabel = 'Invalid Node (please submit a bug report)';
  } else if (!sourceResult || !targetResult) {
    if (!sourceResult) appendStatusMessage({ type: 'warning', message: `Source Node ${source} has no item speed result` });
    if (!targetResult) appendStatusMessage({ type: 'warning', message: `Target Node ${target} has no item speed result` });
    return undefined;
  } else {
    // Has computed result
    const sourceItemsSpeed = sourceResult.actualItemsSpeed[sourceHandle] ?? sourceResult.expectItemsSpeed[sourceHandle] ?? {};
    const targetItemsSpeed = targetResult.actualItemsSpeed[targetHandle] ?? targetResult.expectItemsSpeed[targetHandle] ?? {};
    // Compare the source and target items speed and show warning if they are not equal
    const itemKeys = new Set<string>([...Object.keys(sourceItemsSpeed), ...Object.keys(targetItemsSpeed)]);
    for (const key of itemKeys) {
      if (key === 'any') continue;
      const item = docsMapped.items.get(key);
      const sourceValue = sourceItemsSpeed[key];
      const targetValue = targetItemsSpeed[key];
      const sum = (sourceValue ?? 0) + (targetValue ?? 0); // Input is negative, output is positive, so sum should be 0 if they are equal
      if (sum < 0) {
        colorMode = 'warning';
        startLabel += `Underproducing: ${item?.displayName} by ${-speedThouToString(sum)}/min`;
        endLabel += `Overconsuming: ${item?.displayName} by ${-speedThouToString(sum)}/min`;
      } else if (sum > 0) {
        colorMode = 'warning';
        startLabel += `Overproducing: ${item?.displayName} by ${speedThouToString(sum)}/min`;
        endLabel += `Underconsuming: ${item?.displayName} by ${speedThouToString(sum)}/min`;
      } else {
        centerLabel += `Balanced: ${speedThouToString(sourceValue)}/min of ${item?.displayName}`;
        displayOnSelect ??= true;
      }
    }
  }

  return { colorMode, centerLabel, startLabel, endLabel, displayOnSelect };
}

export interface ComputeFactoryGraphArgs {
  /** ID can be edge or node */
  docsMapped: DocsMapped;
  nodeMap: Map<string, ExtendedNode>;
  edgeMap: Map<string, Edge>;
}

export function computeFactoryGraph(arg: ComputeFactoryGraphArgs) {
  // Right now, it recomputes all nodes
  const { docsMapped, nodeMap, edgeMap } = arg;
  const nodesComputeResult = new Map<string, ComputeResult>();
  // Order of computation: Item, Recipe, Logistics Node then Edges
  const recipeNodes = new Set<ExtendedNode>();
  const logisticNodes = new Set<ExtendedNode>();
  for (const [nodeId, node] of nodeMap) {
    if (node.type === 'recipe') {
      recipeNodes.add(node);
    } else if (node.type === 'logistic') {
      logisticNodes.add(node);
    }
    const result = computeFactoryItemNode({ nodeId, docsMapped, nodeMap, edgeMap, nodesComputeResult });
    if (result) nodesComputeResult.set(node.id, result);
  }
  for (const node of recipeNodes) {
    const result = computeFactoryRecipeNode({ nodeId: node.id, docsMapped, nodeMap, edgeMap, nodesComputeResult });
    if (result) nodesComputeResult.set(node.id, result);
  }
  for (const node of logisticNodes) {
    const result = computeFactoryLogisticsNode({ nodeId: node.id, docsMapped, nodeMap, edgeMap, nodesComputeResult });
    if (result) nodesComputeResult.set(node.id, result);
  }

  for (const [edgeId, edge] of edgeMap) {
    const result = computeFactoryBeltOrPieEdge({ edgeId, docsMapped, nodeMap, edgeMap, nodesComputeResult });
    if (result) edgeMap.set(edgeId, { ...edge, data: result });
  }
}
