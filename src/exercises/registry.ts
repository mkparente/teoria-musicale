import type { JSX } from 'preact';
import type { ExerciseKey } from '../program/curriculum';
import type { Naming } from '../theory/notes';
import * as Chords from './ChordFretQuiz';
import * as Fret from './FretboardQuiz';
import * as Reading from './ReadingQuiz';
import * as Scale from './ScaleQuiz';
import * as Triad from './TriadQuiz';
import type { ExerciseProps } from './useExercise';

export type IconName =
  | 'today' | 'program' | 'exercises' | 'explore' | 'progress' | 'settings'
  | 'scale' | 'triad' | 'reading' | 'fretboard' | 'chords' | 'guitar' | 'review' | 'new' | 'back' | 'close' | 'sliders';

export interface ExerciseDef {
  key: ExerciseKey;
  title: string;
  text: string;
  group: 'Teoria' | 'Sul manico';
  prefix: string;
  icon: IconName;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Component: (props: ExerciseProps<any>) => JSX.Element;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buildPool: (config: any) => string[];
  defaults: object;
  /** Opzioni di visualizzazione per il ripasso, dove gli elementi arrivano da attività diverse. */
  reviewConfig?: object;
  describe: (id: string, naming: Naming) => string;
}

/** Tutti gli esercizi dell'app, nello stesso ordine in cui compaiono ovunque. */
export const EXERCISES: Record<ExerciseKey, ExerciseDef> = {
  scale: {
    key: 'scale',
    title: 'Scale',
    text: 'Gradi, armature, relative, scrivere le scale.',
    group: 'Teoria',
    prefix: Scale.PREFIX,
    icon: 'scale',
    Component: Scale.ScaleQuiz,
    buildPool: Scale.buildPool,
    defaults: Scale.DEFAULT,
    describe: Scale.describe,
  },
  triadi: {
    key: 'triadi',
    title: 'Triadi',
    text: 'Costruire e riconoscere triadi, rivolti, triadi dei gradi.',
    group: 'Teoria',
    prefix: Triad.PREFIX,
    icon: 'triad',
    Component: Triad.TriadQuiz,
    buildPool: Triad.buildPool,
    defaults: Triad.DEFAULT,
    describe: Triad.describe,
  },
  lettura: {
    key: 'lettura',
    title: 'Lettura',
    text: 'Le note sul pentagramma, anche con l’armatura.',
    group: 'Teoria',
    prefix: Reading.PREFIX,
    icon: 'reading',
    Component: Reading.ReadingQuiz,
    buildPool: Reading.buildPool,
    defaults: Reading.DEFAULT,
    reviewConfig: { accidentals: true, guitarClef: true },
    describe: Reading.describe,
  },
  manico: {
    key: 'manico',
    title: 'Note sul manico',
    text: 'Trovare e riconoscere le note, corda per corda.',
    group: 'Sul manico',
    prefix: Fret.PREFIX,
    icon: 'fretboard',
    Component: Fret.FretboardQuiz,
    buildPool: Fret.buildPool,
    defaults: Fret.DEFAULT,
    reviewConfig: { maxFret: 15, strings: [1, 2, 3, 4, 5, 6], accidentals: true },
    describe: Fret.describe,
  },
  accordi: {
    key: 'accordi',
    title: 'Accordi sul manico',
    text: 'Forme CAGED e triadi su 3 corde, in tutti i rivolti.',
    group: 'Sul manico',
    prefix: Chords.PREFIX,
    icon: 'chords',
    Component: Chords.ChordFretQuiz,
    buildPool: Chords.buildPool,
    defaults: Chords.DEFAULT,
    describe: Chords.describe,
  },
};

export const EXERCISE_LIST = Object.values(EXERCISES);

export const isAvailable = (key: string): key is ExerciseKey => key in EXERCISES;

/** Elementi dell'esercizio con le opzioni di un'attività del programma. */
export function activityPool(key: ExerciseKey, config?: Record<string, unknown>): string[] {
  const def = EXERCISES[key];
  return def.buildPool({ ...def.defaults, ...config });
}

export const exerciseOf = (id: string) => EXERCISE_LIST.find((e) => id.startsWith(e.prefix));

/** Prefisso delle attività con la chitarra nel ripasso. */
export const GUITAR_PREFIX = 'gt:';
