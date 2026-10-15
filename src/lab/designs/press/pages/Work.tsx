import { useMemo, useRef, useState, type CSSProperties } from 'react'
import { flushSync } from 'react-dom'
import { projects, type Project, type ProjectKind } from '../../../data'
import PageHead from '../components/PageHead'
import FloatingPlate from '../components/FloatingPlate'
import VTLink from '../components/VTLink'
import { href } from '../lib/vt'
import { isReduced, pad } from '../lib/hooks'
import { KIND_LABEL, plateOf } from '../lib/content'

const KINDS: { id: ProjectKind | 'all'; label: string }[] = [
  { id: 'all', label: 'Everything' },
  { id: 'website', label: 'Websites' },
  { id: 'app', label: 'Apps' },
  { id: 'portal', label: 'Portals' },
  { id: 'video', label: 'Films' },
]
const years = projects.map((p) => p.year ?? 0).filter(Boolean)

type VTDoc = Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } }

export default function Work() {
  const [kind, setKind] = useState<ProjectKind | 'all'>('all')
  const [hover, setHover] = useState<Project | null>(null)
  const list = useRef<HTMLDivElement>(null)

  const groups = useMemo(() => {
    const shown = projects.filter((p) => kind === 'all' || p.kind === kind)
    const by = new Map<number, Project[]>()
    for (const p of shown) {
      const y = p.year ?? 0
      by.set(y, [...(by.get(y) ?? []), p])
    }
    return [...by.entries()].sort((a, b) => b[0] - a[0])
  }, [kind])

  const pick = (k: ProjectKind | 'all') => {
    const doc = document as VTDoc
    if (!doc.startViewTransition || isReduced()) return setKind(k)
    const el = list.current
    el?.classList.add('is-filtering')
    doc.startViewTransition(() => flushSync(() => setKind(k))).finished.finally(() => el?.classList.remove('is-filtering'))
  }

  const index = new Map(projects.map((p, i) => [p.slug, i + 1]))

  return (
    <main className="pr-page pr-work">
      <div className="pr-wrap">
        <PageHead
          letter="A"
          section="The archive"
          title="Work"
          dek={`${projects.length} entries filed between ${Math.min(...years)} and ${Math.max(...years)}: fest websites, apps, portals, and the films that announced them. Point at a title to pull its plate.`}
          aside={
            <div className="pr-filter" role="group" aria-label="Filter by kind">
              {KINDS.map((k) => {
                const n = k.id === 'all' ? projects.length : projects.filter((p) => p.kind === k.id).length
                return (
                  <button key={k.id} type="button" aria-pressed={kind === k.id} onClick={() => pick(k.id)}>
                    {k.label} <sup>{n}</sup>
                  </button>
                )
              })}
            </div>
          }
        />
        <div ref={list} className="pr-index" onPointerLeave={() => setHover(null)}>
          {groups.map(([year, ps]) => (
            <section key={year} className="pr-year" aria-label={year ? String(year) : 'Undated'}>
              <h2 className="pr-year-h">{year || 'n.d.'}</h2>
              <ol className="pr-rows">
                {ps.map((p) => (
                  <li key={p.slug} className="pr-rowi" style={{ '--vtn': `pr-w-${p.slug}` } as CSSProperties}>
                    <VTLink
                      to={href(`work/${p.slug}`)}
                      className="pr-row-a"
                      onPointerEnter={() => setHover(p)}
                      onFocus={() => setHover(p)}
                      onBlur={() => setHover(null)}
                    >
                      <span className="pr-row-no">{pad(index.get(p.slug)!, 3)}</span>
                      <span className="pr-row-title">
                        <span data-vt-source>{p.title}</span>
                      </span>
                      <span className="pr-row-fest">{p.fest}</span>
                      <span className="pr-row-kind">{KIND_LABEL[p.kind]}</span>
                    </VTLink>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      </div>
      <FloatingPlate
        src={hover ? plateOf(hover) : null}
        caption={
          hover && (
            <>
              <em>Pl. {pad(index.get(hover.slug)!, 3)}.</em> {hover.theme ? `“${hover.theme}”` : hover.title}. Hold still to develop.
            </>
          )
        }
      />
    </main>
  )
}
