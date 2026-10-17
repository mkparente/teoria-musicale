import { PageHead } from '../components/Layout';
import { Radio } from '../components/Shell';
import { useProgram } from '../program/progress';
import { reloadDb } from '../srs/srs';
import { exportAll, importAll, useSettings } from '../store';

export function SettingsPage() {
  const [settings, setSettings] = useSettings();
  const [program, setProgram] = useProgram();

  const download = () => {
    const blob = new Blob([JSON.stringify(exportAll(), null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `teoria-musicale-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const upload = async (file: File) => {
    try {
      importAll(JSON.parse(await file.text()));
      reloadDb();
      alert('Progressi ripristinati.');
    } catch {
      alert('Il file non è un backup valido.');
    }
  };

  return (
    <div class="page">
      <PageHead title="Impostazioni" back="#/" />
      <section class="panel">
        <h2 class="panel-title">Studio</h2>
        <Radio
          label="Durata abituale della sessione"
          options={[10, 20, 30, 45].map((m) => ({ value: m, label: `${m} minuti` }))}
          value={settings.sessionMinutes}
          onChange={(sessionMinutes) => setSettings({ ...settings, sessionMinutes })}
        />
        <label class="field">
          <span>Inizio del programma</span>
          <input
            type="date"
            value={program.start}
            onChange={(e) => {
              const v = (e.target as HTMLInputElement).value;
              if (v) setProgram({ ...program, start: v });
            }}
          />
          <small class="muted">Serve a capire se sei in pari con il calendario.</small>
        </label>
      </section>
      <section class="panel">
        <h2 class="panel-title">Esercizi</h2>
        <Radio
          label="Nomi delle note"
          options={[
            { value: 'it' as const, label: 'Do Re Mi' },
            { value: 'en' as const, label: 'C D E' },
          ]}
          value={settings.naming}
          onChange={(naming) => setSettings({ ...settings, naming })}
        />
        <Radio
          label="Dopo una risposta giusta"
          options={[
            { value: 'auto', label: 'Vai avanti da solo' },
            { value: 'manual', label: 'Aspetta che premo Avanti' },
          ]}
          value={settings.autoAdvance ? 'auto' : 'manual'}
          onChange={(v) => setSettings({ ...settings, autoAdvance: v === 'auto' })}
        />
      </section>
      <section class="panel">
        <h2 class="panel-title">Backup</h2>
        <p class="hint">
          I progressi restano salvati in questo browser. Per portarli su un altro dispositivo, salva un backup e
          caricalo dall'altra parte.
        </p>
        <div class="row">
          <button class="secondary" onClick={download}>
            Salva backup
          </button>
          <label class="secondary file-btn">
            Carica backup
            <input
              type="file"
              accept="application/json"
              onChange={(e) => {
                const f = (e.target as HTMLInputElement).files?.[0];
                if (f) upload(f);
              }}
            />
          </label>
        </div>
      </section>
    </div>
  );
}
