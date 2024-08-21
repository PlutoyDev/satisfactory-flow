import { RotateCw, RotateCcw } from 'lucide-react';
import { FactoryBaseNodeData } from '../../lib/data';
import { FACTORY_NODE_DEFAULT_COLORS, useEditorField } from '../rf/BaseNode';

export function RotationAndColorFields() {
  const { currentValue: bgColor, setValue: setBgColor, nodeOrEdge } = useEditorField<FactoryBaseNodeData['bgColor']>('bgColor', true);
  const { currentValue: rotIdx, setValue: setRotIdx } = useEditorField<FactoryBaseNodeData['rotIdx']>('rotIdx');

  if (!nodeOrEdge || !nodeOrEdge.type || !(nodeOrEdge.type in FACTORY_NODE_DEFAULT_COLORS)) {
    return null;
  }

  return (
    <>
      {/* Color */}
      <div className='flex w-full items-center justify-between'>
        <p className='label-text mr-4 flex-1 text-lg'>Color: </p>
        <input
          type='color'
          className='input input-sm input-ghost'
          value={bgColor ?? FACTORY_NODE_DEFAULT_COLORS[nodeOrEdge.type as keyof typeof FACTORY_NODE_DEFAULT_COLORS]}
          onChange={e => setBgColor(e.target.value)}
        />
        <button className='btn btn-sm btn-ghost' onClick={() => setBgColor(undefined)}>
          Reset
        </button>
      </div>
      {/* Rotation */}
      <div className='flex w-full items-center justify-between'>
        <p className='label-text mr-4 text-lg'>Rotation: </p>
        <div className='join'>
          <button className='btn btn-sm btn-ghost' onClick={() => setRotIdx((((rotIdx ?? 0) + 1) % 4) as 0 | 1 | 2 | 3)}>
            <RotateCw />
          </button>
          <button className='btn btn-sm btn-ghost' onClick={() => setRotIdx((((rotIdx ?? 0) + 3) % 4) as 0 | 1 | 2 | 3)}>
            <RotateCcw />
          </button>
        </div>
      </div>
    </>
  );
}
