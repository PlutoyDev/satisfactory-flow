import { createContext, useContext, ReactNode } from 'react';
import { Edge, Node } from '@xyflow/react';

export type CreateSetValueOptions = {
  /** 
    If number is provided, will debounce the update by that amount of milliseconds

    If true, will debounce the update by 300 milliseconds
  */
  debounced?: number | boolean;
  /** If true, will disconnect the edge when updating the node */
  disconnectEdges?: boolean;
  /** 
    If true, will recalculate the node and its related nodes
    @default true
  */
  recaclulate?: boolean;
};

interface EditorFormContextValue {
  getValue: (name?: string) => any;
  createSetValue: (name: string | undefined, opts?: CreateSetValueOptions) => (updateOrUpdater: any | ((prev: any) => any)) => void;
  selectedType: 'node' | 'edge';
  nodeOrEdge: Node | Edge;
}

const EditorFormContext = createContext<EditorFormContextValue | null>(null);

export function useEditorField<D>(name: string, opts: CreateSetValueOptions = {}) {
  const ctx = useContext(EditorFormContext);
  if (!ctx) {
    throw new Error('useEditorField must be used inside FactoryNodeEditorWrapper');
  }
  opts.recaclulate ??= true;
  const currentValue = ctx.getValue(name as string) as D;
  const setValue = ctx.createSetValue(name as string, opts) as (updateOrUpdater: D | ((prev: D) => D)) => void;
  return { currentValue, setValue, selectedType: ctx.selectedType, nodeOrEdge: ctx.nodeOrEdge };
}

export interface FactoryNodeEditorChildProps<V = Record<string, unknown>> {
  setValue: <K extends keyof V | undefined>(name: K, value: K extends keyof V ? V[K] : V) => void;
  currentValue: V;
}

export interface FactoryNodeEditorWrapperProps {
  children: ReactNode;
}

export interface FactoryEditorContextProviderProps extends EditorFormContextValue {
  children: ReactNode;
}

export function FactoryEditorContextProvider({ children, ...providerProps }: FactoryEditorContextProviderProps) {
  return <EditorFormContext.Provider value={providerProps}>{children}</EditorFormContext.Provider>;
}
