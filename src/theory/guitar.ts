import { mod } from './notes';

/** Corde numerate come si usa sulla chitarra: 1 = Mi cantino, 6 = Mi basso. */
export type GuitarString = 1 | 2 | 3 | 4 | 5 | 6;
export const STRINGS: GuitarString[] = [1, 2, 3, 4, 5, 6];

/** Accordatura standard, in MIDI dei suoni reali (Mi2 ... Mi4). */
const OPEN_MIDI: Record<GuitarString, number> = { 6: 40, 5: 45, 4: 50, 3: 55, 2: 59, 1: 64 };

export const STRING_NAMES: Record<GuitarString, string> = {
  1: '1ª corda (Mi cantino)',
  2: '2ª corda (Si)',
  3: '3ª corda (Sol)',
  4: '4ª corda (Re)',
  5: '5ª corda (La)',
  6: '6ª corda (Mi basso)',
};

export interface FretPos {
  string: GuitarString;
  fret: number;
}

/** MIDI del suono reale. La chitarra si scrive un'ottava sopra: per il rigo aggiungere 12. */
export function soundingMidi(p: FretPos): number {
  return OPEN_MIDI[p.string] + p.fret;
}

export function semitoneAt(p: FretPos): number {
  return mod(soundingMidi(p), 12);
}

export function positionsOf(semitone: number, maxFret: number, strings: GuitarString[] = STRINGS): FretPos[] {
  const out: FretPos[] = [];
  for (const string of strings) {
    for (let fret = 0; fret <= maxFret; fret++) {
      if (semitoneAt({ string, fret }) === semitone) out.push({ string, fret });
    }
  }
  return out;
}

export const samePos = (a: FretPos, b: FretPos) => a.string === b.string && a.fret === b.fret;

/** Tasti segnati con il pallino sul manico. */
export const INLAYS = [3, 5, 7, 9, 15, 17, 19, 21];
export const DOUBLE_INLAYS = [12, 24];
