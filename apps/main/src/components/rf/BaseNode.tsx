import { createContext, ReactNode, useContext, useEffect, useRef } from 'react';
import { Handle, NodeProps, Position, Node, useUpdateNodeInternals, Edge } from '@xyflow/react';
import { ComputeResult, FACTORY_INTERFACE_DIR, FactoryInterfaceDir, joinIntoHandleId } from '../../engines/compute';
import { FactoryBaseNodeData } from '../../engines/data';

export const FACTORY_NODE_TYPES = ['item', 'recipe', 'logistic'] as const;
export type FactoryNodeType = (typeof FACTORY_NODE_TYPES)[number];

export const FACTORY_NODE_DEFAULT_COLORS = {
  item: '#76BABF',
  recipe: '#F6AD55',
  logistic: '#71DA8F',
} as const satisfies Record<FactoryNodeType, string>;

/* 
  Wrapper for custom node that providies rendering of:
  - inputs / outputs (and its type)
  - background color
  - rotation
  - sizes
*/

interface FactoryNodeWrapperProps extends NodeProps<Node<FactoryBaseNodeData>> {
  children?: ReactNode;
  factoryInterfaces?: ComputeResult['interfaces']; // Refer to engine/compute.ts for more info
  size: number | [number, number];
}

export function FactoryNodeWrapper(props: FactoryNodeWrapperProps) {
  const { children, factoryInterfaces, size, id, data, selected, type } = props;
  const { rotIdx = 0, bgColor = FACTORY_NODE_DEFAULT_COLORS[type as FactoryNodeType] } = data;
  const childrenRef = useRef<HTMLDivElement>(null);
  const updateNodeInternals = useUpdateNodeInternals();

  useEffect(() => {
    // Update the node internals when the handle changes
    updateNodeInternals(id);
  }, [id, updateNodeInternals, rotIdx, size, factoryInterfaces]);

  const [width, height] = typeof size === 'number' ? [size, size] : size;
  const swapWidthHeight = typeof size !== 'number' && rotIdx % 2 === 1;

  return (
    <div
      className='text-base-100 rounded-md p-1 outline-offset-2 duration-75'
      style={{
        width: swapWidthHeight ? height : width,
        height: swapWidthHeight ? width : height,
        backgroundColor: bgColor,
        outline: selected ? '2px solid ' + bgColor : 'none',
      }}
    >
      {children && (
        <div
          ref={childrenRef}
          // style={counterRotate !== 'whole' ? undefined : { transform: `rotate(${counterRotateAngle}deg)` }}
          className='flex size-full flex-col items-center justify-center gap-y-1 text-center transition-transform duration-75'
        >
          {children}
        </div>
      )}
      {/* {factoryInterfaces.map(handleId => {
        const { dir, form, type, index: handleIndex } = splitInterfaceId(handleId);
        const offset = ((handleIndex + 1) / (handleDirCount[dir] + 1)) * 100;
        const dirIndex = FACTORY_INTERFACE_DIR.indexOf(dir);
        const rotDir = FACTORY_INTERFACE_DIR[(dirIndex + rotIdx) % 4];
        const rAdjDir = FACTORY_INTERFACE_DIR[(dirIndex + rotIdx + 1) % 4];
        const lAdjDir = FACTORY_INTERFACE_DIR[(dirIndex + rotIdx + 3) % 4];
        return (
          <Handle
            id={handleId}
            key={handleId}
            type={type === 'in' ? 'target' : 'source'}
            position={rotDir as Position}
            className='size-2'
            style={{
              [rotDir]: '-0.25rem', // compensate for p-1
              [rAdjDir]: `${offset}%`,
              [lAdjDir]: `${100 - offset}%`,
              backgroundColor: type === 'in' ? '#F6E05E' : '#68D391', // Yellow for input, green for output
              borderRadius: form === 'fluid' ? undefined : '0', // Circle for fluid, square for solid
            }}
          />
        );
      })} */}
      {factoryInterfaces &&
        Object.entries(factoryInterfaces).flatMap(([dir, handles]) =>
          handles.map(({ type, form }, index, { length }) => {
            const offset = ((index + 1) / (length + 1)) * 100;
            const dirIndex = FACTORY_INTERFACE_DIR.indexOf(dir as FactoryInterfaceDir);
            const rotDir = FACTORY_INTERFACE_DIR[(dirIndex + rotIdx) % 4];
            const rAdjDir = FACTORY_INTERFACE_DIR[(dirIndex + rotIdx + 1) % 4];
            const lAdjDir = FACTORY_INTERFACE_DIR[(dirIndex + rotIdx + 3) % 4];
            return (
              <Handle
                id={joinIntoHandleId({ dir: dir as FactoryInterfaceDir, form, type, index: index as 0 | 1 | 2 | 3 })}
                key={joinIntoHandleId({ dir: dir as FactoryInterfaceDir, form, type, index: index as 0 | 1 | 2 | 3 })}
                type={type === 'in' ? 'target' : 'source'}
                position={rotDir as Position}
                className='size-2'
                style={{
                  [rotDir]: '-0.25rem', // compensate for p-1
                  [rAdjDir]: `${offset}%`,
                  [lAdjDir]: `${100 - offset}%`,
                  backgroundColor: type === 'in' ? '#F6E05E' : '#68D391', // Yellow for input, green for output
                  borderRadius: form === 'fluid' ? undefined : '0', // Circle for fluid, square for solid
                }}
              />
            );
          }),
        )}
    </div>
  );
}

/*
  TODO: Outdated, please update
  Wrapper for custom node editor that
  - follows the [render prop pattern](https://www.patterns.dev/react/render-props-pattern#children-as-a-function)
  - provides a form for editing node properties (maybe with Formik)
  - provide field for rotations, color
  - validate the field (onChange)
  - handles changes and debounces the update into node
  
  FLow of data update (for number/string fields):
    - onChange -> validate -> updateFieldUI -> preventClosing (of editor) & showLoader (in reactflow) -> 
      debounced -> updateNode (stored separately in node) -> propogateAndCompute (update other nodes/edges) -> hideLoader
    - onSubmit -> updateNode (update node with new values) -> allowClosing

  Flow of data update (for other fields):
    onChange -> updateNode (stored directly in node) -> propogateAndCompute (update other nodes/edges)
*/
interface EditorFormContextValue {
  getValue: (name?: string) => any;
  createSetValue: (name: string | undefined, debounceMs?: number) => (updateOrUpdater: any | ((prev: any) => any)) => void;
  selectedType: 'node' | 'edge';
  nodeOrEdge: Node | Edge;
}

const EditorFormContext = createContext<EditorFormContextValue | null>(null);

export function useEditorField<D>(name: string, debounceMs: boolean | number = 0) {
  const ctx = useContext(EditorFormContext);
  if (!ctx) {
    throw new Error('useEditorField must be used inside FactoryNodeEditorWrapper');
  }
  const currentValue = ctx.getValue(name as string) as D;
  const debouceMsV = typeof debounceMs === 'number' ? debounceMs : debounceMs ? 100 : 0;
  const setValue = ctx.createSetValue(name as string, debouceMsV) as (updateOrUpdater: D | ((prev: D) => D)) => void;
  return { currentValue, setValue, selectedType: ctx.selectedType, nodeOrEdge: ctx.nodeOrEdge };
}

export function useEditor<D>(debounceMs: boolean | number = 0) {
  const ctx = useContext(EditorFormContext);
  if (!ctx) {
    throw new Error('useEditor must be used inside FactoryNodeEditorWrapper');
  }
  const currentValue = ctx.getValue() as D;
  const debouceMsV = typeof debounceMs === 'number' ? debounceMs : debounceMs ? 100 : 0;
  const setValue = ctx.createSetValue(undefined, debouceMsV) as (updateOrUpdater: Partial<D> | ((prev: D) => D)) => void;
  return { currentValue, setValue, selectedType: ctx.selectedType, nodeOrEdge: ctx.nodeOrEdge };
}

export interface FactoryNodeEditorChildProps<V = Record<string, unknown>> {
  setValue: <K extends keyof V | undefined>(name: K, value: K extends keyof V ? V[K] : V) => void;
  currentValue: V;
}

export interface FactoryNodeEditorWrapperProps {
  children: ReactNode;
}

export interface FactoryEditorContextProviderProps extends EditorFormContextValue {
  children: ReactNode;
}

export function FactoryEditorContextProvider({ children, ...providerProps }: FactoryEditorContextProviderProps) {
  return <EditorFormContext.Provider value={providerProps}>{children}</EditorFormContext.Provider>;
}
