import { useEffect, useState } from 'react';
import { useEditorField } from '../rf/BaseNode';
import { Minus, Plus } from 'lucide-react';

interface NumberInputProps {
  name: string;
  defaultValue: number;
  step?: number;
  unit: '%' | '/ min';
  minValue?: number;
  maxValue?: number;
}

export default function NumberInput({ name, defaultValue, step, unit, minValue = 0, maxValue = Infinity }: NumberInputProps) {
  const { setValue, currentValue } = useEditorField<number | undefined>(name, true);
  const [localValue, setLocalValue] = useState<number>(() => {
    if (currentValue === undefined) {
      return defaultValue;
    }
    let powOfTen = 0;
    if (unit === '%') {
      powOfTen += 2;
    }
    if (name.endsWith('Thou')) {
      powOfTen += 3;
    }
    return currentValue / Math.pow(10, powOfTen);
  });

  useEffect(() => {
    // Value in node are stored as thousandth
    let powOfTen = 0; // the number will be multiplied by 10^powOfTen
    if (unit === '%') {
      powOfTen += 2;
    }
    if (name.endsWith('Thou')) {
      powOfTen += 3;
    }
    setValue(isNaN(localValue) ? undefined : Math.floor(localValue * Math.pow(10, powOfTen)));
  }, [localValue]);

  return (
    <div className='join'>
      {step && (
        <button
          className='btn btn-sm btn-ghost join-item'
          onMouseDown={e => {
            e.preventDefault();
            setLocalValue(Math.max(localValue - step, minValue));
            const interval = setInterval(() => {
              setLocalValue(localValue => Math.max(localValue - step, minValue));
            }, 100);
            const stop = () => clearInterval(interval);
            window.addEventListener('mouseup', stop);
            return stop;
          }}
        >
          <Minus />
        </button>
      )}

      <label className='input input-sm input-ghost join-item flex items-center gap-2'>
        <input
          type='number'
          className='w-16'
          value={isNaN(localValue) ? '' : localValue.toString().replace(/(?<=\.)(\d{3}).*$/, '$1')}
          onChange={e => {
            const parsedFloat = parseFloat(e.target.value);
            setLocalValue(isNaN(parsedFloat) ? NaN : Math.min(Math.max(parsedFloat, minValue), maxValue));
          }}
        />
        {unit}
      </label>
      {step && (
        <button
          className='btn btn-sm btn-ghost join-item'
          onMouseDown={e => {
            e.preventDefault();
            setLocalValue(Math.min(localValue + step, maxValue));
            const interval = setInterval(() => {
              setLocalValue(localValue => Math.min(localValue + step, maxValue));
            }, 100);
            const stop = () => clearInterval(interval);
            window.addEventListener('mouseup', stop);
            return stop;
          }}
        >
          <Plus />
        </button>
      )}
    </div>
  );
}
