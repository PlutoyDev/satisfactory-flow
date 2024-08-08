import { Edge, Node } from '@xyflow/react';
import { FactoryItemNodeData, FactoryLogisticNodeData, FactoryRecipeNodeData } from '../engines/data';

export default {
  nodes: [
    {
      id: '1',
      position: { x: 0, y: 0 },
      data: { label: 'Hello' },
      type: 'input',
    },
    {
      id: '2',
      position: { x: 100, y: 100 },
      data: { label: 'World' },
    },
    {
      id: 'item-demo-node-0',
      position: { x: 200, y: 200 },
      data: {} satisfies FactoryItemNodeData,
      type: 'item',
    },
    {
      id: 'recipe-demo-node-0',
      position: { x: 300, y: 300 },
      data: {
        recipeKey: 'Recipe_UnpackageTurboFuel_C',
        clockSpeedThou: 100_00_000,
      } satisfies FactoryRecipeNodeData,
      type: 'recipe',
    },
    {
      id: 'logistic-demo-node-0',
      position: { x: 550, y: 550 },
      data: {
        type: 'splitter',
      } satisfies FactoryLogisticNodeData,
      type: 'logistic',
    },
  ],
  edges: [
    {
      id: '1-2',
      source: '1',
      target: '2',
    },
  ],
} satisfies {
  nodes: Node[];
  edges: Edge[];
};
