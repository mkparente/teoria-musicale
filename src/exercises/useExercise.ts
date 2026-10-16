import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { pickNext, record } from '../srs/srs';
import { useSettings } from '../store';

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
 * Ciclo comune a tutti gli esercizi: sceglie l'elemento dal ripasso, misura il tempo,
 * registra l'esito e passa al successivo.
 */
export function useExercise<Q>(buildPool: () => string[], make: (id: string) => Q, configKey: string) {
  const [settings] = useSettings();
  const pool = useMemo(buildPool, [configKey]);
  const recent = useRef<string[]>([]);
  const [current, setCurrent] = useState<{ id: string; q: Q; start: number; n: number } | null>(null);
  const counter = useRef(0);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [session, setSession] = useState<Session>({ done: 0, correct: 0, streak: 0 });
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const next = () => {
    clearTimeout(timer.current);
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
    setSession((s) => ({
      done: s.done + 1,
      correct: s.correct + (correct ? 1 : 0),
      streak: correct ? s.streak + 1 : 0,
    }));
    if (correct && settings.autoAdvance) timer.current = window.setTimeout(next, 1100);
  };

  return { pool, current, outcome, session, error, next, finish };
}
