import type { IconName } from '../exercises/registry';

// Icone a tratto, 24×24, nel colore del testo: un solo stile per tutta l'app.
const PATHS: Record<IconName, string> = {
  today: 'M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  program: 'M4 5h16M4 12h16M4 19h10M17 17l2 2 3-4',
  exercises: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  explore: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM15.5 8.5l-2 5-5 2 2-5z',
  progress: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  settings:
    'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  scale: 'M3 20h4v-4h4v-4h4V8h4V4h2',
  triad: 'M12 4 3 20h18z',
  reading: 'M3 6h18M3 10h18M3 14h18M3 18h18M15 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM15 18V6',
  fretboard: 'M3 6h18M3 10h18M3 14h18M3 18h18M7 4v16M12 4v16M17 4v16',
  chords: 'M5 4v16M10 4v16M15 4v16M20 4v16M3 8h19M3 14h19M7.5 11a1.5 1.5 0 1 0 0 .1zM17.5 17a1.5 1.5 0 1 0 0 .1z',
  guitar: 'M14 3l7 7M18 6l-6.5 6.5M11.5 12.5a4 4 0 0 0-5.7 0l-1.6 1.6a4 4 0 0 0 0 5.7 4 4 0 0 0 5.7 0l1.6-1.6a4 4 0 0 0 0-5.7zM8 16h.01',
  review: 'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7',
  new: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6',
  back: 'M15 18l-6-6 6-6',
  close: 'M6 6l12 12M18 6 6 18',
  sliders: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4',
};

export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg
      class="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
