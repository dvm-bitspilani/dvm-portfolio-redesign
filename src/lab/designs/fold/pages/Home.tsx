import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { projects, site, socials, team, verticals } from '../../../data'
import { buildTimeline } from '../lib/timeline'
import type { StageState } from '../hero/stage'
import Scene from '../hero/Scene'
import FoldCard from '../components/FoldCard'
import Fold from '../components/Fold'
import { useCoarsePointer, usePrefersReducedMotion } from '../components/hooks'

export default function Home() {
  const reduced = usePrefersReducedMotion()
  const coarse = useCoarsePointer()
  const timeline = useMemo(() => buildTimeline(), [])
  const stage = useRef<StageState>({
    progress: 0,
    reduced,
    coarse,
    introDone: false,
    captions: [],
    timeline,
    hero: null,
    hint: null,
    touched: false,
  })
  stage.current.reduced = reduced
  stage.current.coarse = coarse

  const section = useRef<HTMLElement>(null)
  const [active, setActive] = useState(true)
  const [webgl] = useState(() => {
    try {
      const c = document.createElement('canvas')
      return !!c.getContext('webgl2')
    } catch {
      return false
    }
  })

  // scroll progress through the pinned stage
  useEffect(() => {
    const el = section.current
    if (!el) return
    let raf = 0
    const read = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      const span = Math.max(1, r.height - window.innerHeight)
      stage.current.progress = Math.min(1, Math.max(0, -r.top / span))
    }
    const on = () => {
      if (!raf) raf = requestAnimationFrame(read)
    }
    read()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    return () => {
      window.removeEventListener('scroll', on)
      window.removeEventListener('resize', on)
      cancelAnimationFrame(raf)
    }
  }, [])

  // pause the canvas when the stage is off screen or the tab is hidden
  useEffect(() => {
    const el = section.current
    if (!el) return
    let visible = true
    const sync = () => setActive(visible && !document.hidden)
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      sync()
    })
    io.observe(el)
    document.addEventListener('visibilitychange', sync)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', sync)
    }
  }, [])

  const featured = projects.filter((p) => p.featured)
  const counts = useMemo(() => {
    const m = new Map<string, number>()
    for (const t of team) m.set(t.vertical, (m.get(t.vertical) ?? 0) + 1)
    return m
  }, [])

  const showStage = webgl
  const stageHeight = reduced || !showStage ? undefined : '600vh'

  return (
    <main id="fold-main" className="fold-home">
      <section ref={section} className={`fold-stage${reduced ? ' is-static' : ''}`} style={{ height: stageHeight }} aria-label="Introduction">
        <div className="fold-stage__pin">
          {showStage && <Scene stage={stage} active={active} />}
          {!showStage && <div className="fold-stage__fallback" />}
          <div className="fold-hero" ref={(e) => void (stage.current.hero = e)}>
            <p className="fold-hero__kicker">
              {site.fullName}, {site.institution}
            </p>
            <h1 className="fold-hero__title">
              <span>We are</span>
              <span>DVM</span>
            </h1>
            <p className="fold-hero__lede">{site.about[0]}</p>
            <div className="fold-hero__actions">
              <Link to="work" className="fold-btn fold-btn--foil">
                See the work
              </Link>
              {!reduced && showStage && (
                <button
                  type="button"
                  className="fold-btn"
                  onClick={() => {
                    const el = section.current
                    if (el) window.scrollTo({ top: el.offsetTop + window.innerHeight * 1.7, behavior: 'smooth' })
                  }}
                >
                  Unfold the archive
                </button>
              )}
            </div>
          </div>
          {showStage && !reduced && !coarse && (
            <p className="fold-hint" ref={(e) => void (stage.current.hint = e)}>
              Grab the paper and throw it. It folds itself back.
            </p>
          )}
          {showStage && !reduced && (
            <div className="fold-captions" aria-label="Timeline">
              {timeline.map((y, i) => (
                <div key={y.year} className="fold-cap" ref={(e) => void (stage.current.captions[i] = e)}>
                  <h3 className="fold-cap__year">{y.year}</h3>
                  <ul>
                    {y.items.slice(0, 7).map((it) =>
                      it.external ? (
                        <li key={it.label}>
                          <a href={it.to} target="_blank" rel="noreferrer">
                            {it.label}
                          </a>
                          <small>{it.kind}</small>
                        </li>
                      ) : (
                        <li key={it.label}>
                          <Link to={it.to}>{it.label}</Link>
                          <small>{it.kind}</small>
                        </li>
                      ),
                    )}
                    {y.items.length > 7 && (
                      <li className="fold-cap__more">
                        <Link to="work">and {y.items.length - 7} more from {y.year}</Link>
                      </li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {(reduced || !showStage) && (
        <section className="fold-section fold-timeline-list" aria-labelledby="fold-tl">
          <h2 id="fold-tl" className="fold-h2">
            The archive, year by year
          </h2>
          <ol>
            {timeline.map((y) => (
              <li key={y.year}>
                <span className="fold-foil">{y.year}</span>
                <p>{y.items.map((i) => i.label).join(', ')}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="fold-section fold-about" aria-labelledby="fold-about-h">
        <div className="fold-about__col">
          <h2 id="fold-about-h" className="fold-h2">
            Three fests, five teams, one department.
          </h2>
          {site.about.slice(1).map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
        <div className="fold-about__teams">
          {verticals.map((v, i) => (
            <Fold key={v.id} index={i} title={v.name} meta={`${counts.get(v.id) ?? 0} members on record`}>
              <p>{v.description}</p>
              <Link to={`team#${v.id}`}>Meet the {v.label.toLowerCase()} team</Link>
            </Fold>
          ))}
        </div>
      </section>

      <section className="fold-section fold-featured" aria-labelledby="fold-feat-h">
        <header className="fold-section__head">
          <h2 id="fold-feat-h" className="fold-h2">
            Selected work
          </h2>
          <Link to="work" className="fold-link">
            All {projects.length} pieces
          </Link>
        </header>
        <ul className="fold-cards">
          {featured.map((p) => (
            <li key={p.slug}>
              <FoldCard project={p} />
            </li>
          ))}
        </ul>
      </section>

      <footer className="fold-footer">
        <p className="fold-footer__oath">{site.taglines.mischief}</p>
        <div className="fold-footer__row">
          <ul>
            {socials.map((s) => (
              <li key={s.id}>
                <a href={s.url} target="_blank" rel="noreferrer">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
          <p>{site.taglines.footer}</p>
        </div>
      </footer>
    </main>
  )
}
