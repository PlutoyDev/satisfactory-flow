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
