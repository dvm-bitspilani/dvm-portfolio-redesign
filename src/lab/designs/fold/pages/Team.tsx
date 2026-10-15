import { useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { team, verticals, type Member } from '../../../data'
import { mulberry } from '../lib/paper'

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

/** A hand-cut outline: a rounded rectangle traced with small scissor jitters. */
function cutPath(seed: string) {
  const r = mulberry(hash(seed))
  const pts: string[] = []
  const n = 34
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    // superellipse so the cut reads as a trimmed photo, not a circle
    const c = Math.cos(a)
    const s = Math.sin(a)
    const k = 0.32
    const x = Math.sign(c) * Math.pow(Math.abs(c), k)
    const y = Math.sign(s) * Math.pow(Math.abs(s), k)
    const j = 0.93 + r() * 0.06
    pts.push(`${(50 + x * 50 * j).toFixed(1)}% ${(50 + y * 50 * j).toFixed(1)}%`)
  }
  return `polygon(${pts.join(',')})`
}

function NameTag({ m }: { m: Member }) {
  const clip = useMemo(() => cutPath(m.slug), [m.slug])
  const tilt = useMemo(() => (mulberry(hash(m.slug + 't'))() - 0.5) * 3.4, [m.slug])
  const label = verticals.find((v) => v.id === m.vertical)?.label
  return (
    <li className={`tag${m.isPorHolder ? ' tag--por' : ''}`} style={{ ['--tilt' as string]: `${tilt.toFixed(2)}deg` }}>
      <div className="tag__tent">
        <div className="tag__back" aria-hidden />
        <div className="tag__face">
          <div className="tag__cut" style={{ clipPath: clip }}>
            <img src={m.photo} alt="" loading="lazy" decoding="async" />
          </div>
          <p className="tag__name">{m.name}</p>
          <p className="tag__role">{m.designation ?? `${label}, joined ${m.batch}`}</p>
          <span className="tag__batch" aria-label={`Batch of ${m.batch}`}>
            ’{String(m.batch).slice(2)}
          </span>
        </div>
      </div>
    </li>
  )
}

export default function Team() {
  const { hash: anchor } = useLocation()
  const groups = useMemo(
    () =>
      verticals.map((v) => ({
        v,
        members: team
          .filter((m) => m.vertical === v.id)
          .sort((a, b) => Number(!!b.isPorHolder) - Number(!!a.isPorHolder) || b.batch - a.batch || a.name.localeCompare(b.name)),
      })),
    [],
  )
  useEffect(() => {
    if (!anchor) return
    const el = document.getElementById(anchor.slice(1))
    if (el) window.setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120)
  }, [anchor])

  return (
    <main id="fold-main" className="fold-page fold-team">
      <header className="fold-page__head">
        <h1 className="fold-h1">{team.length} people, five teams</h1>
        <p className="fold-page__lede">
          Everyone on record from the batches of {Math.min(...team.map((m) => m.batch))} to {Math.max(...team.map((m) => m.batch))}, each with a
          folded name card. Position holders stand at the front of their table.
        </p>
        <nav className="fold-tabs" aria-label="Teams">
          {groups.map(({ v, members }) => (
            <a key={v.id} href={`#${v.id}`}>
              {v.label}
              <span>{members.length}</span>
            </a>
          ))}
        </nav>
      </header>
      {groups.map(({ v, members }) => (
        <section key={v.id} id={v.id} className="fold-table" aria-labelledby={`t-${v.id}`}>
          <div className="fold-table__aside">
            <h2 id={`t-${v.id}`} className="fold-h2">
              {v.name}
            </h2>
            <p>{v.description}</p>
          </div>
          <ul className="fold-tags">
            {members.map((m) => (
              <NameTag key={m.slug} m={m} />
            ))}
          </ul>
        </section>
      ))}
    </main>
  )
}
