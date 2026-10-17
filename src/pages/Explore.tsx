import { type FretMark, Fretboard, Legend, chordToneKind } from '../components/Fretboard';
import { Radio } from '../components/Shell';
import { Staff } from '../components/Staff';
import { ScaleExplain } from '../exercises/ScaleQuiz';
import { DiatonicTable } from '../exercises/TriadQuiz';
import { ExploreChords } from './ExploreChords';
import { useSettings, useStored } from '../store';
import { type FretPos, positionsOf, soundingMidi } from '../theory/guitar';
import { pentatonicBox } from '../theory/positions';
import { mod, noteName, pcKey, pitchClass } from '../theory/notes';
import {
  type ScaleType,
  ROMAN,
  SCALES,
  SCALE_TYPES,
  buildScale,
  degreeFunction,
  degreeLabel,
  isPentatonic,
  keySignature,
  relativeMajor,
  relativeMinor,
  scaleName,
  signatureLabel,
  tonicsFor,
} from '../theory/scales';

interface State {
  type: ScaleType;
  tonic: string;
  labels: 'notes' | 'degrees';
  maxFret: number;
  /** Posizione della pentatonica (1..5), 0 = tutto il manico. */
  box: number;
}

/** La relativa della stessa famiglia: maggiore ↔ minore naturale, pentatonica ↔ pentatonica. */
const RELATIVE_TYPE: Record<ScaleType, ScaleType> = {
  major: 'natural',
  natural: 'major',
  harmonic: 'major',
  melodic: 'major',
  pentMajor: 'pentMinor',
  pentMinor: 'pentMajor',
};

function ExploreScales() {
  const [{ naming }] = useSettings();
  const [st, setSt] = useStored<State>('explore', { type: 'major', tonic: '0', labels: 'notes', maxFret: 12, box: 0 });
  const mode = SCALES[st.type].mode;
  const tonics = tonicsFor(mode);
  // Cambiando tra maggiore e minore la tonica scelta potrebbe non esistere: si torna alla prima.
  const tonic = tonics.find((t) => pcKey(t) === st.tonic) ?? tonics[0];
  const scale = buildScale(tonic, st.type);
  const sig = keySignature(tonic, mode);
  const relative = mode === 'major' ? relativeMinor(tonic) : relativeMajor(tonic);

  const pent = isPentatonic(st.type);
  const box = pent ? st.box : 0;
  const relType = RELATIVE_TYPE[st.type];
  const label = (d: number) =>
    st.labels === 'notes' ? noteName(scale[d], naming) : pent ? degreeLabel(st.type, d) : String(d + 1);
  // Tonica, terza e quinta della scala colorate come le note dell'accordo di tonica.
  const stepFromTonic = (d: number) => mod(scale[d].letter - tonic.letter, 7);
  const thirdIsMinor = mod(pitchClass(scale.find((_, d) => stepFromTonic(d) === 2)!) - pitchClass(tonic), 12) === 3;
  const mark = (pos: FretPos, d: number): FretMark => ({
    pos,
    kind: chordToneKind([0, 2, 4].indexOf(stepFromTonic(d))),
    label: label(d),
  });

  const pcs = scale.map(pitchClass);
  const boxPositions = box ? pentatonicBox(scale, box) : [];
  const marks: FretMark[] = box
    ? boxPositions.map((pos) => mark(pos, pcs.indexOf(soundingMidi(pos) % 12)))
    : scale.flatMap((p, d) => positionsOf(pitchClass(p), st.maxFret).map((pos) => mark(pos, d)));
  const maxFret = Math.max(st.maxFret, ...boxPositions.map((p) => p.fret));

  return (
    <>
      <Radio
        label="Scala"
        options={SCALE_TYPES.map((t) => ({ value: t, label: SCALES[t].name }))}
        value={st.type}
        onChange={(type) => setSt({ ...st, type })}
      />
      <Radio
        label="Tonica"
        options={tonics.map((t) => ({ value: pcKey(t), label: noteName(t, naming) }))}
        value={pcKey(tonic)}
        onChange={(t) => setSt({ ...st, tonic: t })}
      />

      <section class="panel">
        <ScaleExplain tonic={tonic} type={st.type} />
        <div class="facts">
          <div>
            <span class="k">Armatura</span>
            <span>{signatureLabel(sig)}</span>
          </div>
          <div>
            <span class="k">Relativa</span>
            <a
              href="#/esplora"
              onClick={(e) => {
                e.preventDefault();
                setSt({ ...st, type: relType, tonic: pcKey(relative) });
              }}
            >
              {scaleName(relative, relType, naming)}
            </a>
          </div>
        </div>
        {sig !== 0 && <Staff notes={[]} keySig={sig} zoom={1.2} maxWidth={300} />}
        <table class="degrees">
          <tbody>
            {scale.map((p, d) => (
              <tr key={d}>
                <td>{pent ? degreeLabel(st.type, d) : ROMAN[d]}</td>
                <td>
                  <b>{noteName(p, naming)}</b>
                </td>
                <td>{degreeFunction(st.type, d)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!pent && (
          <>
            <h3 class="sub">Triadi della tonalità</h3>
            <DiatonicTable tonic={tonic} type={st.type} />
          </>
        )}
      </section>

      <section class="panel">
        <h2 class="section">Sul manico</h2>
        <Radio
          label="Etichette"
          options={[
            { value: 'notes' as const, label: 'Note' },
            { value: 'degrees' as const, label: 'Gradi' },
          ]}
          value={st.labels}
          onChange={(labels) => setSt({ ...st, labels })}
        />
        {pent && (
          <Radio
            label="Posizione"
            options={[0, 1, 2, 3, 4, 5].map((b) => ({ value: b, label: b === 0 ? 'Tutto il manico' : String(b) }))}
            value={box}
            onChange={(b) => setSt({ ...st, box: b })}
          />
        )}
        <Fretboard maxFret={maxFret} marks={marks} />
        <Legend labels={['1 tonica', `${thirdIsMinor ? '♭3' : '3'} terza`, '5 quinta']} other="altre note della scala" />
        {box > 0 && (
          <p class="hint">
            Due note per corda; la posizione 1 parte dalla tonica sul Mi basso e ogni posizione comincia dove finisce la precedente.
            Tonica, terza e quinta formano l'accordo di tonica: è la forma CAGED nascosta dentro il box.
          </p>
        )}
      </section>
    </>
  );
}

/** Pagina "Esplora": scale oppure accordi. */
export function Explore() {
  const [tab, setTab] = useStored<'scales' | 'chords'>('explore.tab', 'scales');
  return (
    <div class="exercise">
      <header class="ex-head">
        <a href="#/" class="back" aria-label="Torna alla home">
          ‹
        </a>
        <h1>Esplora</h1>
      </header>
      <div class="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'scales'} class={tab === 'scales' ? 'on' : ''} onClick={() => setTab('scales')}>
          Scale
        </button>
        <button role="tab" aria-selected={tab === 'chords'} class={tab === 'chords' ? 'on' : ''} onClick={() => setTab('chords')}>
          Accordi
        </button>
      </div>
      {tab === 'scales' ? <ExploreScales /> : <ExploreChords />}
    </div>
  );
}
