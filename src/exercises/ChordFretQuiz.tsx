import { useState } from 'preact/hooks';
import { type FretMark, Fretboard, chordToneKind } from '../components/Fretboard';
import { Choices } from '../components/NotePicker';
import { Feedback, Shell, Toggles } from '../components/Shell';
import { useSettings } from '../store';
import { tiered } from '../srs/srs';
import { INVERSIONS, QUALITIES, buildTriad, chordName, chordRoot } from '../theory/chords';
import { type FretPos, type GuitarString, STRING_NAMES, samePos, soundingMidi } from '../theory/guitar';
import { type Naming, noteName, pitchClass } from '../theory/notes';
import {
  type CagedForm,
  CAGED_FORMS,
  FORM_NAMES,
  STRING_SETS,
  cagedVoicing,
  formContaining,
  lowestFret,
  setLabel,
  triadVoicing,
} from '../theory/positions';
import { type ExerciseProps, type Outcome, useExercise, useExerciseConfig } from './useExercise';

type Kind = 'shape' | 'build' | 'deg' | 'tri' | 'inv';
type Q2 = 'maj' | 'min';

const KINDS: { value: Kind; label: string }[] = [
  { value: 'shape', label: 'Che forma è' },
  { value: 'build', label: 'Suona la forma' },
  { value: 'deg', label: 'Dov\'è la terza' },
  { value: 'tri', label: 'Triadi su 3 corde' },
  { value: 'inv', label: 'Che rivolto è' },
];

interface Config {
  kinds: Kind[];
  qualities: Q2[];
  forms: CagedForm[];
  sets: string[];
}

export const DEFAULT: Config = { kinds: ['shape', 'build', 'deg', 'tri', 'inv'], qualities: ['maj', 'min'], forms: [...CAGED_FORMS], sets: ['0', '1', '2', '3'] };

export const PREFIX = 'ch:';
const MAX_FRET = 15;
const NATURAL_SEMIS = [0, 2, 4, 5, 7, 9, 11];
/** Prima le forme di Mi e di La (i barrè più usati), poi Re, poi Do e Sol. */
const FORM_RANK: Record<CagedForm, number> = { E: 0, A: 0, D: 1, C: 2, G: 2 };
const SET_RANK = [0, 1, 2, 2];

export function buildPool(c: Config): string[] {
  const tiers: string[][] = Array.from({ length: 8 }, () => []);
  const has = (k: Kind) => c.kinds.includes(k);
  for (const q of c.qualities) {
    for (let semi = 0; semi < 12; semi++) {
      const base = (NATURAL_SEMIS.includes(semi) ? 0 : 3) + (q === 'min' ? 1 : 0);
      for (const f of c.forms) {
        const t = Math.min(7, base + FORM_RANK[f]);
        for (const k of ['shape', 'build', 'deg'] as Kind[]) if (has(k)) tiers[t].push(`${PREFIX}${k}:${q}:${f}:${semi}`);
      }
      for (const s of c.sets.map(Number)) {
        const t = Math.min(7, base + SET_RANK[s]);
        for (let inv = 0; inv < 3; inv++) {
          for (const k of ['tri', 'inv'] as Kind[]) if (has(k)) tiers[t].push(`${PREFIX}${k}:${q}:${s}:${inv}:${semi}`);
        }
      }
    }
  }
  return tiered(tiers);
}

type FormQ = { q: Q2; form: CagedForm; semi: number };
type SetQ = { q: Q2; set: number; inv: number; semi: number };
type Q =
  | (FormQ & { kind: 'shape' })
  | (FormQ & { kind: 'build' })
  | (FormQ & { kind: 'deg'; pick: number })
  | (SetQ & { kind: 'tri' })
  | (SetQ & { kind: 'inv' });

function parse(id: string): Q {
  const [kind, q, a, b, c] = id.slice(PREFIX.length).split(':');
  if (kind === 'tri' || kind === 'inv') return { kind, q: q as Q2, set: Number(a), inv: Number(b), semi: Number(c) } as Q;
  const form = a as CagedForm;
  const semi = Number(b);
  if (kind === 'deg') {
    // Una nota a caso della forma, ma non sempre la fondamentale.
    const v = cagedVoicing(semi, q as Q2, form);
    const nonRoot = v.map((_, i) => i).filter((i) => soundingMidi(v[i]) % 12 !== semi);
    const pool = Math.random() < 0.75 ? nonRoot : v.map((_, i) => i);
    return { kind, q: q as Q2, form, semi, pick: pool[Math.floor(Math.random() * pool.length)] };
  }
  return { kind, q: q as Q2, form, semi } as Q;
}

const formName = (f: CagedForm) => `forma di ${FORM_NAMES[f]} (${f})`;

export function describe(id: string, naming: Naming): string {
  const q = parse(id);
  const name = chordName(chordRoot(q.semi, q.q), q.q, naming);
  if (q.kind === 'tri' || q.kind === 'inv') return `${name}, ${INVERSIONS[q.inv]}, ${setLabel(STRING_SETS[q.set])}`;
  const what = { shape: 'riconoscere', build: 'suonare', deg: 'gradi di' }[q.kind];
  return `${what} ${name} nella ${formName(q.form)}`;
}

/** La diteggiatura e le sue copie un'ottava sopra o sotto che stanno sul manico. */
const alternatives = (v: FretPos[]) =>
  [0, 12, -12]
    .map((s) => v.map((p) => ({ ...p, fret: p.fret + s })))
    .filter((c) => c.every((p) => p.fret >= 0 && p.fret <= MAX_FRET));

export function ChordFretQuiz(props: ExerciseProps<Config>) {
  const [config, setConfig] = useExerciseConfig('cfg.chords', DEFAULT, props.config);
  const ex = useExercise(() => buildPool(config), parse, JSON.stringify(config), props);

  const settings = setConfig && (
    <>
      <Toggles label="Domande" options={KINDS} value={config.kinds} onChange={(kinds) => setConfig({ ...config, kinds })} />
      <Toggles
        label="Accordi"
        options={[
          { value: 'maj' as Q2, label: 'maggiori' },
          { value: 'min' as Q2, label: 'minori' },
        ]}
        value={config.qualities}
        onChange={(qualities) => setConfig({ ...config, qualities })}
      />
      <Toggles
        label="Forme CAGED"
        options={CAGED_FORMS.map((f) => ({ value: f, label: `${f} (${FORM_NAMES[f]})` }))}
        value={config.forms}
        onChange={(forms) => setConfig({ ...config, forms })}
      />
      <Toggles
        label="Corde delle triadi"
        options={STRING_SETS.map((s, i) => ({ value: String(i), label: setLabel(s).replace('corde ', '') }))}
        value={config.sets}
        onChange={(sets) => setConfig({ ...config, sets })}
      />
    </>
  );

  return (
    <Shell title={props.title ?? 'Accordi sul manico'} back={props.back} session={ex.session} settings={settings} embedded={ex.embedded}>
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

function QuestionView({ q, outcome, finish, next }: ViewProps) {
  const [{ naming }] = useSettings();
  const [picked, setPicked] = useState<string | number | null>(null);
  const root = chordRoot(q.semi, q.q);
  const triad = buildTriad(root, q.q);
  const tones = triad.map(pitchClass);
  const name = chordName(root, q.q, naming);
  const degreeOf = (pos: FretPos) => tones.indexOf(soundingMidi(pos) % 12);
  const reveal = (positions: FretPos[]): FretMark[] =>
    positions.map((pos) => ({
      pos,
      kind: chordToneKind(degreeOf(pos)),
      label: QUALITIES[q.q].labels[degreeOf(pos)],
    }));
  const marksFor = (right: string | number) => [
    { value: right, kind: 'ok' as const },
    ...(picked !== null && picked !== right ? [{ value: picked, kind: 'bad' as const }] : []),
  ];

  if (q.kind === 'shape' || q.kind === 'deg') {
    const v = cagedVoicing(q.semi, q.q, q.form);
    if (q.kind === 'shape') {
      return (
        <div class="question">
          <p class="prompt">
            Questo è un accordo di <b>{name}</b>. In che <b>forma CAGED</b> è suonato?
          </p>
          <Fretboard maxFret={MAX_FRET} marks={outcome ? reveal(v) : v.map((pos) => ({ pos, kind: 'note' }))} />
          <Choices
            options={CAGED_FORMS.map((f) => ({ value: f, label: `${f} (${FORM_NAMES[f]})` }))}
            columns={5}
            disabled={!!outcome}
            marks={outcome ? marksFor(q.form) : []}
            onPick={(f) => {
              setPicked(f);
              finish(f === q.form);
            }}
          />
          <Feedback outcome={outcome} onNext={next}>
            <FormExplain form={q.form} q={q.q} name={name} v={v} />
          </Feedback>
        </div>
      );
    }
    const target = v[q.pick];
    const d = degreeOf(target);
    const labels = QUALITIES[q.q].labels;
    const roles = ['la fondamentale', q.q === 'maj' ? 'la terza maggiore' : 'la terza minore', 'la quinta'];
    return (
      <div class="question">
        <p class="prompt">
          <b>{name}</b> nella {formName(q.form)}: che nota dell'accordo è quella segnata?
        </p>
        <Fretboard
          maxFret={MAX_FRET}
          marks={
            outcome
              ? reveal(v)
              : v.map((pos, i) => (i === q.pick ? { pos, kind: 'target', label: '?' } : { pos, kind: 'note' }))
          }
        />
        <Choices
          options={labels.map((l, i) => ({ value: i, label: l }))}
          columns={3}
          disabled={!!outcome}
          marks={outcome ? marksFor(d) : []}
          onPick={(i) => {
            setPicked(i);
            finish(i === d);
          }}
        />
        <Feedback outcome={outcome} onNext={next}>
          <p>
            È {roles[d]} ({noteName(triad[d], naming)}) sulla {STRING_NAMES[target.string]}.
          </p>
          <p class="tip">Impara a vedere le terze dentro le forme: sono le note che decidono se l'accordo è maggiore o minore.</p>
        </Feedback>
      </div>
    );
  }

  if (q.kind === 'inv') {
    const strings = STRING_SETS[q.set];
    const v = triadVoicing(tones as [number, number, number], strings, q.inv);
    return (
      <div class="question">
        <p class="prompt">
          Questo è <b>{name}</b> sulle {setLabel(strings)}. In che <b>rivolto</b> è?
        </p>
        <Fretboard maxFret={MAX_FRET} activeStrings={strings} marks={outcome ? reveal(v) : v.map((pos) => ({ pos, kind: 'note' }))} />
        <Choices
          options={INVERSIONS.map((n, i) => ({ value: i, label: n.replace('stato ', '') }))}
          columns={3}
          disabled={!!outcome}
          marks={outcome ? marksFor(q.inv) : []}
          onPick={(i) => {
            setPicked(i);
            finish(i === q.inv);
          }}
        />
        <Feedback outcome={outcome} onNext={next}>
          <TriadExplain v={v} inv={q.inv} q={q.q} semi={q.semi} naming={naming} />
        </Feedback>
      </div>
    );
  }

  // Da suonare: forma CAGED o triade su tre corde
  const strings = q.kind === 'tri' ? STRING_SETS[q.set] : undefined;
  const v =
    q.kind === 'tri'
      ? triadVoicing(tones as [number, number, number], STRING_SETS[q.set], q.inv)
      : cagedVoicing(q.semi, q.q, q.form);
  return (
    <div class="question">
      <p class="prompt">
        {q.kind === 'tri' ? (
          <>
            Tocca <b>{name}</b> in <b>{INVERSIONS[q.inv]}</b> sulle <b>{setLabel(STRING_SETS[q.set])}</b>.
          </>
        ) : (
          <>
            Tocca le note di <b>{name}</b> nella <b>{formName(q.form)}</b>.
          </>
        )}
      </p>
      <TapChord
        key={`${q.kind}${q.semi}`}
        candidates={alternatives(v)}
        activeStrings={strings}
        reveal={reveal}
        outcome={outcome}
        finish={finish}
      />
      <Feedback outcome={outcome} onNext={next}>
        {q.kind === 'tri' ? (
          <TriadExplain v={v} inv={q.inv} q={q.q} semi={q.semi} naming={naming} />
        ) : (
          <FormExplain form={q.form} q={q.q} name={name} v={v} />
        )}
      </Feedback>
    </div>
  );
}

/** Tocchi sul manico finché non hai trovato tutte le note di una delle diteggiature valide. */
function TapChord({
  candidates,
  activeStrings,
  reveal,
  outcome,
  finish,
}: {
  candidates: FretPos[][];
  activeStrings?: GuitarString[];
  reveal: (ps: FretPos[]) => FretMark[];
  outcome: Outcome | null;
  finish: (ok: boolean) => void;
}) {
  const [taps, setTaps] = useState<{ pos: FretPos; ok: boolean }[]>([]);
  const [missing, setMissing] = useState<FretPos[]>([]);
  const covered = (c: FretPos[], ts: typeof taps) => c.filter((p) => ts.some((t) => t.ok && samePos(t.pos, p))).length;
  const errors = taps.filter((t) => !t.ok).length;

  const done = (ts: typeof taps) => {
    const best = [...candidates].sort((a, b) => covered(b, ts) - covered(a, ts))[0];
    const miss = best.filter((p) => !ts.some((t) => samePos(t.pos, p)));
    setMissing(miss);
    finish(miss.length === 0 && ts.every((t) => t.ok));
  };

  const tap = (pos: FretPos) => {
    if (outcome || taps.some((t) => samePos(t.pos, pos))) return;
    const ok = candidates.some((c) => c.some((p) => samePos(p, pos)));
    const next = [...taps, { pos, ok }];
    setTaps(next);
    if (candidates.some((c) => covered(c, next) === c.length)) done(next);
  };

  const marks: FretMark[] = [
    ...taps.map((t) => (t.ok ? reveal([t.pos])[0] : { pos: t.pos, kind: 'bad' as const })),
    ...missing.map((pos) => ({ ...reveal([pos])[0], kind: 'hint' as const })),
  ];
  const target = candidates[0].length;
  const found = Math.max(...candidates.map((c) => covered(c, taps)));

  return (
    <>
      <p class="hint">
        Trovate {found} di {target}
        {errors > 0 && ` · errori ${errors}`}
      </p>
      <Fretboard maxFret={MAX_FRET} marks={marks} onTap={tap} activeStrings={activeStrings} />
      {!outcome && (
        <button class="secondary" onClick={() => done(taps)}>
          Ho finito
        </button>
      )}
    </>
  );
}

function FormExplain({ form, q, name, v }: { form: CagedForm; q: Q2; name: string; v: FretPos[] }) {
  const rootString = { C: 5, A: 5, G: 6, E: 6, D: 4 }[form] as GuitarString;
  const rootFret = v.find((p) => p.string === rootString)?.fret;
  return (
    <>
      <p>
        {name} nella <b>{formName(form)}</b>: è l'accordo aperto di {FORM_NAMES[form]} {q === 'maj' ? 'maggiore' : 'minore'} spostato
        lungo il manico, con la fondamentale sulla {STRING_NAMES[rootString]} al tasto {rootFret}.
      </p>
      <p class="tip">Ordine delle forme salendo lungo il manico: C → A → G → E → D, poi si ricomincia.</p>
    </>
  );
}

function TriadExplain({ v, inv, q, semi, naming }: { v: FretPos[]; inv: number; q: Q2; semi: number; naming: Naming }) {
  const root = chordRoot(semi, q);
  const triad = buildTriad(root, q);
  const form = formContaining(v, semi, q);
  return (
    <>
      <p>
        {chordName(root, q, naming)} in <b>{INVERSIONS[inv]}</b>: al basso c'è {['la fondamentale', 'la terza', 'la quinta'][inv]} (
        {noteName(triad[inv], naming)}), tasti {v.map((p) => p.fret).join(', ')} dalla {v[0].string}ª alla {v[2].string}ª corda
        {lowestFret(v) > 0 ? '' : ' (con corde a vuoto)'}.
      </p>
      {form && <p class="tip">Questa triade sta dentro la {formName(form)}.</p>}
    </>
  );
}
