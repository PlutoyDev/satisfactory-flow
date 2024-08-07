import { ComponentType } from 'react';
import { ItemNode, ItemNodeEditor } from './ItemNode';
import { RecipeNode, RecipeNodeEditor } from './RecipeNode';
import { LogisticNode, LogisticNodeEditor } from './LogisticNode';

export const customNodes = {
  item: ItemNode,
  recipe: RecipeNode,
  logistic: LogisticNode,
};

export const customNodeEditors = {
  item: ItemNodeEditor,
  recipe: RecipeNodeEditor,
  logistic: LogisticNodeEditor,
} as const satisfies Record<string, ComponentType<any>>;
