import { useEffect, useRef, useState } from 'preact/hooks';
import { GUITAR_PREFIX } from '../exercises/registry';
import type { GuitarActivity } from '../program/curriculum';
import { recordGrade } from '../srs/srs';
import { Figure } from './Figure';
import { Icon } from './Icon';

type Grade = 'good' | 'hard' | 'again';

const GRADES: { value: Grade; label: string; hint: string }[] = [
  { value: 'good', label: 'Bene', hint: 'pulito e senza pensarci troppo' },
  { value: 'hard', label: 'Così così', hint: 'ci sono arrivato, ma con fatica' },
  { value: 'again', label: 'Da rifare', hint: 'non mi è riuscito' },
];

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;

/**
 * Attività con la chitarra in mano: istruzioni, disegno, timer e autovalutazione.
 * Il voto va nel ripasso, così l'attività torna quando serve.
 */
export function GuitarActivityView({
  activity,
  minutes = activity.minutes,
  onDone,
  showTitle = true,
}: {
  activity: GuitarActivity;
  minutes?: number;
  onDone?: (grade: Grade) => void;
  /** Falso dentro la sessione, che mostra già il titolo del blocco. */
  showTitle?: boolean;
}) {
  const total = minutes * 60;
  const [left, setLeft] = useState(total);
  const [running, setRunning] = useState(false);
  const [graded, setGraded] = useState<Grade | null>(null);
  const started = useRef(Date.now());

  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => clearInterval(t);
  }, [running]);
  useEffect(() => {
    if (left === 0) setRunning(false);
  }, [left]);

  const grade = (g: Grade) => {
    recordGrade(GUITAR_PREFIX + activity.id, g, Date.now() - started.current);
    setGraded(g);
    onDone?.(g);
  };

  return (
    <div class="guitar-activity">
      <div class="ga-head">
        {showTitle && (
          <>
            <span class="role-chip role-chitarra">
              <Icon name="guitar" size={16} /> Chitarra in mano
            </span>
            <h2>{activity.title}</h2>
          </>
        )}
        {activity.bpm && <p class="hint">Metronomo a {activity.bpm} battiti al minuto (per ora usane uno esterno).</p>}
      </div>
      <ol class="steps">
        {activity.steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      {activity.figure && <Figure spec={activity.figure} />}

      <div class="timer">
        <span class={`timer-time ${left === 0 ? 'over' : ''}`}>{mmss(left)}</span>
        {left > 0 ? (
          <button class="secondary" onClick={() => setRunning(!running)}>
            {running ? 'Pausa' : left === total ? 'Avvia il timer' : 'Riprendi'}
          </button>
        ) : (
          <span class="hint">Tempo scaduto: come è andata?</span>
        )}
      </div>

      {graded ? (
        <p class="hint">Valutazione salvata: l'attività tornerà nel ripasso quando serve.</p>
      ) : (
        <div class="grades">
          <p class="hint">Come è andata?</p>
          <div class="grade-row">
            {GRADES.map((g) => (
              <button key={g.value} class={`grade grade-${g.value}`} onClick={() => grade(g.value)}>
                <b>{g.label}</b>
                <span>{g.hint}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
