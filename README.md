# Teoria musicale

App personale (PWA) per studiare teoria musicale con la chitarra: scale maggiori e minori, lettura delle note, note sul manico.

## Esercizi

- **Quiz sulle scale** (maggiore, minori naturale/armonica/melodica, pentatoniche maggiore e minore): trovare un grado, dire che grado è una nota, armature, da armatura a tonalità, relative, scrivere la scala.
- **Triadi**: costruire una triade (maggiore, minore, diminuita, aumentata), riconoscerne il tipo, trovare la fondamentale nei rivolti, triadi dei gradi di una tonalità.
- **Accordi sul manico**: forme CAGED (che forma è, suonala, dov'è la terza) e triadi su 3 corde nei tre rivolti.
- **Note sul manico**: nota su una corda, che nota è, tutte le posizioni di una nota.
- **Lettura delle note**: chiave di violino (anche con l'8 sotto, come per chitarra), con o senza armatura.
- **Esplora le scale**: ogni scala sul pentagramma e sul manico, con i nomi dei gradi; per le pentatoniche anche le 5 posizioni (box). Scheda Accordi: forme CAGED e triadi su 3 corde di ogni accordo.

Ogni risposta alimenta un ripasso a scatole (Leitner, `src/srs/srs.ts`): quello che sbagli torna presto, quello che sai torna sempre più di rado. I progressi restano nel browser (localStorage); dalle impostazioni si può salvare e ricaricare un backup.

## Sviluppo

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # test del motore di teoria
npm run build
```

Il motore di teoria (`src/theory/`: note, scale, accordi, posizioni sul manico) non dipende dall'interfaccia: note scritte con lettera + alterazione + ottava, così le grafie sono sempre corrette (Fa♯ e non Sol♭ in Re maggiore).

La chitarra si scrive un'ottava sopra il suono reale: `src/theory/guitar.ts` lavora sui suoni reali, il rigo sulle note scritte.

## Pubblicazione

Ogni push su `main` pubblica su GitHub Pages tramite `.github/workflows/deploy.yml`.
