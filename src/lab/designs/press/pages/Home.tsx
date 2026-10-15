import { useState } from 'react'
import { projects, site, stats, team, verticals } from '../../../data'
import Hero from '../components/Hero'
import { SplitMark } from '../components/Mark'
import DitherImage from '../components/DitherImage'
import VTLink from '../components/VTLink'
import { href } from '../lib/vt'

// lead = newest featured site; then the next three builds and one film, one per fest where possible
const builds = projects.filter((p) => p.cover && p.kind !== 'video')
const ranked = [...builds.filter((p) => p.featured), ...builds.filter((p) => !p.featured)]
const featured = ranked.reduce<typeof ranked>((acc, p) => {
  if (acc.length < 4 && (acc.length === 0 || !acc.some((q) => q.fest === p.fest))) acc.push(p)
  return acc
}, [])
for (const p of ranked) if (featured.length < 4 && !featured.includes(p)) featured.push(p)
const films = projects.filter((p) => p.featured && p.kind === 'video' && p.cover).slice(0, 1)
const FIGURES = stats.filter((s) => ['users on our apps and websites', 'teams', 'websites, apps & portals in the archive', 'teasers, promos & curtain raisers', 'members on record', 'batches'].includes(s.label))

function FrontPage() {
  return (
    <section className="pr-front pr-wrap" aria-labelledby="pr-front-h">
      <div className="pr-front-rule">
        <span>Page 2</span>
        <span>About us</span>
      </div>
      <h2 id="pr-front-h" className="pr-front-h">
        {site.headline}.
      </h2>
      <div className="pr-front-body">
        <div className="pr-cols pr-dropcap">
          {site.about.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <aside className="pr-figures" aria-label="DVM in figures">
          <h3>In figures</h3>
          <dl>
            {FIGURES.map((s) => (
              <div key={s.label} className="pr-fig-row">
                <dt>{s.label}</dt>
                <dd>{s.display}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>
    </section>
  )
}

function SelectedWork() {
  const [lead, ...rest] = featured
  const [hot, setHot] = useState<string | null>(null)
  if (!lead) return null
  return (
    <section className="pr-sel pr-wrap" aria-labelledby="pr-sel-h">
      <div className="pr-front-rule">
        <span>Page 3</span>
        <span id="pr-sel-h">Selected projects</span>
        <VTLink to={href('work')} className="pr-more">
          All {projects.length} entries in Section A
        </VTLink>
      </div>
      <article className="pr-sel-lead" onPointerEnter={() => setHot(lead.slug)} onPointerLeave={() => setHot(null)}>
        <VTLink to={href(`work/${lead.slug}`)} className="pr-sel-link" onFocus={() => setHot(lead.slug)} onBlur={() => setHot(null)}>
          <DitherImage src={lead.cover!} alt={`${lead.title} cover`} className="pr-sel-plate" focusY={0.2} radius={120} />
          <div className="pr-sel-text">
            <p className="pr-kicker">
              {lead.fest}, {lead.date ?? lead.year}
            </p>
            <h3 className="pr-sel-h">
              <span data-vt-source>{lead.title}</span>
            </h3>
            <p className="pr-sel-sum">{lead.summary}</p>
            <p className="pr-cap">
              <em>Plate.</em> {hot === lead.slug ? 'Hold still to develop the plate.' : 'Atkinson dither, 1-bit. Hover to un-dither.'}
            </p>
          </div>
        </VTLink>
      </article>
      <div className="pr-sel-row">
        {[...rest, ...films].map((p, i) => (
          <article key={p.slug} className="pr-sel-item">
            <VTLink to={href(`work/${p.slug}`)} className="pr-sel-link">
              <DitherImage src={p.cover!} alt={`${p.title} cover`} algo={i % 2 ? 'bayer' : 'atkinson'} className="pr-sel-plate-s" focusY={0.25} radius={70} />
              <p className="pr-kicker">
                {p.kind === 'video' ? 'Film' : p.fest}, {p.year}
              </p>
              <h3 className="pr-sel-hs">
                <span data-vt-source>{p.title}</span>
              </h3>
            </VTLink>
          </article>
        ))}
      </div>
    </section>
  )
}

function Desks() {
  return (
    <section className="pr-desks pr-wrap" aria-labelledby="pr-desks-h">
      <div className="pr-front-rule">
        <span>Page 4</span>
        <span id="pr-desks-h">The five teams</span>
      </div>
      <ul className="pr-desk-list">
        {verticals.map((v) => {
          const n = team.filter((m) => m.vertical === v.id).length
          return (
            <li key={v.id} className="pr-desk">
              <VTLink to={href('team')} className="pr-desk-a">
                <span className="pr-desk-name">{v.label}</span>
              </VTLink>
              <div className="pr-desk-meta">
                <p className="pr-desk-count">
                  <strong>{n}</strong> members on record
                </p>
                <p className="pr-desk-desc">{v.description}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default function Home() {
  return (
    <main className="pr-page pr-home">
      <Hero />
      <SplitMark />
      <FrontPage />
      <SelectedWork />
      <Desks />
    </main>
  )
}
