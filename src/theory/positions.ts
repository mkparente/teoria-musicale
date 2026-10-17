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
  // Riporta la posizione nella parte del manico più vicina al capotasto.
  const min = Math.min(...out.map((p) => p.fret));
  const shift = min < 0 ? 12 : min >= 12 ? -12 : 0;
  return out.map((p) => ({ ...p, fret: p.fret + shift }));
}
