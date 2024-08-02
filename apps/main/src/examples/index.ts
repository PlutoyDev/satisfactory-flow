import type { FlowData } from '../db';
import type { Edge, Node } from '@xyflow/react';

interface ExampleFlowData extends Omit<FlowData, 'created' | 'updated'> {
  getData: () => Promise<{ default: { nodes: Node[]; edges: Edge[] } }>;
}

export default new Map<string, ExampleFlowData>([
  [
    'demo',
    {
      id: 'demo',
      name: 'Demo',
      description: 'A simple demo flow',
      getData: () => import('./demo'),
    },
  ],
]);
