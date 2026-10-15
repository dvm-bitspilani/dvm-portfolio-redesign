import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fests, projects, site, verticals } from '../../../data'
import { designBase } from '../../registry'
import Mark from '../components/Mark'

const KIND: Record<string, string> = { website: 'Website', app: 'App', portal: 'Portal', video: 'Film' }
const base = designBase('fold')

function Page({ n, children, className = '' }: { n?: number; children: ReactNode; className?: string }) {
  return (
    <div className={`pg ${className}`}>
      <div className="pg__body">{children}</div>
      {n !== undefined && <span className="pg__num">{n}</span>}
    </div>
  )
}

export default function Project() {
  const { slug } = useParams()
  const idx = projects.findIndex((p) => p.slug === slug)
  const project = projects[idx]
  const [turned, setTurned] = useState(0)
  const [moving, setMoving] = useState(-1)

  useEffect(() => {
    setTurned(0)
  }, [slug])

  const leavesCount = 4
  const go = useCallback(
    (dir: 1 | -1) => {
      setTurned((t) => {
        const n = Math.min(leavesCount, Math.max(0, t + dir))
        if (n !== t) setMoving(dir > 0 ? t : n)
        return n
      })
    },
    [leavesCount],
  )
  useEffect(() => {
    if (moving < 0) return
    const id = window.setTimeout(() => setMoving(-1), 950)
    return () => window.clearTimeout(id)
  }, [moving, turned])
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [go])

  if (!project) {
    return (
      <main id="fold-main" className="fold-page">
        <h1 className="fold-h1">This page was never folded</h1>
        <p className="fold-page__lede">
          There is no project at this address. <Link to={`${base}/work`}>Open the archive</Link> instead.
        </p>
      </main>
    )
  }

  const next = projects[(idx + 1) % projects.length]
  const fest = fests.find((f) => f.id === project.fest)
  const festText = project.festContext ?? fest?.blurb
  const rest = project.description && project.summary ? project.description.replace(project.summary, '').trim() : project.description
  const shot = project.gallery?.[0]
  const teams = project.verticals.map((v) => verticals.find((x) => x.id === v)?.name ?? v)
  const links = [
    project.links.live && { href: project.links.live, label: 'Visit the live site' },
    project.links.playStore && { href: project.links.playStore, label: 'Get it on Google Play' },
    project.links.youtube && { href: project.links.youtube, label: 'Watch on YouTube' },
  ].filter(Boolean) as { href: string; label: string }[]

  const leaves: { front: ReactNode; back: ReactNode }[] = [
    {
      front: (
        <Page className="pg--cover">
          <Mark className="pg__stamp" />
          <p className="pg__eyebrow">
            {fest?.name ?? project.fest}
            {project.year ? `, ${project.year}` : ''}
          </p>
          <h1 className="pg__title">{project.title}</h1>
          {project.subtitle && <p className="pg__sub">{project.subtitle}</p>}
          {project.theme && <p className="pg__sub">Theme: {project.theme}</p>}
          <p className="pg__foot">
            {KIND[project.kind]} by the {site.fullName}
          </p>
        </Page>
      ),
      back: (
        <Page n={2}>
          <h2 className="pg__h">The project</h2>
          {project.summary ? <p className="pg__lead">{project.summary}</p> : <p className="pg__lead">{project.title}, made for {project.fest}.</p>}
          {rest && <p className="pg__text">{rest}</p>}
          {project.date && <p className="pg__meta">Released {project.date}</p>}
        </Page>
      ),
    },
    {
      front: (
        <Page n={3} className="pg--plate">
          {project.cover ? (
            <figure className="pg__plate">
              <img src={project.cover} alt={`${project.title} cover`} />
              <figcaption>{project.title}</figcaption>
            </figure>
          ) : project.mockup ? (
            <figure className="pg__plate">
              <img src={project.mockup} alt={`${project.title} mockup`} />
              <figcaption>{project.title}</figcaption>
            </figure>
          ) : (
            <div className="pg__empty">
              <Mark className="pg__stamp pg__stamp--big" />
              <p>No image survives for this one.</p>
            </div>
          )}
        </Page>
      ),
      back: (
        <Page n={4}>
          <h2 className="pg__h">The fest</h2>
          {festText ? <p className="pg__text pg__text--serif">{festText}</p> : <p className="pg__text">Made on campus, for BITS Pilani.</p>}
          {fest?.website && (
            <a className="pg__link" href={fest.website} target="_blank" rel="noreferrer">
              {fest.name} website
            </a>
          )}
        </Page>
      ),
    },
    {
      front: (
        <Page n={5} className="pg--plate">
          {shot ? (
            <div className="pg__scroll" tabIndex={0} aria-label="Full page screenshot, scrollable">
              <img src={shot} alt={`${project.title}, full page`} loading="lazy" />
            </div>
          ) : project.mockup && project.cover ? (
            <figure className="pg__plate">
              <img src={project.mockup} alt={`${project.title} on devices`} loading="lazy" />
              <figcaption>On devices</figcaption>
            </figure>
          ) : project.youtubeId ? (
            <a className="pg__film" href={project.links.youtube} target="_blank" rel="noreferrer">
              <img src={project.cover ?? `https://i.ytimg.com/vi/${project.youtubeId}/hqdefault.jpg`} alt="" loading="lazy" />
              <span>Play the film on YouTube</span>
            </a>
          ) : (
            <div className="pg__empty">
              <p className="pg__lead">{project.tags.join(', ')}</p>
            </div>
          )}
        </Page>
      ),
      back: (
        <Page n={6}>
          <h2 className="pg__h">Made by</h2>
          <ul className="pg__list">
            {teams.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          {links.length > 0 && (
            <>
              <h2 className="pg__h">Elsewhere</h2>
              <ul className="pg__list pg__list--links">
                {links.map((l) => (
                  <li key={l.href}>
                    <a href={l.href} target="_blank" rel="noreferrer">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Page>
      ),
    },
    {
      front: (
        <Page n={7}>
          <h2 className="pg__h">Next in the archive</h2>
          <Link to={`${base}/work/${next.slug}`} className="pg__next">
            {next.cover && <img src={next.cover} alt="" loading="lazy" />}
            <span className="pg__lead">{next.title}</span>
          </Link>
          {next.summary && <p className="pg__text">{next.summary}</p>}
          <p className="pg__meta">
            {KIND[next.kind]}, {next.fest}
            {next.year ? `, ${next.year}` : ''}
          </p>
          <Link to={`${base}/work`} className="pg__link pg__link--tight">
            Back to the archive
          </Link>
        </Page>
      ),
      back: (
        <Page className="pg--cover pg--backcover">
          <Mark className="pg__stamp" />
          <p className="pg__foot">{site.taglines.footer}</p>
        </Page>
      ),
    },
  ]

  const shift = turned === 0 ? -25 : turned === leaves.length ? 25 : 0

  return (
    <main id="fold-main" className="fold-page fold-bookpage">
      <p className="fold-crumb">
        <Link to={`${base}/work`}>The archive</Link> <span aria-hidden>/</span> {project.title}
      </p>
      <div className="book" aria-roledescription="booklet">
        <div className="book__inner" style={{ transform: `translateX(${shift}%)` }}>
          {leaves.map((leaf, i) => {
            const isTurned = i < turned
            const z = moving === i ? 50 : isTurned ? i + 1 : leaves.length - i
            return (
              <div
                key={i}
                className={`leaf${isTurned ? ' is-turned' : ''}`}
                style={{ zIndex: z }}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('a, [tabindex]')) return
                  go(isTurned ? -1 : 1)
                }}
              >
                <div className="leaf__face leaf__front">
                  {leaf.front}
                </div>
                <div className="leaf__face leaf__back">
                  {leaf.back}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div className="book__controls">
        <button type="button" className="fold-btn" onClick={() => go(-1)} disabled={turned === 0}>
          Previous page
        </button>
        <span aria-live="polite">
          {turned === 0 ? 'Cover' : turned === leaves.length ? 'Back cover' : `Pages ${turned * 2} and ${turned * 2 + 1}`}
        </span>
        <button type="button" className="fold-btn fold-btn--foil" onClick={() => go(1)} disabled={turned === leaves.length}>
          Turn the page
        </button>
      </div>
    </main>
  )
}
