import { useCallback, useRef, useState } from 'react';
import { useAtom } from 'jotai';
import { DollarSign } from 'lucide-react';
import { JSONError } from 'parse-json';
import { ZodError } from 'zod';
import examples from '../examples';
import { parseFlowData } from '../lib/data';
import { createFlow, deleteFlow, flowsAtom, selectedFlowAtom } from '../lib/store';

type View = 'create' | 'import' | 'select' | 'edit';
type SetView = (view: View) => void;

function HomePage() {
  const [view, setView] = useState<View>('select');

  return (
    <>
      {/* Center floating div */}
      <div className='rounded-box bg-base-200 absolute left-1/2 top-1/2 w-[40rem] -translate-x-1/2 -translate-y-1/2 px-8 py-4 shadow-xl *:*:mt-2 *:mt-2'>
        <h1 className='w-full text-center text-4xl font-bold'>
          <span className='text-accent'>Satisfactory </span>
          Flow
        </h1>
        {view === 'select' && <SelectView setView={setView} />}
        {view === 'create' && <CreateView setView={setView} />}
        {view === 'import' && <ImportView setView={setView} />}
        {view === 'edit' && <EditView setView={setView} />}
      </div>
      {/* Bottom-Left section */}
      <div className='absolute bottom-4 left-0 p-4 opacity-30'>
        <h3 className='text-sm'>Made With:</h3>
        <div className='ml-2 mt-2 flex gap-2'>
          {/* React Icon */}
          <a href='https://reactjs.org/' target='_blank' rel='noreferrer' className='flex items-center gap-1 p-2'>
            <img src='/reactjs-icon.svg' alt='React Icon' className='h-8 w-8' />
            React
          </a>
          {/* Reactflow Icon */}
          <a href='https://reactflow.dev/' target='_blank' rel='noreferrer' className='flex items-center gap-1 p-2'>
            <img src='/reactflow-icon.svg' alt='Reactflow Icon' className='h-8 w-8' />
            React Flow
          </a>
        </div>
      </div>
      {/* Bottom Center */}
      <div className='absolute bottom-0 left-1/2 flex -translate-x-1/2 transform flex-col items-center opacity-30'>
        <div>
          <h3 className='text-sm'>Thank you</h3>
          <a href='https://coffeestain.com/' target='_blank' rel='noreferrer' className='flex items-center gap-1 p-2'>
            <img src='/coffeestain-logo.png' alt='Coffee Stain Studios Logo' className='max-h-8' />
            Coffee Stain Studios
          </a>
        </div>
        <p className='text-center'>For creating such an amazing game and inspiring me to create tools like this</p>
        <p className='text-center text-[0.5rem]'>
          This project is not affiliated with Coffee Stain Studios. Satisfactory is a trademark of Coffee Stain Studios.
        </p>
      </div>
      {/* Bottom Right */}
      <div className='absolute bottom-4 right-4 flex flex-row p-4'>
        <a
          href='https://github.com/PlutoyDev/satisfactory-flow'
          target='_blank'
          rel='noreferrer'
          className='flex items-center gap-1 p-2 opacity-30'
        >
          <img src='/github-icon.svg' alt='GitHub Icon' className='h-8 w-8' />
          Contribute / Discuss
        </a>
        <button className='btn btn-ghost tooltip flex items-center gap-1 p-2' disabled>
          <DollarSign />
          Support
        </button>
      </div>
    </>
  );
}

export default HomePage;

function SelectView({ setView }: { setView: SetView }) {
  const [, setSelectedFlow] = useAtom(selectedFlowAtom);
  const [flows] = useAtom(flowsAtom);

  return (
    <>
      <p className='inline text-lg font-bold'>Select Flow </p>
      <button className='btn btn-outline btn-sm rounded-badge float-right' onClick={() => setView('edit')}>
        Edit flow list
      </button>
      <div className='mb-4 grid grid-cols-[auto_auto] gap-2'>
        {([flows, Array.from(examples.values())] as const).map((flows, i) => (
          <>
            <p className='place-self-center'>{i === 0 ? 'Created: ' : 'Examples: '}</p>
            <div className='col-start-2 flex flex-wrap gap-1'>
              {flows.length > 0 ? (
                flows.map(({ id, name }) => {
                  const source = i === 0 ? 'db' : 'example';
                  return (
                    <a
                      className='btn btn-sm btn-outline rounded-badge'
                      href={`/flows/${source}/${id}`}
                      onClick={e => (e.preventDefault(), setSelectedFlow({ source, flowId: id }))}
                    >
                      {name}
                    </a>
                  );
                })
              ) : (
                <p>No flows created yet.</p>
              )}
            </div>
          </>
        ))}
      </div>
      <div className='flex flex-row items-center justify-around'>
        <button className='btn btn-outline w-2/5' onClick={() => setView('create')}>
          Create a Flow
        </button>
        <div className='divider divider-horizontal'>OR</div>
        <button className='btn btn-outline w-2/5' onClick={() => setView('import')}>
          Import a Flow
        </button>
      </div>
    </>
  );
}

function CreateView({ setView }: { setView: SetView }) {
  return (
    <>
      <label htmlFor='flowName' className='form-control w-full'>
        Flow Name:
        <input type='text' id='flowName' className='input input-sm' />
      </label>
      <div className='flex w-full justify-between'>
        <button
          className='btn btn-accent w-2/5'
          onClick={() => {
            const name = (document.getElementById('flowName') as HTMLInputElement).value;
            createFlow(name);
            setView('select');
          }}
        >
          Create Flow
        </button>
        <button className='btn btn-error w-2/5' onClick={() => setView('select')}>
          Cancel
        </button>
      </div>
    </>
  );
}

function ImportView({ setView }: { setView: SetView }) {
  const importFileUploadRef = useRef<HTMLInputElement>(null);
  const importJsonTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [, setSelectedFlow] = useAtom(selectedFlowAtom);

  const onImportButtonClick = useCallback(() => {
    const errors: string[] = [];
    // Check if file is uploaded or JSON is pasted
    const file = importFileUploadRef.current?.files?.[0];
    const textareaValue = importJsonTextareaRef.current?.value;
    if (!file && !textareaValue) {
      errors.push('Please upload a file or paste JSON');
      return;
    } else if (file && textareaValue) {
      errors.push('Please upload a file or paste JSON, not both');
      return;
    }
    // Parse JSON
    try {
      let flowJson: string | undefined;
      if (file) {
        const reader = new FileReader();
        reader.onload = () => (flowJson = reader.result as string);
        reader.onerror = () => (errors.push('Error reading file'), console.error(reader.error));
        reader.readAsText(file);
      } else {
        flowJson = textareaValue as string;
      }

      if (!flowJson) {
        throw new Error('No JSON data');
      }

      const flowData = parseFlowData(flowJson);
      setSelectedFlow({ source: 'import', flowId: flowData.info.id }, flowData);
    } catch (e) {
      if (e instanceof JSONError) {
        if (textareaValue) {
          // Set cursor position to error location
          const lineIndex = e.message.indexOf('line') + 5;
          const colIndex = e.message.indexOf('column') + 7;
          const line = parseInt(e.message.slice(lineIndex, e.message.indexOf(' ', lineIndex)));
          const col = parseInt(e.message.slice(colIndex, e.message.indexOf(' ', colIndex)));
          let position = 0;
          for (let i = 1; i < line; i++) position = textareaValue.indexOf('\n', position) + 1;
          position += col - 1;
          const textarea = importJsonTextareaRef.current!;
          textarea.focus();
          textarea.setSelectionRange(position, position);
        }
        errors.push('Error Parsing imported JSON:', e.message);
      } else if (e instanceof ZodError) {
        errors.push('Invalid Flow JSON:', ...e.errors.map(e => '\t' + e.path.join('.') + ': ' + e.message));
      } else if (e instanceof Error) {
        errors.push('Error:', e.message);
      }
    }
    if (errors.length > 0) {
      setImportErrors(errors);
      return;
    }
  }, [importFileUploadRef, importJsonTextareaRef, setSelectedFlow]);

  return (
    <>
      <p className='text-lg font-bold'>Import flow</p>
      <div className='flex flex-col gap-2'>
        <label className='form-control'>
          Upload File:
          <input
            ref={importFileUploadRef}
            type='file'
            id='flowFile'
            className='file-input file-input-ghost file-input-sm w-full'
            accept='.json'
            onChange={e => {
              // Disable textarea if there is a file uploaded
              importJsonTextareaRef.current!.disabled = e.target.files!.length > 0;
            }}
          />
        </label>
        <label className='form-control'>
          Raw JSON:
          <textarea
            ref={importJsonTextareaRef}
            id='flowJson'
            spellCheck='false'
            className='textarea textarea-ghost'
            placeholder='Paste exported JSON here (not meant to be hand-typed)'
            onChange={e => {
              // Disable file upload if there is text in the textarea
              importFileUploadRef.current!.disabled = e.target.value.length > 0;
              if (importErrors.length > 0) setTimeout(() => setImportErrors([]), 4000);
            }}
          />
        </label>
      </div>
      <ul className='text-error list-inside list-disc text-sm'>
        {importErrors.map((error, i) => (
          <li key={i} style={{ textIndent: error.startsWith('\t') ? '1rem' : '0' }}>
            {error}
          </li>
        ))}
      </ul>
      <div className='flex w-full justify-between'>
        <button className='btn btn-accent w-2/5' onClick={() => onImportButtonClick()}>
          Import Flow
        </button>
        <button className='btn btn-error w-2/5' onClick={() => setView('select')}>
          Cancel
        </button>
      </div>
    </>
  );
}

function EditView({ setView }: { setView: SetView }) {
  const [localSelectFlow, setLocalSelectFlow] = useState<string | null>(null);
  const [newName, setNewName] = useState<string>('');
  const [oldName, setOldName] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [flows, updateOneFlow] = useAtom(flowsAtom);
  // Edit the flow listing like delete, rename, full import/export

  return (
    <>
      <p className='inline text-lg font-bold'>Flow: </p>
      <div className='col-start-2 mb-8 ml-4 flex flex-wrap gap-1'>
        {flows.map(({ id, name }) => {
          return (
            <button
              data-selected={localSelectFlow === id}
              className='btn btn-sm btn-outline rounded-badge data-[selected=true]:btn-active'
              onClick={() => {
                setLocalSelectFlow(id);
                setNewName(name);
                setOldName(name);
                setIsDeleting(false);
              }}
              key={id}
            >
              {name}
            </button>
          );
        })}
      </div>
      {isDeleting && localSelectFlow ? (
        <>
          <p className='text-lg font-bold'>Are you sure you want to delete "{oldName}"?</p>
          <p className='text-sm text-gray-500'>This action cannot be undone.</p>
          <div className='flex w-full justify-between'>
            <button
              className='btn btn-error w-2/5 truncate'
              onClick={() => {
                deleteFlow(localSelectFlow);
                setLocalSelectFlow(null);
                setOldName('');
                setNewName('');
              }}
            >
              Delete {oldName}
            </button>
            <button className='btn btn-accent w-2/5' onClick={() => setIsDeleting(false)}>
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <p className='text-lg font-bold'>Flow detail</p>
          <p className='inline indent-3 text-sm text-gray-500'>Flow ID: {localSelectFlow ?? 'None selected'}</p>
          <button
            className='btn btn-sm rounded-badge btn-outline btn-error ml-4'
            onClick={() => setIsDeleting(true)}
            disabled={!localSelectFlow}
          >
            Delete {oldName}
          </button>
          <label htmlFor='flowName' className='form-control w-full'>
            Rename:
            <input type='text' id='flowName' className='input input-sm' value={newName} onChange={e => setNewName(e.target.value)} />
          </label>

          {!localSelectFlow || newName === oldName ? (
            <button
              className='btn btn-success mx-auto flex w-2/5'
              onClick={() => {
                setView('select');
              }}
            >
              Done
            </button>
          ) : (
            <button
              className='btn btn-success mx-auto flex w-2/5'
              onClick={() => {
                updateOneFlow(localSelectFlow!, { name: newName });
                setOldName(newName);
              }}
            >
              Save new name
            </button>
          )}
        </>
      )}
    </>
  );
}
