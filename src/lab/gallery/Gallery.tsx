import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import '@fontsource-variable/bricolage-grotesque/standard.css'
import { designs, designBase, DESIGN_PAGES, LAB_BASE, type DesignMeta } from '../designs/registry'
import { projects } from '../data/projects'
import { team } from '../data/team'
import { blogs } from '../data/blogs'
import { artworks } from '../data/artworks'
import HeroMark, { MiniMark } from './HeroMark'
import PosterPlaceholder from './PosterPlaceholder'
import { PLANNED } from './planned'
import './gallery.css'

interface Slot extends DesignMeta {
  live: boolean
}

/** Registered designs win; planned concepts fill any slot that is not built yet. */
function useSlots(): Slot[] {
  return useMemo(() => {
    const live = new Set(designs.map((d) => d.slug))
    const slots: Slot[] = [
      ...designs.map((d) => ({ slug: d.slug, order: d.order, name: d.name, tagline: d.tagline, medium: d.medium, accent: d.accent, description: d.description, live: true })),
      ...PLANNED.filter((p) => !live.has(p.slug)).map((p) => ({ ...p, live: false })),
    ]
    return slots.sort((a, b) => a.order - b.order || Number(b.live) - Number(a.live))
  }, [])
}

const pad = (n: number) => String(n).padStart(2, '0')

export default function Gallery() {
  const slots = useSlots()
  const navigate = useNavigate()
  const [active, setActive] = useState<string | null>(null)
  const liveCount = slots.filter((s) => s.live).length

  useEffect(() => {
    const prevTitle = document.title
    document.title = 'DVM Hero Lab'
    return () => {
      document.title = prevTitle
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target
      if (t instanceof Element && t.closest('input, textarea, select, [contenteditable]')) return
      const n = Number(e.key)
      if (!Number.isInteger(n) || n < 1 || n > 9) return
      const slot = slots[n - 1]
      if (!slot) return
      if (slot.live) navigate(designBase(slot.slug))
      else document.getElementById(`lab-${slot.slug}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [slots, navigate])

  const count = slots.length
  const countWord = ['None', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'][count] ?? String(count)

  return (
    <div className="lab-gallery">
      <header className="lab-top">
        <Link to={LAB_BASE} className="lab-top__brand" aria-label="DVM Hero Lab home">
          <MiniMark />
          <span>DVM Hero Lab</span>
        </Link>
        <p className="lab-top__org">Department of Visual Media, BITS Pilani</p>
        <Link to="/" className="lab-top__hub">
          Back to the hub
        </Link>
      </header>

      <section className="lab-intro">
        <div className="lab-intro__text">
          <h1 className="lab-intro__title">{countWord} directions for the next DVM portfolio</h1>
          <p className="lab-intro__lede">
            Every concept starts from the same mark and the same real content: {projects.length} projects, {team.length} members,{' '}
            {blogs.length} blog posts and {artworks.length} artworks. What changes is the medium. Open one, walk through its five pages, then come back
            and try the next.
          </p>
          <ol className="lab-toc" onPointerLeave={() => setActive(null)}>
            {slots.map((s, i) => (
              <li key={s.slug} style={{ ['--accent' as string]: s.accent } as CSSProperties}>
                <a
                  href={`#lab-${s.slug}`}
                  onPointerEnter={() => setActive(s.slug)}
                  onFocus={() => setActive(s.slug)}
                  onBlur={() => setActive(null)}
                  onClick={(e) => {
                    e.preventDefault()
                    document.getElementById(`lab-${s.slug}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                >
                  <span className="lab-toc__num">{i + 1}</span>
                  <span className="lab-toc__name">{s.name}</span>
                  <span className="lab-toc__medium">{s.live ? s.medium : 'Being built'}</span>
                </a>
              </li>
            ))}
          </ol>
          <p className="lab-intro__keys">
            Press <kbd>1</kbd> to <kbd>{Math.min(count, 9)}</kbd> to jump straight into a design.
            {liveCount === 0 ? ' None of them are ready to open yet.' : liveCount < count ? ` ${liveCount} of ${count} are ready to open.` : null}
          </p>
        </div>
        <div className="lab-intro__mark">
          <HeroMark strands={slots.map((s) => ({ slug: s.slug, accent: s.accent, live: s.live }))} active={active} />
        </div>
      </section>

      <section className="lab-entries" aria-label="Concepts">
        {slots.map((s, i) => (
          <Entry key={s.slug} slot={s} index={i} onActive={setActive} />
        ))}
      </section>

      <footer className="lab-foot">
        <div className="lab-foot__keys">
          <h2>Getting around</h2>
          <dl>
            <div>
              <dt>
                <kbd>1</kbd>–<kbd>{Math.min(count, 9)}</kbd>
              </dt>
              <dd>Open a design from this page</dd>
            </div>
            <div>
              <dt>
                <kbd>[</kbd> <kbd>]</kbd>
              </dt>
              <dd>Inside a design, switch to the previous or next one and stay on the same page</dd>
            </div>
            <div>
              <dt>
                <kbd>H</kbd>
              </dt>
              <dd>Hide or show the lab bar in the bottom-left corner</dd>
            </div>
            <div>
              <dt>DVM/LAB</dt>
              <dd>The first button in the lab bar brings you back here; Hub returns to the preview index</dd>
            </div>
          </dl>
        </div>
        <p className="lab-foot__note">
          Concept prototypes for the Department of Visual Media, BITS Pilani. Built in the DVM Hero Lab, October 2026.
        </p>
      </footer>
    </div>
  )
}

function Entry({ slot, index, onActive }: { slot: Slot; index: number; onActive: (slug: string | null) => void }) {
  const base = designBase(slot.slug)
  const [poster, setPoster] = useState<'loading' | 'ok' | 'missing'>('loading')
  const imgRef = useRef<HTMLImageElement>(null)
  const posterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const img = imgRef.current
    if (img?.complete) setPoster(img.naturalWidth > 0 ? 'ok' : 'missing')
  }, [])

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    const el = posterRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--px', `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`)
    el.style.setProperty('--py', `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`)
  }

  const img = (
    <>
      {poster !== 'ok' && <PosterPlaceholder slug={slot.slug} accent={slot.accent} />}
      <img
        ref={imgRef}
        src={`/lab-posters/${slot.slug}.jpg`}
        alt=""
        loading={index < 2 ? 'eager' : 'lazy'}
        decoding="async"
        className={poster === 'ok' ? 'is-loaded' : ''}
        onLoad={(e) => setPoster(e.currentTarget.naturalWidth > 0 ? 'ok' : 'missing')}
        onError={() => setPoster('missing')}
      />
    </>
  )

  return (
    <article
      id={`lab-${slot.slug}`}
      className={`lab-entry${slot.live ? '' : ' is-pending'}`}
      style={{ ['--accent' as string]: slot.accent } as CSSProperties}
      onPointerEnter={() => onActive(slot.slug)}
      onPointerLeave={() => onActive(null)}
      aria-labelledby={`lab-${slot.slug}-name`}
    >
      <div className="lab-poster" ref={posterRef} onPointerMove={onPointerMove}>
        {slot.live ? (
          <Link to={base} tabIndex={-1} aria-hidden="true" className="lab-poster__link">
            {img}
          </Link>
        ) : (
          <div className="lab-poster__link">
            {img}
            <span className="lab-poster__status">Still being built</span>
          </div>
        )}
      </div>

      <div className="lab-label">
        <p className="lab-label__num" aria-hidden="true">
          {pad(index + 1)}
        </p>
        <h2 className="lab-label__name" id={`lab-${slot.slug}-name`}>
          {slot.name}
        </h2>
        <p className="lab-label__tagline">{slot.tagline}</p>
        <p className="lab-label__medium">
          <span className="lab-chip">{slot.medium}</span>
        </p>
        <p className="lab-label__desc">{slot.description}</p>

        {slot.live ? (
          <div className="lab-label__actions">
            <Link to={base} className="lab-enter">
              Enter {slot.name}
              {index < 9 && <kbd aria-label={`shortcut ${index + 1}`}>{index + 1}</kbd>}
            </Link>
            <nav className="lab-pages" aria-label={`${slot.name} pages`}>
              {DESIGN_PAGES.filter((p) => p.path !== '').map((p) => (
                <Link key={p.path} to={`${base}/${p.path}`}>
                  {p.label}
                </Link>
              ))}
            </nav>
          </div>
        ) : (
          <p className="lab-label__pending">This concept is still in the workshop. It appears here as soon as it is ready.</p>
        )}
      </div>
    </article>
  )
}
