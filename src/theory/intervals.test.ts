import { describe, expect, it } from 'vitest';
import {
  INTERVAL_KEYS,
  identify,
  intervalBetween,
  intervalKey,
  intervalName,
  mainShape,
  noteAbove,
  plainAbove,
  semitones,
  shapeOffset,
  shapeUsable,
  shapeWords,
  intervalSpots,
} from './intervals';
import { type Note, type PitchClass, noteName, stackUp } from './notes';
import { soundingMidi } from './guitar';

const pc = (letter: number, acc = 0) => ({ letter, acc }) as PitchClass;
const n = (letter: number, acc: number, octave: number) => ({ letter, acc, octave }) as Note;
const name = (p: PitchClass) => noteName(p, 'it');

describe('intervalli', () => {
  it('semitoni di ogni intervallo', () => {
    expect(INTERVAL_KEYS.map((k) => semitones(k))).toEqual([1, 2, 3, 4, 5, 6, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('costruzione: la seconda nota ha la lettera giusta', () => {
    expect(name(noteAbove(pc(0), 'm3'))).toBe('Mi♭');
    expect(name(noteAbove(pc(0), 'M3'))).toBe('Mi');
    expect(name(noteAbove(pc(0), 'A4'))).toBe('Fa♯');
    expect(name(noteAbove(pc(0), 'd5'))).toBe('Sol♭');
    expect(name(noteAbove(pc(5), 'm3'))).toBe('Do');
    expect(name(noteAbove(pc(5), 'm7'))).toBe('Sol');
    expect(name(noteAbove(pc(2), 'm7'))).toBe('Re');
    expect(name(noteAbove(pc(6), 'M3'))).toBe('Re♯');
    expect(name(noteAbove(pc(3), 'A4'))).toBe('Si');
    expect(name(noteAbove(pc(6), 'd5'))).toBe('Fa');
    expect(name(noteAbove(pc(6, -1), 'M7'))).toBe('La');
    expect(name(noteAbove(pc(4), 'P8'))).toBe('Sol');
  });

  it('riconoscimento: numero dalle lettere, qualità dai semitoni', () => {
    expect(intervalBetween(pc(0), pc(2, -1))).toEqual({ number: 3, quality: 'm' });
    // Re♯ suona come Mi♭, ma Do → Re♯ è una 2ª aumentata.
    expect(intervalBetween(pc(0), pc(1, 1))).toEqual({ number: 2, quality: 'A' });
    expect(intervalName(intervalBetween(pc(0), pc(1, 1))!)).toBe('2ª aumentata');
    expect(intervalBetween(pc(3), pc(6))).toEqual({ number: 4, quality: 'A' });
    expect(intervalBetween(pc(6), pc(3))).toEqual({ number: 5, quality: 'd' });
    expect(intervalBetween(pc(2), pc(0))).toEqual({ number: 6, quality: 'm' });
    expect(intervalBetween(pc(5), pc(5))).toEqual({ number: 8, quality: 'P' });
    expect(intervalBetween(pc(0), pc(0, 1))).toEqual({ number: 8, quality: 'A' });
  });

  it('con le ottave: fuori dall\'ottava non si riconosce', () => {
    expect(identify(n(0, 0, 4), n(4, 0, 4))).toEqual({ number: 5, quality: 'P' });
    expect(identify(n(0, 0, 4), n(0, 0, 5))).toEqual({ number: 8, quality: 'P' });
    expect(identify(n(0, 0, 4), n(1, 0, 5))).toBeNull();
    expect(identify(n(4, 0, 4), n(0, 0, 4))).toBeNull();
  });

  it('costruire e riconoscere sono l\'uno l\'inverso dell\'altro', () => {
    const roots = [0, 1, 2, 3, 4, 5, 6].flatMap((l) => [pc(l), pc(l, 1), pc(l, -1)]);
    for (const root of roots) {
      for (const key of INTERVAL_KEYS) {
        if (!plainAbove(root, key)) continue;
        const above = noteAbove(root, key);
        const [lo, hi] = stackUp([root, above]);
        expect(intervalKey(identify(lo, hi)!), `${name(root)} ${key}`).toBe(key);
      }
    }
  });

  it('niente doppie alterazioni', () => {
    expect(plainAbove(pc(6), 'M3')).toBe(true); // Re♯
    expect(plainAbove(pc(6, 1), 'M3')).toBe(false); // Re♯♯
    expect(plainAbove(pc(3, -1), 'd5')).toBe(false); // Do♭♭
    expect(plainAbove(pc(3), 'd5')).toBe(true); // Do♭
  });
});

describe('intervalli sul manico', () => {
  it('disegni dalla 6ª alla 5ª corda', () => {
    expect(shapeOffset(3, 'next')).toBe(-2);
    expect(shapeOffset(4, 'next')).toBe(-1);
    expect(shapeOffset(5, 'next')).toBe(0);
    expect(shapeOffset(7, 'next')).toBe(2);
    expect(shapeWords(3, 6, 5)).toBe('dalla 6ª alla 5ª corda: due tasti indietro');
  });

  it('attraversando la corda Si il disegno si sposta di un tasto', () => {
    expect(shapeOffset(4, 'nextB')).toBe(0);
    expect(shapeOffset(10, 'skip')).toBe(0);
    expect(shapeOffset(10, 'skipB')).toBe(1);
  });

  it('il disegno corrisponde al suono reale', () => {
    // La al 5° tasto della 6ª corda: la 7ª minore (Sol) è al 5° tasto della 4ª.
    const la = soundingMidi({ string: 6, fret: 5 });
    expect(soundingMidi({ string: 4, fret: 5 }) - la).toBe(10);
    expect(soundingMidi({ string: 4, fret: 7 }) - la).toBe(12);
  });

  it('ogni intervallo ha un disegno principale comodo', () => {
    for (const k of INTERVAL_KEYS) {
      const s = semitones(k);
      const [lo, hi] = mainShape(s);
      const kind = lo === hi ? 'same' : hi === 5 ? 'next' : 'skip';
      expect(shapeUsable(s, kind), k).toBe(true);
    }
  });
});

describe('mappa degli intervalli', () => {
  const la = { string: 6, fret: 5 } as const; // La sulla 6ª corda
  const spots = (semis: number, root: { string: 1 | 2 | 3 | 4 | 5 | 6; fret: number } = la) =>
    intervalSpots(root, semis).map((p) => `${p.string}/${p.fret}`);

  it('dal La della 6ª corda: i punti fissi e gli intervalli del blues', () => {
    expect(spots(5)).toEqual(['5/5', '6/10']); // 4ª: stesso tasto sulla corda dopo
    expect(spots(12)).toEqual(['4/7']); // 8ª: due corde sopra, due tasti avanti (il 12° tasto della 5ª è troppo lontano)
    expect(spots(3)).toEqual(['5/3', '6/8']); // 3ª minore: due tasti prima della 4ª
    expect(spots(4)).toEqual(['5/4', '6/9']);
    expect(spots(7)).toEqual(['5/7', '4/2', '6/12']);
    expect(spots(10)).toEqual(['4/5', '6/15']); // 7ª minore: due corde sopra, stesso tasto
  });

  it('attraversando la corda Si il disegno si sposta di un tasto', () => {
    // La sulla 3ª corda (2° tasto): la 4ª sulla 2ª corda è al 3° tasto, non al 2°.
    expect(intervalSpots({ string: 3, fret: 2 }, 5)[0]).toEqual({ string: 2, fret: 3 });
  });

  it('mai note sulle corde più gravi, oltre due corde sopra o fuori dal manico', () => {
    const r = intervalSpots({ string: 1, fret: 12 }, 7);
    expect(r).toEqual([{ string: 1, fret: 19 }].filter((p) => p.fret <= 15));
    for (let s = 1; s <= 6; s++)
      for (let f = 0; f <= 12; f++)
        for (let semis = 1; semis <= 12; semis++)
          for (const p of intervalSpots({ string: s as 1, fret: f }, semis)) {
            expect(p.string).toBeLessThanOrEqual(s);
            expect(s - p.string).toBeLessThanOrEqual(2);
            expect(soundingMidi(p) - soundingMidi({ string: s as 1, fret: f })).toBe(semis);
          }
  });
});
