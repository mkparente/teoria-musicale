import { describe, expect, it } from 'vitest';
import { commonSpellings, midi, noteName, parsePcKey, pcKey, pitchClass, type PitchClass } from './notes';
import {
  MAJOR_TONICS,
  MINOR_TONICS,
  buildScale,
  degreeFunction,
  degreeLabel,
  degreeName,
  keySignature,
  relativeMajor,
  relativeMinor,
  scaleNotes,
  signatureAccidentals,
  stepPattern,
  tonicFromSignature,
  vexKeySpec,
} from './scales';
import { positionsOf, soundingMidi } from './guitar';
import { pentatonicBox } from './positions';

const names = (pcs: PitchClass[]) => pcs.map((p) => noteName(p, 'it')).join(' ');
const tonic = (letter: number, acc = 0) => ({ letter, acc }) as PitchClass;

describe('scale', () => {
  it('maggiori', () => {
    expect(names(buildScale(tonic(0), 'major'))).toBe('Do Re Mi Fa Sol La Si');
    expect(names(buildScale(tonic(5), 'major'))).toBe('La Si Do♯ Re Mi Fa♯ Sol♯');
    expect(names(buildScale(tonic(2, -1), 'major'))).toBe('Mi♭ Fa Sol La♭ Si♭ Do Re');
    expect(names(buildScale(tonic(0, -1), 'major'))).toBe('Do♭ Re♭ Mi♭ Fa♭ Sol♭ La♭ Si♭');
  });

  it('il 5° grado di La maggiore è Mi', () => {
    expect(noteName(buildScale(tonic(5), 'major')[4], 'it')).toBe('Mi');
  });

  it('minori', () => {
    expect(names(buildScale(tonic(5), 'natural'))).toBe('La Si Do Re Mi Fa Sol');
    expect(names(buildScale(tonic(5), 'harmonic'))).toBe('La Si Do Re Mi Fa Sol♯');
    expect(names(buildScale(tonic(5), 'melodic'))).toBe('La Si Do Re Mi Fa♯ Sol♯');
    expect(names(buildScale(tonic(4, 1), 'harmonic'))).toBe('Sol♯ La♯ Si Do♯ Re♯ Mi Fa♯♯');
    expect(names(buildScale(tonic(0), 'harmonic'))).toBe('Do Re Mi♭ Fa Sol La♭ Si');
  });

  it('melodica discendente = naturale', () => {
    const down = scaleNotes(tonic(5), 'melodic', 4, true).map((n) => noteName(n, 'it'));
    expect(down.join(' ')).toBe('La Sol Fa Mi Re Do Si La');
  });

  it('le ottave salgono correttamente', () => {
    const notes = scaleNotes(tonic(5), 'major', 4);
    expect(notes[0]).toEqual({ letter: 5, acc: 0, octave: 4 });
    expect(notes[2]).toEqual({ letter: 0, acc: 1, octave: 5 });
    expect(notes[7].octave).toBe(5);
  });
});

describe('armature', () => {
  it('tutte le tonalità maggiori e minori hanno armature distinte da -7 a 7', () => {
    const maj = MAJOR_TONICS.map((t) => keySignature(t, 'major')).sort((a, b) => a - b);
    const min = MINOR_TONICS.map((t) => keySignature(t, 'minor')).sort((a, b) => a - b);
    const range = Array.from({ length: 15 }, (_, i) => i - 7);
    expect(maj).toEqual(range);
    expect(min).toEqual(range);
  });

  it('esempi', () => {
    expect(keySignature(tonic(2, -1), 'major')).toBe(-3);
    expect(keySignature(tonic(3, 1), 'minor')).toBe(3);
    expect(names(signatureAccidentals(3))).toBe('Fa♯ Do♯ Sol♯');
    expect(names(signatureAccidentals(-2))).toBe('Si♭ Mi♭');
    expect(noteName(tonicFromSignature(-4, 'major'), 'it')).toBe('La♭');
    expect(vexKeySpec(-6)).toBe('Gb');
  });

  it('relative', () => {
    expect(noteName(relativeMinor(tonic(3)), 'it')).toBe('Re');
    expect(noteName(relativeMajor(tonic(1, 1)), 'it')).toBe('Fa♯');
    for (const t of MAJOR_TONICS) {
      expect(keySignature(relativeMinor(t), 'minor')).toBe(keySignature(t, 'major'));
    }
  });

  it('nomi dei gradi', () => {
    expect(degreeName(buildScale(tonic(5), 'natural'), 6)).toBe('sottotonica');
    expect(degreeName(buildScale(tonic(5), 'harmonic'), 6)).toBe('sensibile');
  });
});

describe('note', () => {
  it('midi e grafie', () => {
    expect(midi({ letter: 0, acc: 0, octave: 4 })).toBe(60);
    expect(midi({ letter: 6, acc: 1, octave: 3 })).toBe(60);
    expect(commonSpellings(6).map((p) => noteName(p, 'it'))).toEqual(['Fa♯', 'Sol♭']);
    expect(commonSpellings(4).map((p) => noteName(p, 'en'))).toEqual(['E']);
    expect(parsePcKey(pcKey(tonic(3, 2)))).toEqual(tonic(3, 2));
    expect(parsePcKey(pcKey(tonic(1, -1)))).toEqual(tonic(1, -1));
  });
});

describe('chitarra', () => {
  it('posizioni', () => {
    expect(soundingMidi({ string: 6, fret: 0 })).toBe(40);
    // Sol (7) tra i tasti 0 e 12
    expect(positionsOf(7, 12).length).toBe(7);
    expect(positionsOf(4, 12, [6])).toEqual([
      { string: 6, fret: 0 },
      { string: 6, fret: 12 },
    ]);
  });
});

describe('pentatoniche', () => {
  it('note', () => {
    expect(names(buildScale(tonic(5), 'pentMinor'))).toBe('La Do Re Mi Sol');
    expect(names(buildScale(tonic(0), 'pentMajor'))).toBe('Do Re Mi Sol La');
    expect(names(buildScale(tonic(2, -1), 'pentMinor'))).toBe('Mi♭ Sol♭ La♭ Si♭ Re♭');
    expect(names(buildScale(tonic(2), 'pentMajor'))).toBe('Mi Fa♯ Sol♯ Si Do♯');
  });

  it('relative: Do pentatonica maggiore e La pentatonica minore hanno le stesse note', () => {
    const maj = buildScale(tonic(0), 'pentMajor').map((p) => noteName(p, 'it')).sort();
    const min = buildScale(tonic(5), 'pentMinor').map((p) => noteName(p, 'it')).sort();
    expect(maj).toEqual(min);
  });

  it('sul rigo le note saltano le lettere giuste', () => {
    const notes = scaleNotes(tonic(5), 'pentMinor', 4);
    expect(notes.map((n) => `${noteName(n, 'it')}${n.octave}`).join(' ')).toBe('La4 Do5 Re5 Mi5 Sol5 La5');
  });

  it('gradi e schema', () => {
    expect(degreeLabel('pentMinor', 1)).toBe('♭3');
    expect(degreeFunction('pentMinor', 4)).toBe('settima minore');
    expect(degreeLabel('major', 4)).toBe('V');
    expect(degreeFunction('major', 4)).toBe('dominante');
    expect(stepPattern('pentMinor')).toBe('T+S – T – T – T+S – T');
    expect(stepPattern('major')).toBe('T – T – S – T – T – T – S');
  });

  it('box 1 di La minore pentatonica', () => {
    const frets = pentatonicBox(buildScale(tonic(5), 'pentMinor'), 1).map((p) => `${p.string}:${p.fret}`);
    expect(frets.join(' ')).toBe('6:5 6:8 5:5 5:7 4:5 4:7 3:5 3:7 2:5 2:8 1:5 1:8');
  });

  it('tutte le posizioni stanno sul manico e danno note della scala', () => {
    for (const t of MAJOR_TONICS) {
      for (const type of ['pentMajor', 'pentMinor'] as const) {
        const scale = buildScale(t, type).map((p) => pitchClass(p));
        for (let b = 1; b <= 5; b++) {
          const box = pentatonicBox(buildScale(t, type), b);
          expect(box.length).toBe(12);
          for (const p of box) {
            expect(p.fret).toBeGreaterThanOrEqual(0);
            expect(p.fret).toBeLessThanOrEqual(16);
            expect(scale).toContain(soundingMidi(p) % 12);
          }
        }
      }
    }
  });
});
