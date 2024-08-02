import { useAtom } from 'jotai';
import { locationAtom } from './store';
import HomePage from './pages/Home';
import FlowPage from './pages/Flow';

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
