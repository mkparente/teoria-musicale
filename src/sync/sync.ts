import { reloadDb } from '../srs/srs';
import { LOCAL_ONLY, exportAll, load, onDataChange, save, saveFromRemote, updatedTimes, useStored } from '../store';
import { SyncError, findOrCreateGist, readGist, writeGist } from './gist';
import { type Snapshot, mergeSnapshots, sameSnapshot, sameValue } from './merge';

// Sincronizzazione dei progressi con un Gist segreto: all'apertura, poco dopo ogni modifica
// e quando si torna all'app. Ogni volta: scarica, unisce, salva qui e ricarica online.

export interface SyncState {
  /** Token GitHub con il solo permesso "gist". Resta su questo dispositivo. */
  token?: string;
  gistId?: string;
  lastSync?: number;
  error?: string;
  /** Vero quando l'errore richiede di cambiare il token: si smette di riprovare da soli. */
  blocked?: boolean;
}

const KEY = 'sync';
const DEBOUNCE = 15_000;

export const useSync = () => useStored<SyncState>(KEY, {});
const state = () => load<SyncState>(KEY, {});
const update = (patch: Partial<SyncState>) => save(KEY, { ...state(), ...patch });

function localSnapshot(): Snapshot {
  const data = exportAll();
  const all = updatedTimes();
  const updated = Object.fromEntries(Object.keys(data).map((k) => [k, all[k] ?? 0]));
  return { version: 1, updated, data };
}

let running: Promise<void> | null = null;
let again = false;

/** Sincronizza adesso. Se è già in corso, ne fa un'altra subito dopo. */
export function syncNow(): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = run().finally(() => {
    running = null;
    if (again) {
      again = false;
      void syncNow();
    }
  });
  return running;
}

async function run() {
  const { token, gistId } = state();
  if (!token) return;
  try {
    let id = gistId ?? (await findOrCreateGist(token));
    let remote: Snapshot;
    try {
      remote = await readGist(token, id);
    } catch (e) {
      // Il Gist è stato cancellato: se ne cerca o crea un altro.
      if (!(e instanceof SyncError && e.kind === 'missing')) throw e;
      id = await findOrCreateGist(token);
      remote = await readGist(token, id);
    }
    const local = localSnapshot();
    const merged = mergeSnapshots(local, remote);
    let srsChanged = false;
    for (const [key, value] of Object.entries(merged.data)) {
      if (LOCAL_ONLY.has(key) || sameValue(local.data[key], value)) continue;
      // Modificato qui mentre si scaricava (per esempio una risposta appena data): lo si unisce al giro dopo.
      if (!sameValue(load<unknown>(key, undefined), local.data[key])) {
        again = true;
        continue;
      }
      saveFromRemote(key, value, merged.updated[key]);
      if (key === 'srs') srsChanged = true;
    }
    if (srsChanged) reloadDb();
    if (!sameSnapshot(merged, remote)) await writeGist(token, id, merged);
    update({ gistId: id, lastSync: Date.now(), error: undefined, blocked: false });
  } catch (e) {
    const err = e instanceof SyncError ? e : new SyncError('Errore imprevisto nella sincronizzazione.', 'other');
    update({ error: err.message, blocked: err.kind === 'auth' });
  }
}

/** Collega questo dispositivo: salva il token e fa subito la prima sincronizzazione. */
export async function connect(token: string) {
  save(KEY, { token: token.trim() } satisfies SyncState);
  await syncNow();
}

/** Scollega questo dispositivo. I progressi restano qui e online. */
export function disconnect() {
  save(KEY, {} satisfies SyncState);
}

let timer: number | undefined;

/** Avvia la sincronizzazione automatica. Da chiamare una volta all'avvio dell'app. */
export function startAutoSync() {
  const canRun = () => !!state().token && !state().blocked;
  const soon = () => {
    if (!canRun()) return;
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      timer = undefined;
      void syncNow();
    }, DEBOUNCE);
  };
  onDataChange(soon);
  document.addEventListener('visibilitychange', () => {
    if (!canRun()) return;
    // Quando si torna all'app si prendono le novità; quando la si lascia si salva quello che manca.
    if (document.visibilityState === 'visible' || timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
      void syncNow();
    }
  });
  addEventListener('online', () => canRun() && void syncNow());
  if (canRun()) void syncNow();
}
