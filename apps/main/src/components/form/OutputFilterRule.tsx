import { useCallback, useEffect, useState } from 'react';
import { useAtom } from 'jotai';
import { Plus } from 'lucide-react';
import { isDeepEqual } from 'remeda';
import {
  FactoryInterfaceDir,
  FactoryLogisticNodeData,
  LOGISTIC_SMART_PRO_RULES,
  LogisticSmartProRules,
  LogisticType,
} from '../../lib/data';
import { docsMappedAtom } from '../../lib/store';
import { useEditorField } from '../rf/BaseNode';
import ItemOrRecipeComboBox, { ADDITIONAL_OUTPUT_RULE } from './ItemOrRecipeComboBox';

type ExcludedLeftDir = Exclude<FactoryInterfaceDir, 'left'>;

const dirText = {
  top: 'Left',
  right: 'Center',
  bottom: 'Right',
} as const satisfies Record<ExcludedLeftDir, string>;

export function OutputFilterRule() {
  const [docsMapped] = useAtom(docsMappedAtom);
  const { currentValue: logisticType, setValue: setLogisticType } = useEditorField<LogisticType>('type');
  const [localRules, setLocalRules] = useState<FactoryLogisticNodeData['smartProRules'] | null>(null);
  const { currentValue: smartProRules = { right: ['any'] }, setValue: setSmartProRules } =
    useEditorField<FactoryLogisticNodeData['smartProRules']>('smartProRules');
  const [warning, setWarning] = useState<string>('');

  useEffect(() => {
    setTimeout(() => setWarning(''), 3000);
  }, [warning]);

  const onSelectRule = useCallback(
    (dir: ExcludedLeftDir, index: number, rule: LogisticSmartProRules | string) => {
      if (!localRules) {
        return null;
      }

      // If type is smart splitter , there can only be one rule per direction
      // If type is pro splitter, there can be multiple rules per direction
      // But rules like 'any', 'none' will remove the other rules in the same direction
      // and no duplicate rules in the same direction
      localRules[dir] ??= [];
      if (logisticType === 'splitterSmart') {
        setLocalRules({ ...localRules, [dir]: [rule] });
      } else if (LOGISTIC_SMART_PRO_RULES.includes(rule as LogisticSmartProRules)) {
        // Special rules
        setLocalRules({ ...localRules, [dir]: [rule] });
      } else if (!localRules[dir].includes(rule)) {
        const newRule: (LogisticSmartProRules | string)[] = [];
        for (let i = 0; i < localRules[dir].length; i++) {
          if (i === index) newRule.push(rule);
          else if (!LOGISTIC_SMART_PRO_RULES.includes(localRules[dir][i] as LogisticSmartProRules))
            newRule.push(localRules[dir][i] as LogisticSmartProRules);
        }
        if (index >= localRules[dir].length) {
          newRule.push(rule);
        }
        setLocalRules({ ...localRules, [dir]: newRule });
      } else {
        setWarning('Rule already exists');
      }
    },
    [logisticType, localRules],
  );

  if (logisticType !== 'splitterSmart' && logisticType !== 'splitterPro') {
    return null;
  }

  return (
    <>
      {/* Mini display */}
      <label>
        <div className='mb-2 flex w-full flex-row items-start justify-between'>
          {(['top', 'right', 'bottom'] as const).map(dir => (
            <div key={dir} className='flex w-28 flex-wrap justify-center gap-0.5'>
              <p className='w-full text-center'>{dirText[dir]}</p>
              {(smartProRules[dir] && smartProRules[dir].length > 0 ? smartProRules[dir] : ['none'])?.map((rule, index) => {
                const item = docsMapped.items.get(rule) ?? ADDITIONAL_OUTPUT_RULE[rule as LogisticSmartProRules];
                if (!item) {
                  console.error('Item not found', rule);
                  return null;
                }
                return <img key={index} src={`/extracted/${item.iconPath}`} className='h-6 w-6' />;
              })}
            </div>
          ))}
        </div>
        {/* Edit Button */}
        <button
          className='btn btn-sm btn-ghost w-full'
          onClick={() => setLocalRules(smartProRules)} // Open Modal
        >
          Edit Output Filter
        </button>
      </label>
      {localRules && (
        <>
          {/* Overlay */}
          <div className='fixed inset-0 z-50 bg-black bg-opacity-50' />
          {/* Modal */}
          <div className='bg-base-100 rounded-box fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 px-8 py-4 shadow-md'>
            <h2 className='inline-block text-xl font-bold'>Output Filter</h2>
            <button
              className='btn btn-xs btn-ghost float-right'
              onClick={() => {
                if (Object.values(localRules).some(rules => rules.length > 1)) {
                  setWarning('Unable to change to Smart Splitter: Multiple rules in the same direction');
                } else {
                  setLogisticType(logisticType === 'splitterSmart' ? 'splitterPro' : 'splitterSmart');
                }
              }}
            >
              Switch to {logisticType === 'splitterSmart' ? 'Programmable' : 'Smart'} Splitter
            </button>
            <div className='divider m-0 mb-2 h-1' />
            {/* Rule List */}
            <div className='flex justify-center gap-4'>
              {(['top', 'right', 'bottom'] as const).map(dir => (
                <div key={dir} className='w-72'>
                  <h3 className='text-center font-semibold'>{dirText[dir]} Output</h3>
                  <div
                    className='flex-no-wrap flex flex-col gap-y-2 bg-black px-2 py-1'
                    style={logisticType === 'splitterPro' ? { minHeight: '20rem' } : {}}
                  >
                    {(localRules[dir] && localRules[dir].length > 0 ? localRules[dir] : ['none']).map((rule, index) => {
                      return (
                        <ItemOrRecipeComboBox
                          type='outputRule'
                          defaultKey={rule}
                          onKeySelected={key => onSelectRule(dir, index, key as LogisticSmartProRules)}
                        />
                        // TODO: Add remove button for each rule
                      );
                    })}
                    {
                      // SplitterPro gets additional button at the end to add new rule if the current rule is not any or none
                      logisticType === 'splitterPro' && (
                        <button
                          className='btn btn-sm w-full'
                          onClick={() => {
                            if (
                              !localRules[dir]?.length ||
                              LOGISTIC_SMART_PRO_RULES.includes(localRules[dir][0] as LogisticSmartProRules)
                            ) {
                              setWarning('You are not allowed to add rule when the included rule that is not an item');
                              return;
                            }
                            onSelectRule(dir, (localRules[dir]?.length ?? 0) + 1, '');
                          }}
                        >
                          <Plus size={24} />
                          Add
                        </button>
                      )
                    }
                  </div>
                </div>
              ))}
            </div>
            <p className='min-h-6 text-center text-red-500'>{warning}</p>
            {/* Save and Cancel Button */}
            <div className='mt-4 flex justify-center gap-4'>
              {!isDeepEqual(localRules, smartProRules) ? (
                <>
                  <button
                    className='btn btn-sm btn-success'
                    onClick={() => {
                      setSmartProRules(localRules);
                      setLocalRules(null); // Close Modal
                    }}
                  >
                    Save & Close
                  </button>
                  <button
                    className='btn btn-sm btn-error'
                    onClick={() => {
                      setLocalRules(smartProRules);
                    }}
                  >
                    Reset
                  </button>
                </>
              ) : (
                <button
                  className='btn btn-sm btn-error'
                  onClick={() => {
                    setLocalRules(null); // Close Modal
                  }}
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
