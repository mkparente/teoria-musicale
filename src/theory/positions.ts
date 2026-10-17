import { type FretPos, type GuitarString, soundingMidi } from './guitar';
import { type PitchClass, mod, pitchClass } from './notes';

const LOW_TO_HIGH: GuitarString[] = [6, 5, 4, 3, 2, 1];
const open = (string: GuitarString) => soundingMidi({ string, fret: 0 });

/**
 * Una delle cinque posizioni ("box") di una pentatonica: due note per corda, dal Mi basso
 * al cantino, salendo lungo la scala. La posizione 1 parte dalla tonica sul Mi basso.
 */
export function pentatonicBox(scale: PitchClass[], box: number): FretPos[] {
  const pcs = scale.map(pitchClass);
  const tonicFret = mod(pcs[0] - open(6), 12);
  // k-esima nota della scala salendo dalla tonica sul Mi basso, in MIDI.
  const pitchAt = (k: number) => open(6) + tonicFret + 12 * Math.floor(k / 5) + mod(pcs[k % 5] - pcs[0], 12);

  let k = box - 1;
  const out: FretPos[] = [];
  for (const string of LOW_TO_HIGH) {
    for (let j = 0; j < 2; j++, k++) out.push({ string, fret: pitchAt(k) - open(string) });
  }
  return normalize(out);
}

export type CagedForm = 'C' | 'A' | 'G' | 'E' | 'D';
export const CAGED_FORMS: CagedForm[] = ['C', 'A', 'G', 'E', 'D'];

/** Nome italiano della forma: si chiama come l'accordo aperto da cui deriva. */
export const FORM_NAMES: Record<CagedForm, string> = { C: 'Do', A: 'La', G: 'Sol', E: 'Mi', D: 'Re' };

type Offsets = (number | null)[];

/**
 * Forme CAGED come spostamenti di tasto rispetto alla fondamentale sulla corda di riferimento,
 * corda per corda dalla 6ª alla 1ª (null = corda non suonata). Sono gli accordi aperti
 * Do, La, Sol, Mi, Re resi mobili.
 */
const CAGED: Record<CagedForm, { rootString: GuitarString; maj: Offsets; min: Offsets }> = {
  // x32010 / x3101x
  C: { rootString: 5, maj: [null, 0, -1, -3, -2, -3], min: [null, 0, -2, -3, -2, null] },
  // x02220 / x02210
  A: { rootString: 5, maj: [null, 0, 2, 2, 2, 0], min: [null, 0, 2, 2, 1, 0] },
  // 320003 / 310033
  G: { rootString: 6, maj: [0, -1, -3, -3, -3, 0], min: [0, -2, -3, -3, 0, 0] },
  // 022100 / 022000
  E: { rootString: 6, maj: [0, 2, 2, 1, 0, 0], min: [0, 2, 2, 0, 0, 0] },
  // xx0232 / xx0231
  D: { rootString: 4, maj: [null, null, 0, 2, 3, 2], min: [null, null, 0, 2, 3, 1] },
};

/** Riporta un gruppo di posizioni nella zona più bassa del manico che lo contiene tutto. */
function normalize(positions: FretPos[]): FretPos[] {
  const min = Math.min(...positions.map((p) => p.fret));
  const shift = min < 0 ? 12 : min >= 12 ? -12 : 0;
  return positions.map((p) => ({ ...p, fret: p.fret + shift }));
}

/** L'accordo (maggiore o minore) con fondamentale `rootPc` suonato in una forma CAGED. */
export function cagedVoicing(rootPc: number, quality: 'maj' | 'min', form: CagedForm): FretPos[] {
  const def = CAGED[form];
  const rootFret = mod(rootPc - open(def.rootString), 12);
  const out: FretPos[] = [];
  def[quality].forEach((off, i) => {
    if (off !== null) out.push({ string: LOW_TO_HIGH[i], fret: rootFret + off });
  });
  return normalize(out);
}

export const lowestFret = (ps: FretPos[]) => Math.min(...ps.map((p) => p.fret));
export const highestFret = (ps: FretPos[]) => Math.max(...ps.map((p) => p.fret));

/** Le cinque forme di un accordo nell'ordine in cui si incontrano salendo lungo il manico. */
export function cagedAlongNeck(rootPc: number, quality: 'maj' | 'min'): CagedForm[] {
  return [...CAGED_FORMS].sort(
    (a, b) => lowestFret(cagedVoicing(rootPc, quality, a)) - lowestFret(cagedVoicing(rootPc, quality, b)),
  );
}

/** Gruppi di tre corde vicine, dal basso verso l'acuto. */
export const STRING_SETS: GuitarString[][] = [
  [3, 2, 1],
  [4, 3, 2],
  [5, 4, 3],
  [6, 5, 4],
];

export const setLabel = (set: GuitarString[]) => `corde ${[...set].reverse().join('-')}`;

/**
 * Triade in posizione stretta su tre corde vicine. `tones` sono le classi di altezza di
 * fondamentale, terza e quinta; `inversion` dice quale va al basso (0, 1, 2).
 */
export function triadVoicing(tones: [number, number, number], set: GuitarString[], inversion: number): FretPos[] {
  const order = [0, 1, 2].map((i) => tones[(i + inversion) % 3]);
  let pitch = open(set[0]) + mod(order[0] - open(set[0]), 12);
  const out: FretPos[] = [{ string: set[0], fret: pitch - open(set[0]) }];
  for (let i = 1; i < 3; i++) {
    pitch += mod(order[i] - pitch, 12) || 12;
    out.push({ string: set[i], fret: pitch - open(set[i]) });
  }
  return normalize(out);
}

/** La forma CAGED che contiene tutte le posizioni date, se c'è. */
export function formContaining(positions: FretPos[], rootPc: number, quality: 'maj' | 'min'): CagedForm | null {
  return (
    CAGED_FORMS.find((f) => {
      const v = cagedVoicing(rootPc, quality, f);
      return [0, 12, -12].some((shift) =>
        positions.every((p) => v.some((q) => q.string === p.string && q.fret === p.fret + shift)),
      );
    }) ?? null
  );
}
