import { useCallback, useRef, useState } from 'react';
import { useAtom } from 'jotai';
import { JSONError } from 'parse-json';
import { ZodError } from 'zod';
import examples from '../examples';
import { parseFlowData } from '../lib/data';
import { createFlow, flowsAtom, selectedFlowAtom } from '../lib/store';

type View = 'create' | 'import' | 'select';
type SetView = (view: View) => void;

function HomePage() {
  const [view, setView] = useState<View>('select');

  return (
    <div className='rounded-box bg-base-200 absolute left-1/2 top-1/2 w-[28rem] -translate-x-1/2 -translate-y-1/2 px-8 py-4 shadow-xl *:*:mt-2 *:mt-2'>
      <h1 className='w-full text-center text-4xl font-bold'>
        <span className='text-accent'>Satisfactory </span>
        Flow
      </h1>
      {view === 'select' && <SelectView setView={setView} />}
      {view === 'create' && <CreateView setView={setView} />}
      {view === 'import' && <ImportView setView={setView} />}
    </div>
  );
}

export default HomePage;

function NavigateToFlowButton({ flowName, flowId, source }: { flowName: string; flowId: string; source: 'db' | 'example' }) {
  const [, setSelectedFlow] = useAtom(selectedFlowAtom);
  return (
    <a
      className='btn btn-sm btn-outline rounded-badge'
      href={`/flows/${source}/${flowId}`}
      onClick={e => {
        e.preventDefault();
        setSelectedFlow({ flowId, source });
      }}
    >
      {flowName}
    </a>
  );
}

function SelectView({ setView }: { setView: SetView }) {
  const [flows] = useAtom(flowsAtom);
  return (
    <>
      <p className='text-lg font-bold'>Select Flow</p>
      <div className='grid grid-cols-[auto_auto] gap-2'>
        <p className='justify-self-end'>Created: </p>
        <div className='col-start-2 flex flex-wrap gap-1'>
          {flows.length > 0 ? (
            flows.map(({ id, name }) => <NavigateToFlowButton key={id} flowId={id} flowName={name} source='db' />)
          ) : (
            <p>No flows created yet.</p>
          )}
        </div>
        <p className='justify-self-end'>Examples: </p>
        <div className='col-start-2 flex flex-wrap'>
          {Array.from(examples.values()).map(({ id, name }) => (
            <NavigateToFlowButton key={id} flowId={id} flowName={name} source='example' />
          ))}
        </div>
      </div>
      <p className='text-lg'>Or create a new flow:</p>
      <button className='btn btn-outline w-full' onClick={() => setView('create')}>
        New Flow
      </button>
      <p className='text-lg'>Or import a flow:</p>
      <button className='btn btn-outline w-full' onClick={() => setView('import')}>
        Import Flow
      </button>
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
