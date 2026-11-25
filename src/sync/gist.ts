import { type Snapshot, emptySnapshot } from './merge';

// I progressi stanno in un Gist segreto dell'utente, un file JSON solo. Il token serve
// soltanto per i Gist (permesso "gist"): non dà accesso ai repository.

const API = 'https://api.github.com';
export const GIST_FILE = 'teoria-musicale-progressi.json';
const NO_SCOPE = 'Il token non ha il permesso per i Gist (serve "gist").';
const DESCRIPTION = 'Teoria musicale: progressi (sincronizzazione)';

export class SyncError extends Error {
  constructor(
    message: string,
    readonly kind: 'auth' | 'network' | 'missing' | 'other',
  ) {
    super(message);
  }
}

type Fetch = typeof fetch;

async function call(f: Fetch, token: string, path: string, init: RequestInit = {}): Promise<unknown> {
  let res: Response;
  try {
    res = await f(`${API}${path}`, {
      ...init,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
  } catch {
    throw new SyncError('Nessuna connessione: riprovo più tardi.', 'network');
  }
  if (res.status === 401) throw new SyncError('Il token non è valido o è scaduto.', 'auth');
  // Troppe richieste: GitHub risponde 403 (o 429) ma il token va bene, si riprova più tardi.
  if (res.status === 429 || (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0')) {
    throw new SyncError('Troppe richieste a GitHub: riprovo più tardi.', 'network');
  }
  if (res.status === 403) throw new SyncError(NO_SCOPE, 'auth');
  if (res.status === 404) throw new SyncError('Il Gist dei progressi non esiste più.', 'missing');
  if (!res.ok) throw new SyncError(`GitHub ha risposto con l'errore ${res.status}.`, 'other');
  return res.json();
}

interface GistFile {
  content?: string;
  truncated?: boolean;
  raw_url?: string;
}

interface Gist {
  id: string;
  files: Record<string, GistFile>;
}

/** Il Gist dei progressi: quello già esistente sull'account, oppure uno nuovo. */
export async function findOrCreateGist(token: string, f: Fetch = fetch): Promise<string> {
  for (let page = 1; page <= 5; page++) {
    const list = (await call(f, token, `/gists?per_page=100&page=${page}`)) as Gist[];
    const found = list.find((g) => GIST_FILE in g.files);
    if (found) return found.id;
    if (list.length < 100) break;
  }
  try {
    const created = (await call(f, token, '/gists', {
      method: 'POST',
      body: JSON.stringify({ description: DESCRIPTION, public: false, files: { [GIST_FILE]: { content: serialize(emptySnapshot()) } } }),
    })) as Gist;
    return created.id;
  } catch (e) {
    // Senza il permesso "gist" GitHub risponde 404 alla creazione.
    if (e instanceof SyncError && e.kind === 'missing') throw new SyncError(NO_SCOPE, 'auth');
    throw e;
  }
}

export async function readGist(token: string, id: string, f: Fetch = fetch): Promise<Snapshot> {
  const gist = (await call(f, token, `/gists/${id}`)) as Gist;
  const file = gist.files[GIST_FILE];
  if (!file) return emptySnapshot();
  let text = file.content ?? '';
  // Oltre 1 MB l'API tronca il contenuto: il file intero si scarica dal suo indirizzo.
  if (file.truncated && file.raw_url) {
    let res: Response;
    try {
      res = await f(file.raw_url);
    } catch {
      throw new SyncError('Nessuna connessione: riprovo più tardi.', 'network');
    }
    if (!res.ok) throw new SyncError(`GitHub ha risposto con l'errore ${res.status}.`, 'other');
    text = await res.text();
  }
  return parse(text);
}

export async function writeGist(token: string, id: string, snapshot: Snapshot, f: Fetch = fetch): Promise<void> {
  await call(f, token, `/gists/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ files: { [GIST_FILE]: { content: serialize(snapshot) } } }),
  });
}

const serialize = (s: Snapshot) => JSON.stringify(s);

/** Un file illeggibile non vale come "nessun progresso": sovrascriverlo cancellerebbe quelli dell'altro dispositivo. */
function parse(text: string): Snapshot {
  try {
    const v = JSON.parse(text);
    if (v && v.version === 1 && v.data && v.updated) return v as Snapshot;
  } catch {
    // sotto
  }
  throw new SyncError('Il file dei progressi online è illeggibile: non lo sovrascrivo. Salva un backup e scrivimi.', 'other');
}
