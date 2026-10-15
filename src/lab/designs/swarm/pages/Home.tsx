import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { artworks, blogs, fests, projects, site, team, verticals } from '../../../data'
import { regions, type Spec } from '../engine/director'
import { formation, shapes, useDirector } from '../engine/formations'

const festCount = (f: string) => projects.filter((p) => p.fest === f).length
const firstSentences = (s: string, n: number) => (s.match(/[^.!?]+[.!?]+/g) ?? [s]).slice(0, n).join(' ').trim()
const batches = [...new Set(team.map((m) => m.batch))].sort()
const bosm = fests.find((f) => f.id === 'BOSM')!
const oasis = fests.find((f) => f.id === 'Oasis')!
const apogee = fests.find((f) => f.id === 'APOGEE')!

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export default function Home() {
  const d = useDirector()
  const sections = useRef<(HTMLElement | null)[]>([])

  useEffect(() => {
    const stageDefs = [
      [shapes.logo, { region: regions.right, fill: 0.86, sway: 0.55 }],
      [shapes.tower, { region: regions.right, fill: 0.95, sway: 0.12 }],
      [shapes.word('BOSM'), { region: regions.right, fill: 0.9, sway: 0.16 }],
      [shapes.word('OASIS'), { region: regions.right, fill: 0.9, sway: 0.16 }],
      [shapes.word('APOGEE'), { region: regions.right, fill: 0.88, sway: 0.14 }],
      [shapes.weAreDvm, { region: regions.right, fill: 0.86, sway: 0.18 }],
    ] as const
    const specs: (Spec | null)[] = stageDefs.map(() => null)
    let alive = true
    stageDefs.forEach(([shape, spec], i) => {
      formation(d, shape, spec, true).then((s) => {
        if (alive) specs[i] = s
      })
    })
    const nearest = (i: number) => {
      for (let k = 0; k < specs.length; k++) {
        if (specs[i - k]) return specs[i - k]
        if (specs[i + k]) return specs[i + k]
      }
      return null
    }
    d.parallax = 1
    d.alpha = 1
    d.driver = () => {
      const els = sections.current
      const mid = window.innerHeight * 0.5
      let s = 0
      for (let i = 0; i < els.length; i++) {
        const el = els[i]
        if (!el) continue
        const r = el.getBoundingClientRect()
        if (r.top <= mid) s = i + Math.min(1, (mid - r.top) / r.height)
      }
      const u = Math.max(0, s - 0.5)
      const last = specs.length - 1
      const i = Math.min(last, Math.floor(u))
      const f = i >= last ? 0 : smooth(0.22, 0.78, u - i)
      const a = specs[i] ?? nearest(i)
      const b = specs[Math.min(last, i + 1)] ?? a
      if (a && b) d.blend(a, b, f)
    }
    return () => {
      alive = false
      d.driver = null
    }
  }, [d])

  const reg = (i: number) => (el: HTMLElement | null) => {
    sections.current[i] = el
  }
  const touch = d.mobile

  return (
    <div className="sw-home">
      <section className="sw-stage sw-stage--hero" ref={reg(0)} aria-labelledby="sw-h1">
        <div className="sw-col">
          <p className="sw-kicker">DVM, BITS Pilani</p>
          <h1 id="sw-h1" className="sw-display">
            Department of Visual Media
          </h1>
          <p className="sw-lede">We build the websites, apps and films behind the three fests of BITS Pilani: BOSM, Oasis and APOGEE.</p>
        </div>
        <p className="sw-hint">
          <strong>{d.count.toLocaleString('en-US')}</strong> particles.{' '}
          {d.reduced
            ? 'Held still, because your system asks for reduced motion.'
            : touch
              ? 'Drag across the screen to scatter them.'
              : 'Move to scatter them. Press and hold anywhere to pull them in.'}
        </p>
        <span className="sw-scrollcue" aria-hidden="true" />
      </section>

      <section className="sw-stage" ref={reg(1)} aria-labelledby="sw-campus">
        <div className="sw-col">
          <h2 id="sw-campus" className="sw-h2">
            Made at BITS Pilani
          </h2>
          <p className="sw-body">{site.about[3]}</p>
          <dl className="sw-facts">
            <div>
              <dt>{team.length}</dt>
              <dd>members on record</dd>
            </div>
            <div>
              <dt>
                {batches[0]}–{String(batches[batches.length - 1]).slice(2)}
              </dt>
              <dd>batches</dd>
            </div>
            <div>
              <dt>5</dt>
              <dd>teams: {verticals.map((v) => v.label).join(', ')}</dd>
            </div>
          </dl>
        </div>
      </section>

      {[
        { id: 'bosm', f: bosm, h: 'BITS Open Sports Meet', body: firstSentences(bosm.blurb, 3), fact: 'Running since 1986' },
        { id: 'oasis', f: oasis, h: 'Oasis, the cultural fest', body: firstSentences(oasis.blurb, 2), fact: '96 hours, every year' },
        { id: 'apogee', f: apogee, h: 'A Professions Oriented Gathering over Educational Experiences', body: firstSentences(apogee.blurb.replace(/^APOGEE \([^)]*\) - /, 'APOGEE '), 2), fact: '43rd edition in 2025' },
      ].map(({ id, f, h, body, fact }, i) => (
        <section className="sw-stage" key={id} ref={reg(2 + i)} aria-labelledby={`sw-${id}`}>
          <div className="sw-col">
            <p className="sw-kicker">{fact}</p>
            <h2 id={`sw-${id}`} className="sw-h2">
              {h}
            </h2>
            <p className="sw-body">{body}</p>
            <Link className="sw-arrowlink" to={`work?fest=${f.id}`}>
              {festCount(f.id)} {f.name} projects in the archive
            </Link>
          </div>
        </section>
      ))}

      <section className="sw-stage sw-stage--final" ref={reg(5)} aria-labelledby="sw-we">
        <div className="sw-col">
          <h2 id="sw-we" className="sw-h2">
            {site.headline}
          </h2>
          <p className="sw-body">{site.about[1]}</p>
          <dl className="sw-facts">
            <div>
              <dt>5000+</dt>
              <dd>users on our apps and websites</dd>
            </div>
            <div>
              <dt>{projects.length}</dt>
              <dd>sites, apps, portals and films</dd>
            </div>
            <div>
              <dt>{team.length}</dt>
              <dd>members since 2017</dd>
            </div>
          </dl>
          <ul className="sw-bignav">
            <li>
              <Link to="work">
                Work <span>{projects.length} projects</span>
              </Link>
            </li>
            <li>
              <Link to="team">
                Team <span>{team.length} members</span>
              </Link>
            </li>
            <li>
              <Link to="journal">
                Journal <span>{blogs.length + artworks.length} posts and artworks</span>
              </Link>
            </li>
            <li>
              <Link to="contact">
                Contact <span>{site.contact.email}</span>
              </Link>
            </li>
          </ul>
          <footer className="sw-foot">
            <p>{site.taglines.mischief}.</p>
            <p>{site.taglines.footer}</p>
          </footer>
        </div>
      </section>
    </div>
  )
}
