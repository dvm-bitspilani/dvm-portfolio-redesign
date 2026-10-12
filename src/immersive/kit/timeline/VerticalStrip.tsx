import { useEffect, useId, useRef } from 'react'
import EntryLink from './EntryLink'
import { entryKey, stopLabel } from './data'
import type { FoldTimelineProps, FoldTimelineStop, FoldTimelineTone } from './types'
import css from './FoldTimeline.module.css'

/* The two ribbons of the DVM mark (same paths as src/immersive/shared/logo.ts, inlined so this
   fallback never pulls three.js into the page). */
const MARK = [
  'M-470.31-189.24V-37.4l106.28,75.91l99.96-75.91v-151.83l-95.53,72.75l-55.04-37.33l-0.63,36.06l55.04,35.43l69.59-51.25v77.19l-72.75,56.3l-70.86-49.97l-1.26-120.84L-470.31-189.24z',
  'M-467.26-11.82l100.58,70.55l114.59-86.03v-177l32.31-22.9v212.9L-370.95,99.58l-99.36-72.4V-11.2L-467.26-11.82z',
]

interface Props {
  stops: FoldTimelineStop[]
  tone: FoldTimelineTone
  title?: string
  intro?: React.ReactNode
  reduced: boolean
  maxEntries: number
  onSelect?: FoldTimelineProps['onSelect']
  onActiveChange?: FoldTimelineProps['onActiveChange']
  scrollRef: React.RefObject<(i: number) => void>
}

/**
 * Narrow screens, reduced motion and no-WebGL: the same strip, running down the
 * page. The folded mark sits at its head; each stop is foil-stamped along the paper
 * with its entries hanging off a thread to the side.
 */
export default function VerticalStrip({ stops, tone, title, intro, reduced, onSelect, onActiveChange, scrollRef }: Props) {
  const root = useRef<HTMLElement>(null)
  const items = useRef<(HTMLLIElement | null)[]>([])
  const gid = useId().replace(/:/g, '')

  scrollRef.current = (i: number) => {
    items.current[i]?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
  }

  // foil catches the light as the strip moves past (one CSS variable, rAF-throttled)
  useEffect(() => {
    const el = root.current
    if (!el || reduced) return
    let raf = 0
    const read = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      el.style.setProperty('--imm-tl-sheen', (-r.top / Math.max(1, window.innerHeight)).toFixed(3))
    }
    const on = () => {
      if (!raf) raf = requestAnimationFrame(read)
    }
    read()
    window.addEventListener('scroll', on, { passive: true, capture: true })
    window.addEventListener('resize', on)
    return () => {
      window.removeEventListener('scroll', on, { capture: true })
      window.removeEventListener('resize', on)
      cancelAnimationFrame(raf)
    }
  }, [reduced])

  // which stop is in the middle of the screen
  useEffect(() => {
    if (!onActiveChange) return
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) {
          if (!e.isIntersecting) continue
          const i = items.current.indexOf(e.target as HTMLLIElement)
          if (i >= 0) onActiveChange(i, stops[i])
        }
      },
      { rootMargin: '-45% 0px -45% 0px' },
    )
    items.current.forEach((el) => el && io.observe(el))
    return () => io.disconnect()
  }, [stops, onActiveChange])

  return (
    <section ref={root} className={css.v} data-tone={tone} data-reduced={reduced || undefined} aria-label={title ?? 'Timeline'}>
      <svg width="0" height="0" aria-hidden className={css.sr}>
        <defs>
          <linearGradient id={`${gid}-foil`} x1="0" y1="0" x2="1" y2="1">
            {tone === 'copper' ? (
              <>
                <stop offset="0" stopColor="#9a4220" />
                <stop offset="0.3" stopColor="#ff6a3d" />
                <stop offset="0.48" stopColor="#ffcfae" />
                <stop offset="0.62" stopColor="#e5804c" />
                <stop offset="1" stopColor="#8a3818" />
              </>
            ) : (
              <>
                <stop offset="0" stopColor="#13606f" />
                <stop offset="0.3" stopColor="#45e6ff" />
                <stop offset="0.48" stopColor="#effdff" />
                <stop offset="0.62" stopColor="#5fd4e6" />
                <stop offset="1" stopColor="#0f4d5a" />
              </>
            )}
          </linearGradient>
        </defs>
      </svg>

      <header className={css.vHead}>
        <div className={css.vHeadPaper} aria-hidden>
          <svg className={css.vMark} viewBox="62 23 252 328">
            <g transform="translate(532.998 251)" fill={`url(#${gid}-foil)`}>
              {MARK.map((d) => (
                <path key={d} d={d} />
              ))}
            </g>
          </svg>
        </div>
        <div className={css.vHeadText}>
          {intro ?? (title ? <h2 className={css.vTitle}>{title}</h2> : null)}
        </div>
      </header>

      <ol className={css.vList}>
        {stops.map((s, i) => {
          const label = stopLabel(s)
          return (
            <li key={`${s.year}-${i}`} className={css.vStop} ref={(el) => void (items.current[i] = el)}>
              <div className={css.vPaper} data-crease={i % 2 ? 'mountain' : 'valley'} aria-hidden>
                <span className={css.vYear}>{label}</span>
              </div>
              <div className={css.vBody}>
                <h3 className={css.vLabel}>
                  <span className={css.sr}>{label}</span>
                  <small>
                    {s.entries.length} {s.entries.length === 1 ? 'entry' : 'entries'}
                  </small>
                </h3>
                <ul className={css.vEntries}>
                  {s.entries.map((e, j) => (
                    <li key={entryKey(e, j)}>
                      <EntryLink entry={e} stop={s} onSelect={onSelect} className={css.capLink} />
                      {e.kind && <small>{e.kind}</small>}
                    </li>
                  ))}
                </ul>
                {s.note && <p className={css.capNote}>{s.note}</p>}
              </div>
            </li>
          )
        })}
      </ol>
      <div className={css.vTail} aria-hidden>
        <div className={css.vTailPaper} />
        <p>Made by DVM</p>
      </div>
    </section>
  )
}
