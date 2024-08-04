/*
Data type using for computation

Base Node Data:
- rotation: number (0 | 90 | 180 | 270)
- customBackground: string (hex color)

Item Node Data extends Base Node Data:
- itemKey: string (key from docsJson)
- speedThou: number (thousandth of items per minute)
- interface: 'both' | 'input' | 'output' (default: 'both')

Recipe Node Data extends Base Node Data:
- recipeKey: string (key from docsJson)
- clockSpeedThou: number (thousandth of clock speed)

LogisticDir: 'left' | 'right' | 'center'

Logistic Node Data extends Base Node Data:
- type: 'splitter' | 'merger' | 'splitterSmart' |'splitterPro' | 'pipeJunc'
- smartProRules?: Partial< Record< LogisticDir, ('any' | 'none' | 'anyUndefined' | 'overflow' | `item-${string}`)>>
- pipeJuncInt?: Partial< Record< LogisticDir, 'input' | 'output' >>

Generators Node Data extends Base Node Data:
- generatorKey: string (key from docsJson)
- clockSpeedThou: number (thousandth of clock speed)
*/
