import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { designs, designBase, DESIGN_PAGES, LAB_BASE, type DesignEntry } from '../designs/registry'
import './hud.css'

/**
 * Floating lab controls shown on top of every design: jump between designs
 * (also with [ and ] keys) and between the pages of the current design.
 * Press H to hide/show. Hub returns to the preview hub at /.
 */
export default function DesignHUD({ current }: { current: DesignEntry }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [hidden, setHidden] = useState(false)
  const idx = designs.findIndex((d) => d.slug === current.slug)
  const base = designBase(current.slug)
  const sub = pathname.slice(base.length).replace(/^\//, '').split('/')[0]

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, [contenteditable]')) return
      if (e.key === ']' || e.key === '[') {
        const n = designs[(idx + (e.key === ']' ? 1 : -1) + designs.length) % designs.length]
        navigate(`${designBase(n.slug)}/${sub}`)
      } else if (e.key === 'h' || e.key === 'H') setHidden((h) => !h)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [idx, navigate, sub])

  if (hidden) return null
  return (
    <div className="lab-hud" style={{ ['--lab-accent' as string]: current.accent }}>
      <Link to="/" className="lab-hud__hub" title="Back to the preview hub">
        Hub
      </Link>
      <Link to={LAB_BASE} className="lab-hud__home" title="All designs">
        DVM/LAB
      </Link>
      <button className="lab-hud__design" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="lab-hud__num">{String(idx + 1).padStart(2, '0')}</span>
        {current.name}
        <span aria-hidden>▾</span>
      </button>
      <nav className="lab-hud__pages">
        {DESIGN_PAGES.map((p) => (
          <Link key={p.path} to={`${base}/${p.path}`} className={sub === p.path ? 'is-active' : ''}>
            {p.label}
          </Link>
        ))}
      </nav>
      {open && (
        <ul className="lab-hud__menu" onMouseLeave={() => setOpen(false)}>
          {designs.map((d, i) => (
            <li key={d.slug}>
              <Link to={`${designBase(d.slug)}/${sub}`} onClick={() => setOpen(false)} style={{ ['--c' as string]: d.accent }}>
                <span className="lab-hud__num">{String(i + 1).padStart(2, '0')}</span>
                <b>{d.name}</b>
                <small>{d.medium}</small>
              </Link>
            </li>
          ))}
          <li className="lab-hud__hint">[ ] switch design · H hide</li>
        </ul>
      )}
    </div>
  )
}
