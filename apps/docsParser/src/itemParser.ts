import { mkdir } from 'fs/promises';
import { statSync } from 'fs';
import type { Item } from './types.js';

const eStackSize = {
  SS_ONE: 1,
  SS_SMALL: 50,
  SS_MEDIUM: 100,
  SS_BIG: 500,
  SS_HUGE: 1000,
  SS_FLUID: 1000,
} as const;

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
  mAbbreviatedDisplayName: {
    into: 'abbreviatedDisplayName',
  },
  mStackSize: {
    into: 'stackSize',
    transform: (i: string) => eStackSize[i as keyof typeof eStackSize],
  },
  mResourceSinkPoints: {
    into: 'sinkPoints',
    transform: (i: string) => parseInt(i),
  },
  mEnergyValue: {
    into: 'energyValue',
    transform: (i: string) => parseFloat(i),
  },
  mForm: {
    into: 'form',
    transform: (i: 'RF_SOLID' | 'RF_LIQUID' | 'RF_GAS') => ({ RF_SOLID: 'solid', RF_LIQUID: 'liquid', RF_GAS: 'gas' })[i] ?? null,
  },
  mPersistentBigIcon: {
    into: 'iconPath',
  },
} satisfies Record<string, { into: keyof Item; transform?: (i: any) => any }>;

const filterKey = [
  'Desc_HUBParts_C',
  'BP_EquipmentDescriptorShockShank_C',
  'BP_EquipmentDescriptorHoverPack_C',
  'BP_EquipmentDescriptorHazmatSuit_C',
  'BP_EquipmentDescriptorGasmask_C',
  'BP_EquipmentDescriptorJetPack_C',
  'BP_EquipmentDescriptorStunSpear_C',
  'Desc_Chainsaw_C',
  'BP_EquipmentDescriptorObjectScanner_C',
  'Desc_RebarGunProjectile_C',
  'BP_EquipmentDescriptorRifle_C',
  'BP_EquipmentDescriptorJumpingStilts_C',
  'BP_EqDescZipLine_C',
  'BP_EquipmentDescriptorNobeliskDetonator_C',
  'BP_EquipmentDescriptorCandyCane_C',
  'Desc_GolfCart_C',
  'Desc_GolfCartGold_C',
  'Desc_Nut_C',
  'Desc_Medkit_C',
  'Desc_Shroom_C',
  'Desc_Berry_C',
  'Desc_Parachute_C',
];

export function parseItem(itemArr: Record<string, unknown>[]) {
  mkdir('./public/satisfactory/icons', { recursive: true });

  return itemArr.reduce(
    (acc, item) => {
      const parsedItem = {} as Item;
      if (filterKey.includes(item.ClassName as string)) {
        return acc;
      }
      for (const [key, value] of Object.entries(item)) {
        const mapper = mapperObject[key as keyof typeof mapperObject];
        if (!mapper) {
          continue;
        }
        if ('transform' in mapper) {
          // @ts-ignore
          parsedItem[mapper.into] = mapper.transform(value as string);
        } else {
          // @ts-ignore
          parsedItem[mapper.into] = value as string;
        }
      }
      acc[parsedItem.key] = parsedItem;
      return acc;
    },
    {} as Record<string, Item>,
  );
}

export function parseResource(resourceArr: Record<string, unknown>[]) {
  return parseItem(resourceArr) as Record<string, Item>;
}
