import type { transformFuel } from './generatorParser.js';

// Export interfaces of the parsed

export interface Recipe {
  key: string;
  displayName: string;
  /** Duration in seconds */
  manufactoringDuration: number;
  ingredients: { itemKey: string; amount: number }[];
  products: { itemKey: string; amount: number }[];
  producedIn: string;
}

export interface ProductionMachine {
  key: string;
  displayName: string;
  /** Power in MW */
  powerConsumption: number;
  /** Power in MW */
  maxPowerConsumption: number;
  ingredients: { itemKey: string; amount: number }[];
}

export interface Item {
  key: string;
  displayName: string;
  description: string;
  abbreviatedDisplayName: string;
  stackSize: number;
  sinkPoints: number;
  energyValue: number;
  form: 'solid' | 'liquid' | 'gas' | null;
  productOf?: string[];
  ingredientOf?: string[];
  iconPath: string | null;
}

export interface PowerGenerators {
  key: string;
  displayName: string;
  description: string;
  powerProduction: number;
  fuel: ReturnType<typeof transformFuel>; // Circular imports are allowed for type only imports
}

export interface ParsedOutput {
  recipes: Record<string, Recipe>;
  productionMachines: Record<string, ProductionMachine>;
  items: Record<string, Item>;
  generators: Record<string, PowerGenerators>;
}
