import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { registerSW } from 'virtual:pwa-register';
import { ChordFretQuiz } from './exercises/ChordFretQuiz';
import { FretboardQuiz } from './exercises/FretboardQuiz';
import { ReadingQuiz } from './exercises/ReadingQuiz';
import { ScaleQuiz } from './exercises/ScaleQuiz';
import { TriadQuiz } from './exercises/TriadQuiz';
import { Explore } from './pages/Explore';
import { Home } from './pages/Home';
import { SettingsPage } from './pages/SettingsPage';
import { Stats } from './pages/Stats';
import { requestPersistence } from './store';
import './styles.css';

const ROUTES: Record<string, () => preact.JSX.Element> = {
  '': Home,
  scale: ScaleQuiz,
  triadi: TriadQuiz,
  manico: FretboardQuiz,
  accordi: ChordFretQuiz,
  lettura: ReadingQuiz,
  esplora: Explore,
  statistiche: Stats,
  impostazioni: SettingsPage,
};

const currentRoute = () => location.hash.replace(/^#\/?/, '').split('?')[0];

function App() {
  const [route, setRoute] = useState(currentRoute);
  useEffect(() => {
    const onHash = () => {
      setRoute(currentRoute());
      window.scrollTo(0, 0);
    };
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, []);
  const Page = ROUTES[route] ?? Home;
  return (
    <main>
      <Page key={route} />
    </main>
  );
}

registerSW({ immediate: true });
requestPersistence();
render(<App />, document.getElementById('app')!);
