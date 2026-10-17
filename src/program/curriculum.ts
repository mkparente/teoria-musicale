import type { GuitarString } from '../theory/guitar';
import type { CagedForm } from '../theory/positions';
import type { ScaleType } from '../theory/scales';

// Il programma: da ottobre 2026 ad agosto 2027, 5 sessioni da 20 minuti a settimana,
// orientato al blues. Ogni unità ha un obiettivo, quiz nell'app e attività con la chitarra.

/** Esercizi dell'app. Quelli non ancora costruiti compaiono nel programma come "in arrivo". */
export type ExerciseKey = 'scale' | 'triadi' | 'manico' | 'accordi' | 'lettura';
export type FutureExercise = 'intervalli' | 'settime' | 'blues12' | 'scalablues' | 'ritmo' | 'orecchio';

export const FUTURE_TITLES: Record<FutureExercise, string> = {
  intervalli: 'Intervalli',
  settime: 'Accordi di settima',
  blues12: 'Blues in 12 battute',
  scalablues: 'Scala blues',
  ritmo: 'Ritmo e shuffle',
  orecchio: 'Orecchio',
};

export interface QuizActivity {
  type: 'quiz';
  exercise: ExerciseKey | FutureExercise;
  title: string;
  /** Opzioni dell'esercizio per questa attività. */
  config?: Record<string, unknown>;
}

/** Disegno da mostrare accanto alle istruzioni di un'attività con la chitarra. */
export type Figure =
  | { kind: 'naturals'; strings: GuitarString[] }
  | { kind: 'scale'; type: ScaleType; tonic: string; box?: number; lo?: number; hi?: number }
  | { kind: 'chord'; root: number; quality: 'maj' | 'min'; form: CagedForm }
  | { kind: 'triads'; root: number; quality: 'maj' | 'min'; set: number };

export interface GuitarActivity {
  type: 'guitar';
  /** Identificativo stabile: serve al ripasso (prefisso "gt:"). */
  id: string;
  title: string;
  minutes: number;
  bpm?: number;
  steps: string[];
  figure?: Figure;
}

export type Activity = QuizActivity | GuitarActivity;

export interface Unit {
  id: string;
  block: string;
  title: string;
  /** Mesi indicativi, in parole. */
  period: string;
  weeks: number;
  why: string;
  goal: string;
  activities: Activity[];
}

export const PROGRAM_START = '2026-10-19';
export const PROGRAM_GOAL = 'Settembre 2027: prime lezioni con il maestro';

export const UNITS: Unit[] = [
  // ── Blocco 1: Fondamenta ──
  {
    id: 'u01',
    block: 'Fondamenta',
    title: 'Le note sulle corde 6 e 5',
    period: 'ottobre',
    weeks: 2,
    why: 'Sulle corde 6 e 5 stanno le fondamentali degli accordi con il barrè e dei box della pentatonica: sono i punti di riferimento di tutto il manico.',
    goal: 'Trovare in pochi secondi ogni nota naturale sulle corde 6 e 5, dal tasto 0 al 12.',
    activities: [
      { type: 'quiz', exercise: 'manico', title: 'Trova la nota sulle corde 6 e 5', config: { kind: 'str', strings: [6, 5], maxFret: 12, accidentals: false } },
      { type: 'quiz', exercise: 'manico', title: 'Che nota è, corde 6 e 5', config: { kind: 'name', strings: [6, 5], maxFret: 12, accidentals: false } },
      {
        type: 'guitar',
        id: 'u01-mi',
        title: 'Le note naturali sulla 6ª corda',
        minutes: 5,
        steps: [
          'Sali tasto per tasto dalla 6ª corda a vuoto fino al 12° tasto e di\' ad alta voce solo le note naturali: Mi (0), Fa (1), Sol (3), La (5), Si (7), Do (8), Re (10), Mi (12).',
          'Tra Mi e Fa e tra Si e Do c\'è un tasto solo (un semitono); tra le altre note naturali ce ne sono due (un tono).',
          'Ripeti scendendo. Poi chiudi gli occhi e prova a trovare le note a caso.',
        ],
        figure: { kind: 'naturals', strings: [6] },
      },
      {
        type: 'guitar',
        id: 'u01-la',
        title: 'Le note naturali sulla 5ª corda',
        minutes: 5,
        steps: [
          'Fai lo stesso sulla 5ª corda: La (0), Si (2), Do (3), Re (5), Mi (7), Fa (8), Sol (10), La (12).',
          'Scegli una nota e suonala prima sulla 6ª e poi sulla 5ª corda.',
          'Il Do all\'8° tasto della 6ª corda e il Do al 3° tasto della 5ª sono lo stesso identico suono: ascoltali uno dopo l\'altro.',
        ],
        figure: { kind: 'naturals', strings: [5] },
      },
    ],
  },
  {
    id: 'u02',
    block: 'Fondamenta',
    title: 'Leggere le note sul rigo',
    period: 'novembre',
    weeks: 2,
    why: 'Nel blues si usano molto le tablature, ma scale, accordi e intervalli si spiegano sul pentagramma: leggere le note ti fa capire la teoria e i materiali del maestro.',
    goal: 'Riconoscere le note in chiave di violino, dentro il rigo e con un taglio addizionale; trovare le note naturali su tutte le corde.',
    activities: [
      { type: 'quiz', exercise: 'lettura', title: 'Note dentro il rigo', config: { kind: 'notes', ranges: ['staff'], accidentals: false, guitarClef: true } },
      { type: 'quiz', exercise: 'lettura', title: 'Note con un taglio addizionale', config: { kind: 'notes', ranges: ['staff', 'near'], accidentals: false, guitarClef: true } },
      { type: 'quiz', exercise: 'manico', title: 'Trova la nota sulle corde 4, 3, 2, 1', config: { kind: 'str', strings: [4, 3, 2, 1], maxFret: 12, accidentals: false } },
      {
        type: 'guitar',
        id: 'u02-corde',
        title: 'Le note naturali sulle corde 4 e 3',
        minutes: 5,
        steps: [
          '4ª corda (Re): Re (0), Mi (2), Fa (3), Sol (5), La (7), Si (9), Do (10), Re (12).',
          '3ª corda (Sol): Sol (0), La (2), Si (4), Do (5), Re (7), Mi (9), Fa (10), Sol (12).',
          'Sali e scendi su ciascuna corda dicendo i nomi. La 1ª corda ha le stesse note della 6ª.',
        ],
        figure: { kind: 'naturals', strings: [4, 3] },
      },
      {
        type: 'guitar',
        id: 'u02-rigo',
        title: 'Dal rigo alla chitarra',
        minutes: 5,
        steps: [
          'La chitarra suona un\'ottava sotto la nota scritta: il Mi sulla prima riga del rigo è il Mi della 4ª corda al 2° tasto.',
          'Il Sol sulla seconda riga è la 3ª corda a vuoto; il Si sulla terza riga è la 2ª corda a vuoto; il Mi del quarto spazio è la 1ª corda a vuoto.',
          'Apri l\'esercizio Lettura (o un qualunque metodo), leggi una nota alla volta e suonala.',
        ],
      },
    ],
  },
  {
    id: 'u03',
    block: 'Fondamenta',
    title: 'Toni, semitoni e scala maggiore',
    period: 'novembre – dicembre',
    weeks: 2,
    why: 'La scala maggiore è il metro di tutto: intervalli, accordi e la stessa pentatonica si descrivono come gradi della maggiore.',
    goal: 'Costruire le scale maggiori fino a 2 alterazioni e trovarne qualunque grado.',
    activities: [
      { type: 'quiz', exercise: 'scale', title: 'Scrivi le scale maggiori', config: { kinds: ['write'], scales: ['major'], maxAcc: 2 } },
      { type: 'quiz', exercise: 'scale', title: 'Gradi delle scale maggiori', config: { kinds: ['deg', 'which'], scales: ['major'], maxAcc: 2 } },
      {
        type: 'guitar',
        id: 'u03-corda',
        title: 'La scala maggiore su una corda',
        minutes: 5,
        steps: [
          'Suona Do maggiore solo sulla 5ª corda: tasti 3, 5, 7, 8, 10, 12, 14, 15. Due tasti = tono, un tasto = semitono: T T S T T T S.',
          'Poi Sol maggiore solo sulla 6ª corda: tasti 3, 5, 7, 8, 10, 12, 14, 15. Stesso disegno, perché lo schema di toni e semitoni è sempre lo stesso.',
          'Di\' i nomi delle note mentre suoni (in Sol maggiore c\'è il Fa♯ al 14° tasto).',
        ],
      },
      {
        type: 'guitar',
        id: 'u03-posizione',
        title: 'Sol maggiore in posizione',
        minutes: 5,
        bpm: 60,
        steps: [
          'Parti dal Sol della 6ª corda (3° tasto) e suona le note di Sol maggiore restando tra il 2° e il 5° tasto, fino al Sol della 1ª corda.',
          'Una nota per battito, metronomo a 60, salita e discesa.',
          'Fermati sempre sulla tonica (Sol): senti come "chiude" la scala.',
        ],
        figure: { kind: 'scale', type: 'major', tonic: '4', lo: 2, hi: 5 },
      },
    ],
  },

  // ── Blocco 2: Intervalli e tonalità ──
  {
    id: 'u04',
    block: 'Intervalli e tonalità',
    title: 'Gli intervalli',
    period: 'dicembre',
    weeks: 3,
    why: 'Un intervallo è la distanza tra due note. Triadi, accordi di settima e scale sono fatti di intervalli: nel blues contano soprattutto terza minore e maggiore, quinta e settima minore.',
    goal: 'Riconoscere e costruire gli intervalli dentro l\'ottava, sul rigo e sul manico.',
    activities: [
      { type: 'quiz', exercise: 'intervalli', title: 'Riconosci e costruisci gli intervalli' },
      {
        type: 'guitar',
        id: 'u04-forme',
        title: 'Gli intervalli dalla 6ª alla 5ª corda',
        minutes: 6,
        steps: [
          'Metti un dito sul La della 6ª corda (5° tasto). Sulla 5ª corda trovi: terza minore al 3° tasto, terza maggiore al 4°, quarta al 5°, quinta al 7°.',
          'Sulla 4ª corda: settima minore al 5° tasto, ottava al 7°.',
          'Sono "disegni" che valgono ovunque sulle corde 6-5-4: spostali su altre note e di\' il nome dell\'intervallo mentre suoni.',
        ],
      },
    ],
  },
  {
    id: 'u05',
    block: 'Intervalli e tonalità',
    title: 'Armature e tonalità relative',
    period: 'gennaio',
    weeks: 3,
    why: 'L\'armatura ti dice subito quali note usare in una tonalità. Le relative spiegano perché La minore e Do maggiore hanno le stesse note: lo stesso vale per pentatonica minore e maggiore.',
    goal: 'Armature delle tonalità maggiori e minori fino a 4 alterazioni, in tutte e due le direzioni, e le relative.',
    activities: [
      { type: 'quiz', exercise: 'scale', title: 'Armature e relative', config: { kinds: ['sig', 'key', 'rel'], scales: ['major', 'natural'], maxAcc: 4 } },
      { type: 'quiz', exercise: 'lettura', title: 'Leggere con l\'armatura', config: { kind: 'keys', maxAcc: 3, guitarClef: true } },
      {
        type: 'guitar',
        id: 'u05-tonalita',
        title: 'Le tonalità del blues',
        minutes: 5,
        steps: [
          'Le tonalità più comode per il blues in chitarra sono Mi, La, Re, Sol e Do, per via delle corde a vuoto.',
          'Per ognuna trova la fondamentale sulla 6ª e sulla 5ª corda e di\' quante alterazioni ha la tonalità maggiore (Mi: 4♯, La: 3♯, Re: 2♯, Sol: 1♯, Do: nessuna).',
          'Poi suona la nota più grave e più acuta che riesci per ogni tonica.',
        ],
      },
    ],
  },
  {
    id: 'u06',
    block: 'Intervalli e tonalità',
    title: 'La scala minore naturale',
    period: 'gennaio – febbraio',
    weeks: 2,
    why: 'Il blues suona "minore" anche sopra accordi maggiori: capire la minore naturale prepara alla pentatonica minore.',
    goal: 'Costruire le minori naturali fino a 3 alterazioni; trovare tutte le note, anche alterate, sul manico.',
    activities: [
      { type: 'quiz', exercise: 'scale', title: 'Minori naturali', config: { kinds: ['write', 'deg', 'rel'], scales: ['natural'], maxAcc: 3 } },
      { type: 'quiz', exercise: 'manico', title: 'Che nota è, anche con ♯ e ♭', config: { kind: 'name', strings: [1, 2, 3, 4, 5, 6], maxFret: 12, accidentals: true } },
      {
        type: 'guitar',
        id: 'u06-relative',
        title: 'La minore e Do maggiore: stesse note',
        minutes: 5,
        steps: [
          'Suona La minore naturale sulla 5ª corda: 0, 2, 3, 5, 7, 8, 10, 12.',
          'Poi Do maggiore sulla stessa corda: 3, 5, 7, 8, 10, 12, 14, 15.',
          'Le note sono le stesse, cambia il centro: fermati a lungo sulla tonica di ognuna e ascolta la differenza di atmosfera.',
        ],
      },
    ],
  },

  // ── Blocco 3: Il linguaggio del blues ──
  {
    id: 'u07',
    block: 'Il linguaggio del blues',
    title: 'Pentatonica minore: box 1 e 2',
    period: 'febbraio',
    weeks: 2,
    why: 'La pentatonica minore è la scala del blues per eccellenza: quasi ogni assolo blues parte da qui.',
    goal: 'Conoscere note e gradi (1, ♭3, 4, 5, ♭7) delle pentatoniche minori più usate e suonare i box 1 e 2.',
    activities: [
      { type: 'quiz', exercise: 'scale', title: 'Gradi della pentatonica minore', config: { kinds: ['deg', 'which', 'write'], scales: ['pentMinor'], maxAcc: 3 } },
      {
        type: 'guitar',
        id: 'u07-box1',
        title: 'Box 1 di La minore pentatonica',
        minutes: 6,
        bpm: 60,
        steps: [
          'Indice al 5° tasto; anulare o mignolo all\'8° (al 7° sulle corde 5, 4 e 3).',
          'Sali dalla 6ª alla 1ª corda e riscendi, una nota per battito con il metronomo a 60.',
          'Quando è pulito, due note per battito. Parti e finisci sempre su un La (oro nel disegno).',
        ],
        figure: { kind: 'scale', type: 'pentMinor', tonic: '5', box: 1 },
      },
      {
        type: 'guitar',
        id: 'u07-box2',
        title: 'Box 2 e collegamento con il box 1',
        minutes: 6,
        bpm: 60,
        steps: [
          'Il box 2 di La minore pentatonica sta tra il 7° e il 10° tasto.',
          'Le note all\'8° tasto della 6ª e della 1ª corda (Do) sono in comune con il box 1: usale come ponte.',
          'Sali nel box 1, passa al box 2 dalla 1ª corda e riscendi nel box 2.',
        ],
        figure: { kind: 'scale', type: 'pentMinor', tonic: '5', box: 2 },
      },
    ],
  },
  {
    id: 'u08',
    block: 'Il linguaggio del blues',
    title: 'Triadi maggiori e minori',
    period: 'marzo',
    weeks: 2,
    why: 'Gli accordi sono fatti di triadi: la terza decide se un accordo è maggiore o minore, ed è la nota che il blues "piega" tra le due.',
    goal: 'Costruire e riconoscere triadi maggiori e minori, anche in rivolto; triadi dei gradi della scala maggiore.',
    activities: [
      { type: 'quiz', exercise: 'triadi', title: 'Costruisci e riconosci le triadi', config: { kinds: ['notes', 'kind', 'root'], qualities: ['maj', 'min'], keys: ['major'], maxAcc: 3 } },
      { type: 'quiz', exercise: 'triadi', title: 'Triadi dei gradi', config: { kinds: ['dqual', 'dfind'], qualities: ['maj', 'min', 'dim'], keys: ['major'], maxAcc: 3 } },
      {
        type: 'guitar',
        id: 'u08-triadi',
        title: 'Maggiore e minore sulle corde 1-2-3',
        minutes: 5,
        steps: [
          'Suona i tre rivolti di La maggiore sulle corde 1-2-3, salendo lungo il manico.',
          'Poi fai lo stesso con La minore: cambia solo una nota, la terza (viola nel disegno), che scende di un tasto.',
          'Alterna maggiore e minore nella stessa posizione e ascolta il cambio di colore.',
        ],
        figure: { kind: 'triads', root: 9, quality: 'maj', set: 0 },
      },
    ],
  },
  {
    id: 'u09',
    block: 'Il linguaggio del blues',
    title: 'Accordi di settima e blues in 12 battute',
    period: 'marzo – aprile',
    weeks: 3,
    why: 'Il blues si suona con accordi di settima di dominante (I7, IV7, V7) e segue quasi sempre lo schema di 12 battute.',
    goal: 'Sapere come è fatto un accordo di settima di dominante e suonare un blues in 12 battute in La e in Mi.',
    activities: [
      { type: 'quiz', exercise: 'settime', title: 'Accordi di settima' },
      { type: 'quiz', exercise: 'blues12', title: 'Il blues in 12 battute' },
      {
        type: 'guitar',
        id: 'u09-blues-la',
        title: 'Blues in La con A7, D7, E7',
        minutes: 6,
        bpm: 70,
        steps: [
          'Accordi aperti: A7 (x02020), D7 (xx0212), E7 (020100).',
          'Schema, una battuta = 4 battiti: A7 A7 A7 A7 | D7 D7 A7 A7 | E7 D7 A7 E7.',
          'Una pennata per battito con il metronomo a 70, contando le battute ad alta voce.',
        ],
      },
      {
        type: 'guitar',
        id: 'u09-boogie',
        title: 'Il riff boogie',
        minutes: 6,
        bpm: 70,
        steps: [
          'Su A7: suona insieme la 5ª corda a vuoto e la 4ª al 2° tasto, poi la 4ª al 4° tasto. Schema per battuta: 2-2-4-4.',
          'Su D7 lo stesso disegno sulle corde 4 (a vuoto) e 3; su E7 sulle corde 6 (a vuoto) e 5.',
          'Suonalo sullo schema delle 12 battute.',
        ],
      },
    ],
  },
  {
    id: 'u10',
    block: 'Il linguaggio del blues',
    title: 'La scala blues',
    period: 'aprile',
    weeks: 2,
    why: 'La scala blues è la pentatonica minore più la ♭5, la "blue note": è il suono tipico del blues.',
    goal: 'Conoscere la scala blues e usare la ♭5 come nota di passaggio nel box 1.',
    activities: [
      { type: 'quiz', exercise: 'scalablues', title: 'La scala blues' },
      {
        type: 'guitar',
        id: 'u10-bluenote',
        title: 'La blue note nel box 1',
        minutes: 5,
        bpm: 60,
        steps: [
          'Nel box 1 di La aggiungi il Mi♭ (♭5): 6° tasto della 5ª corda e 8° tasto della 3ª corda.',
          'Usala come passaggio tra la 4 e la 5 (Re → Mi♭ → Mi), non come nota su cui fermarti.',
          'Improvvisa frasi brevi sul blues in La, ognuna che finisce sul La.',
        ],
        figure: { kind: 'scale', type: 'pentMinor', tonic: '5', box: 1 },
      },
    ],
  },

  // ── Blocco 4: La mappa del manico ──
  {
    id: 'u11',
    block: 'La mappa del manico',
    title: 'CAGED: forme di Mi e di La',
    period: 'aprile – maggio',
    weeks: 3,
    why: 'Con le forme di Mi e di La (gli accordi con il barrè) suoni qualunque accordo maggiore e minore; nel blues bastano per I, IV e V in ogni tonalità.',
    goal: 'Riconoscere e suonare accordi maggiori e minori nelle forme di Mi e di La, sapendo dove sono 1, 3 e 5.',
    activities: [
      { type: 'quiz', exercise: 'accordi', title: 'Forme di Mi e di La', config: { kinds: ['shape', 'build', 'deg'], qualities: ['maj', 'min'], forms: ['E', 'A'] } },
      {
        type: 'guitar',
        id: 'u11-barre',
        title: 'Blues in La con il barrè',
        minutes: 6,
        bpm: 70,
        steps: [
          'La in forma di Mi (5° tasto), Re in forma di La (5° tasto), Mi in forma di La (7° tasto).',
          'Suona lo schema delle 12 battute: la mano si sposta pochissimo, tutto sta tra il 5° e il 9° tasto.',
          'Poi trasporta tutto in Sol (3° tasto) e in Do (8° tasto).',
        ],
        figure: { kind: 'chord', root: 9, quality: 'maj', form: 'E' },
      },
      {
        type: 'guitar',
        id: 'u11-trova',
        title: 'Trova la forma',
        minutes: 4,
        steps: [
          'Scegli un accordo a caso (Sol, Do, Fa, Si♭...).',
          'Suonalo in forma di Mi cercando la fondamentale sulla 6ª corda, poi in forma di La cercandola sulla 5ª.',
          'Ripeti con lo stesso accordo minore.',
        ],
      },
    ],
  },
  {
    id: 'u12',
    block: 'La mappa del manico',
    title: 'Pentatonica e CAGED su tutto il manico',
    period: 'maggio',
    weeks: 3,
    why: 'I 5 box della pentatonica e le 5 forme CAGED sono la stessa mappa: in ogni box c\'è un accordo nascosto.',
    goal: 'Suonare i 5 box di La minore pentatonica e riconoscere tutte le forme CAGED.',
    activities: [
      { type: 'quiz', exercise: 'accordi', title: 'Tutte le forme CAGED', config: { kinds: ['shape', 'deg'], qualities: ['maj', 'min'], forms: ['C', 'A', 'G', 'E', 'D'] } },
      { type: 'quiz', exercise: 'scale', title: 'Pentatoniche minori, tutte le tonalità', config: { kinds: ['deg', 'which'], scales: ['pentMinor'], maxAcc: 5 } },
      {
        type: 'guitar',
        id: 'u12-box',
        title: 'I 5 box di La minore pentatonica',
        minutes: 6,
        bpm: 60,
        steps: [
          'Box 1 al 5° tasto, box 2 intorno all\'8°, box 3 intorno al 10°, box 4 intorno al 12°, box 5 intorno al 15° (o al 3°).',
          'Suonali uno dopo l\'altro salendo lungo il manico, poi riscendi.',
          'In Esplora → Scale scegli la posizione per vedere ogni box.',
        ],
        figure: { kind: 'scale', type: 'pentMinor', tonic: '5' },
      },
      {
        type: 'guitar',
        id: 'u12-accordo',
        title: 'L\'accordo dentro il box',
        minutes: 5,
        steps: [
          'In ogni box trova le note di La minore: 1, ♭3 e 5 (oro, viola e blu nel disegno).',
          'Suonale come arpeggio, dal basso verso l\'acuto.',
          'Improvvisando, prova a far finire le frasi su una di queste tre note.',
        ],
        figure: { kind: 'scale', type: 'pentMinor', tonic: '5', box: 1 },
      },
    ],
  },
  {
    id: 'u13',
    block: 'La mappa del manico',
    title: 'Triadi su 3 corde e rivolti',
    period: 'maggio – giugno',
    weeks: 2,
    why: 'Le triadi su 3 corde sono gli accordi "leggeri" che si usano per accompagnare senza coprire il cantante o l\'altro chitarrista.',
    goal: 'Suonare triadi maggiori e minori in tutti i rivolti sulle corde 1-2-3 e 2-3-4.',
    activities: [
      { type: 'quiz', exercise: 'accordi', title: 'Triadi e rivolti sul manico', config: { kinds: ['tri', 'inv'], qualities: ['maj', 'min'], sets: ['0', '1'] } },
      { type: 'quiz', exercise: 'triadi', title: 'Fondamentale nei rivolti', config: { kinds: ['root'], qualities: ['maj', 'min'] } },
      {
        type: 'guitar',
        id: 'u13-blues-triadi',
        title: 'Il blues con le triadi',
        minutes: 6,
        bpm: 70,
        steps: [
          'Suona il blues in La usando solo triadi sulle corde 1-2-3: La, Re e Mi maggiore.',
          'Per ogni cambio d\'accordo scegli il rivolto più vicino al precedente, così la mano si sposta al minimo.',
          'Poi rifallo sulle corde 2-3-4.',
        ],
        figure: { kind: 'triads', root: 2, quality: 'maj', set: 0 },
      },
    ],
  },

  // ── Blocco 5: Orecchio e ritmo ──
  {
    id: 'u14',
    block: 'Orecchio e ritmo',
    title: 'Ritmo: shuffle e terzine',
    period: 'giugno',
    weeks: 3,
    why: 'Il blues si suona quasi sempre "in shuffle": ogni battito è diviso in tre e si suonano la prima e la terza parte.',
    goal: 'Leggere e suonare ritmi con semiminime, crome e terzine; tenere lo shuffle con il metronomo.',
    activities: [
      { type: 'quiz', exercise: 'ritmo', title: 'Solfeggio ritmico' },
      {
        type: 'guitar',
        id: 'u14-shuffle',
        title: 'Lo shuffle',
        minutes: 5,
        bpm: 60,
        steps: [
          'Metronomo a 60. Per ogni battito conta "uno-e-a" (tre parti uguali): è una terzina.',
          'Suona solo sulla prima e sulla terza parte: "UNO - a, DUE - a...". Questo è lo shuffle.',
          'Applicalo al riff boogie e poi agli accordi del blues in La.',
        ],
      },
    ],
  },
  {
    id: 'u15',
    block: 'Orecchio e ritmo',
    title: 'Orecchio: intervalli, maggiore e minore',
    period: 'luglio',
    weeks: 3,
    why: 'Riconoscere a orecchio una terza maggiore o minore, o un accordo maggiore da uno minore, è la base per suonare con gli altri.',
    goal: 'Riconoscere a orecchio gli intervalli principali e la differenza tra accordi maggiori e minori.',
    activities: [
      { type: 'quiz', exercise: 'orecchio', title: 'Riconoscimento a orecchio' },
      {
        type: 'guitar',
        id: 'u15-canta',
        title: 'Canta e trova',
        minutes: 5,
        steps: [
          'Suona una nota sulla 6ª corda, poi canta la sua terza maggiore e cercala sulla 5ª corda (un tasto più indietro).',
          'Fai lo stesso con la terza minore (due tasti più indietro) e con la quinta (due tasti più avanti).',
          'Suona La maggiore e La minore uno dopo l\'altro e prova a descrivere la differenza.',
        ],
      },
    ],
  },
  {
    id: 'u16',
    block: 'Orecchio e ritmo',
    title: 'Pentatonica maggiore nel blues',
    period: 'luglio',
    weeks: 2,
    why: 'Alternare pentatonica maggiore e minore è il segreto del suono di molti bluesman: la maggiore "addolcisce" sopra l\'accordo di tonica.',
    goal: 'Conoscere la pentatonica maggiore e sapere quando usarla in un blues.',
    activities: [
      { type: 'quiz', exercise: 'scale', title: 'Pentatonica maggiore', config: { kinds: ['deg', 'which', 'write', 'rel'], scales: ['pentMajor', 'pentMinor'], maxAcc: 3 } },
      {
        type: 'guitar',
        id: 'u16-maggiore',
        title: 'Maggiore sopra A7, minore sul resto',
        minutes: 6,
        bpm: 70,
        steps: [
          'La pentatonica maggiore di La ha lo stesso disegno del box 1 di La minore, ma 3 tasti più in basso (dal 2° tasto).',
          'Sul blues in La usa la maggiore sopra A7 e torna alla minore (5° tasto) sopra D7 ed E7.',
          'Ascolta come la maggiore suona più "allegra" e la minore più "tesa".',
        ],
        figure: { kind: 'scale', type: 'pentMajor', tonic: '5', lo: 2, hi: 5 },
      },
    ],
  },

  // ── Blocco 6: Verso le lezioni ──
  {
    id: 'u17',
    block: 'Verso le lezioni',
    title: 'Progressioni e blues in tutte le tonalità',
    period: 'agosto',
    weeks: 3,
    why: 'Con il maestro suonerai in tonalità diverse: devi trovare I, IV e V al volo.',
    goal: 'Trovare I, IV e V in ogni tonalità e suonare un blues in Mi, La, Sol, Do e Re.',
    activities: [
      { type: 'quiz', exercise: 'triadi', title: 'Triadi dei gradi, tutte le tonalità', config: { kinds: ['dqual', 'dfind'], qualities: ['maj', 'min', 'dim'], keys: ['major', 'natural'], maxAcc: 5 } },
      { type: 'quiz', exercise: 'blues12', title: 'Il blues in 12 battute' },
      {
        type: 'guitar',
        id: 'u17-tonalita',
        title: 'Blues in cinque tonalità',
        minutes: 6,
        bpm: 80,
        steps: [
          'Scegli una tonalità tra Mi, La, Sol, Do e Re.',
          'Trova I, IV e V (in Sol: Sol, Do, Re) nelle forme di Mi e di La e suona le 12 battute.',
          'Ogni giorno una tonalità diversa.',
        ],
      },
    ],
  },
  {
    id: 'u18',
    block: 'Verso le lezioni',
    title: 'Ripasso generale e autoverifica',
    period: 'agosto – settembre',
    weeks: 3,
    why: 'Arrivare dal maestro sapendo cosa sai e cosa no rende le prime lezioni molto più utili.',
    goal: 'Ripassare tutto e preparare un riepilogo di cosa sai fare da mostrare al maestro.',
    activities: [
      { type: 'quiz', exercise: 'scale', title: 'Ripasso: scale', config: { kinds: ['deg', 'sig', 'key', 'rel'], scales: ['major', 'natural', 'pentMinor', 'pentMajor'], maxAcc: 5 } },
      { type: 'quiz', exercise: 'accordi', title: 'Ripasso: accordi sul manico', config: { kinds: ['shape', 'inv'], qualities: ['maj', 'min'], forms: ['C', 'A', 'G', 'E', 'D'], sets: ['0', '1'] } },
      {
        type: 'guitar',
        id: 'u18-blues',
        title: 'Un blues completo',
        minutes: 6,
        bpm: 80,
        steps: [
          'Scegli una tonalità a caso.',
          'Suona due giri di 12 battute di accompagnamento (shuffle), poi due giri di improvvisazione con la pentatonica minore.',
          'Se puoi, registrati e riascoltati.',
        ],
      },
    ],
  },
];

export const totalWeeks = () => UNITS.reduce((s, u) => s + u.weeks, 0);
