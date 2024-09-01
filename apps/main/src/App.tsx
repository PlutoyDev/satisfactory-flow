import { useAtom } from 'jotai';
import { RefreshCcw } from 'lucide-react';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import { locationAtom } from './lib/store';
import FlowPage from './pages/Flow';
import HomePage from './pages/Home';

function ErrorFallback({ error }: FallbackProps) {
  const branchName = import.meta.env.VITE_GIT_BRANCH ?? 'undefiend';
  const commitSha = import.meta.env.VITE_GIT_COMMIT ?? 'undefiend';
  const deployId = import.meta.env.VITE_DEPLOY_ID ?? 'undefiend';

  return (
    <div className='rounded-box bg-base-200 absolute left-1/2 top-1/2 w-[72rem] -translate-x-1/2 -translate-y-1/2 px-8 py-4 shadow-xl'>
      <h1 className='w-full text-center text-4xl font-bold'>
        <span className='text-accent'>Satisfactory </span>
        Flow
      </h1>
      <div className=''>
        <h2 className='text-error text-xl font-bold'>Oops, Something Went Wrong</h2>
        {/* Print Message */}
        {typeof error === 'string' ? (
          <p className='text-neutral text-lg'>{error}</p>
        ) : typeof error === 'object' && error instanceof Error ? (
          <>
            {/* Stack trace */}
            <details className='collapse-arrow collapse'>
              <summary className='text-neutral collapse-title text-lg'>
                <p className='text-neutral text-lg'>Error message: {error.message}</p>
                <p className='text-neutral text-sm'>Click to see stack trace</p>
              </summary>
              <pre className='text-neutral collapse-content max-h-[20rem] overflow-y-auto text-sm'>{error.stack}</pre>
            </details>
          </>
        ) : null}
        {/* Github Issue link*/}
        <p className='text-neutral'>
          If you think this is a bug, please{' '}
          <a href='https://github.com/PlutoyDev/satisfactory-flow/issues/new' target='_blank' className='link link-accent'>
            create an issue on GitHub
          </a>{' '}
          with the following information:
          <ul className='ml-8 list-disc font-mono'>
            <li>The error message and stack trace</li>
            <li>What you were doing when the error occurred</li>
            <li>
              Environment Information:
              <ul className='ml-4 list-disc'>
                <li>Branch: {branchName}</li>
                <li>Commit SHA: {commitSha}</li>
                <li>Deploy ID: {deployId}</li>
              </ul>
            </li>
          </ul>
        </p>

        {/* Refresh Button */}
        <button
          className='btn btn-success mx-auto flex'
          onClick={() => {
            window.location.reload();
          }}
        >
          <RefreshCcw />
          Refresh
        </button>
      </div>
    </div>
  );
}

function App() {
  const [location] = useAtom(locationAtom);

  switch (true) {
    case location.pathname === '/':
      return <HomePage />;
    case location.pathname?.startsWith('/flows'):
      return <FlowPage />;
    default:
      return <div>404 Not Found</div>;
  }
}

export default function WrappedApp() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <App />
    </ErrorBoundary>
  );
}
