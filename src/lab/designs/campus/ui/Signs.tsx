import type { MouseEvent } from 'react'
import { artworks, blogs, team } from '../../../data'
import { BASE, BUILDINGS, VERTICAL_COLOR, exhibitProjects, verticalById, type View } from '../content'
import { campus, registerSign, useCampus } from '../store'
import { wedgeAnchors } from '../world/layout'

const titleFor = (key: string) => {
  const [k, slug] = [key.slice(0, 1), key.slice(2)]
  if (k === 'p') {
    const p = exhibitProjects.find((x) => x.slug === slug)
    return p ? { title: p.title, sub: `${p.fest}${p.year ? `, ${p.year}` : ''}` } : null
  }
  if (k === 'm') {
    const m = team.find((x) => x.slug === slug)
    return m ? { title: m.name, sub: m.designation ?? `${verticalById[m.vertical].label}, joined ${m.batch}` } : null
  }
  if (k === 'b') {
    const b = blogs.find((x) => x.slug === slug)
    return b ? { title: b.shortTitle ?? b.title, sub: `${b.authors.join(' & ')}, ${b.readMinutes} min read` } : null
  }
  if (k === 'a') {
    const a = artworks.find((x) => x.slug === slug)
    return a ? { title: a.title, sub: `${a.artist}, ${a.year}` } : null
  }
  return null
}

/** Diegetic signs, positioned in screen space by the scene (see SignProjector). */
export function Signs({ view, go, mobile }: { view: View; go: (to: string) => void; mobile: boolean }) {
  const introDone = useCampus((s) => s.introDone)
  const hoverB = useCampus((s) => s.hoverBuilding)
  const hoverItem = useCampus((s) => s.hoverItem)
  const filter = useCampus((s) => s.teamFilter)
  const aboutOpen = useCampus((s) => s.aboutOpen)
  const home = view.kind === 'home'
  const cap = hoverItem ? titleFor(hoverItem) : null

  const open = (e: MouseEvent, route: string, id: string) => {
    e.preventDefault()
    if (id === 'monument') {
      campus.set({ aboutOpen: !campus.get().aboutOpen })
      return
    }
    go(`${BASE}/${route}`)
  }

  return (
    <div className="cmp-signs">
      {BUILDINGS.map((b, i) => (
        <a
          key={b.id}
          ref={registerSign(b.id)}
          href={b.route ? `${BASE}/${b.route}` : BASE}
          className={`cmp-sign${hoverB === b.id ? ' is-hot' : ''}${home && introDone && !(aboutOpen && b.id !== 'monument') ? ' is-on' : ''}${b.id === 'monument' ? ' is-mark' : ''}`}
          style={{ ['--i' as string]: i }}
          tabIndex={home ? 0 : -1}
          aria-hidden={!home || undefined}
          onClick={(e) => open(e, b.route, b.id)}
          onPointerEnter={() => campus.set({ hoverBuilding: b.id })}
          onPointerLeave={() => campus.get().hoverBuilding === b.id && campus.set({ hoverBuilding: null })}
          onFocus={() => campus.set({ hoverBuilding: b.id })}
          onBlur={() => campus.get().hoverBuilding === b.id && campus.set({ hoverBuilding: null })}
        >
          <span className="cmp-sign__plate">
            <b>{b.name}</b>
            {!mobile && <small>{b.sub}</small>}
          </span>
          <span className="cmp-sign__stem" aria-hidden="true" />
        </a>
      ))}

      {wedgeAnchors.map((w) => (
        <button
          key={w.v}
          ref={registerSign(`wedge:${w.v}`)}
          type="button"
          className={`cmp-wedge${view.kind === 'team' && !view.focus ? ' is-on' : ''}${filter === w.v ? ' is-hot' : ''}`}
          style={{ ['--c' as string]: VERTICAL_COLOR[w.v] }}
          tabIndex={-1}
          aria-hidden="true"
          onClick={() => campus.set({ teamFilter: filter === w.v ? null : w.v })}
        >
          <i />
          {verticalById[w.v].label}
          <small>{w.count}</small>
        </button>
      ))}

      <div ref={registerSign('caption')} className={`cmp-caption${cap && !home ? ' is-on' : ''}`} aria-hidden="true">
        {cap && (
          <span>
            <b>{cap.title}</b>
            <small>{cap.sub}</small>
          </span>
        )}
      </div>
    </div>
  )
}
