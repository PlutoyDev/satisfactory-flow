import { useState } from 'react';
import { useAtom } from 'jotai';
import { FactoryInterfaceDir } from '../../engines/compute';
import { FactoryLogisticNodeData, LogisticSmartProRules, LogisticType } from '../../engines/data';
import { docsMappedAtom } from '../../lib/store';
import { useEditorField } from '../rf/BaseNode';

type ExcludedItemRules = Exclude<LogisticSmartProRules, `item-${string}`>;

const ruleText = {
  any: 'Any',
  none: 'None',
  anyUndefined: 'Any Undefined',
  overflow: 'Overflow',
} as const satisfies Record<ExcludedItemRules, string>;

// TODO: Extract the following icons in docsParser from ('FactoryGame/Content/FactoryGame/Interface/UI/Assets/MonochromeIcons')
const ruleIcon256 = {
  any: 'RuleAny256.webp', // '/TXUI_MIcon_SortRule_Any.uasset'
  none: 'None256.webp', // '/TXUI_MIcon_Stop_X.uasset'
  anyUndefined: 'RuleUndef256.webp', // '/TXUI_MIcon_SortRule_AnyUndefined.uasset'
  overflow: 'RuleOverflow256.webp', // '/TXUI_MIcon_SortRule_Overflow.uasset'
} as const satisfies Record<ExcludedItemRules, string>;

// TODO: Downscale version for dropdown icon
const ruleIcon64 = {
  any: 'RuleAny64.webp',
  none: 'None64.webp',
  anyUndefined: 'RuleUndef64.webp',
  overflow: 'RuleOverflow64.webp',
};

const dirText = {
  top: 'Left',
  right: 'Center',
  bottom: 'Right',
} as const satisfies Record<Exclude<FactoryInterfaceDir, 'left'>, string>;

export function OutputFilterRule() {
  const [isModalOpen, setModalOpen] = useState(false);
  const [docsMapped] = useAtom(docsMappedAtom);
  const { currentValue: logisticType } = useEditorField<LogisticType>('type');
  const [localRules, setLocalRules] = useState<FactoryLogisticNodeData['smartProRules'] | null>(null);
  const { currentValue: smartProRules, setValue: setSmartProRules } =
    useEditorField<FactoryLogisticNodeData['smartProRules']>('smartProRules');

  if (logisticType !== 'splitterSmart' && logisticType !== 'splitterPro') {
    return null;
  }

  return (
    <>
      {/* Field with Label and Button */}
      <button
        className='btn btn-sm btn-wide btn-ghost'
        onClick={() => {
          setLocalRules(smartProRules);
          setModalOpen(true);
        }} // Open Modal
      >
        Edit Output Filter
      </button>
      {isModalOpen && (
        <>
          {/* Overlay */}
          <div className='fixed inset-0 bg-black bg-opacity-50 z-50' />
          {/* Modal */}
          <div className='fixed left-1/2 top-1/2 w-[48rem] -translate-x-1/2 -translate-y-1/2 px-8 py-4 shadow-md bg-base-300 z-50 rounded-box'>
            <h2 className='text-2xl font-bold'>Output Filter</h2>
            <div className='divider m-0 mb-2 h-1' />
            {/* Rule List */}
            <div className="flex items-center justify-center gap-4"></div>
          </div>
          {/* TODO: Dropedown Content (Separated to reduce what needs to be rendered) */}
        </>
      )}
    </>
  );
}
