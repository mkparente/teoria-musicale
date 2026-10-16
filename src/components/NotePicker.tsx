import { useState } from 'preact/hooks';
import { type Accidental, type PitchClass, LETTERS, noteName, samePitchClass } from '../theory/notes';
import { useSettings } from '../store';

export interface PickMark {
  pc: PitchClass;
  kind: 'ok' | 'bad';
}

interface Props {
  onPick: (pc: PitchClass) => void;
  /** Se falso mostra solo le sette note naturali. */
  accidentals?: boolean;
  marks?: PickMark[];
  disabled?: boolean;
}

/** Tastiera di risposta: sette colonne (Do..Si) e una riga per alterazione. */
export function NotePicker({ onPick, accidentals = true, marks = [], disabled }: Props) {
  const [{ naming }] = useSettings();
  const [double, setDouble] = useState(false);
  const rows: Accidental[] = !accidentals ? [0] : double ? [2, 0, -2] : [1, 0, -1];

  return (
    <div class="picker">
      {rows.map((acc) => (
        <div class="picker-row" key={acc}>
          {LETTERS.map((letter) => {
            const pc = { letter, acc };
            const mark = marks.find((m) => samePitchClass(m.pc, pc));
            return (
              <button
                key={letter}
                class={`pick ${mark ? `pick-${mark.kind}` : ''} ${acc === 0 ? 'pick-nat' : ''}`}
                disabled={disabled}
                onClick={() => onPick(pc)}
              >
                {noteName(pc, naming)}
              </button>
            );
          })}
        </div>
      ))}
      {accidentals && (
        <button class="link-btn" onClick={() => setDouble(!double)} disabled={disabled}>
          {double ? 'Torna a ♯ e ♭' : 'Doppie alterazioni (♯♯ ♭♭)'}
        </button>
      )}
    </div>
  );
}

interface ChoicesProps<T> {
  options: { value: T; label: string }[];
  onPick: (v: T) => void;
  marks?: { value: T; kind: 'ok' | 'bad' }[];
  disabled?: boolean;
  columns?: number;
}

export function Choices<T>({ options, onPick, marks = [], disabled, columns = 4 }: ChoicesProps<T>) {
  return (
    <div class="choices" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {options.map((o) => {
        const mark = marks.find((m) => m.value === o.value);
        return (
          <button
            key={o.label}
            class={`pick ${mark ? `pick-${mark.kind}` : ''}`}
            disabled={disabled}
            onClick={() => onPick(o.value)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
