import { productionMachineAsDescClassNames, productionMachineRecipe } from './buildableParser.js';
import { Recipe } from './types.js';

const mapperObject = {
  ClassName: {
    into: 'key',
  },
  mDisplayName: {
    into: 'displayName',
  },
  mManufactoringDuration: {
    into: 'manufactoringDuration',
    transform: (i: string) => parseFloat(i),
  },
  mIngredients: {
    into: 'ingredients',
    transform: parseItemAmt,
  },
  mProduct: {
    into: 'products',
    transform: parseItemAmt,
  },
  mProducedIn: {
    into: 'producedIn',
    transform: parseProducedIn,
  },
} as const;

type MapperObject = typeof mapperObject;

export function parseRecipe(recipeArr: Record<string, unknown>[]) {
  return recipeArr.reduce((acc, recipe, i) => {
    const producedIn = recipe['mProducedIn'] as string;

    if (!producedIn) return acc;

    const parsedRecipe = {} as Recipe;

    for (const [key, value] of Object.entries(recipe)) {
      const mapper = mapperObject[key as keyof MapperObject];
      if (!mapper) {
        continue;
      }

      if ('transform' in mapper) {
        // @ts-ignore
        parsedRecipe[mapper.into] = mapper.transform(value as string);
      } else {
        parsedRecipe[mapper.into] = value as string;
      }
    }

    if (producedIn.includes('BuildGun')) {
      if (productionMachineAsDescClassNames.includes(parsedRecipe.products[0].itemKey)) {
        productionMachineRecipe[parsedRecipe.products[0].itemKey] = parsedRecipe;
      }
    } else if (parsedRecipe.producedIn) {
      acc[parsedRecipe.key] = parsedRecipe;
    }

    return acc;
  }, {}) as Record<string, Recipe>;
}

const itemAmtRegex = /ItemClass=(.*),Amount=(.*)/;

function parseItemAmt(itemAmts: string) {
  const cso = itemAmts.substring(1, itemAmts.length - 1);
  const arr = cso.split('),(');
  const parsedItemAmt: { itemKey: string; amount: number }[] = [];
  for (const i of arr) {
    const match = i.match(itemAmtRegex);
    if (!match) {
      console.log('No match');
      continue;
    }
    const itemClass = match[1];
    const itemKey = itemClass.substring(itemClass.lastIndexOf('.') + 1, itemClass.length - 2);
    const amount = parseInt(match[2]);
    parsedItemAmt.push({
      itemKey,
      amount,
    });
  }
  return parsedItemAmt;
}

function parseProducedIn(producedIns: string) {
  const csv = producedIns.substring(1, producedIns.length - 1);
  const producedIn = csv
    .split(',')
    .map(i => i.substring(i.lastIndexOf('.') + 1, i.length - 1))
    .filter(
      i =>
        !['BP_WorkshopComponent_C', 'BP_WorkBenchComponent_C', 'FGBuildableAutomatedWorkBench', 'Build_AutomatedWorkBench_C'].includes(i),
    );
  return producedIn[0];
}
