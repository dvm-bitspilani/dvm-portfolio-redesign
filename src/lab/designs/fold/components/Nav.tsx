import { NavLink } from 'react-router-dom'
import { designBase } from '../../registry'
import Mark from './Mark'

const base = designBase('fold')
const LINKS = [
  { to: `${base}/work`, label: 'Work' },
  { to: `${base}/team`, label: 'Team' },
  { to: `${base}/journal`, label: 'Journal' },
  { to: `${base}/contact`, label: 'Contact' },
]

export default function Nav() {
  return (
    <header className="fold-nav">
      <NavLink to={base} end className="fold-nav__brand" aria-label="DVM, home">
        <Mark className="fold-nav__mark" />
        <span>DVM</span>
      </NavLink>
      <nav aria-label="Primary">
        <ul>
          {LINKS.map((l) => (
            <li key={l.to}>
              <NavLink to={l.to} className={({ isActive }) => (isActive ? 'is-active' : undefined)}>
                {l.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
