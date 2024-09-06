// Ideal Item Speed Calculation
// Calculate item speed of every node in the factory
// Store the finalized item speed in the factory item speed store "Cache"
// This is the faster item speed that resolved to
import { Edge } from '@xyflow/react';
import {
  ResolvedFactoryItemNodeData,
  ResolvedFactoryRecipeNodeData,
  ResolvedFactoryLogisticNodeData,
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
}

export function calFactoryItemSpeedForLogisticNode(params: FactoryItemSpeedParams): ItemSpeedResult | null {
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
