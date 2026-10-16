// Note scritte: lettera (0 = Do ... 6 = Si) + alterazione (-2..2) + ottava (scientifica, Do centrale = 4).

export type Letter = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type Accidental = -2 | -1 | 0 | 1 | 2;

export interface PitchClass {
  letter: Letter;
  acc: Accidental;
}

export interface Note extends PitchClass {
  octave: number;
}

export type Naming = 'it' | 'en';

export const LETTERS: Letter[] = [0, 1, 2, 3, 4, 5, 6];
const NATURAL_SEMITONES = [0, 2, 4, 5, 7, 9, 11];
const NAMES_IT = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si'];
const NAMES_EN = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
// I simboli 𝄪 e 𝄫 mancano in molti font di sistema: meglio raddoppiare ♯ e ♭.
const ACC_SYMBOLS: Record<Accidental, string> = { [-2]: '♭♭', [-1]: '♭', 0: '', 1: '♯', 2: '♯♯' };
const ACC_ASCII: Record<Accidental, string> = { [-2]: 'bb', [-1]: 'b', 0: '', 1: '#', 2: '##' };

export const mod = (n: number, m: number) => ((n % m) + m) % m;

export function letterName(letter: Letter, naming: Naming): string {
  return (naming === 'it' ? NAMES_IT : NAMES_EN)[letter];
}

export function accSymbol(acc: Accidental): string {
  return ACC_SYMBOLS[acc];
}

export function noteName(pc: PitchClass, naming: Naming): string {
  return letterName(pc.letter, naming) + ACC_SYMBOLS[pc.acc];
}

/** Classe di altezza in semitoni (0..11). */
export function pitchClass(pc: PitchClass): number {
  return mod(NATURAL_SEMITONES[pc.letter] + pc.acc, 12);
}

/** Numero MIDI di una nota scritta (Do4 = 60). */
export function midi(n: Note): number {
  return 12 * (n.octave + 1) + NATURAL_SEMITONES[n.letter] + n.acc;
}

/** Posizione diatonica assoluta: utile per confrontare altezze scritte sul rigo. */
export function diatonicIndex(n: Note): number {
  return n.octave * 7 + n.letter;
}

export function fromDiatonicIndex(i: number, acc: Accidental = 0): Note {
  return { letter: mod(i, 7) as Letter, acc, octave: Math.floor(i / 7) };
}

export function samePitchClass(a: PitchClass, b: PitchClass): boolean {
  return a.letter === b.letter && a.acc === b.acc;
}

export function enharmonic(a: PitchClass, b: PitchClass): boolean {
  return pitchClass(a) === pitchClass(b);
}

/** Chiave compatta usata negli identificativi: "0", "4#", "6b". */
export function pcKey(pc: PitchClass): string {
  return `${pc.letter}${ACC_ASCII[pc.acc]}`;
}

export function parsePcKey(key: string): PitchClass {
  const fromAscii: Record<string, Accidental> = { bb: -2, b: -1, '': 0, '#': 1, '##': 2 };
  return { letter: Number(key[0]) as Letter, acc: fromAscii[key.slice(1)] };
}

/** Nota con lettera fissata che suona sulla classe di altezza voluta. */
export function spell(letter: Letter, semitone: number): PitchClass {
  let acc = mod(semitone - NATURAL_SEMITONES[letter], 12);
  if (acc > 6) acc -= 12;
  if (acc < -2 || acc > 2) throw new Error(`Impossibile scrivere ${semitone} con la lettera ${letter}`);
  return { letter, acc: acc as Accidental };
}

/** Le grafie "normali" di una classe di altezza: naturale, oppure diesis e bemolle. */
export function commonSpellings(semitone: number): PitchClass[] {
  const out: PitchClass[] = [];
  for (const letter of LETTERS) {
    const d = mod(semitone - NATURAL_SEMITONES[letter], 12);
    if (d === 0) return [{ letter, acc: 0 }];
    if (d === 1) out.push({ letter, acc: 1 });
    if (d === 11) out.push({ letter, acc: -1 });
  }
  return out.sort((a, b) => b.acc - a.acc);
}

/** Formato chiave di VexFlow, es. "f#/4". */
export function vexKey(n: Note): string {
  return `${NAMES_EN[n.letter].toLowerCase()}${ACC_ASCII[n.acc]}/${n.octave}`;
}

export function vexAccidental(acc: Accidental): string | null {
  return acc === 0 ? null : ACC_ASCII[acc];
}

export const ACCIDENTAL_WORDS: Record<Accidental, string> = {
  [-2]: 'doppio bemolle',
  [-1]: 'bemolle',
  0: 'naturale',
  1: 'diesis',
  2: 'doppio diesis',
};
