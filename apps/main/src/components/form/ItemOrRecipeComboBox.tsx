// An overly complicated, over-powered Item / Recipe Combo Box
// Mainly for me to play around and learn xD (It's a flawed implementation)
import { KeyboardEvent, useCallback, useMemo, useRef, useState } from 'react';
import type { Recipe, Item } from 'docs-parser';
import Fuse, { FuseResult } from 'fuse.js';
import { useAtom } from 'jotai';
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronUp } from 'lucide-react';
import { DocsMapped, docsMappedAtom } from '../../lib/store';

type SimpleItem = Pick<Item, 'displayName' | 'iconPath' | 'key'>;
type ItemOrRecipe = SimpleItem | Recipe;

type ItemOrRecipeListItemProps = {
  data: FuseResult<ItemOrRecipe> | ItemOrRecipe;
  docsMapped: DocsMapped;
  selected: boolean;
  onClick: () => void;
};

function ItemOrRecipeListItem({ data, docsMapped, selected, onClick }: ItemOrRecipeListItemProps) {
  const listItem = 'item' in data ? data.item : data;
  const isRecipe = 'ingredients' in listItem;
  // const itemAmts = isRecipe ? [...(listItem as Recipe).ingredients, ...(listItem as Recipe).products] : [];
  // const ingredientCount = isRecipe ? (listItem as Recipe).ingredients.length : 0;
  // const items = itemAmts.map(({ itemKey }) => docsMapped.items.get(itemKey));

  return (
    <button
      role='bottom'
      data-selected={selected}
      className='btn btn-sm data-[selected=true]:btn-accent col-span-full w-full grid-cols-subgrid flex-nowrap justify-start'
      style={{ display: isRecipe ? 'grid' : 'flex' }}
    >
      {isRecipe ? (
        // <div className='flex flex-nowrap gap-x-0.5'>
        //   {items.map((item, i) => (
        //     <Fragment key={i}>
        //       {i === ingredientCount && <ArrowRight size={24} />}
        //       <img src={'/extracted/' + item?.iconPath} alt={item?.displayName} className='h-6 w-6' />
        //     </Fragment>
        //   ))}
        // </div>
        Array.from({ length: 7 }).map((_, i) => {
          if (i === 4) {
            return <ArrowRight key={i} size={24} className='col-start-5' />;
          }
          const itemKey = i < 4 ? (listItem as Recipe).ingredients[3 - i]?.itemKey : (listItem as Recipe).products[i - 5]?.itemKey;
          if (!itemKey) return <div key={i} style={{ gridColumnStart: i + 1 }} />;

          const item = docsMapped.items.get(itemKey);
          return (
            <img
              key={i}
              src={'/extracted/' + item?.iconPath}
              alt={item?.displayName}
              className='h-6 w-6'
              style={{ gridColumnStart: i + 1 }}
            />
          );
        })
      ) : (
        <img src={'/extracted/' + (listItem as SimpleItem).iconPath} alt={(listItem as SimpleItem).displayName} className='h-6 w-6' />
      )}
      <span className='col-start-8 flex-1 text-start'>{listItem.displayName}</span>
    </button>
  );
}

const PER_PAGE = 10;

const additionalItemAsRule = [
  { key: 'any', displayName: 'Any', iconPath: 'icons/RuleAny.webp' },
  { key: 'none', displayName: 'None', iconPath: 'icons/None.webp' },
  { key: 'anyUndefined', displayName: 'Any Undefined', iconPath: 'icons/RuleUndef.webp' },
  { key: 'overflow', displayName: 'Overflow', iconPath: 'icons/RuleOverflow.webp' },
];

type ItemOrRecipeComboBoxProps = {
  type: 'item' | 'recipe' | 'outputRule';
  placeholder?: string;
  defaultValue?: string;
  onSelect: (value: string) => void;
};

export default function ItemOrRecipeComboBox({ type, placeholder, defaultValue, onSelect }: ItemOrRecipeComboBoxProps) {
  const dataListType = type === 'recipe' ? 'recipe' : 'item';
  const [docsMapped] = useAtom(docsMappedAtom);
  // useState is used to prevent re-creation of the fullDataList and fuseInstance
  const [fullDataMap] = useState(() => {
    const dataMap: Map<string, ItemOrRecipe> = new Map();
    if (type === 'outputRule') {
      additionalItemAsRule.forEach(item => dataMap.set(item.key, item));
    }
    for (const [key, value] of docsMapped[`${dataListType}s`]) {
      dataMap.set(key, value);
    }
    return dataMap;
  });
  const [fuseInstance] = useState(
    () =>
      new Fuse<ItemOrRecipe>(
        Array.from(fullDataMap.values()),
        {
          keys: dataListType === 'recipe' ? ['displayName', 'producedIn', 'ingredients', 'products'] : ['displayName'],
          includeScore: true,
          includeMatches: true,
        },
        docsMapped[`${dataListType}FuseIndex`],
      ),
  );
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [searchText, setSearchText] = useState(() => {
    let value = defaultValue;
    if (!value) return '';
    if (type === 'outputRule' && !['any', 'none', 'anyUndefined', 'overflow'].includes(value as string)) {
      // remove prefix with 'item-' for outputRule
      value = value.slice(5);
    }
    const dispayName = fullDataMap.get(value)?.displayName;
    if (!dispayName) {
      console.error(`Could not find displayName for ${value}`);
      return '';
    } else {
      return dispayName;
    }
  });
  const searchResult = useMemo(() => (searchText ? fuseInstance.search(searchText) : []), [fuseInstance, searchText]);
  const displayList = useMemo(
    () => (searchText ? searchResult : Array.from(fullDataMap.values())),
    [fullDataMap, searchResult, searchText],
  );
  const [selectIndex, setSelectIndex] = useState(0);
  const page = Math.floor(selectIndex / PER_PAGE);
  // const bestMatch = searchResult[0].score < 0.1 ? searchResult[0] : undefined;

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
        // TODO: handle enter
      } else if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete' || e.key === ' ') {
        // letters, backspace, delete, space etc, focus search input
        inputRef.current?.focus();
      }
      if (newSelectIndex !== undefined) {
        setSelectIndex(newSelectIndex);
      }
    },
    [page, searchResult, selectIndex],
  );

  return (
    <div
      className='relative inline-block w-full'
      onKeyDown={onKeyPress}
      onFocus={e => (console.log(e), setIsOpen(true))}
      onBlur={console.log}
    >
      <label className='input input-sm input-bordered flex items-center gap-2'>
        <input
          className='flex-1'
          type='text'
          placeholder={placeholder}
          value={searchText}
          onChange={e => (setSearchText(e.target.value), setSelectIndex(0))}
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
          className='bg-base-200 rounded-box absolute bottom-full end-0 top-auto z-10 w-full origin-bottom grid-flow-col shadow-lg'
          style={{ width: type === 'recipe' ? '36rem' : '24rem' }}
        >
          <ul style={{ display: type === 'recipe' ? 'grid' : undefined, gridTemplateColumns: 'repeat(7, 2rem) 1fr' }}>
            {displayList.length === 0
              ? 'No result'
              : displayList.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE).map((data, i) => (
                  <ItemOrRecipeListItem
                    key={i}
                    data={data}
                    docsMapped={docsMapped}
                    selected={i === selectIndex % PER_PAGE}
                    onClick={() => {
                      console.log('clicked', data);
                    }}
                  />
                ))}
          </ul>
          <div className='flex w-full justify-center gap-6'>
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
