import { useEffect, useRef, useState } from 'preact/hooks';
import { type Heard, NoteTracker, detectPitch, toHeard } from './pitch';

// Il microfono, uno solo per tutta l'app. Si accende con un tocco (i browser lo vogliono),
// resta acceso tra una domanda e l'altra e si spegne da solo quando nessuno lo ascolta più.

export type MicState = 'off' | 'starting' | 'on' | 'denied' | 'unsupported' | 'error';

interface Listener {
  onNote?: (midi: number) => void;
  onFrame?: (h: Heard | null) => void;
}

const FRAME_MS = 40;
/** Senza nessuno in ascolto (correzione da leggere, domanda senza microfono) resta acceso ancora un po'. */
const IDLE_STOP_MS = 45_000;

let state: MicState =
  typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function' ? 'off' : 'unsupported';
let ctx: AudioContext | null = null;
let stream: MediaStream | null = null;
let analyser: AnalyserNode | null = null;
let timer: number | undefined;
let idleTimer: number | undefined;
let tracker = new NoteTracker();
const listeners = new Set<Listener>();
const stateListeners = new Set<() => void>();

function setState(s: MicState) {
  state = s;
  stateListeners.forEach((fn) => fn());
}

export const micState = () => state;

/** Accende il microfono. Va chiamata da un tocco dell'utente. */
export async function startMic() {
  if (state === 'on' || state === 'starting' || state === 'unsupported') return;
  setState('starting');
  try {
    // Senza filtri: cancellazione dell'eco e riduzione del rumore rovinano le note tenute.
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    ctx = new AudioContext();
    if (ctx.state === 'suspended') await ctx.resume();
    analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    ctx.createMediaStreamSource(stream).connect(analyser);
    // Tornando all'app dopo averla lasciata, il browser può sospendere l'audio: serve un nuovo tocco.
    ctx.addEventListener('statechange', () => {
      if (ctx && ctx.state !== 'running' && state === 'on') stopMic();
    });
    tracker = new NoteTracker();
    const buf = new Float32Array(analyser.fftSize);
    timer = window.setInterval(() => {
      if (!analyser || !ctx) return;
      analyser.getFloatTimeDomainData(buf);
      const p = detectPitch(buf, ctx.sampleRate);
      const h = p ? toHeard(p) : null;
      const note = tracker.push(h);
      listeners.forEach((l) => {
        l.onFrame?.(h);
        if (note !== null) l.onNote?.(note);
      });
    }, FRAME_MS);
    setState('on');
    scheduleIdleStop();
  } catch (e) {
    stopMic();
    const name = (e as DOMException)?.name;
    setState(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'error');
  }
}

export function stopMic() {
  clearInterval(timer);
  clearTimeout(idleTimer);
  stream?.getTracks().forEach((t) => t.stop());
  void ctx?.close().catch(() => {});
  ctx = null;
  stream = null;
  analyser = null;
  if (state === 'on' || state === 'starting') setState('off');
}

// Lasciando l'app il microfono si spegne sempre.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') stopMic();
  });
}

function scheduleIdleStop() {
  clearTimeout(idleTimer);
  if (listeners.size === 0 && state === 'on') idleTimer = window.setTimeout(stopMic, IDLE_STOP_MS);
}

function subscribe(l: Listener): () => void {
  listeners.add(l);
  clearTimeout(idleTimer);
  return () => {
    listeners.delete(l);
    scheduleIdleStop();
  };
}

export function useMicState(): MicState {
  const [s, setS] = useState(state);
  useEffect(() => {
    const fn = () => setS(state);
    stateListeners.add(fn);
    fn();
    return () => {
      stateListeners.delete(fn);
    };
  }, []);
  return s;
}

/**
 * Riceve le note suonate (MIDI del suono reale) finché il componente è montato e `enabled` è vero.
 * Una nota che stava già suonando quando ci si mette in ascolto non conta: serve una nuova pennata.
 */
export function useHeardNotes(onNote: (midi: number) => void, enabled = true) {
  const ref = useRef(onNote);
  ref.current = onNote;
  useEffect(() => {
    if (!enabled) return;
    return subscribe({ onNote: (m) => ref.current(m) });
  }, [enabled]);
}

/** La misura corrente, per mostrare che cosa sente il microfono (aggiornata ~25 volte al secondo). */
export function useHeardFrame(enabled = true): Heard | null {
  const [h, setH] = useState<Heard | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let last = 0;
    const unsub = subscribe({
      onFrame: (x) => {
        // Si aggiorna lo schermo al massimo 8 volte al secondo: basta per leggere.
        const now = performance.now();
        if (now - last < 120) return;
        last = now;
        setH(x && x.clarity >= 0.85 ? x : null);
      },
    });
    return unsub;
  }, [enabled]);
  return h;
}
