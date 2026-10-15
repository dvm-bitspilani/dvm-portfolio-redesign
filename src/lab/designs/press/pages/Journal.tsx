import { useState } from 'react'
import { artworks, blogs, type Artwork, type Blog } from '../../../data'
import PageHead from '../components/PageHead'
import DitherImage from '../components/DitherImage'
import { roman } from '../lib/hooks'

const sorted = [...blogs].sort((a, b) => b.isoDate.localeCompare(a.isoDate))
const [lead, ...others] = [...sorted.filter((b) => b.featured), ...sorted.filter((b) => !b.featured)]
const side = others.slice(0, 3)
const rest = others.slice(3)

const byline = (b: Blog) => `By ${b.authors.join(' and ')}. ${b.date}, ${b.readMinutes} min read on ${b.platform}.`

function Story({ b, size }: { b: Blog; size: 'lead' | 'side' | 'col' }) {
  return (
    <article className={`pr-story pr-story-${size}`}>
      <p className="pr-kicker">{b.tags.join(', ')}</p>
      <h3 className="pr-story-h">
        <a href={b.url} target="_blank" rel="noreferrer">
          {size === 'lead' ? b.title : (b.shortTitle ?? b.title)}
        </a>
      </h3>
      {size !== 'side' && <DitherImage src={b.cover} alt={`Cover of ${b.title}`} algo={size === 'lead' ? 'atkinson' : 'floyd'} className={`pr-story-plate pr-story-plate-${size}`} radius={size === 'lead' ? 120 : 70} />}
      <p className="pr-byline">{byline(b)}</p>
      <div className={size === 'lead' ? 'pr-cols pr-dropcap' : 'pr-dropcap pr-dropcap-s'}>
        <p>{b.excerpt}</p>
      </div>
      <a className="pr-readon" href={b.url} target="_blank" rel="noreferrer">
        Continue reading on {b.platform}
      </a>
    </article>
  )
}

function Plate({ a, n }: { a: Artwork; n: number }) {
  const [ratio, setRatio] = useState(0.8)
  const href = a.links.artwork ?? a.links.portfolio
  return (
    <figure className="pr-plate">
      <DitherImage src={a.image} alt={`${a.title} by ${a.artist}`} algo="bayer" cell={2} radius={80} contrast={1.15} style={{ aspectRatio: String(ratio) }} onRatio={(r) => setRatio(Math.min(1.6, Math.max(0.55, r)))} className="pr-plate-img" />
      <figcaption className="pr-cap">
        <em>Pl. {roman(n)}.</em> {href ? <a href={href} target="_blank" rel="noreferrer">{a.title}</a> : a.title}, by {a.artist}, {a.year}.
      </figcaption>
    </figure>
  )
}

export default function Journal() {
  return (
    <main className="pr-page pr-journal">
      <div className="pr-wrap">
        <PageHead
          letter="C"
          section="Letters and plates"
          title="Journal"
          dek={`${blogs.length} dispatches written by members about how the fest software gets made, followed by ${artworks.length} plates from the art desk.`}
        />
        <section className="pr-broadsheet" aria-label="Writing">
          <div className="pr-bs-lead">{lead && <Story b={lead} size="lead" />}</div>
          <div className="pr-bs-side">
            {side.map((b) => (
              <Story key={b.slug} b={b} size="side" />
            ))}
          </div>
        </section>
        <section className="pr-bs-strip" aria-label="More writing">
          {rest.map((b) => (
            <Story key={b.slug} b={b} size="col" />
          ))}
        </section>

        <section className="pr-plates" aria-labelledby="pr-plates-h">
          <div className="pr-front-rule">
            <span>Supplement</span>
            <span id="pr-plates-h">Plates from the art desk</span>
            <span>Bayer 8×8, 1-bit</span>
          </div>
          <div className="pr-plates-grid">
            {artworks.map((a, i) => (
              <Plate key={a.slug} a={a} n={i + 1} />
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
