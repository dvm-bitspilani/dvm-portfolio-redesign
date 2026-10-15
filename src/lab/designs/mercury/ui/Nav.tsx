import { Link, NavLink } from 'react-router-dom'
import { designBase } from '../../registry'
import { setEffectsPaused, useEffectsPaused } from './effects'

export const BASE = designBase('mercury')

const LINKS = [
  { to: 'work', label: 'Work' },
  { to: 'team', label: 'Team' },
  { to: 'journal', label: 'Journal' },
  { to: 'contact', label: 'Contact' },
]

export default function Nav() {
  const paused = useEffectsPaused()
  return (
    <header className="merc-nav">
      <Link to={BASE} className="merc-nav__mark" aria-label="DVM, home">
        DVM
      </Link>
      <nav aria-label="Primary" className="merc-nav__links">
        {LINKS.map((l) => (
          <NavLink key={l.to} to={`${BASE}/${l.to}`} className={({ isActive }) => (isActive ? 'is-active' : undefined)}>
            {l.label}
          </NavLink>
        ))}
      </nav>
      <button
        type="button"
        className="merc-nav__pause"
        aria-pressed={paused}
        onClick={() => setEffectsPaused(!paused)}
        title={paused ? 'Resume the liquid metal' : 'Freeze all motion'}
      >
        <span className="merc-nav__dot" aria-hidden="true" />
        {paused ? 'Motion off' : 'Motion on'}
      </button>
    </header>
  )
}
