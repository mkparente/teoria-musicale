import { type GuitarString, soundingMidi } from './guitar';
import { type Note, type PitchClass, type Letter, diatonicIndex, midi, mod, pitchClass, spell, stackUp } from './notes';

// Intervalli dentro l'ottava. Il numero si conta con le lettere (Do-Re-Mi = 3ª),
// la qualità con i semitoni (Do-Mi♭ = 3 semitoni = 3ª minore).

export type IntervalQuality = 'P' | 'M' | 'm' | 'A' | 'd';

export interface Interval {
  /** 1 = unisono ... 8 = ottava. */
  number: number;
  quality: IntervalQuality;
}

/** Gli intervalli che si studiano, dalla 2ª minore all'ottava. Il tritono ha due grafie: 4ª aumentata e 5ª diminuita. */
export type IntervalKey = 'm2' | 'M2' | 'm3' | 'M3' | 'P4' | 'A4' | 'd5' | 'P5' | 'm6' | 'M6' | 'm7' | 'M7' | 'P8';

export const INTERVAL_KEYS: IntervalKey[] = ['m2', 'M2', 'm3', 'M3', 'P4', 'A4', 'd5', 'P5', 'm6', 'M6', 'm7', 'M7', 'P8'];

/** Semitoni dell'intervallo maggiore o giusto, per numero. */
const BASE = [0, 0, 2, 4, 5, 7, 9, 11, 12];
const isPerfectNumber = (n: number) => [1, 4, 5, 8].includes(mod(n - 1, 7) + 1);

const OFFSETS_PERFECT: Partial<Record<IntervalQuality, number>> = { d: -1, P: 0, A: 1 };
const OFFSETS_IMPERFECT: Partial<Record<IntervalQuality, number>> = { d: -2, m: -1, M: 0, A: 1 };

export function parseInterval(key: IntervalKey): Interval {
  return { quality: key[0] as IntervalQuality, number: Number(key.slice(1)) };
}

export const intervalKey = (iv: Interval) => `${iv.quality}${iv.number}` as IntervalKey;

export function semitones(iv: Interval | IntervalKey): number {
  const i = typeof iv === 'string' ? parseInterval(iv) : iv;
  const offsets = isPerfectNumber(i.number) ? OFFSETS_PERFECT : OFFSETS_IMPERFECT;
  const off = offsets[i.quality];
  if (off === undefined) throw new Error(`Qualità ${i.quality} impossibile per una ${i.number}ª`);
  return BASE[i.number] + off;
}

/** Intervallo tra due note scritte, dalla più grave alla più acuta. Null se fuori dall'ottava o troppo alterato. */
export function identify(lower: Note, upper: Note): Interval | null {
  const steps = diatonicIndex(upper) - diatonicIndex(lower);
  if (steps < 0 || steps > 7) return null;
  const number = steps + 1;
  const diff = midi(upper) - midi(lower) - BASE[number];
  const offsets = isPerfectNumber(number) ? OFFSETS_PERFECT : OFFSETS_IMPERFECT;
  const quality = (Object.keys(offsets) as IntervalQuality[]).find((q) => offsets[q] === diff);
  if (!quality || (number === 1 && quality === 'd')) return null;
  return { number, quality };
}

/** Intervallo ascendente tra due classi di altezza: la seconda nota va sopra la prima, entro l'ottava. */
export function intervalBetween(a: PitchClass, b: PitchClass): Interval | null {
  const [lo, hi] = stackUp([a, b]);
  return identify(lo, hi);
}

/** La nota che sta all'intervallo dato sopra la fondamentale, scritta correttamente (Do + 3ª minore = Mi♭, non Re♯). */
export function noteAbove(root: PitchClass, iv: Interval | IntervalKey): PitchClass {
  const i = typeof iv === 'string' ? parseInterval(iv) : iv;
  const letter = mod(root.letter + i.number - 1, 7) as Letter;
  return spell(letter, pitchClass(root) + semitones(i));
}

/** Vero se l'intervallo sopra questa nota si scrive senza doppie alterazioni. */
export function plainAbove(root: PitchClass, iv: Interval | IntervalKey): boolean {
  if (Math.abs(root.acc) > 1) return false;
  try {
    return Math.abs(noteAbove(root, iv).acc) <= 1;
  } catch {
    return false;
  }
}

// ── Nomi ──

const QUALITY_WORDS: Record<IntervalQuality, string> = { P: 'giusta', M: 'maggiore', m: 'minore', A: 'aumentata', d: 'diminuita' };
const UNISON_WORDS: Record<IntervalQuality, string> = { P: 'unisono', M: '', m: '', A: 'unisono aumentato', d: 'unisono diminuito' };
const SHORT_WORDS: Record<IntervalQuality, string> = { P: 'giusta', M: 'magg', m: 'min', A: 'aum', d: 'dim' };

export function intervalName(iv: Interval | IntervalKey): string {
  const i = typeof iv === 'string' ? parseInterval(iv) : iv;
  if (i.number === 1) return UNISON_WORDS[i.quality];
  return `${i.number}ª ${QUALITY_WORDS[i.quality]}`;
}

/** Nome breve per i pulsanti: "3ª min", "5ª giusta", "8ª". */
export function intervalShort(key: IntervalKey): string {
  if (key === 'P8') return '8ª';
  const i = parseInterval(key);
  return `${i.number}ª ${SHORT_WORDS[i.quality]}`;
}

/** L'intervallo come grado rispetto alla fondamentale, come si dice nel blues: ♭3, 5, ♭7. */
export const DEGREE_LABEL: Record<IntervalKey, string> = {
  m2: '♭2', M2: '2', m3: '♭3', M3: '3', P4: '4', A4: '♯4', d5: '♭5', P5: '5', m6: '♭6', M6: '6', m7: '♭7', M7: '7', P8: '8',
};

export const semitoneWords = (n: number) => (n === 1 ? '1 semitono' : `${n} semitoni`);

// ── Sul manico ──

/**
 * Disegni degli intervalli sul manico, per tipo di salto tra le corde. Le corde Sol e Si sono
 * a distanza di 4 semitoni invece di 5: quando le si attraversa il disegno si sposta di un tasto.
 */
export type ShapeKind = 'same' | 'next' | 'nextB' | 'skip' | 'skipB';

export const SHAPE_KINDS: ShapeKind[] = ['next', 'same', 'skip', 'nextB', 'skipB'];

/** Coppie di corde (grave, acuta) per ogni tipo di disegno. */
export const SHAPE_PAIRS: Record<ShapeKind, [GuitarString, GuitarString][]> = {
  same: [[6, 6], [5, 5], [4, 4], [3, 3], [2, 2], [1, 1]],
  next: [[6, 5], [5, 4], [4, 3], [2, 1]],
  nextB: [[3, 2]],
  skip: [[6, 4], [5, 3]],
  skipB: [[4, 2], [3, 1]],
};

const openGap = (lower: GuitarString, upper: GuitarString) =>
  soundingMidi({ string: upper, fret: 0 }) - soundingMidi({ string: lower, fret: 0 });

/** Di quanti tasti si sposta la nota acuta rispetto alla grave (negativo = verso il capotasto). */
export function shapeOffset(semis: number, kind: ShapeKind): number {
  const [lower, upper] = SHAPE_PAIRS[kind][0];
  return semis - openGap(lower, upper);
}

/** Disegni comodi da suonare e da riconoscere: al massimo 3 tasti di spostamento tra corde diverse. */
export function shapeUsable(semis: number, kind: ShapeKind): boolean {
  if (kind === 'same') return semis <= 7;
  return Math.abs(shapeOffset(semis, kind)) <= 3;
}

const COUNT_WORDS = ['', 'un', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette'];

export function offsetWords(offset: number): string {
  if (offset === 0) return 'stesso tasto';
  const n = Math.abs(offset);
  return `${COUNT_WORDS[n]} ${n === 1 ? 'tasto' : 'tasti'} ${offset < 0 ? 'indietro' : 'avanti'}`;
}

/** Il disegno di un intervallo su una coppia di corde, a parole. */
export function shapeWords(semis: number, lower: GuitarString, upper: GuitarString): string {
  if (lower === upper) return `sulla stessa corda: ${semis} ${semis === 1 ? 'tasto' : 'tasti'} più su`;
  const offset = semis - openGap(lower, upper);
  return `dalla ${lower}ª alla ${upper}ª corda: ${offsetWords(offset)}`;
}

/** Il disegno più comodo da ricordare: stessa corda per i piccoli, dalla 6ª alla 5ª, poi dalla 6ª alla 4ª. */
export function mainShape(semis: number): [GuitarString, GuitarString] {
  if (semis <= 2) return [6, 6];
  if (semis <= 7) return [6, 5];
  return [6, 4];
}
