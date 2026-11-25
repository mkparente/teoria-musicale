// Riconoscimento dell'altezza di una nota singola (metodo di McLeod, "NSDF").
// Funziona su un blocco di campioni e non dipende dal browser: si prova con segnali sintetici.

/** Estensione della chitarra con un po' di margine: dal Mi basso (82 Hz) fin sopra il 17° tasto del cantino. */
export const MIN_FREQ = 70;
export const MAX_FREQ = 1500;
/** Sotto questo volume (RMS) è silenzio. */
export const SILENCE = 0.01;
/** Quanto deve essere "periodico" il suono per fidarsi della nota (0..1). */
export const MIN_CLARITY = 0.88;

export interface Pitch {
  freq: number;
  /** 0..1: quanto il segnale è regolare. Una nota pulita sta sopra 0,9. */
  clarity: number;
  rms: number;
}

export function rms(buf: Float32Array): number {
  let s = 0;
  for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
  return Math.sqrt(s / buf.length);
}

/** Frequenza fondamentale del blocco, oppure null se è silenzio o rumore. */
export function detectPitch(buf: Float32Array, sampleRate: number): Pitch | null {
  const level = rms(buf);
  if (level < SILENCE) return null;
  const n = buf.length;
  const minLag = Math.floor(sampleRate / MAX_FREQ);
  const maxLag = Math.min(Math.ceil(sampleRate / MIN_FREQ), Math.floor(n / 2));

  // Funzione di differenza normalizzata: 1 dove il segnale si ripete identico dopo "lag" campioni.
  const nsdf = new Float32Array(maxLag + 1);
  for (let lag = 0; lag <= maxLag; lag++) {
    let acf = 0;
    let m = 0;
    for (let i = 0; i < n - lag; i++) {
      acf += buf[i] * buf[i + lag];
      m += buf[i] * buf[i] + buf[i + lag] * buf[i + lag];
    }
    nsdf[lag] = m > 0 ? (2 * acf) / m : 0;
  }

  // Massimi tra un passaggio per lo zero in salita e il successivo in discesa.
  const peaks: number[] = [];
  let lag = 1;
  while (lag < maxLag && nsdf[lag] > 0) lag++; // salta il primo lobo, attorno a lag 0
  while (lag < maxLag) {
    while (lag < maxLag && nsdf[lag] <= 0) lag++;
    let best = -1;
    while (lag < maxLag && nsdf[lag] > 0) {
      if (lag >= minLag && (best < 0 || nsdf[lag] > nsdf[best])) best = lag;
      lag++;
    }
    if (best > 0) peaks.push(best);
  }
  if (!peaks.length) return null;

  // Il primo massimo vicino al più alto: evita di scambiare la nota con la sua ottava sotto.
  const highest = Math.max(...peaks.map((p) => nsdf[p]));
  const tau = peaks.find((p) => nsdf[p] >= 0.9 * highest)!;

  // Interpolazione parabolica per avere la frazione di campione.
  const a = nsdf[tau - 1], b = nsdf[tau], c = nsdf[tau + 1] ?? b;
  const den = a - 2 * b + c;
  const shift = den !== 0 ? (0.5 * (a - c)) / den : 0;
  const clarity = Math.min(1, b - 0.25 * (a - c) * shift);
  const freq = sampleRate / (tau + shift);
  if (freq < MIN_FREQ || freq > MAX_FREQ) return null;
  return { freq, clarity, rms: level };
}

/** Numero MIDI con frazione (La4 = 69). */
export const freqToMidi = (freq: number) => 69 + 12 * Math.log2(freq / 440);
export const midiToFreq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

export interface Heard {
  /** Nota MIDI più vicina, nel suono reale (la chitarra si scrive un'ottava sopra). */
  midi: number;
  /** Scarto dall'intonazione esatta, in centesimi di semitono (-50..50). */
  cents: number;
  clarity: number;
  rms: number;
}

export function toHeard(p: Pitch): Heard {
  const m = freqToMidi(p.freq);
  const midi = Math.round(m);
  return { midi, cents: Math.round((m - midi) * 100), clarity: p.clarity, rms: p.rms };
}

/**
 * Trasforma la sequenza di misure in note suonate: una nota conta quando resta stabile per
 * qualche misura, e la stessa nota conta di nuovo solo dopo una pausa o una nuova pennata.
 */
export class NoteTracker {
  private candidate: number | null = null;
  private count = 0;
  private current: number | null = null;
  private levels: number[] = [];

  constructor(
    /** Misure di fila con la stessa nota per accettarla (a ~25 misure al secondo, 3 = 120 ms). */
    private readonly stable = 3,
  ) {}

  /** Una misura. Restituisce la nota se in questo momento ne inizia una. */
  push(h: Heard | null): number | null {
    const level = h?.rms ?? 0;
    const prevMin = this.levels.length ? Math.min(...this.levels) : 0;
    this.levels = [...this.levels.slice(-3), level];
    if (!h || h.clarity < MIN_CLARITY) {
      if (!h) this.current = null; // silenzio: la prossima nota è nuova
      this.candidate = null;
      this.count = 0;
      return null;
    }
    // Una nuova pennata sulla stessa nota: il volume risale di colpo.
    const reattack = this.current === h.midi && prevMin > 0 && level > 1.6 * prevMin;
    if (reattack) this.current = null;
    if (h.midi === this.current) return null;
    if (h.midi === this.candidate) this.count++;
    else {
      this.candidate = h.midi;
      this.count = 1;
    }
    if (this.count >= this.stable) {
      this.current = h.midi;
      // Il volume si confronta solo con quello da qui in poi: l'attacco appena finito non è una nuova pennata.
      this.levels = [level];
      this.candidate = null;
      this.count = 0;
      return h.midi;
    }
    return null;
  }

  /** La nota che sta suonando adesso (già riconosciuta), se c'è. */
  get sounding(): number | null {
    return this.current;
  }
}
