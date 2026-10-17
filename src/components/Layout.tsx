import type { ComponentChildren } from 'preact';
import type { IconName } from '../exercises/registry';
import { Icon } from './Icon';

const TABS: { href: string; route: string; label: string; icon: IconName }[] = [
  { href: '#/', route: '', label: 'Oggi', icon: 'today' },
  { href: '#/programma', route: 'programma', label: 'Programma', icon: 'program' },
  { href: '#/esercizi', route: 'esercizi', label: 'Esercizi', icon: 'exercises' },
  { href: '#/esplora', route: 'esplora', label: 'Esplora', icon: 'explore' },
  { href: '#/progressi', route: 'progressi', label: 'Progressi', icon: 'progress' },
];

/** Barra di navigazione delle pagine principali (in basso sul telefono, in alto sugli schermi larghi). */
export function NavBar({ route }: { route: string }) {
  return (
    <nav class="navbar" aria-label="Sezioni">
      {TABS.map((t) => (
        <a key={t.route} href={t.href} class={route === t.route ? 'on' : ''} aria-current={route === t.route ? 'page' : undefined}>
          <Icon name={t.icon} />
          <span>{t.label}</span>
        </a>
      ))}
    </nav>
  );
}

/** Intestazione di pagina: titolo, eventuale ritorno e azioni a destra. */
export function PageHead({
  title,
  back,
  actions,
  sub,
}: {
  title: string;
  back?: string;
  actions?: ComponentChildren;
  sub?: ComponentChildren;
}) {
  return (
    <header class="page-head">
      {back && (
        <a href={back} class="icon-btn ghost" aria-label="Indietro">
          <Icon name="back" />
        </a>
      )}
      <div class="page-title">
        <h1>{title}</h1>
        {sub && <p class="page-sub">{sub}</p>}
      </div>
      {actions}
    </header>
  );
}
