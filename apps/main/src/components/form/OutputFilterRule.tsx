import { Fragment, useCallback, useState } from 'react';
import { useAtom } from 'jotai';
import { ChevronDown, Plus, X } from 'lucide-react';
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
  any: 'RuleAny.webp',
  none: 'None.webp',
  anyUndefined: 'RuleUndef.webp',
  overflow: 'RuleOverflow.webp',
};

type ExcludedLeftDir = Exclude<FactoryInterfaceDir, 'left'>;

const dirText = {
  top: 'Left',
  right: 'Center',
  bottom: 'Right',
} as const satisfies Record<ExcludedLeftDir, string>;

interface DropdownProps {
  top: number;
  left: number;
  dir: ExcludedLeftDir;
  index: number;
}

export function OutputFilterRule() {
  const [dropdownProps, setDropdownProps] = useState<DropdownProps | undefined>(undefined); // if not undefined, drop down will show
  const [docsMapped] = useAtom(docsMappedAtom);
  const { currentValue: logisticType, setValue: setLogisticType } = useEditorField<LogisticType>('type');
  const [localRules, setLocalRules] = useState<FactoryLogisticNodeData['smartProRules'] | null>(null);
  const { currentValue: smartProRules = { right: ['any'] }, setValue: setSmartProRules } =
    useEditorField<FactoryLogisticNodeData['smartProRules']>('smartProRules');

  const onSelectRule = useCallback(
    (rule: LogisticSmartProRules) => {
      if (!dropdownProps) {
        return null;
      }
      // TODO: Rule setting logic
      // If type is smart splitter , there can only be one rule per direction
      // If type is pro splitter, there can be multiple rules per direction
      // But rules like 'any', 'none' will remove the other rules in the same direction
      // and no duplicate rules in the same direction
      setDropdownProps(undefined); // Hide dropdown
    },
    [logisticType, dropdownProps],
  );

  if (logisticType !== 'splitterSmart' && logisticType !== 'splitterPro') {
    return null;
  }

  return (
    <>
      {/* Field with Label and Button */}
      <button
        className='btn btn-sm btn-wide btn-ghost'
        onClick={() => setLocalRules(smartProRules)} // Open Modal
      >
        Edit Output Filter
      </button>
      {localRules && (
        <>
          {/* Overlay */}
          <div className='fixed inset-0 bg-black bg-opacity-50 z-50' />
          {/* Modal */}
          <div className='fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-8 py-4 shadow-md bg-base-300 z-50 rounded-box'>
            <h2 className='text-xl font-bold inline-block'>Output Filter</h2>
            <button
              className='btn btn-xs btn-ghost float-right'
              onClick={() => {
                // TODO: Set the localRules to the smartProRules
                setLocalRules(null); // Close Modal
              }}
            >
              <X size={24} />
            </button>
            <button
              className='btn btn-xs btn-ghost float-right'
              onClick={() => {
                setLogisticType(logisticType === 'splitterSmart' ? 'splitterPro' : 'splitterSmart');
              }}
            >
              Switch to {logisticType === 'splitterSmart' ? 'Programmable' : 'Smart'} Splitter
            </button>
            <div className='divider m-0 mb-2 h-1' />
            {/* Rule List */}
            <div className='flex justify-center gap-4'>
              {(['top', 'right', 'bottom'] as const).map(dir => (
                <div key={dir} className='w-64'>
                  <h3 className='font-semibold text-center'>{dirText[dir]} Output</h3>
                  <div className='bg-black p-1'>
                    {(localRules[dir] ?? ['none']).map((rule, index, { length: totalCount }) => {
                      let imgPath: string | null = null;
                      let text: string = '';
                      if (rule.startsWith('item-')) {
                        const itemKey = rule.slice(5);
                        const item = docsMapped.items.get(itemKey);
                        if (!item) {
                          return `Item not found: ${itemKey}`;
                        } else {
                          imgPath = item.iconPath;
                          text = item.displayName;
                        }
                      } else if (rule in ruleText) {
                        imgPath = ruleIcon64[rule as ExcludedItemRules];
                        text = ruleText[rule as ExcludedItemRules];
                      } else {
                        return `Invalid rule: ${rule}`;
                      }

                      return (
                        <Fragment key={index}>
                          <div className='bg-base-300 w-full flex px-1'>
                            <button
                              className='flex-1 btn btn-sm rounded-none justify-between btn-ghost px-1'
                              onClick={e => {
                                const { bottom, left } = e.currentTarget.getBoundingClientRect();
                                if (dropdownProps && dropdownProps.dir === dir && dropdownProps.index === index) {
                                  setDropdownProps(undefined);
                                } else {
                                  setDropdownProps({ top: bottom, left, dir, index });
                                }
                              }}
                            >
                              {imgPath && <img src={`/extracted/icons/${imgPath}`} alt={text} className='h-6 w-6' />}
                              <span>{text}</span>
                              <ChevronDown
                                className='data-[show=true]:rotate-180 transition-transform inline'
                                size={24}
                                data-show={dropdownProps && dropdownProps.dir === dir && dropdownProps.index === index}
                              />
                            </button>
                            {logisticType === 'splitterPro' && (
                              <button className='btn btn-sm btn-ghost rounded-none p-0'>
                                <X size={24} className='inline' />
                              </button>
                            )}
                          </div>
                          {
                            // SplitterPro gets additional button at the end to add new rule if the current rule is not any or none
                            logisticType === 'splitterPro' && index === totalCount - 1 && !['none'].includes(rule) && (
                              <button
                                className='btn btn-sm btn-ghost rounded-none w-full mt-6'
                                onClick={e => {
                                  const { bottom, left } = e.currentTarget.getBoundingClientRect();
                                  if (dropdownProps && dropdownProps.dir === dir && dropdownProps.index === index + 1) {
                                    setDropdownProps(undefined);
                                  } else {
                                    setDropdownProps({ top: bottom, left, dir, index: index + 1 });
                                  }
                                }}
                              >
                                <Plus size={24} />
                                Add
                              </button>
                            )
                          }
                        </Fragment>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div
            className='fixed invisible w-72 shadow-lg bg-base-300 z-50 border-black'
            style={
              dropdownProps && {
                top: dropdownProps.top + 4,
                left: dropdownProps.left - 4,
                visibility: 'visible',
              }
            }
          >
            TODO: Dropdown Content
          </div>
        </>
      )}
    </>
  );
}
