// An overly complicated, over-powered Item / Recipe Combo Box
// Mainly for me to play around and learn xD (It's a flawed implementation)
import { KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Recipe, Item } from 'docs-parser';
import Fuse, { FuseResult } from 'fuse.js';
import { useAtom } from 'jotai';
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronUp } from 'lucide-react';
import { LogisticSmartProRules } from '../../lib/data';
import { DocsMapped, docsMappedAtom } from '../../lib/store';

type SimpleItem = Pick<Item, 'displayName' | 'iconPath' | 'key'>;
type ItemOrRecipe = SimpleItem | Recipe;

type ItemOrRecipeListItemProps = {
  data: FuseResult<ItemOrRecipe> | ItemOrRecipe;
  docsMapped: DocsMapped;
  selected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
};

function ItemOrRecipeListItem({ data, docsMapped, selected, onClick, onMouseEnter }: ItemOrRecipeListItemProps) {
  const listItem = 'item' in data ? data.item : data;
  const isRecipe = 'ingredients' in listItem;
  const isAltRecipe = isRecipe && listItem.displayName.startsWith('Alternate');

  return (
    <button
      role='bottom'
      data-selected={selected}
      className='btn btn-sm data-[selected=true]:btn-accent group col-span-full w-full grid-cols-subgrid flex-nowrap justify-start text-start'
      style={{ display: isRecipe ? 'grid' : 'flex' }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
    >
      {isRecipe ? (
        Array.from({ length: 7 }).map((_, i) => {
          if (i === 4) {
            return <ArrowRight key={i} size={24} className='col-start-5' />;
          }
          const itemKey = i < 4 ? (listItem as Recipe).ingredients[3 - i]?.itemKey : (listItem as Recipe).products[i - 5]?.itemKey;
          if (!itemKey) return null;

          const item = docsMapped.items.get(itemKey);
          return (
            <img
              key={i}
              src={'/extracted/' + item?.iconPath}
              alt={item?.displayName}
              className='size-6'
              style={{ gridColumnStart: i + 1 }}
            />
          );
        })
      ) : (
        <img src={'/extracted/' + (listItem as SimpleItem).iconPath} alt={(listItem as SimpleItem).displayName} className='h-6 w-6' />
      )}

      {isAltRecipe ? (
        <>
          <p className='col-start-8'>{listItem.displayName.slice(11)}</p>
          <span
            className='border-accent text-accent text-bold tooltip tooltip-left ml-2 rounded-sm border px-0.5 group-data-[selected=true]:text-black'
            data-tip='Alternate'
          >
            A
          </span>
        </>
      ) : (
        <p className='col-start-8'>{listItem.displayName}</p>
      )}
    </button>
  );
}

const PER_PAGE = 10;

export const ADDITIONAL_OUTPUT_RULE = {
  any: { key: 'any', displayName: 'Any', iconPath: 'icons/RuleAny.webp' },
  none: { key: 'none', displayName: 'None', iconPath: 'icons/None.webp' },
  anyUndefined: { key: 'anyUndefined', displayName: 'Any Undefined', iconPath: 'icons/RuleUndef.webp' },
  overflow: { key: 'overflow', displayName: 'Overflow', iconPath: 'icons/RuleOverflow.webp' },
} as const satisfies Record<LogisticSmartProRules, SimpleItem>;

type ItemOrRecipeComboBoxProps = {
  type: 'item' | 'recipe' | 'outputRule';
  placeholder?: string;
  defaultKey?: string;
  onKeySelected: (key: string) => void;
};

export default function ItemOrRecipeComboBox({ type, placeholder, defaultKey, onKeySelected }: ItemOrRecipeComboBoxProps) {
  const dataListType = type === 'recipe' ? 'recipe' : 'item';
  const [docsMapped] = useAtom(docsMappedAtom);
  // useState is used to prevent re-creation of the fullDataList and fuseInstance
  const [fullDataMap] = useState(() => {
    const dataMap: Map<string, ItemOrRecipe> = new Map();
    if (type === 'outputRule') {
      for (const [key, value] of Object.entries(ADDITIONAL_OUTPUT_RULE)) {
        dataMap.set(key, value);
      }
      for (const [key, value] of docsMapped.items) {
        if (value.form === 'solid') dataMap.set(key, value);
      }
    } else {
      for (const [key, value] of docsMapped[`${dataListType}s`]) {
        dataMap.set(key, value);
      }
    }
    return dataMap;
  });
  const [fuseInstance] = useState(
    () =>
      new Fuse<ItemOrRecipe>(Array.from(fullDataMap.values()), {
        keys: dataListType === 'recipe' ? ['displayName', 'producedIn', 'ingredients', 'products'] : ['displayName'],
        includeScore: true,
        includeMatches: true,
      }),
  );
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [displayText, setDisplayText] = useState(() => {
    let value = defaultKey;
    if (!value) return '';
    const data = fullDataMap.get(value);
    if (data) return data.displayName;
    console.error('Invalid default value:', value);
    return '';
  });
  const [searchText, setSearchText] = useState('');
  const searchResult = useMemo(() => (searchText ? fuseInstance.search(searchText) : []), [fuseInstance, searchText]);
  const displayList = useMemo(
    () => (searchText ? searchResult : Array.from(fullDataMap.values())),
    [fullDataMap, searchResult, searchText],
  );
  const [selectIndex, setSelectIndex] = useState(0);
  const page = Math.floor(selectIndex / PER_PAGE);

  useEffect(() => {
    let value = defaultKey;
    if (!value) return;
    const data = fullDataMap.get(value);
    if (data) return setDisplayText(data.displayName);
    console.error('Invalid default value:', value);
  }, [defaultKey]);

  const setValue = useCallback(
    (key?: string) => {
      if (!key) {
        const data = displayList[selectIndex];
        key = 'item' in data ? data.item.key : data.key;
      }
      if (!fullDataMap.has(key)) {
        console.error('Invalid key:', key);
        return;
      }
      onKeySelected(key); // Callback to parent
      setDisplayText(fullDataMap.get(key)?.displayName || '');
      setSearchText('');
      setIsOpen(false);
    },
    [displayList, fullDataMap, onKeySelected, selectIndex],
  );

  const onKeyPress = useCallback(
    (e: KeyboardEvent) => {
      let newSelectIndex: number | undefined;
      const isFocusInput = document.activeElement === inputRef.current;
      if (e.key === 'ArrowDown') {
        newSelectIndex = Math.min(selectIndex + 1, displayList.length - 1);
      } else if (e.key === 'ArrowUp') {
        newSelectIndex = Math.max(selectIndex - 1, 0);
      } else if (e.key === 'ArrowLeft' && !isFocusInput) {
        newSelectIndex = Math.max(selectIndex - PER_PAGE, 0);
      } else if (e.key === 'ArrowRight' && !isFocusInput) {
        newSelectIndex = Math.min(selectIndex + PER_PAGE, displayList.length - 1);
      } else if (e.key === 'Enter') {
        setValue(); // Get from selectIndex
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      } else if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete' || e.key === ' ') {
        // letters, backspace, delete, space etc, focus search input
        inputRef.current?.focus();
      }
      if (newSelectIndex !== undefined) {
        setSelectIndex(newSelectIndex);
        const selected = displayList[newSelectIndex];
        setDisplayText('item' in selected ? selected.item.displayName : selected.displayName);
      }
    },
    [page, searchResult, selectIndex],
  );

  return (
    <div className='relative inline-block w-full' onKeyDown={onKeyPress} onBlur={console.log}>
      <label className='input input-sm input-bordered flex items-center gap-2'>
        <input
          className='flex-1'
          type='text'
          placeholder={placeholder}
          value={displayText ? displayText : searchText}
          onChange={e => {
            setSearchText(e.target.value);
            setSelectIndex(0);
            setDisplayText('');
          }}
          onFocus={e => {
            // When the input is focused, and its the displayText, select all
            if (e.target.value === displayText) e.target.select();
          }}
          onClick={() => setIsOpen(p => !p)}
          ref={inputRef}
        />
        {type === 'outputRule' ? (
          <ChevronDown className='transition-transform data-[open=true]:rotate-180' data-open={isOpen} />
        ) : (
          <ChevronUp className='transition-transform data-[open=true]:rotate-180' data-open={isOpen} />
        )}
      </label>
      {isOpen && (
        <div
          className='bg-base-200 rounded-box absolute end-0 z-10 grid-flow-col shadow-lg'
          style={
            type === 'outputRule'
              ? {
                  top: '100%',
                  bottom: 'auto',
                  transformOrigin: 'top',
                }
              : {
                  top: 'auto',
                  bottom: '100%',
                  transformOrigin: 'bottom',
                }
          }
        >
          <ul
            className='w-80'
            style={
              type === 'recipe' ? { display: 'grid', gridTemplateColumns: 'repeat(7, auto) 1fr min-content', width: '36rem' } : undefined
            }
            onWheel={e => {
              if (e.deltaY < 0) setSelectIndex(p => Math.max(p - PER_PAGE, 0));
              else setSelectIndex(p => Math.min(p + PER_PAGE, displayList.length - 1));
            }}
          >
            {displayList.length === 0
              ? 'No result'
              : displayList.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE).map((data, i) => (
                  <ItemOrRecipeListItem
                    key={i}
                    data={data}
                    docsMapped={docsMapped}
                    selected={i === selectIndex % PER_PAGE}
                    onClick={() => setValue('item' in data ? data.item.key : data.key)}
                    onMouseEnter={() => {
                      setSelectIndex(page * PER_PAGE + i);
                      setDisplayText('item' in data ? data.item.displayName : data.displayName);
                    }}
                  />
                ))}
          </ul>
          <div className='flex w-full justify-center gap-2'>
            <button className='btn btn-sm rounded-full' disabled={page === 0} onClick={() => setSelectIndex(0)}>
              <ChevronsLeft size={20} />
            </button>
            <button className='btn btn-sm rounded-full' disabled={page === 0} onClick={() => setSelectIndex(p => p - PER_PAGE)}>
              <ChevronLeft size={20} />
            </button>
            <p>
              {page + 1} / {Math.ceil(displayList.length / PER_PAGE)}
            </p>
            <button
              className='btn btn-sm rounded-full'
              disabled={Math.floor(displayList.length / PER_PAGE) === page}
              onClick={() => setSelectIndex(p => p + PER_PAGE)}
            >
              <ChevronRight size={20} />
            </button>
            <button
              className='btn btn-sm rounded-full'
              disabled={Math.floor(displayList.length / PER_PAGE) === page}
              onClick={() => setSelectIndex(Math.floor(displayList.length / PER_PAGE) * PER_PAGE)}
            >
              <ChevronsRight size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
