import type { Figure as FigureSpec } from '../program/curriculum';
import { useSettings } from '../store';
import { QUALITIES, buildTriad, chordRoot } from '../theory/chords';
import { type FretPos, positionsOf, soundingMidi } from '../theory/guitar';
import { LETTERS, mod, noteName, parsePcKey, pitchClass } from '../theory/notes';
import { STRING_SETS, cagedVoicing, highestFret, lowestFret, pentatonicBox, triadVoicing } from '../theory/positions';
import { buildScale, degreeLabel, isPentatonic } from '../theory/scales';
import { type FretMark, Fretboard, Legend, chordToneKind } from './Fretboard';

/** Il disegno sul manico che accompagna un'attività con la chitarra. */
export function Figure({ spec }: { spec: FigureSpec }) {
  const [{ naming }] = useSettings();
  let marks: FretMark[] = [];
  let region: { lo: number; hi: number } | undefined;
  let legend: [string, string, string] | null = null;
  let other: string | undefined;

  if (spec.kind === 'naturals') {
    marks = spec.strings.flatMap((s) =>
      LETTERS.flatMap((letter) => {
        const pc = { letter, acc: 0 as const };
        return positionsOf(pitchClass(pc), 12, [s]).map((pos) => ({ pos, kind: 'note' as const, label: noteName(pc, naming) }));
      }),
    );
  } else if (spec.kind === 'scale') {
    const tonic = parsePcKey(spec.tonic);
    const scale = buildScale(tonic, spec.type);
    const pcs = scale.map(pitchClass);
    const step = (d: number) => mod(scale[d].letter - tonic.letter, 7);
    let positions: FretPos[] = scale.flatMap((p) => positionsOf(pitchClass(p), 15));
    if (spec.box) positions = pentatonicBox(scale, spec.box);
    else if (spec.lo !== undefined) positions = positions.filter((p) => p.fret >= spec.lo! && p.fret <= spec.hi!);
    else positions = positions.filter((p) => p.fret <= 12);
    marks = positions.map((pos) => {
      const d = pcs.indexOf(soundingMidi(pos) % 12);
      return {
        pos,
        kind: chordToneKind([0, 2, 4].indexOf(step(d))),
        label: isPentatonic(spec.type) ? degreeLabel(spec.type, d) : String(d + 1),
      };
    });
    if (spec.box || spec.lo !== undefined) region = { lo: lowestFret(positions), hi: highestFret(positions) };
    const minorThird = mod(pitchClass(scale[scale.findIndex((_, d) => step(d) === 2)]) - pcs[0], 12) === 3;
    legend = ['1 tonica', `${minorThird ? '♭3' : '3'} terza`, '5 quinta'];
    other = 'altre note';
  } else {
    const root = chordRoot(spec.root, spec.quality);
    const tones = buildTriad(root, spec.quality).map(pitchClass);
    const positions =
      spec.kind === 'chord'
        ? cagedVoicing(spec.root, spec.quality, spec.form)
        : [0, 1, 2].flatMap((inv) => triadVoicing(tones as [number, number, number], STRING_SETS[spec.set], inv));
    marks = positions.map((pos) => {
      const i = tones.indexOf(soundingMidi(pos) % 12);
      return { pos, kind: chordToneKind(i), label: QUALITIES[spec.quality].labels[i] };
    });
    if (spec.kind === 'chord') region = { lo: lowestFret(positions), hi: highestFret(positions) };
    legend = QUALITIES[spec.quality].labels.map((l, i) => `${l} ${['fondamentale', 'terza', 'quinta'][i]}`) as [string, string, string];
  }

  const maxFret = Math.max(12, ...marks.map((m) => m.pos.fret));
  return (
    <div class="figure">
      <Fretboard maxFret={maxFret} marks={marks} region={region} />
      {legend && <Legend labels={legend} other={other} />}
    </div>
  );
}
