import Fuse from 'fuse.js';
import { docsMappedAtom } from '../../lib/store';
import { atom, useAtom } from 'jotai';
import { useMemo, useRef, useState } from 'react';
import { useEditorField } from '../rf/BaseNode';

const itemFuseAtom = atom(async get => new Fuse([...(await get(docsMappedAtom)).items.values()], { keys: ['displayName'] }));

interface ItemComboBoxProps {
  name?: string;
}

export default function ItemComboBox({ name = 'itemKey' }: ItemComboBoxProps) {
  const { setValue, currentValue } = useEditorField<string | undefined>(name);
  const dropdownRef = useRef<HTMLDetailsElement>(null);
  const [itemFuse] = useAtom(itemFuseAtom);
  const [docsMapped] = useAtom(docsMappedAtom);
  const [search, setSearch] = useState('');
  const filteredItems = useMemo(() => (search ? itemFuse.search(search).map(({ item }) => item) : Array.from(docsMapped.items.values())), [itemFuse, search]);

  const item = currentValue ? docsMapped.items.get(currentValue) : undefined;

  return (
    <details ref={dropdownRef} className='dropdown dropdown-top w-full'>
      <summary className='btn btn-sm btn-block'>
        {item ? (
          <>
            {item.iconPath && <img src={'/extracted/' + item.iconPath} alt={item.displayName} className='mr-2 h-6 w-6' />}
            <span>{item.displayName}</span>
          </>
        ) : (
          'Select an item'
        )}
      </summary>
      <div className='dropdown-content dropdown-right rounded-box bg-base-200 z-10 w-72 p-2 shadow-sm'>
        <input
          type='search'
          placeholder='Search...'
          className='input input-sm input-bordered mb-1 w-full'
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <ul className='menu menu-horizontal menu-sm h-48 w-full overflow-y-scroll'>
          {filteredItems.map(({ key, iconPath, displayName }) => (
            <li key={key}>
              <button
                type='button'
                className='btn btn-sm btn-block items-start justify-start'
                onClick={e => {
                  e.preventDefault();
                  setValue(key);
                }}
              >
                {iconPath && <img src={'/extracted/' + iconPath} alt={displayName} className='mr-2 h-6 w-6' />}
                <span>{displayName}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
