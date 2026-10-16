import { load, save } from '../store';

// Ripasso a scatole (metodo Leitner). Ogni elemento sale di scatola quando lo indovini
// e torna alla prima quando lo sbagli; più alta è la scatola, più tardi torna.

export interface ItemState {
  box: number;
  due: number;
  seen: number;
  correct: number;
  totalMs: number;
  last: number;
}

export type Db = Record<string, ItemState>;

const KEY = 'srs';
const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** Attesa dopo una risposta giusta, per scatola raggiunta (1..7). */
const INTERVALS = [0, 1 * MIN, 10 * MIN, 1 * HOUR, 1 * DAY, 3 * DAY, 8 * DAY, 21 * DAY];
export const MAX_BOX = INTERVALS.length - 1;
/** Un elemento sbagliato torna quasi subito, dopo qualche altra domanda. */
const RETRY_DELAY = 20 * SEC;
/** Da questa scatola in su un elemento si considera imparato. */
export const MASTERED_BOX = 4;
/** Quanti elementi "in apprendimento" tenere aperti prima di introdurne di nuovi. */
const MAX_LEARNING = 6;

let db: Db = load<Db>(KEY, {});

export const getDb = () => db;
export const getItem = (id: string): ItemState | undefined => db[id];

export function record(id: string, correct: boolean, ms: number) {
  const now = Date.now();
  const prev = db[id] ?? { box: 0, due: now, seen: 0, correct: 0, totalMs: 0, last: now };
  const box = correct ? Math.min(prev.box + 1, MAX_BOX) : 0;
  db = {
    ...db,
    [id]: {
      box,
      due: now + (correct ? INTERVALS[box] : RETRY_DELAY),
      seen: prev.seen + 1,
      correct: prev.correct + (correct ? 1 : 0),
      totalMs: prev.totalMs + Math.min(ms, 60 * SEC),
      last: now,
    },
  };
  save(KEY, db);
}

export function resetPrefix(prefix: string) {
  db = Object.fromEntries(Object.entries(db).filter(([k]) => !k.startsWith(prefix)));
  save(KEY, db);
}

export function reloadDb() {
  db = load<Db>(KEY, {});
}

const pickAmong = <T,>(xs: T[], n: number) => xs[Math.floor(Math.random() * Math.min(n, xs.length))];

/**
 * Sceglie il prossimo elemento. `pool` è ordinato dal più facile al più difficile:
 * gli elementi nuovi vengono introdotti in quell'ordine.
 */
export function pickNext(pool: string[], recent: string[]): string {
  if (pool.length === 0) throw new Error('Nessun esercizio disponibile con queste impostazioni');
  const now = Date.now();
  const avoid = new Set(recent.slice(-Math.min(3, pool.length - 1)));
  const candidates = pool.filter((id) => !avoid.has(id));

  const seen = candidates.filter((id) => db[id]);
  const due = seen
    .filter((id) => db[id].due <= now)
    .sort((a, b) => db[a].box - db[b].box || db[a].due - db[b].due);
  if (due.length) return pickAmong(due, 3);

  const learning = seen.filter((id) => db[id].box <= 1);
  const fresh = candidates.filter((id) => !db[id]);
  if (fresh.length && learning.length < MAX_LEARNING) return fresh[0];

  // Niente in scadenza: si anticipa il ripasso di ciò che scade prima.
  const ahead = [...seen].sort((a, b) => db[a].due - db[b].due);
  if (ahead.length) return pickAmong(ahead, 3);
  return fresh[0] ?? pool[0];
}

/** Mescola ogni livello di difficoltà e li concatena, dal più facile. */
export function tiered(tiers: string[][]): string[] {
  return tiers.flatMap((t) => shuffle(t));
}

export function shuffle<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function poolStats(pool: string[]) {
  const now = Date.now();
  let seen = 0, mastered = 0, due = 0, attempts = 0, correct = 0;
  for (const id of pool) {
    const s = db[id];
    if (!s) continue;
    seen++;
    if (s.box >= MASTERED_BOX) mastered++;
    if (s.due <= now) due++;
    attempts += s.seen;
    correct += s.correct;
  }
  return { total: pool.length, seen, mastered, due, attempts, correct };
}
