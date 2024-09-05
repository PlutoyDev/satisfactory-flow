import { test, expect } from 'vitest';
import { docsMapped } from './lib';

test('docsJson is mapped', () => {
  expect(docsMapped.recipes.size).toMatchInlineSnapshot(`226`)
  expect(docsMapped.productionMachines.size).toMatchInlineSnapshot(`9`);
  expect(docsMapped.items.size).toMatchInlineSnapshot(`147`);
  expect(docsMapped.generators.size).toMatchInlineSnapshot(`3`);
});
