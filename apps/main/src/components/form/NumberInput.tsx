import { useCallback, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { clockSpeedThouToPercentString, parseClockSpeedThouFromPercentString, parseSpeedThou, speedThouToString } from '../../engines/data';
import { useEditorField } from '../rf/BaseNode';

interface NumberInputProps {
  name: string;
  defaultValue: number;
  step?: number;
  unit: '%' | '/ min';
  minValue?: number;
  maxValue?: number;
}

export default function NumberInput({ name, defaultValue, step, unit, minValue = 0, maxValue = Infinity }: NumberInputProps) {
  const { setValue: setGlobalValue, currentValue } = useEditorField<number | undefined>(name, true);
  const multiplier = unit === '%' ? 100_000 : 1_000;
  const [localValue, setLocalValue] = useState<number>(currentValue ?? defaultValue * multiplier);

  const setValue = useCallback(
    (valueOrUpdater: undefined | string | number | '+' | '-') => {
      setLocalValue(p => {
        p ??= defaultValue * multiplier;
        let newValue: number;
        if (valueOrUpdater === undefined) newValue = defaultValue * multiplier;
        else if (typeof valueOrUpdater === 'number') newValue = valueOrUpdater * multiplier;
        else if (valueOrUpdater === '+') newValue = p + step! * multiplier;
        else if (valueOrUpdater === '-') newValue = p - step! * multiplier;
        else newValue = unit === '%' ? parseClockSpeedThouFromPercentString(valueOrUpdater) : parseSpeedThou(valueOrUpdater);
        newValue = Math.min(Math.max(newValue, minValue * multiplier), maxValue * multiplier);
        setGlobalValue(newValue);
        return newValue;
      });
    },
    [unit, setLocalValue, setGlobalValue],
  );

  return (
    <div className='join'>
      {step && (
        <button
          className='btn btn-sm btn-ghost join-item'
          onMouseDown={e => {
            e.preventDefault();
            setValue('-');
            const interval = setInterval(() => setValue('-'), 100);
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
          value={unit === '%' ? clockSpeedThouToPercentString(localValue) : speedThouToString(localValue)}
          onChange={e => setValue(e.target.value)}
        />
        {unit}
      </label>
      {step && (
        <button
          className='btn btn-sm btn-ghost join-item'
          onMouseDown={e => {
            e.preventDefault();
            setValue('+');
            const interval = setInterval(() => setValue('+'), 100);
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
