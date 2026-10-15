import { useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { verticals } from '../../../data'
import { ITEMS, addressOf, type Filter, type Item } from '../engine/layout'
import { BASE } from '../paths'

interface Group {
  id: string
  title: string
  note: string
  rows: { heading: string; items: Item[] }[]
}

function groupBy<T>(arr: T[], key: (t: T) => string) {
  const m = new Map<string, T[]>()
  for (const a of arr) {
    const k = key(a)
    if (!m.has(k)) m.set(k, [])
    m.get(k)!.push(a)
  }
  return [...m.entries()]
}

export default function IndexList({ filter, glFailed, onClose }: { filter: Filter; glFailed: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('h2')?.focus()
  }, [])

  const groups = useMemo<Group[]>(() => {
    const work = ITEMS.filter((i) => i.kind === 'project' || i.kind === 'video').sort((a, b) => (b.project?.year ?? 0) - (a.project?.year ?? 0) || a.title.localeCompare(b.title))
    const team = ITEMS.filter((i) => i.kind === 'member').sort((a, b) => b.member!.batch - a.member!.batch || a.title.localeCompare(b.title))
    const journal = ITEMS.filter((i) => i.kind === 'artwork' || i.kind === 'blog').sort((a, b) => (b.blog?.isoDate ?? b.artwork?.date ?? '').localeCompare(a.blog?.isoDate ?? a.artwork?.date ?? ''))
    const out: Group[] = [
      {
        id: 'work',
        title: 'Work',
        note: `${work.length} websites, apps, portals and films`,
        rows: groupBy(work, (i) => String(i.project?.year ?? 'Undated')).map(([heading, items]) => ({ heading, items })),
      },
      {
        id: 'team',
        title: 'Team',
        note: `${team.length} members, by the year they joined`,
        rows: groupBy(team, (i) => `Batch of ${i.member!.batch}`).map(([heading, items]) => ({ heading, items })),
      },
      {
        id: 'journal',
        title: 'Journal',
        note: `${journal.length} artworks and essays`,
        rows: groupBy(journal, (i) => (i.kind === 'blog' ? 'Essays' : 'Artworks')).map(([heading, items]) => ({ heading, items })),
      },
    ]
    if (filter === 'all' || filter === 'contact') return out
    return out.filter((g) => g.id === filter)
  }, [filter])

  const vLabel = (id?: string) => verticals.find((v) => v.id === id)?.label

  return (
    <div className="ar-index" ref={ref} role="region" aria-label="Index of the wall">
      <div className="ar-index__inner">
        <div className="ar-index__head">
          <h2 tabIndex={-1}>Index</h2>
          <p>
            {glFailed
              ? 'This browser cannot draw the wall, so here is everything on it as a list.'
              : 'Everything on the wall, with its address. Pick one to fly there.'}
          </p>
          {!glFailed && (
            <button type="button" className="ar-index__close" onClick={onClose}>
              Back to the wall
            </button>
          )}
        </div>
        {groups.map((g) => (
          <section key={g.id} className={`ar-index__group ar-index__group--${g.id}`} aria-labelledby={`ar-ix-${g.id}`}>
            <h3 id={`ar-ix-${g.id}`}>
              {g.title} <small>{g.note}</small>
            </h3>
            <div className="ar-index__cols">
              {g.rows.map((r) => (
                <div key={r.heading} className="ar-index__block">
                  <h4>{r.heading}</h4>
                  <ul>
                    {r.items.map((it) => (
                      <li key={it.key}>
                        <Link to={`${BASE}/${it.route}`} state={{ tile: it.key }} onClick={glFailed ? undefined : onClose}>
                          <span className="ar-index__t">{it.title}</span>
                          <span className="ar-index__m">
                            {it.member ? vLabel(it.member.vertical) : it.project ? it.project.fest : it.artwork ? it.artwork.artist : it.blog?.authors.join(' & ')}
                          </span>
                          <span className="ar-index__a">{addressOf(it.index, filter === 'contact' ? 'all' : filter)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ))}
        <section className="ar-index__group" aria-labelledby="ar-ix-contact">
          <h3 id="ar-ix-contact">Contact</h3>
          <p className="ar-index__contact">
            <Link to={`${BASE}/contact`} onClick={glFailed ? undefined : onClose}>
              Write to DVM
            </Link>{' '}
            or mail <a href="mailto:admin@bits-dvm.org">admin@bits-dvm.org</a>
          </p>
        </section>
      </div>
    </div>
  )
}
