import Fuse from 'fuse.js';
import { docsMappedAtom } from '../../lib/store';
import { atom, useAtom } from 'jotai';
import { useMemo, useRef, useState } from 'react';
import { useEditorField } from '../rf/BaseNode';
import { ChevronUp } from 'lucide-react';

const itemFuseAtom = atom(async get => new Fuse([...(await get(docsMappedAtom)).items.values()], { keys: ['displayName'] }));

interface ItemComboBoxProps {
  name?: string;
}

export default function ItemComboBox({ name = 'itemKey' }: ItemComboBoxProps) {
  const { setValue, currentValue } = useEditorField<string | undefined>(name, true);
  const dropdownRef = useRef<HTMLDetailsElement>(null);
  const [itemFuse] = useAtom(itemFuseAtom);
  const [docsMapped] = useAtom(docsMappedAtom);
  const [search, setSearch] = useState('');
  const filteredItems = useMemo(
    () => (search ? itemFuse.search(search).map(({ item }) => item) : Array.from(docsMapped.items.values())),
    [itemFuse, search],
  );

  const item = currentValue ? docsMapped.items.get(currentValue) : undefined;

  return (
    <details
      ref={dropdownRef}
      className='dropdown dropdown-end dropdown-top group w-full'
      onBlur={e => {
        if (!dropdownRef.current?.contains(e.relatedTarget as Node)) {
          dropdownRef.current?.removeAttribute('open');
        }
      }}
    >
      <summary className='btn btn-block btn-sm'>
        {item ? (
          <>
            {item.iconPath && <img src={'/extracted/' + item.iconPath} alt={item.displayName} className='mr-2 h-6 w-6' />}
            <span>{item.displayName}</span>
          </>
        ) : (
          'Select an item'
        )}
        <ChevronUp size={20} className='ml-auto transition-transform group-open:-rotate-180' strokeWidth={4} />
      </summary>
      <div className='dropdown-content rounded-box bg-base-200 z-10 w-72 p-2 shadow-lg'>
        <input
          type='search'
          placeholder='Search...'
          className='input input-sm input-bordered mb-1 w-full'
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <ul className='mt-1 h-48 w-full flex-nowrap overflow-y-scroll'>
          {filteredItems.map(({ key, iconPath, displayName }) => (
            <button
              key={key}
              type='button'
              className='btn btn-sm btn-block btn-ghost items-center justify-start'
              onClick={e => {
                e.preventDefault();
                setValue(key);
                dropdownRef.current?.removeAttribute('open');
              }}
            >
              {iconPath && <img src={'/extracted/' + iconPath} alt={displayName} className='mr-2 h-6 w-6' />}
              <span>{displayName}</span>
            </button>
          ))}
        </ul>
      </div>
    </details>
  );
}
