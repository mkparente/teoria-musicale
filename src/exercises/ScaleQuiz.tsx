import { useState } from 'preact/hooks';
import { Choices, NotePicker, type PickMark } from '../components/NotePicker';
import { Feedback, Radio, Shell, Toggles } from '../components/Shell';
import { Staff } from '../components/Staff';
import { useSettings, useStored } from '../store';
import { tiered } from '../srs/srs';
import { type Naming, type PitchClass, enharmonic, noteName, parsePcKey, pcKey, samePitchClass } from '../theory/notes';
import {
  type Mode,
  type ScaleType,
  ROMAN,
  SCALES,
  SCALE_TYPES,
  buildScale,
  degreeName,
  keyName,
  keySignature,
  ordinal,
  relativeMajor,
  relativeMinor,
  scaleName,
  scaleNotes,
  signatureAccidentals,
  signatureLabel,
  signatureShort,
  tonicFromSignature,
  tonicsFor,
} from '../theory/scales';
import { type Outcome, useExercise } from './useExercise';

type Kind = 'deg' | 'which' | 'sig' | 'key' | 'rel' | 'write';

const KINDS: { value: Kind; label: string }[] = [
  { value: 'deg', label: 'Trova il grado' },
  { value: 'which', label: 'Che grado è' },
  { value: 'sig', label: 'Armatura' },
  { value: 'key', label: 'Da armatura a tonalità' },
  { value: 'rel', label: 'Relative' },
  { value: 'write', label: 'Scrivi la scala' },
];

interface Config {
  kinds: Kind[];
  scales: ScaleType[];
  maxAcc: number;
}

const DEFAULT: Config = { kinds: ['deg', 'which', 'sig', 'key', 'rel', 'write'], scales: [...SCALE_TYPES], maxAcc: 7 };

export const PREFIX = 'sq:';

export function buildPool(c: Config): string[] {
  const tiers: string[][] = Array.from({ length: 8 }, () => []);
  const add = (sig: number, id: string) => {
    if (Math.abs(sig) <= c.maxAcc) tiers[Math.abs(sig)].push(PREFIX + id);
  };
  const modes = new Set<Mode>(c.scales.map((t) => SCALES[t].mode));

  for (const type of c.scales) {
    for (const tonic of tonicsFor(SCALES[type].mode)) {
      const sig = keySignature(tonic, SCALES[type].mode);
      const t = pcKey(tonic);
      for (let d = 1; d < 7; d++) {
        if (c.kinds.includes('deg')) add(sig, `deg:${type}:${t}:${d}`);
        if (c.kinds.includes('which')) add(sig, `which:${type}:${t}:${d}`);
      }
      if (c.kinds.includes('write')) add(sig, `write:${type}:${t}`);
    }
  }
  for (const mode of modes) {
    for (const tonic of tonicsFor(mode)) {
      const sig = keySignature(tonic, mode);
      if (c.kinds.includes('sig')) add(sig, `sig:${mode}:${pcKey(tonic)}`);
      if (c.kinds.includes('key')) add(sig, `key:${mode}:${sig}`);
      if (c.kinds.includes('rel')) add(sig, `rel:${mode}:${pcKey(tonic)}`);
    }
  }
  return tiered(tiers);
}

type Q =
  | { kind: 'deg' | 'which'; type: ScaleType; tonic: PitchClass; d: number }
  | { kind: 'write'; type: ScaleType; tonic: PitchClass }
  | { kind: 'sig' | 'rel'; mode: Mode; tonic: PitchClass }
  | { kind: 'key'; mode: Mode; sig: number };

function parse(id: string): Q {
  const [kind, a, b, c] = id.slice(PREFIX.length).split(':');
  switch (kind) {
    case 'deg':
    case 'which':
      return { kind, type: a as ScaleType, tonic: parsePcKey(b), d: Number(c) };
    case 'write':
      return { kind, type: a as ScaleType, tonic: parsePcKey(b) };
    case 'sig':
    case 'rel':
      return { kind, mode: a as Mode, tonic: parsePcKey(b) };
    default:
      return { kind: 'key', mode: a as Mode, sig: Number(b) };
  }
}

const typeLabel = (type: ScaleType) => (type === 'melodic' ? 'minore melodica (ascendente)' : SCALES[type].name);

/** Descrizione leggibile di un elemento, per le statistiche. */
export function describe(id: string, naming: Naming): string {
  const q = parse(id);
  const n = (p: PitchClass) => noteName(p, naming);
  switch (q.kind) {
    case 'deg':
      return `${ordinal(q.d)} grado di ${scaleName(q.tonic, q.type, naming)}`;
    case 'which':
      return `che grado è ${n(buildScale(q.tonic, q.type)[q.d])} in ${scaleName(q.tonic, q.type, naming)}`;
    case 'write':
      return `scrivere ${scaleName(q.tonic, q.type, naming)}`;
    case 'sig':
      return `armatura di ${keyName(q.tonic, q.mode, naming)}`;
    case 'rel':
      return `relativa di ${keyName(q.tonic, q.mode, naming)}`;
    case 'key':
      return `tonalità ${q.mode === 'major' ? 'maggiore' : 'minore'} con ${signatureLabel(q.sig)}`;
  }
}

export function ScaleQuiz() {
  const [config, setConfig] = useStored<Config>('cfg.scale', DEFAULT);
  const ex = useExercise(() => buildPool(config), parse, JSON.stringify(config));

  const settings = (
    <>
      <Toggles label="Domande" options={KINDS} value={config.kinds} onChange={(kinds) => setConfig({ ...config, kinds })} />
      <Toggles
        label="Scale"
        options={SCALE_TYPES.map((t) => ({ value: t, label: SCALES[t].name }))}
        value={config.scales}
        onChange={(scales) => setConfig({ ...config, scales })}
      />
      <Radio
        label="Alterazioni in chiave fino a"
        options={Array.from({ length: 8 }, (_, i) => ({ value: i, label: String(i) }))}
        value={config.maxAcc}
        onChange={(maxAcc) => setConfig({ ...config, maxAcc })}
      />
    </>
  );

  return (
    <Shell title="Quiz sulle scale" session={ex.session} settings={settings}>
      {ex.error && <p class="empty">{ex.error}</p>}
      {ex.current && (
        <QuestionView key={ex.current.n} q={ex.current.q} outcome={ex.outcome} finish={ex.finish} next={ex.next} />
      )}
    </Shell>
  );
}

interface ViewProps {
  q: Q;
  outcome: Outcome | null;
  finish: (correct: boolean) => void;
  next: () => void;
}

function QuestionView({ q, outcome, finish, next }: ViewProps) {
  const [{ naming }] = useSettings();
  const [marks, setMarks] = useState<PickMark[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const n = (p: PitchClass) => noteName(p, naming);

  const answerNote = (picked: PitchClass, right: PitchClass) => {
    const ok = samePitchClass(picked, right);
    setMarks(ok ? [{ pc: right, kind: 'ok' }] : [{ pc: picked, kind: 'bad' }, { pc: right, kind: 'ok' }]);
    if (!ok && enharmonic(picked, right)) {
      setNote(`${n(picked)} suona uguale, ma qui si scrive ${n(right)}: in una scala ogni lettera compare una volta sola.`);
    }
    finish(ok);
  };

  if (q.kind === 'write') return <WriteScale q={q} outcome={outcome} finish={finish} next={next} />;

  if (q.kind === 'deg' || q.kind === 'which') {
    const scale = buildScale(q.tonic, q.type);
    const target = scale[q.d];
    const name = scaleName(q.tonic, q.type, naming);
    return (
      <div class="question">
        {q.kind === 'deg' ? (
          <p class="prompt">
            Qual è il <b>{ordinal(q.d)} grado</b> della scala di <b>{n(q.tonic)} {typeLabel(q.type)}</b>?
          </p>
        ) : (
          <p class="prompt">
            Nella scala di <b>{n(q.tonic)} {typeLabel(q.type)}</b>, che grado è <b>{n(target)}</b>?
          </p>
        )}
        {q.kind === 'deg' ? (
          <NotePicker onPick={(p) => answerNote(p, target)} marks={marks} disabled={!!outcome} />
        ) : (
          <Choices
            options={ROMAN.map((r, i) => ({ value: i, label: r }))}
            columns={7}
            disabled={!!outcome}
            marks={outcome ? [{ value: q.d, kind: 'ok' as const }] : []}
            onPick={(v) => finish(v === q.d)}
          />
        )}
        <Feedback outcome={outcome} onNext={next}>
          {note && <p>{note}</p>}
          <p>
            {n(target)} è il {ordinal(q.d)} grado di {name} ({ROMAN[q.d]}, {degreeName(scale, q.d)}).
          </p>
          <ScaleExplain tonic={q.tonic} type={q.type} highlight={q.d} />
        </Feedback>
      </div>
    );
  }

  if (q.kind === 'sig') {
    const sig = keySignature(q.tonic, q.mode);
    const options = [0, ...[1, 2, 3, 4, 5, 6, 7].flatMap((i) => [i, -i])].map((s) => ({ value: s, label: signatureShort(s) }));
    return (
      <div class="question">
        <p class="prompt">
          Quali alterazioni ha in chiave <b>{keyName(q.tonic, q.mode, naming)}</b>?
        </p>
        <Choices
          options={options}
          columns={5}
          disabled={!!outcome}
          marks={outcome ? [{ value: sig, kind: 'ok' as const }] : []}
          onPick={(v) => finish(v === sig)}
        />
        <Feedback outcome={outcome} onNext={next}>
          <SignatureExplain sig={sig} />
          <ScaleExplain tonic={q.tonic} type={q.mode === 'major' ? 'major' : 'natural'} />
        </Feedback>
      </div>
    );
  }

  if (q.kind === 'key') {
    const tonic = tonicFromSignature(q.sig, q.mode);
    return (
      <div class="question">
        <p class="prompt">
          Quale tonalità <b>{q.mode === 'major' ? 'maggiore' : 'minore'}</b> ha questa armatura?
        </p>
        <Staff notes={[]} keySig={q.sig} zoom={1.6} maxWidth={360} />
        {q.sig === 0 && <p class="hint">Nessuna alterazione in chiave.</p>}
        <NotePicker onPick={(p) => answerNote(p, tonic)} marks={marks} disabled={!!outcome} />
        <Feedback outcome={outcome} onNext={next}>
          {note && <p>{note}</p>}
          <p>
            Con {signatureLabel(q.sig)} la tonalità {q.mode === 'major' ? 'maggiore' : 'minore'} è{' '}
            <b>{keyName(tonic, q.mode, naming)}</b>.
          </p>
          <SignatureExplain sig={q.sig} />
          <p class="tip">{keyTip(q.sig, q.mode, naming)}</p>
        </Feedback>
      </div>
    );
  }

  // Relative
  if (q.kind !== 'rel') return null;
  const target = q.mode === 'major' ? relativeMinor(q.tonic) : relativeMajor(q.tonic);
  const other: Mode = q.mode === 'major' ? 'minor' : 'major';
  return (
    <div class="question">
      <p class="prompt">
        Qual è la relativa <b>{other === 'minor' ? 'minore' : 'maggiore'}</b> di <b>{keyName(q.tonic, q.mode, naming)}</b>?
      </p>
      <NotePicker onPick={(p) => answerNote(p, target)} marks={marks} disabled={!!outcome} />
      <Feedback outcome={outcome} onNext={next}>
        {note && <p>{note}</p>}
        <p>
          {keyName(q.tonic, q.mode, naming)} e {keyName(target, other, naming)} hanno la stessa armatura (
          {signatureLabel(keySignature(q.tonic, q.mode))}).{' '}
          {q.mode === 'major'
            ? 'La relativa minore parte dal 6° grado della maggiore (una terza minore sotto).'
            : 'La relativa maggiore parte dal 3° grado della minore (una terza minore sopra).'}
        </p>
      </Feedback>
    </div>
  );
}

function keyTip(sig: number, mode: Mode, naming: Naming): string {
  if (sig === 0) return '';
  const accs = signatureAccidentals(sig);
  const lastAcc = noteName(accs[accs.length - 1], naming);
  if (mode === 'minor') {
    const major = tonicFromSignature(sig, 'major');
    return `Trucco: trova prima la maggiore (${noteName(major, naming)}) e scendi di una terza minore.`;
  }
  if (sig > 0) return `Trucco: con i diesis, la tonica maggiore è un semitono sopra l'ultimo diesis (${lastAcc}).`;
  if (sig === -1) return 'Un solo bemolle (Si♭): è Fa maggiore, da ricordare a memoria.';
  return `Trucco: con i bemolli, la tonica maggiore è il penultimo bemolle (${noteName(accs[accs.length - 2], naming)}).`;
}

function SignatureExplain({ sig }: { sig: number }) {
  const [{ naming }] = useSettings();
  if (sig === 0) return <p>Nessuna alterazione in chiave.</p>;
  return (
    <>
      <Staff notes={[]} keySig={sig} zoom={1.3} maxWidth={320} />
      <p>
        {signatureLabel(sig)}: {signatureAccidentals(sig).map((p) => noteName(p, naming)).join(', ')}.
      </p>
    </>
  );
}

/** La scala sul pentagramma con i gradi; per la melodica anche la discesa. */
export function ScaleExplain({ tonic, type, highlight }: { tonic: PitchClass; type: ScaleType; highlight?: number }) {
  const [{ naming }] = useSettings();
  const up = scaleNotes(tonic, type, 4);
  const toStaff = (notes: typeof up, desc = false) =>
    notes.map((note, i) => {
      const d = desc ? (7 - i) % 7 : i % 7;
      return {
        note,
        label: noteName(note, naming),
        color: highlight !== undefined && d === highlight ? 'var(--accent)' : undefined,
      };
    });
  return (
    <div class="scale-explain">
      <p class="caption">{scaleName(tonic, type, naming)}{type === 'melodic' ? ', ascendente' : ''}</p>
      <Staff notes={toStaff(up)} zoom={1.1} />
      {type === 'melodic' && (
        <>
          <p class="caption">discendente (uguale alla minore naturale)</p>
          <Staff notes={toStaff(scaleNotes(tonic, type, 4, true), true)} zoom={1.1} />
        </>
      )}
    </div>
  );
}

function WriteScale({ q, outcome, finish, next }: ViewProps & { q: Extract<Q, { kind: 'write' }> }) {
  const [{ naming }] = useSettings();
  const right = buildScale(q.tonic, q.type);
  const [entered, setEntered] = useState<{ pc: PitchClass; ok: boolean }[]>([]);
  const [lastWrong, setLastWrong] = useState<PitchClass | null>(null);
  const octaveNotes = scaleNotes(q.tonic, q.type, 4);

  const pick = (pc: PitchClass) => {
    const i = entered.length + 1;
    const ok = samePitchClass(pc, right[i]);
    const nextEntered = [...entered, { pc: right[i], ok }];
    setEntered(nextEntered);
    setLastWrong(ok ? null : pc);
    if (nextEntered.length === 6) finish(nextEntered.every((e) => e.ok));
  };

  const shown = [
    { note: octaveNotes[0], label: noteName(q.tonic, naming) },
    ...entered.map((e, i) => ({
      note: octaveNotes[i + 1],
      label: noteName(e.pc, naming),
      color: e.ok ? 'var(--ok)' : 'var(--bad)',
    })),
  ];

  return (
    <div class="question">
      <p class="prompt">
        Scrivi la scala di <b>{noteName(q.tonic, naming)} {typeLabel(q.type)}</b>, una nota alla volta.
      </p>
      <Staff notes={shown} zoom={1.2} />
      {/* Una riga sola, sempre presente, così i pulsanti non si spostano mentre rispondi. */}
      <p class={lastWrong && !outcome ? 'inline-bad' : 'hint'}>
        {lastWrong && !outcome
          ? `Non ${noteName(lastWrong, naming)}: era ${noteName(entered[entered.length - 1].pc, naming)}.`
          : outcome
            ? 'Scala completata.'
            : `Nota ${entered.length + 2} di 7`}
      </p>
      <NotePicker onPick={pick} disabled={!!outcome} />
      <Feedback outcome={outcome} onNext={next}>
        <ScaleExplain tonic={q.tonic} type={q.type} />
        <p class="tip">{stepsTip(q.type)}</p>
      </Feedback>
    </div>
  );
}

function stepsTip(type: ScaleType): string {
  const steps = SCALES[type].steps.map((s) => (s === 1 ? 'S' : s === 2 ? 'T' : 'T+S')).join(' – ');
  return `Schema di toni (T) e semitoni (S): ${steps}.`;
}
