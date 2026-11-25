// Fusione dei progressi di due dispositivi. Non dipende né dal browser né dalla rete.

export interface Snapshot {
  version: 1;
  /** Quando è stata modificata l'ultima volta ogni chiave (ms). */
  updated: Record<string, number>;
  data: Record<string, unknown>;
}

export const emptySnapshot = (): Snapshot => ({ version: 1, updated: {}, data: {} });

interface ItemLike {
  last?: number;
  seen?: number;
}

interface DayLike {
  minutes?: number;
  completed?: boolean;
}

/** Ripasso: per ogni elemento vince la versione risposta più di recente. */
function mergeSrs(a: Record<string, ItemLike>, b: Record<string, ItemLike>): Record<string, ItemLike> {
  const out: Record<string, ItemLike> = { ...a };
  for (const [id, item] of Object.entries(b)) {
    const mine = out[id];
    if (!mine || (item.last ?? 0) > (mine.last ?? 0) || ((item.last ?? 0) === (mine.last ?? 0) && (item.seen ?? 0) > (mine.seen ?? 0))) {
      out[id] = item;
    }
  }
  return out;
}

/** Registro delle sessioni: per ogni giorno il tempo più lungo, e completata se lo è da una parte. */
function mergeLog(a: Record<string, DayLike>, b: Record<string, DayLike>): Record<string, DayLike> {
  const out: Record<string, DayLike> = { ...a };
  for (const [day, entry] of Object.entries(b)) {
    const mine = out[day];
    out[day] = mine
      ? { minutes: Math.max(mine.minutes ?? 0, entry.minutes ?? 0), completed: !!(mine.completed || entry.completed) }
      : entry;
  }
  return out;
}

const isRecord = (v: unknown): v is Record<string, never> => !!v && typeof v === 'object' && !Array.isArray(v);

/**
 * Unisce i dati locali con quelli online. Ripasso e registro si fondono elemento per elemento;
 * le altre chiavi (programma, impostazioni, opzioni) tengono la versione modificata più di recente.
 * A parità di data vince la copia online: il primo dispositivo collegato fa da riferimento.
 */
export function mergeSnapshots(local: Snapshot, remote: Snapshot): Snapshot {
  const out = emptySnapshot();
  const keys = new Set([...Object.keys(local.data), ...Object.keys(remote.data)]);
  for (const key of keys) {
    const inLocal = key in local.data;
    const inRemote = key in remote.data;
    const tl = local.updated[key] ?? 0;
    const tr = remote.updated[key] ?? 0;
    out.updated[key] = Math.max(tl, tr);
    if (!inRemote) out.data[key] = local.data[key];
    else if (!inLocal) out.data[key] = remote.data[key];
    else if (key === 'srs' && isRecord(local.data[key]) && isRecord(remote.data[key])) out.data[key] = mergeSrs(local.data[key], remote.data[key]);
    else if (key === 'log' && isRecord(local.data[key]) && isRecord(remote.data[key])) out.data[key] = mergeLog(local.data[key], remote.data[key]);
    else out.data[key] = tl > tr ? local.data[key] : remote.data[key];
  }
  return out;
}

/** Vero se due valori sono uguali una volta salvati (l'ordine delle chiavi non conta). */
export function sameValue(a: unknown, b: unknown): boolean {
  return stable(a) === stable(b);
}

function stable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
  if (isRecord(v)) {
    return `{${Object.keys(v)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stable(v[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(v) ?? 'null';
}

export function sameSnapshot(a: Snapshot, b: Snapshot): boolean {
  return sameValue(a.data, b.data);
}
