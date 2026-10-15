import { useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { artworks, blogs, socials, type Blog } from '../../../data'
import { Footer, HoloImage, PageHead } from '../ui/Bits'
import { Scramble } from '../ui/Scramble'

const logs = [...blogs].sort((a, b) => b.isoDate.localeCompare(a.isoDate))
const frames = [...artworks].sort((a, b) => b.date.localeCompare(a.date))

export default function Journal() {
  const [hover, setHover] = useState<Blog | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  const onMove = (e: RPointerEvent) => {
    const el = previewRef.current
    if (el) el.style.transform = `translate3d(${e.clientX + 28}px, ${e.clientY - 90}px, 0)`
  }

  return (
    <main className="holo-page holo-journal">
      <PageHead title="Journal" index={`${blogs.length} logs, ${artworks.length} recovered frames`}>
        <p>Field notes our engineers and designers wrote after each fest, and the renders and illustrations the crew makes between them.</p>
      </PageHead>

      <section className="holo-section holo-logs" aria-labelledby="holo-logs-title">
        <header className="holo-section__head">
          <Scramble as="h2" text="Data logs" className="holo-h2" />
          <p className="holo-section__note" id="holo-logs-title">
            Written by the crew, hosted on Medium and the BITS ACM blog
          </p>
        </header>
        <ol className="holo-loglist" onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
          {logs.map((b) => (
            <li key={b.slug}>
              <a
                href={b.url}
                target="_blank"
                rel="noreferrer"
                className="holo-log"
                onPointerEnter={() => setHover(b)}
                onFocus={() => setHover(null)}
              >
                <time dateTime={b.isoDate} className="holo-log__date">
                  {b.isoDate}
                </time>
                <span className="holo-log__main">
                  <span className="holo-log__title">{b.title}</span>
                  <span className="holo-log__excerpt">{b.excerpt}</span>
                </span>
                <span className="holo-log__meta">
                  <span>{b.authors.join(', ')}</span>
                  <span>
                    {b.readMinutes} min on {b.platform}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ol>
        <div ref={previewRef} className={`holo-logpreview${hover ? ' is-on' : ''}`} aria-hidden="true">
          {hover && (
            <span key={hover.slug} className="holo-logpreview__inner">
              <HoloImage src={hover.cover} alt="" ratio="16 / 10" />
            </span>
          )}
        </div>
      </section>

      <section className="holo-section holo-art" aria-labelledby="holo-art-title">
        <header className="holo-section__head">
          <Scramble as="h2" text="Recovered frames" className="holo-h2" />
          <p className="holo-section__note" id="holo-art-title">
            Artwork by DVM members. Point at a frame to resolve it.
          </p>
        </header>
        <ul className="holo-artgrid">
          {frames.map((a) => (
            <li key={a.slug}>
              <a href={a.links.artwork ?? a.links.portfolio ?? '#'} target="_blank" rel="noreferrer" className="holo-artcard">
                <HoloImage src={a.image} alt={`${a.title} by ${a.artist}`} ratio="auto" />
                <span className="holo-artcard__cap">
                  <span className="holo-artcard__title">{a.title}</span>
                  <span className="holo-artcard__by">
                    {a.artist}, {a.year}
                    {a.platform ? ` on ${a.platform}` : ''}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>
      <Footer socials={socials} />
    </main>
  )
}
