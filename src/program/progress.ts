import { GUITAR_PREFIX, activityPool, isAvailable } from '../exercises/registry';
import { getDb } from '../srs/srs';
import { load, save, useStored } from '../store';
import { PROGRAM_START, UNITS, type Unit } from './curriculum';

/** Stato del programma deciso dall'utente. */
export interface ProgramState {
  /** Data di inizio (AAAA-MM-GG): da qui si calcola dove "dovresti" essere. */
  start: string;
  /** Unità segnate a mano come completate. */
  done: string[];
  /** Unità scelta a mano su cui concentrarsi, al posto di quella calcolata. */
  focus?: string;
}

export const DEFAULT_PROGRAM: ProgramState = { start: PROGRAM_START, done: [] };
export const useProgram = () => useStored<ProgramState>('program', DEFAULT_PROGRAM);
export const loadProgram = () => load<ProgramState>('program', DEFAULT_PROGRAM);

/** Da questa quota l'unità si considera acquisita. */
export const UNIT_THRESHOLD = 0.7;
/** Scatola da cui un elemento conta come consolidato (risposto bene più volte, a distanza di tempo). */
const SOLID_BOX = 3;
const SOLID_BOX_GUITAR = 2;

/** Gli elementi di ripasso che misurano un'unità: quiz disponibili e attività con la chitarra. */
export function unitItems(unit: Unit): string[] {
  const ids = new Set<string>();
  for (const a of unit.activities) {
    if (a.type === 'guitar') ids.add(GUITAR_PREFIX + a.id);
    else if (isAvailable(a.exercise)) activityPool(a.exercise, a.config).forEach((id) => ids.add(id));
  }
  return [...ids];
}

export const isSolid = (id: string) =>
  (getDb()[id]?.box ?? 0) >= (id.startsWith(GUITAR_PREFIX) ? SOLID_BOX_GUITAR : SOLID_BOX);

/** Quanti elementi dell'unità sono consolidati e quanti ne servono per considerarla acquisita. */
export function unitCounts(unit: Unit): { solid: number; total: number; needed: number } {
  const items = unitItems(unit);
  return {
    solid: items.filter(isSolid).length,
    total: items.length,
    needed: Math.ceil(items.length * UNIT_THRESHOLD),
  };
}

export function unitProgress(unit: Unit): number {
  const { solid, total } = unitCounts(unit);
  return total ? solid / total : 0;
}

export const unitHasFutureParts = (unit: Unit) =>
  unit.activities.some((a) => a.type === 'quiz' && !isAvailable(a.exercise));

/** Un'unità i cui quiz non esistono ancora resta "in attesa": si va avanti e la si riprende quando arrivano. */
export const unitIsWaiting = (unit: Unit) =>
  !unit.activities.some((a) => a.type === 'quiz' && isAvailable(a.exercise));

export type UnitStatus = 'done' | 'current' | 'todo' | 'waiting';

const isAcquired = (unit: Unit, state: ProgramState) =>
  state.done.includes(unit.id) || unitProgress(unit) >= UNIT_THRESHOLD;

/** L'unità su cui lavorare: quella scelta a mano, oppure la prima non ancora acquisita che si può studiare. */
export function currentUnitIndex(state: ProgramState): number {
  if (state.focus) {
    const i = UNITS.findIndex((u) => u.id === state.focus);
    if (i >= 0) return i;
  }
  const i = UNITS.findIndex((u) => !isAcquired(u, state) && !unitIsWaiting(u));
  return i < 0 ? UNITS.length - 1 : i;
}

/** Unità saltate perché in attesa, prima di quella corrente: le loro attività con la chitarra restano valide. */
export function waitingUnitsBefore(state: ProgramState): Unit[] {
  return UNITS.slice(0, currentUnitIndex(state)).filter((u) => !isAcquired(u, state) && unitIsWaiting(u));
}

export function unitStatus(unit: Unit, index: number, state: ProgramState, current: number): UnitStatus {
  if (index === current) return 'current';
  if (isAcquired(unit, state)) return 'done';
  if (unitIsWaiting(unit)) return 'waiting';
  return 'todo';
}

const DAY = 24 * 3600 * 1000;
export const todayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parseDay = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** Settimana del programma (1 = la prima), secondo il calendario. */
export function programWeek(state: ProgramState, now = new Date()): number {
  return Math.max(1, Math.floor((now.getTime() - parseDay(state.start).getTime()) / (7 * DAY)) + 1);
}

/** Settimana di inizio prevista per ogni unità. */
export function unitStartWeeks(): number[] {
  let w = 1;
  return UNITS.map((u) => {
    const start = w;
    w += u.weeks;
    return start;
  });
}

/** Data prevista di inizio di un'unità, per il calendario. */
export function unitStartDate(state: ProgramState, index: number): Date {
  return new Date(parseDay(state.start).getTime() + (unitStartWeeks()[index] - 1) * 7 * DAY);
}

/**
 * Confronto con il calendario, in settimane: positivo = avanti, negativo = indietro.
 * Si misura dove sei nell'unità corrente rispetto a dove dovresti essere.
 */
export function scheduleDelta(state: ProgramState, now = new Date()): number {
  const starts = unitStartWeeks();
  const cur = currentUnitIndex(state);
  const myWeek = starts[cur] + unitProgress(UNITS[cur]) * UNITS[cur].weeks;
  return Math.round(myWeek - programWeek(state, now));
}

// ── Registro delle sessioni ──

export interface DayLog {
  minutes: number;
  completed: boolean;
}

export const useLog = () => useStored<Record<string, DayLog>>('log', {});

export function logSession(minutes: number, completed: boolean) {
  const log = load<Record<string, DayLog>>('log', {});
  const today = todayKey();
  const prev = log[today];
  save('log', { ...log, [today]: { minutes: (prev?.minutes ?? 0) + minutes, completed: completed || !!prev?.completed } });
}

/** I sette giorni della settimana corrente, da lunedì. */
export function currentWeekDays(now = new Date()): string[] {
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return todayKey(d);
  });
}
