import { useRef } from 'preact/hooks';
import { DOUBLE_INLAYS, type FretPos, type GuitarString, INLAYS, STRINGS } from '../theory/guitar';
import { useWidth } from './useWidth';

export interface FretMark {
  pos: FretPos;
  kind: 'ok' | 'bad' | 'hint' | 'root' | 'note' | 'target';
  label?: string;
}

interface Props {
  maxFret: number;
  marks?: FretMark[];
  onTap?: (pos: FretPos) => void;
  /** Corde in gioco: le altre sono attenuate. */
  activeStrings?: GuitarString[];
  /** Corda evidenziata (es. "trova il Re sulla 5ª"). */
  focusString?: GuitarString;
}

/**
 * Manico disegnato in SVG. Orizzontale sugli schermi larghi (cantino in alto, come nelle tab),
 * verticale sul telefono (Mi basso a sinistra, capotasto in alto, come nei diagrammi degli accordi).
 */
export function Fretboard({ maxFret, marks = [], onTap, activeStrings = STRINGS, focusString }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const width = useWidth(ref);
  const vertical = width > 0 && width < 560;

  const g = vertical
    ? { open: 34, fret: 40, decay: 0.975, margin: 24, spacing: 44, labels: 22, r: 14 }
    : { open: 44, fret: 66, decay: 0.965, margin: 20, spacing: 30, labels: 20, r: 11 };

  // Posizioni lungo il manico.
  const lines: number[] = [g.open];
  for (let f = 1; f <= maxFret; f++) lines.push(lines[f - 1] + g.fret * Math.pow(g.decay, f - 1));
  const center = (f: number) => (f === 0 ? g.open / 2 : (lines[f - 1] + lines[f]) / 2);
  const length = lines[maxFret] + 10;

  // Posizioni trasversali.
  const idx = (s: GuitarString) => (vertical ? 6 - s : s - 1);
  const across = (s: GuitarString) => g.margin + idx(s) * g.spacing;
  const acrossMid = (a: number, b: number) => (a + b) / 2;
  const breadth = g.margin * 2 + 5 * g.spacing;
  const labelAt = breadth + g.labels / 2;

  const pt = (along: number, acr: number) => (vertical ? { x: acr, y: along } : { x: along, y: acr });
  const W = vertical ? breadth + g.labels : length;
  const H = vertical ? length : breadth + g.labels;

  const line = (a1: number, c1: number, a2: number, c2: number, cls: string, sw: number, key: string) => {
    const p = pt(a1, c1), q = pt(a2, c2);
    return <line key={key} x1={p.x} y1={p.y} x2={q.x} y2={q.y} class={cls} stroke-width={sw} />;
  };

  const first = across(vertical ? 6 : 1), last = across(vertical ? 1 : 6);
  const inlayAcross = acrossMid(across(3), across(4));

  return (
    <div class="fretboard" ref={ref}>
      {width > 0 && (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Manico della chitarra">
          {/* pallini */}
          {INLAYS.filter((f) => f <= maxFret).map((f) => {
            const p = pt(center(f), inlayAcross);
            return <circle key={`i${f}`} cx={p.x} cy={p.y} r={5} class="fb-inlay" />;
          })}
          {DOUBLE_INLAYS.filter((f) => f <= maxFret).flatMap((f) =>
            [acrossMid(across(2), across(3)), acrossMid(across(4), across(5))].map((c, i) => {
              const p = pt(center(f), c);
              return <circle key={`d${f}${i}`} cx={p.x} cy={p.y} r={5} class="fb-inlay" />;
            }),
          )}
          {/* tasti e capotasto */}
          {lines.map((a, f) => line(a, first, a, last, f === 0 ? 'fb-nut' : 'fb-fret', f === 0 ? 5 : 1.5, `f${f}`))}
          {/* corde */}
          {STRINGS.map((s) =>
            line(
              2,
              across(s),
              length,
              across(s),
              `fb-string ${activeStrings.includes(s) ? '' : 'fb-dim'} ${focusString === s ? 'fb-focus' : ''}`,
              focusString === s ? 3.2 : 0.8 + (s - 1) * 0.35,
              `s${s}`,
            ),
          )}
          {/* numeri dei tasti */}
          {[...INLAYS, ...DOUBLE_INLAYS]
            .filter((f) => f <= maxFret)
            .map((f) => {
              const p = pt(center(f), labelAt);
              return (
                <text key={`n${f}`} x={p.x} y={p.y} class="fb-num" dominant-baseline="middle" text-anchor="middle">
                  {f}
                </text>
              );
            })}
          {/* zone cliccabili */}
          {onTap &&
            activeStrings.flatMap((s) =>
              Array.from({ length: maxFret + 1 }, (_, f) => {
                const a0 = f === 0 ? 0 : lines[f - 1];
                const a1 = lines[f];
                const c0 = across(s) - g.spacing / 2;
                const p = pt(a0, c0);
                const size = vertical
                  ? { width: g.spacing, height: a1 - a0 }
                  : { width: a1 - a0, height: g.spacing };
                return (
                  <rect
                    key={`t${s}-${f}`}
                    x={p.x}
                    y={p.y}
                    {...size}
                    class="fb-cell"
                    data-pos={`${s}-${f}`}
                    onClick={() => onTap({ string: s, fret: f })}
                  />
                );
              }),
            )}
          {/* segni */}
          {marks.map((m, i) => {
            const p = pt(center(m.pos.fret), across(m.pos.string));
            return (
              <g key={`m${i}`} class={`fb-mark fb-${m.kind}`}>
                <circle cx={p.x} cy={p.y} r={g.r} />
                {m.label && (
                  <text x={p.x} y={p.y} dominant-baseline="central" text-anchor="middle">
                    {m.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
