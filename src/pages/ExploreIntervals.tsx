import { type FretMark, Fretboard } from '../components/Fretboard';
import { Radio, Toggles } from '../components/Shell';
import { useSettings, useStored } from '../store';
import { type FretPos, type GuitarString, STRING_NAMES, soundingMidi } from '../theory/guitar';
import {
  type IntervalKey,
  DEGREE_LABEL,
  intervalName,
  intervalShort,
  intervalSpots,
  noteAbove,
  plainAbove,
  semitones,
  shapeWords,
} from '../theory/intervals';
import { type PitchClass, commonSpellings, mod, noteName } from '../theory/notes';

/** Gli intervalli della mappa: uno per distanza, il tritono scritto come ♭5 (come nel blues). */
type Choice = Exclude<IntervalKey, 'A4'>;
const CHOICES: Choice[] = ['m2', 'M2', 'm3', 'M3', 'P4', 'd5', 'P5', 'm6', 'M6', 'm7', 'M7', 'P8'];

/** Scelte rapide: per non avere il manico pieno di pallini se ne guardano pochi alla volta. */
const GROUPS: { label: string; keys: Choice[] }[] = [
  { label: 'Terze', keys: ['m3', 'M3'] },
  { label: 'Terze e 5ª', keys: ['m3', 'M3', 'P5'] },
  { label: 'Solo 5ª', keys: ['P5'] },
  { label: 'Settime', keys: ['m7', 'M7'] },
  { label: 'Blues', keys: ['m3', 'P4', 'P5', 'm7', 'P8'] },
];

interface State {
  root: FretPos;
  intervals: Choice[];
  labels: 'degrees' | 'notes';
  sameString: boolean;
  /** 4ª e 8ª tratteggiate come riferimento, anche se non sono tra gli intervalli scelti. */
  anchors: boolean;
}

const DEFAULT: State = { root: { string: 6, fret: 5 }, intervals: ['m3', 'M3', 'P5'], labels: 'degrees', sameString: false, anchors: true };

/** Colore per famiglia: terze, quinte, settime, il resto. */
function kindOf(k: Choice): FretMark['kind'] {
  if (k === 'm3' || k === 'M3') return 'third';
  if (k === 'P5' || k === 'd5') return 'fifth';
  if (k === 'm7' || k === 'M7') return 'note';
  return 'other';
}

/** Nome della fondamentale: con il bemolle dove nel blues si usa (Si♭, Mi♭, La♭), altrimenti col diesis. */
function rootName(semi: number): PitchClass {
  const flats = [3, 8, 10];
  const sp = commonSpellings(semi);
  return (flats.includes(semi) ? sp.find((p) => p.acc < 0) : sp[0]) ?? sp[0];
}

const fretWords = (f: number) => (f === 0 ? 'a vuoto' : `tasto ${f}`);

/** Mappa degli intervalli attorno a una fondamentale scelta sul manico. */
export function ExploreIntervals() {
  const [{ naming }] = useSettings();
  const [saved, setSt] = useStored<State>('explore.intervals', DEFAULT);
  const st = { ...DEFAULT, ...saved };
  const set = (patch: Partial<State>) => setSt({ ...st, ...patch });

  const rootPc = rootName(mod(soundingMidi(st.root), 12));
  const shown = CHOICES.filter((k) => st.intervals.includes(k));
  const nameAbove = (k: Choice) => (plainAbove(rootPc, k) ? noteName(noteAbove(rootPc, k), naming) : null);

  const spots = shown.map((k) => ({
    k,
    positions: intervalSpots(st.root, semitones(k)).filter((p) => st.sameString || p.string !== st.root.string),
  }));
  const marks: FretMark[] = [
    { pos: st.root, kind: 'root', label: st.labels === 'degrees' ? '1' : noteName(rootPc, naming) },
    ...spots.flatMap(({ k, positions }) =>
      positions.map((pos) => ({ pos, kind: kindOf(k), label: st.labels === 'degrees' ? DEGREE_LABEL[k] : (nameAbove(k) ?? '') })),
    ),
  ];
  // Riferimenti: dove sarebbero 4ª e 8ª, per contare gli altri disegni da lì (se non sono già mostrate).
  if (st.anchors) {
    for (const k of ['P4', 'P8'] as const) {
      if (shown.includes(k)) continue;
      const pos = intervalSpots(st.root, semitones(k)).find((p) => p.string !== st.root.string);
      if (pos) marks.push({ pos, kind: 'hint', label: DEGREE_LABEL[k] });
    }
  }
  const maxFret = Math.max(12, ...marks.map((m) => m.pos.fret));
  const isGroup = (keys: Choice[]) => keys.length === st.intervals.length && keys.every((k) => st.intervals.includes(k));

  return (
    <>
      <section class="panel">
        <div class="groups" role="group" aria-label="Intervalli da mostrare">
          {GROUPS.map((g) => (
            <button key={g.label} class={`chip ${isGroup(g.keys) ? 'on' : ''}`} onClick={() => set({ intervals: g.keys })}>
              {g.label}
            </button>
          ))}
        </div>
        <Fretboard maxFret={maxFret} marks={marks} onTap={(root) => set({ root })} />
        <p class="hint center small">
          Fondamentale <b>{noteName(rootPc, naming)}</b> ({STRING_NAMES[st.root.string as GuitarString].split(' (')[0]}, {fretWords(st.root.fret)}):
          tocca il manico per spostarla.
          {marks.some((m) => m.kind === 'hint') && ' Tratteggiati i punti di riferimento (4ª e 8ª).'}
        </p>
        <Toggles
          label="Oppure scegli tu gli intervalli"
          options={CHOICES.map((k) => ({ value: k, label: k === 'd5' ? '♭5 (tritono)' : intervalShort(k) }))}
          value={st.intervals}
          onChange={(intervals) => set({ intervals: intervals as Choice[] })}
        />
      </section>

      <section class="panel">
        <h2 class="panel-title">Come si trovano</h2>
        <p class="hint">
          Due punti fissi: sulla corda successiva, lo <b>stesso tasto</b> è la <b>4ª</b>; due corde sopra e{' '}
          <b>due tasti avanti</b> c'è l'<b>8ª</b>. Gli altri intervalli si contano da lì: la 3ª minore è due tasti prima
          della 4ª, la 5ª due tasti dopo, la 7ª minore due tasti prima dell'8ª. Quando si attraversa la corda Si (dalla 3ª
          alla 2ª) 4ª e 8ª sono un tasto più avanti: i pallini tratteggiati ne tengono conto.
        </p>
        {spots.map(({ k, positions }) => {
          const s = semitones(k);
          const name = nameAbove(k);
          return (
            <div class="iv-row" key={k}>
              <span class={`iv-dot fb-${kindOf(k)}`}>{DEGREE_LABEL[k]}</span>
              <div>
                <b>{k === 'd5' ? 'Tritono (5ª diminuita)' : capitalize(intervalName(k))}</b>
                {name && ` · ${noteName(rootPc, naming)} → ${name}`}
                <span class="muted"> · {s === 1 ? '1 semitono' : `${s} semitoni`}</span>
                {positions.length ? (
                  <ul class="iv-ways">
                    {positions.map((p) => (
                      <li key={`${p.string}-${p.fret}`}>
                        {capitalize(shapeWords(s, st.root.string as GuitarString, p.string as GuitarString))}
                        {crossesB(st.root.string, p.string) && ' (attraverso la corda Si: un tasto in più)'}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p class="hint small">
                    {st.root.string === 1 ? 'Sopra il cantino non ci sono corde più acute: ' : 'Qui non ci sono disegni a portata di mano: '}
                    {st.sameString ? 'sposta la fondamentale.' : 'prova a mostrare anche la stessa corda o a spostare la fondamentale.'}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </section>

      <section class="panel">
        <h2 class="panel-title">Opzioni</h2>
        <Radio
          label="Etichette"
          options={[
            { value: 'degrees' as const, label: 'Gradi (♭3, 5, ♭7)' },
            { value: 'notes' as const, label: 'Note' },
          ]}
          value={st.labels}
          onChange={(labels) => set({ labels })}
        />
        <Radio
          label="Riferimenti (4ª e 8ª tratteggiate)"
          options={[
            { value: 'yes', label: 'Mostra' },
            { value: 'no', label: 'Nascondi' },
          ]}
          value={st.anchors ? 'yes' : 'no'}
          onChange={(v) => set({ anchors: v === 'yes' })}
        />
        <Radio
          label="Anche sulla stessa corda"
          options={[
            { value: 'no', label: 'No' },
            { value: 'yes', label: 'Sì' },
          ]}
          value={st.sameString ? 'yes' : 'no'}
          onChange={(v) => set({ sameString: v === 'yes' })}
        />
      </section>
    </>
  );
}

const capitalize = (t: string) => t[0].toUpperCase() + t.slice(1);

/** Vero se tra le due corde c'è il passaggio dalla Sol (3ª) alla Si (2ª). */
const crossesB = (lower: number, upper: number) => lower >= 3 && upper <= 2;
