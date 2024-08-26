import { useRef, useState } from 'react';
import { useAtom } from 'jotai';
import examples from '../examples';
import { createFlow, flowsAtom, selectedFlowAtom } from '../lib/store';

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

function HomePage() {
  // const [isCreatingFlow, setCreatingFlow] = useState(false);
  // const [isImportingFlow, setImportingFlow] = useState(false);
  const importFileUploadRef = useRef<HTMLInputElement>(null);
  const importJsonTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [view, setView] = useState<'create' | 'import' | 'select'>('select');
  const [flows] = useAtom(flowsAtom);

  return (
    <div className='rounded-box absolute left-1/2 top-1/2 w-[28rem] -translate-x-1/2 -translate-y-1/2 px-8 py-4 shadow-xl bg-base-200 *:mt-2 *:*:mt-2'>
      <h1 className='w-full text-center text-4xl font-bold'>
        <span className='text-accent'>Satisfactory </span>
        Flow
      </h1>
      {view === 'create' ? (
        <>
          <label htmlFor='flowName' className='form-control w-full'>
            Flow Name:
            <input type='text' id='flowName' className='input input-sm' />
          </label>
          <div className='flex justify-between w-full'>
            <button
              className='btn w-2/5 btn-accent'
              onClick={() => {
                const name = (document.getElementById('flowName') as HTMLInputElement).value;
                createFlow(name);
                setView('select');
              }}
            >
              Create Flow
            </button>
            <button className='btn w-2/5 btn-error' onClick={() => setView('select')}>
              Cancel
            </button>
          </div>
        </>
      ) : view === 'import' ? (
        <>
          <p className='text-lg font-bold'>Import flow</p>
          <div className='flex flex-col gap-2'>
            <label className='form-control'>
              Upload File:
              <input
                ref={importFileUploadRef}
                type='file'
                id='flowFile'
                className='file-input file-input-ghost w-full file-input-sm'
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
                className='textarea textarea-ghost'
                placeholder='Paste flow JSON here'
                onChange={e => {
                  // Disable file upload if there is text in the textarea
                  importFileUploadRef.current!.disabled = e.target.value.length > 0;
                }}
              />
            </label>
          </div>
          <ul className='list-disc list-inside text-sm text-error'>
            {importErrors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
          <div className='flex justify-between w-full'>
            <button
              className='btn w-2/5 btn-accent'
              onClick={() => {
                // Check if file is uploaded or JSON is pasted
                const file = importFileUploadRef.current?.files?.[0];
                const textareaValue = importJsonTextareaRef.current?.value;
                if (!file && !textareaValue) {
                  setImportErrors(['Please upload a file or paste JSON']);
                  return;
                } else if (file && textareaValue) {
                  setImportErrors(['Please only upload a file or paste JSON']);
                  return;
                }
                // Parse JSON
                let flowJson;
                if (file) {
                  const reader = new FileReader();
                  reader.onload = () => (flowJson = reader.result);
                  reader.readAsText(file);
                } else {
                  flowJson = textareaValue;
                }

                try {
                  // TODO: Import flow
                } catch (e) {
                  // TODO: Handle error
                }
              }}
            >
              Import Flow
            </button>
            <button className='btn w-2/5 btn-error' onClick={() => setView('select')}>
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <p className='text-lg font-bold'>Select Flow</p>
          <div className='grid grid-cols-[auto_auto] gap-2'>
            <p className='justify-self-end'>Created: </p>
            <div className='col-start-2 flex flex-wrap'>
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
          <button className='btn w-full btn-outline' onClick={() => setView('create')}>
            New Flow
          </button>
          <p className='text-lg'>Or import a flow:</p>
          <button className='btn w-full btn-outline' onClick={() => setView('import')}>
            Import Flow
          </button>
        </>
      )}
    </div>
  );
}

export default HomePage;
