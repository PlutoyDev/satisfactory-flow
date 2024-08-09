import type { FactoryInterfaceDir } from './compute';

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

export function resolveItemNodeData(data: FactoryItemNodeData | Record<string, unknown> = {}) {
  data.speedThou ??= 0;
  data.interfaceKind ??= 'both';
  return data as RequireSome<FactoryItemNodeData, 'speedThou' | 'interfaceKind'>;
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

export function resolveRecipeNodeData(data: FactoryRecipeNodeData | Record<string, unknown> = {}) {
  data.clockSpeedThou = 100_00_000;
  return data as RequireSome<FactoryRecipeNodeData, 'clockSpeedThou'>;
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

export function resolveLogisticNodeData(data: FactoryLogisticNodeData | Record<string, unknown> = {}) {
  data.smartProRules ??= { right: ['any'] };
  data.pipeJuncInt ??= {};
  return data as RequireSome<FactoryLogisticNodeData, 'smartProRules' | 'pipeJuncInt'>;
}

export interface FactoryGeneratorNodeData extends FactoryBaseNodeData {
  generatorKey?: string;
  clockSpeedThou?: number;
}

export type FactoryNodeData = FactoryItemNodeData | FactoryRecipeNodeData | FactoryLogisticNodeData | FactoryGeneratorNodeData;
