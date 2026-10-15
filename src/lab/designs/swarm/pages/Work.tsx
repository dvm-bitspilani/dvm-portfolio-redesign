import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { projects, type Fest, type Project, type ProjectKind } from '../../../data'
import { regions } from '../engine/director'
import { shapes, showFormation, titleLines, useDirector } from '../engine/formations'

const KINDS: { id: ProjectKind | 'all'; label: string }[] = [
  { id: 'all', label: 'Everything' },
  { id: 'website', label: 'Websites' },
  { id: 'app', label: 'Apps' },
  { id: 'portal', label: 'Portals' },
  { id: 'video', label: 'Films' },
]
const FESTS: Fest[] = ['APOGEE', 'BOSM', 'Oasis', 'Campus']
const KIND_LABEL: Record<ProjectKind, string> = { website: 'Website', app: 'App', portal: 'Portal', video: 'Film' }

export function projectShape(p: Project) {
  const img = p.cover ?? p.mockup
  return img ? shapes.image(img) : shapes.lines(titleLines(p.title))
}

export default function Work() {
  const d = useDirector()
  const [params, setParams] = useSearchParams()
  const fest = params.get('fest') as Fest | null
  const [kind, setKind] = useState<ProjectKind | 'all'>('all')
  const [active, setActive] = useState<Project | null>(null)
  const timer = useRef(0)

  const list = useMemo(
    () => projects.filter((p) => (kind === 'all' || p.kind === kind) && (!fest || p.fest === fest)),
    [kind, fest],
  )

  useEffect(() => {
    d.parallax = 0.3
    d.alpha = 1
    return () => window.clearTimeout(timer.current)
  }, [d])

  useEffect(() => {
    if (!active) return showFormation(d, shapes.galaxy, { region: regions.right, fill: 1.15, tilt: 1.12, spinSpeed: 0.1 }, { kick: 0.5, pin: true })
    return showFormation(d, projectShape(active), { region: regions.right, fill: 0.94, sway: 0.06 }, { kick: 0.75 })
  }, [d, active])

  const hover = (p: Project | null, delay: number) => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setActive(p), delay)
  }

  return (
    <div className="sw-page sw-work">
      <header className="sw-pagehead">
        <h1 className="sw-display sw-display--page">Work</h1>
        <p className="sw-lede">
          {projects.length} things DVM has shipped for the fests since 2018: websites, apps, portals and films. Point at one and the swarm becomes it.
        </p>
        <div className="sw-filters" role="group" aria-label="Filter by type">
          {KINDS.map((k) => (
            <button key={k.id} type="button" aria-pressed={kind === k.id} onClick={() => setKind(k.id)}>
              {k.label}
            </button>
          ))}
        </div>
        <div className="sw-filters sw-filters--small" role="group" aria-label="Filter by fest">
          <button type="button" aria-pressed={!fest} onClick={() => setParams({})}>
            All fests
          </button>
          {FESTS.map((f) => (
            <button key={f} type="button" aria-pressed={fest === f} onClick={() => setParams({ fest: f })}>
              {f}
            </button>
          ))}
        </div>
      </header>

      <ol className="sw-index" onPointerLeave={() => hover(null, 350)}>
        {list.map((p) => (
          <li key={p.slug}>
            <Link
              to={p.slug}
              className={active?.slug === p.slug ? 'is-active' : undefined}
              onPointerEnter={() => hover(p, 70)}
              onFocus={() => hover(p, 0)}
            >
              <span className="sw-index__year">{p.year ?? '—'}</span>
              <span className="sw-index__title">{p.title}</span>
              <span className="sw-index__meta">
                {p.fest}, {KIND_LABEL[p.kind].toLowerCase()}
              </span>
            </Link>
          </li>
        ))}
        {!list.length && <li className="sw-empty">Nothing matches that filter. Try another type or fest.</li>}
      </ol>

      <aside className="sw-caption" aria-live="polite">
        {active ? (
          <>
            <strong>{active.title}</strong>
            <span>{active.summary ?? active.date ?? active.fest}</span>
          </>
        ) : (
          <span>{list.length} projects in view. Point at a title to form its cover.</span>
        )}
      </aside>
    </div>
  )
}
