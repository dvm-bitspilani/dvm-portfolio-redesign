import * as THREE from 'three'
import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { projects, verticals } from '../../../data'
import type { Project } from '../../../data'
import { designBase } from '../../registry'
import { W, codeLayout, filmLayout, type Placed } from '../layout'
import { live, usePortal, type WorldId } from '../store'
import { Anchor } from '../ui/anchors'
import { detailPose } from '../scene/CameraRig'
import { fmtKind, useTarget } from './shared'

const vLabel = (id: string) => verticals.find((v) => v.id === id)?.label ?? id

function ItemLabels({ world, layout }: { world: WorldId; layout: Placed<Project>[] }) {
  const focus = usePortal((s) => (s.target.kind === 'world' ? s.target.focus : undefined))
  const hover = usePortal((s) => s.hoverItem)
  return (
    <>
      {layout.map((pl) => {
        const below = new THREE.Vector3(0, -pl.h / 2 - 0.32, 0.1).applyQuaternion(pl.quat).add(pl.pos)
        const at = W(world, below.x, below.y, below.z)
        const p = pl.item
        return (
          <Anchor key={p.slug} at={at} space={world} near={2.4} far={world === 'film' ? 15 : 19} refDist={7} maxS={1.2} enabled={!focus} className={`pt-item-label${hover === p.slug ? ' is-on' : ''}`}>
            <Link to={`${designBase('portal')}/work/${p.slug}`} tabIndex={-1}>
              <span className="pt-il-title">{p.title}</span>
              <span className="pt-il-meta">
                {p.fest} {p.year ?? ''}, {fmtKind(p.kind).toLowerCase()}
              </span>
            </Link>
          </Anchor>
        )
      })}
    </>
  )
}

/** Keeps an element glued over a world-space quad (used to play a film on its own screen). */
function useQuadRect(corners: THREE.Vector3[] | null, el: HTMLElement | null) {
  useEffect(() => {
    if (!corners || !el) return
    let raf = 0
    const v = new THREE.Vector3()
    const tick = () => {
      const cam = live.camera
      if (cam) {
        let x0 = Infinity
        let y0 = Infinity
        let x1 = -Infinity
        let y1 = -Infinity
        for (const c of corners) {
          v.copy(c).project(cam)
          const x = (v.x * 0.5 + 0.5) * window.innerWidth
          const y = (-v.y * 0.5 + 0.5) * window.innerHeight
          x0 = Math.min(x0, x)
          x1 = Math.max(x1, x)
          y0 = Math.min(y0, y)
          y1 = Math.max(y1, y)
        }
        el.style.transform = `translate(${x0.toFixed(1)}px, ${y0.toFixed(1)}px)`
        el.style.width = `${(x1 - x0).toFixed(1)}px`
        el.style.height = `${(y1 - y0).toFixed(1)}px`
      }
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [corners, el])
}

function Detail({ p, world, layout }: { p: Project; world: WorldId; layout: Placed<Project>[] }) {
  const base = designBase('portal')
  const flying = usePortal((s) => s.flying)
  const mobile = usePortal((s) => s.mobile)
  const [play, setPlay] = useState(false)
  const [frameEl, setFrameEl] = useState<HTMLDivElement | null>(null)
  const panelRef = useRef<HTMLElement>(null)
  const i = layout.findIndex((x) => x.item.slug === p.slug)
  const pl = layout[i]
  const prev = layout[(i - 1 + layout.length) % layout.length].item
  const next = layout[(i + 1) % layout.length].item
  const aspect = window.innerWidth / window.innerHeight
  const pose = detailPose(world, p.slug, aspect)
  const back = world === 'film' ? `${base}/work?world=film` : `${base}/work`

  const [corners, setCorners] = useState<THREE.Vector3[] | null>(null)
  useEffect(() => {
    setPlay(false)
    const hw = pl.w / 2
    const hh = pl.h / 2
    setCorners(
      [
        [-hw, -hh],
        [hw, -hh],
        [hw, hh],
        [-hw, hh],
      ].map(([x, y]) => {
        const v = new THREE.Vector3(x, y, 0.4).applyQuaternion(pl.quat).add(pl.pos)
        return W(world, v.x, v.y, v.z)
      }),
    )
  }, [p.slug, pl, world])
  useQuadRect(play ? corners : null, frameEl)

  useEffect(() => {
    if (!flying) panelRef.current?.focus({ preventScroll: true })
  }, [flying, p.slug])

  const body = (
    <article ref={panelRef} tabIndex={-1} className={`pt-panel pt-scroll${flying ? '' : ' is-in'}`} aria-labelledby="pt-detail-title">
      <p className="pt-panel-kicker">
        {p.fest} {p.date ?? p.year ?? ''}
      </p>
      <h1 id="pt-detail-title" className="pt-panel-title">
        {p.title}
      </h1>
      {p.subtitle && <p className="pt-panel-sub">{p.subtitle}</p>}
      {p.theme && <p className="pt-panel-theme">Theme: {p.theme}</p>}
      <p className="pt-body">{p.description ?? p.summary}</p>
      {p.verticals.length > 0 && (
        <p className="pt-chips">
          {p.verticals.map((v) => (
            <span key={v} className="pt-chip">
              {vLabel(v)}
            </span>
          ))}
        </p>
      )}
      <p className="pt-panel-actions">
        {p.youtubeId && (
          <button type="button" className="pt-btn pt-btn-hot" onClick={() => setPlay((x) => !x)}>
            {play ? 'Stop the film' : 'Play on this screen'}
          </button>
        )}
        {p.links.live && (
          <a className="pt-btn pt-btn-hot" href={p.links.live} target="_blank" rel="noreferrer">
            Visit the site
          </a>
        )}
        {p.links.playStore && (
          <a className="pt-btn" href={p.links.playStore} target="_blank" rel="noreferrer">
            Get the app
          </a>
        )}
        {p.links.youtube && (
          <a className="pt-btn" href={p.links.youtube} target="_blank" rel="noreferrer">
            Watch on YouTube
          </a>
        )}
      </p>
      <nav className="pt-panel-nav" aria-label="Neighbouring projects">
        <Link to={`${base}/work/${prev.slug}`}>Previous: {prev.title}</Link>
        <Link to={`${base}/work/${next.slug}`}>Next: {next.title}</Link>
        <Link to={back} className="pt-panel-close">
          Step back
        </Link>
      </nav>
    </article>
  )

  return (
    <>
      {mobile || !pose ? (
        <div className="pt-sheet">{body}</div>
      ) : (
        <Anchor at={pose.anchor} space={world} near={0.5} far={60} align="left" className="pt-detail-anchor">
          {body}
        </Anchor>
      )}
      {play && p.youtubeId && (
        <div ref={setFrameEl} className="pt-screen-frame">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${p.youtubeId}?autoplay=1&rel=0`}
            title={`${p.title} video`}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
    </>
  )
}

export default function Work() {
  const { project: slug } = useParams()
  const [params] = useSearchParams()
  const base = designBase('portal')
  const p = slug ? projects.find((x) => x.slug === slug) : undefined
  const world: WorldId = p ? (p.kind === 'video' ? 'film' : 'code') : params.get('world') === 'film' ? 'film' : 'code'
  useTarget({ kind: 'world', world, focus: p?.slug })
  const space = usePortal((s) => s.space)
  if (slug && !p) return <Navigate to={`${base}/work`} replace />
  const layout = world === 'film' ? filmLayout : codeLayout

  return (
    <>
      <div className="pt-subnav" role="group" aria-label="Choose a world" hidden={!!p}>
        <Link to={`${base}/work`} className={world === 'code' ? 'is-on' : ''} aria-current={world === 'code' ? 'page' : undefined}>
          Code
        </Link>
        <Link to={`${base}/work?world=film`} className={world === 'film' ? 'is-on' : ''} aria-current={world === 'film' ? 'page' : undefined}>
          Film
        </Link>
      </div>
      {!p && space === world && (
        <h1 className="pt-world-title" aria-live="polite">
          {world === 'film' ? 'Film' : 'Code'}
        </h1>
      )}
      <ItemLabels world={world} layout={layout} />
      {p && <Detail p={p} world={world} layout={layout} />}
      <section className="pt-sr" aria-label={world === 'film' ? 'Films' : 'Websites, apps and portals'}>
        {!p && <h1>{world === 'film' ? 'Film: teasers, promos and curtain raisers' : 'Code: websites, apps and portals'}</h1>}
        <ul>
          {layout.map((x) => (
            <li key={x.item.slug}>
              <Link to={`${base}/work/${x.item.slug}`}>
                {x.item.title}, {x.item.fest} {x.item.year ?? ''}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
