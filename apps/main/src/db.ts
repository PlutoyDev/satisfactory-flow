// IndexedDB for the app

/*
How data is stored:
- 'main' database
  - flows store { id, name, description, updated, created }
  - settings store { key, value }
    - 'lastOpenedFlowId' - id of the last opened flow
- 'flow-{id}' database
  - nodes store { id, type, data, postion } from [Node](https://reactflow.dev/api-reference/types/node)
  - edges store { id, type, data, source, target, sourceHandle, targetHandle } from [Edge](https://reactflow.dev/api-reference/types/edge)
  - propeties store { key, value }
    - 'viewportX' - x position of the viewport
    - 'viewportY' - y position of the viewport
    - 'viewportZoom' - zoom level of the viewport
  TODO: History of changes
*/

import type { Node, Edge } from '@xyflow/react';
import { openDB, DBSchema } from 'idb';
import { filter, mapToObj, pipe } from 'remeda';

interface FlowData {
  id: string;
  name: string;
  description: string;
  updated: Date;
  created: Date;
}

interface Settings {
  lastOpenedFlowId?: string;
}

interface MainDbSchema extends DBSchema {
  flows: {
    key: string;
    value: FlowData;
  };
  settings: {
    key: keyof Settings;
    value: {
      [Key in keyof Settings]: {
        key: Key;
        value: Settings[Key];
      };
    }[keyof Settings];
  };
}

export const mainDb = await openDB<MainDbSchema>('main', 1, {
  upgrade(db, oldVersion) {
    switch (oldVersion) {
      case 0:
        db.createObjectStore('flows', { keyPath: 'id' });
        db.createObjectStore('settings', { keyPath: 'key' });
        break;
      default:
        console.error('Unknown version:', oldVersion);
    }
  },
});

export function getFlows() {
  return mainDb.getAll('flows');
}

export function setFlow(flow: FlowData) {
  return mainDb.put('flows', flow);
}

export async function getSettings() {
  const settingsKv = await mainDb.getAll('settings');
  return pipe(
    settingsKv,
    filter(kv => !!kv && kv.value !== undefined),
    mapToObj(kv => [kv!.key, kv!.value!]),
  );
}

export async function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  return mainDb.put('settings', { key, value });
}

export type StoredNode = Pick<Node, 'id' | 'type' | 'data' | 'position'>;
export type StoredEdge = Pick<Edge, 'id' | 'type' | 'data' | 'source' | 'target' | 'sourceHandle' | 'targetHandle'>;

export type FlowProperties = {
  viewportX?: number;
  viewportY?: number;
  viewportZoom?: number;
};

interface FlowDbSchema extends DBSchema {
  nodes: {
    key: string;
    value: StoredNode;
  };
  edges: {
    key: string;
    value: StoredEdge;
  };
  properties: {
    key: keyof FlowProperties;
    value: {
      [Key in keyof FlowProperties]: {
        key: Key;
        value: FlowProperties[Key];
      };
    }[keyof FlowProperties];
  };
}
