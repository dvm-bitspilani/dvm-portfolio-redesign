import { useCallback, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { Link } from 'react-router-dom'
import { featuredProjects, projects, projectsByVertical, site, socials, stats, teamByVertical, verticals } from '../../../data'
import HeroCanvas, { LABEL_ANCHORS, type HeroOverlayRefs, type HeroPhase } from '../scene/HeroScene'
import { useActive, useIsNarrow, useReducedMotion } from '../scene/common'
import { Scramble } from '../ui/Scramble'
import { Footer, HoloImage } from '../ui/Bits'

const PHASE_COPY: Record<HeroPhase, { status: string; log: string[] }> = {
  boot: { status: 'Acquiring carrier', log: ['projector 01 online', 'lens calibrated', 'resolving mark'] },
  live: { status: 'Signal locked', log: ['projector 01 online', 'lens calibrated', 'mark resolved'] },
  loss: { status: 'Signal dropping', log: ['carrier unstable', 'frame sync lost'] },
  static: { status: 'No signal', log: ['carrier lost', 'rebooting projector'] },
}

export default function Home() {
  const heroRef = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const narrow = useIsNarrow()
  const active = useActive(heroRef)
  const [phase, setPhase] = useState<HeroPhase>('boot')
  const kick = useRef<(() => void) | null>(null)
  const lock = useRef(-1)
  const [locked, setLocked] = useState(-1)

  const overlay = useRef<HeroOverlayRefs>({
    labels: { current: [] },
    lines: { current: [] },
    dots: { current: [] },
    telemetry: { current: {} },
    reticle: { current: null },
  }).current

  const onPhase = useCallback((p: HeroPhase) => setPhase(p), [])
  const setLock = (i: number) => {
    lock.current = i
    setLocked(i)
  }

  const onHeroDown = (e: RPointerEvent) => {
    if ((e.target as HTMLElement).closest('a, button')) return
    if (e.button !== 0) return
    kick.current?.()
  }

  const ordered = LABEL_ANCHORS.map((a) => verticals.find((v) => v.id === a.id)!)
  const copy = PHASE_COPY[phase]
  const tl = overlay.telemetry.current

  return (
    <main className="holo-home">
      <section
        ref={heroRef}
        className={`holo-hero is-${phase}${locked >= 0 ? ' is-locked' : ''}`}
        onPointerDown={onHeroDown}
        aria-labelledby="holo-hero-title"
      >
        <HeroCanvas
          active={active}
          reduced={reduced}
          narrow={narrow}
          overlay={overlay}
          container={heroRef}
          onPhase={onPhase}
          kick={kick}
          lock={lock}
        />

        <div className="holo-reticle" ref={(el) => void (overlay.reticle.current = el)} aria-hidden="true">
          <i />
          <i />
        </div>

        <svg className="holo-leaders" aria-hidden="true">
          {LABEL_ANCHORS.map((a, i) => (
            <g key={a.id} className={locked === i ? 'is-on' : undefined}>
              <polyline ref={(el) => void (overlay.lines.current[i] = el)} points="0,0" />
              <circle ref={(el) => void (overlay.dots.current[i] = el)} r={3} />
            </g>
          ))}
        </svg>

        <ul className="holo-tags" aria-label="Our five teams">
          {ordered.map((v, i) => {
            const right = LABEL_ANCHORS[i].offset[0] > 0
            return (
              <li key={v.id}>
                <Link
                  to={`team?v=${v.id}`}
                  ref={(el) => void (overlay.labels.current[i] = el)}
                  className={`holo-tag${right ? ' is-right' : ''}${locked === i ? ' is-on' : ''}`}
                  onPointerEnter={() => setLock(i)}
                  onPointerLeave={() => setLock(-1)}
                  onFocus={() => setLock(i)}
                  onBlur={() => setLock(-1)}
                >
                  <span className="holo-tag__inner">
                    <span className="holo-tag__name">{v.label}</span>
                    <span className="holo-tag__meta">
                      {teamByVertical(v.id).length} members, {projectsByVertical(v.id).length} projects
                    </span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>

        <div className="holo-hero__status" role="status" aria-live="polite">
          <span className="holo-dot" aria-hidden="true" />
          <span>{copy.status}</span>
          <ol aria-hidden="true">
            {copy.log.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ol>
        </div>

        <div className="holo-hero__copy">
          <p className="holo-hero__kicker">{site.fullName}, {site.institution}</p>
          <h1 id="holo-hero-title" className="holo-hero__title">
            We are <span className="holo-hero__dvm">DVM</span>
          </h1>
          <p className="holo-hero__lede">
            We build the websites, apps and films behind BOSM, Oasis and APOGEE, the three fests of BITS Pilani.
          </p>
        </div>

        <aside className="holo-telemetry" aria-hidden="true">
          <dl>
            <div>
              <dt>Scan</dt>
              <dd ref={(el) => void (tl.scan = el)}>+0.000</dd>
            </div>
            <div>
              <dt>Yaw</dt>
              <dd ref={(el) => void (tl.yaw = el)}>0.0°</dd>
            </div>
            <div>
              <dt>Glitch</dt>
              <dd ref={(el) => void (tl.glitch = el)}>0.00</dd>
            </div>
            <div>
              <dt>Frame</dt>
              <dd ref={(el) => void (tl.fps = el)}>60</dd>
            </div>
          </dl>
          <div className="holo-telemetry__carrier">
            <span>Carrier</span>
            <b ref={(el) => void (tl.carrier = el)}>98.0%</b>
            <i>
              <em ref={(el) => void (tl.bar = el)} />
            </i>
          </div>
        </aside>

        <p className="holo-hero__hint" aria-hidden="true">
          {reduced ? 'Motion reduced. Hover a team to scan it.' : 'Move to scan. Move fast to tear. Click to cut the signal.'}
        </p>
      </section>

      <section className="holo-section holo-about" aria-labelledby="holo-about-title">
        <header className="holo-section__head">
          <Scramble as="h2" text="Transmission" className="holo-h2" />
          <p className="holo-section__note">From the lab, verbatim</p>
        </header>
        <div className="holo-about__grid">
          <p id="holo-about-title" className="holo-about__lead">
            {site.about[0]}
          </p>
          <div className="holo-about__rest">
            {site.about.slice(1).map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
          <ul className="holo-readout" aria-label="DVM in numbers">
            {stats
              .filter((s) => ['users on our apps and websites', 'fests: BOSM, Oasis & APOGEE', 'teams', 'members on record', 'teasers, promos & curtain raisers'].includes(s.label))
              .map((s) => (
                <li key={s.label}>
                  <b>{s.display}</b>
                  <span>{s.label}</span>
                </li>
              ))}
          </ul>
        </div>
      </section>

      <section className="holo-section holo-featured" aria-labelledby="holo-featured-title">
        <header className="holo-section__head">
          <Scramble as="h2" text="Selected projections" className="holo-h2" />
          <Link to="work" className="holo-textlink">
            Browse all {projects.length} projects
          </Link>
        </header>
        <ul className="holo-featured__list" id="holo-featured-title">
          {featuredProjects.map((p) => (
            <li key={p.slug}>
              <Link to={`work/${p.slug}`} className="holo-fcard">
                <HoloImage src={p.cover ?? p.mockup} alt="" label={p.title} />
                <span className="holo-fcard__meta">
                  <span>{p.fest}</span>
                  <span>{p.date ?? p.year}</span>
                  <span>{p.kind}</span>
                </span>
                <span className="holo-fcard__title">{p.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <Footer socials={socials} />
    </main>
  )
}
