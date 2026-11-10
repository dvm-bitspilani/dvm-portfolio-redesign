import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { original, variantEntries, kitEntries, type Entry } from './catalog'
import { LOGO_PATHS, LOGO_TRANSFORM, LOGO_VIEWBOX } from '../immersive/shared/logo'
// V8's knobs: a tiny import-free module (V8's own chunk stays out of the hub bundle)
import { V8_TEAMS, V8_TEAM_NAMES, V8_TEAM_TITLES, getV8Controls, setV8Team, subscribeV8Controls } from '../variants/v8/controls'
import s from './switcher.module.css'

/**
 * One switcher for the whole preview app: Hub · Original · V1…V7 · Lab · Kit.
 * Bottom-left, V hides it. On /lab the lab's own HUD (which has a Hub link) takes over, so this
 * one is not rendered there. Phones get a single button that opens the full list.
 * On /v/v8 it is V8's own control strip instead: Hub (and, on /v/v8/team, which version of the
 * team page: A · Wall / B · Credits / C · Lineage / Current).
 */
type Where = { key: string; label: string }

function useWhere(pathname: string): Where {
  if (pathname === '/') return { key: 'hub', label: 'Hub' }
  if (pathname.startsWith('/original')) return { key: 'original', label: 'Original' }
  if (pathname.startsWith('/kit/')) {
    const k = pathname.split('/')[2]
    return { key: 'kit', label: kitEntries.find((e) => e.key === `kit-${k}`)?.name ?? 'Kit' }
  }
  if (pathname.startsWith('/v/')) {
    const id = pathname.split('/')[2]
    const v = variantEntries.find((e) => e.key === id)
    return { key: id, label: v ? `${v.code ?? ''} ${v.name}`.trim() : id }
  }
  return { key: '', label: 'Menu' }
}

const isV8 = (pathname: string) => pathname === '/v/v8' || pathname.startsWith('/v/v8/')
const isV8Team = (pathname: string) => pathname.replace(/\/+$/, '') === '/v/v8/team'

/** V8, on the team page only: which version of /team is shown (applies at once, remembered). */
function V8TeamKnob() {
  const { team } = useSyncExternalStore(subscribeV8Controls, getV8Controls, getV8Controls)
  const { search, hash } = useLocation()
  const navigate = useNavigate()
  const pick = (id: string) => {
    setV8Team(id)
    // a ?team= in the address would win again on reload: keep it in step with the choice
    const q = new URLSearchParams(search)
    if (q.has('team') && q.get('team') !== id) {
      q.set('team', id)
      navigate({ search: `?${q}`, hash }, { replace: true, preventScrollReset: true })
    }
  }
  return (
    <span className={s.cluster}>
      <span className={s.label} id="v8-team-label">
        Team
      </span>
      <span className={s.set} role="group" aria-labelledby="v8-team-label">
        {V8_TEAMS.map((id) => (
          <button key={id} type="button" className={s.item} aria-pressed={team === id} title={V8_TEAM_TITLES[id]} onClick={() => pick(id)}>
            {V8_TEAM_NAMES[id]}
          </button>
        ))}
      </span>
    </span>
  )
}

export default function Switcher() {
  const { pathname } = useLocation()
  const [hidden, setHidden] = useState(false)
  const [menu, setMenu] = useState<null | 'kit' | 'all'>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const where = useWhere(pathname)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if ((e.target as HTMLElement | null)?.closest?.('input, textarea, select, [contenteditable]')) return
      if (e.key === 'v' || e.key === 'V') setHidden((h) => !h)
      else if (e.key === 'Escape') setMenu(null)
    }
    const onDown = (e: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setMenu(null)
    }
    addEventListener('keydown', onKey)
    addEventListener('pointerdown', onDown)
    return () => {
      removeEventListener('keydown', onKey)
      removeEventListener('pointerdown', onDown)
    }
  }, [])

  useEffect(() => setMenu(null), [pathname])

  if (hidden || pathname === '/lab' || pathname.startsWith('/lab/')) return null

  if (isV8(pathname))
    return (
      <div ref={wrap} className={`${s.wrap} ${s.v8}`} data-dvm-switcher="">
        <Link to="/" className={`${s.item} ${s.hub}`} title="Hub: everything in one place">
          <svg viewBox={`0 0 ${LOGO_VIEWBOX} ${LOGO_VIEWBOX}`} aria-hidden="true">
            <g transform={`translate(${LOGO_TRANSFORM.x} ${LOGO_TRANSFORM.y})`}>
              {LOGO_PATHS.map((d) => (
                <path key={d} d={d} />
              ))}
            </g>
          </svg>
          <span className={s.hubLabel}>Hub</span>
        </Link>
        {isV8Team(pathname) && <V8TeamKnob />}
      </div>
    )

  const close = () => setMenu(null)
  const current = (e: Entry) => (pathname === e.to || pathname.startsWith(`${e.to}/`) ? 'page' : undefined)
  const item = (e: Entry, label: string, cls = s.item) =>
    e.ready ? (
      <Link key={e.key} to={e.to} className={cls} aria-current={current(e)} title={label} onClick={close}>
        {e.code ?? e.name}
      </Link>
    ) : (
      <span key={e.key} className={`${cls} ${s.off}`} title={`${label} (being built)`}>
        {e.code ?? e.name}
      </span>
    )

  const row = (e: Entry, label?: string) =>
    e.ready ? (
      <Link key={e.key} to={e.to} className={s.row} aria-current={current(e)} onClick={close}>
        {e.code && <b>{e.code}</b>}
        <span>{label ?? e.name}</span>
      </Link>
    ) : (
      <span key={e.key} className={`${s.row} ${s.off}`}>
        {e.code && <b>{e.code}</b>}
        <span>{e.name} (being built)</span>
      </span>
    )

  return (
    <div ref={wrap} className={s.wrap} data-dvm-switcher="">
      <Link to="/" className={`${s.item} ${s.hub}`} aria-current={where.key === 'hub' ? 'page' : undefined} title="Hub: everything in one place" onClick={close}>
        <svg viewBox={`0 0 ${LOGO_VIEWBOX} ${LOGO_VIEWBOX}`} aria-hidden="true">
          <g transform={`translate(${LOGO_TRANSFORM.x} ${LOGO_TRANSFORM.y})`}>
            {LOGO_PATHS.map((d) => (
              <path key={d} d={d} />
            ))}
          </g>
        </svg>
        <span className={s.hubLabel}>Hub</span>
      </Link>

      <div className={s.wide}>
        {item(original, 'The original redesign')}
        {variantEntries.map((v) => item(v, `${v.code} · ${v.name}`))}
        <Link to="/lab" className={s.item} title="Concept lab: the nine first designs" onClick={close}>
          Lab
        </Link>
        {kitEntries.length > 0 && (
          <button
            type="button"
            className={s.item}
            aria-expanded={menu === 'kit'}
            aria-current={where.key === 'kit' ? 'page' : undefined}
            onClick={() => setMenu((m) => (m === 'kit' ? null : 'kit'))}
          >
            Kit <span aria-hidden="true">▾</span>
          </button>
        )}
      </div>

      <button type="button" className={`${s.item} ${s.narrow}`} aria-expanded={menu === 'all'} onClick={() => setMenu((m) => (m === 'all' ? null : 'all'))}>
        {where.label} <span aria-hidden="true">▾</span>
      </button>

      {menu && (
        <div className={s.menu} role="menu">
          {menu === 'all' && (
            <>
              <p className={s.group}>The redesign</p>
              {row(original)}
              {variantEntries.map((v) => row(v))}
              <p className={s.group}>Concept lab</p>
              <Link to="/lab" className={s.row} onClick={close}>
                <span>Lab gallery</span>
              </Link>
            </>
          )}
          <p className={s.group}>Components</p>
          {kitEntries.map((k) => row(k))}
          <p className={s.hint}>Press V to hide this bar</p>
        </div>
      )}
    </div>
  )
}
