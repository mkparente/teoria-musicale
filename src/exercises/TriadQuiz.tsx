import { useState } from 'preact/hooks';
import { Choices, NotePicker, type PickMark } from '../components/NotePicker';
import { Feedback, Radio, Shell, Toggles } from '../components/Shell';
import { Staff } from '../components/Staff';
import { useSettings, useStored } from '../store';
import { tiered } from '../srs/srs';
import {
  type Quality,
  INVERSIONS,
  QUALITIES,
  QUALITY_LIST,
  buildTriad,
  chordName,
  chordSymbol,
  diatonicTriads,
  invert,
  plainTriad,
  romanFor,
} from '../theory/chords';
import { type Naming, type PitchClass, noteName, parsePcKey, pcKey, samePitchClass, stackUp } from '../theory/notes';
import { type ScaleType, ROMAN, SCALES, keySignature, scaleName, tonicsFor } from '../theory/scales';
import { type Outcome, useExercise } from './useExercise';

type Kind = 'notes' | 'kind' | 'root' | 'dqual' | 'dfind';
type KeyType = 'major' | 'natural' | 'harmonic';

const KINDS: { value: Kind; label: string }[] = [
  { value: 'notes', label: 'Scrivi la triade' },
  { value: 'kind', label: 'Che triade è' },
  { value: 'root', label: 'Fondamentale nei rivolti' },
  { value: 'dqual', label: 'Triadi dei gradi' },
  { value: 'dfind', label: 'Su che grado' },
];

const KEY_TYPES: { value: KeyType; label: string }[] = [
  { value: 'major', label: 'Maggiori' },
  { value: 'natural', label: 'Minori naturali' },
  { value: 'harmonic', label: 'Minori armoniche' },
];

interface Config {
  kinds: Kind[];
  qualities: Quality[];
  keys: KeyType[];
  maxAcc: number;
}

const DEFAULT: Config = {
  kinds: ['notes', 'kind', 'root', 'dqual', 'dfind'],
  qualities: [...QUALITY_LIST],
  keys: ['major', 'natural', 'harmonic'],
  maxAcc: 4,
};

export const PREFIX = 'tr:';

const p = (letter: number, acc = 0) => ({ letter, acc }) as PitchClass;
const NATURAL_ROOTS = [0, 1, 2, 3, 4, 5, 6].map((l) => p(l));
const ALTERED_ROOTS = [p(6, -1), p(2, -1), p(5, -1), p(1, -1), p(4, -1), p(3, 1), p(0, 1), p(4, 1), p(1, 1), p(5, 1)];

export function buildPool(c: Config): string[] {
  const tiers: string[][] = Array.from({ length: 10 }, () => []);
  const has = (k: Kind) => c.kinds.includes(k);

  for (const q of c.qualities) {
    const hard = q === 'dim' || q === 'aug' ? 2 : 0;
    [NATURAL_ROOTS, ALTERED_ROOTS].forEach((roots, altered) => {
      for (const root of roots.filter((r) => plainTriad(r, q))) {
        const t = hard + altered * 3;
        const r = pcKey(root);
        if (has('notes')) tiers[t].push(`${PREFIX}notes:${q}:${r}`);
        if (has('kind')) tiers[t].push(`${PREFIX}kind:${q}:${r}`);
        if (has('root')) for (const inv of [1, 2]) tiers[t + 1].push(`${PREFIX}root:${q}:${r}:${inv}`);
      }
    });
  }

  for (const type of c.keys) {
    for (const tonic of tonicsFor(SCALES[type].mode)) {
      const sig = Math.abs(keySignature(tonic, SCALES[type].mode));
      if (sig > c.maxAcc) continue;
      const t = Math.min(9, 1 + Math.floor(sig / 2) * 2 + (type === 'harmonic' ? 1 : 0));
      for (let d = 0; d < 7; d++) {
        if (has('dqual')) tiers[t].push(`${PREFIX}dqual:${type}:${pcKey(tonic)}:${d}`);
        if (has('dfind')) tiers[t].push(`${PREFIX}dfind:${type}:${pcKey(tonic)}:${d}`);
      }
    }
  }
  return tiered(tiers);
}

type Q =
  | { kind: 'notes'; q: Quality; root: PitchClass }
  | { kind: 'kind'; q: Quality; root: PitchClass }
  | { kind: 'root'; q: Quality; root: PitchClass; inv: number }
  | { kind: 'dqual'; type: KeyType; tonic: PitchClass; d: number }
  | { kind: 'dfind'; type: KeyType; tonic: PitchClass; d: number };

function parse(id: string): Q {
  const [kind, a, b, c] = id.slice(PREFIX.length).split(':');
  if (kind === 'notes' || kind === 'kind') return { kind, q: a as Quality, root: parsePcKey(b) } as Q;
  if (kind === 'root') return { kind, q: a as Quality, root: parsePcKey(b), inv: Number(c) };
  return { kind, type: a as KeyType, tonic: parsePcKey(b), d: Number(c) } as Q;
}

export function describe(id: string, naming: Naming): string {
  const q = parse(id);
  switch (q.kind) {
    case 'notes':
      return `scrivere ${chordName(q.root, q.q, naming)}`;
    case 'kind':
      return `riconoscere ${chordName(q.root, q.q, naming)}`;
    case 'root':
      return `${chordName(q.root, q.q, naming)} in ${INVERSIONS[q.inv]}`;
    case 'dqual':
      return `triade sul ${ROMAN[q.d]} grado di ${scaleName(q.tonic, q.type, naming)}`;
    case 'dfind': {
      const t = diatonicTriads(q.tonic, q.type)[q.d];
      return `${chordName(t.root, t.quality, naming)} in ${scaleName(q.tonic, q.type, naming)}`;
    }
  }
}

const joinNames = (pcs: PitchClass[], naming: Naming) => pcs.map((x) => noteName(x, naming)).join(' – ');

/** Come è fatta una triade, a intervalli. */
export function triadRecipe(q: Quality): string {
  const recipes: Record<Quality, string> = {
    maj: 'terza maggiore (4 semitoni) e quinta giusta (7): una terza maggiore con sopra una terza minore',
    min: 'terza minore (3 semitoni) e quinta giusta (7): una terza minore con sopra una terza maggiore',
    dim: 'terza minore (3 semitoni) e quinta diminuita (6): due terze minori sovrapposte',
    aug: 'terza maggiore (4 semitoni) e quinta aumentata (8): due terze maggiori sovrapposte',
  };
  return recipes[q];
}

export function TriadQuiz() {
  const [config, setConfig] = useStored<Config>('cfg.triad', DEFAULT);
  const ex = useExercise(() => buildPool(config), parse, JSON.stringify(config));

  const settings = (
    <>
      <Toggles label="Domande" options={KINDS} value={config.kinds} onChange={(kinds) => setConfig({ ...config, kinds })} />
      <Toggles
        label="Triadi"
        options={QUALITY_LIST.map((q) => ({ value: q, label: QUALITIES[q].triad }))}
        value={config.qualities}
        onChange={(qualities) => setConfig({ ...config, qualities })}
      />
      <Toggles label="Tonalità (triadi dei gradi)" options={KEY_TYPES} value={config.keys} onChange={(keys) => setConfig({ ...config, keys })} />
      <Radio
        label="Alterazioni in chiave fino a"
        options={Array.from({ length: 8 }, (_, i) => ({ value: i, label: String(i) }))}
        value={config.maxAcc}
        onChange={(maxAcc) => setConfig({ ...config, maxAcc })}
      />
    </>
  );

  return (
    <Shell title="Triadi" session={ex.session} settings={settings}>
      {ex.error && <p class="empty">{ex.error}</p>}
      {ex.current && <QuestionView key={ex.current.n} q={ex.current.q} outcome={ex.outcome} finish={ex.finish} next={ex.next} />}
    </Shell>
  );
}

interface ViewProps {
  q: Q;
  outcome: Outcome | null;
  finish: (correct: boolean) => void;
  next: () => void;
}

function QuestionView(props: ViewProps) {
  const { q } = props;
  if (q.kind === 'notes') return <WriteTriad {...props} q={q} />;
  if (q.kind === 'kind' || q.kind === 'root') return <ReadTriad {...props} q={q} />;
  return <DiatonicQuestion {...props} q={q} />;
}

const qualityOptions = QUALITY_LIST.map((q) => ({ value: q, label: QUALITIES[q].triad }));

function ReadTriad({ q, outcome, finish, next }: ViewProps & { q: Extract<Q, { kind: 'kind' | 'root' }> }) {
  const [{ naming }] = useSettings();
  const [marks, setMarks] = useState<PickMark[]>([]);
  const [picked, setPicked] = useState<Quality | null>(null);
  const triad = buildTriad(q.root, q.q);
  const inv = q.kind === 'root' ? q.inv : 0;
  const shown = invert(triad, inv);

  return (
    <div class="question">
      <p class="prompt">
        {q.kind === 'kind' ? (
          <>
            Che triade è <b>{joinNames(shown, naming)}</b>?
          </>
        ) : (
          <>
            <b>{joinNames(shown, naming)}</b> è una triade in rivolto. Qual è la <b>fondamentale</b>?
          </>
        )}
      </p>
      <Staff notes={stackUp(shown).map((note) => ({ note }))} chord zoom={1.8} maxWidth={300} />
      {q.kind === 'kind' ? (
        <Choices
          options={qualityOptions}
          columns={2}
          disabled={!!outcome}
          marks={
            outcome ? [{ value: q.q, kind: 'ok' as const }, ...(picked && picked !== q.q ? [{ value: picked, kind: 'bad' as const }] : [])] : []
          }
          onPick={(v) => {
            setPicked(v);
            finish(v === q.q);
          }}
        />
      ) : (
        <NotePicker
          marks={marks}
          disabled={!!outcome}
          onPick={(pc) => {
            const ok = samePitchClass(pc, q.root);
            setMarks(ok ? [{ pc, kind: 'ok' }] : [{ pc, kind: 'bad' }, { pc: q.root, kind: 'ok' }]);
            finish(ok);
          }}
        />
      )}
      <Feedback outcome={outcome} onNext={next}>
        <p>
          È <b>{chordName(q.root, q.q, naming)}</b>
          {q.q !== 'maj' && ` (${chordSymbol(q.root, q.q, naming)})`}
          {inv > 0 && `, in ${INVERSIONS[inv]}: al basso c'è la ${inv === 1 ? 'terza' : 'quinta'} (${noteName(shown[0], naming)})`}.
        </p>
        {inv > 0 && (
          <p>
            Per trovare la fondamentale riordina le note per terze sovrapposte: {joinNames(triad, naming)}. La prima è la
            fondamentale.
          </p>
        )}
        <p class="tip">
          Triade {QUALITIES[q.q].triad}: {triadRecipe(q.q)}.
        </p>
      </Feedback>
    </div>
  );
}

function WriteTriad({ q, outcome, finish, next }: ViewProps & { q: Extract<Q, { kind: 'notes' }> }) {
  const [{ naming }] = useSettings();
  const triad = buildTriad(q.root, q.q);
  const [entered, setEntered] = useState<{ pc: PitchClass; ok: boolean }[]>([]);
  const [lastWrong, setLastWrong] = useState<PitchClass | null>(null);
  const role = ['terza', 'quinta'];

  const pick = (pc: PitchClass) => {
    const i = entered.length + 1;
    const ok = samePitchClass(pc, triad[i]);
    const nextEntered = [...entered, { pc: triad[i], ok }];
    setEntered(nextEntered);
    setLastWrong(ok ? null : pc);
    if (nextEntered.length === 2) finish(nextEntered.every((e) => e.ok));
  };

  const pcs = [q.root, ...entered.map((e) => e.pc)];
  const staffNotes = stackUp(pcs).map((note, i) => ({
    note,
    color: i === 0 ? undefined : entered[i - 1].ok ? 'var(--ok)' : 'var(--bad)',
  }));

  return (
    <div class="question">
      <p class="prompt">
        Scrivi la triade di <b>{chordName(q.root, q.q, naming)}</b>.
      </p>
      <Staff notes={staffNotes} chord zoom={1.8} maxWidth={300} />
      <p class={lastWrong && !outcome ? 'inline-bad' : 'hint'}>
        {lastWrong && !outcome
          ? `Non ${noteName(lastWrong, naming)}: la terza è ${noteName(entered[0].pc, naming)}.`
          : outcome
            ? joinNames(triad, naming)
            : `Fondamentale ${noteName(q.root, naming)}. Ora la ${role[entered.length]}.`}
      </p>
      <NotePicker onPick={pick} disabled={!!outcome} />
      <Feedback outcome={outcome} onNext={next}>
        <p>
          {chordName(q.root, q.q, naming)}: <b>{joinNames(triad, naming)}</b>.
        </p>
        <p class="tip">
          Triade {QUALITIES[q.q].triad}: {triadRecipe(q.q)}.
        </p>
      </Feedback>
    </div>
  );
}

function DiatonicQuestion({ q, outcome, finish, next }: ViewProps & { q: Extract<Q, { kind: 'dqual' | 'dfind' }> }) {
  const [{ naming }] = useSettings();
  const [picked, setPicked] = useState<number | Quality | null>(null);
  const triads = diatonicTriads(q.tonic, q.type);
  const t = triads[q.d];
  const key = scaleName(q.tonic, q.type, naming);

  return (
    <div class="question">
      {q.kind === 'dqual' ? (
        <p class="prompt">
          Nella tonalità di <b>{key}</b>, che triade si forma sul <b>{ROMAN[q.d]} grado</b> ({noteName(t.root, naming)})?
        </p>
      ) : (
        <p class="prompt">
          Nella tonalità di <b>{key}</b>, su che grado si forma l'accordo di <b>{chordName(t.root, t.quality, naming)}</b>?
        </p>
      )}
      {q.kind === 'dqual' ? (
        <Choices
          options={qualityOptions}
          columns={2}
          disabled={!!outcome}
          marks={outcome ? [{ value: t.quality, kind: 'ok' as const }, ...(picked !== null && picked !== t.quality ? [{ value: picked as Quality, kind: 'bad' as const }] : [])] : []}
          onPick={(v) => {
            setPicked(v);
            finish(v === t.quality);
          }}
        />
      ) : (
        <Choices
          options={ROMAN.map((r, i) => ({ value: i, label: r }))}
          columns={7}
          disabled={!!outcome}
          marks={outcome ? [{ value: q.d, kind: 'ok' as const }, ...(picked !== null && picked !== q.d ? [{ value: picked as number, kind: 'bad' as const }] : [])] : []}
          onPick={(v) => {
            setPicked(v);
            finish(v === q.d);
          }}
        />
      )}
      <Feedback outcome={outcome} onNext={next}>
        <p>
          Sul {ROMAN[q.d]} grado di {key} c'è <b>{chordName(t.root, t.quality, naming)}</b>: {joinNames(t.notes, naming)}.
        </p>
        <DiatonicTable tonic={q.tonic} type={q.type} highlight={q.d} />
      </Feedback>
    </div>
  );
}

/** Le sette triadi della tonalità, con il numero romano nella convenzione degli accordi. */
export function DiatonicTable({ tonic, type, highlight }: { tonic: PitchClass; type: ScaleType; highlight?: number }) {
  const [{ naming }] = useSettings();
  return (
    <table class="degrees">
      <tbody>
        {diatonicTriads(tonic, type).map((t) => (
          <tr key={t.degree} class={t.degree === highlight ? 'hl' : ''}>
            <td>{romanFor(t.degree, t.quality)}</td>
            <td>
              <b>{chordSymbol(t.root, t.quality, naming)}</b>
            </td>
            <td>{joinNames(t.notes, naming)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
