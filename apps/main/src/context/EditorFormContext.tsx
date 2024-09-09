import { createContext, useContext, ReactNode } from 'react';
import { Edge, Node } from '@xyflow/react';

interface EditorFormContextValue {
  getValue: (name?: string) => any;
  createSetValue: (name: string | undefined, debounceMs?: number) => (updateOrUpdater: any | ((prev: any) => any)) => void;
  selectedType: 'node' | 'edge';
  nodeOrEdge: Node | Edge;
}

const EditorFormContext = createContext<EditorFormContextValue | null>(null);

export function useEditorField<D>(name: string, debounceMs: boolean | number = 0) {
  const ctx = useContext(EditorFormContext);
  if (!ctx) {
    throw new Error('useEditorField must be used inside FactoryNodeEditorWrapper');
  }
  const currentValue = ctx.getValue(name as string) as D;
  const debouceMsV = typeof debounceMs === 'number' ? debounceMs : debounceMs ? 100 : 0;
  const setValue = ctx.createSetValue(name as string, debouceMsV) as (updateOrUpdater: D | ((prev: D) => D)) => void;
  return { currentValue, setValue, selectedType: ctx.selectedType, nodeOrEdge: ctx.nodeOrEdge };
}

export function useEditor<D>(debounceMs: boolean | number = 0) {
  const ctx = useContext(EditorFormContext);
  if (!ctx) {
    throw new Error('useEditor must be used inside FactoryNodeEditorWrapper');
  }
  const currentValue = ctx.getValue() as D;
  const debouceMsV = typeof debounceMs === 'number' ? debounceMs : debounceMs ? 100 : 0;
  const setValue = ctx.createSetValue(undefined, debouceMsV) as (updateOrUpdater: Partial<D> | ((prev: D) => D)) => void;
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
