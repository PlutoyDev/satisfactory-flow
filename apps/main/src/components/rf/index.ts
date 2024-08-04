import { ComponentType } from 'react';
import { ItemNode, ItemNodeEditor } from './ItemNode';

export const customNodes = {
  item: ItemNode,
};

export const customNodeEditors = {
  item: ItemNodeEditor,
} as const satisfies Record<string, ComponentType<any>>;
