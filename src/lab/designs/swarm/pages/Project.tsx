import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fests, projects, verticals } from '../../../data'
import { regions } from '../engine/director'
import { showFormation, useDirector } from '../engine/formations'
import { projectShape } from './Work'

const KIND_LABEL = { website: 'Website', app: 'App', portal: 'Portal', video: 'Film' } as const

export default function ProjectPage() {
  const { slug } = useParams()
  const d = useDirector()
  const idx = projects.findIndex((p) => p.slug === slug)
  const p = idx >= 0 ? projects[idx] : null

  useEffect(() => {
    if (!p) return
    d.parallax = 0.25
    const cancel = showFormation(d, projectShape(p), { region: regions.rightTall, fill: 0.96, sway: 0.12 }, { kick: 0.8 })
    d.driver = () => {
      d.alpha = window.scrollY > window.innerHeight * 0.55 ? 0.28 : 1
    }
    return () => {
      cancel()
      d.driver = null
      d.alpha = 1
    }
  }, [d, p])

  if (!p) {
    return (
      <div className="sw-page">
        <h1 className="sw-display sw-display--page">Not in the archive</h1>
        <p className="sw-lede">There is no project at this address.</p>
        <Link className="sw-arrowlink" to=".." relative="path">
          Back to all work
        </Link>
      </div>
    )
  }

  const next = projects[(idx + 1) % projects.length]
  const fest = fests.find((f) => f.id === p.fest)
  const teamNames = p.verticals.map((v) => verticals.find((x) => x.id === v)?.label ?? v)
  const media = [p.mockup, ...(p.gallery ?? []), ...(p.mobileGallery ?? [])].filter((x): x is string => !!x)

  return (
    <article className="sw-page sw-project">
      <header className="sw-project__head">
        <Link className="sw-back" to=".." relative="path">
          All work
        </Link>
        <h1 className="sw-display sw-display--project">{p.title}</h1>
        {p.subtitle && <p className="sw-lede">{p.subtitle}</p>}
        <dl className="sw-meta">
          <div>
            <dt>Fest</dt>
            <dd>{p.fest}</dd>
          </div>
          {p.date && (
            <div>
              <dt>Shipped</dt>
              <dd>{p.date}</dd>
            </div>
          )}
          <div>
            <dt>Type</dt>
            <dd>{KIND_LABEL[p.kind]}</dd>
          </div>
          <div>
            <dt>Teams</dt>
            <dd>{teamNames.join(', ')}</dd>
          </div>
          {p.theme && (
            <div>
              <dt>Theme</dt>
              <dd>{p.theme}</dd>
            </div>
          )}
        </dl>
        <p className="sw-body sw-body--wide">{p.description ?? p.summary ?? fest?.blurb}</p>
        <div className="sw-actions">
          {p.links.live && (
            <a className="sw-btn" href={p.links.live} target="_blank" rel="noreferrer">
              Visit the site
            </a>
          )}
          {p.links.playStore && (
            <a className="sw-btn" href={p.links.playStore} target="_blank" rel="noreferrer">
              Open on Google Play
            </a>
          )}
          {p.links.youtube && (
            <a className="sw-btn" href={p.links.youtube} target="_blank" rel="noreferrer">
              Watch on YouTube
            </a>
          )}
        </div>
      </header>

      {media.length > 0 && (
        <section className="sw-gallery" aria-label="Screens">
          {media.map((src) => (
            <img key={src} src={src} alt={`${p.title} screen`} loading="lazy" />
          ))}
        </section>
      )}

      {fest && p.festContext && (
        <section className="sw-festnote">
          <h2 className="sw-h3">About {fest.name}</h2>
          <p className="sw-body">{fest.blurb}</p>
        </section>
      )}

      <Link className="sw-next" to={`../${next.slug}`} relative="path">
        <span>Next</span>
        {next.title}
      </Link>
    </article>
  )
}
