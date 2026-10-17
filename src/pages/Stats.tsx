import { useState } from 'preact/hooks';
import { PageHead } from '../components/Layout';
import { EXERCISE_LIST, GUITAR_PREFIX } from '../exercises/registry';
import { UNITS } from '../program/curriculum';
import { UNIT_THRESHOLD, unitProgress, useProgram } from '../program/progress';
import { MASTERED_BOX, getDb, resetPrefix } from '../srs/srs';
import { type Naming } from '../theory/notes';
import { load, useSettings } from '../store';

const guitarTitle = (id: string) => {
  const key = id.slice(GUITAR_PREFIX.length);
  for (const u of UNITS) for (const a of u.activities) if (a.type === 'guitar' && a.id === key) return a.title;
  return key;
};

const GROUPS: { prefix: string; title: string; describe: (id: string, n: Naming) => string }[] = [
  ...EXERCISE_LIST.map((e) => ({ prefix: e.prefix, title: e.title, describe: e.describe })),
  { prefix: GUITAR_PREFIX, title: 'Chitarra in mano', describe: guitarTitle },
];

export function Stats() {
  const [{ naming }] = useSettings();
  const [, refresh] = useState(0);
  const [program] = useProgram();
  const log = load<Record<string, { minutes: number }>>('log', {});
  const db = getDb();
  const now = Date.now();

  return (
    <div class="page">
      <PageHead title="Progressi" />
      <section class="panel">
        <h2 class="panel-title">Programma</h2>
        <div class="stat-grid">
          <Stat n={`${UNITS.filter((u) => program.done.includes(u.id) || unitProgress(u) >= UNIT_THRESHOLD).length} / ${UNITS.length}`} label="unità acquisite" />
          <Stat n={Object.keys(log).length} label="giorni di studio" />
          <Stat n={`${Math.round(Object.values(log).reduce((s, d) => s + d.minutes, 0) / 60)} h`} label="nelle sessioni guidate" />
        </div>
      </section>
      {GROUPS.map((g) => {
        const items = Object.entries(db).filter(([k]) => k.startsWith(g.prefix));
        if (!items.length) {
          return (
            <section class="panel" key={g.prefix}>
              <h2 class="panel-title">{g.title}</h2>
              <p class="hint">Ancora nessun esercizio.</p>
            </section>
          );
        }
        const attempts = items.reduce((s, [, v]) => s + v.seen, 0);
        const correct = items.reduce((s, [, v]) => s + v.correct, 0);
        const time = items.reduce((s, [, v]) => s + v.totalMs, 0);
        const mastered = items.filter(([, v]) => v.box >= MASTERED_BOX).length;
        const due = items.filter(([, v]) => v.due <= now).length;
        const weak = items
          .filter(([, v]) => v.seen >= 2 && v.correct < v.seen)
          .sort(([, a], [, b]) => a.correct / a.seen - b.correct / b.seen || a.box - b.box)
          .slice(0, 8);
        return (
          <section class="panel" key={g.prefix}>
            <h2 class="panel-title">{g.title}</h2>
            <div class="stat-grid">
              <Stat n={items.length} label="elementi visti" />
              <Stat n={mastered} label="imparati" />
              <Stat n={due} label="da ripassare" />
              <Stat n={`${Math.round((100 * correct) / attempts)}%`} label="risposte giuste" />
              {g.prefix !== GUITAR_PREFIX && (
                <Stat n={`${(time / attempts / 1000).toFixed(1).replace('.', ',')} s`} label="tempo medio" />
              )}
            </div>
            {weak.length > 0 && (
              <>
                <h3 class="sub">Dove sbagli di più</h3>
                <ul class="weak">
                  {weak.map(([id, v]) => (
                    <li key={id}>
                      <span>{g.describe(id, naming)}</span>
                      <span class="weak-score">
                        {v.correct}/{v.seen}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <button
              class="link-btn danger"
              onClick={() => {
                if (confirm(`Azzerare i progressi di "${g.title}"?`)) {
                  resetPrefix(g.prefix);
                  refresh((x) => x + 1);
                }
              }}
            >
              Azzera i progressi
            </button>
          </section>
        );
      })}
    </div>
  );
}

function Stat({ n, label }: { n: number | string; label: string }) {
  return (
    <div class="stat">
      <b>{n}</b>
      <span>{label}</span>
    </div>
  );
}
