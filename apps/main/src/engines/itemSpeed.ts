// Ideal Item Speed Calculation
// Calculate item speed of every node in the factory
// Store the finalized item speed in the factory item speed store "Cache"
// This is the faster item speed that resolved to
import { Edge } from '@xyflow/react';
import {
  ResolvedFactoryItemNodeData,
  ResolvedFactoryRecipeNodeData,
  ResolvedFactoryLogisticNodeData,
  splitHandleId,
  FACTORY_INTERFACE_DIR,
  FactoryInterfaceType,
  FactoryItemForm,
  FACTORY_MACHINE_PROPERTIES,
} from '../lib/data';
import { DocsMapped, ExtendedNode } from '../lib/store';

// Item speed result
// it doesn't matter which input the item is fed to the node (unless its fluid)
// but output will only output to a sepicific handleId

export type ItemSpeed = { [itemKey: string]: number };
export type HandleItemSpeed = { [handleId: string]: ItemSpeed };

function gatherItemSpeed(
  handleItemSpeed: HandleItemSpeed,
  forEach?: (handleId: string, itemKey: string, speed: number) => void,
): ItemSpeed {
  const res: ItemSpeed = {};
  for (const handleId in handleItemSpeed) {
    for (const itemKey in handleItemSpeed[handleId]) {
      res[itemKey] = (res[itemKey] ?? 0) + handleItemSpeed[handleId][itemKey];
      forEach?.(handleId, itemKey, handleItemSpeed[handleId][itemKey]);
    }
  }
  return res;
}

export type ItemSpeedResult = {
  expectedInput: HandleItemSpeed; // Expected input of this node based on the input and expected output
  output: HandleItemSpeed; // Output of this node base on the input and expected output
  efficiency?: number; // Efficiency of the node
};

export type FactoryItemSpeedParams = {
  node: ExtendedNode;
  docsMapped: DocsMapped;
  input: HandleItemSpeed; // Supply of the connected nodes
  expectedOutput?: HandleItemSpeed; // Demand of the connected nodes
};

export function calFactoryItemSpeedForItemNode(params: FactoryItemSpeedParams): ItemSpeedResult | null {
  const { node, docsMapped, input, expectedOutput } = params;
  const { itemKey, speedThou, interfaceKind } = node.data as ResolvedFactoryItemNodeData;

  if (!itemKey) return null;
  const item = docsMapped.items.get(itemKey)!;
  const itemForm = item.form === 'solid' ? 'solid' : 'fluid';

  const res: ItemSpeedResult = { expectedInput: {}, output: {} };
  let outputSpeed: number | undefined;
  let inputSpeed: number | undefined;

  if (interfaceKind === 'both' || interfaceKind === 'in') {
    const handleId = `left-${itemForm}-in-0`;
    const providedItemSpeed = input[handleId]?.[itemKey] ?? 0;
    // If the provided input is less than the speed, it will still expect the speed
    // but the efficiency will be penalized
    inputSpeed = speedThou;
    res.expectedInput[handleId] = { [itemKey]: inputSpeed };
    res.efficiency = Math.min(1, providedItemSpeed / speedThou);
  }

  if (interfaceKind === 'both' || interfaceKind === 'out') {
    const handleId = `right-${itemForm}-out-0`;
    if (expectedOutput) {
      // If expectedOutput is provided, this node is expected to provide the expected output but only to the max of the specified speed.
      // if the expected output is more than the speed, the output is the speed, its efficiency is 1 (the efficiency will be penalized in the following nodes)
      // if the expected output is less than the speed, the output is the expected output and the efficiency is penalized
      const expectedItemSpeed = expectedOutput[handleId]?.[itemKey] ?? 0;
      outputSpeed = Math.min(speedThou, expectedItemSpeed);
      res.output[handleId] = { [itemKey]: outputSpeed };
      res.efficiency = outputSpeed / speedThou;
    } else {
      res.output[handleId] = { [itemKey]: speedThou };
    }
  }

  if (interfaceKind === 'both' && inputSpeed && outputSpeed && inputSpeed !== outputSpeed) {
    // TODO: For interfaceKind = both and inputSpeed !== outputSpeed, penalize the efficiency and the speeds
  }

  return res;
}

export function calFactoryItemSpeedForRecipeNode(params: FactoryItemSpeedParams): ItemSpeedResult | null {
  const { node, docsMapped, input, expectedOutput } = params;
  const { recipeKey, clockSpeedThou } = node.data as ResolvedFactoryRecipeNodeData;

  if (!recipeKey) {
    return null;
  }
  const recipe = docsMapped.recipes.get(recipeKey)!;
  const gatheredInput = gatherItemSpeed(input);
  // const res: ItemSpeedResult = { expectedInput: {}, output: {}, efficiency: 1 };
  // Recipe ingredients and products list are gives item key and amount
  // The amount how much will be consumed or produced in one manufactoringDuration
  // Special cases for fluid, the amount specified is in liters while the display in m3 (1000 liters)
  // The manufactoringDuration is the time it takes to make the product
  // The machine can be overclocked/underclocked to change the manufactoringDuration
  // The higher the clockSpeed the shorter the manufactoringDuration (inversely proportional)
  // ? Mouse over either manufactoringDuration or clockSpeed to see more information

  const { ingredients, products, manufactoringDuration } = recipe;
  const res: ItemSpeedResult = { expectedInput: {}, output: {} };
  const durationThou = manufactoringDuration / (clockSpeedThou / 100_00); // Duration in thousandths of a second
  const idealSpeedThous: { outputHandleId?: string; itemForm: string; itemKey: string; speedThou: number }[] = [];

  if (!(recipe.producedIn in FACTORY_MACHINE_PROPERTIES)) {
    throw new Error(`Machine ${recipe.producedIn} not found`);
  }

  const productionMachineProp = FACTORY_MACHINE_PROPERTIES[recipe.producedIn];
  const numSolidIn = productionMachineProp.solidIn;
  const numFluidIn = productionMachineProp.fluidIn;

  const fluidInputHandleId0 = `left-fluid-in-${numSolidIn}`;
  const fluidInputHandleId1 = numFluidIn > 1 ? `left-fluid-in-${numSolidIn + 1}` : undefined;
  let fluidIn0Taken = input[fluidInputHandleId0] !== undefined;
  let fluidIn1Taken = fluidInputHandleId1 && input[fluidInputHandleId1] !== undefined;

  let efficiencyDueToInputs = 1;
  for (const ingredient of ingredients) {
    const { itemKey, amount } = ingredient;
    const item = docsMapped.items.get(itemKey);
    if (!item) {
      throw new Error(`Item ${itemKey} not found`);
    }

    const itemForm = item.form === 'solid' ? 'solid' : 'fluid';
    const expectedInputSpeedThou = ((amount / durationThou) * 60) / (itemForm === 'solid' ? 1 : 1000);
    efficiencyDueToInputs = Math.min(efficiencyDueToInputs, (gatheredInput[itemKey] ?? 0) / expectedInputSpeedThou);
    if (expectedOutput) {
      idealSpeedThous.push({ itemKey, itemForm, speedThou: expectedInputSpeedThou });
    } else {
      if (itemForm === 'solid') {
        for (let i = 0; i < numSolidIn; i++) {
          const handleId = `left-solid-in-${i}`;
          res.expectedInput[handleId] ??= {};
          res.expectedInput[handleId][itemKey] = expectedInputSpeedThou;
        }
      } else {
        const fluidIn0TakenByThis = fluidIn0Taken && input[fluidInputHandleId0]?.[itemKey] !== undefined;
        const fluidIn1TakenByThis = fluidIn1Taken && input[fluidInputHandleId1!]?.[itemKey] !== undefined;
        if (fluidIn0TakenByThis || (fluidIn1Taken && !fluidIn0Taken)) {
          res.expectedInput[fluidInputHandleId0] ??= {};
          res.expectedInput[fluidInputHandleId0][itemKey] = expectedInputSpeedThou;
          fluidIn0Taken = true;
        } else if (fluidIn1TakenByThis || (fluidIn0Taken && !fluidIn1Taken)) {
          res.expectedInput[fluidInputHandleId1!] ??= {};
          res.expectedInput[fluidInputHandleId1!][itemKey] = expectedInputSpeedThou;
          fluidIn1Taken = true;
        } else {
          res.expectedInput[fluidInputHandleId0] ??= {};
          res.expectedInput[fluidInputHandleId0][itemKey] = expectedInputSpeedThou;
          if (fluidInputHandleId1) {
            res.expectedInput[fluidInputHandleId1] ??= {};
            res.expectedInput[fluidInputHandleId1][itemKey] = expectedInputSpeedThou;
          }
        }
      }
    }
  }

  let efficiencyDueToOutputs = 1;
  let outCounts = 0;
  for (const product of products) {
    const { itemKey, amount } = product;
    const item = docsMapped.items.get(itemKey);
    if (!item) {
      throw new Error(`Item ${itemKey} not found`);
    }

    const itemForm = item.form === 'solid' ? 'solid' : 'fluid';
    const speedThou = ((amount / durationThou) * 60) / (itemForm === 'solid' ? 1 : 1000);
    const handleId = `right-${itemForm}-out-${outCounts++}`;
    if (expectedOutput) {
      efficiencyDueToOutputs = Math.min(efficiencyDueToOutputs, (expectedOutput[handleId]?.[itemKey] ?? 0) / speedThou);
      idealSpeedThous.push({ outputHandleId: handleId, itemForm, itemKey, speedThou });
    } else {
      res.output[handleId] = { [itemKey]: speedThou * efficiencyDueToInputs };
    }
  }

  // We have the ideal speeds for all the ingredients and products now
  // As well as the efficiency of this node
  // We can now calculate the actual input and output speeds
  const overallEfficiency = expectedOutput ? Math.min(efficiencyDueToInputs, efficiencyDueToOutputs) : efficiencyDueToInputs;
  res.efficiency = overallEfficiency;
  if (expectedOutput) {
    for (const idealSpeed of idealSpeedThous) {
      const { itemKey, itemForm, speedThou, outputHandleId } = idealSpeed;
      if (!outputHandleId) {
        // Ingredient
        const expectedInputSpeedThou = speedThou * efficiencyDueToOutputs; // we expect the input to match the output
        if (itemForm === 'solid') {
          const providedInputSpeedThou = gatheredInput[itemKey] ?? 0;
          const unmetInputSpeedThou = expectedInputSpeedThou - providedInputSpeedThou;
          const dividedUnmetInputSpeedThou = unmetInputSpeedThou / numSolidIn;
          for (let i = 0; i < numSolidIn; i++) {
            const handleId = `left-solid-in-${i}`;
            res.expectedInput[handleId] ??= {};
            res.expectedInput[handleId][itemKey] = input[handleId][itemKey] + dividedUnmetInputSpeedThou;
          }
        } else {
          const fluidIn0TakenByThis = fluidIn0Taken && input[fluidInputHandleId0]?.[itemKey] !== undefined;
          const fluidIn1TakenByThis = fluidIn1Taken && input[fluidInputHandleId1!]?.[itemKey] !== undefined;
          if (fluidIn0TakenByThis || (fluidIn1Taken && !fluidIn0Taken)) {
            res.expectedInput[fluidInputHandleId0] ??= {};
            res.expectedInput[fluidInputHandleId0][itemKey] = expectedInputSpeedThou;
            fluidIn0Taken = true;
          } else if (fluidIn1TakenByThis || (fluidIn0Taken && !fluidIn1Taken)) {
            res.expectedInput[fluidInputHandleId1!] ??= {};
            res.expectedInput[fluidInputHandleId1!][itemKey] = expectedInputSpeedThou;
            fluidIn1Taken = true;
          } else {
            res.expectedInput[fluidInputHandleId0] ??= {};
            res.expectedInput[fluidInputHandleId0][itemKey] = expectedInputSpeedThou;
            if (fluidInputHandleId1) {
              res.expectedInput[fluidInputHandleId1] ??= {};
              res.expectedInput[fluidInputHandleId1][itemKey] = expectedInputSpeedThou;
            }
          }
        }
      } else {
        // Product
        res.output[outputHandleId] = { [itemKey]: speedThou * overallEfficiency };
      }
    }
  }

  return res;
}

export function calFactoryItemSpeedForLogisticNode(params: FactoryItemSpeedParams): ItemSpeedResult | null {
  const { node, input, expectedOutput } = params;
  const { type: logisticType, pipeJuncInt, smartProRules } = node.data as ResolvedFactoryLogisticNodeData;

  // Connected in and outs
  const inHandleIds: string[] = [];
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
    const handleId = `${dir}-${itemForm}-${intType}-0`;

    if (intType === 'in') {
      inHandleIds.push(handleId);
    } else if (dir !== 'left') {
      // Left is always input for all logistic nodes, doing this just prevent typescript error

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
          for (const itemKey of rules) {
            specificItemOutHandleIds[itemKey] ??= [];
            specificItemOutHandleIds[itemKey].push(handleId);
          }
        }
      } else {
        // Normal splitter / merger / pipeJunc
        anyOutHandleIds.push(handleId);
      }
    } else {
      throw new Error('Not possible');
    }
  }
  const hasSpecificItemOutAndAnyUndefinedOut = anyUndefinedOutHandleIds.length > 0 && Object.keys(specificItemOutHandleIds).length > 0;

  const res: ItemSpeedResult = { expectedInput: {}, output: {} };

  const itemKeys: string[] = []; // Maybe change to Set if needed
  const gatheredInputItemSpeed = gatherItemSpeed(input, (_, itemKey) => {
    if (!itemKeys.includes(itemKey)) {
      itemKeys.push(itemKey);
    }
  });

  if (expectedOutput) {
    for (const handleId in expectedOutput) {
      for (const itemKey in expectedOutput[handleId]) {
        if (!itemKeys.includes(itemKey)) {
          itemKeys.push(itemKey);
        }
      }
    }
  }

  for (const itemKey of itemKeys) {
    const itemInputSpeedThou = gatheredInputItemSpeed[itemKey] ?? 0;
    const itemOutputHandleIds: string[] = [];
    if (itemKey in specificItemOutHandleIds) {
      itemOutputHandleIds.push(...specificItemOutHandleIds[itemKey]);
    } else if (hasSpecificItemOutAndAnyUndefinedOut) {
      itemOutputHandleIds.push(...anyUndefinedOutHandleIds);
    }
    itemOutputHandleIds.push(...anyOutHandleIds);

    if (!expectedOutput) {
      for (const handleId of itemOutputHandleIds) {
        res.output[handleId] ??= {};
        res.output[handleId][itemKey] = itemInputSpeedThou;
      }
      for (const handleId of overflowOutHandleIds) {
        res.output[handleId] ??= {};
        res.output[handleId][itemKey] = itemInputSpeedThou;
      }
      for (const handleId of inHandleIds) {
        if (input[handleId]?.[itemKey] !== undefined) {
          res.expectedInput[handleId] ??= {};
          res.expectedInput[handleId][itemKey] = itemInputSpeedThou;
        }
      }
      continue;
    }

    let itemOutputSpeedThou = 0;
    const unmetOutputHandleId: Set<string> = new Set();
    for (const handleId of itemOutputHandleIds) {
      // max is 3 handles
      if (handleId in expectedOutput) {
        // Add any output that is "connected"
        unmetOutputHandleId.add(handleId);
        if (itemKey in expectedOutput[handleId]) {
          itemOutputSpeedThou += expectedOutput[handleId][itemKey];
        }
      }
    }

    let amountOverflowed = 0;
    if (itemInputSpeedThou > 0) {
      let remainingOutputItemSpeedThou = itemInputSpeedThou;
      let breakoutLoopCount = 0; // Safety check to prevent infinite loop
      let isOverflowDone = overflowOutHandleIds.length === 0; // If there is no overflow, we can skip the overflow calculation
      while ((remainingOutputItemSpeedThou > 0 && unmetOutputHandleId.size > 0) || !isOverflowDone) {
        const dividedOutputItemSpeedThou = Math.floor(remainingOutputItemSpeedThou / unmetOutputHandleId.size);
        for (const handleId of unmetOutputHandleId) {
          res.output[handleId] ??= {};
          const expectedItemOutputSpeedThou = expectedOutput[handleId]?.[itemKey] ?? 0;
          const existingOutputItemSpeedThou = res.output[handleId][itemKey] ?? 0;
          const newOutputItemSpeedThou = Math.min(expectedItemOutputSpeedThou, existingOutputItemSpeedThou + dividedOutputItemSpeedThou);
          res.output[handleId][itemKey] = newOutputItemSpeedThou;
          remainingOutputItemSpeedThou -= newOutputItemSpeedThou - existingOutputItemSpeedThou;
          if (newOutputItemSpeedThou == expectedItemOutputSpeedThou) {
            unmetOutputHandleId.delete(handleId);
          }
        }

        if (!isOverflowDone && unmetOutputHandleId.size === 0) {
          if (remainingOutputItemSpeedThou === 0) {
            break; // no remaining to overflow, just get out
          }
          // If there are overflow outputs, all outputs are met and there is still remaining output item speed
          // distribute the remaining output to the overflow outputs
          for (const handleId of overflowOutHandleIds) {
            unmetOutputHandleId.add(handleId);
          }
          isOverflowDone = true; // It won't go into this block again
          amountOverflowed = remainingOutputItemSpeedThou;
        }

        if (++breakoutLoopCount > 5) {
          throw new Error('Infinite loop detected');
        }
      }

      // After trying to distribute the output (and overflow), add the remaining output to all the connected outputs
      if (remainingOutputItemSpeedThou > 0) {
        for (const handleId of itemOutputHandleIds) {
          res.output[handleId] ??= {};
          res.output[handleId][itemKey] = (res.output[handleId][itemKey] ?? 0) + remainingOutputItemSpeedThou; // Telling the output that it overproducing
        }
      }
    }

    if (itemOutputSpeedThou > 0 || amountOverflowed > 0) {
      let expectedInputItemSpeedThou = itemOutputSpeedThou + amountOverflowed;
      if (expectedInputItemSpeedThou > itemInputSpeedThou) {
        // Set the missing speed to all input handles that this needs MOARRR
        const missingInput = expectedInputItemSpeedThou - itemInputSpeedThou;
        for (const handleId of inHandleIds) {
          res.expectedInput[handleId] ??= {};
          res.expectedInput[handleId][itemKey] = (input[handleId]?.[itemKey] ?? 0) + missingInput;
        }
      } else {
        // The input is enough (or more than enough).
        // Get the ratio of actual input to the total actual input, and multiply it to the expected input
        for (const handleId of inHandleIds) {
          const providedRatio = (input[handleId]?.[itemKey] ?? 0) / itemInputSpeedThou;
          const expectedHandleInputSpeedThou = expectedInputItemSpeedThou * providedRatio;
          if (!expectedHandleInputSpeedThou) continue;
          res.expectedInput[handleId] ??= {};
          res.expectedInput[handleId][itemKey] = expectedInputItemSpeedThou * providedRatio;
        }
      }
    }
  }

  return res;
}

export function calFactoryItemSpeedForSinkNode(params: FactoryItemSpeedParams) {
  const handleId = 'left-solid-in-0';
  if (!params.input[handleId]) {
    return { expectedInput: {}, output: {} };
  }
  const expectedInput: HandleItemSpeed = { [handleId]: {} };
  for (const itemKey in params.input[handleId]) {
    // Mirror the input to the expected input return (there is no output)
    expectedInput[handleId][itemKey] = params.input[handleId][itemKey];
  }
  return {
    expectedInput,
    output: {},
  };
}

export type CalculateFactoryItemSpeedParams = {
  docsMapped: DocsMapped;
  startNodeId: string;
  nodes: Map<string, ExtendedNode>;
  edges: Map<string, Edge>;
  /**
   * Callback after the initial pass is done
   * @returns true to stop the calculation, false / undefined will continue to the second pass
   */
  inititalPassResultCallback?: ({
    nodeItemSpeeds,
    nodeErrors,
  }: Pick<CalculateFactoryItemSpeedResult, 'nodeItemSpeeds' | 'nodeErrors'>) => boolean | undefined;
};

export type CalculateFactoryItemSpeedResult = {
  /** Idividual item speeds for each node */
  nodeItemSpeeds: Map<string, ItemSpeedResult | null>;
  /** Errors that occurred during the calculation */
  nodeErrors: { [nodeId: string]: Error };
  /** The order of the nodes that are calculated (from the start to the end) */
  nodeOrders: string[];
  /** The effective efficiency of the factory (the minimum efficiency of all the nodes) */
  effectiveEfficiency: number;
};

export function calculateFactoryItemSpeed(params: CalculateFactoryItemSpeedParams): CalculateFactoryItemSpeedResult {
  // Trace dependencies until we reach the start nodes (aka root nodes)
  // Get each node's expected input (if any) and output (if any), the output will be use as the provided input
  //   for the next node until we reach the end nodes (aka leaf nodes)
  // After we reach the end nodes, we will need to recalculate the expected input based on the output used (in case of bottlenecks/backlogs)
  // Make sure the dependencies are calculated first before the dependents
  // In the initial pass, from the roots to the leaves, we calculate the output for a provided input
  // In the second pass, from the leaves back to the roots, we calculate the expected input based on the output used
  // Footnote:
  //  Although tree terminology is used, the factory graph is not a tree, it can have cycles and multiple roots and leaves
  //  To be specific, it is a directed acyclic graph (DAG) with multiple sources and targets but it is easier to explain with tree terminology
  //  Feel free to rewrite this explanation to be more accurate and concise if needed
  const { docsMapped, startNodeId, nodes, edges } = params;

  const nodeErrors: { [nodeId: string]: Error } = {};
  const nodeItemSpeeds = new Map<string, ItemSpeedResult | null>();
  const visitedNodes = new Set<string>();
  const nodeIdQueue = [startNodeId];
  const nodeIdCalculationOrder: string[] = []; // The order of the nodes that are calculated, reverse when recalculating
  let isRecalculating = false; // Recalculating backwards from the end nodes
  let effectiveEfficiency = 1;
  while (nodeIdQueue.length > 0) {
    const nodeId = nodeIdQueue.shift()!;
    try {
      if (!isRecalculating) {
        if (visitedNodes.has(nodeId)) {
          throw null; // Not an error,
        }
        visitedNodes.add(nodeId);
      }
      const node = nodes.get(nodeId);
      if (!node) {
        throw new Error(`not found`);
      }

      const input: HandleItemSpeed = {};
      const expectedOutput: HandleItemSpeed = {};
      const nodeEdges = node.edges;
      if (!nodeEdges) {
        throw new Error('no edges');
      }

      // Check if all the connected nodes are visited
      let numUnvisitedInputs = 0;
      for (const [selfHandleId, edgeId] of nodeEdges) {
        const { type: interfaceType } = splitHandleId(selfHandleId);
        const edge = edges.get(edgeId);
        if (!edge) {
          throw new Error(`Edge ${edgeId} not found`);
        }
        if (interfaceType === 'in') {
          const sourceNodeId = edge.source;
          const sourceHandleId = edge.sourceHandle;
          if (!sourceHandleId) {
            throw new Error(`Invalid node ${sourceNodeId}: No handleId`);
          }
          const sourceNode = nodes.get(sourceNodeId);
          if (!sourceNode) {
            throw new Error(`Source node ${sourceNodeId} of edge ${edgeId} not found`);
          }
          if (!visitedNodes.has(sourceNodeId)) {
            // not visited yet
            nodeIdQueue.unshift(sourceNodeId);
            numUnvisitedInputs++;
            continue;
          }
          const sourceNodeItemSpeed = nodeItemSpeeds.get(sourceNodeId);
          if (!sourceNodeItemSpeed) {
            throw new Error(`Source node ${sourceNodeId} of edge ${edgeId} not calculated yet`);
          }
          const sourceNodeOutput = sourceNodeItemSpeed.output[sourceHandleId];
          if (!sourceNodeOutput) {
            throw new Error(`Output of source node ${sourceNodeId} for handle ${sourceHandleId} not found`);
          }
          for (const itemKey in sourceNodeOutput) {
            input[selfHandleId] ??= {};
            input[selfHandleId][itemKey] = sourceNodeOutput[itemKey];
          }
        } else {
          // interfaceType === 'out'
          const targetNodeId = edge.target;
          const targetHandleId = edge.targetHandle;
          if (!targetHandleId) {
            throw new Error(`Invalid node ${targetNodeId}: No handleId`);
          }
          const targetNode = nodes.get(targetNodeId);
          if (!targetNode) {
            throw new Error(`Target node ${targetNodeId} of edge ${edgeId} not found`);
          }
          if (!visitedNodes.has(targetNodeId)) {
            // not visited yet but we can't calculate it since its dependent on this node
            // add it to the end of the unvisited inputs
            nodeIdQueue.splice(numUnvisitedInputs, 0, targetNodeId);
          }
          if (isRecalculating) {
            // Only when recalculating, we need to check the expected output
            const targetNodeItemSpeed = nodeItemSpeeds.get(targetNodeId);
            if (!targetNodeItemSpeed) {
              throw new Error(`Target node ${targetNodeId} of edge ${edgeId} not calculated yet`);
            }
            const targetNodeExpectedInputs = targetNodeItemSpeed.expectedInput;
            for (const itemKey in targetNodeExpectedInputs[targetHandleId]) {
              expectedOutput[selfHandleId] ??= {};
              expectedOutput[selfHandleId][itemKey] = targetNodeExpectedInputs[targetHandleId][itemKey];
            }
          }
        }
      }

      if (numUnvisitedInputs > 0) {
        // We can't calculate this node yet, insert the current node to the end of unvisited inputs
        nodeIdQueue.splice(numUnvisitedInputs, 0, nodeId);
        visitedNodes.delete(nodeId);
        continue;
      }

      // All inputs are visited
      // Calculate the item speed for this node

      if (!isRecalculating) {
        nodeIdCalculationOrder.push(nodeId);
      }
      const nodeItemSpeedCalcParam: FactoryItemSpeedParams = { node, docsMapped, input };
      if (isRecalculating) {
        nodeItemSpeedCalcParam.expectedOutput = expectedOutput;
      }
      let itemSpeed: ItemSpeedResult | null;
      if (node.type === 'item') {
        itemSpeed = calFactoryItemSpeedForItemNode(nodeItemSpeedCalcParam);
      } else if (node.type === 'recipe') {
        itemSpeed = calFactoryItemSpeedForRecipeNode(nodeItemSpeedCalcParam);
      } else if (node.type === 'logistic') {
        itemSpeed = calFactoryItemSpeedForLogisticNode(nodeItemSpeedCalcParam);
      } else if (node.type === 'sink') {
        itemSpeed = calFactoryItemSpeedForSinkNode(nodeItemSpeedCalcParam);
      } else {
        throw new Error(`Invalid node type ${node.data.type}`);
      }

      nodeItemSpeeds.set(nodeId, itemSpeed);
      if (isRecalculating && itemSpeed?.efficiency !== undefined) {
        effectiveEfficiency = Math.min(effectiveEfficiency, itemSpeed.efficiency);
      }
      if (!itemSpeed) {
        throw new Error(`Item speed not calculated`);
      }
    } catch (e) {
      if (typeof e === 'string') {
        nodeErrors[nodeId] = new Error(e);
      } else if (e instanceof Error) {
        nodeErrors[nodeId] = e;
      }
    }

    // End of first pass
    if (!isRecalculating && nodeIdQueue.length === 0) {
      // Start recalculating
      const stop = params.inititalPassResultCallback?.({ nodeItemSpeeds, nodeErrors });
      if (stop) {
        console.log('Stopped after initial pass');
        break;
      }
      nodeIdQueue.push(...nodeIdCalculationOrder.reverse());
      isRecalculating = true;
    }
  }

  return {
    nodeItemSpeeds,
    nodeErrors,
    nodeOrders: nodeIdCalculationOrder,
    effectiveEfficiency,
  };
}
