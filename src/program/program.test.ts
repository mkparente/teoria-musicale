import { describe, expect, it } from 'vitest';
import { activityPool, isAvailable } from '../exercises/registry';
import { UNITS, totalWeeks } from './curriculum';
import { DEFAULT_PROGRAM, currentUnitIndex, unitItems } from './progress';
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
    }
  });
});
