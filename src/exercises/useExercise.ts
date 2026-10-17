import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { pickNext, record } from '../srs/srs';
import { useSettings, useStored } from '../store';

export interface Outcome {
  correct: boolean;
  ms: number;
}

export interface Session {
  done: number;
  correct: number;
  streak: number;
}

/**
 * Come si usa un esercizio dentro una sessione guidata. Senza queste proprietà
 * l'esercizio è "libero": usa le opzioni salvate e va avanti finché vuoi.
 */
export interface ExerciseProps<C> {
  /** Opzioni decise dal programma: prendono il posto di quelle salvate e nascondono il pannello. */
  config?: Partial<C>;
  /** Elementi da proporre al posto di quelli generati dalle opzioni (per il ripasso). */
  pool?: string[];
  /** Il blocco finisce a quest'ora (ms) o dopo questo numero di domande. */
  endsAt?: number;
  maxQuestions?: number;
  /** Chiamata quando il blocco finisce. Se c'è, l'esercizio è incorporato in una sessione. */
  onEnd?: (s: Session) => void;
  /** Titolo e pagina di ritorno, quando l'esercizio si apre da un'attività del programma. */
  title?: string;
  back?: string;
}

/** Opzioni dell'esercizio: quelle imposte dal programma, oppure quelle salvate dall'utente (modificabili). */
export function useExerciseConfig<C extends object>(
  key: string,
  defaults: C,
  override?: Partial<C>,
): [C, ((c: C) => void) | null] {
  const [saved, setSaved] = useStored<C>(key, defaults);
  if (override) return [{ ...defaults, ...override }, null];
  return [saved, setSaved];
}

/**
 * Ciclo comune a tutti gli esercizi: sceglie l'elemento dal ripasso, misura il tempo,
 * registra l'esito e passa al successivo, finché il blocco non finisce.
 */
export function useExercise<Q>(
  buildPool: () => string[],
  make: (id: string) => Q,
  configKey: string,
  run: Pick<ExerciseProps<unknown>, 'pool' | 'endsAt' | 'maxQuestions' | 'onEnd'> = {},
) {
  const [settings] = useSettings();
  const pool = useMemo(() => run.pool ?? buildPool(), [configKey, run.pool?.join(',')]);
  const recent = useRef<string[]>([]);
  const [current, setCurrent] = useState<{ id: string; q: Q; start: number; n: number } | null>(null);
  const counter = useRef(0);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [session, setSession] = useState<Session>({ done: 0, correct: 0, streak: 0 });
  const sessionRef = useRef(session);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const next = () => {
    clearTimeout(timer.current);
    const s = sessionRef.current;
    const over = (run.maxQuestions && s.done >= run.maxQuestions) || (run.endsAt && Date.now() >= run.endsAt);
    if (over && s.done > 0) {
      run.onEnd?.(s);
      return;
    }
    try {
      const id = pickNext(pool, recent.current);
      recent.current = [...recent.current.slice(-5), id];
      setCurrent({ id, q: make(id), start: performance.now(), n: ++counter.current });
      setOutcome(null);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
      setCurrent(null);
    }
  };

  useEffect(next, [pool]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const finish = (correct: boolean) => {
    if (!current || outcome) return;
    const ms = performance.now() - current.start;
    record(current.id, correct, ms);
    setOutcome({ correct, ms });
    const s = sessionRef.current;
    sessionRef.current = { done: s.done + 1, correct: s.correct + (correct ? 1 : 0), streak: correct ? s.streak + 1 : 0 };
    setSession(sessionRef.current);
    if (correct && settings.autoAdvance) timer.current = window.setTimeout(next, 1100);
  };

  return { pool, current, outcome, session, error, next, finish, embedded: !!run.onEnd };
}
