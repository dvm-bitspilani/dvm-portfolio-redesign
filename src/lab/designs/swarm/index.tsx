import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import '@fontsource-variable/unbounded'
import '@fontsource-variable/space-grotesk'
import './swarm.css'
import { designBase } from '../registry'
import { Director } from './engine/director'
import { DirectorContext } from './engine/formations'
import SwarmCanvas from './engine/SwarmCanvas'
import Home from './pages/Home'
import Work from './pages/Work'
import ProjectPage from './pages/Project'
import Team from './pages/Team'
import Journal from './pages/Journal'
import Contact from './pages/Contact'

const BASE = designBase('swarm')

function createDirector() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const mobile = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 760
  // 448² = 200,704 particles on desktop; 256² = 65,536 on phones.
  return new Director(mobile ? 256 : 448, reduced, mobile)
}

export default function SwarmDesign() {
  const [director] = useState(createDirector)
  const lenis = useRef<Lenis | null>(null)
  const { pathname } = useLocation()

  useEffect(() => () => director.dispose(), [director])

  useEffect(() => {
    if (director.reduced) return
    const l = new Lenis({ autoRaf: true, lerp: 0.09 })
    lenis.current = l
    return () => {
      l.destroy()
      lenis.current = null
    }
  }, [director])

  useEffect(() => {
    if (lenis.current) lenis.current.scrollTo(0, { immediate: true, force: true })
    else window.scrollTo(0, 0)
  }, [pathname])

  return (
    <DirectorContext.Provider value={director}>
      <div className="sw-root">
        <SwarmCanvas director={director} />
        <header className="sw-nav">
          <Link to={BASE} className="sw-mark" aria-label="DVM, home">
            DVM
          </Link>
          <nav aria-label="Primary">
            <NavLink to={`${BASE}/work`}>Work</NavLink>
            <NavLink to={`${BASE}/team`}>Team</NavLink>
            <NavLink to={`${BASE}/journal`}>Journal</NavLink>
            <NavLink to={`${BASE}/contact`}>Contact</NavLink>
          </nav>
        </header>
        <main className="sw-main" key={pathname}>
          <Routes>
            <Route index element={<Home />} />
            <Route path="work" element={<Work />} />
            <Route path="work/:slug" element={<ProjectPage />} />
            <Route path="team" element={<Team />} />
            <Route path="journal" element={<Journal />} />
            <Route path="contact" element={<Contact />} />
            <Route path="*" element={<Navigate to={BASE} replace />} />
          </Routes>
        </main>
      </div>
    </DirectorContext.Provider>
  )
}
