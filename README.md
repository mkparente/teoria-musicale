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
  - **Intervalli** (dentro l'ottava, dalla 2ª minore all'8ª, tritono compreso): che intervallo è (due note sul rigo), costruisci l'intervallo (la seconda nota va scritta con la lettera giusta: Do → Mi♭ è una 3ª minore, Do → Re♯ una 2ª aumentata), sul manico (due note sulla tastiera, vale il suono reale), trova sul manico (la nota 1 è segnata: tocca o suona l'intervallo chiesto sulla corda evidenziata; si parte dalla stessa corda, poi corda successiva, poi saltandone una, per ultimo attraverso la corda Si; la correzione ragiona dai punti di riferimento, 4ª sulla corda dopo e 8ª due corde sopra). Gli intervalli si introducono in un ordine pensato per il blues: prima 3ª maggiore e minore, 5ª e 8ª, poi 4ª e 7ª minore, poi gli altri.
  - **Triadi**: costruirle, riconoscerle, fondamentale nei rivolti, triadi dei gradi.
  - **Lettura**: chiave di violino (anche con l'8 sotto, come per chitarra), con o senza armatura.
  - **Note sul manico**: nota su una corda, che nota è, tutte le posizioni.
  - **Accordi sul manico**: forme CAGED e triadi su 3 corde nei tre rivolti.
- **Esplora**: scale, accordi e intervalli sul pentagramma e sul manico. Mostra i box delle pentatoniche e le forme CAGED, con fondamentale, terza e quinta colorate. La scheda **Intervalli** è una mappa leggera: una sola fondamentale scelta toccando il manico, e solo gli intervalli scelti (a gruppi: terze, terze e 5ª, solo 5ª, settime, blues; oppure uno per uno), sulla corda successiva e su quella dopo. 4ª e 8ª tratteggiate fanno da punti di riferimento (corda dopo, stesso tasto = 4ª; due corde sopra, due tasti avanti = 8ª), e sotto ogni intervallo è spiegato il disegno a parole, compreso il tasto in più quando si attraversa la corda Si.
- **Progressi**: avanzamento nel programma e, per ogni esercizio, dove sbagli di più.

- **Rispondere suonando**: dove la risposta è una nota o una sequenza di note (nota su una corda, costruire o trovare un intervallo, scrivere una triade o una scala) c'è il pulsante "Rispondi suonando". Il microfono riconosce una nota alla volta: la triade si suona arpeggiata, la scala salendo dalla tonica. Conta il nome della nota, non l'ottava; le note già scritte (per esempio la fondamentale suonata per prima) non contano come risposta. Il microfono resta acceso tra una domanda e l'altra e si spegne lasciando l'app. Il riconoscimento (`src/audio/pitch.ts`) usa il metodo di McLeod e si prova con segnali sintetici.

Ogni risposta alimenta un ripasso a scatole (Leitner, `src/srs/srs.ts`): quello che sbagli torna presto, quello che sai torna sempre più di rado. Conta anche il tempo: una risposta giusta ma oltre la soglia del suo tipo di domanda (`src/srs/speed.ts`: 6 s per una nota, 8 s per intervalli, gradi e triadi, qualche secondo per nota nelle scale da scrivere, 3 s in più rispondendo col microfono) è giusta ma non ancora sicura. Nelle prime due scatole conta solo indovinare; da lì in su una risposta lenta lascia l'elemento dov'è e lo fa tornare presto, quindi un'unità si acquisisce rispondendo giusto *e* in fretta. In Progressi, per ogni esercizio, quante delle giuste sono rapide e quali elementi sono giusti ma lenti. Durante la sessione il tempo del blocco si ferma mentre si legge la correzione.

Nelle correzioni dei gradi delle scale e degli intervalli sul pentagramma c'è anche il manico, in una finestra di pochi tasti (`src/theory/hints.ts`): la scala in una posizione dalla tonica sulla 6ª o 5ª corda fino all'ottava, con tonica e grado chiesto in evidenza; l'intervallo nel suo disegno principale con il riferimento (4ª o 8ª) tratteggiato. Si spegne dalle impostazioni ("Nelle correzioni di gradi e intervalli"). Le attività con la chitarra hanno tre voti (bene, così così, da rifare).

I progressi stanno nel browser (localStorage). Dalle impostazioni si può:
- **salvarli online** in un Gist segreto del proprio account GitHub, per usare l'app da più dispositivi. Serve un token classico con il solo permesso `gist`, da incollare su ogni dispositivo (resta solo lì, non va online né nel backup). La sincronizzazione parte all'apertura, poco dopo ogni modifica e quando si torna all'app: scarica, unisce e ricarica. Il ripasso si unisce elemento per elemento (vince la risposta più recente), il registro delle sessioni giorno per giorno, il resto tiene la versione modificata più di recente (`src/sync/`);
- salvare e ricaricare un backup in un file.

## Sviluppo

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # motore di teoria, programma e sessione
npm run build
```

- Il motore di teoria (`src/theory/`: note, intervalli, scale, accordi, posizioni sul manico) non dipende dall'interfaccia. Le note sono scritte come lettera + alterazione + ottava, così le grafie sono sempre corrette (Fa♯ e non Sol♭ in Re maggiore).
- La chitarra si scrive un'ottava sopra il suono reale: `src/theory/guitar.ts` lavora sui suoni reali, il rigo sulle note scritte.
- Gli esercizi sono elencati in `src/exercises/registry.ts`. Ognuno accetta opzioni imposte, un elenco di elementi e un limite di tempo o di domande, così la sessione può usarli come blocchi.

## Pubblicazione

Ogni push su `main` pubblica su GitHub Pages tramite `.github/workflows/deploy.yml`.
