import { useEffect, useState } from 'preact/hooks';
import { GuitarActivityView } from '../components/GuitarActivityView';
import { Icon } from '../components/Icon';
import { EXERCISES } from '../exercises/registry';
import { logSession } from '../program/progress';
import { type BlockResult, ROLE_LABELS } from '../program/session';
import { blockTitle, usePlan } from './Today';

const mmss = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** Esegue la sessione di oggi, un blocco dopo l'altro. Si può interrompere e riprendere. */
export function SessionRunner() {
  const [plan, setPlan] = usePlan();
  const [startedAt, setStartedAt] = useState(Date.now());
  const [between, setBetween] = useState<BlockResult | null>(null);
  const [guitarDone, setGuitarDone] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!plan) {
    location.hash = '#/';
    return null;
  }

  const index = plan.results.length;
  const block = plan.blocks[index];
  const finished = index >= plan.blocks.length;

  const finishBlock = (r: BlockResult) => {
    const results = [...plan.results, r];
    const done = results.length >= plan.blocks.length;
    setPlan({ ...plan, results });
    if (done) logSession(plan.minutes, true);
    setBetween(r);
  };

  const nextBlock = () => {
    setBetween(null);
    setGuitarDone(false);
    setStartedAt(Date.now());
  };

  const header = (
    <header class="run-head">
      <a href="#/" class="icon-btn ghost" aria-label="Interrompi la sessione" title="Interrompi (riprendi quando vuoi)">
        <Icon name="close" />
      </a>
      <div class="run-progress" aria-label={`Blocco ${Math.min(index + 1, plan.blocks.length)} di ${plan.blocks.length}`}>
        {plan.blocks.map((b, i) => (
          <span key={i} class={`${i < index ? 'done' : i === index && !between ? 'now' : ''} role-${b.role}`} />
        ))}
      </div>
      {block && !between && block.type === 'quiz' && (
        <span class={`run-timer ${startedAt + block.minutes * 60000 - now <= 0 ? 'over' : ''}`}>
          {mmss(startedAt + block.minutes * 60000 - now)}
        </span>
      )}
    </header>
  );

  if (finished && !between) {
    const answered = plan.results.reduce((s, r) => s + r.answered, 0);
    const correct = plan.results.reduce((s, r) => s + r.correct, 0);
    return (
      <div class="page run">
        {header}
        <Summary answered={answered} correct={correct} />
      </div>
    );
  }

  if (between) {
    const last = plan.results.length >= plan.blocks.length;
    const upcoming = plan.blocks[plan.results.length];
    return (
      <div class="page run">
        {header}
        <section class="panel between">
          <h2>{between.answered > 0 ? 'Blocco finito' : 'Fatto'}</h2>
          {between.answered > 0 && (
            <p>
              {between.answered} {between.answered === 1 ? 'risposta' : 'risposte'},{' '}
              {Math.round((100 * between.correct) / between.answered)}% giuste.
            </p>
          )}
          {last ? (
            <button class="primary big" onClick={() => setBetween(null)}>
              Vedi il riepilogo
            </button>
          ) : (
            <>
              <p class="muted">
                Prossimo: <b>{ROLE_LABELS[upcoming.role]}</b> · {blockTitle(upcoming)} · {upcoming.minutes} min
              </p>
              <button class="primary big" onClick={nextBlock} autofocus>
                Avanti
              </button>
            </>
          )}
        </section>
      </div>
    );
  }

  return (
    <div class="page run">
      {header}
      <div class="run-title">
        <span class={`role-chip role-${block.role}`}>{ROLE_LABELS[block.role]}</span>
        <h1>{blockTitle(block)}</h1>
      </div>
      {block.type === 'quiz' ? (
        (() => {
          const Comp = EXERCISES[block.exercise].Component;
          return (
            <Comp
              key={index}
              config={block.config ?? EXERCISES[block.exercise].reviewConfig ?? {}}
              pool={block.pool}
              endsAt={startedAt + block.minutes * 60000}
              maxQuestions={block.maxQuestions}
              onEnd={(s) => finishBlock({ answered: s.done, correct: s.correct })}
            />
          );
        })()
      ) : (
        <>
          <GuitarActivityView
            key={index}
            activity={block.activity}
            minutes={block.minutes}
            showTitle={false}
            onDone={() => setGuitarDone(true)}
          />
          {guitarDone && (
            <button class="primary big" onClick={() => finishBlock({ answered: 0, correct: 0 })}>
              Avanti
            </button>
          )}
        </>
      )}
      <button class="link-btn" onClick={() => finishBlock({ answered: 0, correct: 0 })}>
        Salta questo blocco
      </button>
    </div>
  );
}

function Summary({ answered, correct }: { answered: number; correct: number }) {
  return (
    <section class="panel between">
      <h2>Sessione completata</h2>
      {answered > 0 && (
        <p>
          {answered} {answered === 1 ? 'risposta' : 'risposte'} in tutto, {Math.round((100 * correct) / answered)}% giuste.
        </p>
      )}
      <p class="muted">
        Quello che hai sbagliato tornerà nel ripasso dei prossimi giorni; quello che sai tornerà sempre più di rado.
      </p>
      <a class="primary big" href="#/">
        Torna a Oggi
      </a>
    </section>
  );
}
