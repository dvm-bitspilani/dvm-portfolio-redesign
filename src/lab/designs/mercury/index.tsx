import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import '@fontsource-variable/inter-tight'
import './mercury.css'
import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import Nav from './ui/Nav'
import Home from './pages/Home'
import Work from './pages/Work'
import ProjectDetail from './pages/ProjectDetail'
import Team from './pages/Team'
import Journal from './pages/Journal'
import Contact from './pages/Contact'

function ScrollReset() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function Mercury() {
  useEffect(() => {
    const prev = document.body.style.background
    document.body.style.background = '#000'
    document.documentElement.style.background = '#000'
    return () => {
      document.body.style.background = prev
      document.documentElement.style.background = ''
    }
  }, [])

  return (
    <div className="merc-root">
      <ScrollReset />
      <a className="merc-skip" href="#merc-main">
        Skip to content
      </a>
      <Nav />
      <Routes>
        <Route index element={<Home />} />
        <Route path="work" element={<Work />} />
        <Route path="work/:slug" element={<ProjectDetail />} />
        <Route path="team" element={<Team />} />
        <Route path="journal" element={<Journal />} />
        <Route path="contact" element={<Contact />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </div>
  )
}
