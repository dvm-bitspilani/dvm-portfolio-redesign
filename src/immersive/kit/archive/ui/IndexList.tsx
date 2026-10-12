import { useEffect, useMemo, useRef, type ComponentType, type ReactNode } from 'react'
import { verticals } from '../../../data'
import type { WallItem, WallModel } from '../model'

export interface ItemLinkProps {
  item: WallItem
  className?: string
  children: ReactNode
  onDone?: () => void
  onFocus?: () => void
  onBlur?: () => void
  current?: boolean
  title?: string
}

interface Group {
  id: string
  title: string
  note: string
  rows: { heading: string; items: WallItem[] }[]
}

function groupBy<T>(arr: T[], key: (t: T) => string) {
  const m = new Map<string, T[]>()
  for (const a of arr) {
    const k = key(a)
    if (!m.has(k)) m.set(k, [])
    m.get(k)!.push(a)
  }
  return [...m.entries()].map(([heading, items]) => ({ heading, items }))
}

const vLabel = (id?: string) => verticals.find((v) => v.id === id)?.label

function sub(it: WallItem) {
  const s = it.item
  if (s.member) return vLabel(s.member.vertical)
  if (s.project) return s.project.fest
  if (s.artwork) return s.artwork.artist
  if (s.blog) return s.blog.authors.join(' & ')
  return s.line
}

function rowsFor(id: string, items: WallItem[]) {
  const year = (i: WallItem) => i.item.project?.year ?? 0
  if (id === 'work' || id === 'films')
    return groupBy([...items].sort((a, b) => year(b) - year(a) || a.item.title.localeCompare(b.item.title)), (i) => String(year(i) || 'Undated'))
  if (id === 'team')
    return groupBy(
      [...items].sort((a, b) => (b.item.member?.batch ?? 0) - (a.item.member?.batch ?? 0) || a.item.title.localeCompare(b.item.title)),
      (i) => (i.item.member ? `Batch of ${i.item.member.batch}` : 'Members'),
    )
  if (id === 'art') return groupBy([...items].sort((a, b) => (b.item.artwork?.date ?? '').localeCompare(a.item.artwork?.date ?? '')), (i) => String(i.item.artwork?.year ?? 'Artworks'))
  return [{ heading: '', items: [...items].sort((a, b) => b.rank - a.rank) }]
}

export default function IndexList({
  model, filters, filter, glFailed, onClose, Link, insetTop,
}: {
  model: WallModel
  filters: { id: string; label: string }[]
  filter: string
  glFailed: boolean
  onClose: () => void
  Link: ComponentType<ItemLinkProps>
  insetTop: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true })
  }, [])

  const groups = useMemo<Group[]>(() => {
    const primary = model.items.filter((i) => i.primary && i.kind !== 'contact')
    const used = new Set<number>()
    const out: Group[] = []
    for (const f of filters) {
      if (f.id === 'all' || f.id === 'contact') continue
      const def = model.filter(f.id)
      const items = primary.filter((i) => def.test(i.item))
      if (!items.length) continue
      items.forEach((i) => used.add(i.index))
      out.push({ id: f.id, title: f.label, note: `${items.length} on the wall`, rows: rowsFor(f.id, items) })
    }
    const rest = primary.filter((i) => !used.has(i.index))
    if (rest.length) out.push({ id: 'other', title: out.length ? 'Everything else' : 'Everything', note: `${rest.length} on the wall`, rows: rowsFor('other', rest) })
    if (filter === 'all') return out
    const def = model.filter(filter)
    const only = primary.filter((i) => def.test(i.item))
    return [{ id: filter, title: filters.find((f) => f.id === filter)?.label ?? def.label, note: `${only.length} on the wall`, rows: rowsFor(filter, only) }]
  }, [model, filters, filter])

  const contact = model.items.find((i) => i.kind === 'contact')
  const addrFilter = model.layout(filter).count <= 2 ? 'all' : filter

  return (
    <div className="imm-archive-index" ref={ref} role="region" aria-label="Index of the wall" style={{ paddingTop: insetTop + 72 }}>
      <div className="imm-archive-index__inner">
        <div className="imm-archive-index__head">
          <h2 tabIndex={-1}>Index</h2>
          <p>
            {glFailed
              ? 'This browser cannot draw the wall, so here is everything on it as a list.'
              : 'Everything on the wall, with its address. Pick one to fly there.'}
          </p>
          {!glFailed && (
            <button type="button" className="imm-archive-index__close" onClick={onClose}>
              Back to the wall
            </button>
          )}
        </div>
        {groups.map((g) => (
          <section key={g.id} className="imm-archive-index__group" aria-labelledby={`imm-archive-ix-${g.id}`}>
            <h3 id={`imm-archive-ix-${g.id}`}>
              {g.title} <small>{g.note}</small>
            </h3>
            <div className="imm-archive-index__cols">
              {g.rows.map((r) => (
                <div key={r.heading || 'all'} className="imm-archive-index__block">
                  {r.heading && <h4>{r.heading}</h4>}
                  <ul>
                    {r.items.map((it) => (
                      <li key={it.id}>
                        <Link item={it} onDone={glFailed ? undefined : onClose}>
                          <span className="imm-archive-index__t">{it.item.title}</span>
                          <span className="imm-archive-index__m">{sub(it)}</span>
                          <span className="imm-archive-index__a">{model.addressOf(it.index, addrFilter)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ))}
        {contact && (
          <section className="imm-archive-index__group" aria-labelledby="imm-archive-ix-contact">
            <h3 id="imm-archive-ix-contact">Contact</h3>
            <p className="imm-archive-index__contact">
              <Link item={contact} onDone={glFailed ? undefined : onClose}>
                {contact.item.title}
              </Link>{' '}
              or mail <a href={contact.item.href ?? 'mailto:admin@bits-dvm.org'}>{contact.item.line}</a>
            </p>
          </section>
        )}
      </div>
    </div>
  )
}
