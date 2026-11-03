import { useState } from 'preact/hooks';
import { type FretMark, Fretboard } from '../components/Fretboard';
import { Choices, NotePicker, type PickMark } from '../components/NotePicker';
import { Feedback, Radio, Shell, Toggles } from '../components/Shell';
import { Staff } from '../components/Staff';
import { useSettings } from '../store';
import { tiered } from '../srs/srs';
import { type FretPos, semitoneAt } from '../theory/guitar';
import {
  type IntervalKey,
  type ShapeKind,
  DEGREE_LABEL,
  INTERVAL_KEYS,
  SHAPE_KINDS,
  SHAPE_PAIRS,
  intervalBetween,
  intervalName,
  intervalShort,
  mainShape,
  noteAbove,
  plainAbove,
  semitoneWords,
  semitones,
  shapeOffset,
  shapeUsable,
  shapeWords,
} from '../theory/intervals';
import {
  type Naming,
  type PitchClass,
  commonSpellings,
  enharmonic,
  letterName,
  noteName,
  parsePcKey,
  pcKey,
  samePitchClass,
  stackUp,
} from '../theory/notes';
import { type ExerciseProps, type Outcome, useExercise, useExerciseConfig } from './useExercise';

type Kind = 'name' | 'build' | 'fret';
/** Intervalli selezionabili: il tritono è uno solo, sul rigo si scrive come 4ª aumentata o 5ª diminuita. */
type Choice = Exclude<IntervalKey, 'A4' | 'd5'> | 'TT';

const KINDS: { value: Kind; label: string }[] = [
  { value: 'name', label: 'Che intervallo è' },
  { value: 'build', label: 'Costruisci l’intervallo' },
  { value: 'fret', label: 'Sul manico' },
];

/** Ordine di studio pensato per il blues: prima gli intervalli degli accordi, poi quelli della pentatonica, poi gli altri. */
const GROUPS: Choice[][] = [
  ['M3', 'm3', 'P5', 'P8'],
  ['P4', 'm7'],
  ['m2', 'M2', 'm6', 'M6', 'M7', 'TT'],
];
const CHOICES: Choice[] = GROUPS.flat();
const groupOf = (c: Choice) => GROUPS.findIndex((g) => g.includes(c));

const choiceLabel = (c: Choice) => (c === 'TT' ? 'Tritono' : intervalShort(c));
const choiceName = (c: Choice) => (c === 'TT' ? 'tritono (4ª aumentata / 5ª diminuita)' : intervalName(c));
const choiceSemis = (c: Choice) => (c === 'TT' ? 6 : semitones(c));
const keysOf = (c: Choice): IntervalKey[] => (c === 'TT' ? ['A4', 'd5'] : [c]);

interface Config {
  kinds: Kind[];
  intervals: Choice[];
  /** Note di partenza anche con ♯ e ♭, oltre alle sette naturali. */
  altered: boolean;
}

export const DEFAULT: Config = { kinds: ['name', 'build', 'fret'], intervals: [...CHOICES], altered: false };

export const PREFIX = 'iv:';

const p = (letter: number, acc = 0) => ({ letter, acc }) as PitchClass;
const NATURAL_ROOTS = [0, 1, 2, 3, 4, 5, 6].map((l) => p(l));
const ALTERED_ROOTS = [p(6, -1), p(2, -1), p(5, -1), p(1, -1), p(3, 1), p(0, 1)];

const SHAPE_LATE: ShapeKind[] = ['nextB', 'skipB'];

export function buildPool(c: Config): string[] {
  const tiers: string[][] = Array.from({ length: 9 }, () => []);
  for (const choice of CHOICES.filter((x) => c.intervals.includes(x))) {
    const g = groupOf(choice);
    for (const key of keysOf(choice)) {
      [NATURAL_ROOTS, ALTERED_ROOTS].forEach((roots, altered) => {
        if (altered && !c.altered) return;
        for (const root of roots.filter((r) => plainAbove(r, key))) {
          const t = g + altered * 6;
          if (c.kinds.includes('name')) tiers[t].push(`${PREFIX}name:${key}:${pcKey(root)}`);
          if (c.kinds.includes('build')) tiers[t].push(`${PREFIX}build:${key}:${pcKey(root)}`);
        }
      });
    }
    if (c.kinds.includes('fret')) {
      for (const shape of SHAPE_KINDS.filter((s) => shapeUsable(choiceSemis(choice), s))) {
        tiers[g + (SHAPE_LATE.includes(shape) ? 3 : 0)].push(`${PREFIX}fret:${choice}:${shape}`);
      }
    }
  }
  return tiered(tiers);
}

type Q =
  | { kind: 'name'; iv: IntervalKey; root: PitchClass }
  | { kind: 'build'; iv: IntervalKey; root: PitchClass }
  | { kind: 'fret'; choice: Choice; shape: ShapeKind; lower: FretPos; upper: FretPos };

/** Tasti mostrati nelle domande sul manico. */
const FRETS = 9;
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

function parse(id: string): Q {
  const [kind, a, b] = id.slice(PREFIX.length).split(':');
  if (kind === 'name' || kind === 'build') return { kind, iv: a as IntervalKey, root: parsePcKey(b) };
  const choice = a as Choice;
  const shape = b as ShapeKind;
  const [ls, us] = pick(SHAPE_PAIRS[shape]);
  const offset = ls === us ? choiceSemis(choice) : shapeOffset(choiceSemis(choice), shape);
  // Nota grave dal 1° tasto in su, nota acuta dentro i tasti mostrati.
  const frets = Array.from({ length: FRETS }, (_, i) => i + 1).filter((f) => f + offset >= 0 && f + offset <= FRETS);
  const f = pick(frets);
  return { kind: 'fret', choice, shape, lower: { string: ls, fret: f }, upper: { string: us, fret: f + offset } };
}

const SHAPE_WORDS: Record<ShapeKind, string> = {
  same: 'sulla stessa corda',
  next: 'su corde vicine',
  nextB: 'sulle corde Sol e Si',
  skip: 'saltando una corda',
  skipB: 'saltando una corda, attraverso la corda Si',
};

export function describe(id: string, naming: Naming): string {
  const [kind, a, b] = id.slice(PREFIX.length).split(':');
  if (kind === 'fret') return `${choiceName(a as Choice)} sul manico, ${SHAPE_WORDS[b as ShapeKind]}`;
  const key = a as IntervalKey;
  const root = parsePcKey(b);
  if (kind === 'name') return `riconoscere ${noteName(root, naming)} – ${noteName(noteAbove(root, key), naming)}`;
  return `${intervalName(key)} sopra ${noteName(root, naming)}`;
}

/** Il legame di ogni intervallo con il blues, quando c'è. */
const BLUES: Partial<Record<IntervalKey, string>> = {
  M3: 'È la terza degli accordi maggiori (La, La7).',
  m3: 'È la ♭3 della pentatonica minore e la terza degli accordi minori.',
  P5: 'Fondamentale e quinta: il power chord.',
  P8: 'La stessa nota, un’ottava sopra.',
  P4: 'È la 4 della pentatonica minore.',
  m7: 'È la settima degli accordi di dominante (La7) e la ♭7 della pentatonica minore.',
  A4: 'Il tritono: la ♭5, la blue note della scala blues.',
  d5: 'Il tritono: la ♭5, la blue note della scala blues.',
  M6: 'È la 6 del riff boogie (2-2-4-4).',
  M7: 'Un semitono sotto l’ottava.',
  m2: 'Il semitono: un tasto.',
  M2: 'Un tono: due tasti.',
};

/** Correzione breve: semitoni, disegno sul manico, legame con il blues. */
function tipFor(key: IntervalKey, title = intervalName(key)) {
  const s = semitones(key);
  return `${title} = ${semitoneWords(s)}; sulla chitarra, ${shapeWords(s, ...mainShape(s))}. ${BLUES[key] ?? ''}`;
}

/** Le lettere che l'intervallo attraversa: Do-Re-Mi = 3ª. */
function letterSpan(root: PitchClass, n: number, naming: Naming) {
  return Array.from({ length: n }, (_, i) => letterName(((root.letter + i) % 7) as PitchClass['letter'], naming)).join('-');
}

export function IntervalQuiz(props: ExerciseProps<Config>) {
  const [config, setConfig] = useExerciseConfig('cfg.interval', DEFAULT, props.config);
  const ex = useExercise(() => buildPool(config), parse, JSON.stringify(config), props);

  const settings = setConfig && (
    <>
      <Toggles label="Domande" options={KINDS} value={config.kinds} onChange={(kinds) => setConfig({ ...config, kinds })} />
      <Toggles
        label="Intervalli"
        options={CHOICES.map((c) => ({ value: c, label: choiceLabel(c) }))}
        value={config.intervals}
        onChange={(intervals) => setConfig({ ...config, intervals })}
      />
      <Radio
        label="Note di partenza"
        options={[
          { value: 'nat', label: 'Solo naturali' },
          { value: 'all', label: 'Anche ♯ e ♭' },
        ]}
        value={config.altered ? 'all' : 'nat'}
        onChange={(v) => setConfig({ ...config, altered: v === 'all' })}
      />
    </>
  );

  return (
    <Shell title={props.title ?? 'Intervalli'} back={props.back} session={ex.session} settings={settings} embedded={ex.embedded}>
      {ex.error && <p class="empty">{ex.error}</p>}
      {ex.current && (
        <QuestionView key={ex.current.n} q={ex.current.q} config={config} outcome={ex.outcome} finish={ex.finish} next={ex.next} />
      )}
    </Shell>
  );
}

interface ViewProps {
  q: Q;
  config: Config;
  outcome: Outcome | null;
  finish: (correct: boolean) => void;
  next: () => void;
}

function QuestionView(props: ViewProps) {
  const { q } = props;
  if (q.kind === 'name') return <NameView {...props} q={q} />;
  if (q.kind === 'build') return <BuildView {...props} q={q} />;
  return <FretView {...props} q={q} />;
}

/** Le risposte possibili: gli intervalli scelti nelle opzioni, più quello chiesto (nel ripasso può venire da altrove). */
function staffOptions(config: Config, asked: IntervalKey) {
  const keys = new Set([...config.intervals.flatMap(keysOf), asked]);
  return INTERVAL_KEYS.filter((k) => keys.has(k)).map((k) => ({ value: k, label: intervalShort(k) }));
}

function NameView({ q, config, outcome, finish, next }: ViewProps & { q: Extract<Q, { kind: 'name' }> }) {
  const [{ naming }] = useSettings();
  const [picked, setPicked] = useState<IntervalKey | null>(null);
  const above = noteAbove(q.root, q.iv);
  const [lo, hi] = stackUp([q.root, above]);
  const n = Number(q.iv.slice(1));

  return (
    <div class="question">
      <p class="prompt">
        Che intervallo c'è da <b>{noteName(q.root, naming)}</b> a <b>{noteName(above, naming)}</b>?
      </p>
      <Staff notes={[lo, hi].map((note) => ({ note, label: noteName(note, naming) }))} zoom={1.8} maxWidth={300} />
      <Choices
        options={staffOptions(config, q.iv)}
        columns={3}
        disabled={!!outcome}
        marks={outcome ? [{ value: q.iv, kind: 'ok' as const }, ...(picked && picked !== q.iv ? [{ value: picked, kind: 'bad' as const }] : [])] : []}
        onPick={(v) => {
          setPicked(v);
          finish(v === q.iv);
        }}
      />
      <Feedback outcome={outcome} onNext={next}>
        <p>
          {noteName(q.root, naming)} → {noteName(above, naming)}: <b>{intervalName(q.iv)}</b>. Lettere {letterSpan(q.root, n, naming)} ={' '}
          {n}ª; {semitoneWords(semitones(q.iv))} = {intervalName(q.iv).split(' ')[1]}.
        </p>
        {picked && picked !== q.iv && semitones(picked) === semitones(q.iv) && (
          <p>4ª aumentata e 5ª diminuita suonano uguali (il tritono): decide la lettera della nota acuta.</p>
        )}
        <p class="tip">{tipFor(q.iv)}</p>
      </Feedback>
    </div>
  );
}

function BuildView({ q, outcome, finish, next }: ViewProps & { q: Extract<Q, { kind: 'build' }> }) {
  const [{ naming }] = useSettings();
  const [picked, setPicked] = useState<PitchClass | null>(null);
  const answer = noteAbove(q.root, q.iv);
  const n = Number(q.iv.slice(1));

  const marks: PickMark[] = picked
    ? samePitchClass(picked, answer)
      ? [{ pc: answer, kind: 'ok' }]
      : [{ pc: picked, kind: 'bad' }, { pc: answer, kind: 'ok' }]
    : [];
  const staffNotes = stackUp(picked ? [q.root, answer] : [q.root]).map((note, i) => ({
    note,
    label: noteName(note, naming),
    color: i === 0 ? undefined : picked && samePitchClass(picked, answer) ? 'var(--ok)' : 'var(--bad)',
  }));
  const wrongIv = picked && !samePitchClass(picked, answer) ? intervalBetween(q.root, picked) : null;

  return (
    <div class="question">
      <p class="prompt">
        Scrivi la <b>{intervalName(q.iv)}</b> sopra <b>{noteName(q.root, naming)}</b>.
      </p>
      <Staff notes={staffNotes} zoom={1.8} maxWidth={300} />
      <NotePicker
        marks={marks}
        disabled={!!outcome}
        onPick={(pc) => {
          setPicked(pc);
          finish(samePitchClass(pc, answer));
        }}
      />
      <Feedback outcome={outcome} onNext={next}>
        <p>
          {intervalName(q.iv)} sopra {noteName(q.root, naming)}: <b>{noteName(answer, naming)}</b>. Lettere {letterSpan(q.root, n, naming)}, poi{' '}
          {semitoneWords(semitones(q.iv))}.
        </p>
        {picked && wrongIv && enharmonic(picked, answer) && (
          <p>
            {noteName(picked, naming)} suona uguale, ma {noteName(q.root, naming)} → {noteName(picked, naming)} è una {intervalName(wrongIv)}: conta le lettere.
          </p>
        )}
        {picked && wrongIv && !enharmonic(picked, answer) && (
          <p>
            {noteName(q.root, naming)} → {noteName(picked, naming)} è una {intervalName(wrongIv)}.
          </p>
        )}
        <p class="tip">{tipFor(q.iv)}</p>
      </Feedback>
    </div>
  );
}

const capitalize = (s: string) => s[0].toUpperCase() + s.slice(1);

/** Nomi di esempio per le due note sul manico (nel blues la ♭5 si scrive come quinta diminuita). */
function exampleNames(lower: FretPos, choice: Choice, naming: Naming): string | null {
  const key: IntervalKey = choice === 'TT' ? 'd5' : choice;
  for (const root of commonSpellings(semitoneAt(lower))) {
    if (plainAbove(root, key)) return `${noteName(root, naming)} → ${noteName(noteAbove(root, key), naming)}`;
  }
  return null;
}

function FretView({ q, config, outcome, finish, next }: ViewProps & { q: Extract<Q, { kind: 'fret' }> }) {
  const [{ naming }] = useSettings();
  const [picked, setPicked] = useState<Choice | null>(null);
  const semis = choiceSemis(q.choice);
  const options = CHOICES.filter((c) => config.intervals.includes(c) || c === q.choice)
    .sort((a, b) => choiceSemis(a) - choiceSemis(b))
    .map((c) => ({ value: c, label: choiceLabel(c) }));
  const upperLabel = q.choice === 'TT' ? '♭5' : DEGREE_LABEL[q.choice];
  const marks: FretMark[] = [
    { pos: q.lower, kind: 'root', label: '1' },
    { pos: q.upper, kind: outcome ? (outcome.correct ? 'ok' : 'bad') : 'note', label: outcome ? upperLabel : '?' },
  ];
  const example = exampleNames(q.lower, q.choice, naming);
  const tipKey: IntervalKey = q.choice === 'TT' ? 'd5' : q.choice;

  return (
    <div class="question">
      <p class="prompt">
        Che intervallo c'è dalla nota <b>1</b> alla nota <b>?</b>
      </p>
      <p class="hint">Conta il suono reale: la nota 1 è la più grave.</p>
      <Fretboard maxFret={FRETS} marks={marks} />
      <Choices
        options={options}
        columns={3}
        disabled={!!outcome}
        marks={outcome ? [{ value: q.choice, kind: 'ok' as const }, ...(picked && picked !== q.choice ? [{ value: picked, kind: 'bad' as const }] : [])] : []}
        onPick={(v) => {
          setPicked(v);
          finish(v === q.choice);
        }}
      />
      <Feedback outcome={outcome} onNext={next}>
        <p>
          È una <b>{choiceName(q.choice)}</b> ({semitoneWords(semis)}){example && `, per esempio ${example}`}. {capitalize(shapeWords(semis, q.lower.string, q.upper.string))}.
        </p>
        {(q.shape === 'nextB' || q.shape === 'skipB') && (
          <p>Tra la corda Sol e la corda Si ci sono 4 semitoni invece di 5: attraversandole il disegno si sposta di un tasto in avanti.</p>
        )}
        <p class="tip">{tipFor(tipKey, q.choice === 'TT' ? 'Tritono' : undefined)}</p>
      </Feedback>
    </div>
  );
}
