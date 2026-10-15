import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import '@fontsource-variable/bricolage-grotesque/standard.css'
import '@fontsource-variable/fraunces/full.css'
import '@fontsource-variable/fraunces/full-italic.css'
import '@fontsource-variable/big-shoulders-display'
import '@fontsource-variable/jetbrains-mono/wght.css'
import './press.css'
import { site, socials } from '../../data'
import VTLink from './components/VTLink'
import { BASE, href } from './lib/vt'
import Home from './pages/Home'
import Work from './pages/Work'
import Project from './pages/Project'
import Team from './pages/Team'
import Journal from './pages/Journal'
import Contact from './pages/Contact'

const SECTIONS = [
  { path: 'work', label: 'Work', letter: 'A' },
  { path: 'team', label: 'Team', letter: 'B' },
  { path: 'journal', label: 'Journal', letter: 'C' },
  { path: 'contact', label: 'Contact', letter: 'D' },
] as const

function Masthead() {
  const { pathname } = useLocation()
  const sub = pathname.slice(BASE.length).replace(/^\//, '').split('/')[0]
  return (
    <header className="pr-mast">
      <VTLink to={href()} className="pr-nameplate" aria-label="DVM Press, front page">
        <span data-vt-source>DVM</span>
        <span className="pr-nameplate-sub">Press</span>
      </VTLink>
      <nav className="pr-nav" aria-label="Sections">
        {SECTIONS.map((s) => (
          <VTLink key={s.path} to={href(s.path)} className="pr-nav-a" aria-current={sub === s.path ? 'page' : undefined}>
            <span className="pr-nav-sec" aria-hidden="true">
              {s.letter}
            </span>
            <span data-vt-source>{s.label}</span>
          </VTLink>
        ))}
      </nav>
    </header>
  )
}

function Colophon() {
  return (
    <footer className="pr-colophon">
      <div className="pr-colo-end">
        <div className="pr-colo-big" aria-hidden="true">
          –30–
        </div>
        <p className="pr-cap">
          <em>Thirty.</em> The old wire-service mark at the foot of a story: nothing follows.
        </p>
      </div>
      <div className="pr-colo-grid">
        <p>
          Printed without WebGL. Display type is Bricolage Grotesque on its weight and width axes; text is Fraunces; figures are Big Shoulders. Images are 1-bit Atkinson, Floyd–Steinberg and Bayer
          plates drawn on Canvas 2D.
        </p>
        <p>
          <em>{site.taglines.mischief}.</em>
        </p>
        <ul className="pr-colo-social">
          {socials.map((s) => (
            <li key={s.id}>
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.label}
              </a>
            </li>
          ))}
          <li>
            <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>
          </li>
        </ul>
      </div>
      <p className="pr-colo-fine">
        {site.fullName}, {site.institution}. Vol. 2026.
      </p>
    </footer>
  )
}

/** Body-level styles while this design is mounted (restored on unmount). */
function useDocumentChrome() {
  useEffect(() => {
    const html = document.documentElement
    const prevBg = document.body.style.background
    html.classList.add('press-active')
    document.body.style.background = '#0a0909'
    return () => {
      html.classList.remove('press-active', 'press-vt')
      document.body.style.background = prevBg
    }
  }, [])
}

export default function Press() {
  useDocumentChrome()
  return (
    <div className="press-root">
      <a className="pr-skip" href="#pr-main">
        Skip to content
      </a>
      <Masthead />
      <div id="pr-main">
        <Routes>
          <Route index element={<Home />} />
          <Route path="work" element={<Work />} />
          <Route path="work/:slug" element={<Project />} />
          <Route path="team" element={<Team />} />
          <Route path="journal" element={<Journal />} />
          <Route path="contact" element={<Contact />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </div>
      <Colophon />
    </div>
  )
}
