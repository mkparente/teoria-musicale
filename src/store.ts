import { useEffect, useState } from 'preact/hooks';

// Piccolo archivio su localStorage con notifica ai componenti che lo usano.

const PREFIX = 'tm.';
const listeners = new Map<string, Set<() => void>>();

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw == null) return fallback;
    const value = JSON.parse(raw);
    // Le impostazioni salvate prima che esistesse un campo nuovo prendono il valore predefinito.
    if (value && typeof value === 'object' && !Array.isArray(value) && fallback && typeof fallback === 'object') {
      return { ...fallback, ...value };
    }
    return value as T;
  } catch {
    return fallback;
  }
}

export function save<T>(key: string, value: T) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Spazio pieno o archiviazione bloccata: l'app continua a funzionare senza salvare.
  }
  listeners.get(key)?.forEach((fn) => fn());
}

export function useStored<T>(key: string, fallback: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => load(key, fallback));
  useEffect(() => {
    const fn = () => setValue(load(key, fallback));
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key)!.add(fn);
    return () => listeners.get(key)!.delete(fn);
  }, [key]);
  return [value, (v: T) => save(key, v)];
}

export interface Settings {
  naming: 'it' | 'en';
  autoAdvance: boolean;
  /** Durata abituale della sessione di oggi, in minuti. */
  sessionMinutes: number;
  /** Falso quando sei in viaggio senza strumento: la sessione salta le attività con la chitarra. */
  withGuitar: boolean;
}

export const DEFAULT_SETTINGS: Settings = { naming: 'it', autoAdvance: true, sessionMinutes: 20, withGuitar: true };

export const useSettings = () => useStored<Settings>('settings', DEFAULT_SETTINGS);

/** Chiede al browser di non cancellare i dati dell'app quando serve spazio. */
export function requestPersistence() {
  navigator.storage?.persist?.().catch(() => {});
}

/** Tutti i dati dell'app, per il backup. */
export function exportAll(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)!;
    if (k.startsWith(PREFIX)) out[k.slice(PREFIX.length)] = JSON.parse(localStorage.getItem(k)!);
  }
  return out;
}

export function importAll(data: Record<string, unknown>) {
  for (const [k, v] of Object.entries(data)) save(k, v);
}
