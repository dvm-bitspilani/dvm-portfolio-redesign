import { NavLink } from 'react-router-dom'
import { designBase } from '../../registry'
import { HOME_STATIONS, portalById, worldItems } from '../layout'
import { api, live, usePortal } from '../store'
import { LOGO_PATHS, LOGO_TRANSFORM } from '../../../shared/logo'

export function MarkGlyph({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="-6 -6 387.62 387.62" aria-hidden="true">
      <g transform={`translate(${LOGO_TRANSFORM.x} ${LOGO_TRANSFORM.y})`} fill="currentColor">
        {LOGO_PATHS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </svg>
  )
}

function Hint() {
  const target = usePortal((s) => s.target)
  const station = usePortal((s) => s.station)
  const selected = usePortal((s) => s.selected)
  const flying = usePortal((s) => s.flying)
  const mobile = usePortal((s) => s.mobile)
  const region = usePortal((s) => s.region)
  let text = ''
  if (flying) text = ''
  else if (target.kind === 'home') {
    if (station === 0) text = mobile ? 'Swipe up to go through the mark' : 'Scroll to go through the mark'
    else if (station < 4) text = mobile ? 'Keep swiping' : 'Keep scrolling'
    else
      text = mobile
        ? `Swipe sideways to choose. Swipe up to enter ${portalById(selected).label}`
        : `Pick a world, or keep scrolling into ${portalById(selected).label}`
  } else if (target.kind === 'world') {
    text = target.focus ? (mobile ? '' : 'Esc steps back') : mobile ? 'Swipe to travel, swipe back to leave' : 'Scroll to travel, scroll back to leave'
  } else if (target.kind === 'team') text = region === 'team' ? 'Scroll through the batches, hover a star' : ''
  else if (target.kind === 'contact') text = mobile ? 'Swipe up to go back through the gate' : 'Scroll to go back through the gate'
  return (
    <p className="pt-hint" aria-live="polite">
      <span key={text}>{text}</span>
    </p>
  )
}

function Stations() {
  const target = usePortal((s) => s.target)
  const station = usePortal((s) => s.station)
  const itemIndex = usePortal((s) => s.itemIndex)
  const space = usePortal((s) => s.space)
  if (target.kind === 'home')
    return (
      <ol className="pt-stations" aria-label="Stations along the journey">
        {HOME_STATIONS.map((label, i) => (
          <li key={label}>
            <button type="button" className={i === station ? 'is-on' : ''} aria-current={i === station ? 'step' : undefined} onClick={() => api.goStation(i)}>
              <span className="pt-st-label">{label}</span>
              <span className="pt-st-tick" />
            </button>
          </li>
        ))}
      </ol>
    )
  if (space !== 'outside' && target.kind === 'world') {
    const n = worldItems(space).length
    return (
      <div className="pt-counter" aria-hidden="true">
        <span className="pt-counter-n">{String(itemIndex + 1).padStart(2, '0')}</span>
        <span className="pt-counter-of">of {n}</span>
      </div>
    )
  }
  return null
}

export function Chrome() {
  const base = designBase('portal')
  const space = usePortal((s) => s.space)
  const region = usePortal((s) => s.region)
  const where =
    space === 'code' ? 'Code world' : space === 'film' ? 'Film world' : space === 'design' ? 'Design world' : region === 'team' ? 'Constellation' : region === 'front' ? 'Before the gate' : 'The corridor'
  return (
    <>
      <nav className="pt-nav" aria-label="Main">
        <NavLink to={`${base}/work`} className={({ isActive }) => (isActive ? 'is-on' : '')}>
          Work
        </NavLink>
        <NavLink to={`${base}/team`} className={({ isActive }) => (isActive ? 'is-on' : '')}>
          Team
        </NavLink>
        <NavLink to={base} end className={({ isActive }) => `pt-nav-mark${isActive ? ' is-on' : ''}`} aria-label="DVM, home">
          <MarkGlyph size={26} />
        </NavLink>
        <NavLink to={`${base}/journal`} className={({ isActive }) => (isActive ? 'is-on' : '')}>
          Journal
        </NavLink>
        <NavLink to={`${base}/contact`} className={({ isActive }) => (isActive ? 'is-on' : '')}>
          Contact
        </NavLink>
      </nav>
      <div className="pt-gauge" aria-hidden="true">
        <span className="pt-gauge-n" ref={(el) => void (live.gaugeEl = el)}>
          0.0
        </span>
        <span className="pt-gauge-l" ref={(el) => void (live.gaugeLabelEl = el)}>
          depth, m
        </span>
        <span className="pt-gauge-where">{where}</span>
      </div>
      <Stations />
      <Hint />
    </>
  )
}
