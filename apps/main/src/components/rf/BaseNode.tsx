import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { Handle, NodeProps, Position, Node, useUpdateNodeInternals } from '@xyflow/react';
import debounce from 'debounce';
import { useAtom } from 'jotai';
import { RotateCcw, RotateCw } from 'lucide-react';
import { FACTORY_INTERFACE_DIR, FactoryInterfaceDir, splitInterfaceId } from '../../engines/compute';
import { FactoryBaseNodeData } from '../../engines/data';
import { selectedNodeOrEdge } from '../../lib/rfListeners';

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
  factoryInterfaces: string[]; // Refer to engine/compute.ts for more info
  size: number | [number, number];
}

export function FactoryNodeWrapper(props: FactoryNodeWrapperProps) {
  const { children, factoryInterfaces, size, id, data, selected, type } = props;
  const { rotIdx = 0, bgColor = FACTORY_NODE_DEFAULT_COLORS[type as FactoryNodeType] } = data;
  const childrenRef = useRef<HTMLDivElement>(null);
  const updateNodeInternals = useUpdateNodeInternals();
  const handleDirCount = useMemo(() => {
    const handleDirCount: Record<FactoryInterfaceDir, number> = { left: 0, top: 0, right: 0, bottom: 0 };
    for (const handleId of factoryInterfaces) {
      handleDirCount[splitInterfaceId(handleId).dir]++;
    }
    return handleDirCount;
  }, [factoryInterfaces, id]);

  useEffect(() => {
    // Update the node internals when the handle changes
    updateNodeInternals(id);
  }, [id, updateNodeInternals, rotIdx, size, factoryInterfaces.join(',')]);

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
      {factoryInterfaces.map(handleId => {
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
      })}
    </div>
  );
}

/*
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
  getValue: (name: string) => any;
  createSetValue: (name: string, debounced?: boolean) => (value: any) => void;
}

const EditorFormContext = createContext<EditorFormContextValue | null>(null);

export function useEditorField<T>(name: string, useDebounce = false) {
  const ctx = useContext(EditorFormContext);
  if (!ctx) {
    throw new Error('useEditorField must be used inside FactoryNodeEditorWrapper');
  }
  const currentValue = ctx.getValue(name) as T;
  const setValue = ctx.createSetValue(name, useDebounce) as (value: T) => void;
  return { currentValue, setValue };
}

export interface FactoryNodeEditorChildProps {
  setValue: (name: string, value: any) => void;
  currentValue: any;
}

export interface FactoryNodeEditorWrapperProps {
  children: ReactNode | ((p: FactoryNodeEditorChildProps) => ReactNode);
}

export function FactoryNodeEditorWrapper({ children }: FactoryNodeEditorWrapperProps) {
  const [selNode, setSelNodeProp] = useAtom(selectedNodeOrEdge);

  const setValue = useCallback(
    (name: string, value: any) => {
      // Write value to data of node
      // name can be nested
      const path = name.split('.');
      setSelNodeProp({
        node: prev => {
          const next = { ...prev };
          let current: any = next.data;
          for (let i = 0; i < path.length - 1; i++) {
            if (!(path[i] in current)) {
              if (/\d+/.test(path[i + 1])) {
                current[path[i]] = [];
              } else {
                current[path[i]] = {};
              }
            }
            current = current[path[i]];
          }
          if (value === undefined) {
            delete current[path[path.length - 1]];
          } else {
            current[path[path.length - 1]] = value;
          }
          return next;
        },
      });
    },
    [selNode, setSelNodeProp],
  );

  const debouncedSetValue = useCallback(debounce(setValue, 100), [setValue]);

  const createSetValue = useCallback(
    (name: string, debounced = false) => {
      if (!debounced) {
        return (value: any) => setValue(name, value);
      } else {
        return (value: any) => debouncedSetValue(name, value);
      }
    },
    [setValue],
  );

  const getValue = useCallback(
    (name: string) => {
      if (!selNode || 'edge' in selNode) {
        return undefined;
      }

      const path = name.split('.');
      let current: any = selNode?.node?.data;
      for (let i = 0; i < path.length; i++) {
        if (!(path[i] in current)) {
          return undefined;
        }
        current = current[path[i]];
      }
      return current;
    },
    [selNode],
  );

  if (!selNode || 'edge' in selNode) {
    return <p>No node selected</p>;
  }

  const defBgColor = FACTORY_NODE_DEFAULT_COLORS[selNode.node.type as FactoryNodeType];

  return (
    <EditorFormContext.Provider value={{ getValue, createSetValue }}>
      <div className='flex flex-col gap-y-2'>
        {children instanceof Function ? children({ setValue, currentValue: getValue('') }) : children}
        {/* Color */}
        <div className='flex w-full items-center justify-between'>
          <p className='label-text mr-4 flex-1 text-lg'>Color: </p>
          <input
            type='color'
            className='input input-sm input-ghost'
            value={(selNode.node.data.bgColor as string) ?? defBgColor}
            onChange={e => debouncedSetValue('bgColor', e.target.value)}
          />
          <button className='btn btn-sm btn-ghost' onClick={() => setValue('bgColor', undefined)}>
            Reset
          </button>
        </div>
        {/* Rotation */}
        <div className='flex w-full items-center justify-between'>
          <p className='label-text mr-4 text-lg'>Rotation: </p>
          <div className='join'>
            <button
              className='btn btn-sm btn-ghost'
              onClick={() => setValue('rotIdx', (((selNode.node.data.rotIdx as number) ?? 0) + 1) % 4)}
            >
              <RotateCw />
            </button>
            <button
              className='btn btn-sm btn-ghost'
              onClick={() => setValue('rotIdx', (((selNode.node.data.rotIdx as number) ?? 0) + 3) % 4)}
            >
              <RotateCcw />
            </button>
          </div>
        </div>
      </div>
    </EditorFormContext.Provider>
  );
}
