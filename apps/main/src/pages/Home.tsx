import { useState } from 'react';
import { useAtom } from 'jotai';
import examples from '../examples';
import { createFlow, flowsAtom, selectedFlowAtom } from '../lib/store';

function NavigateToFlowButton({ flowName, flowId, source }: { flowName: string; flowId: string; source: 'db' | 'example' }) {
  const [, setSelectedFlow] = useAtom(selectedFlowAtom);
  return (
    <a
      className='btn btn-sm'
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
  const [isCreatingFlow, setCreatingFlow] = useState(false);
  const [flows] = useAtom(flowsAtom);

  return (
    <div className='rounded-box absolute left-1/2 top-1/2 w-[28rem] -translate-x-1/2 -translate-y-1/2 px-8 py-4 shadow-xl bg-base-200'>
      <h1 className='w-full text-center text-4xl font-bold'>
        <span className='text-accent'>Satisfactory </span>
        Flow
      </h1>
      {isCreatingFlow ? (
        <>
          <label htmlFor='flowName' className='form-control w-full'>
            Flow Name:
            <input type='text' id='flowName' className='input input-sm' />
          </label>
          <div className='flex justify-between w-full mt-2'>
            <button
              className='btn w-2/5 btn-accent'
              onClick={() => {
                const name = (document.getElementById('flowName') as HTMLInputElement).value;
                createFlow(name);
                setCreatingFlow(false);
              }}
            >
              Create Flow
            </button>
            <button className='btn w-2/5 btn-error' onClick={() => setCreatingFlow(false)}>
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <p className='mt-4 text-lg'>Select a flow to get started:</p>
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
          <p className='mt-4 text-lg'>Or create a new flow:</p>
          <button className='btn mx-4 w-full' onClick={() => setCreatingFlow(true)}>
            New Flow
          </button>
        </>
      )}
    </div>
  );
}

export default HomePage;
