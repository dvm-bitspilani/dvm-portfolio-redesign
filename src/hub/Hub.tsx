import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { MercuryLogo } from '../immersive/kit/mercury'
import { LOGO_PATHS, LOGO_TRANSFORM, LOGO_VIEWBOX } from '../immersive/shared/logo'
import { LAB_BASE } from '../lab/designs/registry'
import { useIsolation } from './isolation'
import {
  FEATURED,
  original,
  redesignEntries,
  directionEntries,
  labEntries,
  kitEntries,
  type Entry,
} from './catalog'
import s from './hub.module.css'

const featured = redesignEntries.find((e) => e.key === FEATURED)
const redesignRow = [original, ...redesignEntries.filter((e) => e.key !== FEATURED)]

const list = (items: string[]) =>
  items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`

const directionsRange = (() => {
  const codes = directionEntries.map((e) => e.code ?? e.name)
  if (codes.length === 0) return 'Coming soon'
  if (codes.length === 1) return codes[0]
  return `${codes[0]} to ${codes[codes.length - 1]}`
})()

export default function Hub() {
  useIsolation('hub')
  const mastRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const prev = document.title
    document.title = 'DVM portfolio preview'
    return () => {
      document.title = prev
    }
  }, [])

  return (
    <div className={s.hub}>
      <header className={s.mast} ref={mastRef}>
        <div className={s.texture} aria-hidden="true" />
        <div className={s.lines} aria-hidden="true" />

        <div className={s.bar}>
          <Link to="/" className={s.brand}>
            DVM
          </Link>
          <p className={s.org}>Department of Visual Media, BITS Pilani</p>
        </div>

        <div className={s.stage}>
          <p className={s.ghost} aria-hidden="true">
            DVM
          </p>
          <div className={s.mark}>
            <MercuryLogo
              background="transparent"
              env="teal"
              pointerTarget={mastRef}
              fit={{ mode: 'contain', padding: 0.11 }}
              shadow={0.5}
              introDelay={0.25}
              label="The DVM mark in liquid mercury"
            />
          </div>
        </div>

        <nav className={s.index} aria-label="Sections on this page">
          <IndexLink href="#redesign" pos="a" name="The redesign" meta={list([original.name, ...redesignEntries.map((e) => e.code ?? e.name)])} />
          <IndexLink href="#directions" pos="b" name="New directions" meta={directionsRange} />
          <IndexLink href="#lab" pos="c" name="Concept lab" meta={`${labEntries.length} concepts`} />
          <IndexLink href="#components" pos="d" name="Components" meta={`${kitEntries.length} sandboxes`} />
        </nav>

        <div className={s.title}>
          <h1>Portfolio preview</h1>
          <p>
            Every version of the DVM portfolio in one place: the deployed redesign and the direction we chose, the new directions built on it,
            the concept lab they came from and the components they share.
          </p>
        </div>
      </header>

      <main>
        <Section id="redesign" title="The redesign" intro="The deployed redesign and the three versions built on it with the lab's live pieces.">
          {featured && <Featured e={featured} />}
          <div className={`${s.grid} ${s.three}`}>
            {redesignRow.map((e) => (
              <Card key={e.key} e={e} />
            ))}
          </div>
        </Section>

        <Section
          id="directions"
          title="New directions"
          intro="Four interface models that share V2's brand and nothing else: an operating system, a film reel, a network and a live board."
        >
          {directionEntries.length > 0 ? (
            <div className={`${s.grid} ${s.two}`}>
              {directionEntries.map((e) => (
                <Card key={e.key} e={e} />
              ))}
            </div>
          ) : (
            <p className={s.empty}>New directions appear here as soon as their folders are registered.</p>
          )}
        </Section>

        <Section
          id="lab"
          title="Concept lab"
          intro="The nine first concepts, each with its own five pages. Mercury, Boot, Fold, Swarm and Archive became the components below."
          action={
            <Link to={LAB_BASE} className={s.action}>
              Open the lab gallery
            </Link>
          }
        >
          <div className={`${s.grid} ${s.lab}`}>
            {labEntries.map((e) => (
              <Card key={e.key} e={e} compact />
            ))}
          </div>
        </Section>

        <Section id="components" title="Components" intro="Sandboxes for the reusable pieces the variants are built from, with their options.">
          <div className={`${s.grid} ${s.kit}`}>
            {kitEntries.map((e) => (
              <Card key={e.key} e={e} compact />
            ))}
          </div>
        </Section>
      </main>

      <footer className={s.foot}>
        <dl className={s.keys}>
          <div>
            <dt>
              <kbd>V</kbd>
            </dt>
            <dd>Hide or show the switcher in the bottom-left corner</dd>
          </div>
          <div>
            <dt>
              <kbd>[</kbd> <kbd>]</kbd>
            </dt>
            <dd>In the lab, step to the previous or next concept on the same page</dd>
          </div>
          <div>
            <dt>
              <kbd>H</kbd>
            </dt>
            <dd>In the lab, hide or show the lab bar</dd>
          </div>
        </dl>
        <p className={s.note}>Preview build of the DVM portfolio redesign, October 2026. The production site is unchanged.</p>
      </footer>
    </div>
  )
}

function IndexLink({ href, pos, name, meta }: { href: string; pos: string; name: string; meta: string }) {
  return (
    <a
      href={href}
      className={s.ix}
      data-pos={pos}
      onClick={(e) => {
        const el = document.querySelector(href)
        if (!el) return
        e.preventDefault()
        const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
        el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
        history.replaceState(history.state, '', href)
      }}
    >
      <span className={s.ixName}>{name}</span>
      <span className={s.ixMeta}>{meta}</span>
    </a>
  )
}

function Section({ id, title, intro, action, children }: { id: string; title: string; intro: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className={s.section} aria-labelledby={`${id}-title`}>
      <div className={s.head}>
        <h2 id={`${id}-title`}>{title}</h2>
        <p>{intro}</p>
        {action}
      </div>
      {children}
    </section>
  )
}

function Mark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox={`0 0 ${LOGO_VIEWBOX} ${LOGO_VIEWBOX}`} aria-hidden="true">
      <g transform={`translate(${LOGO_TRANSFORM.x} ${LOGO_TRANSFORM.y})`}>
        {LOGO_PATHS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </svg>
  )
}

function Poster({ e, eager }: { e: Entry; eager?: boolean }) {
  const inner = e.poster ? (
    <img src={e.poster} alt="" loading={eager ? 'eager' : 'lazy'} decoding="async" />
  ) : (
    <span className={s.placeholder}>
      <Mark className={s.placeholderMark} />
      <span>{e.ready ? 'No screenshot yet' : 'Being built'}</span>
    </span>
  )
  const style = e.accent ? ({ '--accent': e.accent } as CSSProperties) : undefined
  return e.ready ? (
    <Link to={e.to} className={s.poster} style={style} tabIndex={-1} aria-hidden="true">
      {inner}
    </Link>
  ) : (
    <div className={`${s.poster} ${s.pending}`} style={style}>
      {inner}
    </div>
  )
}

function Links({ e }: { e: Entry }) {
  if (!e.ready || e.links.length === 0) return null
  return (
    <nav className={s.links} aria-label={`${e.code ? `${e.code} ` : ''}${e.name} pages`}>
      {e.links.map((l) => (
        <Link key={l.to} to={l.to}>
          {l.label}
        </Link>
      ))}
    </nav>
  )
}

function Name({ e, as: Tag = 'h3' }: { e: Entry; as?: 'h3' | 'h2' }) {
  const label = (
    <>
      {e.code && <span className={s.code}>{e.code}</span>}
      {e.name}
    </>
  )
  return <Tag className={s.name}>{e.ready ? <Link to={e.to}>{label}</Link> : label}</Tag>
}

function Card({ e, compact }: { e: Entry; compact?: boolean }) {
  return (
    <article className={`${s.card} ${compact ? s.compact : ''}`}>
      <Poster e={e} />
      <div className={s.text}>
        <Name e={e} />
        {e.medium && (
          <p className={s.medium}>
            {e.accent && <span className={s.swatch} style={{ background: e.accent }} aria-hidden="true" />}
            {e.medium}
          </p>
        )}
        <p className={s.line}>{e.line}</p>
        {e.ready ? <Links e={e} /> : <p className={s.status}>In progress. It opens from here as soon as it is ready.</p>}
      </div>
    </article>
  )
}

function Featured({ e }: { e: Entry }) {
  return (
    <article className={s.featured}>
      <Poster e={e} eager />
      <div className={s.featText}>
        <p className={s.chosen}>Chosen direction</p>
        <Name e={e} />
        <p className={s.line}>{e.line}</p>
        <Link to={e.to} className={s.open}>
          Open {e.code ?? e.name}
        </Link>
        <Links e={e} />
      </div>
    </article>
  )
}
