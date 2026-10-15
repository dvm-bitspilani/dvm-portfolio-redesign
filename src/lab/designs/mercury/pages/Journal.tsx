import { useRef } from 'react'
import { artworks, blogs, type Artwork } from '../../../data'
import LiquidLens, { useLens } from '../ui/LiquidLens'
import Footer from '../ui/Footer'

const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
const posts = [...blogs].sort((a, b) => b.isoDate.localeCompare(a.isoDate))
const arts = [...artworks].sort((a, b) => b.date.localeCompare(a.date))

function Art({ a, lens }: { a: Artwork; lens: ReturnType<typeof useLens> }) {
  const img = useRef<HTMLImageElement>(null)
  const href = a.links.artwork ?? a.links.portfolio
  const inner = (
    <>
      <span className="merc-art__frame" {...lens.bind(() => ({ src: a.image, mode: 'loupe', el: img.current }))}>
        <img ref={img} src={a.image} alt={`${a.title} by ${a.artist}`} loading="lazy" decoding="async" />
      </span>
      <span className="merc-art__cap">
        <span className="merc-art__title">{a.title}</span>
        <span className="merc-art__by">
          {a.artist}, {a.year}
        </span>
      </span>
    </>
  )
  return (
    <li className="merc-art">
      {href ? (
        <a href={href} target="_blank" rel="noreferrer">
          {inner}
        </a>
      ) : (
        inner
      )}
    </li>
  )
}

export default function Journal() {
  const lens = useLens()
  return (
    <main id="merc-main" className="merc-page merc-journal">
      <LiquidLens controller={lens} />
      {/* Liquid hover: turbulence-displaced titles. One filter, animated with SMIL. */}
      <svg className="merc-svgdefs" aria-hidden="true" focusable="false">
        <filter id="merc-liquid" x="-5%" y="-30%" width="110%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.06" numOctaves="2" seed="4" result="n">
            <animate attributeName="baseFrequency" dur="6s" values="0.012 0.06;0.018 0.09;0.012 0.06" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="n" scale="9" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      <header className="merc-page__head">
        <h1 className="merc-display merc-display--page">
          <span data-line>Journal</span>
        </h1>
        <p className="merc-page__intro">
          Write-ups from the people who built the fests, and the artwork they make between them.
        </p>
      </header>

      <section aria-labelledby="merc-posts" className="merc-posts">
        <h2 id="merc-posts" className="merc-section-label">
          Writing
        </h2>
        <ul className="merc-rows merc-rows--posts">
          {posts.map((b) => (
            <li key={b.slug}>
              <a
                href={b.url}
                target="_blank"
                rel="noreferrer"
                className="merc-post"
                {...lens.bind(() => ({ src: b.cover, mode: 'cover' }))}
              >
                <span className="merc-post__date">{fmt(b.isoDate)}</span>
                <span className="merc-post__body">
                  <span className="merc-post__title">{b.shortTitle ?? b.title}</span>
                  <span className="merc-post__mirror" aria-hidden="true">
                    {b.shortTitle ?? b.title}
                  </span>
                  <span className="merc-post__excerpt">{b.excerpt}</span>
                </span>
                <span className="merc-post__meta">
                  {b.authors.join(', ')}
                  <br />
                  {b.readMinutes} min on {b.platform}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="merc-arts" className="merc-arts">
        <h2 id="merc-arts" className="merc-section-label">
          Artwork
        </h2>
        <ul className="merc-art-grid">
          {arts.map((a) => (
            <Art key={a.slug} a={a} lens={lens} />
          ))}
        </ul>
      </section>
      <Footer />
    </main>
  )
}
