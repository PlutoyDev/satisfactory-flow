import { Handle, NodeProps, Position, Node, useUpdateNodeInternals } from '@xyflow/react';
import { ReactNode, useEffect, useMemo, useRef } from 'react';
import { FactoryBaseNodeData } from '../../engines/data';
import { FACTORY_INTERFACE_DIR, FactoryInterfaceDir, splitInterfaceId } from '../../engines/compute';

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
  }, [id, updateNodeInternals, rotation, size, factoryInterfaces]);

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
      className='rounded-md p-1 text-base outline-offset-2 transition-transform'
      style={{
        width: swapWidthHeight ? height : width,
        height: swapWidthHeight ? width : height,
        backgroundColor: bgColor,
        outline: selected ? '2px solid ' + bgColor : 'none',
        transform: `rotate(${rotation}deg)`,
      }}
    >
      {children && (
        <div ref={childrenRef} className='size-full transition-transform will-change-transform *:size-full'>
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
