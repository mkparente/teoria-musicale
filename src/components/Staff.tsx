import { useEffect, useRef } from 'preact/hooks';
import { Accidental, Annotation, AnnotationVerticalJustify, Formatter, Renderer, Stave, StaveNote } from 'vexflow/bravura';
import { type Note, vexAccidental, vexKey } from '../theory/notes';
import { accidentalInKey, vexKeySpec } from '../theory/scales';
import { useWidth } from './useWidth';

export interface StaffNote {
  note: Note;
  color?: string;
  label?: string;
}

interface Props {
  notes: StaffNote[];
  /** Armatura: positivo = diesis, negativo = bemolli. */
  keySig?: number;
  /** Chiave di violino con l'8 sotto, come si scrive per chitarra. */
  guitar?: boolean;
  /** Ingrandimento rispetto alla misura standard di VexFlow. */
  zoom?: number;
  /** Larghezza massima del rigo in pixel. */
  maxWidth?: number;
  /** Note sovrapposte in un unico accordo invece che una dopo l'altra (vanno date dal basso). */
  chord?: boolean;
}

const fontsReady = typeof document !== 'undefined' ? document.fonts.load('30px Bravura') : Promise.resolve();

export function Staff({ notes, keySig = 0, guitar = false, zoom = 1.5, maxWidth = 640, chord = false }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const width = Math.min(useWidth(ref), maxWidth);

  useEffect(() => {
    const el = ref.current;
    if (!el || width === 0) return;
    let cancelled = false;
    fontsReady.then(() => {
      if (cancelled) return;
      el.innerHTML = '';
      const w = width / zoom;
      const h = 150;
      const renderer = new Renderer(el, Renderer.Backends.SVG);
      renderer.resize(w, h);
      const ctx = renderer.getContext();
      const style = getComputedStyle(el);
      const color = style.color;
      // VexFlow scrive i colori come attributi SVG, che non capiscono var(--...).
      const resolve = (c: string) => (c.startsWith('var(') ? style.getPropertyValue(c.slice(4, -1)).trim() : c);
      ctx.setFillStyle(color);
      ctx.setStrokeStyle(color);

      const stave = new Stave(4, 28, w - 8);
      stave.addClef('treble', 'default', guitar ? '8vb' : undefined);
      if (keySig !== 0) stave.addKeySignature(vexKeySpec(keySig));
      stave.setContext(ctx).draw();

      const needsAcc = (note: Note) => note.acc !== accidentalInKey(note.letter, keySig);
      const accOf = (note: Note) => new Accidental(vexAccidental(note.acc) ?? 'n');

      if (chord && notes.length) {
        const sn = new StaveNote({ keys: notes.map((n) => vexKey(n.note)), duration: 'w', clef: 'treble' });
        notes.forEach(({ note, color: c }, i) => {
          if (needsAcc(note)) sn.addModifier(accOf(note), i);
          if (c) sn.setKeyStyle(i, { fillStyle: resolve(c), strokeStyle: resolve(c) });
        });
        Formatter.FormatAndDraw(ctx, stave, [sn]);
      } else if (notes.length) {
        const vexNotes = notes.map(({ note, color: c, label }) => {
          const sn = new StaveNote({ keys: [vexKey(note)], duration: 'w', clef: 'treble' });
          if (needsAcc(note)) sn.addModifier(accOf(note), 0);
          if (label) {
            sn.addModifier(
              new Annotation(label)
                .setFont('system-ui, Segoe UI, Roboto, sans-serif', 10)
                .setVerticalJustification(AnnotationVerticalJustify.BOTTOM),
              0,
            );
          }
          if (c) sn.setStyle({ fillStyle: resolve(c), strokeStyle: resolve(c) });
          return sn;
        });
        Formatter.FormatAndDraw(ctx, stave, vexNotes);
      }

      const svg = el.querySelector('svg')!;
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      // VexFlow fissa la misura nello stile in linea: la si sostituisce con quella ingrandita.
      svg.style.width = `${width}px`;
      svg.style.height = `${h * zoom}px`;
    });
    return () => {
      cancelled = true;
    };
  }, [width, zoom, keySig, guitar, chord, JSON.stringify(notes)]);

  return <div class="staff" ref={ref} />;
}
