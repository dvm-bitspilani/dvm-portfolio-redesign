import * as THREE from 'three'
import { useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { artworks, blogs } from '../../../data'
import { designBase } from '../../registry'
import { W, artLayout, blogLayout } from '../layout'
import { usePortal } from '../store'
import { Anchor } from '../ui/anchors'
import { detailPose } from '../scene/CameraRig'
import { useTarget } from './shared'

const below = (pos: THREE.Vector3, quat: THREE.Quaternion, h: number) =>
  W('design', ...(new THREE.Vector3(0, -h / 2 - 0.3, 0.1).applyQuaternion(quat).add(pos).toArray() as [number, number, number]))

export default function Journal() {
  const [params] = useSearchParams()
  const base = designBase('portal')
  const art = artworks.find((a) => a.slug === params.get('art'))
  useTarget({ kind: 'world', world: 'design', focus: art?.slug })
  const hover = usePortal((s) => s.hoverItem)
  const flying = usePortal((s) => s.flying)
  const mobile = usePortal((s) => s.mobile)
  const space = usePortal((s) => s.space)
  const panelRef = useRef<HTMLElement>(null)
  useEffect(() => {
    if (art && !flying) panelRef.current?.focus({ preventScroll: true })
  }, [art, flying])

  const i = art ? artworks.indexOf(art) : -1
  const prev = art ? artworks[(i - 1 + artworks.length) % artworks.length] : null
  const next = art ? artworks[(i + 1) % artworks.length] : null
  const pose = art ? detailPose('design', art.slug, window.innerWidth / window.innerHeight) : null

  const panel = art && (
    <article ref={panelRef} tabIndex={-1} className={`pt-panel pt-scroll${flying ? '' : ' is-in'}`} aria-labelledby="pt-art-title">
      <p className="pt-panel-kicker">
        {art.platform ?? 'Artwork'}, {art.year}
      </p>
      <h1 id="pt-art-title" className="pt-panel-title">
        {art.title}
      </h1>
      <p className="pt-panel-sub">by {art.artist}</p>
      {art.description && <p className="pt-body">{art.description}</p>}
      <p className="pt-panel-actions">
        {art.links.artwork && (
          <a className="pt-btn pt-btn-hot" href={art.links.artwork} target="_blank" rel="noreferrer">
            See the original
          </a>
        )}
        {art.links.portfolio && (
          <a className="pt-btn" href={art.links.portfolio} target="_blank" rel="noreferrer">
            {art.artist.split(' ')[0]}'s portfolio
          </a>
        )}
      </p>
      <nav className="pt-panel-nav" aria-label="Neighbouring artworks">
        <Link to={`${base}/journal?art=${prev!.slug}`}>Previous: {prev!.title}</Link>
        <Link to={`${base}/journal?art=${next!.slug}`}>Next: {next!.title}</Link>
        <Link to={`${base}/journal`} className="pt-panel-close">
          Step back
        </Link>
      </nav>
    </article>
  )

  return (
    <>
      {!art && space === 'design' && (
        <h1 className="pt-world-title" aria-live="polite">
          Design
        </h1>
      )}
      {artLayout.map((pl) => (
        <Anchor
          key={pl.item.slug}
          at={below(pl.pos, pl.quat, pl.h)}
          space="design"
          near={2.4}
          far={17}
          refDist={7}
          maxS={1.2}
          enabled={!art}
          className={`pt-item-label${hover === pl.item.slug ? ' is-on' : ''}`}
        >
          <Link to={`${base}/journal?art=${pl.item.slug}`} tabIndex={-1}>
            <span className="pt-il-title">{pl.item.title}</span>
            <span className="pt-il-meta">{pl.item.artist}</span>
          </Link>
        </Anchor>
      ))}
      <Anchor at={W('design', 0, 2.6, blogLayout[0].pos.z - 1)} space="design" near={3} far={22} refDist={8} enabled={!art} className="pt-ring-copy">
        <h2 className="pt-h-ring pt-h-mid">Essays from the team</h2>
      </Anchor>
      {blogLayout.map((pl) => (
        <Anchor
          key={pl.item.slug}
          at={below(pl.pos, pl.quat, pl.h)}
          space="design"
          near={2.4}
          far={20}
          refDist={8}
          maxS={1.15}
          enabled={!art}
          className={`pt-item-label pt-blog-label${hover === pl.item.slug ? ' is-on' : ''}`}
        >
          <a href={pl.item.url} target="_blank" rel="noreferrer">
            <span className="pt-il-title">{pl.item.shortTitle ?? pl.item.title}</span>
            <span className="pt-il-meta">
              {pl.item.authors.join(', ')}, {pl.item.readMinutes} min read
            </span>
          </a>
        </Anchor>
      ))}
      {art && (mobile || !pose ? <div className="pt-sheet">{panel}</div> : <Anchor at={pose.anchor} space="design" near={0.5} far={60} align="left" className="pt-detail-anchor">{panel}</Anchor>)}
      <section className="pt-sr" aria-label="Journal">
        {!art && <h1>Design: artworks and essays</h1>}
        <h2>Artworks</h2>
        <ul>
          {artworks.map((a) => (
            <li key={a.slug}>
              <Link to={`${base}/journal?art=${a.slug}`}>
                {a.title} by {a.artist}
              </Link>
            </li>
          ))}
        </ul>
        <h2>Essays</h2>
        <ul>
          {blogs.map((b) => (
            <li key={b.slug}>
              <a href={b.url} target="_blank" rel="noreferrer">
                {b.title}, {b.authors.join(', ')}, {b.date}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
