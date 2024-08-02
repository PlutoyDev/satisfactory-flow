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
import { filter, map, mapToObj, pick, pipe } from 'remeda';

export interface FlowData {
  id: string;
  name: string;
  description: string;
  updated: Date;
  created: Date;
}

export interface Settings {
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

export async function scanForFlowDbNames() {
  const dbs = await indexedDB.databases();
  return pipe(
    dbs,
    filter(db => db.name?.startsWith('flow-') ?? false),
    map(db => db.name!),
  );
}

export async function openFlowDb(flowId: string, throwIfNotExists = true) {
  const dbName = `flow-${flowId}`;
  if (throwIfNotExists) {
    const dbNames = await scanForFlowDbNames();
    if (!dbNames.includes(dbName)) {
      throw new Error(`Flow with id ${flowId} does not exist`);
    }
  }

  return openDB<FlowDbSchema>(dbName, 1, {
    upgrade(db, oldVersion) {
      switch (oldVersion) {
        case 0:
          db.createObjectStore('nodes', { keyPath: 'id' });
          db.createObjectStore('edges', { keyPath: 'id' });
          db.createObjectStore('properties', { keyPath: 'key' });
          break;
        default:
          console.error('Unknown version:', oldVersion);
      }
    },
  });
}

type FlowDb = Awaited<ReturnType<typeof openFlowDb>>;

async function resolveFlowDbOrId<RT>(flowDbOrId: FlowDb | string, cb: (flowDb: FlowDb) => RT): Promise<RT> {
  // If flowDbOrId is a string, open the database and close it after the callback
  // If flowDbOrId is a FlowDb, use it directly and do not close it after the callback
  const toClose = typeof flowDbOrId === 'string';
  const flowDb = toClose ? await openFlowDb(flowDbOrId) : flowDbOrId;
  try {
    return cb(flowDb);
  } finally {
    if (toClose) {
      flowDb.close();
    }
  }
}

export function getNodes(flowDbOrId: FlowDb | string) {
  return resolveFlowDbOrId(flowDbOrId, flowDb => flowDb.getAll('nodes'));
}

export function setNodes(flowDbOrId: FlowDb | string, nodes: (StoredNode | Node)[]) {
  return resolveFlowDbOrId(flowDbOrId, flowDb => {
    const tx = flowDb.transaction('nodes', 'readwrite');
    // const promises = nodes.map(node => tx.store.put(pick(node, ['id', 'type', 'data', 'position'])));
    return Promise.all(
      pipe(
        nodes,
        filter(node => !!node && ['id', 'type', 'data', 'position'].every(k => k in node)),
        map(node => tx.store.put(node) as Promise<any>),
      ).concat(tx.done),
    );
  });
}

export function delNodes(flowDbOrId: FlowDb | string, ids: string[]) {
  return resolveFlowDbOrId(flowDbOrId, flowDb => {
    const tx = flowDb.transaction('nodes', 'readwrite');
    const promises = ids.map(id => tx.store.delete(id));
    return Promise.all([...promises, tx.done]);
  });
}

export function getEdges(flowDbOrId: FlowDb | string) {
  return resolveFlowDbOrId(flowDbOrId, flowDb => flowDb.getAll('edges'));
}

export function setEdges(flowDbOrId: FlowDb | string, edges: StoredEdge[]) {
  return resolveFlowDbOrId(flowDbOrId, flowDb => {
    const tx = flowDb.transaction('edges', 'readwrite');
    return Promise.all(
      pipe(
        edges,
        filter(edge => !!edge && ['id', 'type', 'data', 'source', 'target', 'sourceHandle', 'targetHandle'].every(k => k in edge)),
        map(edge => tx.store.put(edge) as Promise<any>),
      ).concat(tx.done),
    );
  });
}

export function delEdges(flowDbOrId: FlowDb | string, ids: string[]) {
  return resolveFlowDbOrId(flowDbOrId, flowDb => {
    const tx = flowDb.transaction('edges', 'readwrite');
    const promises = ids.map(id => tx.store.delete(id));
    return Promise.all([...promises, tx.done]);
  });
}

export async function getProperties(flowDbOrId: FlowDb | string) {
  return resolveFlowDbOrId(flowDbOrId, flowDb => {
    return flowDb.getAll('properties');
  });
}

export async function setProperty<K extends keyof FlowProperties>(flowDbOrId: FlowDb | string, key: K, value: FlowProperties[K]) {
  return resolveFlowDbOrId(flowDbOrId, flowDb => {
    return flowDb.put('properties', { key, value });
  });
}

export async function setProperties(flowDbOrId: FlowDb | string, properties: FlowProperties) {
  return resolveFlowDbOrId(flowDbOrId, flowDb => {
    const tx = flowDb.transaction('properties', 'readwrite');
    const promises: Promise<any>[] = [];
    for (const k in properties) {
      const key = k as keyof FlowProperties;
      promises.push(tx.store.put({ key, value: properties[key] }));
    }
    return Promise.all([...promises, tx.done]);
  });
}
