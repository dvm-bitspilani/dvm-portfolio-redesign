import { projects } from '../../../data'
import VTLink from './VTLink'
import { href } from '../lib/vt'

/** Wire-service ticker of real projects. Pauses on hover/focus; static under reduced motion. */
export default function Ticker({ label = 'On the wire' }: { label?: string }) {
  const items = projects.map((p) => (
    <VTLink key={p.slug} to={href(`work/${p.slug}`)} className="pr-tick">
      <span className="pr-tick-t">{p.title}</span>
      <span className="pr-tick-m">
        {p.theme ?? p.fest}
        {p.year ? `, ${p.year}` : ''}
      </span>
    </VTLink>
  ))
  return (
    <div className="pr-ticker">
      <span className="pr-ticker-label">{label}</span>
      <div className="pr-ticker-win">
        <div className="pr-ticker-track">
          <div className="pr-ticker-run">{items}</div>
          <div className="pr-ticker-run" aria-hidden="true" inert>
            {items}
          </div>
        </div>
      </div>
    </div>
  )
}
