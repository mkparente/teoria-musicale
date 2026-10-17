import { type Letter, type Naming, type PitchClass, mod, noteName, pitchClass, spell } from './notes';
import { type ScaleType, ROMAN, buildScale } from './scales';

export type Quality = 'maj' | 'min' | 'dim' | 'aug';

interface QualityDef {
  /** Accordo (maschile): "Do maggiore", "Si diminuito". */
  name: string;
  /** Triade (femminile): "triade maggiore", "triade diminuita". */
  triad: string;
  third: number;
  fifth: number;
  /** Nomi dei tre suoni rispetto alla fondamentale. */
  labels: [string, string, string];
  symbolIt: string;
  symbolEn: string;
}

export const QUALITIES: Record<Quality, QualityDef> = {
  maj: { name: 'maggiore', triad: 'maggiore', third: 4, fifth: 7, labels: ['1', '3', '5'], symbolIt: '', symbolEn: '' },
  min: { name: 'minore', triad: 'minore', third: 3, fifth: 7, labels: ['1', '♭3', '5'], symbolIt: 'm', symbolEn: 'm' },
  dim: { name: 'diminuito', triad: 'diminuita', third: 3, fifth: 6, labels: ['1', '♭3', '♭5'], symbolIt: '°', symbolEn: '°' },
  aug: { name: 'aumentato', triad: 'aumentata', third: 4, fifth: 8, labels: ['1', '3', '♯5'], symbolIt: '+', symbolEn: '+' },
};

export const QUALITY_LIST: Quality[] = ['maj', 'min', 'dim', 'aug'];

/** Fondamentale, terza e quinta, scritte su lettere a distanza di terza. */
export function buildTriad(root: PitchClass, q: Quality): [PitchClass, PitchClass, PitchClass] {
  const r = pitchClass(root);
  return [
    root,
    spell(mod(root.letter + 2, 7) as Letter, r + QUALITIES[q].third),
    spell(mod(root.letter + 4, 7) as Letter, r + QUALITIES[q].fifth),
  ];
}

/** Vero se la triade si scrive senza doppie alterazioni (per ora le lasciamo fuori). */
export function plainTriad(root: PitchClass, q: Quality): boolean {
  try {
    return buildTriad(root, q).every((p) => Math.abs(p.acc) <= 1);
  } catch {
    return false;
  }
}

/** Tipo di triade dato fondamentale, terza e quinta. */
export function triadQuality(notes: PitchClass[]): Quality | null {
  const [r, t, f] = notes.map(pitchClass);
  const third = mod(t - r, 12);
  const fifth = mod(f - r, 12);
  return QUALITY_LIST.find((q) => QUALITIES[q].third === third && QUALITIES[q].fifth === fifth) ?? null;
}

export function chordName(root: PitchClass, q: Quality, naming: Naming): string {
  return `${noteName(root, naming)} ${QUALITIES[q].name}`;
}

export function chordSymbol(root: PitchClass, q: Quality, naming: Naming): string {
  return noteName(root, naming) + (naming === 'it' ? QUALITIES[q].symbolIt : QUALITIES[q].symbolEn);
}

export const INVERSIONS = ['stato fondamentale', 'primo rivolto', 'secondo rivolto'];

/** Le note della triade dal basso: 0 = fondamentale, 1 = primo rivolto (terza al basso), 2 = secondo (quinta al basso). */
export function invert<T>(triad: [T, T, T], inversion: number): T[] {
  return [0, 1, 2].map((i) => triad[(i + inversion) % 3]);
}

export interface DiatonicTriad {
  degree: number;
  root: PitchClass;
  notes: [PitchClass, PitchClass, PitchClass];
  quality: Quality;
}

/** Triadi costruite su ogni grado della scala, sovrapponendo terze con le sole note della scala. */
export function diatonicTriads(tonic: PitchClass, type: ScaleType): DiatonicTriad[] {
  const scale = buildScale(tonic, type);
  return scale.map((root, degree) => {
    const notes: [PitchClass, PitchClass, PitchClass] = [root, scale[(degree + 2) % 7], scale[(degree + 4) % 7]];
    return { degree, root, notes, quality: triadQuality(notes)! };
  });
}

/** Numero romano con la convenzione degli accordi: maiuscolo maggiore, minuscolo minore, ° diminuito, + aumentato. */
export function romanFor(degree: number, q: Quality): string {
  const r = ROMAN[degree];
  if (q === 'maj') return r;
  if (q === 'min') return r.toLowerCase();
  if (q === 'dim') return `${r.toLowerCase()}°`;
  return `${r}+`;
}

const MAJOR_SPELLING = [p(0), p(1, -1), p(1), p(2, -1), p(2), p(3), p(3, 1), p(4), p(5, -1), p(5), p(6, -1), p(6)];
const MINOR_SPELLING = [p(0), p(0, 1), p(1), p(2, -1), p(2), p(3), p(3, 1), p(4), p(4, 1), p(5), p(6, -1), p(6)];

/** Come si scrive di solito la fondamentale di un accordo con quella classe di altezza (Si♭ maggiore, Do♯ minore...). */
export function chordRoot(semitone: number, q: Quality): PitchClass {
  return (q === 'min' || q === 'dim' ? MINOR_SPELLING : MAJOR_SPELLING)[mod(semitone, 12)];
}

function p(letter: number, acc = 0): PitchClass {
  return { letter: letter as Letter, acc: acc as PitchClass['acc'] };
}
