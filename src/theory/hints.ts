import { type FretPos, type GuitarString, soundingMidi } from './guitar';
import { mainShape, shapeOffset } from './intervals';
import { mod } from './notes';

// Dove stanno sul manico le note di una correzione: poche, in una posizione sola, per vederne il disegno.

/** Grado rispetto alla tonica, dai semitoni: come si dice sulla chitarra (♭3, 5, ♭7). */
export const SEMI_DEGREE = ['1', '♭2', '2', '♭3', '3', '4', '♭5', '5', '♭6', '6', '♭7', '7', '8'];

export interface Placed {
  /** Posizioni nell'ordine dei semitoni chiesti. */
  notes: FretPos[];
  /** Finestra di tasti da mostrare. */
  from: number;
  to: number;
}

/** Tasto della nota sulla 6ª o sulla 5ª corda, comodo per cominciare una posizione (dal 1° all'8° tasto). */
function rootPos(semi: number): FretPos {
  const on6 = mod(semi - 4, 12);
  if (on6 >= 1 && on6 <= 8) return { string: 6, fret: on6 };
  const on5 = mod(semi - 9, 12);
  return { string: 5, fret: on5 === 0 ? 12 : on5 };
}

function windowOf(notes: FretPos[]): { from: number; to: number } {
  const lo = Math.min(...notes.map((p) => p.fret));
  const hi = Math.max(...notes.map((p) => p.fret));
  const from = Math.max(0, lo - 1);
  return { from: from <= 1 ? 0 : from, to: Math.max(hi + 1, from + 4) };
}

/**
 * Una scala in una posizione, dalla tonica sulla 6ª (o 5ª) corda fino all'ottava: una nota per
 * grado, sulla corda più grave che la raggiunge senza spostare la mano.
 */
export function scaleInPosition(tonicSemi: number, offsets: number[]): Placed {
  const root = rootPos(tonicSemi);
  const rootMidi = soundingMidi(root);
  const notes: FretPos[] = [];
  for (const k of offsets) {
    const midi = rootMidi + k;
    let found: FretPos | null = null;
    // Prima dentro la posizione (un tasto sotto la tonica, tre sopra), poi allargando di un tasto.
    for (const [lo, hi] of [[root.fret - 1, root.fret + 3], [root.fret - 2, root.fret + 4]]) {
      for (let s = root.string; s >= 1 && !found; s--) {
        const fret = midi - soundingMidi({ string: s as GuitarString, fret: 0 });
        if (fret >= Math.max(0, lo) && fret <= hi) found = { string: s as GuitarString, fret };
      }
      if (found) break;
    }
    notes.push(found ?? root);
  }
  return { notes, ...windowOf(notes) };
}

/**
 * Un intervallo nel suo disegno principale: stessa corda per le seconde, dalla 6ª alla 5ª fino
 * alla 6ª minore esclusa, dalla 6ª alla 4ª per 6ª, 7ª e 8ª. Restituisce [fondamentale, nota sopra].
 */
export function intervalInPosition(rootSemi: number, semis: number): Placed {
  const [lo, hi] = mainShape(semis);
  const offset = lo === hi ? semis : shapeOffset(semis, hi === 5 ? 'next' : 'skip');
  let fret = mod(rootSemi - 4, 12);
  // Tutte e due le note dal 1° tasto in su.
  if (fret < 1 || fret + offset < 1) fret += 12;
  const notes: FretPos[] = [
    { string: lo, fret },
    { string: hi, fret: fret + offset },
  ];
  return { notes, ...windowOf(notes) };
}
