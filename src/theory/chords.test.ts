import { describe, expect, it } from 'vitest';
import { buildTriad, diatonicTriads, invert, plainTriad, romanFor, triadQuality } from './chords';
import { soundingMidi } from './guitar';
import { type PitchClass, noteName } from './notes';
import { CAGED_FORMS, STRING_SETS, cagedAlongNeck, cagedVoicing, formContaining, triadVoicing } from './positions';

const names = (pcs: PitchClass[]) => pcs.map((p) => noteName(p, 'it')).join(' ');
const pc = (letter: number, acc = 0) => ({ letter, acc }) as PitchClass;

describe('triadi', () => {
  it('costruzione', () => {
    expect(names(buildTriad(pc(0), 'maj'))).toBe('Do Mi Sol');
    expect(names(buildTriad(pc(3), 'min'))).toBe('Fa La♭ Do');
    expect(names(buildTriad(pc(6), 'dim'))).toBe('Si Re Fa');
    expect(names(buildTriad(pc(0), 'aug'))).toBe('Do Mi Sol♯');
    expect(names(buildTriad(pc(2, -1), 'maj'))).toBe('Mi♭ Sol Si♭');
  });

  it('doppie alterazioni escluse', () => {
    expect(plainTriad(pc(4, 1), 'maj')).toBe(true); // Sol♯ Si♯ Re♯
    expect(plainTriad(pc(2, 1), 'maj')).toBe(false); // Re♯ Fa♯♯ La♯
    expect(plainTriad(pc(6, 1), 'aug')).toBe(false); // Si♯ Re♯♯ Fa♯♯
  });

  it('riconoscimento e rivolti', () => {
    expect(triadQuality(buildTriad(pc(1), 'min'))).toBe('min');
    expect(names(invert(buildTriad(pc(0), 'maj'), 1))).toBe('Mi Sol Do');
    expect(names(invert(buildTriad(pc(0), 'maj'), 2))).toBe('Sol Do Mi');
  });

  it('triadi della scala', () => {
    const maj = diatonicTriads(pc(1), 'major').map((t) => `${romanFor(t.degree, t.quality)}=${noteName(t.root, 'it')}`);
    expect(maj.join(' ')).toBe('I=Re ii=Mi iii=Fa♯ IV=Sol V=La vi=Si vii°=Do♯');
    const harm = diatonicTriads(pc(5), 'harmonic').map((t) => romanFor(t.degree, t.quality));
    expect(harm.join(' ')).toBe('i ii° III+ iv V VI vii°');
  });
});

describe('chitarra: accordi', () => {
  const chord = (root: number, q: 'maj' | 'min') => {
    const third = q === 'maj' ? 4 : 3;
    return [root, (root + third) % 12, (root + 7) % 12];
  };

  it('forme CAGED di Do maggiore come gli accordi aperti', () => {
    const fmt = (f: (typeof CAGED_FORMS)[number]) =>
      cagedVoicing(0, 'maj', f)
        .map((p) => `${p.string}:${p.fret}`)
        .join(' ');
    expect(fmt('C')).toBe('5:3 4:2 3:0 2:1 1:0');
    expect(fmt('A')).toBe('5:3 4:5 3:5 2:5 1:3');
    expect(fmt('E')).toBe('6:8 5:10 4:10 3:9 2:8 1:8');
    expect(cagedAlongNeck(0, 'maj')).toEqual(['C', 'A', 'G', 'E', 'D']);
  });

  it('ogni forma e ogni triade contiene solo e tutte le note dell\'accordo', () => {
    for (let root = 0; root < 12; root++) {
      for (const q of ['maj', 'min'] as const) {
        const tones = chord(root, q);
        for (const f of CAGED_FORMS) {
          const v = cagedVoicing(root, q, f);
          const pcs = v.map((p) => soundingMidi(p) % 12);
          expect(new Set(pcs)).toEqual(new Set(tones));
          expect(Math.min(...v.map((p) => p.fret))).toBeGreaterThanOrEqual(0);
          expect(Math.max(...v.map((p) => p.fret)) - Math.min(...v.map((p) => p.fret))).toBeLessThanOrEqual(4);
        }
        for (const set of STRING_SETS) {
          for (let inv = 0; inv < 3; inv++) {
            const t = triadVoicing(tones as [number, number, number], set, inv);
            const midis = t.map(soundingMidi);
            expect(midis[0] % 12).toBe(tones[inv]);
            expect(midis[1]).toBeGreaterThan(midis[0]);
            expect(midis[2]).toBeGreaterThan(midis[1]);
            expect(new Set(midis.map((m) => m % 12))).toEqual(new Set(tones));
            expect(Math.max(...t.map((p) => p.fret)) - Math.min(...t.map((p) => p.fret))).toBeLessThanOrEqual(4);
          }
        }
      }
    }
  });

  it('una triade su 3 corde appartiene a una forma CAGED', () => {
    // Do maggiore, corde 3-2-1, stato fondamentale: Do5 Mi5 Sol5 → forma di La (tasti 5-5-3)
    const t = triadVoicing([0, 4, 7], STRING_SETS[0], 0);
    expect(t.map((p) => `${p.string}:${p.fret}`).join(' ')).toBe('3:5 2:5 1:3');
    expect(formContaining(t, 0, 'maj')).toBe('A');
  });
});
