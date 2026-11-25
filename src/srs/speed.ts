// Velocità delle risposte. Una risposta giusta ma lenta vuol dire che la regola la sai ma la
// stai ancora "contando": vale come giusta, ma non basta per consolidare l'elemento.

const S = 1000;

/** Da questa scatola in su, per salire serve rispondere giusto e in fretta. Prima conta solo indovinare. */
export const SPEED_FROM_BOX = 2;

/** Tempo in più quando si risponde suonando la chitarra. */
export const MIC_EXTRA_MS = 3 * S;

/** Note della scala da scrivere (la tonica è già data). */
const scaleNotes = (type: string) => (type.startsWith('pent') ? 4 : 6);

/**
 * Tempo entro cui una risposta giusta è "sicura", per tipo di domanda. Null per le attività
 * con la chitarra, che si valutano da sé. Soglie iniziali: si rivedono guardando i tempi in Progressi.
 */
export function targetMs(id: string): number | null {
  const [prefix, kind, a] = id.split(':');
  switch (prefix) {
    case 'gt':
      return null;
    case 'rd': // leggere una nota sul rigo
      return 6 * S;
    case 'fb':
      return kind === 'find' ? 25 * S : 6 * S;
    case 'sq':
      if (kind === 'write') return 5 * S + scaleNotes(a) * 3 * S;
      return 8 * S;
    case 'tr':
      if (kind === 'notes') return 12 * S; // terza e quinta da scrivere
      if (kind === 'dfind') return 10 * S;
      return 8 * S;
    case 'iv':
      return 8 * S;
    case 'ch':
      return kind === 'build' ? 20 * S : 10 * S;
    default:
      return 10 * S;
  }
}

/** Soglia effettiva, contando il tempo in più quando si risponde suonando. */
export const effectiveTarget = (id: string, withMic: boolean): number | null => {
  const t = targetMs(id);
  return t === null ? null : t + (withMic ? MIC_EXTRA_MS : 0);
};

/** Vero se una risposta è arrivata oltre la soglia. */
export function isSlow(id: string, ms: number, withMic = false): boolean {
  const t = effectiveTarget(id, withMic);
  return t !== null && ms > t;
}

/** "8 s", "12 s": per i messaggi. */
export const secondsWords = (ms: number) => `${Math.round(ms / 1000)} s`;
