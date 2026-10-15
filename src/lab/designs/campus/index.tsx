import '@fontsource-variable/fraunces/full.css'
import '@fontsource-variable/bricolage-grotesque'
import './campus.css'
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { BASE, type View } from './content'
import { campus, useCampus } from './store'
import { Chrome, HomeLayer } from './ui/Chrome'
import { Signs } from './ui/Signs'
import { ContactPanel, JournalPanel, ProjectPanel, TeamPanel, WorkPanel } from './ui/Panels'
import { ListView } from './ui/ListView'

const World = lazy(() => import('./world/World'))

function useMedia(q: string) {
  const [m, setM] = useState(() => window.matchMedia(q).matches)
  useEffect(() => {
    const mq = window.matchMedia(q)
    const on = () => setM(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [q])
  return m
}

function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!c.getContext('webgl2')
  } catch {
    return false
  }
}

export function parseView(pathname: string, search: string): View {
  const rel = pathname.startsWith(BASE) ? pathname.slice(BASE.length) : pathname
  const parts = rel.split('/').filter(Boolean)
  const q = new URLSearchParams(search)
  switch (parts[0]) {
    case 'work':
      return parts[1] ? { kind: 'project', focus: decodeURIComponent(parts[1]) } : { kind: 'work' }
    case 'team':
      return { kind: 'team', focus: q.get('m') ?? undefined }
    case 'journal':
      return { kind: 'journal', focus: q.get('item') ?? undefined }
    case 'contact':
      return { kind: 'contact' }
    default:
      return { kind: 'home' }
  }
}

export default function CampusDesign() {
  const loc = useLocation()
  const navigate = useNavigate()
  const view = useMemo(() => parseView(loc.pathname, loc.search), [loc.pathname, loc.search])
  const reduced = useMedia('(prefers-reduced-motion: reduce)')
  const mobile = useMedia('(max-width: 760px)')
  const listOpen = useCampus((s) => s.listOpen)
  const [gl] = useState(hasWebGL)
  const go = useCallback((to: string) => navigate(to), [navigate])

  useEffect(() => {
    const b = document.body.style
    const h = document.documentElement.style
    const prev = { b: b.background, h: h.background, o: b.overflow, ho: h.overflow, ob: b.overscrollBehavior }
    b.background = h.background = '#04051a'
    b.overflow = h.overflow = 'hidden'
    b.overscrollBehavior = 'none'
    return () => {
      b.background = prev.b
      h.background = prev.h
      b.overflow = prev.o
      h.overflow = prev.ho
      b.overscrollBehavior = prev.ob
      campus.reset()
    }
  }, [])

  useEffect(() => {
    if (view.kind !== 'home') campus.set({ aboutOpen: false })
    campus.set({ hoverItem: null, hoverBuilding: null })
  }, [view.kind, view.focus])

  // Escape steps back out of the world, one level at a time
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      const t = e.target as HTMLElement
      if (t.closest('input, textarea') && t.closest('form')) {
        ;(t as HTMLInputElement).blur()
        return
      }
      const st = campus.get()
      if (st.listOpen) return campus.set({ listOpen: false })
      if (st.aboutOpen) return campus.set({ aboutOpen: false })
      if (view.kind === 'project') return go(`${BASE}/work`)
      if (view.kind === 'team' && view.focus) return go(`${BASE}/team`)
      if (view.kind === 'journal' && view.focus) return go(`${BASE}/journal`)
      if (view.kind !== 'home') go(BASE)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [view, go])

  return (
    <div className={`cmp-root${listOpen ? ' is-list' : ''}`} data-view={view.kind}>
      <div className="cmp-stage" aria-hidden={listOpen || undefined}>
        {gl ? (
          <Suspense fallback={<div className="cmp-boot">Lighting the lamps…</div>}>
            <World view={view} reduced={reduced} mobile={mobile} go={go} />
          </Suspense>
        ) : (
          <div className="cmp-boot">This campus needs WebGL 2. The list view below has everything.</div>
        )}
        <Signs view={view} go={go} mobile={mobile} />
      </div>
      <Chrome view={view} go={go} mobile={mobile} />
      <Routes>
        <Route index element={<HomeLayer go={go} mobile={mobile} />} />
        <Route path="work" element={<WorkPanel go={go} />} />
        <Route path="work/:slug" element={<ProjectPanel go={go} />} />
        <Route path="team" element={<TeamPanel go={go} view={view} />} />
        <Route path="journal" element={<JournalPanel go={go} view={view} />} />
        <Route path="contact" element={<ContactPanel />} />
        <Route path="*" element={<Navigate to={BASE} replace />} />
      </Routes>
      {(listOpen || !gl) && <ListView go={go} />}
    </div>
  )
}
