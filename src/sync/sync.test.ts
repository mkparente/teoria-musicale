import { describe, expect, it } from 'vitest';
import { GIST_FILE, SyncError, findOrCreateGist, readGist, writeGist } from './gist';
import { type Snapshot, emptySnapshot, mergeSnapshots, sameValue } from './merge';

const snap = (data: Record<string, unknown>, updated: Record<string, number> = {}): Snapshot => ({ version: 1, data, updated });
const item = (box: number, last: number, seen = 1) => ({ box, due: last + 1000, seen, correct: seen, totalMs: 1000, last });

describe('fusione dei progressi', () => {
  it('ripasso: per ogni elemento vince la risposta più recente, e nessuno si perde', () => {
    const local = snap({ srs: { a: item(3, 200), b: item(1, 100) } }, { srs: 200 });
    const remote = snap({ srs: { a: item(1, 100), c: item(2, 150) } }, { srs: 150 });
    const m = mergeSnapshots(local, remote);
    expect(m.data.srs).toEqual({ a: item(3, 200), b: item(1, 100), c: item(2, 150) });
    expect(m.updated.srs).toBe(200);
  });

  it('ripasso: la copia online più recente vince su quella locale', () => {
    const m = mergeSnapshots(snap({ srs: { a: item(1, 100) } }), snap({ srs: { a: item(4, 300) } }));
    expect(m.data.srs).toEqual({ a: item(4, 300) });
  });

  it('registro: tempo più lungo del giorno, completata se lo è da una parte', () => {
    const local = snap({ log: { '2026-11-24': { minutes: 20, completed: true }, '2026-11-25': { minutes: 5, completed: false } } });
    const remote = snap({ log: { '2026-11-25': { minutes: 15, completed: false }, '2026-11-20': { minutes: 10, completed: true } } });
    expect(mergeSnapshots(local, remote).data.log).toEqual({
      '2026-11-24': { minutes: 20, completed: true },
      '2026-11-25': { minutes: 15, completed: false },
      '2026-11-20': { minutes: 10, completed: true },
    });
  });

  it('le altre chiavi tengono la versione modificata più di recente', () => {
    const local = snap({ program: { start: 'A', done: ['u01'] }, settings: { naming: 'en' } }, { program: 500, settings: 100 });
    const remote = snap({ program: { start: 'B', done: [] }, settings: { naming: 'it' } }, { program: 400, settings: 300 });
    const m = mergeSnapshots(local, remote);
    expect(m.data.program).toEqual({ start: 'A', done: ['u01'] });
    expect(m.data.settings).toEqual({ naming: 'it' });
  });

  it('a parità di data (dati di prima della sincronizzazione) vince la copia online', () => {
    const m = mergeSnapshots(snap({ program: { done: ['u01'] } }), snap({ program: { done: ['u01', 'u02'] } }));
    expect(m.data.program).toEqual({ done: ['u01', 'u02'] });
  });

  it('le chiavi presenti da una parte sola si tengono', () => {
    const m = mergeSnapshots(snap({ a: 1 }), snap({ b: 2 }));
    expect(m.data).toEqual({ a: 1, b: 2 });
  });

  it('un dispositivo nuovo riceve tutto', () => {
    const remote = snap({ srs: { a: item(3, 10) }, program: { done: ['u01'] } }, { srs: 10, program: 10 });
    expect(mergeSnapshots(emptySnapshot(), remote)).toEqual(remote);
  });

  it('l\'ordine delle chiavi non conta nel confronto', () => {
    expect(sameValue({ a: 1, b: { c: 2, d: 3 } }, { b: { d: 3, c: 2 }, a: 1 })).toBe(true);
    expect(sameValue({ a: 1 }, { a: 2 })).toBe(false);
  });
});

/** Una finta API di GitHub, con i Gist in memoria. */
function fakeGitHub(opts: { status?: number; gists?: Record<string, string> } = {}) {
  const gists: Record<string, string> = { ...opts.gists };
  const calls: string[] = [];
  const f = (async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? 'GET';
    calls.push(`${method} ${url.replace('https://api.github.com', '')}`);
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
    if (opts.status) return json({ message: 'errore' }, opts.status);
    const files = (id: string) => ({ [GIST_FILE]: { content: gists[id] } });
    if (method === 'GET' && url.includes('/gists?')) return json(Object.keys(gists).map((id) => ({ id, files: files(id) })));
    if (method === 'POST') {
      const id = `g${Object.keys(gists).length + 1}`;
      gists[id] = JSON.parse(init.body as string).files[GIST_FILE].content;
      return json({ id, files: files(id) }, 201);
    }
    const id = url.split('/gists/')[1];
    if (!(id in gists)) return json({ message: 'Not Found' }, 404);
    if (method === 'PATCH') gists[id] = JSON.parse(init.body as string).files[GIST_FILE].content;
    return json({ id, files: files(id) });
  }) as typeof fetch;
  return { f, gists, calls };
}

describe('Gist dei progressi', () => {
  it('lo crea la prima volta e lo ritrova le volte dopo', async () => {
    const gh = fakeGitHub();
    const id = await findOrCreateGist('t', gh.f);
    expect(gh.calls).toContain('POST /gists');
    expect(await findOrCreateGist('t', gh.f)).toBe(id);
    expect(gh.calls.filter((c) => c.startsWith('POST'))).toHaveLength(1);
  });

  it('scrive e rilegge i progressi', async () => {
    const gh = fakeGitHub();
    const id = await findOrCreateGist('t', gh.f);
    const s = snap({ srs: { a: item(2, 5) } }, { srs: 5 });
    await writeGist('t', id, s, gh.f);
    expect(await readGist('t', id, gh.f)).toEqual(s);
  });

  it('un file vuoto o rovinato vale come nessun progresso', async () => {
    const gh = fakeGitHub({ gists: { x: 'non è json' } });
    expect(await readGist('t', 'x', gh.f)).toEqual(emptySnapshot());
  });

  it('errori comprensibili per token sbagliato, permesso mancante e Gist cancellato', async () => {
    await expect(findOrCreateGist('t', fakeGitHub({ status: 401 }).f)).rejects.toMatchObject({ kind: 'auth' });
    await expect(findOrCreateGist('t', fakeGitHub({ status: 403 }).f)).rejects.toMatchObject({ kind: 'auth' });
    await expect(readGist('t', 'manca', fakeGitHub().f)).rejects.toMatchObject({ kind: 'missing' });
    const offline = (async () => {
      throw new TypeError('Failed to fetch');
    }) as typeof fetch;
    await expect(readGist('t', 'x', offline)).rejects.toBeInstanceOf(SyncError);
  });
});
