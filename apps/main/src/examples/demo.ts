import { Edge, Node } from '@xyflow/react';

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
