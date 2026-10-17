import {
  type Letter,
  type Naming,
  type Note,
  type PitchClass,
  diatonicIndex,
  fromDiatonicIndex,
  mod,
  noteName,
  pitchClass,
  spell,
} from './notes';

export type ScaleType = 'major' | 'natural' | 'harmonic' | 'melodic' | 'pentMajor' | 'pentMinor';
export type Mode = 'major' | 'minor';

interface ScaleDef {
  name: string;
  short: string;
  mode: Mode;
  /** Scale di sette note: toni e semitoni tra un grado e il successivo. */
  steps?: number[];
  /** Scale di cinque note: la scala madre e i gradi che se ne prendono (0-based). */
  parent?: ScaleType;
  picks?: number[];
  /** Nome di ogni grado come intervallo dalla tonica (solo pentatoniche). */
  labels?: string[];
}

export const SCALES: Record<ScaleType, ScaleDef> = {
  major: { name: 'maggiore', short: 'magg.', mode: 'major', steps: [2, 2, 1, 2, 2, 2, 1] },
  natural: { name: 'minore naturale', short: 'min. nat.', mode: 'minor', steps: [2, 1, 2, 2, 1, 2, 2] },
  harmonic: { name: 'minore armonica', short: 'min. arm.', mode: 'minor', steps: [2, 1, 2, 2, 1, 3, 1] },
  // Forma ascendente; in discesa la melodica coincide con la naturale.
  melodic: { name: 'minore melodica', short: 'min. mel.', mode: 'minor', steps: [2, 1, 2, 2, 2, 2, 1] },
  // Le pentatoniche si ricavano dalla scala madre togliendo i gradi dei semitoni:
  // così la grafia delle note resta quella della tonalità.
  pentMajor: {
    name: 'pentatonica maggiore',
    short: 'pent. magg.',
    mode: 'major',
    parent: 'major',
    picks: [0, 1, 2, 4, 5],
    labels: ['1', '2', '3', '5', '6'],
  },
  pentMinor: {
    name: 'pentatonica minore',
    short: 'pent. min.',
    mode: 'minor',
    parent: 'natural',
    picks: [0, 2, 3, 4, 6],
    labels: ['1', '♭3', '4', '5', '♭7'],
  },
};

export const SCALE_TYPES: ScaleType[] = ['major', 'natural', 'harmonic', 'melodic', 'pentMajor', 'pentMinor'];

export const isPentatonic = (type: ScaleType) => SCALES[type].picks !== undefined;

const pc = (letter: number, acc: number): PitchClass => ({ letter: letter as Letter, acc: acc as PitchClass['acc'] });

/** Tonalità con al massimo 7 alterazioni in chiave, ordinate per numero di alterazioni. */
export const MAJOR_TONICS: PitchClass[] = [
  pc(0, 0), // Do
  pc(4, 0), pc(3, 0), // Sol, Fa
  pc(1, 0), pc(6, -1), // Re, Si♭
  pc(5, 0), pc(2, -1), // La, Mi♭
  pc(2, 0), pc(5, -1), // Mi, La♭
  pc(6, 0), pc(1, -1), // Si, Re♭
  pc(3, 1), pc(4, -1), // Fa♯, Sol♭
  pc(0, 1), pc(0, -1), // Do♯, Do♭
];

export const MINOR_TONICS: PitchClass[] = [
  pc(5, 0), // La
  pc(2, 0), pc(1, 0), // Mi, Re
  pc(6, 0), pc(4, 0), // Si, Sol
  pc(3, 1), pc(0, 0), // Fa♯, Do
  pc(0, 1), pc(3, 0), // Do♯, Fa
  pc(4, 1), pc(6, -1), // Sol♯, Si♭
  pc(1, 1), pc(2, -1), // Re♯, Mi♭
  pc(5, 1), pc(5, -1), // La♯, La♭
];

export function tonicsFor(mode: Mode): PitchClass[] {
  return mode === 'major' ? MAJOR_TONICS : MINOR_TONICS;
}

/** Le note della scala (sette, o cinque per le pentatoniche), a partire dalla tonica. */
export function buildScale(tonic: PitchClass, type: ScaleType): PitchClass[] {
  const def = SCALES[type];
  if (def.parent) {
    const parent = buildScale(tonic, def.parent);
    return def.picks!.map((i) => parent[i]);
  }
  const out: PitchClass[] = [tonic];
  let semis = pitchClass(tonic);
  for (let i = 1; i < 7; i++) {
    semis += def.steps![i - 1];
    out.push(spell(mod(tonic.letter + i, 7) as Letter, semis));
  }
  return out;
}

/** Scala con le ottave, salendo per un'ottava (tonica ripetuta in cima). Per la melodica `descending` usa la forma naturale. */
export function scaleNotes(tonic: PitchClass, type: ScaleType, octave = 4, descending = false): Note[] {
  const t = descending && type === 'melodic' ? 'natural' : type;
  const pcs = buildScale(tonic, t);
  const start = diatonicIndex({ ...tonic, octave });
  // La distanza in lettere dalla tonica dice su che riga o spazio va la nota (le pentatoniche saltano lettere).
  const notes = [...pcs, tonic].map((p, i) =>
    fromDiatonicIndex(start + (i === pcs.length ? 7 : mod(p.letter - tonic.letter, 7)), p.acc),
  );
  return descending ? notes.reverse() : notes;
}

/** Armatura di chiave: positivo = diesis, negativo = bemolli. */
export function keySignature(tonic: PitchClass, mode: Mode): number {
  const scale = buildScale(tonic, mode === 'major' ? 'major' : 'natural');
  return scale.reduce((s, p) => s + p.acc, 0);
}

export function tonicFromSignature(sig: number, mode: Mode): PitchClass {
  const t = tonicsFor(mode).find((p) => keySignature(p, mode) === sig);
  if (!t) throw new Error(`Nessuna tonalità con armatura ${sig}`);
  return t;
}

const SHARP_ORDER: Letter[] = [3, 0, 4, 1, 5, 2, 6]; // Fa Do Sol Re La Mi Si
const FLAT_ORDER: Letter[] = [6, 2, 5, 1, 4, 0, 3]; // Si Mi La Re Sol Do Fa

/** Le alterazioni in chiave nell'ordine in cui si scrivono. */
export function signatureAccidentals(sig: number): PitchClass[] {
  if (sig > 0) return SHARP_ORDER.slice(0, sig).map((l) => pc(l, 1));
  return FLAT_ORDER.slice(0, -sig).map((l) => pc(l, -1));
}

/** Alterazione che l'armatura applica a una lettera. */
export function accidentalInKey(letter: Letter, sig: number): PitchClass['acc'] {
  return signatureAccidentals(sig).find((p) => p.letter === letter)?.acc ?? 0;
}

export function relativeMinor(majorTonic: PitchClass): PitchClass {
  return buildScale(majorTonic, 'major')[5];
}

export function relativeMajor(minorTonic: PitchClass): PitchClass {
  return buildScale(minorTonic, 'natural')[2];
}

export function signatureLabel(sig: number): string {
  if (sig === 0) return 'nessuna alterazione';
  const n = Math.abs(sig);
  const word = sig > 0 ? 'diesis' : n === 1 ? 'bemolle' : 'bemolli';
  return `${n} ${word}`;
}

export function signatureShort(sig: number): string {
  if (sig === 0) return '0';
  return `${Math.abs(sig)}${sig > 0 ? '♯' : '♭'}`;
}

/** Armatura nel formato di VexFlow (nome della tonalità maggiore corrispondente). */
export function vexKeySpec(sig: number): string {
  return noteName(tonicFromSignature(sig, 'major'), 'en').replace('♯', '#').replace('♭', 'b');
}

export function scaleName(tonic: PitchClass, type: ScaleType, naming: Naming): string {
  return `${noteName(tonic, naming)} ${SCALES[type].name}`;
}

export function keyName(tonic: PitchClass, mode: Mode, naming: Naming): string {
  return `${noteName(tonic, naming)} ${mode === 'major' ? 'maggiore' : 'minore'}`;
}

const DEGREE_NAMES = ['tonica', 'sopratonica', 'mediante', 'sottodominante', 'dominante', 'sopradominante'];

/** Nome funzionale del grado (0-based). Il 7° è sensibile se dista un semitono dalla tonica. */
export function degreeName(scale: PitchClass[], degree: number): string {
  if (degree < 6) return DEGREE_NAMES[degree];
  const gap = mod(pitchClass(scale[0]) - pitchClass(scale[6]), 12);
  return gap === 1 ? 'sensibile' : 'sottotonica';
}

export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

const INTERVAL_NAMES: Record<string, string> = {
  '1': 'tonica',
  '2': 'seconda maggiore',
  '3': 'terza maggiore',
  '♭3': 'terza minore',
  '4': 'quarta giusta',
  '5': 'quinta giusta',
  '6': 'sesta maggiore',
  '♭7': 'settima minore',
};

/** Etichetta breve del grado: numero romano, o intervallo per le pentatoniche (1, ♭3, 4, 5, ♭7). */
export function degreeLabel(type: ScaleType, degree: number): string {
  return SCALES[type].labels?.[degree] ?? ROMAN[degree];
}

/** Nome del grado: funzione armonica, o nome dell'intervallo per le pentatoniche. */
export function degreeFunction(type: ScaleType, degree: number): string {
  const label = SCALES[type].labels?.[degree];
  if (label) return INTERVAL_NAMES[label];
  return degreeName(buildScale(tonicsFor(SCALES[type].mode)[0], type), degree);
}

/** Schema di toni (T) e semitoni (S) tra note consecutive, tornando alla tonica. */
export function stepPattern(type: ScaleType): string {
  const scale = buildScale(tonicsFor(SCALES[type].mode)[0], type);
  return scale
    .map((p, i) => mod(pitchClass(scale[(i + 1) % scale.length]) - pitchClass(p), 12))
    .map((s) => (s === 1 ? 'S' : s === 2 ? 'T' : s === 3 ? 'T+S' : `${s} S`))
    .join(' – ');
}
export const ordinal = (degree: number) => `${degree + 1}°`;
