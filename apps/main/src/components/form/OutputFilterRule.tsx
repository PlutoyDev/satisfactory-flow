import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Fuse from 'fuse.js';
import { useAtom } from 'jotai';
import { ChevronDown, Plus, X } from 'lucide-react';
import { isDeepEqual } from 'remeda';
import { FactoryInterfaceDir, FactoryLogisticNodeData, LogisticSmartProRules, LogisticType } from '../../lib/data';
import { docsMappedAtom } from '../../lib/store';
import { useEditorField } from '../rf/BaseNode';

type ExcludedItemRules = Exclude<LogisticSmartProRules, `item-${string}`>;

const ruleText = {
  any: 'Any',
  none: 'None',
  anyUndefined: 'Any Undefined',
  overflow: 'Overflow',
} as const satisfies Record<ExcludedItemRules, string>;

// TODO: Downscale version for dropdown icon
const ruleIcon64 = {
  any: 'icons/RuleAny.webp',
  none: 'icons/None.webp',
  anyUndefined: 'icons/RuleUndef.webp',
  overflow: 'icons/RuleOverflow.webp',
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
  const [warning, setWarning] = useState<string | null>(null);

  const ruleList = useMemo(() => {
    const ruleList: { key: string; name: string; iconPath?: string | null }[] = [];
    for (const key in ruleText)
      ruleList.push({ key, name: ruleText[key as ExcludedItemRules], iconPath: ruleIcon64[key as ExcludedItemRules] });
    for (const [key, value] of docsMapped.items) ruleList.push({ key: `item-${key}`, name: value.displayName, iconPath: value.iconPath });
    return ruleList;
  }, [docsMapped]);
  const ruleFuse = useMemo(() => new Fuse(ruleList, { keys: ['name'] }), [ruleList]);
  const [search, setSearch] = useState('');
  const filteredRules = useMemo(() => (search ? ruleFuse.search(search).map(({ item }) => item) : ruleList), [ruleFuse, ruleList, search]);
  const filterUlElement = useRef<HTMLUListElement>(null);

  useEffect(() => {
    setTimeout(() => setWarning(null), 3000);
  }, [warning]);

  const onSelectRule = useCallback(
    (rule: LogisticSmartProRules) => {
      if (!localRules || !dropdownProps) {
        return null;
      }

      // If type is smart splitter , there can only be one rule per direction
      // If type is pro splitter, there can be multiple rules per direction
      // But rules like 'any', 'none' will remove the other rules in the same direction
      // and no duplicate rules in the same direction
      const { dir, index } = dropdownProps;
      localRules[dir] ??= [];
      if (logisticType === 'splitterSmart') {
        setLocalRules({ ...localRules, [dir]: [rule] });
      } else if (['any', 'none', 'anyUndefined', 'overflow'].includes(rule)) {
        // Special rules
        setLocalRules({ ...localRules, [dir]: [rule] });
      } else if (!localRules[dir].includes(rule)) {
        const newRule: LogisticSmartProRules[] = [];
        for (let i = 0; i < localRules[dir].length; i++) {
          if (i === index) newRule.push(rule);
          else if (!['any', 'none', 'anyUndefined', 'overflow'].includes(localRules[dir][i])) newRule.push(localRules[dir][i]);
        }
        if (index >= localRules[dir].length) {
          newRule.push(rule);
        }
        setLocalRules({ ...localRules, [dir]: newRule });
      } else {
        setWarning('Rule already exists');
      }

      setDropdownProps(undefined); // Hide dropdown
      filterUlElement.current?.scrollTo({ behavior: 'smooth', top: 0 });
    },
    [logisticType, localRules, dropdownProps],
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
                let imgPath: string | null = null;
                if (rule.startsWith('item-')) {
                  const itemKey = rule.slice(5);
                  const item = docsMapped.items.get(itemKey);
                  if (!item) {
                    return `Item not found: ${itemKey}`;
                  } else {
                    imgPath = item.iconPath;
                  }
                } else if (rule in ruleText) {
                  imgPath = ruleIcon64[rule as ExcludedItemRules];
                }

                return <img key={index} src={`/extracted/${imgPath}`} className='h-6 w-6' />;
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
          <div className='bg-base-300 rounded-box fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 px-8 py-4 shadow-md'>
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
                  <div className='bg-black p-1'>
                    {(localRules[dir] && localRules[dir].length > 0 ? localRules[dir] : ['none']).map((rule, index) => {
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
                          <div className='bg-base-300 flex w-full px-1'>
                            <button
                              className='btn btn-sm btn-ghost flex-1 justify-between rounded-none px-1'
                              onClick={e => {
                                const { bottom, left } = e.currentTarget.getBoundingClientRect();
                                if (dropdownProps && dropdownProps.dir === dir && dropdownProps.index === index) {
                                  setDropdownProps(undefined);
                                } else {
                                  setDropdownProps({ top: bottom, left, dir, index });
                                  setSearch('');
                                  filterUlElement.current?.scrollTo({ behavior: 'smooth', top: 0 });
                                }
                              }}
                            >
                              {imgPath && <img src={`/extracted/${imgPath}`} alt={text} className='h-6 w-6' />}
                              <span className='flex-1 text-start'>{text}</span>
                              <ChevronDown
                                className='inline transition-transform data-[show=true]:rotate-180'
                                size={24}
                                data-show={dropdownProps && dropdownProps.dir === dir && dropdownProps.index === index}
                              />
                            </button>
                            {logisticType === 'splitterPro' && rule !== 'none' && (
                              <button
                                className='btn btn-sm btn-ghost rounded-none p-0'
                                onClick={() => {
                                  setLocalRules({
                                    ...localRules,
                                    [dir]: localRules[dir]!.filter((_, i) => i !== index),
                                  });
                                }}
                              >
                                <X size={24} className='inline' />
                              </button>
                            )}
                          </div>
                        </Fragment>
                      );
                    })}
                    {
                      // SplitterPro gets additional button at the end to add new rule if the current rule is not any or none
                      logisticType === 'splitterPro' && (
                        <button
                          className='btn btn-sm btn-ghost mt-6 w-full rounded-none'
                          onClick={e => {
                            const { bottom, left } = e.currentTarget.getBoundingClientRect();
                            if (dropdownProps && dropdownProps.dir === dir && dropdownProps.index === (localRules[dir]?.length ?? 0) + 1) {
                              setDropdownProps(undefined);
                            } else {
                              setDropdownProps({ top: bottom, left, dir, index: (localRules[dir]?.length ?? 0) + 1 });
                              setSearch('');
                              filterUlElement.current?.scrollTo({ behavior: 'smooth', top: 0 });
                            }
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
            {warning && <p className='text-center text-red-500'>{warning}</p>}
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
          <div
            className='bg-base-300 invisible fixed z-50 w-72 border-black shadow-lg'
            style={
              dropdownProps && {
                top: dropdownProps.top + 4,
                left: dropdownProps.left - 4,
                visibility: 'visible',
              }
            }
          >
            <input
              type='search'
              placeholder='Search...'
              className='input input-sm input-bordered mb-1 w-full'
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                filterUlElement.current?.scrollTo({ behavior: 'smooth', top: 0 });
              }}
            />
            <ul className='mt-1 h-48 w-full flex-nowrap overflow-y-scroll' ref={filterUlElement}>
              {filteredRules.map(({ key }) => {
                const { name, iconPath } = ruleList.find(rule => rule.key === key)!;
                return (
                  <button
                    key={key}
                    type='button'
                    className='btn btn-sm btn-block btn-ghost items-center justify-start'
                    onClick={() => onSelectRule(key as LogisticSmartProRules)}
                  >
                    {iconPath && <img src={`/extracted/${iconPath}`} alt={name} className='h-6 w-6' />}
                    <span>{name}</span>
                  </button>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </>
  );
}
