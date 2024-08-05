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
export interface FactoryBaseNodeData extends Record<string, any> {
  rotIdx?: 0 | 1 | 2 | 3; // 0 | 90 | 180 | 270
  bgColor?: string;
}

export interface FactoryItemNodeData extends FactoryBaseNodeData {
  itemKey?: string;
  speedThou?: number;
  interfaceKind?: 'both' | 'in' | 'out';
}

export interface FactoryRecipeNodeData extends FactoryBaseNodeData {
  recipeKey?: string;
  clockSpeedThou?: number;
}

export const LOGISTIC_DIR = ['left', 'right', 'center'] as const;
export type LogisticDir = (typeof LOGISTIC_DIR)[number];
export const LOGISTIC_TYPE = ['splitter', 'merger', 'splitterSmart', 'splitterPro', 'pipeJunc'] as const;
export type LogisticType = (typeof LOGISTIC_TYPE)[number];
export const LOGISTIC_SMART_PRO_RULES = ['any', 'none', 'anyUndefined', 'overflow'] as const;
export type LogisticSmartProRules = (typeof LOGISTIC_SMART_PRO_RULES)[number] | `item-${string}`;
export const LOGISTIC_PIPE_JUNC_INT = ['in', 'out'] as const;
export type LogisticPipeJuncInt = (typeof LOGISTIC_PIPE_JUNC_INT)[number];

export interface FactoryLogisticNodeData extends FactoryBaseNodeData {
  type?: LogisticType;
  smartProRules?: Partial<Record<LogisticDir, LogisticSmartProRules>>;
  pipeJuncInt?: Partial<Record<LogisticDir, LogisticPipeJuncInt>>;
}

export interface FactoryGeneratorNodeData extends FactoryBaseNodeData {
  generatorKey?: string;
  clockSpeedThou?: number;
}

export type FactoryNodeData = FactoryItemNodeData | FactoryRecipeNodeData | FactoryLogisticNodeData | FactoryGeneratorNodeData;
