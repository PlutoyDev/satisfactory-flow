import { ComponentType } from 'react';
import { ItemNode, ItemNodeEditor } from './ItemNode';
import { RecipeNode, RecipeNodeEditor } from './RecipeNode';

export const customNodes = {
  item: ItemNode,
  recipe: RecipeNode,
};

export const customNodeEditors = {
  item: ItemNodeEditor,
  recipe: RecipeNodeEditor,
} as const satisfies Record<string, ComponentType<any>>;
