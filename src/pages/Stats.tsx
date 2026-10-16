import { useState } from 'preact/hooks';
import { describe as describeFret } from '../exercises/FretboardQuiz';
import { describe as describeRead } from '../exercises/ReadingQuiz';
import { describe as describeScale } from '../exercises/ScaleQuiz';
import { MASTERED_BOX, getDb, resetPrefix } from '../srs/srs';
import { type Naming } from '../theory/notes';
import { useSettings } from '../store';

const GROUPS: { prefix: string; title: string; describe: (id: string, n: Naming) => string }[] = [
  { prefix: 'sq:', title: 'Quiz sulle scale', describe: describeScale },
  { prefix: 'fb:', title: 'Note sul manico', describe: describeFret },
  { prefix: 'rd:', title: 'Lettura delle note', describe: describeRead },
];

export function Stats() {
  const [{ naming }] = useSettings();
  const [, refresh] = useState(0);
  const db = getDb();
  const now = Date.now();

  return (
    <div class="exercise">
      <header class="ex-head">
        <a href="#/" class="back" aria-label="Torna alla home">
          ‹
        </a>
        <h1>Progressi</h1>
      </header>
      {GROUPS.map((g) => {
        const items = Object.entries(db).filter(([k]) => k.startsWith(g.prefix));
        if (!items.length) {
          return (
            <section class="panel" key={g.prefix}>
              <h2 class="section">{g.title}</h2>
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
            <h2 class="section">{g.title}</h2>
            <div class="stat-grid">
              <Stat n={items.length} label="elementi visti" />
              <Stat n={mastered} label="imparati" />
              <Stat n={due} label="da ripassare" />
              <Stat n={`${Math.round((100 * correct) / attempts)}%`} label="risposte giuste" />
              <Stat n={`${(time / attempts / 1000).toFixed(1).replace('.', ',')} s`} label="tempo medio" />
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
