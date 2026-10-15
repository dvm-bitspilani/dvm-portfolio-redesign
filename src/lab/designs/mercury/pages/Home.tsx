import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { projects, site, verticals } from '../../../data'
import MercuryHero, { STAGE_NAMES } from '../MercuryHero'
import LiquidLens, { useLens } from '../ui/LiquidLens'
import Footer from '../ui/Footer'
import { BASE } from '../ui/Nav'

const featured = projects.filter((p) => p.featured)
const more = projects.filter((p) => !p.featured && p.kind !== 'video' && p.cover).slice(0, 3)
const builds = projects.filter((p) => p.kind !== 'video').length

export default function Home() {
  const scope = useRef<HTMLElement>(null)
  const [stage, setStage] = useState(0)
  const lens = useLens()

  return (
    <main id="merc-main" className="merc-home" ref={scope}>
      <MercuryHero scope={scope} onStage={setStage} />
      <LiquidLens controller={lens} />

      <div className={`merc-material${stage > 2 ? ' is-hidden' : ''}`} aria-hidden="true">
        {STAGE_NAMES.map((n, i) => (
          <span key={n} className={i === stage ? 'is-on' : undefined}>
            {n}
          </span>
        ))}
      </div>

      <section className="merc-s merc-s--hero" data-stage="0" aria-labelledby="merc-h1">
        <h1 id="merc-h1" className="merc-display" data-mbackdrop>
          <span data-line>Department of</span>
          <span data-line>Visual Media</span>
        </h1>
        <div className="merc-hero__foot">
          <p className="merc-lede">
            The websites, apps and films behind BITS&nbsp;Pilani’s three fests: BOSM, Oasis and APOGEE.
          </p>
          <p className="merc-hint">
            <span className="merc-hint__bead" aria-hidden="true" />
            Bring the cursor to the mark to pull the mercury. Click to drop a bead.
          </p>
        </div>
      </section>

      <section className="merc-s merc-s--glass" data-stage="1" aria-labelledby="merc-about">
        <h2 id="merc-about" className="merc-display merc-display--xl" data-mbackdrop>
          <span data-line>{site.headline}</span>
        </h2>
        <div className="merc-about">
          <p className="merc-about__big">{site.about[0]}</p>
          <p>{site.about[1]}</p>
          <p>
            {site.about[2]} {site.about[3]}
          </p>
          <p className="merc-about__fig">
            <span className="merc-chrome">5000+</span> people on our apps each fest. <span className="merc-chrome">{builds}</span> websites, apps and portals shipped.
          </p>
        </div>
      </section>

      <section className="merc-s merc-s--xray" data-stage="2" aria-labelledby="merc-teams">
        <h2 className="merc-display merc-display--tag" data-mbackdrop aria-label={site.taglines.redesignHero}>
          <span data-line>Code. Design.</span>
          <span data-line>Animate.</span>
        </h2>
        <div className="merc-teams">
          <h3 id="merc-teams" className="merc-kicker">
            Five teams under the surface
          </h3>
          <ul>
            {verticals.map((v) => (
              <li key={v.id}>
                <h4>{v.name}</h4>
                <p>{v.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="merc-s merc-s--work" data-stage="3" aria-labelledby="merc-work">
        <div className="merc-work-head">
          <h2 id="merc-work" className="merc-h2">
            Selected work
          </h2>
          <Link to={`${BASE}/work`} className="merc-textlink">
            All {projects.length} projects
          </Link>
        </div>
        <ul className="merc-rows">
          {[...featured, ...more].map((p) => (
            <li key={p.slug}>
              <Link to={`${BASE}/work/${p.slug}`} className="merc-row" {...lens.bind(() => ({ src: p.cover, mode: 'cover' }))}>
                <span className="merc-row__title">{p.title}</span>
                <span className="merc-row__meta">
                  {p.fest} {p.year ?? ''}
                </span>
                <span className="merc-row__kind">{p.kind}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <Footer />
    </main>
  )
}
