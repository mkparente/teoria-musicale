import { getDb } from '../srs/srs';

const ITEMS = [
  {
    href: '#/scale',
    prefix: 'sq:',
    title: 'Quiz sulle scale',
    text: 'Gradi, armature, relative, scrivere le scale maggiori e minori.',
    icon: '♯',
  },
  {
    href: '#/triadi',
    prefix: 'tr:',
    title: 'Triadi',
    text: 'Costruire e riconoscere le triadi, i rivolti, le triadi di ogni grado.',
    icon: '△',
  },
  {
    href: '#/manico',
    prefix: 'fb:',
    title: 'Note sul manico',
    text: 'Trova le note sulla chitarra, corda per corda.',
    icon: '⋮',
  },
  {
    href: '#/accordi',
    prefix: 'ch:',
    title: 'Accordi sul manico',
    text: 'Le forme CAGED e le triadi su 3 corde, in tutti i rivolti.',
    icon: '▦',
  },
  {
    href: '#/lettura',
    prefix: 'rd:',
    title: 'Lettura delle note',
    text: 'Riconosci le note sul pentagramma, anche con l’armatura.',
    icon: '𝅝',
  },
  {
    href: '#/esplora',
    title: 'Esplora',
    text: 'Scale e accordi sul pentagramma e sul manico: gradi, box delle pentatoniche, forme CAGED.',
    icon: '◎',
  },
];

const COMING = ['Riconoscimento a orecchio', 'Solfeggio parlato', 'Solfeggio ritmico', 'Suonala: l’app ascolta la chitarra'];

export function Home() {
  const db = getDb();
  const now = Date.now();
  const due = (prefix?: string) =>
    prefix ? Object.entries(db).filter(([k, s]) => k.startsWith(prefix) && s.due <= now).length : 0;

  return (
    <div class="home">
      <header class="home-head">
        <h1>Teoria musicale</h1>
        <nav>
          <a href="#/statistiche">Progressi</a>
          <a href="#/impostazioni">Impostazioni</a>
        </nav>
      </header>
      <div class="cards">
        {ITEMS.map((it) => {
          const n = due(it.prefix);
          return (
            <a class="card" href={it.href} key={it.href}>
              <span class="card-icon">{it.icon}</span>
              <span class="card-body">
                <span class="card-title">{it.title}</span>
                <span class="card-text">{it.text}</span>
              </span>
              {n > 0 && <span class="badge" title="Da ripassare">{n}</span>}
            </a>
          );
        })}
      </div>
      <h2 class="section">In arrivo</h2>
      <ul class="coming">
        {COMING.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
    </div>
  );
}
