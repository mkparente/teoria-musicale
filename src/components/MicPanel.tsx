import { startMic, stopMic, useHeardFrame, useMicState } from '../audio/mic';
import { type PitchClass, commonSpellings, mod, noteName, pitchClass } from '../theory/notes';
import { useSettings } from '../store';
import { Icon } from './Icon';

/**
 * La nota scritta corrispondente a un suono. Il microfono sente l'altezza, non la grafia:
 * se il suono coincide con la nota attesa (anche enarmonica) la si scrive come quella.
 */
export function heardToPc(midi: number, expected?: PitchClass): PitchClass {
  const semi = mod(midi, 12);
  if (expected && pitchClass(expected) === semi) return expected;
  return commonSpellings(semi)[0];
}

interface Props {
  /** Cosa fare con la chitarra, detto in breve: "suona le note una alla volta". */
  hint: string;
  /** Grafie da preferire per mostrare la nota sentita (quelle della domanda). */
  prefer?: PitchClass[];
}

/** Pulsante per rispondere suonando, e cosa sta sentendo il microfono. */
export function MicPanel({ hint, prefer = [] }: Props) {
  const state = useMicState();
  const [{ naming }] = useSettings();
  const heard = useHeardFrame(state === 'on');
  if (state === 'unsupported') return null;

  if (state === 'on') {
    const pc = heard ? (prefer.find((p) => pitchClass(p) === mod(heard.midi, 12)) ?? heardToPc(heard.midi)) : null;
    const level = heard ? Math.min(1, heard.rms * 8) : 0;
    return (
      <div class="mic on" role="status">
        <span class="mic-dot" aria-hidden="true" />
        <span class="mic-text">
          {pc ? (
            <>
              Sento <b>{noteName(pc, naming)}</b>
              {/* Molto fuori intonazione: forse la corda è scordata. */}
              {Math.abs(heard!.cents) >= 25 && <span class="muted"> ({heard!.cents > 0 ? 'crescente' : 'calante'})</span>}
            </>
          ) : (
            <>In ascolto: {hint}</>
          )}
        </span>
        <span class="mic-level" aria-hidden="true">
          <i style={{ transform: `scaleX(${level})` }} />
        </span>
        <button class="link-btn" onClick={stopMic}>
          Spegni
        </button>
      </div>
    );
  }

  return (
    <div class="mic">
      <button class="secondary mic-btn" onClick={() => void startMic()} disabled={state === 'starting'}>
        <Icon name="mic" size={20} />
        {state === 'starting' ? 'Accendo il microfono…' : 'Rispondi suonando'}
      </button>
      {state === 'denied' && (
        <p class="inline-bad small">Il microfono non è consentito: abilitalo nelle impostazioni del browser per questo sito.</p>
      )}
      {state === 'error' && <p class="inline-bad small">Non riesco ad accendere il microfono.</p>}
    </div>
  );
}
