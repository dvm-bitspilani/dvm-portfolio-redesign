import * as THREE from 'three'
import { useEffect } from 'react'
import { team, verticals } from '../../../data'
import type { Socials } from '../../../data'
import { TEAM_BATCHES, TEAM_ORIGIN, VERTICAL_COLOR, batchZ, teamStars, verticalAngle } from '../layout'
import { store, usePortal } from '../store'
import { Anchor } from '../ui/anchors'
import { useTarget } from './shared'

const SOCIAL_LABEL: Record<keyof Socials, string> = {
  github: 'GitHub',
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
  twitter: 'Twitter',
  dribbble: 'Dribbble',
  behance: 'Behance',
  facebook: 'Facebook',
}
const vName = (id: string) => verticals.find((v) => v.id === id)?.label ?? id
const at = (v: THREE.Vector3) => v.clone().add(TEAM_ORIGIN)

export default function Team() {
  useTarget({ kind: 'team' })
  const filter = usePortal((s) => s.teamFilter)
  const hover = usePortal((s) => s.teamHover)
  const pinned = usePortal((s) => s.teamPinned)
  const region = usePortal((s) => s.region)
  const shown = hover ?? pinned
  const star = shown !== null ? teamStars[shown] : null

  useEffect(
    () => () => {
      store.set({ teamHover: null, teamPinned: null })
    },
    [],
  )

  const counts = verticals.map((v) => team.filter((m) => m.vertical === v.id).length)

  return (
    <>
      <div className="pt-subnav pt-filter" role="group" aria-label="Filter by team">
        <button type="button" className={filter === null ? 'is-on' : ''} aria-pressed={filter === null} onClick={() => store.set({ teamFilter: null })}>
          Everyone <span className="pt-count">{team.length}</span>
        </button>
        {verticals.map((v, i) => (
          <button
            key={v.id}
            type="button"
            className={filter === v.id ? 'is-on' : ''}
            aria-pressed={filter === v.id}
            style={{ ['--vc' as string]: VERTICAL_COLOR[v.id] }}
            onClick={() => store.set({ teamFilter: filter === v.id ? null : v.id })}
          >
            {v.label} <span className="pt-count">{counts[i]}</span>
          </button>
        ))}
      </div>

      {region === 'team' && !star && (
        <h1 className="pt-world-title" aria-live="polite">
          {filter ? verticals.find((v) => v.id === filter)!.name : `${team.length} members`}
        </h1>
      )}

      {/* batch years float at the centre of each slice */}
      {TEAM_BATCHES.map((b) => (
        <Anchor key={b} at={at(new THREE.Vector3(0, 0, batchZ(b)))} near={2.5} far={34} refDist={8} maxS={2.2} className="pt-batch">
          <span>{b}</span>
        </Anchor>
      ))}
      {/* arm names on the newest slice */}
      {verticals.map((v) => {
        const a = verticalAngle(v.id)
        return (
          <Anchor key={v.id} at={at(new THREE.Vector3(Math.cos(a) * 7.4, Math.sin(a) * 5.6, 2))} near={3} far={28} refDist={9} className="pt-arm">
            <span style={{ color: VERTICAL_COLOR[v.id] }}>{v.name}</span>
          </Anchor>
        )
      })}

      {star && (
        <Anchor at={at(star.pos)} near={0.5} far={60} align="left" className="pt-member-anchor">
          <div className={`pt-member${pinned === shown ? ' is-pinned' : ''}`} style={{ ['--vc' as string]: VERTICAL_COLOR[star.m.vertical] }}>
            <img src={star.m.photo} alt="" width={72} height={72} />
            <div>
              <p className="pt-member-name">{star.m.name}</p>
              <p className="pt-member-meta">
                {vName(star.m.vertical)}, joined {star.m.batch}
              </p>
              {star.m.designation && <p className="pt-member-role">{star.m.designation}</p>}
              {pinned === shown && (
                <p className="pt-member-links">
                  {(Object.keys(star.m.socials) as (keyof Socials)[]).map((k) => (
                    <a key={k} href={star.m.socials[k]} target="_blank" rel="noreferrer">
                      {SOCIAL_LABEL[k]}
                    </a>
                  ))}
                </p>
              )}
              {pinned !== shown && <p className="pt-member-tip">Click to pin</p>}
            </div>
          </div>
        </Anchor>
      )}

      <section className="pt-sr" aria-label="Team">
        <h1>The team: {team.length} members</h1>
        {verticals.map((v) => (
          <div key={v.id}>
            <h2>{v.name}</h2>
            <p>{v.description}</p>
            <ul>
              {team
                .filter((m) => m.vertical === v.id)
                .map((m) => (
                  <li key={m.slug}>
                    {m.name}, joined {m.batch}
                    {m.designation ? `, ${m.designation}` : ''}
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </section>
    </>
  )
}
