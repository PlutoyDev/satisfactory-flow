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

type InputItemSpeed = { [itemKey: string]: number };
type OutputItemSpeed = { [handleId: string]: InputItemSpeed };

type ItemSpeedResult = {
  input: InputItemSpeed;
  output: OutputItemSpeed;
};

type FactoryItemSpeedParams = {
  node: ExtendedNode;
  docsMapped: DocsMapped;
  input: InputItemSpeed; // Sum of all the output of the connected nodes
  output: OutputItemSpeed;
};

export function calFactoryItemSpeedForItemNode(params: FactoryItemSpeedParams): ItemSpeedResult | null {
  const { node, docsMapped, input, output } = params;
  const { itemKey, speedThou, interfaceKind } = node.data as ResolvedFactoryItemNodeData;

  if (!itemKey) return null;
  const item = docsMapped.items.get(itemKey)!;

  const res: ItemSpeedResult = { input: {}, output: {} };

  if (interfaceKind === 'both' || interfaceKind === 'in') {
    res.input[itemKey] = speedThou;
  }

  if (interfaceKind === 'both' || interfaceKind === 'out') {
    const itemForm = item.form === 'solid' ? 'solid' : 'fluid';
    res.output = { [`right-${itemForm}-out-0`]: { [itemKey]: speedThou } };
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
