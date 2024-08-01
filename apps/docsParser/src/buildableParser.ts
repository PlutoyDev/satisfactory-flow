import type { ProductionMachine, Recipe } from './types.js';

// Will be parsed by recipeParser.ts
const productionMachines = [
  'OilRefinery_C',
  'FoundryMk1_C',
  'Packager_C',
  'Blender_C',
  'ManufacturerMk1_C',
  'AssemblerMk1_C',
  'SmelterMk1_C',
  'ConstructorMk1_C',
  'HadronCollider_C',
];

const resourceExtractorMachines = ['WaterPump_C', 'OilPump_C', 'MinerMk2_C', 'MinerMk3_C', 'MinerMk1_C'];

export const productionMachineAsDescClassNames = productionMachines.map(machine => 'Desc_' + machine);
const productionMachineAsBuildClassNames = productionMachines.map(machine => 'Build_' + machine);

export const productionMachineRecipe: Record<string, Recipe> = {};

const mapperObject = {
  ClassName: {
    into: 'key',
  },
  mDisplayName: {
    into: 'displayName',
  },
  mPowerConsumption: {
    into: 'powerConsumption',
    transform: (i: string) => parseFloat(i),
  },
  mEstimatedMaximumPowerConsumption: {
    into: 'maxPowerConsumption',
    transform: (i: string) => parseFloat(i),
  },
} satisfies Record<string, { into: keyof ProductionMachine; transform?: (i: any) => any }>;

export function parseProductionMachine(buildableArr: Record<string, unknown>[]) {
  return buildableArr.reduce(
    (acc, buildable) => {
      const key = buildable['ClassName'] as string;
      if (!key) return acc;
      // I only want to parse for production machines
      if (!productionMachineAsBuildClassNames.includes(key)) return acc;

      const descClassName = key.replace('Build_', 'Desc_');

      const parsedBuildable = {
        ingredients: productionMachineRecipe[descClassName].ingredients,
      } as ProductionMachine;

      for (const [key, value] of Object.entries(buildable)) {
        const mapper = mapperObject[key as keyof typeof mapperObject];
        if (!mapper) {
          continue;
        }

        if ('transform' in mapper) {
          // @ts-ignore
          parsedBuildable[mapper.into] = mapper.transform(value as string);
        } else {
          // @ts-ignore
          parsedBuildable[mapper.into] = value;
        }
      }

      acc[key] = parsedBuildable;
      return acc;
    },
    {} as Record<string, ProductionMachine>,
  ) as Record<string, ProductionMachine>;
}
