import { ParsedOutput } from 'docs-parser';
import { readFile } from 'fs/promises';

const docsJson = JSON.parse(await readFile('public/extracted/parsedDocs.json', 'utf-8')) as ParsedOutput;
export const docsMapped = {
  recipes: new Map(docsJson.recipes),
  productionMachines: new Map(docsJson.productionMachines),
  items: new Map(docsJson.items),
  generators: new Map(docsJson.generators),
};
