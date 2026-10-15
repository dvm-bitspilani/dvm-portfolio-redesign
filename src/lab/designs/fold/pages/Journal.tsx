import { useMemo } from 'react'
import { artworks, blogs } from '../../../data'
import { mulberry } from '../lib/paper'

export default function Journal() {
  const posts = useMemo(() => [...blogs].sort((a, b) => b.isoDate.localeCompare(a.isoDate)), [])
  const prints = useMemo(() => [...artworks].sort((a, b) => b.date.localeCompare(a.date)), [])
  const rnd = useMemo(() => mulberry(42), [])
  const tilts = useMemo(() => posts.map(() => (rnd() - 0.5) * 3), [posts, rnd])
  const shifts = useMemo(() => posts.map(() => (rnd() - 0.5) * 5), [posts, rnd])

  return (
    <main id="fold-main" className="fold-page fold-journal">
      <header className="fold-page__head">
        <h1 className="fold-h1">Notes and prints</h1>
        <p className="fold-page__lede">
          What the team wrote down after the fests ended, and what they made in between. Pull a slip to read the essay.
        </p>
      </header>

      <section aria-labelledby="j-notes" className="fold-slips-wrap">
        <h2 id="j-notes" className="fold-h2">
          Notes
        </h2>
        <ol className="fold-slips">
          {posts.map((b, i) => (
            <li key={b.slug} className="slip" style={{ ['--tilt' as string]: `${tilts[i].toFixed(2)}deg`, ['--shift' as string]: `${shifts[i].toFixed(1)}%` }}>
              <a href={b.url} target="_blank" rel="noreferrer" className="slip__paper">
                <span className="slip__date">
                  <time dateTime={b.isoDate}>{b.date}</time>
                </span>
                <span className="slip__main">
                  <span className="slip__title">{b.title}</span>
                  <span className="slip__excerpt">{b.excerpt}</span>
                  <span className="slip__by">
                    {b.authors.join(' and ')}, {b.readMinutes} min read on {b.platform}
                  </span>
                </span>
                <span className="slip__photo">
                  <img src={b.cover} alt="" loading="lazy" />
                </span>
              </a>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="j-prints" className="fold-prints-wrap">
        <h2 id="j-prints" className="fold-h2">
          Prints
        </h2>
        <p className="fold-page__lede">{artworks.length} pieces from the department’s artists, mounted on black card.</p>
        <ul className="fold-prints">
          {prints.map((a) => (
            <li key={a.slug} className="print">
              <a href={a.links.artwork ?? a.links.portfolio ?? '#'} target="_blank" rel="noreferrer">
                <span className="print__mount">
                  <img src={a.image} alt={a.title} loading="lazy" />
                  <span className="print__corner" aria-hidden />
                </span>
                <span className="print__cap">
                  <span className="print__title">{a.title}</span>
                  <span className="print__by">
                    {a.artist}, {a.year}
                    {a.platform ? ` on ${a.platform}` : ''}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
