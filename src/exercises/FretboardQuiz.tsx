import { useState } from 'preact/hooks';
import { type FretMark, Fretboard } from '../components/Fretboard';
import { NotePicker, type PickMark } from '../components/NotePicker';
import { Feedback, Radio, Shell, Toggles } from '../components/Shell';
import { useSettings } from '../store';
import { tiered } from '../srs/srs';
import { type FretPos, type GuitarString, STRINGS, STRING_NAMES, positionsOf, samePos, semitoneAt } from '../theory/guitar';
import { type Naming, type PitchClass, commonSpellings, noteName, pitchClass } from '../theory/notes';
import { type ExerciseProps, type Outcome, useExercise, useExerciseConfig } from './useExercise';

type Kind = 'find' | 'str' | 'name';

interface Config {
  kind: Kind;
  maxFret: number;
  strings: GuitarString[];
  accidentals: boolean;
}

export const DEFAULT: Config = { kind: 'str', maxFret: 12, strings: [...STRINGS], accidentals: false };
const NATURALS = [0, 2, 4, 5, 7, 9, 11];
const SHARPS = [1, 3, 6, 8, 10];

export const PREFIX = 'fb:';

/** Ordine di studio delle corde: prima i bassi (dove si trovano le toniche), poi le altre. */
const STRING_ORDER: GuitarString[] = [6, 5, 4, 1, 3, 2];

export function buildPool(c: Config): string[] {
  const semis = c.accidentals ? [NATURALS, SHARPS] : [NATURALS];
  const strings = STRING_ORDER.filter((s) => c.strings.includes(s));
  switch (c.kind) {
    case 'find':
      return tiered(semis.map((group) => group.map((s) => `${PREFIX}find:${s}`)));
    case 'str':
      return tiered(semis.flatMap((group) => strings.map((st) => group.map((s) => `${PREFIX}str:${st}:${s}`))));
    case 'name': {
      // Prima i tasti bassi, poi le zone più alte del manico.
      const bands = [[0, 5], [6, 9], [10, 12], [13, 15]].filter(([lo]) => lo <= c.maxFret);
      return tiered(
        bands.map(([lo, hi]) =>
          strings.flatMap((st) =>
            Array.from({ length: Math.min(hi, c.maxFret) - lo + 1 }, (_, i) => lo + i)
              .filter((f) => c.accidentals || NATURALS.includes(semitoneAt({ string: st, fret: f })))
              .map((f) => `${PREFIX}name:${st}:${f}`),
          ),
        ),
      );
    }
  }
}

type Q =
  | { kind: 'find'; semitone: number; spelling: PitchClass }
  | { kind: 'str'; string: GuitarString; semitone: number; spelling: PitchClass }
  | { kind: 'name'; pos: FretPos };

const randomSpelling = (semi: number) => {
  const opts = commonSpellings(semi);
  return opts[Math.floor(Math.random() * opts.length)];
};

function parse(id: string): Q {
  const [kind, a, b] = id.slice(PREFIX.length).split(':');
  if (kind === 'find') return { kind, semitone: Number(a), spelling: randomSpelling(Number(a)) };
  if (kind === 'str') return { kind, string: Number(a) as GuitarString, semitone: Number(b), spelling: randomSpelling(Number(b)) };
  return { kind: 'name', pos: { string: Number(a) as GuitarString, fret: Number(b) } };
}

const semiName = (semi: number, naming: Naming) => commonSpellings(semi).map((p) => noteName(p, naming)).join(' / ');

export function describe(id: string, naming: Naming): string {
  const [kind, a, b] = id.slice(PREFIX.length).split(':');
  if (kind === 'find') return `tutti i ${semiName(Number(a), naming)} sul manico`;
  if (kind === 'str') return `${semiName(Number(b), naming)} sulla ${STRING_NAMES[Number(a) as GuitarString]}`;
  return `nota al tasto ${b} della ${STRING_NAMES[Number(a) as GuitarString]}`;
}

export function FretboardQuiz(props: ExerciseProps<Config>) {
  const [config, setConfig] = useExerciseConfig('cfg.fret', DEFAULT, props.config);
  const ex = useExercise(() => buildPool(config), parse, JSON.stringify(config), props);

  const settings = setConfig && (
    <>
      <Radio
        label="Esercizio"
        options={[
          { value: 'str' as Kind, label: 'Nota su una corda' },
          { value: 'name' as Kind, label: 'Che nota è' },
          { value: 'find' as Kind, label: 'Tutte le posizioni' },
        ]}
        value={config.kind}
        onChange={(kind) => setConfig({ ...config, kind })}
      />
      <Radio
        label="Tasti fino al"
        options={[5, 7, 9, 12, 15].map((v) => ({ value: v, label: String(v) }))}
        value={config.maxFret}
        onChange={(maxFret) => setConfig({ ...config, maxFret })}
      />
      <Toggles
        label="Corde"
        options={STRINGS.map((s) => ({ value: String(s), label: `${s}ª` }))}
        value={config.strings.map(String)}
        onChange={(v) => setConfig({ ...config, strings: v.map(Number) as GuitarString[] })}
      />
      <Radio
        label="Note"
        options={[
          { value: 'nat', label: 'Solo naturali' },
          { value: 'all', label: 'Anche ♯ e ♭' },
        ]}
        value={config.accidentals ? 'all' : 'nat'}
        onChange={(v) => setConfig({ ...config, accidentals: v === 'all' })}
      />
    </>
  );

  return (
    <Shell title={props.title ?? 'Note sul manico'} back={props.back} session={ex.session} settings={settings} embedded={ex.embedded}>
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

interface ViewProps {
  q: Q;
  config: Config;
  outcome: Outcome | null;
  finish: (correct: boolean) => void;
  next: () => void;
}

function QuestionView({ q, config, outcome, finish, next }: ViewProps) {
  const [{ naming }] = useSettings();
  const [marks, setMarks] = useState<FretMark[]>([]);
  const [pickMarks, setPickMarks] = useState<PickMark[]>([]);
  const label = (pos: FretPos) => semiName(semitoneAt(pos), naming).split(' / ')[0];

  if (q.kind === 'name') {
    const semi = semitoneAt(q.pos);
    const answer = (pc: PitchClass) => {
      const ok = pitchClass(pc) === semi;
      const right = commonSpellings(semi).map((p) => ({ pc: p, kind: 'ok' as const }));
      setPickMarks(ok ? right : [{ pc, kind: 'bad' }, ...right]);
      finish(ok);
    };
    return (
      <div class="question">
        <p class="prompt">
          Che nota c'è sulla <b>{STRING_NAMES[q.pos.string]}</b>, {q.pos.fret === 0 ? <b>a vuoto</b> : <>tasto <b>{q.pos.fret}</b></>}?
        </p>
        <Fretboard
          maxFret={config.maxFret}
          activeStrings={config.strings}
          marks={[{ pos: q.pos, kind: outcome ? (outcome.correct ? 'ok' : 'bad') : 'target', label: outcome ? label(q.pos) : '?' }]}
        />
        <NotePicker onPick={answer} accidentals={config.accidentals} marks={pickMarks} disabled={!!outcome} />
        <Feedback outcome={outcome} onNext={next}>
          <p>
            È {semiName(semi, naming)}. {anchorTip(q.pos, naming)}
          </p>
        </Feedback>
      </div>
    );
  }

  if (q.kind === 'str') {
    const targets = positionsOf(q.semitone, config.maxFret, [q.string]);
    const tap = (pos: FretPos) => {
      if (outcome) return;
      const ok = targets.some((t) => samePos(t, pos));
      setMarks([
        ...(ok ? [] : [{ pos, kind: 'bad' as const, label: label(pos) }]),
        ...targets.map((t) => ({ pos: t, kind: 'ok' as const, label: label(t) })),
      ]);
      finish(ok);
    };
    return (
      <div class="question">
        <p class="prompt">
          Dov'è <b>{noteName(q.spelling, naming)}</b> sulla <b>{STRING_NAMES[q.string]}</b>?
        </p>
        <Fretboard maxFret={config.maxFret} activeStrings={config.strings} focusString={q.string} marks={marks} onTap={tap} />
        <Feedback outcome={outcome} onNext={next}>
          <p>
            {noteName(q.spelling, naming)} sulla {STRING_NAMES[q.string]}:{' '}
            {targets.map((t) => (t.fret === 0 ? 'a vuoto' : `tasto ${t.fret}`)).join(' e ')}.
          </p>
        </Feedback>
      </div>
    );
  }

  // Tutte le posizioni
  const targets = positionsOf(q.semitone, config.maxFret, config.strings);
  const found = marks.filter((m) => m.kind === 'ok');
  const errors = marks.filter((m) => m.kind === 'bad').length;
  const done = (finalMarks: FretMark[]) => {
    const missing = targets.filter((t) => !finalMarks.some((m) => samePos(m.pos, t)));
    setMarks([...finalMarks, ...missing.map((t) => ({ pos: t, kind: 'hint' as const, label: label(t) }))]);
    finish(missing.length === 0 && finalMarks.every((m) => m.kind === 'ok'));
  };
  const tap = (pos: FretPos) => {
    if (outcome || marks.some((m) => samePos(m.pos, pos))) return;
    const ok = targets.some((t) => samePos(t, pos));
    const nextMarks = [...marks, { pos, kind: ok ? ('ok' as const) : ('bad' as const), label: label(pos) }];
    setMarks(nextMarks);
    if (nextMarks.filter((m) => m.kind === 'ok').length === targets.length) done(nextMarks);
  };
  return (
    <div class="question">
      <p class="prompt">
        Tocca tutti i <b>{noteName(q.spelling, naming)}</b> tra il tasto 0 e il {config.maxFret}.
      </p>
      <p class="hint">
        Trovati {found.length} di {targets.length}
        {errors > 0 && ` · errori ${errors}`}
      </p>
      <Fretboard maxFret={config.maxFret} activeStrings={config.strings} marks={marks} onTap={tap} />
      {!outcome && (
        <button class="secondary" onClick={() => done(marks)}>
          Ho finito
        </button>
      )}
      <Feedback outcome={outcome} onNext={next}>
        {!outcome?.correct && <p>Le posizioni tratteggiate sono quelle che mancavano.</p>}
        <p class="tip">
          Trucco: la stessa nota si ritrova due corde più su e due tasti più avanti (tre tasti se attraversi la corda Si).
        </p>
      </Feedback>
    </div>
  );
}

/** Un riferimento facile per ricordare la posizione. */
function anchorTip(pos: FretPos, naming: Naming): string {
  if (pos.fret === 0) return 'È la corda a vuoto.';
  if (pos.fret === 12) return 'Al 12° tasto ritrovi la corda a vuoto, un\'ottava sopra.';
  if (pos.fret === 5 && pos.string !== 3 && pos.string !== 1) return 'Al 5° tasto c\'è la stessa nota della corda a vuoto successiva (quella più acuta).';
  if (pos.fret === 4 && pos.string === 3) return 'Sulla corda Sol è il 4° tasto a dare la nota della corda Si a vuoto.';
  const open = semiName(semitoneAt({ string: pos.string, fret: 0 }), naming).split(' / ')[0];
  return `Conta dalla corda a vuoto (${open}): ${pos.fret} semitoni.`;
}
