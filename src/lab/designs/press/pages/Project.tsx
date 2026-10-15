import { useParams } from 'react-router-dom'
import { fests, projects, verticals } from '../../../data'
import DitherImage from '../components/DitherImage'
import VTLink from '../components/VTLink'
import { href } from '../lib/vt'
import { pad } from '../lib/hooks'
import { KIND_LABEL, plateOf } from '../lib/content'

export default function Project() {
  const { slug } = useParams()
  const i = projects.findIndex((p) => p.slug === slug)
  if (i < 0)
    return (
      <main className="pr-page pr-wrap pr-missing">
        <h1 data-vt-title>No such entry</h1>
        <p>
          The archive has no project filed under “{slug}”. <VTLink to={href('work')}>Return to the index of work.</VTLink>
        </p>
      </main>
    )
  const p = projects[i]
  const prev = projects[(i - 1 + projects.length) % projects.length]
  const next = projects[(i + 1) % projects.length]
  const plate = plateOf(p)
  const fest = fests.find((f) => f.id === p.fest)
  const desks = p.verticals.map((v) => verticals.find((x) => x.id === v)?.label ?? v)
  const body = p.description ?? p.summary ?? fest?.blurb ?? ''
  const story = body === p.summary ? [] : body.split(/(?<=\.)\s+(?=[A-Z])/).reduce<string[]>((acc, s, k) => {
    // regroup sentences into short paragraphs of ~3 sentences
    if (k % 3 === 0) acc.push(s)
    else acc[acc.length - 1] += ' ' + s
    return acc
  }, [])
  const links = [
    p.links.live && { href: p.links.live, label: 'Visit the live site' },
    p.links.playStore && { href: p.links.playStore, label: 'Open on Google Play' },
    p.links.youtube && { href: p.links.youtube, label: 'Watch on YouTube' },
  ].filter(Boolean) as { href: string; label: string }[]

  return (
    <main className="pr-page pr-article">
      <div className="pr-wrap">
        <div className="pr-head-rule">
          <span>Section A, entry {pad(i + 1, 3)} of {projects.length}</span>
          <span>{p.fest}</span>
          <span>{p.date ?? p.year ?? 'Undated'}</span>
        </div>
        <header className="pr-art-head">
          <p className="pr-kicker">
            {KIND_LABEL[p.kind]} for {p.fest === 'Campus' ? 'campus' : p.fest}
            {p.theme ? `, themed “${p.theme}”` : ''}
          </p>
          <h1 className="pr-art-title">
            <span data-vt-title>{p.title}</span>
          </h1>
          {p.subtitle && <p className="pr-art-sub">{p.subtitle}</p>}
          {p.summary && <p className="pr-art-dek">{p.summary}</p>}
          <p className="pr-byline">
            Filed by the {desks.join(', ')} {desks.length > 1 ? 'teams' : 'team'}. {p.date ?? p.year}.
          </p>
        </header>

        {plate && (
          <figure className="pr-art-fig">
            <DitherImage src={plate} alt={`${p.title}, lead image`} className="pr-art-plate" focusY={0.15} radius={140} cell={2} />
            <figcaption className="pr-cap pr-cap-rot">
              <em>Fig. A{pad(i + 1, 3)}.</em> 1-bit Atkinson plate. Hover to un-dither, hold still to develop.
            </figcaption>
          </figure>
        )}

        <div className="pr-art-body">
          <div>
          <div className="pr-cols pr-cols-3 pr-dropcap">
            {(story.length ? story : [body]).map((s, k) => (
              <p key={k}>{s}</p>
            ))}
            {p.youtubeId && (
              <p>
                <a className="pr-inline" href={p.links.youtube} target="_blank" rel="noreferrer">
                  The film is on YouTube.
                </a>
              </p>
            )}
          </div>
          {p.theme && (
            <blockquote className="pr-pull">
              <p>“{p.theme}”</p>
              <cite>
                The theme of {p.fest} {p.year}.
              </cite>
            </blockquote>
          )}
          </div>
          <aside className="pr-factbox" aria-label="Fact box">
            <h2>On file</h2>
            <dl>
              <div>
                <dt>Fest</dt>
                <dd>{p.fest}</dd>
              </div>
              <div>
                <dt>Kind</dt>
                <dd>{KIND_LABEL[p.kind]}</dd>
              </div>
              {p.theme && (
                <div>
                  <dt>Theme</dt>
                  <dd>{p.theme}</dd>
                </div>
              )}
              <div>
                <dt>Teams</dt>
                <dd>{desks.join(', ')}</dd>
              </div>
              {p.date && (
                <div>
                  <dt>Date</dt>
                  <dd>{p.date}</dd>
                </div>
              )}
            </dl>
            {links.length > 0 && (
              <ul className="pr-art-links">
                {links.map((l) => (
                  <li key={l.href}>
                    <a href={l.href} target="_blank" rel="noreferrer">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {fest && p.festContext && (
              <>
                <h3>About {fest.name}</h3>
                <p className="pr-factbox-blurb">{fest.blurb}</p>
              </>
            )}
          </aside>
        </div>

        {(p.gallery?.length || p.mobileGallery?.length || (p.mockup && p.mockup !== plate)) && (
          <section className="pr-proofs" aria-label="Proofs">
            <h2 className="pr-proofs-h">Proofs</h2>
            <div className="pr-proofs-row">
              {p.mockup && p.mockup !== plate && (
                <figure>
                  <DitherImage src={p.mockup} alt={`${p.title} device mockup`} algo="floyd" className="pr-proof pr-proof-wide" radius={90} />
                  <figcaption className="pr-cap">Mockup.</figcaption>
                </figure>
              )}
              {p.gallery?.map((g, k) => (
                <figure key={g}>
                  <DitherImage src={g} alt={`${p.title} page ${k + 1}`} algo="bayer" className="pr-proof pr-proof-tall" focusY={0} radius={90} />
                  <figcaption className="pr-cap">Desktop proof {k + 1}.</figcaption>
                </figure>
              ))}
              {p.mobileGallery?.map((g, k) => (
                <figure key={g}>
                  <DitherImage src={g} alt={`${p.title} mobile page ${k + 1}`} algo="bayer" className="pr-proof pr-proof-phone" focusY={0} radius={70} />
                  <figcaption className="pr-cap">Mobile proof {k + 1}.</figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        <nav className="pr-art-nav" aria-label="More entries">
          <VTLink to={href(`work/${prev.slug}`)} className="pr-art-prev">
            <span className="pr-kicker">Previous entry</span>
            <span className="pr-art-nav-t" data-vt-source>{prev.title}</span>
          </VTLink>
          <VTLink to={href('work')} className="pr-art-index">
            <span className="pr-kicker">Back to</span>
            <span className="pr-art-nav-t">the index</span>
          </VTLink>
          <VTLink to={href(`work/${next.slug}`)} className="pr-art-next">
            <span className="pr-kicker">Next entry</span>
            <span className="pr-art-nav-t" data-vt-source>{next.title}</span>
          </VTLink>
        </nav>
      </div>
    </main>
  )
}
