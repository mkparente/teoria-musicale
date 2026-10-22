import { useEffect } from 'preact/hooks';
import { Icon } from '../components/Icon';
import { PageHead } from '../components/Layout';
import { EXERCISES } from '../exercises/registry';
import { UNITS } from '../program/curriculum';
import {
  currentUnitIndex,
  currentWeekDays,
  programWeek,
  scheduleDelta,
  todayKey,
  unitHasFutureParts,
  unitProgress,
  useLog,
  useProgram,
} from '../program/progress';
import { type Block, type Plan, ROLE_LABELS, buildPlan, planMinutes } from '../program/session';
import { useSettings, useStored } from '../store';
import { totalWeeks } from '../program/curriculum';

const MINUTE_OPTIONS = [10, 20, 30, 45];
const WEEK_TARGET = 5;
const DAY_NAMES = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];

export const usePlan = () => useStored<Plan | null>('plan', null);

const roleIcon = (b: Block) => (b.type === 'guitar' ? 'guitar' : b.role === 'ripasso' ? 'review' : 'new');

export function blockTitle(b: Block): string {
  return b.type === 'guitar' ? b.activity.title : b.title;
}

export function blockSubtitle(b: Block): string {
  if (b.type === 'guitar') return 'con la chitarra';
  const ex = EXERCISES[b.exercise].title;
  if (b.role === 'ripasso') return `${b.maxQuestions} ${b.maxQuestions === 1 ? 'elemento' : 'elementi'} da ripassare`;
  return b.title === ex ? ex : `esercizio ${ex}`;
}

/** Elenco dei blocchi di una sessione, con quelli già fatti spuntati. */
export function BlockList({ plan }: { plan: Plan }) {
  return (
    <ol class="block-list">
      {plan.blocks.map((b, i) => {
        const done = i < plan.results.length;
        return (
          <li key={i} class={done ? 'done' : i === plan.results.length ? 'next' : ''}>
            <span class={`block-icon role-${b.role}`}>
              <Icon name={done ? 'program' : roleIcon(b)} size={18} />
            </span>
            <span class="block-text">
              <span class="block-role">{ROLE_LABELS[b.role]}</span>
              <span class="block-title">{blockTitle(b)}</span>
              <span class="block-sub">{blockSubtitle(b)}</span>
            </span>
            <span class="block-min">{b.minutes}′</span>
          </li>
        );
      })}
    </ol>
  );
}

export function Today() {
  const [settings, setSettings] = useSettings();
  const [program] = useProgram();
  const [log] = useLog();
  const [plan, setPlan] = usePlan();
  const today = todayKey();
  const unitIndex = currentUnitIndex(program);
  const unit = UNITS[unitIndex];

  // La sessione si ricostruisce ogni giorno, o se cambi durata prima di cominciare.
  const stale =
    !plan ||
    plan.date !== today ||
    (plan.results.length === 0 &&
      (plan.minutes !== settings.sessionMinutes ||
        plan.unitId !== unit.id ||
        (plan.withGuitar ?? true) !== settings.withGuitar));
  useEffect(() => {
    if (stale) setPlan(buildPlan(settings.sessionMinutes, program, Object.keys(log).length, settings.withGuitar));
  }, [stale, settings.sessionMinutes, settings.withGuitar]);

  const week = currentWeekDays();
  const doneThisWeek = week.filter((d) => log[d]?.completed).length;
  const delta = scheduleDelta(program);
  const progress = Math.round(unitProgress(unit) * 100);
  const started = plan && !stale && plan.results.length > 0;
  const finished = plan && !stale && plan.results.length >= plan.blocks.length;
  const dateLabel = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div class="page">
      <PageHead
        title="Oggi"
        sub={dateLabel}
        actions={
          <a href="#/impostazioni" class="icon-btn ghost" aria-label="Impostazioni" title="Impostazioni">
            <Icon name="settings" />
          </a>
        }
      />

      <section class="panel session-card">
        <div class="panel-row">
          <h2 class="panel-title">La sessione di oggi</h2>
          {plan && !stale && <span class="muted">{planMinutes(plan)} minuti</span>}
        </div>
        {!started && (
          <div class="minutes" role="radiogroup" aria-label="Tempo a disposizione">
            <span class="muted">Ho</span>
            {MINUTE_OPTIONS.map((m) => (
              <button
                key={m}
                role="radio"
                aria-checked={settings.sessionMinutes === m}
                class={`chip ${settings.sessionMinutes === m ? 'on' : ''}`}
                onClick={() => setSettings({ ...settings, sessionMinutes: m })}
              >
                {m} min
              </button>
            ))}
          </div>
        )}
        {!started && (
          <div class="minutes" role="radiogroup" aria-label="Chitarra">
            <span class="muted">Chitarra</span>
            {[
              { value: true, label: 'Con me' },
              { value: false, label: 'Non ce l’ho' },
            ].map((o) => (
              <button
                key={o.label}
                role="radio"
                aria-checked={settings.withGuitar === o.value}
                class={`chip ${settings.withGuitar === o.value ? 'on' : ''}`}
                onClick={() => setSettings({ ...settings, withGuitar: o.value })}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
        {!settings.withGuitar && (
          <p class="hint">Senza chitarra: solo quiz nell'app, le attività con lo strumento le recuperi quando torni.</p>
        )}
        {plan && !stale && <BlockList plan={plan} />}
        {finished ? (
          <div class="done-box">
            <p>
              <b>Sessione di oggi completata.</b> Domani si riparte da qui.
            </p>
            <button class="secondary" onClick={() => setPlan(buildPlan(10, program, Object.keys(log).length + 1, settings.withGuitar))}>
              Altri 10 minuti
            </button>
          </div>
        ) : (
          <a class="primary big" href="#/sessione">
            {started ? `Continua: blocco ${plan!.results.length + 1} di ${plan!.blocks.length}` : 'Inizia'}
          </a>
        )}
      </section>

      <section class="panel">
        <div class="panel-row">
          <h2 class="panel-title">Questa settimana</h2>
          <span class="muted">
            {doneThisWeek} di {WEEK_TARGET} sessioni
          </span>
        </div>
        <ol class="week">
          {week.map((d, i) => (
            <li key={d} class={`${log[d]?.completed ? 'done' : log[d] ? 'partial' : ''} ${d === today ? 'today' : ''}`}>
              <span class="dot" />
              <span>{DAY_NAMES[i]}</span>
            </li>
          ))}
        </ol>
      </section>

      <a class="panel unit-card" href="#/programma">
        <div class="panel-row">
          <h2 class="panel-title">Programma</h2>
          <span class={`status-chip ${delta >= 0 ? 'ok' : 'late'}`}>
            {delta === 0 ? 'in pari' : delta > 0 ? `avanti di ${delta} sett.` : `indietro di ${-delta} sett.`}
          </span>
        </div>
        <p class="muted small">
          Settimana {Math.min(programWeek(program), totalWeeks())} di {totalWeeks()} · unità {unitIndex + 1} di {UNITS.length} · {unit.block}
        </p>
        <p class="unit-title">{unit.title}</p>
        <div class="bar" aria-label={`Avanzamento ${progress}%`}>
          <span style={{ width: `${progress}%` }} />
        </div>
        <p class="muted small">
          {progress}% acquisito{unitHasFutureParts(unit) ? ' · alcune parti sono in arrivo' : ''}
        </p>
      </a>

      <p class="center">
        <a href="#/esercizi">Oppure scegli tu un esercizio</a>
      </p>
    </div>
  );
}
