import { useState } from 'preact/hooks';
import { Icon } from '../components/Icon';
import { PageHead } from '../components/Layout';
import { EXERCISES, isAvailable } from '../exercises/registry';
import { FUTURE_TITLES, PROGRAM_GOAL, UNITS, type FutureExercise, type Unit, totalWeeks } from '../program/curriculum';
import {
  type ProgramState,
  currentUnitIndex,
  programWeek,
  scheduleDelta,
  unitHasFutureParts,
  unitProgress,
  unitStartDate,
  unitStatus,
  useProgram,
} from '../program/progress';
import { useSettings } from '../store';

const fmtDate = (d: Date) => d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });

export function Program() {
  const [program, setProgram] = useProgram();
  const [settings] = useSettings();
  const current = currentUnitIndex(program);
  const [open, setOpen] = useState<string | null>(UNITS[current].id);
  const delta = scheduleDelta(program);
  const blocks = [...new Set(UNITS.map((u) => u.block))];

  return (
    <div class="page">
      <PageHead title="Programma" sub={PROGRAM_GOAL} />
      <section class="panel">
        <p>
          {totalWeeks()} settimane, 5 sessioni da {settings.sessionMinutes} minuti a settimana. Ogni unità ha quiz nell'app e
          attività con la chitarra; la sessione di <a href="#/">Oggi</a> le mescola con il ripasso.
        </p>
        <p class="muted small">
          Settimana {Math.min(programWeek(program), totalWeeks())} di {totalWeeks()} ·{' '}
          {delta === 0 ? 'in pari con il calendario' : delta > 0 ? `avanti di ${delta} settimane` : `indietro di ${-delta} settimane`}
          {program.focus && (
            <>
              {' · '}
              <button class="link-btn inline" onClick={() => setProgram({ ...program, focus: undefined })}>
                torna all'ordine automatico
              </button>
            </>
          )}
        </p>
      </section>

      {blocks.map((block) => (
        <section key={block} class="unit-block">
          <h2 class="section">{block}</h2>
          <ol class="units">
            {UNITS.map((u, i) => ({ u, i }))
              .filter(({ u }) => u.block === block)
              .map(({ u, i }) => (
                <UnitRow
                  key={u.id}
                  unit={u}
                  index={i}
                  program={program}
                  current={current}
                  open={open === u.id}
                  onToggle={() => setOpen(open === u.id ? null : u.id)}
                  setProgram={setProgram}
                />
              ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

function UnitRow({
  unit,
  index,
  program,
  current,
  open,
  onToggle,
  setProgram,
}: {
  unit: Unit;
  index: number;
  program: ProgramState;
  current: number;
  open: boolean;
  onToggle: () => void;
  setProgram: (p: ProgramState) => void;
}) {
  const status = unitStatus(unit, index, program, current);
  const progress = Math.round(unitProgress(unit) * 100);
  const markedDone = program.done.includes(unit.id);

  return (
    <li class={`unit unit-${status}`}>
      <button class="unit-head" onClick={onToggle} aria-expanded={open}>
        <span class="unit-mark" aria-hidden="true">
          {status === 'done' ? '✓' : index + 1}
        </span>
        <span class="unit-main">
          <span class="unit-title">{unit.title}</span>
          <span class="muted small">
            {unit.period} · {unit.weeks} sett. · dal {fmtDate(unitStartDate(program, index))}
            {status === 'current' && ' · in corso'}
            {unitHasFutureParts(unit) && ' · parti in arrivo'}
          </span>
          <span class="bar thin">
            <span style={{ width: `${progress}%` }} />
          </span>
        </span>
      </button>
      {open && (
        <div class="unit-body">
          <p>
            <b>Perché:</b> {unit.why}
          </p>
          <p>
            <b>Obiettivo:</b> {unit.goal}
          </p>
          <ul class="activities">
            {unit.activities.map((a, i) => {
              const available = a.type === 'guitar' || isAvailable(a.exercise);
              const icon = a.type === 'guitar' ? 'guitar' : isAvailable(a.exercise) ? EXERCISES[a.exercise].icon : 'new';
              const sub =
                a.type === 'guitar'
                  ? `con la chitarra · ${a.minutes} min`
                  : isAvailable(a.exercise)
                    ? EXERCISES[a.exercise].title
                    : `${FUTURE_TITLES[a.exercise as FutureExercise]} · in arrivo`;
              const inner = (
                <>
                  <Icon name={icon} size={18} />
                  <span>
                    {a.title}
                    <span class="muted small block">{sub}</span>
                  </span>
                </>
              );
              return (
                <li key={i} class={available ? '' : 'soon'}>
                  {available ? <a href={`#/attivita/${unit.id}/${i}`}>{inner}</a> : <span>{inner}</span>}
                </li>
              );
            })}
          </ul>
          <div class="row">
            {status !== 'current' && (
              <button class="secondary" onClick={() => setProgram({ ...program, focus: unit.id })}>
                Studia questa unità
              </button>
            )}
            {markedDone ? (
              <button class="secondary" onClick={() => setProgram({ ...program, done: program.done.filter((d) => d !== unit.id) })}>
                Riapri
              </button>
            ) : (
              <button
                class="secondary"
                onClick={() =>
                  setProgram({
                    ...program,
                    done: [...program.done, unit.id],
                    focus: program.focus === unit.id ? undefined : program.focus,
                  })
                }
              >
                Segna come completata
              </button>
            )}
          </div>
          <p class="muted small">
            L'unità si considera acquisita quando il 70% di quello che contiene è consolidato, cioè risposto bene più volte a
            distanza di giorni.
          </p>
        </div>
      )}
    </li>
  );
}
