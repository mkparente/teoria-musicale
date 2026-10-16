import { useState } from 'preact/hooks';
import { NotePicker, type PickMark } from '../components/NotePicker';
import { Feedback, Radio, Shell, Toggles } from '../components/Shell';
import { Staff } from '../components/Staff';
import { useSettings, useStored } from '../store';
import { tiered } from '../srs/srs';
import { STRINGS, STRING_NAMES, soundingMidi } from '../theory/guitar';
import {
  type Accidental,
  type Letter,
  type Naming,
  type Note,
  ACCIDENTAL_WORDS,
  diatonicIndex,
  fromDiatonicIndex,
  midi,
  noteName,
  samePitchClass,
} from '../theory/notes';
import { accidentalInKey, keyName, signatureLabel, tonicFromSignature } from '../theory/scales';
import { type Outcome, useExercise } from './useExercise';

type Range = 'staff' | 'near' | 'far';
type Kind = 'notes' | 'keys';

interface Config {
  kind: Kind;
  ranges: Range[];
  accidentals: boolean;
  maxAcc: number;
  guitarClef: boolean;
}

const DEFAULT: Config = { kind: 'notes', ranges: ['staff', 'near'], accidentals: false, maxAcc: 4, guitarClef: true };

export const PREFIX = 'rd:';

// Indici diatonici (ottava * 7 + lettera): Mi4 = 30 è la prima riga.
const BOTTOM_LINE = 30;
const RANGES: Record<Range, number[]> = {
  staff: [30, 31, 32, 33, 34, 35, 36, 37, 38], // Mi4 – Fa5
  near: [27, 28, 29, 39, 40, 41], // Si3 – Re4, Sol5 – Si5
  far: [23, 24, 25, 26, 42, 43, 44], // Mi3 – La3, Do6 – Mi6 (estremi della chitarra)
};

/** Mi♯, Si♯, Fa♭ e Do♭ esistono ma per ora si lasciano fuori. */
const usefulAcc = (letter: Letter, acc: Accidental) =>
  !(acc === 1 && (letter === 2 || letter === 6)) && !(acc === -1 && (letter === 3 || letter === 0));

export function buildPool(c: Config): string[] {
  if (c.kind === 'keys') {
    const tiers: string[][] = Array.from({ length: c.maxAcc }, () => []);
    for (let n = 1; n <= c.maxAcc; n++) {
      for (const sig of [n, -n]) {
        for (let l = 0; l < 7; l++) tiers[n - 1].push(`${PREFIX}key:${sig}:${l}`);
      }
    }
    return tiered(tiers);
  }
  const ranges = (['staff', 'near', 'far'] as Range[]).filter((r) => c.ranges.includes(r));
  const natural = ranges.map((r) => RANGES[r].map((i) => `${PREFIX}n:${i}:0`));
  const altered = !c.accidentals
    ? []
    : ranges.map((r) =>
        RANGES[r].flatMap((i) =>
          ([1, -1] as Accidental[]).filter((a) => usefulAcc(fromDiatonicIndex(i).letter, a)).map((a) => `${PREFIX}n:${i}:${a}`),
        ),
      );
  return tiered([...natural, ...altered]);
}

type Q = { note: Note; sig: number };

function parse(id: string): Q {
  const [kind, a, b] = id.slice(PREFIX.length).split(':');
  if (kind === 'n') return { note: fromDiatonicIndex(Number(a), Number(b) as Accidental), sig: 0 };
  const sig = Number(a);
  const letter = Number(b) as Letter;
  const options = [...RANGES.staff, ...RANGES.near].filter((i) => i % 7 === letter);
  const idx = options[Math.floor(Math.random() * options.length)];
  return { note: fromDiatonicIndex(idx, accidentalInKey(letter, sig)), sig };
}

export function describe(id: string, naming: Naming): string {
  const [kind, a, b] = id.slice(PREFIX.length).split(':');
  if (kind === 'n') {
    const note = fromDiatonicIndex(Number(a), Number(b) as Accidental);
    return `${noteName(note, naming)}${note.octave} ${staffPosition(note)}`;
  }
  return `${noteName({ letter: Number(b) as Letter, acc: 0 }, naming)} con ${signatureLabel(Number(a))} in chiave`;
}

/** Dove sta la nota sul rigo, a parole. */
export function staffPosition(note: Note): string {
  const p = diatonicIndex(note) - BOTTOM_LINE;
  if (p >= 0 && p <= 8) return p % 2 === 0 ? `sulla ${p / 2 + 1}ª riga` : `nel ${(p + 1) / 2}° spazio`;
  if (p < 0) {
    const k = -p;
    if (k % 2 === 0) return `sul ${k / 2}° taglio addizionale sotto`;
    return k === 1 ? 'appena sotto la 1ª riga' : `sotto il ${(k - 1) / 2}° taglio addizionale`;
  }
  const q = p - 8;
  if (q % 2 === 0) return `sul ${q / 2}° taglio addizionale sopra`;
  return q === 1 ? 'appena sopra la 5ª riga' : `sopra il ${(q - 1) / 2}° taglio addizionale`;
}

/** Dove si suona sulla chitarra la nota scritta (che suona un'ottava sotto). */
function guitarPlaces(note: Note): string {
  const target = midi(note) - 12;
  const places = STRINGS.flatMap((string) => {
    const fret = target - soundingMidi({ string, fret: 0 });
    return fret >= 0 && fret <= 12 ? [`${STRING_NAMES[string].split(' (')[0]} ${fret === 0 ? 'a vuoto' : `tasto ${fret}`}`] : [];
  });
  return places.length ? `Sulla chitarra: ${places.slice(0, 3).join(', ')}.` : '';
}

export function ReadingQuiz() {
  const [config, setConfig] = useStored<Config>('cfg.read', DEFAULT);
  const ex = useExercise(() => buildPool(config), parse, JSON.stringify(config));

  const settings = (
    <>
      <Radio
        label="Esercizio"
        options={[
          { value: 'notes' as Kind, label: 'Leggi le note' },
          { value: 'keys' as Kind, label: 'Con armatura di chiave' },
        ]}
        value={config.kind}
        onChange={(kind) => setConfig({ ...config, kind })}
      />
      {config.kind === 'notes' ? (
        <>
          <Toggles
            label="Estensione"
            options={[
              { value: 'staff' as Range, label: 'Dentro il rigo' },
              { value: 'near' as Range, label: 'Primo taglio' },
              { value: 'far' as Range, label: 'Tagli lontani' },
            ]}
            value={config.ranges}
            onChange={(ranges) => setConfig({ ...config, ranges })}
          />
          <Radio
            label="Alterazioni"
            options={[
              { value: 'no', label: 'Solo naturali' },
              { value: 'yes', label: 'Anche ♯ e ♭' },
            ]}
            value={config.accidentals ? 'yes' : 'no'}
            onChange={(v) => setConfig({ ...config, accidentals: v === 'yes' })}
          />
        </>
      ) : (
        <Radio
          label="Alterazioni in chiave fino a"
          options={[1, 2, 3, 4, 5, 6, 7].map((v) => ({ value: v, label: String(v) }))}
          value={config.maxAcc}
          onChange={(maxAcc) => setConfig({ ...config, maxAcc })}
        />
      )}
      <Radio
        label="Chiave"
        options={[
          { value: 'g', label: 'Violino per chitarra (8 sotto)' },
          { value: 'v', label: 'Violino' },
        ]}
        value={config.guitarClef ? 'g' : 'v'}
        onChange={(v) => setConfig({ ...config, guitarClef: v === 'g' })}
      />
    </>
  );

  return (
    <Shell title="Lettura delle note" session={ex.session} settings={settings}>
      {ex.error && <p class="empty">{ex.error}</p>}
      {ex.current && (
        <QuestionView
          key={ex.current.n}
          q={ex.current.q}
          config={config}
          outcome={ex.outcome}
          finish={ex.finish}
          next={ex.next}
        />
      )}
    </Shell>
  );
}

function QuestionView({
  q,
  config,
  outcome,
  finish,
  next,
}: {
  q: Q;
  config: Config;
  outcome: Outcome | null;
  finish: (ok: boolean) => void;
  next: () => void;
}) {
  const [{ naming }] = useSettings();
  const [marks, setMarks] = useState<PickMark[]>([]);
  const withAcc = config.kind === 'keys' || config.accidentals;

  const answer = (pc: { letter: Letter; acc: Accidental }) => {
    const ok = samePitchClass(pc, q.note);
    setMarks(ok ? [{ pc: q.note, kind: 'ok' }] : [{ pc, kind: 'bad' }, { pc: q.note, kind: 'ok' }]);
    finish(ok);
  };

  const inKey = q.sig !== 0 && q.note.acc !== 0;
  return (
    <div class="question">
      <p class="prompt">Che nota è?</p>
      <Staff
        notes={[{ note: q.note, color: outcome ? (outcome.correct ? 'var(--ok)' : 'var(--bad)') : undefined }]}
        keySig={q.sig}
        guitar={config.guitarClef}
        zoom={1.9}
        maxWidth={330}
      />
      <NotePicker onPick={answer} accidentals={withAcc} marks={marks} disabled={!!outcome} />
      <Feedback outcome={outcome} onNext={next}>
        <p>
          È <b>{noteName(q.note, naming)}</b>, {staffPosition(q.note)}.
        </p>
        {q.sig !== 0 && (
          <p>
            {inKey
              ? `L'armatura (${signatureLabel(q.sig)}, ${keyName(tonicFromSignature(q.sig, 'major'), 'major', naming)}) rende ${ACCIDENTAL_WORDS[q.note.acc]} ogni ${noteName({ ...q.note, acc: 0 }, naming)}.`
              : `${noteName(q.note, naming)} non è tra le alterazioni in chiave, quindi resta naturale.`}
          </p>
        )}
        {config.guitarClef && <p class="tip">{guitarPlaces(q.note)}</p>}
      </Feedback>
    </div>
  );
}
