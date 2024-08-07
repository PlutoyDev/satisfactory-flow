import { Edge, Node } from '@xyflow/react';
import { FactoryItemNodeData, FactoryRecipeNodeData } from '../engines/data';

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
      id: '237890235890235890',
      position: { x: 200, y: 200 },
      data: {} satisfies FactoryItemNodeData,
      type: 'item',
    },
    {
      id: '94398242080220',
      position: { x: 300, y: 300 },
      data: {
        recipeKey: 'Recipe_UnpackageTurboFuel_C',
        clockSpeedThou: 1000,
      } satisfies FactoryRecipeNodeData,
      type: 'recipe',
    },
    {
      id: '523907234890340',
      position: { x: 400, y: 400 },
      data: {
        type: 'splitter',
      },
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
