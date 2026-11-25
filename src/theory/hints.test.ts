import { describe, expect, it } from 'vitest';
import { soundingMidi } from './guitar';
import { intervalInPosition, scaleInPosition } from './hints';

const MAJOR = [0, 2, 4, 5, 7, 9, 11, 12];
const PENT_MINOR = [0, 3, 5, 7, 10, 12];
const at = (p: { string: number; fret: number }) => `${p.string}/${p.fret}`;

describe('scala in una posizione', () => {
  it('Sol maggiore dalla 6ª corda, 3° tasto: la posizione classica', () => {
    const r = scaleInPosition(7, MAJOR);
    expect(r.notes.map(at)).toEqual(['6/3', '6/5', '5/2', '5/3', '5/5', '4/2', '4/4', '4/5']);
    expect(r).toMatchObject({ from: 0, to: 6 });
  });

  it('Si♭ maggiore: tonica sulla 6ª al 6° tasto, finestra di pochi tasti', () => {
    const r = scaleInPosition(10, MAJOR);
    expect(at(r.notes[0])).toBe('6/6');
    expect(at(r.notes[4])).toBe('5/8'); // il Fa, V grado
    expect(r.from).toBeGreaterThanOrEqual(4);
    expect(r.to - r.from).toBeLessThanOrEqual(6);
  });

  it('Mi (a vuoto sulla 6ª): si parte dalla 5ª corda, 7° tasto', () => {
    expect(at(scaleInPosition(4, MAJOR).notes[0])).toBe('5/7');
  });

  it('pentatonica minore di La: il box 1', () => {
    expect(scaleInPosition(9, PENT_MINOR).notes.map(at)).toEqual(['6/5', '6/8', '5/5', '5/7', '4/5', '4/7']);
  });

  it('ogni nota ha l\'altezza giusta, per tutte le toniche', () => {
    for (let t = 0; t < 12; t++) {
      const r = scaleInPosition(t, MAJOR);
      const root = soundingMidi(r.notes[0]);
      r.notes.forEach((p, i) => expect(soundingMidi(p) - root, `tonica ${t}, grado ${i}`).toBe(MAJOR[i]));
    }
  });
});

describe('intervallo nel disegno principale', () => {
  it('3ª minore sopra La: dalla 6ª alla 5ª corda, due tasti indietro', () => {
    expect(intervalInPosition(9, 3).notes.map(at)).toEqual(['6/5', '5/3']);
  });

  it('7ª minore sopra La: due corde sopra, stesso tasto', () => {
    expect(intervalInPosition(9, 10).notes.map(at)).toEqual(['6/5', '4/5']);
  });

  it('sopra il Mi: la fondamentale non resta a vuoto', () => {
    expect(intervalInPosition(4, 3).notes.map(at)).toEqual(['6/12', '5/10']);
  });

  it('suono giusto per ogni fondamentale e intervallo', () => {
    for (let r = 0; r < 12; r++)
      for (let s = 1; s <= 12; s++) {
        const [a, b] = intervalInPosition(r, s).notes;
        expect(soundingMidi(b) - soundingMidi(a)).toBe(s);
        expect(Math.min(a.fret, b.fret)).toBeGreaterThanOrEqual(1);
      }
  });
});
