import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { projects, type ProjectKind } from '../../../data'
import LiquidLens, { useLens } from '../ui/LiquidLens'
import Footer from '../ui/Footer'
import { BASE } from '../ui/Nav'

const FILTERS: { id: ProjectKind | 'all'; label: string }[] = [
  { id: 'all', label: 'Everything' },
  { id: 'website', label: 'Websites' },
  { id: 'app', label: 'Apps' },
  { id: 'portal', label: 'Portals' },
  { id: 'video', label: 'Films' },
]

export default function Work() {
  const [filter, setFilter] = useState<ProjectKind | 'all'>('all')
  const lens = useLens()

  const groups = useMemo(() => {
    const list = projects.filter((p) => filter === 'all' || p.kind === filter)
    const by = new Map<string, typeof list>()
    for (const p of list) {
      const k = p.year ? String(p.year) : 'Undated'
      if (!by.has(k)) by.set(k, [])
      by.get(k)!.push(p)
    }
    return [...by.entries()].sort((a, b) => (b[0] === 'Undated' ? -1 : a[0] === 'Undated' ? 1 : Number(b[0]) - Number(a[0])))
  }, [filter])

  const count = groups.reduce((n, [, l]) => n + l.length, 0)

  return (
    <main id="merc-main" className="merc-page merc-work">
      <LiquidLens controller={lens} />
      <header className="merc-page__head">
        <h1 className="merc-display merc-display--page">
          <span data-line>Work</span>
        </h1>
        <p className="merc-page__intro">
          Fest websites, wallet apps, hostel portals and the films that announce each fest. Hover a title to see it through
          the mercury.
        </p>
      </header>

      <div className="merc-filter" role="group" aria-label="Filter projects">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
            {f.label}
          </button>
        ))}
        <span className="merc-filter__count" aria-live="polite">
          {count} {count === 1 ? 'project' : 'projects'}
        </span>
      </div>

      <div className="merc-years">
        {groups.map(([year, list]) => (
          <section key={year} className="merc-year" aria-labelledby={`y-${year}`}>
            <h2 id={`y-${year}`} className="merc-year__label">
              <span className="merc-chrome">{year}</span>
            </h2>
            <ul className="merc-rows merc-rows--work">
              {list.map((p) => (
                <li key={p.slug}>
                  <Link to={`${BASE}/work/${p.slug}`} className="merc-row" {...lens.bind(() => ({ src: p.cover, mode: 'cover' }))}>
                    <span className="merc-row__title">{p.title}</span>
                    <span className="merc-row__meta">{p.fest === 'Campus' ? 'BITS Pilani' : p.fest}</span>
                    <span className="merc-row__kind">{p.kind === 'video' ? 'Film' : p.kind}</span>
                    {p.cover && <img className="merc-row__thumb" src={p.cover} alt="" loading="lazy" />}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <Footer />
    </main>
  )
}
