import { Icon } from '../components/Icon';
import { PageHead } from '../components/Layout';
import { EXERCISE_LIST } from '../exercises/registry';
import { FUTURE_TITLES } from '../program/curriculum';
import { getDb } from '../srs/srs';

/** Studio libero: tutti gli esercizi, ognuno con le sue opzioni. */
export function Exercises() {
  const db = getDb();
  const now = Date.now();
  const due = (prefix: string) => Object.entries(db).filter(([k, s]) => k.startsWith(prefix) && s.due <= now).length;
  const groups = [...new Set(EXERCISE_LIST.map((e) => e.group))];

  return (
    <div class="page">
      <PageHead title="Esercizi" sub="Studio libero: scegli tu cosa allenare" />
      {groups.map((g) => (
        <section key={g}>
          <h2 class="section">{g}</h2>
          <div class="cards">
            {EXERCISE_LIST.filter((e) => e.group === g).map((e) => {
              const n = due(e.prefix);
              return (
                <a class="card" href={`#/${e.key}`} key={e.key}>
                  <span class="card-icon">
                    <Icon name={e.icon} size={26} />
                  </span>
                  <span class="card-body">
                    <span class="card-title">{e.title}</span>
                    <span class="card-text">{e.text}</span>
                  </span>
                  {n > 0 && (
                    <span class="badge" title={`${n} da ripassare`}>
                      {n}
                    </span>
                  )}
                </a>
              );
            })}
          </div>
        </section>
      ))}
      <h2 class="section">In arrivo</h2>
      <ul class="coming">
        {Object.values(FUTURE_TITLES).map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
      <p class="muted small">Il numero sulla scheda indica quanti elementi sono da ripassare.</p>
    </div>
  );
}
