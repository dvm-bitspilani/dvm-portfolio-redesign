import { useState } from 'react'
import { Link } from 'react-router-dom'
import { projects, site, stats, team, verticals } from '../../../data'
import { designBase } from '../../registry'
import { GATE_POS, GATE_S, PORTALS, PORTAL_W, RINGS, portalRest } from '../layout'
import { api, store, usePortal } from '../store'
import { Anchor } from '../ui/anchors'
import { useTarget } from './shared'
import * as THREE from 'three'

const ring = (i: number) => RINGS[i]

/** Positions around the teams frame: a pentagon echoing the constellation arms. */
const teamSpots = verticals.map((_, i) => {
  const a = Math.PI / 2 + i * ((Math.PI * 2) / 5)
  return [Math.cos(a) * 3.15, Math.sin(a) * 2.25 + 0.55] as const
})

export default function Home() {
  useTarget({ kind: 'home' })
  const base = designBase('portal')
  const [teamHover, setTeamHover] = useState<number | null>(null)
  const selected = usePortal((s) => s.selected)
  const hoverPortal = usePortal((s) => s.hoverPortal)
  const users = stats[0]

  return (
    <>
      <h1 className="pt-sr">DVM, the Department of Visual Media at BITS Pilani</h1>

      {/* before the gate */}
      <Anchor at={[GATE_POS.x, GATE_POS.y - GATE_S / 2 - 1.05, 0.8]} near={9} far={44} className="pt-gate-cap">
        <p className="pt-cap-big" aria-hidden="true">
          Department of Visual Media
        </p>
        <p className="pt-cap-small" aria-hidden="true">
          BITS Pilani
        </p>
      </Anchor>

      {/* frame 1: who we are */}
      <Anchor at={[0, 1.55, ring(0).z]} near={4.5} far={17} refDist={9} className="pt-ring-copy">
        <h2 className="pt-h-ring">{site.headline}</h2>
      </Anchor>
      <Anchor at={[0, -0.35, ring(0).z]} near={4.5} far={16} refDist={9} className="pt-ring-copy">
        <p className="pt-body pt-measure">{site.about[0]}</p>
        <p className="pt-body pt-measure pt-dim">{site.about[1]}</p>
      </Anchor>

      {/* frame 2: in numbers */}
      <Anchor at={[-2.75, -0.3, ring(1).z]} near={4.5} far={17} refDist={9} className="pt-stat">
        <p className="pt-stat-n">{users.display}</p>
        <p className="pt-stat-l">users on our apps and websites during the fests</p>
      </Anchor>
      <Anchor at={[0, 1.2, ring(1).z]} near={4.5} far={17} refDist={9} className="pt-stat">
        <p className="pt-stat-n">{projects.length}</p>
        <p className="pt-stat-l">projects in the archive, from websites to curtain raisers</p>
      </Anchor>
      <Anchor at={[2.75, -0.3, ring(1).z]} near={4.5} far={17} refDist={9} className="pt-stat">
        <p className="pt-stat-n">{team.length}</p>
        <p className="pt-stat-l">members on record since 2017</p>
      </Anchor>
      <Anchor at={[0, -1.75, ring(1).z]} near={4.5} far={16} refDist={9} className="pt-ring-copy">
        <p className="pt-body pt-dim pt-measure-s">{site.about[2]}</p>
      </Anchor>

      {/* frame 3: five teams */}
      {verticals.map((v, i) => (
        <Anchor key={v.id} at={[teamSpots[i][0], teamSpots[i][1], ring(2).z]} near={4.5} far={17} refDist={9} className="pt-team-name">
          <Link
            to={`${base}/team`}
            onClick={() => store.set({ teamFilter: v.id })}
            onMouseEnter={() => setTeamHover(i)}
            onMouseLeave={() => setTeamHover(null)}
            onFocus={() => setTeamHover(i)}
            onBlur={() => setTeamHover(null)}
            className={teamHover === i ? 'is-on' : ''}
          >
            {v.name}
          </Link>
        </Anchor>
      ))}
      <Anchor at={[0, 0.35, ring(2).z]} near={4.5} far={16} refDist={9} className="pt-ring-copy">
        <p className="pt-body pt-measure-s pt-team-desc">{teamHover === null ? site.about[3] : verticals[teamHover].description}</p>
      </Anchor>

      {/* the three portals */}
      {PORTALS.map((p) => {
        const below = new THREE.Vector3(0, -PORTAL_W * 0.72 - 0.55, 0.4).applyMatrix4(portalRest(p.id).m)
        const on = (hoverPortal ?? selected) === p.id
        return (
          <Anchor key={p.id} at={below} near={4} far={24} refDist={14} maxS={1.25} className={`pt-portal-label${on ? ' is-on' : ''}`}>
            <Link
              to={`${base}/${p.route}`}
              onMouseEnter={() => store.set({ selected: p.id, hoverPortal: p.id })}
              onMouseLeave={() => store.set({ hoverPortal: null })}
              onFocus={() => {
                store.set({ selected: p.id })
                if (store.get().station !== 4) api.goStation(4)
              }}
            >
              <span className="pt-pl-name" style={{ color: p.tint }}>
                {p.label}
              </span>
              <span className="pt-pl-blurb">{p.blurb}</span>
            </Link>
          </Anchor>
        )
      })}

      <section className="pt-sr" aria-label="About DVM">
        <h2>{site.headline}</h2>
        {site.about.map((a) => (
          <p key={a}>{a}</p>
        ))}
        <h2>In numbers</h2>
        <ul>
          <li>{users.display} users</li>
          <li>{projects.length} projects</li>
          <li>{team.length} members</li>
        </ul>
        <h2>Our teams</h2>
        <ul>
          {verticals.map((v) => (
            <li key={v.id}>
              {v.name}: {v.description}
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
