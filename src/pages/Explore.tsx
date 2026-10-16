import { type FretMark, Fretboard } from '../components/Fretboard';
import { Radio } from '../components/Shell';
import { Staff } from '../components/Staff';
import { ScaleExplain } from '../exercises/ScaleQuiz';
import { useSettings, useStored } from '../store';
import { positionsOf } from '../theory/guitar';
import { noteName, pcKey, pitchClass } from '../theory/notes';
import {
  type ScaleType,
  ROMAN,
  SCALES,
  SCALE_TYPES,
  buildScale,
  degreeName,
  keyName,
  keySignature,
  relativeMajor,
  relativeMinor,
  signatureLabel,
  tonicsFor,
} from '../theory/scales';

interface State {
  type: ScaleType;
  tonic: string;
  labels: 'notes' | 'degrees';
  maxFret: number;
}

export function Explore() {
  const [{ naming }] = useSettings();
  const [st, setSt] = useStored<State>('explore', { type: 'major', tonic: '0', labels: 'notes', maxFret: 12 });
  const mode = SCALES[st.type].mode;
  const tonics = tonicsFor(mode);
  // Cambiando tra maggiore e minore la tonica scelta potrebbe non esistere: si torna alla prima.
  const tonic = tonics.find((t) => pcKey(t) === st.tonic) ?? tonics[0];
  const scale = buildScale(tonic, st.type);
  const sig = keySignature(tonic, mode);
  const relative = mode === 'major' ? relativeMinor(tonic) : relativeMajor(tonic);

  const marks: FretMark[] = scale.flatMap((p, d) =>
    positionsOf(pitchClass(p), st.maxFret).map((pos) => ({
      pos,
      kind: d === 0 ? ('root' as const) : ('note' as const),
      label: st.labels === 'notes' ? noteName(p, naming) : String(d + 1),
    })),
  );

  return (
    <div class="exercise">
      <header class="ex-head">
        <a href="#/" class="back" aria-label="Torna alla home">
          ‹
        </a>
        <h1>Esplora le scale</h1>
      </header>
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
                setSt({ ...st, type: mode === 'major' ? 'natural' : 'major', tonic: pcKey(relative) });
              }}
            >
              {keyName(relative, mode === 'major' ? 'minor' : 'major', naming)}
            </a>
          </div>
        </div>
        {sig !== 0 && <Staff notes={[]} keySig={sig} zoom={1.2} maxWidth={300} />}
        <table class="degrees">
          <tbody>
            {scale.map((p, d) => (
              <tr key={d}>
                <td>{ROMAN[d]}</td>
                <td>
                  <b>{noteName(p, naming)}</b>
                </td>
                <td>{degreeName(scale, d)}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
        <Fretboard maxFret={st.maxFret} marks={marks} />
        <p class="hint">La tonica è evidenziata.</p>
      </section>
    </div>
  );
}
