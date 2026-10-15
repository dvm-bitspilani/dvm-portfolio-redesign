import { useMemo, useState } from 'react'
import { projects, type ProjectKind } from '../../../data'
import FoldCard from '../components/FoldCard'

const FILTERS: { id: ProjectKind | 'all'; label: string }[] = [
  { id: 'all', label: 'Everything' },
  { id: 'website', label: 'Websites' },
  { id: 'app', label: 'Apps' },
  { id: 'portal', label: 'Portals' },
  { id: 'video', label: 'Films' },
]

export default function Work() {
  const [filter, setFilter] = useState<ProjectKind | 'all'>('all')
  const groups = useMemo(() => {
    const list = projects.filter((p) => filter === 'all' || p.kind === filter)
    const by = new Map<string, typeof list>()
    for (const p of list) {
      const k = p.year ? String(p.year) : 'Undated'
      by.set(k, [...(by.get(k) ?? []), p])
    }
    return [...by.entries()].sort((a, b) => (b[0] === 'Undated' ? -1 : a[0] === 'Undated' ? 1 : Number(b[0]) - Number(a[0])))
  }, [filter])
  const total = groups.reduce((a, [, l]) => a + l.length, 0)

  return (
    <main id="fold-main" className="fold-page fold-work">
      <header className="fold-page__head">
        <h1 className="fold-h1">The archive</h1>
        <p className="fold-page__lede">
          Every website, app, portal and film DVM has shipped for BOSM, Oasis and APOGEE since 2018. Each one is folded away;
          hover to open it.
        </p>
        <div className="fold-tabs" role="group" aria-label="Filter by kind">
          {FILTERS.map((f) => {
            const n = f.id === 'all' ? projects.length : projects.filter((p) => p.kind === f.id).length
            return (
              <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
                {f.label}
                <span>{n}</span>
              </button>
            )
          })}
        </div>
        <p className="fold-sr" aria-live="polite">
          Showing {total} pieces
        </p>
      </header>
      {groups.map(([year, list]) => (
        <section key={year} className="fold-year" aria-labelledby={`y-${year}`}>
          <h2 id={`y-${year}`} className="fold-year__label">
            <span className="fold-foil">{year}</span>
            <small>
              {list.length} {list.length === 1 ? 'piece' : 'pieces'}
            </small>
          </h2>
          <ul className="fold-cards fold-cards--dense">
            {list.map((p, i) => (
              <li key={p.slug} className={i % 5 === 0 ? 'is-wide' : undefined}>
                <FoldCard project={p} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  )
}
