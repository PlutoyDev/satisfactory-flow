import type { Node, Edge } from '@xyflow/react';
import { openDB, DBSchema } from 'idb';
import { filter, map, mapToObj, pipe } from 'remeda';
import { MainNodeProp, MainEdgeProp, FlowProperties, FlowInfo, pickMainNodeProp, pickMainEdgeProp } from './data';

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

export interface Settings {
  lastOpenedFlowId?: string;
}

interface MainDbSchema extends DBSchema {
  flows: {
    key: string;
    value: FlowInfo;
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

export function openMainDb() {
  return openDB<MainDbSchema>('main', 1, {
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
}

export type MainDb = Awaited<ReturnType<typeof openMainDb>>;

export async function getFlows(mainDb?: MainDb) {
  mainDb ??= await openMainDb();
  return mainDb.getAll('flows');
}

export async function setFlow(flow: FlowInfo, mainDb?: MainDb) {
  mainDb ??= await openMainDb();
  return mainDb.put('flows', flow);
}

export async function getSettings(mainDb?: MainDb) {
  mainDb ??= await openMainDb();
  const settingsKv = await mainDb.getAll('settings');
  return pipe(
    settingsKv,
    filter(kv => !!kv && kv.value !== undefined),
    mapToObj(kv => [kv!.key, kv!.value!]),
  );
}

export async function setSetting<K extends keyof Settings>(key: K, value: Settings[K], mainDb?: MainDb) {
  mainDb = mainDb ?? (await openMainDb());
  return mainDb.put('settings', { key, value });
}

interface FlowDbSchema extends DBSchema {
  nodes: {
    key: string;
    value: MainNodeProp;
  };
  edges: {
    key: string;
    value: MainEdgeProp;
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

export function setNodes(flowDbOrId: FlowDb | string, nodes: (MainNodeProp | Node)[]) {
  return resolveFlowDbOrId(flowDbOrId, flowDb => {
    const tx = flowDb.transaction('nodes', 'readwrite');
    // const promises = nodes.map(node => tx.store.put(pick(node, ['id', 'type', 'data', 'position'])));
    return Promise.all(
      pipe(
        nodes,
        filter(node => !!node && ['id', 'type', 'data', 'position'].every(k => k in node)),
        map(node => tx.store.put(pickMainNodeProp(node)) as Promise<any>),
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

export function setEdges(flowDbOrId: FlowDb | string, edges: (MainEdgeProp | Edge)[]) {
  return resolveFlowDbOrId(flowDbOrId, flowDb => {
    const tx = flowDb.transaction('edges', 'readwrite');
    return Promise.all(
      pipe(
        edges,
        filter(edge => !!edge && ['id', 'source', 'target', 'sourceHandle', 'targetHandle'].every(k => k in edge)),
        map(edge => tx.store.put(pickMainEdgeProp(edge)) as Promise<any>),
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
