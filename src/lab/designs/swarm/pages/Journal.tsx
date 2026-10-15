import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { artworks, blogs, type Artwork, type Blog } from '../../../data'
import { HALF_H, regions, type Spec } from '../engine/director'
import { shapes, showFormation, useDirector } from '../engine/formations'
import { domTextToWorld } from '../engine/targets'

type Active = { kind: 'blog'; item: Blog } | { kind: 'art'; item: Artwork } | null

export default function Journal() {
  const d = useDirector()
  const [active, setActive] = useState<Active>(null)
  const timer = useRef(0)
  const lastBurst = useRef<{ el: Element | null; t: number }>({ el: null, t: 0 })
  const pending = useRef<number[]>([])

  useEffect(() => {
    d.parallax = 0
    d.alpha = 1
    const timers = pending.current
    return () => {
      window.clearTimeout(timer.current)
      for (const t of timers) window.clearTimeout(t)
    }
  }, [d])

  useEffect(() => {
    if (!active) return showFormation(d, shapes.logo, { region: regions.right, fill: 0.7, spinSpeed: 0.45 }, { kick: 0.5, pin: true })
    const url = active.kind === 'blog' ? active.item.cover : active.item.image
    return showFormation(d, shapes.image(url), { region: regions.right, fill: 0.92, sway: 0.1 }, { kick: 0.9 })
  }, [d, active])

  const hover = (a: Active, delay: number) => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setActive(a), delay)
  }

  /** The headline turns into particles in place, holds for a beat, then blows apart. */
  const explode = (el: HTMLElement, b: Blog) => {
    const now = performance.now()
    if (d.reduced || d.mobile || (lastBurst.current.el === el && now - lastBurst.current.t < 1400)) {
      hover({ kind: 'blog', item: b }, 60)
      return
    }
    lastBurst.current = { el, t: now }
    window.clearTimeout(timer.current)
    const img = shapes.image(b.cover)
    d.lib.get(img[0], img[1]).catch(() => undefined)
    const data = domTextToWorld(el, d.lib, HALF_H)
    const tex = d.lib.texture(data)
    const spec: Spec = { target: { key: `snap:${b.slug}:${now}`, tex, aspect: 1 }, region: 'world' }
    d.snapTo(tex)
    d.show(spec, { kick: 0 })
    el.classList.add('is-dust')
    const r = el.getBoundingClientRect()
    const vw = window.innerWidth, vh = window.innerHeight
    const halfW = HALF_H * (vw / vh)
    const origin = new THREE.Vector3((((r.left + r.right) / 2) / vw) * 2 * halfW - halfW, HALF_H - (((r.top + r.bottom) / 2) / vh) * 2 * HALF_H, 0)
    pending.current.push(
      window.setTimeout(() => {
        d.explode(4.2, origin)
        showFormation(d, shapes.image(b.cover), { region: regions.right, fill: 0.92, sway: 0.1 }, { kick: 0.9 })
        setActive({ kind: 'blog', item: b })
      }, 320),
      window.setTimeout(() => el.classList.remove('is-dust'), 1300),
      window.setTimeout(() => {
        if (d.a?.target.tex !== tex && d.b?.target.tex !== tex) tex.dispose()
      }, 4000),
    )
  }

  return (
    <div className="sw-page sw-journal">
      <header className="sw-pagehead">
        <h1 className="sw-display sw-display--page">Journal</h1>
        <p className="sw-lede">
          What DVM members have written and made: {blogs.length} posts on design, apps and infrastructure, and {artworks.length} artworks. Touch a headline and it comes apart.
        </p>
      </header>

      <section className="sw-posts" aria-labelledby="sw-writing">
        <h2 id="sw-writing" className="sw-h3">
          Writing
        </h2>
        <ul onPointerLeave={() => hover(null, 500)}>
          {blogs.map((b) => (
            <li key={b.slug}>
              <a
                href={b.url}
                target="_blank"
                rel="noreferrer"
                onPointerEnter={(e) => explode(e.currentTarget.querySelector('h3') as HTMLElement, b)}
                onFocus={() => hover({ kind: 'blog', item: b }, 0)}
              >
                <h3 className="sw-headline">{b.title}</h3>
                <p className="sw-postmeta">
                  {b.authors.join(' and ')}, {b.date}. {b.readMinutes} min read on {b.platform}.
                </p>
                <p className="sw-excerpt">{b.excerpt}</p>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="sw-art" aria-labelledby="sw-artworks">
        <h2 id="sw-artworks" className="sw-h3">
          Artworks
        </h2>
        <ul onPointerLeave={() => hover(null, 500)}>
          {artworks.map((a) => (
            <li key={a.slug}>
              <a
                href={a.links.artwork ?? a.links.portfolio ?? a.image}
                target="_blank"
                rel="noreferrer"
                onPointerEnter={() => hover({ kind: 'art', item: a }, 70)}
                onFocus={() => hover({ kind: 'art', item: a }, 0)}
              >
                <span className="sw-art__title">{a.title}</span>
                <span className="sw-art__by">
                  {a.artist}, {a.year}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <aside className="sw-caption" aria-live="polite">
        {active ? (
          <>
            <strong>{active.item.title}</strong>
            <span>{active.kind === 'blog' ? active.item.authors.join(' and ') : `${active.item.artist}${active.item.platform ? `, on ${active.item.platform}` : ''}`}</span>
          </>
        ) : (
          <span>Point at a headline or an artwork.</span>
        )}
      </aside>
    </div>
  )
}
