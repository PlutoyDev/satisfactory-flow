import { useState } from 'react';
import { useEditorField } from '../rf/BaseNode';
import { Minus, Plus } from 'lucide-react';

interface NumberInputProps {
  name: string;
  defaultValue: number;
  increment?: number;
  unit: '%' | '/ min';
}

export default function NumberInput({ name, defaultValue, increment, unit }: NumberInputProps) {
  const { setValue, currentValue } = useEditorField<number | undefined>(name);
  const [localValue, setLocalValue] = useState<number>(() => {
    if (currentValue === undefined) {
      return defaultValue;
    }
    let powOfTen = 0;
    if (unit === '%') {
      powOfTen = -2;
    }
    if (name.endsWith('Thou')) {
      powOfTen = 3;
    }
    return currentValue / Math.pow(10, powOfTen);
  });

  return (
    <div className='join'>
      {increment && (
        <button
          className='btn btn-sm btn-ghost'
          onClick={() => {
            setLocalValue(localValue - increment);
            setValue(localValue - increment);
          }}
        >
          <Minus />
        </button>
      )}

      <label className='input input-bordered flex items-center gap-2'>
        <input
          type='number'
          className='input input-sm input-bordered'
          value={isNaN(localValue) ? '' : localValue}
          onChange={e => {
            try {
              const parsedFloat = parseFloat(e.target.value);
              setLocalValue(isNaN(parsedFloat) ? NaN : parsedFloat);
              // Value in node are stored as thousandth
              let powOfTen = 0; // the number will be multiplied by 10^powOfTen
              if (unit === '%') {
                powOfTen -= 2;
              }
              if (name.endsWith('Thou')) {
                powOfTen += 3;
              }
              setValue(isNaN(parsedFloat) ? undefined : Math.floor(parsedFloat * Math.pow(10, powOfTen)));
            } catch (e) {
              // do nothing
            }
          }}
        />
        {unit}
      </label>
      {increment && (
        <button
          className='btn btn-sm btn-ghost'
          onClick={() => {
            setLocalValue(localValue + increment);
            setValue(localValue + increment);
          }}
        >
          <Plus />
        </button>
      )}
    </div>
  );
}
