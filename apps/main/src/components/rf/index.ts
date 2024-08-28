import { ComponentType } from 'react';
import BeltOrPipe from './BeltOrPipe';
import { ItemNode, ItemNodeEditor } from './ItemNode';
import { LogisticNode, LogisticNodeEditor } from './LogisticNode';
import { RecipeNode, RecipeNodeEditor } from './RecipeNode';
import { SinkNode, SinkNodeEditor } from './SinkNode';

export const customNodes = {
  item: ItemNode,
  recipe: RecipeNode,
  logistic: LogisticNode,
  sink: SinkNode,
} as const satisfies Record<string, ComponentType<any>>;

export const customNodeEditors = {
  item: ItemNodeEditor,
  recipe: RecipeNodeEditor,
  logistic: LogisticNodeEditor,
  sink: SinkNodeEditor,
} as const satisfies Record<string, ComponentType<any>>;

export const customEdges = {
  belt: BeltOrPipe,
  pipe: BeltOrPipe,
};
