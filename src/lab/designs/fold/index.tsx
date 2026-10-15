import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import Lenis from 'lenis'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import '@fontsource-variable/bricolage-grotesque'
import './fold.css'
import Nav from './components/Nav'
import Home from './pages/Home'
import Work from './pages/Work'
import Project from './pages/Project'
import Team from './pages/Team'
import Journal from './pages/Journal'
import Contact from './pages/Contact'
import { usePrefersReducedMotion } from './components/hooks'

export default function FoldDesign() {
  const { pathname } = useLocation()
  const reduced = usePrefersReducedMotion()

  // body-level styles while this design is mounted
  useEffect(() => {
    const prev = document.body.style.background
    document.body.style.background = '#050404'
    document.documentElement.classList.add('fold-html')
    return () => {
      document.body.style.background = prev
      document.documentElement.classList.remove('fold-html')
    }
  }, [])

  // smooth scrolling (skipped for reduced motion)
  useEffect(() => {
    if (reduced) return
    const lenis = new Lenis({ autoRaf: true, lerp: 0.11 })
    return () => lenis.destroy()
  }, [reduced])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="fold-root">
      <a className="fold-skip" href="#fold-main">
        Skip to content
      </a>
      <Nav />
      <Routes>
        <Route index element={<Home />} />
        <Route path="work" element={<Work />} />
        <Route path="work/:slug" element={<Project />} />
        <Route path="team" element={<Team />} />
        <Route path="journal" element={<Journal />} />
        <Route path="contact" element={<Contact />} />
      </Routes>
    </div>
  )
}
