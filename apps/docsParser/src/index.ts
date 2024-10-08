import { readFile, writeFile, mkdir, stat, rm } from 'fs/promises';
import path from 'path';
import { argv } from 'process';
import sharp from 'sharp';
import { parseProductionMachine, presetProductionMachineIcons } from './buildableParser.js';
import { parsePowerGenerator } from './generatorParser.js';
import { parseItem } from './itemParser.js';
import { parseRecipe } from './recipeParser.js';
import { ParsedOutput, ParsedOutputObjects } from './types.js';

const cwd = process.cwd();
// In case I forget to run the script from the correct directory
const projectRoot = cwd.endsWith('docsParser') ? path.join(cwd, '../../') : cwd;
const extractedDirPath = path.join(projectRoot, 'extracted');

await stat(extractedDirPath).catch(() => {
  console.error('Unable to find "extracted" directory');
  process.exit(1);
});

const outputDirPath = path.join(projectRoot, 'out');
await rm(outputDirPath, { recursive: true })
  .catch(() => {})
  .then(() => mkdir(outputDirPath, { recursive: true }));

const docsDotJsonPath = path.join(extractedDirPath, 'Docs.json');
// json stored as UTF-16 LE
const json = await readFile(docsDotJsonPath).catch(() => {
  console.error('Unable to read "Docs.json" file');
  process.exit(1);
});

const decoder = new TextDecoder('utf-16le');
const jsonStr = decoder.decode(json); // convert to utf-8
const docs = JSON.parse(jsonStr);

if (!docs || !Array.isArray(docs)) {
  throw new Error(`Invalid docs file: ${docsDotJsonPath}`);
}

const nativeClassRegex = /FactoryGame\.(.*)'/; //Sample: ///Script/CoreUObject.Class'/Script/FactoryGame.FGItemDescriptor'

const objectResult: ParsedOutputObjects = {
  items: {},
  recipes: {},
  productionMachines: {},
  generators: {},
};

const itemClassNames = [
  'FGItemDescriptor',
  'FGItemDescriptorBiomass',
  'FGItemDescriptorNuclearFuel',
  'FGResourceDescriptor',
  'FGEquipmentDescriptor',
  'FGConsumableDescriptor',
  'FGAmmoTypeProjectile',
  'FGAmmoTypeSpreadshot',
  'FGAmmoTypeInstantHit',
];

const classesList: { nativeClass: string; classes: string[] }[] = [];

for (const doc of docs) {
  const nc = doc['NativeClass'];
  if (!nc) {
    continue;
  }
  const match = nc.match(nativeClassRegex);
  if (!match) {
    continue;
  }
  const className = match[1];
  if (itemClassNames.includes(className)) {
    objectResult.items = Object.assign(objectResult.items, parseItem(doc.Classes));
  } else if (className === 'FGRecipe') {
    objectResult.recipes = parseRecipe(doc.Classes);
  } else if (className === 'FGBuildingDescriptor') {
    presetProductionMachineIcons(doc.Classes);
  } else if (
    ['FGBuildableManufacturer', 'FGBuildableManufacturerVariablePower', 'FGBuildableResourceExtractor', 'FGBuildableWaterPump'].includes(
      className,
    )
  ) {
    objectResult.productionMachines = Object.assign(objectResult.productionMachines, parseProductionMachine(doc.Classes));
  } else if (className === 'FGBuildableGeneratorFuel' || className === 'FGBuildableGeneratorNuclear') {
    objectResult.generators = Object.assign(objectResult.generators, parsePowerGenerator(doc.Classes));
  }

  classesList.push({
    nativeClass: className,
    classes: doc.Classes.map(({ ClassName }: Record<string, unknown>) => ClassName),
  });
}

function sortRecipes(recipeIds: string[]) {
  return recipeIds.sort((a, b) => {
    const recipeA = objectResult.recipes[a];
    const recipeB = objectResult.recipes[b];
    // Sort by isAlternate, then by ingredients length, then by products length, then by recipe name
    if (recipeA.displayName.startsWith('Alternate') && !recipeB.displayName.startsWith('Alternate')) {
      return 1;
    } else if (!recipeA.displayName.startsWith('Alternate') && recipeB.displayName.startsWith('Alternate')) {
      return -1;
    } else if (recipeA.ingredients.length < recipeB.ingredients.length) {
      return -1;
    } else if (recipeA.ingredients.length > recipeB.ingredients.length) {
      return 1;
    } else if (recipeA.products.length < recipeB.products.length) {
      return -1;
    } else if (recipeA.products.length > recipeB.products.length) {
      return 1;
    } else {
      return recipeA.displayName.localeCompare(recipeB.displayName);
    }
  });
}

// PostProcess
// Add recipeKeys to items and resources
for (const item of Object.values(objectResult.items)) {
  const productOf: string[] = [];
  const ingredientOf: string[] = [];
  for (const [recipeKey, { ingredients, products }] of Object.entries(objectResult.recipes)) {
    if (products?.some(product => product.itemKey === item.key)) {
      productOf.push(recipeKey);
    }
    if (ingredients?.some(ingredient => ingredient.itemKey === item.key)) {
      ingredientOf.push(recipeKey);
    }
  }

  if (productOf.length > 0) {
    item.productOf = sortRecipes(productOf);
  }

  if (ingredientOf.length > 0) {
    item.ingredientOf = sortRecipes(ingredientOf);
  }

  if (productOf.length === 0 && ingredientOf.length === 0) {
    console.warn(`Warning: Item ${item.key} has no recipes that use / produce it`);
  }
}

for (const recipe of Object.values(objectResult.recipes)) {
  // Check if the recipe ingredients/products are in the items list
  if (recipe.ingredients) {
    for (const ingredient of recipe.ingredients) {
      if (!objectResult.items[ingredient.itemKey]) {
        console.error(`Missing item for recipe ingredient: ${ingredient.itemKey}`);
      }
    }
  }

  if (recipe.products) {
    for (const product of recipe.products) {
      if (!objectResult.items[product.itemKey]) {
        console.error(`Missing item for recipe product: ${product.itemKey}`);
      }
    }
  }
}

// Handle image conversion of items
await mkdir(path.join(outputDirPath, 'icons'), { recursive: true });
const promises: Promise<any>[] = [];
async function convertImage(subpath: string) {
  const originalPath = path.join(extractedDirPath, `${subpath}.png`);
  try {
    await stat(originalPath);
    const newName = subpath.split('/').pop()?.replace('IconDesc_', '').split('_').slice(0, -1).join('_');
    const newPath = path.join(outputDirPath, 'icons', `${newName}.webp`);
    // Use sharp to convert to webp
    await sharp(originalPath).resize({ width: 64, height: 64 }).webp({ force: true, effort: 6 }).toFile(newPath);
    return newPath.substring(outputDirPath.length + 1);
  } catch (e) {
    // @ts-ignore
    if (e && typeof e === 'object' && e.code === 'ENOENT') {
      console.error("File doesn't exist", originalPath);
      return null;
    }
    throw e;
  }
}
// Item icons
for (const item of Object.values(objectResult.items)) {
  if (item.iconPath) {
    const subpath = item.iconPath.substring(28).split('.')[0];
    const pr = convertImage(subpath).then(newPath => (item.iconPath = newPath));
    promises.push(pr);
  } else {
    console.error('Missing icon for item:', item.key);
  }
}
// Production Machine Icon
for (const machine of Object.values(objectResult.productionMachines)) {
  if (machine.iconPath) {
    const subpath = machine.iconPath.substring(28).split('.')[0];
    const pr = convertImage(subpath).then(newPath => (machine.iconPath = newPath));
    promises.push(pr);
  } else {
    console.error('Missing icon for production machine:', machine.key);
  }
}

// Monochrome icons
const iconMap = {
  'TXUI_MIcon_SortRule_Any.png': 'RuleAny.webp',
  'TXUI_MIcon_Stop_X.png': 'None.webp',
  'TXUI_MIcon_SortRule_AnyUndefined.png': 'RuleUndef.webp',
  'TXUI_MIcon_SortRule_Overflow.png': 'RuleOverflow.webp',
};

for (const [key, value] of Object.entries(iconMap)) {
  const originalPath = path.join(extractedDirPath, './Interface/UI/Assets/MonochromeIcons', key);
  const pr = stat(originalPath)
    .then(async () => {
      const newPath = path.join(outputDirPath, 'icons', value);
      await sharp(originalPath).resize({ width: 64, height: 64 }).webp({ force: true, effort: 6 }).toFile(newPath);
    })
    .catch(() => {
      console.log("File doesn't exist", originalPath);
    });
  promises.push(pr);
}

await Promise.allSettled(promises);

// Sorting the results
// item by number of recipe uses and produce it
// recipes by isAlternate, then by ingredients length, then by products length
const entriesResult: ParsedOutput = {
  items: Object.entries(objectResult.items).sort((a, b) => {
    const aUses = (a[1].productOf?.length ?? 0) + (a[1].ingredientOf?.length ?? 0);
    const bUses = (b[1].productOf?.length ?? 0) + (b[1].ingredientOf?.length ?? 0);
    return bUses - aUses;
  }),
  recipes: Object.entries(objectResult.recipes).sort((a, b) => {
    const aIsAlt = a[1].displayName.startsWith('Alternate');
    const bIsAlt = b[1].displayName.startsWith('Alternate');
    if (a[1].ingredients.length !== b[1].ingredients.length) return a[1].ingredients.length - b[1].ingredients.length;
    else if (a[1].products.length !== b[1].products.length) return a[1].products.length - b[1].products.length;
    else if (aIsAlt !== bIsAlt) return aIsAlt ? -1 : 1;
    else return 0;
  }),
  productionMachines: Object.entries(objectResult.productionMachines),
  generators: Object.entries(objectResult.generators),
};

const outputPath = path.join(outputDirPath, 'parsedDocs.json');
await writeFile(outputPath, JSON.stringify(entriesResult));

// non-minified version
if (argv.includes('--pretty') || argv.includes('-p')) {
  const outputPathPretty = path.join(outputDirPath, 'parsedDocsPretty.json');
  await writeFile(outputPathPretty, JSON.stringify(entriesResult, null, 2));
}
