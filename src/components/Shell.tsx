import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import type { Outcome, Session } from '../exercises/useExercise';

interface Props {
  title: string;
  session: Session;
  settings?: ComponentChildren;
  children: ComponentChildren;
}

export function Shell({ title, session, settings, children }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div class="exercise">
      <header class="ex-head">
        <a href="#/" class="back" aria-label="Torna alla home">
          ‹
        </a>
        <h1>{title}</h1>
        {settings && (
          <button class={`icon-btn ${open ? 'active' : ''}`} onClick={() => setOpen(!open)} aria-label="Impostazioni">
            ⚙
          </button>
        )}
      </header>
      {open && settings && <div class="ex-settings">{settings}</div>}
      <div class="score">
        <span>
          Risposte: <b>{session.done}</b>
        </span>
        <span>
          Giuste: <b>{session.done ? Math.round((100 * session.correct) / session.done) : 0}%</b>
        </span>
        <span>
          Di fila: <b>{session.streak}</b>
        </span>
      </div>
      {children}
    </div>
  );
}

interface FeedbackProps {
  outcome: Outcome | null;
  onNext: () => void;
  children?: ComponentChildren;
}

/** Esito della risposta, spiegazione e pulsante per andare avanti. */
export function Feedback({ outcome, onNext, children }: FeedbackProps) {
  if (!outcome) return null;
  return (
    <div class={`feedback ${outcome.correct ? 'fb-good' : 'fb-wrong'}`}>
      <div class="fb-title">
        {outcome.correct ? '✓ Giusto' : '✗ Sbagliato'}
        <span class="fb-time">{(outcome.ms / 1000).toFixed(1).replace('.', ',')} s</span>
      </div>
      {children && <div class="fb-body">{children}</div>}
      <button class="primary" onClick={onNext} autofocus>
        Avanti
      </button>
    </div>
  );
}

/** Gruppo di opzioni a scelta multipla per il pannello delle impostazioni. */
export function Toggles<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T[];
  onChange: (v: T[]) => void;
}) {
  return (
    <fieldset class="toggles">
      <legend>{label}</legend>
      {options.map((o) => {
        const on = value.includes(o.value);
        return (
          <button
            key={o.value}
            class={`chip ${on ? 'on' : ''}`}
            onClick={() => {
              const nextValue = on ? value.filter((v) => v !== o.value) : [...value, o.value];
              if (nextValue.length) onChange(nextValue);
            }}
          >
            {o.label}
          </button>
        );
      })}
    </fieldset>
  );
}

/** Scelta singola per il pannello delle impostazioni. */
export function Radio<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <fieldset class="toggles">
      <legend>{label}</legend>
      {options.map((o) => (
        <button key={String(o.value)} class={`chip ${value === o.value ? 'on' : ''}`} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </fieldset>
  );
}
