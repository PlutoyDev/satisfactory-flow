/*
Main data properties of nodes and edges that are stored, versioned, or transferred
*/
import { Node, Edge } from '@xyflow/react';
import { nanoid } from 'nanoid';
import parseJson from 'parse-json';
import { pick } from 'remeda';
import { z } from 'zod';

/*
Data type using for computation

Base Node Data:
- rotation: number (0 | 90 | 180 | 270)
- customBackground: string (hex color)

Item Node Data extends Base Node Data:
- itemKey: string (key from docsJson)
- speedThou: number (thousandth of items per minute)
- interface: 'both' | 'in' | 'out' (default: 'both')

Recipe Node Data extends Base Node Data:
- recipeKey: string (key from docsJson)
- clockSpeedThou: number (thousandth of clock speed)

LogisticDir: 'left' | 'right' | 'center'

Logistic Node Data extends Base Node Data:
- type: 'splitter' | 'merger' | 'splitterSmart' |'splitterPro' | 'pipeJunc'
- smartProRules?: Partial< Record< LogisticDir, ('any' | 'none' | 'anyUndefined' | 'overflow' | `item-${string}`)>>
- pipeJuncInt?: Partial< Record< LogisticDir, 'in' | 'out' >>

Generators Node Data extends Base Node Data:
- generatorKey: string (key from docsJson)
- clockSpeedThou: number (thousandth of clock speed)

---
Due to floating point precision, all computations will be done in integers by multiplying floats by 1000 and then dividing by 1000 at the end.
Any variable that is "mimicking" a float will be suffixed with "Thou" (short for thousandth) ie clockSpeedThou, itemRateThou, etc.
FYI: the "Thou" suffix is pronounced "th-ow" (like "thousandth" but without the "sandth"), and it came from thousandth of an inch (thou) in engineering. (I'm just bad at naming things)
*/

type RequireSome<T, K extends keyof T> = T & Required<Pick<T, K>>;

export interface FactoryBaseNodeData extends Record<string, any> {
  rotIdx?: 0 | 1 | 2 | 3; // 0 | 90 | 180 | 270
  bgColor?: string;
}

export interface FactoryItemNodeData extends FactoryBaseNodeData {
  itemKey?: string;
  speedThou?: number;
  interfaceKind?: 'both' | 'in' | 'out';
}

export type ResolvedFactoryItemNodeData = RequireSome<FactoryItemNodeData, 'speedThou' | 'interfaceKind'>;

export function resolveItemNodeData(data: FactoryItemNodeData | Record<string, unknown> = {}) {
  data.speedThou ??= 0;
  data.interfaceKind ??= 'both';
  return data as ResolvedFactoryItemNodeData;
}

export function speedThouToString(speedThou: number, addComma = true) {
  let speed = (speedThou / 1000).toFixed(3);
  if (addComma) speed = speed.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return speed.replace(/\.?0*$/, '');
}

export function parseSpeedThou(speedStr: string) {
  return Math.floor(parseFloat(speedStr.replaceAll(/,/g, '')) * 1000);
}

export interface FactoryRecipeNodeData extends FactoryBaseNodeData {
  recipeKey?: string;
  /**
   * Clock speed percent in thousandth
   * 100_00_000 = 100%
   *
   * To get percentage: clockSpeedThou / 100 (percentage) / 1000 (thousandth)
   * To get decimalThou: clockSpeedThou / 100 (percentage) / 100 (percent -> decimal)
   */
  clockSpeedThou?: number;
}

export type ResolvedFactoryRecipeNodeData = RequireSome<FactoryRecipeNodeData, 'clockSpeedThou'>;

export function resolveRecipeNodeData(data: FactoryRecipeNodeData | Record<string, unknown> = {}) {
  data.clockSpeedThou ??= 100_00_000;
  return data as ResolvedFactoryRecipeNodeData;
}

export function clockSpeedThouToPercentString(clockSpeedThou: number) {
  return (clockSpeedThou / 100_000).toFixed(3).replace(/\.?0*$/, '');
}

export function parseClockSpeedThouFromPercentString(clockSpeedStr: string) {
  return Math.floor(parseFloat(clockSpeedStr.replaceAll(/,/g, '')) * 1_00_000);
}

// export const LOGISTIC_DIR = ['left', 'right', 'center'] as const;
// export type LogisticDir = (typeof LOGISTIC_DIR)[number];
export const LOGISTIC_TYPE = ['splitter', 'merger', 'splitterSmart', 'splitterPro', 'pipeJunc'] as const;
export type LogisticType = (typeof LOGISTIC_TYPE)[number];
export const LOGISTIC_SMART_PRO_RULES = ['any', 'none', 'anyUndefined', 'overflow'] as const;
export type LogisticSmartProRules = (typeof LOGISTIC_SMART_PRO_RULES)[number] | `item-${string}`;
export const LOGISTIC_PIPE_JUNC_INT = ['in', 'out'] as const;
export type LogisticPipeJuncInt = (typeof LOGISTIC_PIPE_JUNC_INT)[number];

export interface FactoryLogisticNodeData extends FactoryBaseNodeData {
  type?: LogisticType;
  /**
   * Smart/Pro rules for splitterPro & splitterSmart
   *
   * Note: Dir are stored base on Node Dir which has (left, top, right, bottom)
   * but for splitter, the left is the input, the rest are output
   *
   * In-game the output are named (left, center, right) relative to the input
   * Hence, top -> left, right -> center, bottom -> right
   */
  smartProRules?: Partial<Record<Exclude<FactoryInterfaceDir, 'left'>, LogisticSmartProRules[]>>;
  /**
   * For easier computation, Left is always input, make the user rotate instead :)
   *
   * Bahahaha
   */
  pipeJuncInt?: Partial<Record<Exclude<FactoryInterfaceDir, 'left'>, LogisticPipeJuncInt>>;
}

export type ResolvedFactoryLogisticNodeData = RequireSome<FactoryLogisticNodeData, 'smartProRules' | 'pipeJuncInt'>;

export function resolveLogisticNodeData(data: FactoryLogisticNodeData | Record<string, unknown> = {}) {
  data.smartProRules ??= { right: ['any'] };
  data.pipeJuncInt ??= {};
  return data as ResolvedFactoryLogisticNodeData;
}

export interface FactoryGeneratorNodeData extends FactoryBaseNodeData {
  generatorKey?: string;
  clockSpeedThou?: number;
}

export type FactoryNodeData = FactoryItemNodeData | FactoryRecipeNodeData | FactoryLogisticNodeData | FactoryGeneratorNodeData;

export interface FactoryBeltOrPipeData extends Record<string, any> {
  startLabel?: string;
  centerLabel?: string;
  endLabel?: string;
  colorMode?: 'default' | 'info' | 'warning' | 'error';
  displayOnSelect?: boolean;
}

/*
"Interfaces", refering to input/output are represented as a combination of 
- direction (left, top, right, bottom)
- itemForm (solid, fluid)
- type (in, out)
- index (0, 1, 2, 3)

Interfaces are represented as a lowercase string joined by a hyphen, e.g. "left-solid-in-0". 
They also correspond as the handleId of the node.

Each "machine" will have a compute function that will take node and edge data and return:
- interfaces (`${direction}-${itemForm}-${type}-${index}`)
- itemRate (items per minute)
*/

export const FACTORY_INTERFACE_DIR = ['left', 'top', 'right', 'bottom'] as const;
export type FactoryInterfaceDir = (typeof FACTORY_INTERFACE_DIR)[number];
export const FACTORY_INTERFACE_ITEM_FORM = ['solid', 'fluid'] as const;
export type FactoryItemForm = (typeof FACTORY_INTERFACE_ITEM_FORM)[number];
export const FACTORY_INTERFACE_TYPE = ['in', 'out'] as const;
export type FactoryInterfaceType = (typeof FACTORY_INTERFACE_TYPE)[number];
export const FACTORY_INTERFACE_INDEX = [0, 1, 2, 3] as const;
export type FactoryInterfaceIndex = (typeof FACTORY_INTERFACE_INDEX)[number];

export function splitHandleId(id: string, validate = false) {
  const parts = id.split('-');
  if (validate && parts.length !== 4) {
    throw new Error('Invalid Interface ID');
  }
  const [dir, form, type, indexStr] = parts as [FactoryInterfaceDir, FactoryItemForm, FactoryInterfaceType, '0' | '1' | '2' | '3'];
  const index = parseInt(indexStr) as FactoryInterfaceIndex;
  if (isNaN(index)) {
    throw new Error('Invalid Interface Index');
  }
  if (validate) {
    if (!FACTORY_INTERFACE_DIR.includes(dir)) {
      throw new Error('Invalid Interface Direction');
    }
    if (!FACTORY_INTERFACE_ITEM_FORM.includes(form)) {
      throw new Error('Invalid Interface Item Form');
    }
    if (!FACTORY_INTERFACE_TYPE.includes(type)) {
      throw new Error('Invalid Interface Type');
    }
    if (!FACTORY_INTERFACE_INDEX.includes(index)) {
      throw new Error('Invalid Interface Index');
    }
  }
  return { dir, form, type, index };
}

export function joinIntoHandleId(a: {
  dir: FactoryInterfaceDir;
  form: FactoryItemForm;
  type: FactoryInterfaceType;
  index: FactoryInterfaceIndex;
}) {
  return `${a.dir}-${a.form}-${a.type}-${a.index}`;
}

/*
Flow data schema, types, and migrations
Latest version: 1

Versioning plans: 
- When breaking changes* are made, the 3 main schema will be moved to data-legacy.ts to maintain compatibility with older data.
- A migration function will created to convert the old data to the new schema in data-legacy.ts file.
- both import and db read will need to do version check and run the migration if needed.
- Update the schema in this file, and increment the version number.

What classifies as a breaking change:
- Reactflow library changes that affect the data structure
- TODO: Add breaking change criteria (there might not be any -\_(o.o)_/-)
*/

export const FLOW_DATA_VERSION = 1;

export const generateId = () => nanoid(16);
const ID_SCHEMA = z.string().length(16);

const FLOW_INFO_SCHEMA = z.object({
  id: ID_SCHEMA,
  name: z.string().min(1),
  description: z.string().optional(),
  updated: z.date(),
  created: z.date(),
});

const MAIN_NODE_PROP_SCHEMA = z.object({
  id: ID_SCHEMA,
  type: z.string().min(1),
  data: z.record(z.unknown()),
  position: z.object({ x: z.number(), y: z.number() }),
});

const MAIN_EDGE_PROP_SCHEMA = z.object({
  id: ID_SCHEMA,
  type: z.string().min(1),
  data: z.record(z.unknown()).optional(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string(),
  targetHandle: z.string(),
});

const FLOW_PROPERTIES_SCHEMA = z.object({
  viewportX: z.number().optional(),
  viewportY: z.number().optional(),
  viewportZoom: z.number().optional(),
});

export type FlowInfo = z.infer<typeof FLOW_INFO_SCHEMA>;
export type MainNodeProp = z.infer<typeof MAIN_NODE_PROP_SCHEMA>;
export type MainEdgeProp = z.infer<typeof MAIN_EDGE_PROP_SCHEMA>;
export type FlowProperties = z.infer<typeof FLOW_PROPERTIES_SCHEMA>;

export function pickMainNodeProp(node: Node): MainNodeProp {
  return pick(node, ['id', 'type', 'data', 'position']) as MainNodeProp;
}

export function validateMainNodeProp(node: unknown): MainNodeProp {
  return MAIN_NODE_PROP_SCHEMA.parse(node);
}

export function diffMainNodeProp(node1: Node, node2: Node) {
  // "type" will always be the same, there's no way to change it in the UI
  const { data: data1, position: position1 } = node1;
  const { data: data2, position: position2 } = node2;
  const patch: Record<string, any> = {};
  for (const key in data1) {
    if (data1[key] !== data2[key]) {
      patch['data.' + key] = data1[key];
    }
  }
  if (position1.x !== position2.x || position1.y !== position2.y) patch.position = position1;
  return patch;
}

export function applyMainNodePropPatch(node: Node, patch: Record<string, any>) {
  const reversePatch: Record<string, any> = {};
  for (const key in patch) {
    const keys = key.split('.');
    if (keys[0] === 'data') {
      reversePatch['data.' + keys[1]] = node.data[keys[1]];
      if (patch[key] === undefined) {
        delete node.data?.[keys[1]];
      } else {
        node.data ??= {};
        node.data[keys[1]] = patch[key];
      }
    } else if (keys[0] === 'position') {
      reversePatch[key] = { x: node.position.x, y: node.position.y };
      node.position = patch[key];
    }
  }
  return reversePatch;
}

export function pickMainEdgeProp(edge: Edge): MainEdgeProp {
  return pick(edge, ['id', 'type', 'source', 'target', 'sourceHandle', 'targetHandle']) as MainEdgeProp;
}

export function validateMainEdgeProp(edge: unknown): MainEdgeProp {
  return MAIN_EDGE_PROP_SCHEMA.parse(edge);
}

export function diffMainEdgeProp(edge1: Edge, edge2: Edge) {
  // "type" will always be the same, there's no way to change it in the UI
  const { data: data1, source: source1, target: target1, sourceHandle: sourceHandle1, targetHandle: targetHandle1 } = edge1;
  const { data: data2, source: source2, target: target2, sourceHandle: sourceHandle2, targetHandle: targetHandle2 } = edge2;
  const patch: Record<string, any> = {};
  if (data1 !== data2 && data1 && data2) {
    for (const key in data1) {
      if (data1[key] !== data2[key]) {
        patch['data.' + key] = data1[key];
      }
    }
  }
  if (source1 !== source2) patch.source = source1;
  if (target1 !== target2) patch.target = target1;
  if (sourceHandle1 !== sourceHandle2) patch.sourceHandle = sourceHandle1;
  if (targetHandle1 !== targetHandle2) patch.targetHandle = targetHandle1;
  return patch;
}

export function applyMainEdgePropPatch(edge: Edge, patch: Record<string, any>) {
  const reversePatch: Record<string, any> = {};
  for (const key in patch) {
    const keys = key.split('.');
    if (keys[0] === 'data') {
      reversePatch['data.' + keys[1]] = edge.data?.[keys[1]];
      if (patch[key] === undefined) {
        delete edge.data?.[keys[1]];
      } else {
        edge.data ??= {};
        edge.data[keys[1]] = patch[key];
      }
    } else if (['source', 'target', 'sourceHandle', 'targetHandle'].includes(keys[0])) {
      // @ts-ignore
      edge[keys[0]] = patch[key];
    }
  }
  return reversePatch;
}

const EXPORT_FLOW_DATA_SCHEMA = z.object({
  version: z.literal(FLOW_DATA_VERSION),
  info: FLOW_INFO_SCHEMA.omit({ created: true, updated: true }).merge(
    z.object({
      created: z.number().transform(v => new Date(v)),
      updated: z.number().transform(v => new Date(v)),
    }),
  ),
  nodes: z.array(MAIN_NODE_PROP_SCHEMA),
  edges: z.array(MAIN_EDGE_PROP_SCHEMA),
  properties: FLOW_PROPERTIES_SCHEMA,
});

export type FullFlowData = {
  info: FlowInfo;
  nodes: MainNodeProp[];
  edges: MainEdgeProp[];
  properties: FlowProperties;
};
export type ExportDataOptions = {
  spaced?: boolean;
};

export function stringifyFlowData({ info, nodes, edges, properties }: FullFlowData, { spaced = false }: ExportDataOptions = {}) {
  return JSON.stringify(
    {
      version: FLOW_DATA_VERSION,
      info: { ...info, created: info.created.getTime(), updated: info.updated.getTime() },
      nodes: nodes.map(pickMainNodeProp),
      edges: edges.map(pickMainEdgeProp),
      properties,
    },
    null,
    spaced ? 2 : 0,
  );
}

export function parseFlowData(json: string): FullFlowData {
  const data = parseJson(json);
  return EXPORT_FLOW_DATA_SCHEMA.parse(data);
}
