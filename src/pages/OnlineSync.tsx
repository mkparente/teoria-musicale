import { useState } from 'preact/hooks';
import { connect, disconnect, syncNow, useSync } from '../sync/sync';

/** Indirizzo per creare un token classico con il solo permesso "gist". */
const TOKEN_URL = 'https://github.com/settings/tokens/new?scopes=gist&description=Teoria%20musicale';

const time = (ms: number) => {
  const d = new Date(ms);
  const today = new Date().toDateString() === d.toDateString();
  const hm = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  return today ? `oggi alle ${hm}` : `${d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })} alle ${hm}`;
};

/** Salvataggio dei progressi in un Gist segreto di GitHub, per usare l'app da più dispositivi. */
export function OnlineSync() {
  const [sync] = useSync();
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section class="panel">
      <h2 class="panel-title">Salvataggio online</h2>
      {sync.token ? (
        <>
          <p class="hint">
            {sync.lastSync ? `Progressi sincronizzati ${time(sync.lastSync)}.` : 'Collegato, prima sincronizzazione in corso.'} Si
            aggiornano da soli all'apertura dell'app e poco dopo ogni esercizio.
          </p>
          {sync.error && (
            <p class="inline-bad sync-error">
              {sync.error}
              {sync.blocked && ' Scollega e collega di nuovo con un token nuovo.'}
            </p>
          )}
          <div class="row">
            <button class="secondary" disabled={busy} onClick={() => run(syncNow)}>
              {busy ? 'Sincronizzo…' : 'Sincronizza ora'}
            </button>
            <button
              class="link-btn danger"
              onClick={() => {
                if (confirm('Scollegare questo dispositivo? I progressi restano qui e online; per ricollegarlo servirà di nuovo il token.')) disconnect();
              }}
            >
              Scollega
            </button>
          </div>
        </>
      ) : (
        <>
          <p class="hint">
            I progressi stanno in questo browser. Collegando l'app al tuo account GitHub li ritrovi su tutti i dispositivi: si
            salvano in un Gist segreto, un file che vedi solo tu (e chi ne conosce l'indirizzo).
          </p>
          <ol class="steps small">
            <li>
              <a href={TOKEN_URL} target="_blank" rel="noopener">
                Crea un token su GitHub
              </a>{' '}
              con il solo permesso <b>gist</b> (già selezionato). Come scadenza puoi scegliere "No expiration".
            </li>
            <li>Copia il token e incollalo qui sotto. Su ogni dispositivo si incolla lo stesso token.</li>
            <li>Collega per primo il dispositivo con i progressi più aggiornati.</li>
          </ol>
          <form
            class="sync-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (token.trim()) void run(() => connect(token));
            }}
          >
            <input
              type="password"
              autocomplete="off"
              placeholder="ghp_…"
              aria-label="Token GitHub"
              value={token}
              onInput={(e) => setToken((e.target as HTMLInputElement).value)}
            />
            <button class="secondary" type="submit" disabled={busy || !token.trim()}>
              {busy ? 'Collego…' : 'Collega'}
            </button>
          </form>
        </>
      )}
    </section>
  );
}
