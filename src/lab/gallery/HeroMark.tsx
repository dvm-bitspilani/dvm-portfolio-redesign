import { useEffect, useRef } from 'react'
import { LOGO_PATHS, LOGO_TRANSFORM, LOGO_VIEWBOX } from '../shared/logo'

export interface Strand {
  slug: string
  accent: string
  live: boolean
}

/**
 * The DVM mark with one outline "strand" per concept fanned out behind it.
 * The fan follows the pointer (CSS variables + a CSS transition, no RAF);
 * `active` lifts one strand and dims the rest.
 */
export default function HeroMark({ strands, active }: { strands: Strand[]; active: string | null }) {
  const ref = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const svg = ref.current
    if (!svg || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const r = svg.getBoundingClientRect()
        const mx = Math.max(-1.5, Math.min(1.5, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2)))
        const my = Math.max(-1.5, Math.min(1.5, (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2)))
        svg.style.setProperty('--mx', mx.toFixed(3))
        svg.style.setProperty('--my', my.toFixed(3))
      })
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
    }
  }, [])

  const n = strands.length
  const transform = `translate(${LOGO_TRANSFORM.x} ${LOGO_TRANSFORM.y})`

  return (
    <svg
      ref={ref}
      className={`lab-mark${active ? ' has-active' : ''}`}
      viewBox={`-30 -10 ${LOGO_VIEWBOX + 60} ${LOGO_VIEWBOX + 20}`}
      role="img"
      aria-label="DVM logo"
    >
      {strands.map((s, i) => (
        <g
          key={s.slug}
          className={`lab-mark__strand${s.live ? '' : ' is-pending'}${active === s.slug ? ' is-active' : ''}`}
          style={{ ['--k' as string]: (i - (n - 1) / 2).toFixed(2), ['--c' as string]: s.accent }}
        >
          <g transform={transform}>
            {LOGO_PATHS.map((d, j) => (
              <path key={j} d={d} />
            ))}
          </g>
        </g>
      ))}
      <g className="lab-mark__solid" transform={transform}>
        {LOGO_PATHS.map((d, j) => (
          <path key={j} d={d} />
        ))}
      </g>
    </svg>
  )
}

/** Small static logo for the top bar. */
export function MiniMark() {
  return (
    <svg className="lab-minimark" viewBox={`55 15 265 345`} aria-hidden="true">
      <g transform={`translate(${LOGO_TRANSFORM.x} ${LOGO_TRANSFORM.y})`}>
        {LOGO_PATHS.map((d, j) => (
          <path key={j} d={d} />
        ))}
      </g>
    </svg>
  )
}
