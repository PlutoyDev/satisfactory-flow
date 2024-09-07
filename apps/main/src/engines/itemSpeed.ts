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
} from '../lib/data';
import { DocsMapped, ExtendedNode } from '../lib/store';

// Item speed result
// it doesn't matter which input the item is fed to the node (unless its fluid)
// but output will only output to a sepicific handleId

export type InputItemSpeed = { [itemKey: string]: number };
export type OutputItemSpeed = { [handleId: string]: InputItemSpeed };

export type ItemSpeedResult = {
  expectedInput: InputItemSpeed; // Expected input of this node based on the input and expected output
  output: OutputItemSpeed; // Output of this node base on the input and expected output
  efficiency?: number; // Efficiency of the node (only for recipe node)
};

export type FactoryItemSpeedParams = {
  node: ExtendedNode;
  docsMapped: DocsMapped;
  input: InputItemSpeed; // Supply of the connected nodes
  expectedOutput?: OutputItemSpeed; // Demand of the connected nodes
};

export function calFactoryItemSpeedForItemNode(params: FactoryItemSpeedParams): ItemSpeedResult | null {
  const { node, docsMapped, input, expectedOutput } = params;
  const { itemKey, speedThou, interfaceKind } = node.data as ResolvedFactoryItemNodeData;

  if (!itemKey) return null;
  const item = docsMapped.items.get(itemKey)!;

  const res: ItemSpeedResult = { expectedInput: {}, output: {} };
  let outputSpeed: number | undefined;
  let inputSpeed: number | undefined;

  if (interfaceKind === 'both' || interfaceKind === 'in') {
    const providedItemSpeed = input[itemKey] ?? 0;
    // If the provided input is less than the speed, it will still expect the speed
    // but the efficiency will be penalized
    inputSpeed = speedThou;
    res.expectedInput[itemKey] = inputSpeed;
    res.efficiency = Math.min(1, providedItemSpeed / speedThou);
  }

  if (interfaceKind === 'both' || interfaceKind === 'out') {
    const itemForm = item.form === 'solid' ? 'solid' : 'fluid';
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
  const idealSpeedThous: { outputHandleId?: string; itemKey: string; speedThou: number }[] = [];

  let efficiencyDueToInputs = 1;
  for (const ingredient of ingredients) {
    const { itemKey, amount } = ingredient;
    const item = docsMapped.items.get(itemKey);
    if (!item) {
      throw new Error(`Item ${itemKey} not found`);
    }

    const itemForm = item.form === 'solid' ? 'solid' : 'fluid';
    const speedThou = ((amount / durationThou) * 60) / (itemForm === 'solid' ? 1 : 1000);
    efficiencyDueToInputs = Math.min(efficiencyDueToInputs, (input[itemKey] ?? 0) / speedThou);
    if (expectedOutput) {
      idealSpeedThous.push({ itemKey, speedThou });
    } else {
      res.expectedInput[itemKey] = speedThou;
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
      idealSpeedThous.push({ outputHandleId: handleId, itemKey, speedThou });
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
      const { itemKey, speedThou, outputHandleId } = idealSpeed;
      if (!outputHandleId) {
        // Ingredient
        if (expectedOutput) {
          res.expectedInput[itemKey] = speedThou * efficiencyDueToOutputs;
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

  const itemKeys: string[] = Object.keys(input);
  const expectedOutputSpeedThou: { [itemKey: string]: number } = {};
  if (expectedOutput) {
    for (const handleId in expectedOutput) {
      for (const itemKey in expectedOutput[handleId]) {
        if (!itemKeys.includes(itemKey)) {
          itemKeys.push(itemKey);
        }
        expectedOutputSpeedThou[itemKey] = (expectedOutputSpeedThou[itemKey] || 0) + expectedOutput[handleId][itemKey];
      }
    }
  }

  for (const itemKey of itemKeys) {
    const itemInputSpeedThou = input[itemKey] ?? 0;
    const itemOutputSpeedThou = expectedOutputSpeedThou[itemKey] ?? 0;
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
      res.expectedInput[itemKey] = itemInputSpeedThou;
      continue;
    }

    // Filter out the output handleIds that are not connected to the expected output

    if (itemInputSpeedThou > 0) {
      const unmetOutputHandleId: Set<string> = new Set();
      for (const handleId of itemOutputHandleIds) {
        if (handleId in expectedOutput) {
          // Add any output that is "connected"
          unmetOutputHandleId.add(handleId);
        }
      }
      let remainingOutputItemSpeedThou = itemInputSpeedThou;
      let breakoutLoopCount = 0; // Safety check to prevent infinite loop
      let isOverflowDone = overflowOutHandleIds.length === 0; // If there is no overflow, we can skip the overflow calculation
      while (remainingOutputItemSpeedThou > 0 && unmetOutputHandleId.size > 0 && ++breakoutLoopCount < 5) {
        console.log('Looping: ', itemKey, remainingOutputItemSpeedThou, Array.from(unmetOutputHandleId));
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

        if (!isOverflowDone && unmetOutputHandleId.size === 0 && remainingOutputItemSpeedThou > 0) {
          // If there are overflow outputs, all outputs are met and there is still remaining output item speed
          // distribute the remaining output to the overflow outputs
          for (const handleId of overflowOutHandleIds) {
            unmetOutputHandleId.add(handleId);
          }
          isOverflowDone = true; // It won't go into this block again
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

    if (itemOutputSpeedThou > 0) {
      res.expectedInput[itemKey] = itemOutputSpeedThou;
    }
  }

  // if (!expectedOutput) {
  //   // Don't know what to expect, just give all the node all the input
  //   for (const itemKey in input) {
  //     res.expectedInput[itemKey] = input[itemKey];
  //     if (itemKey in specificItemOutHandleIds) {
  //       for (const handleId of specificItemOutHandleIds[itemKey]) {
  //         res.output[handleId] ??= {};
  //         res.output[handleId][itemKey] = input[itemKey];
  //       }
  //     } else if (hasSpecificItemOutAndAnyUndefinedOut) {
  //       for (const handleId of anyUndefinedOutHandleIds) {
  //         res.output[handleId] ??= {};
  //         res.output[handleId][itemKey] = input[itemKey];
  //       }
  //     }
  //     for (const handleId of anyOutHandleIds) {
  //       res.output[handleId] ??= {};
  //       res.output[handleId][itemKey] = input[itemKey];
  //     }
  //     for (const handleId of overflowOutHandleIds) {
  //       res.output[handleId] ??= {};
  //       res.output[handleId][itemKey] = input[itemKey];
  //     }
  //   }
  // } else {
  //   for (const itemKey of itemKeys) {
  //     let itemSpeed = 0;
  //     if (itemKey in input) {
  //       itemSpeed += input[itemKey];
  //     }
  //     for (const handleId of inHandleIds) {
  //       if (itemKey in expectedOutput[handleId]) {
  //         itemSpeed += expectedOutput[handleId][itemKey];
  //       }
  //     }
  //     if (itemSpeed > 0) {
  //       res.expectedInput[itemKey] = itemSpeed;
  //     }
  //     if (itemKey in specificItemOutHandleIds) {
  //       for (const handleId of specificItemOutHandleIds[itemKey]) {
  //         res.output[handleId] ??= {};
  //         res.output[handleId][itemKey] = itemSpeed;
  //       }
  //     } else if (hasSpecificItemOutAndAnyUndefinedOut) {
  //       for (const handleId of anyUndefinedOutHandleIds) {
  //         res.output[handleId] ??= {};
  //         res.output[handleId][itemKey] = itemSpeed;
  //       }
  //     }
  //     for (const handleId of anyOutHandleIds) {
  //       res.output[handleId] ??= {};
  //       res.output[handleId][itemKey] = itemSpeed;
  //     }
  //     for (const handleId of overflowOutHandleIds) {
  //       res.output[handleId] ??= {};
  //       res.output[handleId][itemKey] = itemSpeed;
  //     }
  //   }
  // }

  return res;
}

type CalculateFactoryItemSpeedParams = {
  docsMapped: DocsMapped;
  startNodeId: string;
  nodes: Map<string, ExtendedNode>;
  edges: Map<string, Edge>;
  signal?: AbortSignal;
};

export function calFactoryItemSpeed(params: CalculateFactoryItemSpeedParams) {
}
