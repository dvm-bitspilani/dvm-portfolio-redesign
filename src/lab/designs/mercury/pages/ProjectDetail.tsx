import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { projects, verticals } from '../../../data'
import DripImage from '../ui/DripImage'
import Footer from '../ui/Footer'
import { BASE } from '../ui/Nav'

const vname = (id: string) => verticals.find((v) => v.id === id)?.label ?? id

export default function ProjectDetail() {
  const { slug } = useParams()
  const idx = projects.findIndex((p) => p.slug === slug)
  const p = projects[idx]
  const [play, setPlay] = useState(false)

  if (!p) {
    return (
      <main id="merc-main" className="merc-page merc-detail">
        <h1 className="merc-h2">That project isn’t in the archive.</h1>
        <p>
          <Link className="merc-textlink" to={`${BASE}/work`}>
            Browse all {projects.length} projects
          </Link>
        </p>
      </main>
    )
  }
  const next = projects[(idx + 1) % projects.length]
  const body = p.description && p.description !== p.summary ? p.description.replace(p.summary ?? '', '').trim() : ''

  return (
    <main id="merc-main" className="merc-page merc-detail" key={p.slug}>
      <Link to={`${BASE}/work`} className="merc-back">
        Back to work
      </Link>
      <header className="merc-detail__head">
        <h1 className="merc-display merc-display--detail">
          <span data-line>{p.title}</span>
        </h1>
        {p.subtitle && <p className="merc-detail__sub">{p.subtitle}</p>}
      </header>

      {p.kind === 'video' && p.youtubeId && play ? (
        <div className="merc-detail__video">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${p.youtubeId}?autoplay=1&rel=0`}
            title={p.title}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="merc-detail__cover">
          <DripImage src={p.cover ?? p.mockup} alt={`${p.title} cover`} />
          {p.kind === 'video' && p.youtubeId && (
            <button type="button" className="merc-play" onClick={() => setPlay(true)}>
              <span className="merc-play__bead" aria-hidden="true" />
              Play the film
            </button>
          )}
        </div>
      )}

      <div className="merc-detail__grid">
        <dl className="merc-facts">
          <div>
            <dt>Fest</dt>
            <dd>{p.fest === 'Campus' ? 'BITS Pilani campus' : p.fest}</dd>
          </div>
          {p.date && (
            <div>
              <dt>Shipped</dt>
              <dd>{p.date}</dd>
            </div>
          )}
          {p.theme && (
            <div>
              <dt>Theme</dt>
              <dd>{p.theme}</dd>
            </div>
          )}
          {p.verticals.length > 0 && (
            <div>
              <dt>Teams</dt>
              <dd>{p.verticals.map(vname).join(', ')}</dd>
            </div>
          )}
          {(p.links.live || p.links.playStore || p.links.youtube) && (
            <div>
              <dt>Links</dt>
              <dd className="merc-facts__links">
                {p.links.live && (
                  <a href={p.links.live} target="_blank" rel="noreferrer">
                    Visit the site
                  </a>
                )}
                {p.links.playStore && (
                  <a href={p.links.playStore} target="_blank" rel="noreferrer">
                    Play Store
                  </a>
                )}
                {p.links.youtube && (
                  <a href={p.links.youtube} target="_blank" rel="noreferrer">
                    Watch on YouTube
                  </a>
                )}
              </dd>
            </div>
          )}
        </dl>
        <div className="merc-detail__text">
          {p.summary && <p className="merc-detail__summary">{p.summary}</p>}
          {body && <p>{body}</p>}
          {p.festContext && <p className="merc-detail__context">{p.festContext}</p>}
        </div>
      </div>

      {(p.mockup || p.gallery?.length || p.mobileGallery?.length) && (
        <section className="merc-shots" aria-label="Screens">
          {p.mockup && p.cover && <img className="merc-shots__mockup" src={p.mockup} alt={`${p.title} on devices`} loading="lazy" />}
          <div className="merc-shots__row">
            {p.gallery?.map((g, i) => (
              <figure key={g} className="merc-shots__desk">
                <div className="merc-shots__scroll">
                  <img src={g} alt={`${p.title}, desktop page ${i + 1}`} loading="lazy" />
                </div>
              </figure>
            ))}
            {p.mobileGallery?.map((g, i) => (
              <figure key={g} className="merc-shots__phone">
                <div className="merc-shots__scroll">
                  <img src={g} alt={`${p.title}, mobile page ${i + 1}`} loading="lazy" />
                </div>
              </figure>
            ))}
          </div>
        </section>
      )}

      <Link to={`${BASE}/work/${next.slug}`} className="merc-next">
        <span className="merc-next__label">Next project</span>
        <span className="merc-next__title">{next.title}</span>
      </Link>
      <Footer />
    </main>
  )
}
