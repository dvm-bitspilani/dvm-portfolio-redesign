import { useEffect, useState } from 'react'
import { projects, site, team, verticals } from '../../../data'
import { BASE, BUILDINGS, formatIst, type View } from '../content'
import { campus, useCampus } from '../store'

const NAMES: Record<View['kind'], string> = {
  home: '',
  work: 'The Studio',
  project: 'The Studio',
  team: 'The Amphitheatre',
  journal: 'The Library',
  contact: 'The Clock Tower',
}

export function useIstClock() {
  const [t, setT] = useState(() => formatIst())
  useEffect(() => {
    const id = window.setInterval(() => setT(formatIst()), 10000)
    return () => window.clearInterval(id)
  }, [])
  return t
}

const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M9.5 3.5 5 8l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export function Chrome({ view, go, mobile }: { view: View; go: (to: string) => void; mobile: boolean }) {
  const listOpen = useCampus((s) => s.listOpen)
  const time = useIstClock()
  const home = view.kind === 'home'
  return (
    <header className="cmp-chrome">
      {home ? (
        <a
          className="cmp-brand"
          href={BASE}
          onClick={(e) => {
            e.preventDefault()
            campus.set({ aboutOpen: !campus.get().aboutOpen })
          }}
        >
          <span className="cmp-brand__mark">DVM</span>
          <span className="cmp-brand__sub">Department of Visual Media, BITS Pilani</span>
        </a>
      ) : (
        <a
          className="cmp-back"
          href={BASE}
          onClick={(e) => {
            e.preventDefault()
            go(BASE)
          }}
        >
          <BackIcon />
          <span>
            Back to campus
            {!mobile && <small>{NAMES[view.kind]}</small>}
          </span>
        </a>
      )}
      <div className="cmp-chrome__right">
        {!mobile && (
          <span className="cmp-time" title="Time in Pilani (IST). The clock tower keeps the same time.">
            {time} in Pilani
          </span>
        )}
        <button type="button" className="cmp-listbtn" aria-pressed={listOpen} onClick={() => campus.set({ listOpen: !listOpen })}>
          {listOpen ? 'Back to the world' : 'List view'}
        </button>
      </div>
    </header>
  )
}

export function HomeLayer({ go, mobile }: { go: (to: string) => void; mobile: boolean }) {
  const introDone = useCampus((s) => s.introDone)
  const aboutOpen = useCampus((s) => s.aboutOpen)
  const fests = 3
  return (
    <>
      <h1 className="cmp-sr">DVM, the Department of Visual Media at BITS Pilani</h1>
      <nav className="cmp-sr" aria-label="Campus buildings">
        <ul>
          {BUILDINGS.filter((b) => b.route).map((b) => (
            <li key={b.id}>
              <a
                href={`${BASE}/${b.route}`}
                onClick={(e) => {
                  e.preventDefault()
                  go(`${BASE}/${b.route}`)
                }}
              >
                {b.name}: {b.sub}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <p className={`cmp-hint${introDone && !aboutOpen ? ' is-on' : ''}`}>
        <svg width="22" height="14" viewBox="0 0 22 14" aria-hidden="true">
          <path d="M2 7h18M2 7l3-3M2 7l3 3M20 7l-3-3M20 7l-3 3" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        {mobile ? 'Drag to look around. Tap a building to go in.' : 'Drag to look around. Pick a building to step inside.'}
      </p>
      {aboutOpen && (
        <section className="cmp-about" aria-labelledby="cmp-about-h">
          <button type="button" className="cmp-x" aria-label="Close" onClick={() => campus.set({ aboutOpen: false })}>
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
          <h2 id="cmp-about-h">{site.headline}</h2>
          <p className="cmp-about__lede">{site.about[0]}</p>
          <p>{site.about[1]}</p>
          <dl className="cmp-about__stats">
            <div>
              <dt>5000+</dt>
              <dd>people on our apps and sites during a fest</dd>
            </div>
            <div>
              <dt>{fests}</dt>
              <dd>fests a year: BOSM, Oasis and APOGEE</dd>
            </div>
            <div>
              <dt>{verticals.length}</dt>
              <dd>teams, {team.length} members, {projects.length} projects on record</dd>
            </div>
          </dl>
          <p className="cmp-about__egg">“{site.taglines.mischief}.”</p>
        </section>
      )}
    </>
  )
}
