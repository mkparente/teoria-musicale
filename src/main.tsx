import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { registerSW } from 'virtual:pwa-register';
import { NavBar } from './components/Layout';
import { EXERCISES, isAvailable } from './exercises/registry';
import { ActivityPage } from './pages/ActivityPage';
import { Exercises } from './pages/Exercises';
import { Explore } from './pages/Explore';
import { Program } from './pages/Program';
import { SessionRunner } from './pages/SessionRunner';
import { SettingsPage } from './pages/SettingsPage';
import { Stats } from './pages/Stats';
import { Today } from './pages/Today';
import { requestPersistence } from './store';
import './styles.css';

/** Le sezioni principali, raggiungibili dalla barra di navigazione. */
const SECTIONS: Record<string, () => preact.JSX.Element> = {
  '': Today,
  programma: Program,
  esercizi: Exercises,
  esplora: Explore,
  progressi: Stats,
};

const currentRoute = () => location.hash.replace(/^#\/?/, '').split('?')[0];

function Page({ route }: { route: string }) {
  const [base, ...rest] = route.split('/');
  if (base in SECTIONS) {
    const Section = SECTIONS[base];
    return <Section />;
  }
  if (base === 'statistiche') return <Stats />;
  if (base === 'impostazioni') return <SettingsPage />;
  if (base === 'sessione') return <SessionRunner />;
  if (base === 'attivita') return <ActivityPage unitId={rest[0]} index={Number(rest[1])} />;
  if (isAvailable(base)) {
    const Comp = EXERCISES[base].Component;
    return <Comp />;
  }
  return <Today />;
}

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
  const section = route.split('/')[0];
  const withNav = section in SECTIONS;
  return (
    <>
      <main class={withNav ? 'with-nav' : ''}>
        <Page key={route} route={route} />
      </main>
      {withNav && <NavBar route={section} />}
    </>
  );
}

registerSW({ immediate: true });
requestPersistence();
render(<App />, document.getElementById('app')!);
