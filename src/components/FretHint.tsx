import { useSettings } from '../store';
import { type FretMark, Fretboard } from './Fretboard';

interface Props {
  marks: FretMark[];
  from: number;
  to: number;
  /** Una riga sotto il manico, per esempio come si trova il disegno. */
  caption?: string;
}

/**
 * Il manico dentro una correzione: pochi tasti, una posizione, solo le note della domanda.
 * Si spegne dalle impostazioni ("Nelle correzioni").
 */
export function FretHint({ marks, from, to, caption }: Props) {
  const [{ fretHints }] = useSettings();
  if (!fretHints) return null;
  return (
    <div class="fret-hint">
      <p class="caption">Sul manico</p>
      <Fretboard maxFret={to} from={from} marks={marks} />
      {caption && <p class="hint small">{caption}</p>}
    </div>
  );
}
