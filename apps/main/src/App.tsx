import { useAtom } from 'jotai';
import { locationAtom } from './lib/store';
import FlowPage from './pages/Flow';
import HomePage from './pages/Home';

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

export default App;
