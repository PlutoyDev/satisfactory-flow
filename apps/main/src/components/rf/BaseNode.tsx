import { Handle, NodeProps, Position, Node, useUpdateNodeInternals } from '@xyflow/react';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { FactoryBaseNodeData } from '../../engines/data';
import { FACTORY_INTERFACE_DIR, FactoryInterfaceDir, splitInterfaceId } from '../../engines/compute';
import { selectedNodeOrEdge } from '../../lib/rfListeners';
import { useAtom } from 'jotai';

/* 
  Wrapper for custom node that providies rendering of:
  - inputs / outputs (and its type)
  - background color
  - rotation
  - sizes
*/

interface FactoryNodeWrapperProps extends NodeProps<Node<FactoryBaseNodeData>> {
  children?: ReactNode;
  defBgColor: string;
  factoryInterfaces: string[]; // Refer to engine/compute.ts for more info
  counterRotate?: 'whole' | 'individual' | 'images';
  size: number | [number, number];
}

export function FactoryNodeWrapper(props: FactoryNodeWrapperProps) {
  const { children, defBgColor, factoryInterfaces, counterRotate, size, id, data, selected } = props;
  const { rotation = 0, bgColor = defBgColor } = data;
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
  }, [id, updateNodeInternals, rotation, size, factoryInterfaces.join(',')]);

  useEffect(() => {
    // Handle counter rotation
    if (childrenRef.current && counterRotate && counterRotate !== 'whole') {
      const children = counterRotate === 'images' ? childrenRef.current.querySelectorAll('img') : childrenRef.current.children;
      for (const child of children) {
        if (child instanceof HTMLElement) {
          child.style.transform = `rotate(${rotation}deg)`;
        }
      }
    }
  }, [childrenRef, counterRotate, rotation]);

  const [width, height] = typeof size === 'number' ? [size, size] : size;
  const swapWidthHeight = rotation % 180 !== 0;

  return (
    <div
      className='text-base-100 rounded-md p-1 outline-offset-2 transition-transform'
      style={{
        width: swapWidthHeight ? height : width,
        height: swapWidthHeight ? width : height,
        backgroundColor: bgColor,
        outline: selected ? '2px solid ' + bgColor : 'none',
        transform: `rotate(${rotation}deg)`,
      }}
    >
      {children && (
        <div ref={childrenRef} className='flex size-full items-center justify-center transition-transform'>
          {children}
        </div>
      )}
      {factoryInterfaces.map(handleId => {
        const { dir, form, type, index: handleIndex } = splitInterfaceId(handleId);
        const offset = (handleIndex / (handleDirCount[dir] + 1)) * 100;
        const dirIndex = FACTORY_INTERFACE_DIR.indexOf(dir);
        const rAdjDir = FACTORY_INTERFACE_DIR[(dirIndex + 1) % 4];
        const lAdjDir = FACTORY_INTERFACE_DIR[(dirIndex - 1) % 4];
        return (
          <Handle
            id={handleId}
            key={handleId}
            type={type === 'in' ? 'target' : 'source'}
            position={dir as Position}
            className='size-2'
            style={{
              [dir]: '-0.25rem', // compensate for p-1
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

// TODO: Custom Node Editor Wrapper
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
  createSetValue: (name: string) => (value: any) => void;
}

const EditorFormContext = createContext<EditorFormContextValue | null>(null);

export function useEditorField<T>(name: string) {
  const ctx = useContext(EditorFormContext);
  if (!ctx) {
    throw new Error('useEditorField must be used inside FactoryNodeEditorWrapper');
  }
  const currentValue = ctx.getValue(name) as T;
  const setValue = ctx.createSetValue(name) as (value: T) => void;
  return { currentValue, setValue };
}

export interface FactoryNodeEditorChildProps {
  setValue: (name: string, value: any) => void;
  currentValue: any;
}

export interface FactoryNodeEditorWrapperProps {
  children: (p: FactoryNodeEditorChildProps) => ReactNode;
}

export function FactoryNodeEditorWrapper({ children: Child }: FactoryNodeEditorWrapperProps) {
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
          current[path[path.length - 1]] = value;
          return next;
        },
      });
    },
    [selNode, setSelNodeProp],
  );

  const createSetValue = useCallback(
    (name: string) => {
      return (value: any) => setValue(name, value);
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

  return (
    <EditorFormContext.Provider value={{ getValue, createSetValue }}>
      <Child setValue={setValue} currentValue={selNode.node.data} />
    </EditorFormContext.Provider>
  );
}
