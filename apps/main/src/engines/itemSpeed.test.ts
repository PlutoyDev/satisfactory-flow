import { test, expect, describe } from 'vitest';
import type { ExtendedNode } from '../lib/store';
import SimpleScrew from '../tests/cases/SimpleScrew';
import { docsMapped } from '../tests/lib';
import {
  calFactoryItemSpeedForItemNode,
  calFactoryItemSpeedForRecipeNode,
  calFactoryItemSpeedForLogisticNode,
  ItemSpeedResult,
} from './itemSpeed';

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
const scewConstructor0 = nodesMap.get('Lge0TU0skMb1MPiT')!;
const screwItemNode = nodesMap.get('v7VgDusNsBK9WBGC')!; // Input only

if (
  !ironIngotsItemNode ||
  !ironIngotsSplitter0 ||
  !ironIngotsSplitter1 ||
  !ironRodConstructor0 ||
  !ironRodConstructor1 ||
  !ironRodMerger0 ||
  !ironRodMerger1 ||
  !scewConstructor0 ||
  !screwItemNode
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
    const result = calFactoryItemSpeedForItemNode({ node: ironIngotsItemNode, docsMapped, input: {} });
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

  test('with wrong output provided', () => {
    const result = calFactoryItemSpeedForItemNode({
      node: ironIngotsItemNode,
      docsMapped,
      input: {},
      expectedOutput: { 'right-solid-out-0': { [IRON_ROD_KEY]: 15000 } },
    });
    expect(result).toEqual({ efficiency: 0, expectedInput: {}, output: { 'right-solid-out-0': { [IRON_INGOT_KEY]: 0 } } });
  });
});

describe('screw item node', () => {
  test('no input provided', () => {
    const result = calFactoryItemSpeedForItemNode({ node: screwItemNode, docsMapped, input: {} });
    expect(result).toEqual({ efficiency: 0, expectedInput: { [SCREW_KEY]: 120_000 }, output: {} });
  });

  test('with matching input provided', () => {
    const result = calFactoryItemSpeedForItemNode({
      node: screwItemNode,
      docsMapped,
      input: { [SCREW_KEY]: 120_000 },
    });
    expect(result).toEqual({ efficiency: 1, expectedInput: { [SCREW_KEY]: 120_000 }, output: {} });
  });

  test('with lower input provided', () => {
    const result = calFactoryItemSpeedForItemNode({
      node: screwItemNode,
      docsMapped,
      input: { [SCREW_KEY]: 100_000 },
    });
    expect(result).toEqual({ efficiency: 100_000 / 120_000, expectedInput: { [SCREW_KEY]: 120_000 }, output: {} });
  });

  test('with higher input provided', () => {
    const result = calFactoryItemSpeedForItemNode({
      node: screwItemNode,
      docsMapped,
      input: { [SCREW_KEY]: 150_000 },
    });
    expect(result).toEqual({ efficiency: 1, expectedInput: { [SCREW_KEY]: 120_000 }, output: {} });
  });

  test('with wrong input provided', () => {
    const result = calFactoryItemSpeedForItemNode({
      node: screwItemNode,
      docsMapped,
      input: { [IRON_ROD_KEY]: 120_000 },
    });
    expect(result).toEqual({ efficiency: 0, expectedInput: { [SCREW_KEY]: 120_000 }, output: {} });
  });
});

describe('iron rod constructor node', () => {
  // Iron Rod recipe, clock speed is 100%
  // 15/min ingots => 15/min rods
  // Input test
  test('no input provided', () => {
    const result = calFactoryItemSpeedForRecipeNode({ node: ironRodConstructor0, docsMapped, input: {} });
    expect(result).toEqual({
      efficiency: 0,
      expectedInput: { [IRON_INGOT_KEY]: 15_000 },
      output: { ['right-solid-out-0']: { [IRON_ROD_KEY]: 0 } },
    } satisfies ItemSpeedResult);
  });

  test('with correct input provided', () => {
    const result = calFactoryItemSpeedForRecipeNode({
      node: ironRodConstructor0,
      docsMapped,
      input: { [IRON_INGOT_KEY]: 15_000 },
    });
    expect(result).toEqual({
      efficiency: 1,
      expectedInput: { [IRON_INGOT_KEY]: 15_000 },
      output: { ['right-solid-out-0']: { [IRON_ROD_KEY]: 15_000 } },
    } satisfies ItemSpeedResult);
  });

  test('with lower than expected input provided', () => {
    const result = calFactoryItemSpeedForRecipeNode({
      node: ironRodConstructor0,
      docsMapped,
      input: { [IRON_INGOT_KEY]: 10_000 },
    });
    expect(result).toEqual({
      efficiency: 10_000 / 15_000,
      expectedInput: { [IRON_INGOT_KEY]: 15_000 },
      output: { ['right-solid-out-0']: { [IRON_ROD_KEY]: 10_000 } },
    } satisfies ItemSpeedResult);
  });

  test('with higher than expected input provided', () => {
    const result = calFactoryItemSpeedForRecipeNode({
      node: ironRodConstructor0,
      docsMapped,
      input: { [IRON_INGOT_KEY]: 20_000 },
    });
    expect(result).toEqual({
      efficiency: 1,
      expectedInput: { [IRON_INGOT_KEY]: 15_000 },
      output: { ['right-solid-out-0']: { [IRON_ROD_KEY]: 15_000 } },
    } satisfies ItemSpeedResult);
  });

  test('with wrong input provided', () => {
    const result = calFactoryItemSpeedForRecipeNode({
      node: ironRodConstructor0,
      docsMapped,
      input: { [IRON_ROD_KEY]: 15_000 },
    });
    expect(result).toEqual({
      efficiency: 0,
      expectedInput: { [IRON_INGOT_KEY]: 15_000 },
      output: { ['right-solid-out-0']: { [IRON_ROD_KEY]: 0 } },
    } satisfies ItemSpeedResult);
  });

  // Output test
  test('expects 15/min output', () => {
    const result = calFactoryItemSpeedForRecipeNode({
      node: ironRodConstructor0,
      docsMapped,
      input: { [IRON_INGOT_KEY]: 15_000 },
      expectedOutput: { ['right-solid-out-0']: { [IRON_ROD_KEY]: 15_000 } },
    });
    expect(result).toEqual({
      efficiency: 1,
      expectedInput: { [IRON_INGOT_KEY]: 15_000 },
      output: { ['right-solid-out-0']: { [IRON_ROD_KEY]: 15_000 } },
    } satisfies ItemSpeedResult);
  });

  test('expects 0 output', () => {
    const result = calFactoryItemSpeedForRecipeNode({
      node: ironRodConstructor0,
      docsMapped,
      input: { [IRON_INGOT_KEY]: 15_000 },
      expectedOutput: {},
    });
    expect(result).toEqual({
      efficiency: 0, // Efficiency gets tanked because the output is not being consumed
      expectedInput: { [IRON_INGOT_KEY]: 0 }, // Since the output is not being consumed, the input is not being used either and will expect 0
      output: { ['right-solid-out-0']: { [IRON_ROD_KEY]: 0 } },
    } satisfies ItemSpeedResult);
  });

  test('expects 10/min output', () => {
    const result = calFactoryItemSpeedForRecipeNode({
      node: ironRodConstructor0,
      docsMapped,
      input: { [IRON_INGOT_KEY]: 15_000 },
      expectedOutput: { ['right-solid-out-0']: { [IRON_ROD_KEY]: 10_000 } },
    });
    expect(result).toEqual({
      efficiency: 10_000 / 15_000,
      expectedInput: { [IRON_INGOT_KEY]: 10_000 },
      output: { ['right-solid-out-0']: { [IRON_ROD_KEY]: 10_000 } },
    } satisfies ItemSpeedResult);
  });

  test('expects 20/min output', () => {
    const result = calFactoryItemSpeedForRecipeNode({
      node: ironRodConstructor0,
      docsMapped,
      input: { [IRON_INGOT_KEY]: 15_000 },
      expectedOutput: { ['right-solid-out-0']: { [IRON_ROD_KEY]: 20_000 } },
    });
    expect(result).toEqual({
      efficiency: 1,
      expectedInput: { [IRON_INGOT_KEY]: 15_000 },
      output: { ['right-solid-out-0']: { [IRON_ROD_KEY]: 15_000 } },
    } satisfies ItemSpeedResult);
  });

  test('not supply enough input for the expected output', () => {
    const result = calFactoryItemSpeedForRecipeNode({
      node: ironRodConstructor0,
      docsMapped,
      input: { [IRON_INGOT_KEY]: 10_000 },
      expectedOutput: { ['right-solid-out-0']: { [IRON_ROD_KEY]: 15_000 } },
    });
    expect(result).toEqual({
      efficiency: 10_000 / 15_000,
      expectedInput: { [IRON_INGOT_KEY]: 15_000 },
      output: { ['right-solid-out-0']: { [IRON_ROD_KEY]: 10_000 } },
    } satisfies ItemSpeedResult);
  });

  // Iron Rod recipe (overclocked) to 200%
  // 30/min ingots => 30/min rods

  const overclockedIronRodConstructor0 = { ...ironRodConstructor0, data: { ...ironRodConstructor0.data, clockSpeedThou: 200_00_000 } };
  test('overclocked but given 15/min input (under-provided)', () => {
    const result = calFactoryItemSpeedForRecipeNode({
      node: overclockedIronRodConstructor0,
      docsMapped,
      input: { [IRON_INGOT_KEY]: 15_000 },
    });
    expect(result).toEqual({
      efficiency: 15_000 / 30_000,
      expectedInput: { [IRON_INGOT_KEY]: 30_000 },
      output: { ['right-solid-out-0']: { [IRON_ROD_KEY]: 15_000 } },
    } satisfies ItemSpeedResult);
  });

  test('overclocked but given 30/min input (exact)', () => {
    const result = calFactoryItemSpeedForRecipeNode({
      node: overclockedIronRodConstructor0,
      docsMapped,
      input: { [IRON_INGOT_KEY]: 30_000 },
    });
    expect(result).toEqual({
      efficiency: 1,
      expectedInput: { [IRON_INGOT_KEY]: 30_000 },
      output: { ['right-solid-out-0']: { [IRON_ROD_KEY]: 30_000 } },
    } satisfies ItemSpeedResult);
  });

  test('overclocked but given 45/min input (over-provided)', () => {
    const result = calFactoryItemSpeedForRecipeNode({
      node: overclockedIronRodConstructor0,
      docsMapped,
      input: { [IRON_INGOT_KEY]: 45_000 },
    });
    expect(result).toEqual({
      efficiency: 1,
      expectedInput: { [IRON_INGOT_KEY]: 30_000 },
      output: { ['right-solid-out-0']: { [IRON_ROD_KEY]: 30_000 } },
    } satisfies ItemSpeedResult);
  });
});

describe('screw constructor node', () => {
  // Screw recipe, 10 / min rods => 40 / min screws
  test('best efficiency', () => {
    const result = calFactoryItemSpeedForRecipeNode({
      node: scewConstructor0,
      docsMapped,
      input: { [IRON_ROD_KEY]: 10_000 },
      expectedOutput: { ['right-solid-out-0']: { [SCREW_KEY]: 40_000 } },
    });
    expect(result).toEqual({
      efficiency: 1,
      expectedInput: { [IRON_ROD_KEY]: 10_000 },
      output: { ['right-solid-out-0']: { [SCREW_KEY]: 40_000 } },
    } satisfies ItemSpeedResult);
  });

  test('inefficient due to insufficient input', () => {
    const result = calFactoryItemSpeedForRecipeNode({
      node: scewConstructor0,
      docsMapped,
      input: { [IRON_ROD_KEY]: 5_000 },
      expectedOutput: { ['right-solid-out-0']: { [SCREW_KEY]: 40_000 } },
    });
    expect(result).toEqual({
      efficiency: 5_000 / 10_000,
      expectedInput: { [IRON_ROD_KEY]: 10_000 },
      output: { ['right-solid-out-0']: { [SCREW_KEY]: 20_000 } },
    } satisfies ItemSpeedResult);
  });

  test('inefficient due to insufficient demand', () => {
    const result = calFactoryItemSpeedForRecipeNode({
      node: scewConstructor0,
      docsMapped,
      input: { [IRON_ROD_KEY]: 10_000 },
      expectedOutput: { ['right-solid-out-0']: { [SCREW_KEY]: 20_000 } },
    });
    expect(result).toEqual({
      efficiency: 20_000 / 40_000,
      expectedInput: { [IRON_ROD_KEY]: 5_000 },
      output: { ['right-solid-out-0']: { [SCREW_KEY]: 20_000 } },
    } satisfies ItemSpeedResult);
  });

  test('underclocked with best efficiency', () => {
    const result = calFactoryItemSpeedForRecipeNode({
      node: { ...scewConstructor0, data: { ...scewConstructor0.data, clockSpeedThou: 50_00_000 } },
      docsMapped,
      input: { [IRON_ROD_KEY]: 10_000 },
      expectedOutput: { ['right-solid-out-0']: { [SCREW_KEY]: 40_000 } },
    });
    expect(result).toEqual({
      efficiency: 1,
      expectedInput: { [IRON_ROD_KEY]: 5_000 },
      output: { ['right-solid-out-0']: { [SCREW_KEY]: 20_000 } },
    } satisfies ItemSpeedResult);
  })
});
