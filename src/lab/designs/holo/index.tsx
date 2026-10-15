import '@fontsource-variable/unbounded'
import '@fontsource-variable/jetbrains-mono'
import './holo.css'
import { useEffect, useState } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { designBase } from '../registry'
import { artworks, blogs, projects, team } from '../../data'
import Home from './pages/Home'
import Work from './pages/Work'
import ProjectDetail from './pages/ProjectDetail'
import Team from './pages/Team'
import Journal from './pages/Journal'
import Contact from './pages/Contact'

const base = designBase('holo')

const NAV = [
  { to: `${base}/work`, label: 'Work', freq: String(projects.length) },
  { to: `${base}/team`, label: 'Team', freq: String(team.length) },
  { to: `${base}/journal`, label: 'Journal', freq: String(blogs.length + artworks.length) },
  { to: `${base}/contact`, label: 'Contact', freq: 'TX' },
]

function Nav() {
  return (
    <header className="holo-nav">
      <NavLink to={base} end className="holo-nav__mark" aria-label="DVM home">
        <span className="holo-wordmark">DVM</span>
        <span className="holo-nav__sub">Department of Visual Media</span>
      </NavLink>
      <nav aria-label="Primary">
        <ul>
          {NAV.map((n) => (
            <li key={n.to}>
              <NavLink to={n.to} className={({ isActive }) => (isActive ? 'is-active' : undefined)}>
                <span className="holo-nav__freq" aria-hidden="true">
                  {n.freq}
                </span>
                {n.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}

/** Horizontal tear that plays on every route change. */
function RouteTear() {
  const { pathname } = useLocation()
  const [key, setKey] = useState(0)
  useEffect(() => {
    window.scrollTo(0, 0)
    setKey((k) => k + 1)
  }, [pathname])
  if (key <= 1) return null
  return <div key={key} className="holo-tear" aria-hidden="true" />
}

export default function HoloDesign() {
  useEffect(() => {
    const b = document.body.style
    const h = document.documentElement.style
    const prev = { bg: b.background, hbg: h.background }
    b.background = '#020508'
    h.background = '#020508'
    return () => {
      b.background = prev.bg
      h.background = prev.hbg
    }
  }, [])

  return (
    <div className="holo-root">
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
        <filter id="holo-duotone" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="0.08 0.20 0.05 0 0
                    0.22 0.58 0.14 0 0.01
                    0.25 0.62 0.15 0 0.03
                    0    0    0    1 0"
          />
        </filter>
      </svg>
      <Nav />
      <RouteTear />
      <Routes>
        <Route index element={<Home />} />
        <Route path="work" element={<Work />} />
        <Route path="work/:slug" element={<ProjectDetail />} />
        <Route path="team" element={<Team />} />
        <Route path="journal" element={<Journal />} />
        <Route path="contact" element={<Contact />} />
      </Routes>
    </div>
  )
}
