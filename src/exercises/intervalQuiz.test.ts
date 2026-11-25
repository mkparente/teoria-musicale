import { describe, expect, it } from 'vitest';
import { DEFAULT, buildPool, referenceTip } from './IntervalQuiz';

describe('Trova sul manico', () => {
  const pool = buildPool({ ...DEFAULT, kinds: ['find'] });

  it('si comincia dalle terze, dalla 5ª e dall\'8ª; la corda Si arriva dopo le altre corde', () => {
    const first = pool.slice(0, 8);
    expect(first.every((id) => /^iv:find:(M3|m3|P5|P8):/.test(id))).toBe(true);
    const firstB = pool.findIndex((id) => /:(nextB|skipB)$/.test(id));
    const lastPlainOfGroup0 = Math.max(...pool.map((id, i) => (/^iv:find:(M3|m3|P5|P8):(same|next|skip)$/.test(id) ? i : -1)));
    expect(firstB).toBeGreaterThan(lastPlainOfGroup0);
  });

  it('ogni intervallo ha almeno un disegno su corde diverse', () => {
    for (const c of ['m2', 'M2', 'm3', 'M3', 'P4', 'TT', 'P5', 'm6', 'M6', 'm7', 'M7', 'P8']) {
      expect(pool.some((id) => id.startsWith(`iv:find:${c}:`) && !id.endsWith(':same')), c).toBe(true);
    }
  });

  it('la correzione ragiona dai punti fissi', () => {
    const la6 = { string: 6, fret: 5 } as const;
    expect(referenceTip({ choice: 'm3', shape: 'next', lower: la6, upper: { string: 5, fret: 3 } })).toBe(
      'Riferimento: la 4ª è sulla corda dopo, allo stesso tasto (la nota tratteggiata); la 3ª minore è due tasti prima.',
    );
    expect(referenceTip({ choice: 'm7', shape: 'skip', lower: la6, upper: { string: 4, fret: 5 } })).toBe(
      'Riferimento: l’8ª è due corde sopra, due tasti avanti (la nota tratteggiata); la 7ª minore è due tasti prima.',
    );
    // Dalla 3ª alla 2ª corda (Sol → Si) la 4ª è un tasto avanti.
    expect(referenceTip({ choice: 'M3', shape: 'nextB', lower: { string: 3, fret: 2 }, upper: { string: 2, fret: 2 } })).toBe(
      'Riferimento: la 4ª è sulla corda dopo, un tasto avanti (la nota tratteggiata); la 3ª maggiore è un tasto prima. Attraverso la corda Si tutto si sposta di un tasto in avanti.',
    );
    expect(referenceTip({ choice: 'P5', shape: 'same', lower: la6, upper: { string: 6, fret: 12 } })).toBeNull();
  });
});
