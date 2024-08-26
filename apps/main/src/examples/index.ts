import type { Edge, Node } from '@xyflow/react';
import type { FlowInfo } from '../lib/data';

interface ExampleFlowData extends Omit<FlowInfo, 'created' | 'updated'> {
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
