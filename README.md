# Teoria musicale

App personale (PWA) per studiare teoria musicale con la chitarra, in vista delle lezioni con un maestro da settembre 2027. Il programma è orientato al blues.

## Come è organizzata

- **Oggi**: la sessione del giorno, costruita sul tempo a disposizione (10, 20, 30 o 45 minuti). È fatta di blocchi:
  - **ripasso** degli elementi in scadenza;
  - **nuovo**: i quiz dell'unità corrente del programma;
  - **chitarra in mano**: un'attività con istruzioni, disegno sul manico, timer e autovalutazione (si può escludere con "Chitarra: non ce l'ho", per quando sei in viaggio).

  I blocchi di quiz durano al massimo 5 minuti.

  Se la interrompi, la riprendi dal punto in cui eri.
- **Programma**: 18 unità in 6 blocchi, da ottobre 2026 ad agosto 2027 (5 sessioni da 20 minuti a settimana). Ogni unità dice perché si studia e qual è l'obiettivo. Un'unità si considera acquisita quando il 70% dei suoi elementi è consolidato. Il programma suggerisce, non blocca: puoi scegliere un'unità a mano o segnarla come completata. I contenuti stanno in `src/program/curriculum.ts`.
- **Esercizi** (studio libero, ognuno con le sue opzioni):
  - **Scale** (maggiore, minori naturale/armonica/melodica, pentatoniche): gradi, armature, relative, scrivere la scala.
  - **Triadi**: costruirle, riconoscerle, fondamentale nei rivolti, triadi dei gradi.
  - **Lettura**: chiave di violino (anche con l'8 sotto, come per chitarra), con o senza armatura.
  - **Note sul manico**: nota su una corda, che nota è, tutte le posizioni.
  - **Accordi sul manico**: forme CAGED e triadi su 3 corde nei tre rivolti.
- **Esplora**: scale e accordi sul pentagramma e sul manico. Mostra i box delle pentatoniche e le forme CAGED, con fondamentale, terza e quinta colorate.
- **Progressi**: avanzamento nel programma e, per ogni esercizio, dove sbagli di più.

Ogni risposta alimenta un ripasso a scatole (Leitner, `src/srs/srs.ts`): quello che sbagli torna presto, quello che sai torna sempre più di rado. Le attività con la chitarra hanno tre voti (bene, così così, da rifare). I progressi restano nel browser (localStorage); dalle impostazioni si può salvare e ricaricare un backup.

## Sviluppo

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # motore di teoria, programma e sessione
npm run build
```

- Il motore di teoria (`src/theory/`: note, scale, accordi, posizioni sul manico) non dipende dall'interfaccia. Le note sono scritte come lettera + alterazione + ottava, così le grafie sono sempre corrette (Fa♯ e non Sol♭ in Re maggiore).
- La chitarra si scrive un'ottava sopra il suono reale: `src/theory/guitar.ts` lavora sui suoni reali, il rigo sulle note scritte.
- Gli esercizi sono elencati in `src/exercises/registry.ts`. Ognuno accetta opzioni imposte, un elenco di elementi e un limite di tempo o di domande, così la sessione può usarli come blocchi.

## Pubblicazione

Ogni push su `main` pubblica su GitHub Pages tramite `.github/workflows/deploy.yml`.
