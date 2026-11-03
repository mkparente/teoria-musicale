import { describe, expect, it } from 'vitest';
import { activityPool, isAvailable } from '../exercises/registry';
import { UNITS, totalWeeks } from './curriculum';
import { DEFAULT_PROGRAM, currentUnitIndex, unitIsWaiting, unitItems } from './progress';
import { buildPlan, planMinutes } from './session';

describe('programma', () => {
  it('copre da ottobre 2026 a fine agosto 2027', () => {
    expect(totalWeeks()).toBeGreaterThanOrEqual(40);
    expect(totalWeeks()).toBeLessThanOrEqual(46);
  });

  it('ogni attività è valida', () => {
    const ids = new Set<string>();
    for (const u of UNITS) {
      expect(u.activities.some((a) => a.type === 'guitar')).toBe(true);
      for (const a of u.activities) {
        if (a.type === 'guitar') {
          expect(ids.has(a.id)).toBe(false);
          ids.add(a.id);
          expect(a.steps.length).toBeGreaterThan(0);
        } else if (isAvailable(a.exercise)) {
          // Le opzioni dell'attività devono generare domande, e non troppe per un'unità.
          const pool = activityPool(a.exercise, a.config);
          expect(pool.length, `${u.id} ${a.title}`).toBeGreaterThan(0);
          expect(pool.length, `${u.id} ${a.title}`).toBeLessThan(400);
        }
      }
      expect(unitItems(u).length).toBeGreaterThan(0);
    }
  });

  it('al primo giorno si parte dalla prima unità', () => {
    expect(currentUnitIndex(DEFAULT_PROGRAM)).toBe(0);
  });

  it('la sessione rispetta il tempo a disposizione', () => {
    for (const minutes of [10, 20, 30, 45]) {
      const plan = buildPlan(minutes, DEFAULT_PROGRAM, 0);
      expect(plan.blocks.length).toBeGreaterThan(0);
      expect(planMinutes(plan)).toBeLessThanOrEqual(minutes + 2);
      expect(planMinutes(plan)).toBeGreaterThanOrEqual(minutes - 3);
      if (minutes >= 15) expect(plan.blocks.some((b) => b.type === 'guitar')).toBe(true);
      // Nessun blocco di quiz supera i 5 minuti.
      for (const b of plan.blocks) if (b.type === 'quiz') expect(b.minutes).toBeLessThanOrEqual(5);
    }
  });

  it('senza chitarra la sessione è fatta solo di quiz, nello stesso tempo', () => {
    for (const minutes of [10, 20, 30, 45]) {
      const plan = buildPlan(minutes, DEFAULT_PROGRAM, 0, false);
      expect(plan.blocks.every((b) => b.type === 'quiz')).toBe(true);
      expect(planMinutes(plan)).toBeLessThanOrEqual(minutes + 2);
      expect(planMinutes(plan)).toBeGreaterThanOrEqual(minutes - 3);
    }
  });
});

describe('unità in attesa', () => {
  it("un'unità senza quiz disponibili viene saltata e la sua chitarra resta in sessione", () => {
    // Con le prime otto unità completate, la 9 (accordi di settima e blues in 12 battute, non ancora pronti) va saltata.
    const u09 = UNITS.findIndex((u) => u.id === 'u09');
    expect(unitIsWaiting(UNITS[u09])).toBe(true);
    const state = { ...DEFAULT_PROGRAM, done: UNITS.slice(0, u09).map((u) => u.id) };
    const current = currentUnitIndex(state);
    expect(current).toBeGreaterThan(u09);
    expect(unitIsWaiting(UNITS[current])).toBe(false);
    const plan = buildPlan(20, state, 0);
    expect(plan.blocks.some((b) => b.type === 'guitar' && b.unitId === 'u09')).toBe(true);
  });

  it('gli intervalli sono pronti: dopo le prime tre unità si studia la 4', () => {
    const state = { ...DEFAULT_PROGRAM, done: ['u01', 'u02', 'u03'] };
    expect(UNITS[currentUnitIndex(state)].id).toBe('u04');
  });
});
