import { EXERCISE_LIST, GUITAR_PREFIX, isAvailable } from '../exercises/registry';
import { getDb } from '../srs/srs';
import { type ExerciseKey, type GuitarActivity, type QuizActivity, UNITS } from './curriculum';
import { type ProgramState, currentUnitIndex, todayKey } from './progress';

export type Block =
  | {
      type: 'quiz';
      role: 'ripasso' | 'nuovo' | 'consolida';
      exercise: ExerciseKey;
      title: string;
      minutes: number;
      config?: Record<string, unknown>;
      pool?: string[];
      maxQuestions?: number;
    }
  | { type: 'guitar'; role: 'chitarra'; unitId: string; activity: GuitarActivity; minutes: number };

export interface BlockResult {
  answered: number;
  correct: number;
}

/** La sessione di un giorno: si costruisce una volta e si riprende se la interrompi. */
export interface Plan {
  date: string;
  minutes: number;
  /** Falso quando sei senza chitarra: niente blocchi con lo strumento. */
  withGuitar: boolean;
  unitId: string;
  blocks: Block[];
  results: BlockResult[];
}

export const ROLE_LABELS: Record<Block['role'], string> = {
  ripasso: 'Ripasso',
  nuovo: 'Nuovo',
  consolida: 'Consolidamento',
  chitarra: 'Chitarra in mano',
};

/** Secondi per domanda: tempo medio di risposta in quell'esercizio più la lettura della correzione. */
function secondsPerQuestion(prefix: string): number {
  const items = Object.entries(getDb()).filter(([k]) => k.startsWith(prefix));
  const seen = items.reduce((s, [, v]) => s + v.seen, 0);
  const ms = items.reduce((s, [, v]) => s + v.totalMs, 0);
  return (seen ? ms / seen / 1000 : 8) + 4;
}

const isGuitarDue = (id: string) => {
  const s = getDb()[GUITAR_PREFIX + id];
  return !s || s.due <= Date.now();
};

/** Un blocco di quiz non dura più di così: meglio più blocchi brevi e vari. */
export const MAX_QUIZ_MINUTES = 5;

type AvailableQuiz = QuizActivity & { exercise: ExerciseKey };
const quizzesOf = (unitIndex: number) =>
  UNITS[unitIndex].activities.filter((a): a is AvailableQuiz => a.type === 'quiz' && isAvailable(a.exercise));

/**
 * Compone la sessione: un po' di ripasso degli elementi in scadenza, la parte nuova
 * dell'unità corrente e, se hai la chitarra con te, un'attività con lo strumento.
 * `day` serve a far ruotare le attività da un giorno all'altro.
 */
export function buildPlan(minutes: number, state: ProgramState, day: number, withGuitar = true): Plan {
  const now = Date.now();
  const db = getDb();
  const unitIndex = currentUnitIndex(state);
  const unit = UNITS[unitIndex];
  const blocks: Block[] = [];

  // 1. Ripasso: gli esercizi con più elementi in scadenza.
  const due = EXERCISE_LIST.map((e) => ({
    e,
    ids: Object.entries(db)
      .filter(([k, v]) => k.startsWith(e.prefix) && v.due <= now)
      .sort(([, a], [, b]) => a.box - b.box)
      .map(([k]) => k),
  }))
    .filter((d) => d.ids.length > 0)
    .sort((a, b) => b.ids.length - a.ids.length);
  let reviewBudget = due.length ? (minutes >= 15 ? Math.round(minutes * 0.25) : Math.min(3, minutes - 3)) : 0;
  const reviewGroups = due.slice(0, reviewBudget >= 4 ? 2 : 1);
  let reviewUsed = 0;
  for (const g of reviewGroups) {
    const share = Math.max(2, Math.round(reviewBudget / reviewGroups.length));
    const max = Math.max(1, Math.floor((share * 60) / secondsPerQuestion(g.e.prefix)));
    const questions = Math.min(g.ids.length, max);
    const mins = Math.max(1, Math.round((questions * secondsPerQuestion(g.e.prefix)) / 60));
    reviewUsed += mins;
    blocks.push({
      type: 'quiz',
      role: 'ripasso',
      exercise: g.e.key,
      title: g.e.title,
      minutes: mins,
      pool: g.ids,
      maxQuestions: questions,
    });
  }
  reviewBudget = reviewUsed;

  // 2. Chitarra in mano: prima le attività dell'unità mai fatte o da rivedere,
  //    a giorni alterni un ripasso di un'unità precedente se ce n'è uno in scadenza.
  let guitar: { activity: GuitarActivity; unitId: string } | null = null;
  if (withGuitar && minutes >= 15) {
    const own = unit.activities.filter((a): a is GuitarActivity => a.type === 'guitar');
    const previous = UNITS.slice(0, unitIndex).flatMap((u) =>
      u.activities.filter((a): a is GuitarActivity => a.type === 'guitar').map((activity) => ({ activity, unitId: u.id })),
    );
    const prevDue = previous.filter((p) => isGuitarDue(p.activity.id) && db[GUITAR_PREFIX + p.activity.id]);
    const ownSorted = [...own].sort(
      (a, b) => (db[GUITAR_PREFIX + a.id]?.last ?? 0) - (db[GUITAR_PREFIX + b.id]?.last ?? 0),
    );
    if (prevDue.length && day % 2 === 1) guitar = prevDue[day % prevDue.length];
    else if (ownSorted.length) guitar = { activity: ownSorted[0], unitId: unit.id };
    else if (prevDue.length) guitar = prevDue[0];
  }
  const guitarMinutes = guitar ? Math.min(guitar.activity.minutes, Math.round(minutes * 0.35)) : 0;

  // 3. Nuovo: i quiz dell'unità a rotazione, in blocchi brevi. Se il tempo avanza,
  //    si consolidano i quiz delle unità precedenti; solo in mancanza di quelli si ripete.
  const remaining = Math.max(3, minutes - reviewBudget - guitarMinutes);
  const chunks = Math.max(1, Math.ceil(remaining / MAX_QUIZ_MINUTES));
  const own = quizzesOf(unitIndex);
  const rotated = own.map((_, i) => own[(day + i) % own.length]);
  const previous: AvailableQuiz[] = [];
  for (let i = unitIndex - 1; i >= 0; i--) previous.push(...quizzesOf(i));
  const sequence: { a: AvailableQuiz; role: 'nuovo' | 'consolida' }[] = [
    ...rotated.map((a) => ({ a, role: 'nuovo' as const })),
    ...previous.map((a) => ({ a, role: 'consolida' as const })),
  ];
  for (let i = 0; i < chunks && sequence.length; i++) {
    const { a, role } = sequence[i % sequence.length];
    // Il tempo si divide in parti uguali; i primi blocchi prendono i minuti che avanzano.
    const mins = Math.floor(remaining / chunks) + (i < remaining % chunks ? 1 : 0);
    const again = i >= sequence.length ? ' · secondo giro' : '';
    blocks.push({ type: 'quiz', role, exercise: a.exercise, title: a.title + again, minutes: mins, config: a.config });
  }

  if (guitar) blocks.push({ type: 'guitar', role: 'chitarra', unitId: guitar.unitId, activity: guitar.activity, minutes: guitarMinutes });

  return { date: todayKey(), minutes, withGuitar, unitId: unit.id, blocks, results: [] };
}

export const planMinutes = (p: Plan) => p.blocks.reduce((s, b) => s + b.minutes, 0);
