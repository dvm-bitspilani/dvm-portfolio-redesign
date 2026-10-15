import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { BASE } from './paths'
import { LOGO_PATHS, LOGO_TRANSFORM } from '../../shared/logo'
import { CONTACT_INDEX, FILTER_COUNTS, ITEMS, addressOf, findByRoute, fmtNum, type Filter } from './engine/layout'
import { MARK_TARGET, WallEngine, type FrameInfo } from './engine/WallEngine'
import Detail from './ui/Detail'
import Minimap, { type MinimapHandle } from './ui/Minimap'
import IndexList from './ui/IndexList'

export type DetailKind = 'project' | 'member' | 'journal' | 'about' | 'contact'

export interface RouteState {
  filter: Filter
  detail?: DetailKind
  slug?: string
  tile?: string
  key: string
}

// eslint-disable-next-line react-refresh/only-export-components
export const RouteContext = createContext<(r: RouteState) => void>(() => {})

const FILTER_PATH: Record<Filter, string> = { all: '', work: 'work', team: 'team', journal: 'journal', contact: 'contact' }
/** Filtered views pull back a little so the rings around the origin read as rings. */
const HOME_ZOOM: Record<Filter, number> = { all: 1, work: 0.6, team: 0.62, journal: 0.7, contact: 1 }
const NAV: { f: Filter; label: string }[] = [
  { f: 'all', label: 'Everything' },
  { f: 'work', label: 'Work' },
  { f: 'team', label: 'Team' },
  { f: 'journal', label: 'Journal' },
  { f: 'contact', label: 'Contact' },
]

export function Mark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 375.62 375.62" aria-hidden="true">
      <g transform={`translate(${LOGO_TRANSFORM.x} ${LOGO_TRANSFORM.y})`}>
        {LOGO_PATHS.map((d) => (
          <path key={d} d={d} fill="currentColor" />
        ))}
      </g>
    </svg>
  )
}

function usePrefs() {
  return useMemo(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const mobile = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 760
    return { reduced, mobile }
  }, [])
}

export default function Shell() {
  const navigate = useNavigate()
  const prefs = usePrefs()
  const hostRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<WallEngine | null>(null)
  const [glFailed, setGlFailed] = useState(false)
  // `browse` = the filter you were browsing; detail routes keep it so the wall doesn't re-pack under you.
  const [nav, setNav] = useState<{ route: RouteState | null; browse: Filter | null }>({ route: null, browse: null })
  const route = nav.route
  const [hovered, setHovered] = useState<number | null>(null)
  const [listOpen, setListOpen] = useState(false)
  const [hinted, setHinted] = useState(false)
  const [loadDone, setLoadDone] = useState(false)
  const [narrow, setNarrow] = useState(() => window.innerWidth < 760)

  const coordRef = useRef<HTMLSpanElement>(null)
  const zoomRef = useRef<HTMLSpanElement>(null)
  const loadRef = useRef<HTMLSpanElement>(null)
  const loadBarRef = useRef<HTMLSpanElement>(null)
  const captionRef = useRef<HTMLDivElement>(null)
  const minimapRef = useRef<MinimapHandle>(null)
  const savedCam = useRef<{ x: number; y: number; z: number } | null>(null)
  const prevRoute = useRef<RouteState | null>(null)
  const lastText = useRef({ c: '', z: '', l: '' })

  // ---------------------------------------------------------------- page-level styles
  useEffect(() => {
    const html = document.documentElement, body = document.body
    const prev = [html.style.overflow, body.style.overflow, body.style.overscrollBehavior, body.style.background]
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    body.style.overscrollBehavior = 'none'
    body.style.background = '#16171a'
    const onResize = () => setNarrow(window.innerWidth < 760)
    window.addEventListener('resize', onResize)
    return () => {
      ;[html.style.overflow, body.style.overflow, body.style.overscrollBehavior, body.style.background] = prev
      window.removeEventListener('resize', onResize)
    }
  }, [])

  // ---------------------------------------------------------------- engine
  const handlers = useRef({
    select: (_t: number) => {},
    hover: (_t: number | null) => {},
  })

  const onFrame = useCallback((f: FrameInfo) => {
    const c = `${fmtNum(f.x)}, ${fmtNum(f.y)}`
    const z = `${f.zoom.toFixed(2)}×`
    if (c !== lastText.current.c && coordRef.current) coordRef.current.textContent = lastText.current.c = c
    if (z !== lastText.current.z && zoomRef.current) zoomRef.current.textContent = lastText.current.z = z
    const l = f.loaded < f.total ? `${f.loaded} of ${f.total} loaded` : ''
    if (l !== lastText.current.l) {
      lastText.current.l = l
      if (loadRef.current) loadRef.current.textContent = l
      if (loadBarRef.current) loadBarRef.current.style.transform = `scaleX(${f.loaded / f.total})`
      if (!l) setLoadDone(true)
    }
    const cap = captionRef.current
    if (cap) {
      if (f.hoverRect) {
        const r = f.hoverRect
        const cw = cap.offsetWidth || 260, chh = cap.offsetHeight || 56
        const vw = window.innerWidth, vh = window.innerHeight
        let x = r.x
        let y = r.y + r.h + 10
        if (y + chh > vh - 12) y = r.y - chh - 10
        x = Math.max(12, Math.min(vw - cw - 12, x))
        y = Math.max(64, Math.min(vh - chh - 12, y))
        cap.style.transform = `translate3d(${x}px, ${y}px, 0)`
        cap.dataset.show = '1'
      } else cap.dataset.show = '0'
    }
    minimapRef.current?.draw(f)
  }, [])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let engine: WallEngine
    try {
      engine = new WallEngine(
        host,
        {
          hover: (t) => handlers.current.hover(t),
          select: (t) => handlers.current.select(t),
          frame: onFrame,
          interact: () => setHinted(true),
        },
        prefs,
      )
    } catch (err) {
      console.warn('[archive] WebGL unavailable, showing the index instead.', err)
      setGlFailed(true)
      setListOpen(true)
      return
    }
    engineRef.current = engine
    return () => {
      engine.dispose()
      engineRef.current = null
    }
  }, [onFrame, prefs])

  // ---------------------------------------------------------------- routing -> wall state
  const filterRoute = (f: Filter | null) => `${BASE}${f && f !== 'contact' && FILTER_PATH[f] ? '/' + FILTER_PATH[f] : ''}`

  const inset = useCallback(() => {
    const W = window.innerWidth, H = window.innerHeight
    if (W < 760) return { right: 0, bottom: Math.round(H * 0.58), top: 110 }
    return { right: Math.min(500, Math.round(W * 0.4)) + 28, bottom: 0, top: 60 }
  }, [])

  const wallFilter: Filter = !route ? 'all' : route.detail === 'contact' ? 'contact' : route.detail ? nav.browse ?? route.filter : route.filter

  const detailTarget = useMemo(() => {
    if (!route?.detail) return null
    if (route.detail === 'about') return MARK_TARGET
    if (route.detail === 'contact') return CONTACT_INDEX
    if (!route.slug) return null
    if (route.tile) {
      const it = ITEMS.find((i) => i.key === route.tile)
      if (it && it.route === `${route.detail === 'project' ? 'work' : route.detail === 'member' ? 'team' : 'journal'}/${route.slug}`) return it.index
    }
    return findByRoute(route.detail, route.slug)?.index ?? -1
  }, [route])

  useEffect(() => {
    const e = engineRef.current
    if (!route) return
    const prev = prevRoute.current
    prevRoute.current = route
    const first = prev === null

    if (!e) return
    e.setFilter(wallFilter, !first)

    if (detailTarget !== null && detailTarget >= -2 && detailTarget !== -1) {
      if (e.focused === null) savedCam.current = { x: e.x, y: e.y, z: e.z }
      // On first load, let the intro breathe before diving in.
      if (first) window.setTimeout(() => engineRef.current?.focus(detailTarget, inset()), prefs.reduced ? 0 : 900)
      else e.focus(detailTarget, inset())
    } else {
      const wasDetail = e.focused !== null
      e.focus(null)
      if (first && route.filter !== 'all') e.home(HOME_ZOOM[route.filter])
      if (!first) {
        const filterChanged = !prev?.detail ? prev?.filter !== route.filter : false
        if (wasDetail && savedCam.current && !filterChanged) {
          const s = savedCam.current
          e.flyTo(s.x, s.y, s.z, prefs.reduced ? 1 : 1000)
        } else if (filterChanged || (wasDetail && prev?.filter !== route.filter)) {
          e.home(HOME_ZOOM[route.filter])
        }
        savedCam.current = null
      }
    }
  }, [route, wallFilter, detailTarget, inset, prefs.reduced])

  const closeDetail = useCallback(() => {
    navigate(filterRoute(nav.browse ?? 'all'))
  }, [navigate, nav.browse])

  useEffect(() => {
    handlers.current.select = (t: number) => {
      setHinted(true)
      if (t === MARK_TARGET) navigate(`${BASE}/about`)
      else {
        const it = ITEMS[t]
        navigate(`${BASE}/${it.route}`, { state: { tile: it.key } })
      }
    }
    handlers.current.hover = (t) => setHovered(t)
  }, [navigate])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('input, textarea')) return
      if (e.key === 'Escape') {
        if (listOpen && !glFailed) setListOpen(false)
        else if (route?.detail) closeDetail()
      } else if ((e.key === 'l' || e.key === 'L') && !e.metaKey && !e.ctrlKey) {
        if (!glFailed) setListOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [listOpen, route, closeDetail, glFailed])

  // Keep the open tile framed beside its panel when the window changes size.
  useEffect(() => {
    if (detailTarget === null || detailTarget === -1) return
    let t = 0
    const onResize = () => {
      window.clearTimeout(t)
      t = window.setTimeout(() => engineRef.current?.focus(detailTarget, inset()), 180)
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('resize', onResize)
    }
  }, [detailTarget, inset])

  const sync = useCallback(
    (r: RouteState) =>
      setNav((s) => ({
        route: r,
        browse: r.detail === 'contact' ? s.browse : r.detail ? s.browse ?? (r.detail === 'about' ? 'all' : r.filter) : r.filter,
      })),
    [],
  )

  const activeFilter = wallFilter
  const hoverItem = hovered !== null && hovered >= 0 ? ITEMS[hovered] : null
  const detailOpen = detailTarget !== null && detailTarget !== -1

  return (
    <RouteContext.Provider value={sync}>
      <div className={`ar-root${detailOpen ? ' has-detail' : ''}${listOpen ? ' has-list' : ''}`}>
        <h1 className="ar-vh">DVM, Department of Visual Media, BITS Pilani: everything we have made, on one wall</h1>
        <div className="ar-stage" ref={hostRef} />

        <header className="ar-top">
          <Link to={BASE} className="ar-brand" aria-label="DVM archive, back to everything">
            <Mark className="ar-brand__mark" />
            <span className="ar-brand__name">DVM</span>
            <span className="ar-brand__sub">Archive of everything we made</span>
          </Link>

          <nav className="ar-filters" aria-label="Filter the wall">
            {NAV.map(({ f, label }) => (
              <NavLink
                key={f}
                to={f === 'all' ? BASE : `${BASE}/${FILTER_PATH[f]}`}
                end={f === 'all'}
                className={() => (activeFilter === f ? 'is-active' : '')}
                aria-current={activeFilter === f ? 'page' : undefined}
              >
                {narrow && f === 'all' ? 'All' : label}
                {f !== 'contact' && !narrow && <sup>{FILTER_COUNTS[f]}</sup>}
              </NavLink>
            ))}
            <button type="button" className={`ar-listbtn${listOpen ? ' is-active' : ''}`} onClick={() => setListOpen((o) => !o)} aria-expanded={listOpen} disabled={glFailed}>
              <span aria-hidden="true" className="ar-listbtn__icon" />
              {listOpen ? 'Wall' : 'List'}
            </button>
          </nav>
        </header>

        <p className={`ar-hint${hinted || detailOpen ? ' is-gone' : ''}`} aria-hidden="true">
          {prefs.mobile ? 'Drag to move, pinch to zoom, tap anything to open it.' : 'Drag to move, scroll to zoom, click anything to open it.'}
        </p>

        {/* Hover caption, positioned by the engine every frame. */}
        <div className="ar-caption" ref={captionRef} data-show="0" aria-hidden="true">
          {hovered === MARK_TARGET ? (
            <>
              <span className="ar-caption__title">About DVM</span>
              <span className="ar-caption__meta">
                <span>The department, its five teams and its numbers</span>
                <span className="ar-caption__addr">0, 0</span>
              </span>
            </>
          ) : hoverItem ? (
            <>
              <span className="ar-caption__title">{hoverItem.title}</span>
              <span className="ar-caption__meta">
                <span>{hoverItem.line}</span>
                <span className="ar-caption__addr">{addressOf(hoverItem.index, activeFilter)}</span>
              </span>
            </>
          ) : null}
        </div>

        <aside className="ar-hud" aria-label="Position">
          {!narrow && <Minimap ref={minimapRef} engine={engineRef} filter={activeFilter} />}
          <div className="ar-hud__row">
            <span className="ar-hud__coord" title="Camera position in cells (y up)">
              <span ref={coordRef}>0, 0</span>
            </span>
            <span className="ar-hud__zoom" ref={zoomRef}>1.00×</span>
          </div>
          <div className="ar-hud__row ar-hud__btns">
            <button type="button" onClick={() => engineRef.current?.zoomBy(1 / 1.4)} aria-label="Zoom out">−</button>
            <button type="button" onClick={() => engineRef.current?.zoomBy(1.4)} aria-label="Zoom in">+</button>
            <button type="button" className="ar-hud__origin" onClick={() => (route?.detail ? closeDetail() : engineRef.current?.home())}>
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <circle cx="8" cy="8" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
                <path d="M8 0v4M8 12v4M0 8h4M12 8h4" stroke="currentColor" strokeWidth="1.3" />
              </svg>
              Return to 0, 0
            </button>
          </div>
          <div className={`ar-hud__load${loadDone ? ' is-done' : ''}`}>
            <span className="ar-hud__bar"><span ref={loadBarRef} /></span>
            <span ref={loadRef} />
          </div>
        </aside>

        {detailOpen && route && (
          <Detail
            key={`${route.detail}:${route.slug ?? ''}`}
            kind={route.detail!}
            target={detailTarget!}
            tileKey={route.tile}
            onClose={closeDetail}
            filter={activeFilter}
          />
        )}

        {(listOpen || glFailed) && (
          <IndexList
            filter={activeFilter}
            glFailed={glFailed}
            onClose={() => setListOpen(false)}
          />
        )}

        {/* Accessible fallback: every item on the wall as a plain link. Focusing one highlights its tile. */}
        {!listOpen && !glFailed && (
          <nav className="ar-sr" aria-label="Everything on the wall">
            <ul>
              {ITEMS.filter((i) => ['project', 'video', 'artwork', 'blog', 'member', 'contact'].includes(i.kind)).map((it) => (
                <li key={it.key}>
                  <Link
                    to={`${BASE}/${it.route}`}
                    state={{ tile: it.key }}
                    onFocus={() => engineRef.current?.setExternalHover(it.index)}
                    onBlur={() => engineRef.current?.setExternalHover(null, false)}
                  >
                    {it.title}, {it.line}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <Outlet />
      </div>
    </RouteContext.Provider>
  )
}
