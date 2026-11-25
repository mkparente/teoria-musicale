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
  /** Minuti per dispositivo: due dispositivi nello stesso giorno si sommano. */
  parts?: Record<string, number>;
}

interface PlanLike {
  date?: string;
  results?: unknown[];
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

/** Le parti per dispositivo di un giorno; i giorni registrati prima ne hanno una sola. */
const partsOf = (d: DayLike): Record<string, number> => d.parts ?? (d.minutes ? { prima: d.minutes } : {});

/**
 * Registro delle sessioni: per ogni giorno i minuti di ogni dispositivo (il valore più alto, se
 * lo stesso dispositivo compare da tutte e due le parti) sommati; completata se lo è da una parte.
 */
function mergeLog(a: Record<string, DayLike>, b: Record<string, DayLike>): Record<string, DayLike> {
  const out: Record<string, DayLike> = { ...a };
  for (const [day, entry] of Object.entries(b)) {
    const mine = out[day];
    if (!mine) {
      out[day] = entry;
      continue;
    }
    const parts = { ...partsOf(mine) };
    for (const [dev, m] of Object.entries(partsOf(entry))) parts[dev] = Math.max(parts[dev] ?? 0, m);
    const minutes = Object.values(parts).reduce((s, m) => s + m, 0);
    out[day] = { minutes, completed: !!(mine.completed || entry.completed), parts };
  }
  return out;
}

/**
 * Sessione di oggi: vince quella del giorno più recente e, nello stesso giorno, quella più avanti
 * (più blocchi fatti). Così un dispositivo che ricostruisce il piano all'apertura non cancella
 * i blocchi già fatti su un altro.
 */
function mergePlan(a: PlanLike | null, b: PlanLike | null, aNewer: boolean): PlanLike | null {
  if (!a || !b) return a ?? b;
  if ((a.date ?? '') !== (b.date ?? '')) return (a.date ?? '') > (b.date ?? '') ? a : b;
  const ra = a.results?.length ?? 0;
  const rb = b.results?.length ?? 0;
  if (ra !== rb) return ra > rb ? a : b;
  return aNewer ? a : b;
}

/** Azzeramenti fatti dalle statistiche: per gruppo (prefisso) la data dell'ultimo. */
function mergeResets(a: unknown, b: unknown): Record<string, number> {
  const out: Record<string, number> = { ...(isRecord(a) ? (a as Record<string, number>) : {}) };
  if (isRecord(b)) for (const [p, t] of Object.entries(b as Record<string, number>)) out[p] = Math.max(out[p] ?? 0, t);
  return out;
}

/** Toglie dal ripasso gli elementi azzerati dopo l'ultima risposta. */
function applyResets(srs: Record<string, ItemLike>, resets: Record<string, number>): Record<string, ItemLike> {
  const entries = Object.entries(resets);
  if (!entries.length) return srs;
  return Object.fromEntries(
    Object.entries(srs).filter(([id, item]) => !entries.some(([p, t]) => id.startsWith(p) && (item.last ?? 0) <= t)),
  );
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
    else if (key === 'srsResets') out.data[key] = mergeResets(local.data[key], remote.data[key]);
    else if (key === 'plan') out.data[key] = mergePlan(local.data[key] as PlanLike | null, remote.data[key] as PlanLike | null, tl > tr);
    else out.data[key] = tl > tr ? local.data[key] : remote.data[key];
  }
  // Un gruppo azzerato su un dispositivo non deve tornare dalla copia dell'altro.
  if (isRecord(out.data.srs) && isRecord(out.data.srsResets)) {
    out.data.srs = applyResets(out.data.srs, out.data.srsResets as Record<string, number>);
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
