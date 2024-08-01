import type { PowerGenerators } from './types.js';

export const transformFuel = (
  arr: {
    mFuelClass: string;
    mSupplementalResourceClass: string;
    mByproduct: string;
    mByproductAmount: string;
  }[],
) =>
  arr.map(
    ({
      mFuelClass: fuelClass,
      mSupplementalResourceClass: supplementalResourceClass,
      mByproduct: byproductClass,
      mByproductAmount: byproductAmount,
    }) =>
      byproductClass
        ? {
            fuelClass,
            supplementalResourceClass,
            byproductClass,
            byproductAmount: parseFloat(byproductAmount),
          }
        : {
            fuelClass,
            supplementalResourceClass,
          },
  );

const mapperObject = {
  ClassName: {
    into: 'key',
  },
  mDisplayName: {
    into: 'displayName',
  },
  mDescription: {
    into: 'description',
  },
  mPowerProduction: {
    into: 'powerProduction',
    transform: (i: string) => parseFloat(i),
  },
  mFuel: {
    into: 'fuel',
    transform: transformFuel,
  },
};

export function parsePowerGenerator(powerGeneratorArr: Record<string, unknown>[]) {
  return powerGeneratorArr.reduce(
    (acc, powerGenerator) => {
      const parsedPowerGenerator = {} as PowerGenerators;
      if (powerGenerator['ClassName'] === 'Build_GeneratorBiomass_C') {
        return acc;
      }
      for (const [key, value] of Object.entries(powerGenerator)) {
        const mapper = mapperObject[key as keyof typeof mapperObject];
        if (!mapper) {
          continue;
        }
        if ('transform' in mapper) {
          // @ts-ignore
          parsedPowerGenerator[mapper.into] = mapper.transform(value as string);
        } else {
          // @ts-ignore
          parsedPowerGenerator[mapper.into] = value as string;
        }
      }
      acc[parsedPowerGenerator.key] = parsedPowerGenerator;
      return acc;
    },
    {} as Record<string, PowerGenerators>,
  ) as Record<string, PowerGenerators>;
}
