import '@fontsource-variable/syne'
import '@fontsource-variable/manrope'
import './portal.css'
import { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { designBase } from '../registry'
import { Scene } from './scene/Scene'
import { disposeTextures } from './scene/textures'
import { disposeKit } from './worlds/kit'
import { api, store, usePortal } from './store'
import { Chrome } from './ui/Chrome'
import Home from './pages/Home'
import Work from './pages/Work'
import Team from './pages/Team'
import Journal from './pages/Journal'
import Contact from './pages/Contact'

function useEnvFlags() {
  useEffect(() => {
    const rm = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () =>
      store.set({
        reduced: rm.matches,
        mobile: window.innerWidth < 760 || window.matchMedia('(pointer: coarse)').matches,
      })
    update()
    rm.addEventListener('change', update)
    window.addEventListener('resize', update)
    return () => {
      rm.removeEventListener('change', update)
      window.removeEventListener('resize', update)
    }
  }, [])
}

/** Brief black dip used instead of flights under reduced motion. */
function CutFlash() {
  const cut = usePortal((s) => s.cut)
  const [on, setOn] = useState(false)
  useEffect(() => {
    if (!cut) return
    setOn(true)
    const t = window.setTimeout(() => setOn(false), 60)
    return () => window.clearTimeout(t)
  }, [cut])
  return <div className={`pt-cut${on ? ' is-on' : ''}`} aria-hidden="true" />
}

export default function PortalDesign() {
  useEnvFlags()
  const navigate = useNavigate()
  const reduced = usePortal((s) => s.reduced)
  const mobile = usePortal((s) => s.mobile)
  const [visible, setVisible] = useState(() => document.visibilityState === 'visible')

  useEffect(() => {
    api.navigate = (to: string) => navigate(to)
  }, [navigate])

  useEffect(() => {
    const onVis = () => setVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', onVis)
    const html = document.documentElement
    const prev = { o: document.body.style.overflow, ob: html.style.overscrollBehavior, bg: document.body.style.background }
    document.body.style.overflow = 'hidden'
    html.style.overscrollBehavior = 'none'
    document.body.style.background = '#03080b'
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      document.body.style.overflow = prev.o
      html.style.overscrollBehavior = prev.ob
      document.body.style.background = prev.bg
      document.body.style.cursor = ''
      disposeTextures()
      disposeKit()
    }
  }, [])

  return (
    <div className="pt-root">
      <Canvas
        className="pt-canvas"
        dpr={[1, mobile ? 1.5 : 2]}
        gl={{ stencil: true, antialias: false, powerPreference: 'high-performance' }}
        camera={{ fov: 40, near: 0.08, far: 260, position: [0, 0, 30] }}
        frameloop={visible ? 'always' : 'never'}
        aria-hidden="true"
      >
        <Suspense fallback={null}>
          <Scene reduced={reduced} mobile={mobile} />
        </Suspense>
      </Canvas>
      <div className="pt-layer">
        <Routes>
          <Route index element={<Home />} />
          <Route path="work" element={<Work />} />
          <Route path="work/:project" element={<Work />} />
          <Route path="team" element={<Team />} />
          <Route path="journal" element={<Journal />} />
          <Route path="contact" element={<Contact />} />
          <Route path="*" element={<Navigate to={designBase('portal')} replace />} />
        </Routes>
      </div>
      <Chrome />
      <CutFlash />
    </div>
  )
}
