import { Fragment, useMemo, useRef, useState } from 'react';
import type { Recipe } from 'docs-parser';
import Fuse from 'fuse.js';
import { atom, useAtom } from 'jotai';
import { ArrowRight, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronUp } from 'lucide-react';
import { DocsMapped, docsMappedAtom } from '../../lib/store';
import { useEditorField } from '../rf/BaseNode';

const recipeFuseAtom = atom(
  async get =>
    new Fuse([...(await get(docsMappedAtom)).recipes.values()], { keys: ['displayName', 'producedIn', 'ingredients', 'products'] }),
);

interface RecipeComboBoxProps {
  name?: string;
}

function RecipeDisplay({ recipe, docsMapped }: { recipe: Recipe; docsMapped: DocsMapped }) {
  const itemAmts = recipe ? [...recipe.ingredients, ...recipe.products] : [];
  const ingredientCount = recipe ? recipe.ingredients.length : 0;
  const items = itemAmts.map(({ itemKey }) => docsMapped.items.get(itemKey));

  return (
    <>
      <span className='flex-1 text-left'>{recipe?.displayName}</span>
      <div className='flex flex-nowrap gap-x-0.5'>
        {items.map((item, i) => (
          <Fragment key={i}>
            {i === ingredientCount && <ArrowRight size={24} />}
            <img src={'/extracted/' + item?.iconPath} alt={item?.displayName} className='h-6 w-6' />
          </Fragment>
        ))}
      </div>
    </>
  );
}

export default function RecipeComboBox({ name = 'recipeKey' }: RecipeComboBoxProps) {
  const { setValue, currentValue } = useEditorField<string | undefined>(name, true);
  const dropdownRef = useRef<HTMLDetailsElement>(null);
  const [recipeFuse] = useAtom(recipeFuseAtom);
  const [docsMapped] = useAtom(docsMappedAtom);
  const [search, setSearch] = useState('');
  const filteredRecipes = useMemo(
    () => (search ? recipeFuse.search(search).map(({ item }) => item) : Array.from(docsMapped.recipes.values())),
    [recipeFuse, search],
  );
  const [recipePage, setRecipePage] = useState(0);

  const recipe = currentValue ? docsMapped.recipes.get(currentValue) : undefined;

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
        {recipe ? <RecipeDisplay recipe={recipe} docsMapped={docsMapped} /> : 'Select a recipe'}
        <ChevronUp size={20} className='ml-auto transition-transform group-open:-rotate-180' strokeWidth={4} />
      </summary>
      <div className='dropdown-content rounded-box bg-base-200 z-10 w-[30rem] p-2 shadow-lg'>
        <input
          type='search'
          placeholder='Search...'
          className='input input-sm input-bordered mb-1 w-full'
          value={search}
          onChange={e => {
            setRecipePage(0);
            setSearch(e.target.value);
          }}
        />
        <ul className='mt-1 w-full flex-nowrap'>
          {filteredRecipes.slice(recipePage * 10, recipePage * 10 + 10).map(recipe => (
            <button
              key={recipe.key}
              type='button'
              className='btn btn-sm btn-block flex-nowrap justify-between text-start'
              onClick={() => {
                setValue(recipe.key);
                dropdownRef.current?.removeAttribute('open');
              }}
            >
              <RecipeDisplay recipe={recipe} docsMapped={docsMapped} />
            </button>
          ))}
          <div className='flex w-full justify-center gap-6'>
            <button className='btn btn-sm rounded-full' disabled={recipePage === 0} onClick={() => setRecipePage(0)}>
              <ChevronsLeft size={20} />
            </button>
            <button className='btn btn-sm rounded-full' disabled={recipePage === 0} onClick={() => setRecipePage(p => p - 1)}>
              <ChevronLeft size={20} />
            </button>

            <p>
              {recipePage + 1} / {Math.ceil(filteredRecipes.length / 10)}
            </p>
            <button
              className='btn btn-sm rounded-full'
              disabled={Math.floor(filteredRecipes.length / 10) === recipePage}
              onClick={() => setRecipePage(p => p + 1)}
            >
              <ChevronRight size={20} />
            </button>
            <button
              className='btn btn-sm rounded-full'
              disabled={Math.floor(filteredRecipes.length / 10) === recipePage}
              onClick={() => setRecipePage(Math.floor(filteredRecipes.length / 10))}
            >
              <ChevronsRight size={20} />
            </button>
          </div>
        </ul>
      </div>
    </details>
  );
}
