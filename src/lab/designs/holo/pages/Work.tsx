import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { projects, socials, verticals, type Project, type ProjectKind } from '../../../data'
import { useActive, useReducedMotion } from '../scene/common'
import { Footer, PageHead } from '../ui/Bits'

const Carousel = lazy(() => import('../scene/Carousel'))

const KINDS: { id: ProjectKind | 'all'; label: string }[] = [
  { id: 'all', label: 'Everything' },
  { id: 'website', label: 'Websites' },
  { id: 'app', label: 'Apps' },
  { id: 'portal', label: 'Portals' },
  { id: 'video', label: 'Films' },
]

const sorted = [...projects].sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
const vLabel = (id: string) => verticals.find((v) => v.id === id)?.label ?? id

export default function Work() {
  const [kind, setKind] = useState<ProjectKind | 'all'>('all')
  const [active, setActive] = useState(0)
  const [hovering, setHovering] = useState(false)
  const stageRef = useRef<HTMLElement>(null)
  const live = useActive(stageRef)
  const reduced = useReducedMotion()
  const navigate = useNavigate()

  const items = useMemo(() => sorted.filter((p) => kind === 'all' || p.kind === kind), [kind])
  const current = items[Math.min(active, items.length - 1)]

  const onOpen = useCallback((p: Project) => navigate(p.slug), [navigate])
  const step = useCallback((d: number) => setActive((a) => (a + d + items.length) % items.length), [items.length])

  // auto-advance every 5 s like the old slider, paused while the visitor is engaged
  useEffect(() => {
    if (reduced || hovering || !live) return
    const t = setTimeout(() => step(1), 5000)
    return () => clearTimeout(t)
  }, [active, hovering, live, reduced, step])

  return (
    <main className="holo-work">
      <section
        ref={stageRef}
        className="holo-stage"
        aria-label="Project carousel"
        onPointerEnter={() => setHovering(true)}
        onPointerLeave={() => setHovering(false)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') step(1)
          if (e.key === 'ArrowLeft') step(-1)
        }}
      >
        <PageHead title="Work" index={`${projects.length} projections on file`}>
          <p>
            Every site, app, portal and film DVM has shipped for BOSM, Oasis and APOGEE. Drag the ring, use the arrows, or
            point at a row in the index to bring a project to the front.
          </p>
        </PageHead>
        <Suspense fallback={<div className="holo-stage__boot">Warming the projector</div>}>
          <Carousel
            items={items}
            active={Math.min(active, items.length - 1)}
            onActive={setActive}
            onOpen={onOpen}
            reduced={reduced}
            frameloop={live ? 'always' : 'never'}
          />
        </Suspense>
        <div className="holo-stage__filters" role="group" aria-label="Filter by kind">
          {KINDS.map((k) => {
            const count = k.id === 'all' ? projects.length : projects.filter((p) => p.kind === k.id).length
            return (
              <button
                key={k.id}
                type="button"
                aria-pressed={kind === k.id}
                onClick={() => {
                  setKind(k.id)
                  setActive(0)
                }}
              >
                {k.label}
                <sup>{count}</sup>
              </button>
            )
          })}
        </div>
        {current && (
          <div className="holo-stage__readout" aria-live="polite">
            <p className="holo-stage__count">
              {String(Math.min(active, items.length - 1) + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
            </p>
            <h2 className="holo-stage__title">{current.title}</h2>
            <p className="holo-stage__meta">
              {current.fest} {current.date ?? current.year}
              {current.theme ? `, “${current.theme}”` : ''}
            </p>
            <div className="holo-stage__actions">
              <button type="button" onClick={() => step(-1)} aria-label="Previous project">
                ◂
              </button>
              <button type="button" onClick={() => step(1)} aria-label="Next project">
                ▸
              </button>
              <Link to={current.slug} className="holo-btn">
                Open dossier
              </Link>
            </div>
            {!reduced && !hovering && <span key={`${active}-${kind}`} className="holo-stage__timer" aria-hidden="true" />}
          </div>
        )}
      </section>

      <section className="holo-section holo-index" aria-labelledby="holo-index-title">
        <header className="holo-section__head">
          <h2 id="holo-index-title" className="holo-h2">
            Index
          </h2>
          <p className="holo-section__note">{items.length} shown, newest first</p>
        </header>
        <table className="holo-table">
          <thead>
            <tr>
              <th scope="col">Year</th>
              <th scope="col">Project</th>
              <th scope="col">Fest</th>
              <th scope="col">Kind</th>
              <th scope="col">Teams</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p, i) => (
              <tr
                key={p.slug}
                className={i === active ? 'is-active' : undefined}
                onPointerEnter={() => setActive(i)}
              >
                <td>{p.year ?? '—'}</td>
                <td>
                  <Link to={p.slug} onFocus={() => setActive(i)}>
                    {p.title}
                  </Link>
                </td>
                <td>{p.fest}</td>
                <td>{p.kind}</td>
                <td>{p.verticals.map(vLabel).join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <Footer socials={socials} />
    </main>
  )
}
