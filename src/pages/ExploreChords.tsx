import { type FretMark, Fretboard } from '../components/Fretboard';
import { Radio } from '../components/Shell';
import { Staff } from '../components/Staff';
import { triadRecipe } from '../exercises/TriadQuiz';
import { useSettings, useStored } from '../store';
import { type FretPos, soundingMidi } from '../theory/guitar';
import { type Quality, INVERSIONS, QUALITIES, QUALITY_LIST, buildTriad, chordName, chordRoot } from '../theory/chords';
import { noteName, pitchClass, stackUp } from '../theory/notes';
import {
  type CagedForm,
  FORM_NAMES,
  STRING_SETS,
  cagedAlongNeck,
  cagedVoicing,
  formContaining,
  highestFret,
  lowestFret,
  setLabel,
  triadVoicing,
} from '../theory/positions';

interface State {
  root: number;
  quality: Quality;
  view: 'caged' | 'triads';
  form: 'all' | CagedForm;
  set: number;
  inversion: 'all' | number;
  labels: 'notes' | 'degrees';
}

const DEFAULT: State = { root: 0, quality: 'maj', view: 'caged', form: 'all', set: 0, inversion: 'all', labels: 'degrees' };

/** La stessa diteggiatura anche un'ottava sopra, se sta nei primi 15 tasti. */
const withOctave = (v: FretPos[]) => (highestFret(v) + 12 <= 15 ? [v, v.map((p) => ({ ...p, fret: p.fret + 12 }))] : [v]);

const ROOT_STRING: Record<CagedForm, string> = { C: '5ª corda', A: '5ª corda', G: '6ª corda', E: '6ª corda', D: '4ª corda' };

export function ExploreChords() {
  const [{ naming }] = useSettings();
  const [st, setSt] = useStored<State>('explore.chords', DEFAULT);
  const set = (patch: Partial<State>) => setSt({ ...st, ...patch });

  const root = chordRoot(st.root, st.quality);
  const triad = buildTriad(root, st.quality);
  const tones = triad.map(pitchClass) as [number, number, number];
  const cagedOk = st.quality === 'maj' || st.quality === 'min';
  const view = cagedOk ? st.view : 'triads';
  const cq = st.quality as 'maj' | 'min';

  const label = (pos: FretPos) => {
    const i = tones.indexOf(soundingMidi(pos) % 12);
    return st.labels === 'notes' ? noteName(triad[i], naming) : QUALITIES[st.quality].labels[i];
  };
  const toMarks = (positions: FretPos[]): FretMark[] => {
    const seen = new Set<string>();
    return positions
      .filter((p) => !seen.has(`${p.string}-${p.fret}`) && seen.add(`${p.string}-${p.fret}`))
      .map((pos) => ({ pos, kind: soundingMidi(pos) % 12 === tones[0] ? 'root' : 'note', label: label(pos) }));
  };

  let marks: FretMark[] = [];
  let region: { lo: number; hi: number } | undefined;
  let notes: string[] = [];
  const order = cagedOk ? cagedAlongNeck(st.root, cq) : [];

  if (view === 'caged') {
    if (st.form === 'all') {
      marks = toMarks(order.flatMap((f) => withOctave(cagedVoicing(st.root, cq, f)).flat()));
      notes = [
        `Salendo lungo il manico: ${order.map((f) => `${f} (tasto ${lowestFret(cagedVoicing(st.root, cq, f))})`).join(' → ')}, e poi si ricomincia un'ottava sopra.`,
      ];
    } else {
      const v = cagedVoicing(st.root, cq, st.form);
      marks = toMarks(v);
      region = { lo: lowestFret(v), hi: highestFret(v) };
      notes = [
        `Forma di ${FORM_NAMES[st.form]} (${st.form}): è l'accordo aperto di ${FORM_NAMES[st.form]} ${st.quality === 'maj' ? 'maggiore' : 'minore'} spostato lungo il manico. Fondamentale sulla ${ROOT_STRING[st.form]}, tasti ${region.lo}–${region.hi}.`,
      ];
    }
  } else {
    const strings = STRING_SETS[st.set];
    const invs = st.inversion === 'all' ? [0, 1, 2] : [st.inversion];
    // In ordine di posizione sul manico, dal capotasto in su.
    const voicings = invs
      .map((inv) => ({ inv, v: triadVoicing(tones, strings, inv) }))
      .sort((a, b) => lowestFret(a.v) - lowestFret(b.v));
    marks = toMarks(voicings.flatMap(({ v }) => (st.inversion === 'all' ? withOctave(v).flat() : v)));
    if (st.inversion !== 'all') region = { lo: lowestFret(voicings[0].v), hi: highestFret(voicings[0].v) };
    notes = voicings.map(({ inv, v }) => {
      const form = cagedOk ? formContaining(v, st.root, cq) : null;
      const bass = noteName(triad[inv], naming);
      const frets = v.map((p) => p.fret).join(', ');
      return `${INVERSIONS[inv][0].toUpperCase()}${INVERSIONS[inv].slice(1)} (basso ${bass}): tasti ${frets} dalla ${strings[0]}ª alla ${strings[2]}ª corda${form ? `, dentro la forma ${form}` : ''}.`;
    });
  }
  const maxFret = Math.max(12, ...marks.map((m) => m.pos.fret));
  const activeStrings = view === 'triads' ? STRING_SETS[st.set] : undefined;

  return (
    <>
      <Radio
        label="Accordo"
        options={QUALITY_LIST.map((q) => ({ value: q, label: QUALITIES[q].name }))}
        value={st.quality}
        onChange={(quality) => set({ quality })}
      />
      <Radio
        label="Fondamentale"
        options={Array.from({ length: 12 }, (_, i) => ({ value: i, label: noteName(chordRoot(i, st.quality), naming) }))}
        value={st.root}
        onChange={(r) => set({ root: r })}
      />

      <section class="panel">
        <p class="caption">{chordName(root, st.quality, naming)}</p>
        <Staff notes={stackUp(triad).map((note) => ({ note }))} chord zoom={1.5} maxWidth={260} />
        <p class="tones">
          {triad.map((t) => noteName(t, naming)).join(' – ')}{' '}
          <small>({QUALITIES[st.quality].labels.join(' – ')})</small>
        </p>
        <p class="tip">
          Triade {QUALITIES[st.quality].triad}: {triadRecipe(st.quality)}.
        </p>
      </section>

      <section class="panel">
        <h2 class="section">Sul manico</h2>
        {cagedOk ? (
          <Radio
            label="Vista"
            options={[
              { value: 'caged' as const, label: 'Forme CAGED' },
              { value: 'triads' as const, label: 'Triadi su 3 corde' },
            ]}
            value={view}
            onChange={(v) => set({ view: v })}
          />
        ) : (
          <p class="hint">Le forme CAGED sono per accordi maggiori e minori: qui vedi le triadi su 3 corde.</p>
        )}
        {view === 'caged' ? (
          <Radio
            label="Forma"
            options={[
              { value: 'all' as const, label: 'Tutte' },
              ...order.map((f) => ({ value: f, label: `${f} (${FORM_NAMES[f]})` })),
            ]}
            value={st.form}
            onChange={(form) => set({ form })}
          />
        ) : (
          <>
            <Radio
              label="Corde"
              options={STRING_SETS.map((s, i) => ({ value: i, label: setLabel(s).replace('corde ', '') }))}
              value={st.set}
              onChange={(s) => set({ set: s })}
            />
            <Radio
              label="Rivolto"
              options={[
                { value: 'all' as const, label: 'Tutti' },
                ...INVERSIONS.map((name, i) => ({ value: i, label: name.replace('stato ', '') })),
              ]}
              value={st.inversion}
              onChange={(inversion) => set({ inversion })}
            />
          </>
        )}
        <Radio
          label="Etichette"
          options={[
            { value: 'degrees' as const, label: 'Gradi (1 3 5)' },
            { value: 'notes' as const, label: 'Note' },
          ]}
          value={st.labels}
          onChange={(labels) => set({ labels })}
        />
        <Fretboard maxFret={maxFret} marks={marks} region={region} activeStrings={activeStrings} />
        {notes.map((n) => (
          <p class="hint" key={n}>
            {n}
          </p>
        ))}
        {view === 'triads' && (
          <p class="tip">
            Sulle {setLabel(STRING_SETS[st.set])} i tre rivolti si susseguono salendo lungo il manico: dopo il secondo rivolto
            ritrovi lo stato fondamentale un'ottava sopra.
          </p>
        )}
      </section>
    </>
  );
}
