import { lazy, Suspense, useRef } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { fests, projects, socials, verticals } from '../../../data'
import { useActive, useReducedMotion } from '../scene/common'
import { Footer } from '../ui/Bits'
import { Scramble } from '../ui/Scramble'

const Projection = lazy(() => import('../scene/Projection'))
const sorted = [...projects].sort((a, b) => (b.year ?? 0) - (a.year ?? 0))

export default function ProjectDetail() {
  const { slug } = useParams()
  const idx = sorted.findIndex((p) => p.slug === slug)
  const bayRef = useRef<HTMLDivElement>(null)
  const live = useActive(bayRef)
  const reduced = useReducedMotion()
  if (idx < 0) return <Navigate to=".." relative="path" replace />
  const p = sorted[idx]
  const prev = sorted[(idx - 1 + sorted.length) % sorted.length]
  const next = sorted[(idx + 1) % sorted.length]
  const fest = fests.find((f) => f.id === p.fest)
  const img = p.mockup ?? p.cover
  const body = p.description && p.description !== p.summary ? p.description : undefined

  return (
    <main className="holo-page holo-dossier">
      <header className="holo-dossier__head">
        <p className="holo-dossier__crumb">
          <Link to=".." relative="path">Work</Link>
          <span aria-hidden="true">/</span>
          <span>{p.fest}</span>
          <span aria-hidden="true">/</span>
          <span>{p.kind}</span>
        </p>
        <Scramble as="h1" text={p.title} className="holo-dossier__title" key={p.slug} />
        {p.subtitle && <p className="holo-dossier__subtitle">{p.subtitle}</p>}
      </header>

      <div className="holo-dossier__grid">
        <div className="holo-dossier__bay" ref={bayRef}>
          <Suspense fallback={<div className="holo-stage__boot">Warming the projector</div>}>
            <Projection
              src={img}
              fallbackTitle={p.title}
              aspect={1.7}
              reduced={reduced}
              frameloop={live ? 'always' : 'never'}
              container={bayRef}
            />
          </Suspense>
          <p className="holo-dossier__baynote" aria-hidden="true">
            Point at the projection to resolve it
          </p>
        </div>

        <article className="holo-dossier__file">
          {p.summary && <p className="holo-dossier__summary">{p.summary}</p>}
          {body && <p>{body}</p>}
          <dl className="holo-facts">
            <div>
              <dt>Fest</dt>
              <dd>{fest?.name ?? p.fest}</dd>
            </div>
            <div>
              <dt>Shipped</dt>
              <dd>{p.date ?? p.year ?? 'Undated'}</dd>
            </div>
            <div>
              <dt>Kind</dt>
              <dd>{p.kind}</dd>
            </div>
            {p.theme && (
              <div>
                <dt>Theme</dt>
                <dd>{p.theme}</dd>
              </div>
            )}
            <div>
              <dt>Teams</dt>
              <dd>{p.verticals.map((v) => verticals.find((x) => x.id === v)?.label ?? v).join(', ')}</dd>
            </div>
          </dl>
          <div className="holo-dossier__links">
            {p.links.live && (
              <a className="holo-btn" href={p.links.live} target="_blank" rel="noreferrer">
                Visit the live site
              </a>
            )}
            {p.links.playStore && (
              <a className="holo-btn" href={p.links.playStore} target="_blank" rel="noreferrer">
                Open on Google Play
              </a>
            )}
            {p.links.youtube && (
              <a className="holo-btn" href={p.links.youtube} target="_blank" rel="noreferrer">
                Watch on YouTube
              </a>
            )}
          </div>
          {(p.festContext ?? fest?.blurb) && (
            <details className="holo-dossier__fest">
              <summary>About {fest?.name ?? p.fest}</summary>
              <p>{p.festContext ?? fest?.blurb}</p>
            </details>
          )}
        </article>
      </div>

      {p.youtubeId && (
        <section className="holo-section holo-frames" aria-label="Film">
          <div className="holo-video">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${p.youtubeId}`}
              title={p.title}
              loading="lazy"
              allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </section>
      )}

      {(p.gallery?.length || p.mobileGallery?.length) && (
        <section className="holo-section holo-frames" aria-labelledby="holo-frames-title">
          <header className="holo-section__head">
            <h2 id="holo-frames-title" className="holo-h2">
              Captured frames
            </h2>
            <p className="holo-section__note">Full-page captures, scroll inside each frame</p>
          </header>
          <div className="holo-frames__row">
            {p.gallery?.map((g, i) => (
              <figure key={g} className="holo-frame is-desktop" tabIndex={0}>
                <img src={g} alt={`${p.title}, desktop page ${i + 1}`} loading="lazy" />
              </figure>
            ))}
            {p.mobileGallery?.map((g, i) => (
              <figure key={g} className="holo-frame is-mobile" tabIndex={0}>
                <img src={g} alt={`${p.title}, mobile page ${i + 1}`} loading="lazy" />
              </figure>
            ))}
          </div>
        </section>
      )}

      <nav className="holo-dossier__pager" aria-label="More projects">
        <Link to={`../${prev.slug}`} relative="path">
          <span>Previous</span>
          {prev.title}
        </Link>
        <Link to={`../${next.slug}`} relative="path">
          <span>Next</span>
          {next.title}
        </Link>
      </nav>
      <Footer socials={socials} />
    </main>
  )
}
