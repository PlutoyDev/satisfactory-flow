import { test, expect, describe } from 'vitest';
import type { ExtendedNode } from '../lib/store';
import SimpleScrew from '../tests/cases/SimpleScrew';
import { docsMapped } from '../tests/lib';
import { calFactoryItemSpeedForItemNode, calFactoryItemSpeedForLogisticNode, calFactoryItemSpeedForRecipeNode } from './itemSpeed';

// TODO: Move this to lib, but i'm too lazy to do it now :D
const nodesMap = new Map<string, ExtendedNode>(SimpleScrew.nodes.map((node: ExtendedNode) => [node.id, { ...node, edges: new Map() }]));
const edgesMap = new Map();

for (const edge of SimpleScrew.edges) {
  const sourceNode = nodesMap.get(edge.source);
  const targetNode = nodesMap.get(edge.target);
  if (!sourceNode || !targetNode) {
    console.error('source or target node not found');
    continue;
  }
  sourceNode.edges!.set(edge.sourceHandle ?? 'output', edge.id);
  targetNode.edges!.set(edge.targetHandle ?? 'input', edge.id);
  edgesMap.set(edge.id, edge);
}

const ironIngotsItemNode = nodesMap.get('I5XrBFifmO3j-zsi')!; // Output only
const ironIngotsSplitter0 = nodesMap.get('36aEjWC4FRlHV4_P')!;
const ironIngotsSplitter1 = nodesMap.get('9no2X_unrLinSyNs')!;
const ironRodConstructor0 = nodesMap.get('p9jVVxZhHUPoTMsF')!;
const ironRodConstructor1 = nodesMap.get('-kFW0_k0UaCLiMiN')!;
const ironRodMerger0 = nodesMap.get('b_ogjtRaWd4tlnSc')!;
const ironRodMerger1 = nodesMap.get('pe8Zk59_FyZ2QoNk')!;
// TODO add more nodes and move it to SimpleScrew, I'm too lazy to do it now :D
const screwItemNode = nodesMap.get('v7VgDusNsBK9WBGC')!; // Input only

if (
  !ironIngotsItemNode ||
  !ironIngotsSplitter0 ||
  !ironIngotsSplitter1 ||
  !ironRodConstructor0 ||
  !ironRodConstructor1 ||
  !ironRodMerger0 ||
  !ironRodMerger1
) {
  throw new Error('Node not found');
}

const IRON_INGOT_KEY = 'Desc_IronIngot_C';
const IRON_ROD_KEY = 'Desc_IronRod_C';
const SCREW_KEY = 'Desc_IronScrew_C';

if (!docsMapped.items.has(IRON_INGOT_KEY) || !docsMapped.items.has(IRON_ROD_KEY) || !docsMapped.items.has(SCREW_KEY)) {
  throw new Error('Item not found');
}

describe('iron ingot item node', () => {
  test('no output provided', () => {
    const result = calFactoryItemSpeedForItemNode({ node: ironIngotsItemNode, docsMapped, input: {}, expectedOutput: {} });
    expect(result).toEqual({ expectedInput: {}, output: { 'right-solid-out-0': { [IRON_INGOT_KEY]: 30000 } } });
  });

  test('with matching output provided', () => {
    const result = calFactoryItemSpeedForItemNode({
      node: ironIngotsItemNode,
      docsMapped,
      input: {},
      expectedOutput: { 'right-solid-out-0': { [IRON_INGOT_KEY]: 30000 } },
    });
    expect(result).toEqual({ efficiency: 1, expectedInput: {}, output: { 'right-solid-out-0': { [IRON_INGOT_KEY]: 30000 } } }); // Output is the same as provided
  });

  test('with lower output provided', () => {
    const result = calFactoryItemSpeedForItemNode({
      node: ironIngotsItemNode,
      docsMapped,
      input: {},
      expectedOutput: { 'right-solid-out-0': { [IRON_INGOT_KEY]: 27000 } },
    });
    expect(result).toEqual({ efficiency: 27000 / 30000, expectedInput: {}, output: { 'right-solid-out-0': { [IRON_INGOT_KEY]: 27000 } } });
  });

  test('with higher output provided', () => {
    const result = calFactoryItemSpeedForItemNode({
      node: ironIngotsItemNode,
      docsMapped,
      input: {},
      expectedOutput: { 'right-solid-out-0': { [IRON_INGOT_KEY]: 31000 } },
    });
    expect(result).toEqual({ efficiency: 1, expectedInput: {}, output: { 'right-solid-out-0': { [IRON_INGOT_KEY]: 30000 } } });
  });
});
