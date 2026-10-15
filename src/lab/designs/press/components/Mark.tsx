import type { CSSProperties } from 'react'
import { MARK_BOX, MARK_CUT, MARK_PATHS, MARK_SEGMENTS } from '../lib/mark'

const ALL_SEGS = MARK_SEGMENTS.flatMap((poly, p) => poly.map((s) => ({ s, p })))
export const STROKE_COUNT = ALL_SEGS.length

const pad = 8
const VB = `${MARK_BOX.x - pad} ${MARK_BOX.y - pad} ${MARK_BOX.w + pad * 2} ${MARK_BOX.h + pad * 2}`

/** The mark engraved stroke by stroke on mount (time-based), then inked. */
export function EngravedMark({ className = '', delay = 900 }: { className?: string; delay?: number }) {
  return (
    <svg className={`pr-mark ${className}`} viewBox={VB} role="img" aria-label="DVM logo" style={{ '--d0': `${delay}ms`, '--n': STROKE_COUNT } as CSSProperties}>
      {MARK_PATHS.map((d, i) => (
        <path key={i} className="pr-mark-fill" d={d} />
      ))}
      {ALL_SEGS.map(({ s }, i) => (
        <line key={i} className="pr-mark-seg" x1={s[0]} y1={s[1]} x2={s[2]} y2={s[3]} pathLength={1} style={{ '--i': i } as CSSProperties} />
      ))}
    </svg>
  )
}

const PIECES = [
  { id: 'm', letter: 'M', poly: 0, clip: 'top' as const, name: 'The notch', note: 'Top of the inner ribbon: two stems and the fold that drops between them.' },
  { id: 'v', letter: 'V', poly: 0, clip: 'bottom' as const, name: 'The point', note: 'The same ribbon below the cut, narrowing to a single vertex.' },
  { id: 'd', letter: 'D', poly: 1, clip: null, name: 'The shell', note: 'The outer ribbon: a chevron underneath and the tall blade on the right.' },
]

/**
 * Fig. 2 on the home page. A sticky, scroll-driven sequence (CSS
 * animation-timeline: view()): the strokes are engraved one by one, the plate
 * is inked, a red cut line is scored, and the mark comes apart into D, V and M.
 */
export function SplitMark() {
  const n = STROKE_COUNT
  const range = (i: number) => {
    const a = 2 + (i / n) * 30
    return { '--rs': `${a.toFixed(2)}%`, '--re': `${(a + 30 / n + 1.5).toFixed(2)}%`, '--i': i } as CSSProperties
  }
  const segIndex = (poly: number, k: number) => (poly === 0 ? k : MARK_SEGMENTS[0].length + k)
  const xl = MARK_BOX.x - 40
  const wl = MARK_BOX.w + 80
  return (
    <section className="pr-split" aria-labelledby="pr-split-h">
      <div className="pr-split-sticky">
        <div className="pr-split-text">
          <p className="pr-kicker">Fig. 2</p>
          <h2 id="pr-split-h" className="pr-split-h">
            The mark, set by hand.
          </h2>
          <p className="pr-split-dek">
            {n} straight strokes, two ribbons, three letters. Keep scrolling and the press scores a cut through the inner ribbon and pulls the plate apart.
          </p>
          <ol className="pr-split-legend">
            {PIECES.map((p) => (
              <li key={p.id} className={`pr-legend-${p.id}`}>
                <span className="pr-legend-l" aria-hidden="true">
                  {p.letter}
                </span>
                <span>
                  <strong>{p.name}.</strong> {p.note}
                </span>
              </li>
            ))}
          </ol>
        </div>
        <svg className="pr-split-svg" viewBox="-660 -330 640 520" aria-hidden="true">
          <defs>
            <clipPath id="press-clip-top" clipPathUnits="userSpaceOnUse">
              <rect x={xl} y={MARK_BOX.y - 40} width={wl} height={MARK_CUT - MARK_BOX.y + 40} />
            </clipPath>
            <clipPath id="press-clip-bottom" clipPathUnits="userSpaceOnUse">
              <rect x={xl} y={MARK_CUT} width={wl} height={MARK_BOX.h + 40} />
            </clipPath>
          </defs>
          {/* registration marks */}
          <g className="pr-reg">
            {[
              [-630, -300],
              [-50, -300],
              [-630, 160],
              [-50, 160],
            ].map(([x, y], i) => (
              <g key={i} transform={`translate(${x} ${y})`}>
                <circle r="9" />
                <line x1="-15" x2="15" />
                <line y1="-15" y2="15" />
              </g>
            ))}
          </g>
          {PIECES.map((p) => (
            <g key={p.id} className={`pr-piece pr-piece-${p.id}`}>
              <g clipPath={p.clip ? `url(#press-clip-${p.clip})` : undefined}>
                <path className="pr-piece-fill" d={MARK_PATHS[p.poly]} />
                {MARK_SEGMENTS[p.poly].map((s, k) => (
                  <line key={k} className="pr-piece-seg" x1={s[0]} y1={s[1]} x2={s[2]} y2={s[3]} pathLength={1} style={range(segIndex(p.poly, k))} />
                ))}
              </g>
              <text className="pr-piece-letter" x={p.id === 'd' ? -196 : p.id === 'm' ? -604 : -580} y={p.id === 'd' ? 100 : p.id === 'm' ? -128 : 52}>
                {p.letter}
              </text>
            </g>
          ))}
          <line className="pr-cut" x1={xl - 30} x2={xl + wl + 30} y1={MARK_CUT} y2={MARK_CUT} pathLength={1} />
        </svg>
      </div>
    </section>
  )
}
