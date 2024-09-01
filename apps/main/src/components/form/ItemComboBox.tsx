import { useMemo, useRef, useState } from 'react';
import Fuse from 'fuse.js';
import { atom, useAtom } from 'jotai';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronUp } from 'lucide-react';
import { docsMappedAtom } from '../../lib/store';
import { useEditorField } from '../rf/BaseNode';

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
  const [itemPage, setItemPage] = useState(0);

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
      <div className='dropdown-content rounded-box bg-base-200 z-10 w-80 p-2 shadow-lg'>
        <input
          type='search'
          placeholder='Search...'
          className='input input-sm input-bordered mb-1 w-full'
          value={search}
          onChange={e => {
            setItemPage(0);
            setSearch(e.target.value);
          }}
        />
        <ul className='mt-1 w-full flex-nowrap'>
          {/* {filteredItems.map(({ key, iconPath, displayName }) => (
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
          ))} */}
          {filteredItems.slice(itemPage * 10, itemPage * 10 + 10).map(item => (
            <button
              key={item.key}
              type='button'
              className='btn btn-sm btn-block btn-ghost items-center justify-start'
              onClick={() => {
                setValue(item.key);
                dropdownRef.current?.removeAttribute('open');
              }}
            >
              {item.iconPath && <img src={'/extracted/' + item.iconPath} alt={item.displayName} className='mr-2 h-6 w-6' />}
              <span>{item.displayName}</span>
            </button>
          ))}

          <div className='flex w-full justify-center gap-2'>
            <button className='btn btn-sm rounded-full' disabled={itemPage === 0} onClick={() => setItemPage(0)}>
              <ChevronsLeft size={20} />
            </button>
            <button className='btn btn-sm rounded-full' disabled={itemPage === 0} onClick={() => setItemPage(p => p - 1)}>
              <ChevronLeft size={20} />
            </button>

            <p>
              {itemPage + 1} / {Math.ceil(filteredItems.length / 10)}
            </p>

            <button
              className='btn btn-sm rounded-full'
              disabled={Math.floor(filteredItems.length / 10) === itemPage}
              onClick={() => setItemPage(p => p + 1)}
            >
              <ChevronRight size={20} />
            </button>
            <button
              className='btn btn-sm rounded-full'
              disabled={Math.floor(filteredItems.length / 10) === itemPage}
              onClick={() => setItemPage(Math.floor(filteredItems.length / 10))}
            >
              <ChevronsRight size={20} />
            </button>
          </div>
        </ul>
      </div>
    </details>
  );
}
