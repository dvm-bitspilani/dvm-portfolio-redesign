import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fests, site, socials, stats, verticals, type Socials } from '../../../data'
import { CONTACT_RECT, ITEMS, KIND_LABEL, LAYOUTS, addressOf, fmtCoord, type Filter, type Item } from '../engine/layout'
import { MARK_TARGET } from '../engine/WallEngine'
import { BASE } from '../paths'
import type { DetailKind } from '../Shell'

const vName = (id: string) => verticals.find((v) => v.id === id)
const SOCIAL_LABEL: Record<keyof Socials, string> = {
  github: 'GitHub', linkedin: 'LinkedIn', instagram: 'Instagram', twitter: 'Twitter', dribbble: 'Dribbble', behance: 'Behance', facebook: 'Facebook',
}

function Ext({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className="ar-btn" href={href} target="_blank" rel="noreferrer">
      {children}
      <svg viewBox="0 0 12 12" aria-hidden="true">
        <path d="M3.5 2.5h6v6M9.5 2.5 2.5 9.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
      </svg>
      <span className="ar-vh"> (opens in a new tab)</span>
    </a>
  )
}

function SocialLinks({ s }: { s: Socials }) {
  const entries = Object.entries(s).filter(([, v]) => v) as [keyof Socials, string][]
  if (!entries.length) return null
  return (
    <ul className="ar-socials">
      {entries.map(([k, v]) => (
        <li key={k}>
          <a href={v} target="_blank" rel="noreferrer">
            {SOCIAL_LABEL[k]}
          </a>
        </li>
      ))}
    </ul>
  )
}

function Thumbs({ items, current, label }: { items: Item[]; current?: number; label: string }) {
  if (items.length < 2) return null
  return (
    <div className="ar-thumbs">
      <h3>{label}</h3>
      <ul>
        {items.map((it) => (
          <li key={it.key}>
            <Link
              to={`${BASE}/${it.route}`}
              state={{ tile: it.key }}
              className={it.index === current ? 'is-current' : ''}
              aria-current={it.index === current ? 'true' : undefined}
              title={`${it.title}, ${KIND_LABEL[it.kind].toLowerCase()}`}
            >
              {it.img ? <img src={it.img} alt="" loading="lazy" /> : <span className="ar-thumbs__txt">{it.title}</span>}
              <span className="ar-vh">
                {it.title}, {KIND_LABEL[it.kind].toLowerCase()}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ProjectDossier({ item }: { item: Item }) {
  const p = item.project!
  const [play, setPlay] = useState(false)
  const tiles = ITEMS.filter((i) => i.project?.slug === p.slug)
  const kindWord = p.kind === 'video' ? 'Film' : p.kind === 'app' ? 'App' : p.kind === 'portal' ? 'Portal' : 'Website'
  const fest = fests.find((f) => f.id === p.fest)
  return (
    <>
      <p className="ar-panel__kicker">
        {kindWord} for {p.fest === 'Campus' ? 'the campus' : p.fest}
        {p.date ? `, ${p.date}` : p.year ? `, ${p.year}` : ''}
      </p>
      <h2 id="ar-panel-title" tabIndex={-1}>
        {p.title}
      </h2>
      {p.subtitle && <p className="ar-panel__sub">{p.subtitle}</p>}
      {p.summary && <p className="ar-panel__lead">{p.summary}</p>}

      {p.youtubeId && (
        <div className="ar-film">
          {play ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${p.youtubeId}?autoplay=1&rel=0`}
              title={p.title}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <button type="button" onClick={() => setPlay(true)} aria-label={`Play ${p.title} here`}>
              {p.cover && <img src={p.cover} alt="" />}
              <span className="ar-film__play" aria-hidden="true" />
              <span className="ar-film__label">Play here</span>
            </button>
          )}
        </div>
      )}

      <dl className="ar-meta">
        <div>
          <dt>Fest</dt>
          <dd>{p.fest}</dd>
        </div>
        {(p.date || p.year) && (
          <div>
            <dt>Shipped</dt>
            <dd>{p.date ?? p.year}</dd>
          </div>
        )}
        {p.verticals.length > 0 && (
          <div>
            <dt>Teams</dt>
            <dd>{p.verticals.map((v) => vName(v)?.label ?? v).join(', ')}</dd>
          </div>
        )}
        {p.theme && (
          <div>
            <dt>Theme</dt>
            <dd>{p.theme}</dd>
          </div>
        )}
      </dl>

      <div className="ar-actions">
        {p.links.live && <Ext href={p.links.live}>Open the live site</Ext>}
        {p.links.playStore && <Ext href={p.links.playStore}>Get it on Google Play</Ext>}
        {p.links.youtube && <Ext href={p.links.youtube}>Watch on YouTube</Ext>}
      </div>

      <Thumbs items={tiles} current={item.index} label={`On the wall (${tiles.length})`} />

      {p.description && p.description !== p.summary && <p className="ar-panel__body-copy">{p.description}</p>}
      {(p.festContext || fest) && (
        <details className="ar-more">
          <summary>About {p.fest === 'Campus' ? 'this project' : p.fest}</summary>
          <p>{p.festContext ?? fest?.blurb}</p>
        </details>
      )}
    </>
  )
}

function MemberCard({ item }: { item: Item }) {
  const m = item.member!
  const v = vName(m.vertical)
  const mates = ITEMS.filter((i) => i.member && i.member.batch === m.batch && i.member.vertical === m.vertical)
  return (
    <>
      <p className="ar-panel__kicker">
        {v?.name ?? m.vertical}, joined {m.batch}
      </p>
      <h2 id="ar-panel-title" tabIndex={-1}>
        {m.name}
      </h2>
      {m.designation && <p className="ar-panel__lead">{m.designation}</p>}
      <SocialLinks s={m.socials} />
      <Thumbs items={mates} current={item.index} label={`${v?.label ?? ''} batch of ${m.batch} (${mates.length})`} />
      {v && (
        <details className="ar-more" open>
          <summary>What the {v.label} team does</summary>
          <p>{v.description}</p>
        </details>
      )}
    </>
  )
}

function ArtworkPanel({ item }: { item: Item }) {
  const a = item.artwork!
  const platform = a.platform ? `See it on ${a.platform}` : 'See the original'
  const others = ITEMS.filter((i) => i.artwork && i.artwork.artist === a.artist)
  return (
    <>
      <p className="ar-panel__kicker">
        Artwork by {a.artist}, {a.year}
      </p>
      <h2 id="ar-panel-title" tabIndex={-1}>
        {a.title}
      </h2>
      {a.description && <p className="ar-panel__lead">{a.description}</p>}
      <div className="ar-actions">
        {a.links.artwork && <Ext href={a.links.artwork}>{platform}</Ext>}
        {a.links.portfolio && <Ext href={a.links.portfolio}>{a.artist.split(' ')[0]}’s portfolio</Ext>}
      </div>
      <SocialLinks s={a.artistSocials} />
      <Thumbs items={others} current={item.index} label={`More by ${a.artist} (${others.length})`} />
    </>
  )
}

function BlogPanel({ item }: { item: Item }) {
  const b = item.blog!
  return (
    <>
      <p className="ar-panel__kicker">
        Essay, {b.date}, {b.readMinutes} min read
      </p>
      <h2 id="ar-panel-title" tabIndex={-1}>
        {b.title}
      </h2>
      <p className="ar-panel__by">By {b.authors.join(' and ')}</p>
      <p className="ar-panel__lead">{b.excerpt}</p>
      {b.tags.length > 0 && (
        <ul className="ar-tags" aria-label="Topics">
          {b.tags.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      )}
      <div className="ar-actions">
        <Ext href={b.url}>Read it on {b.platform}</Ext>
      </div>
    </>
  )
}

function AboutPanel() {
  const shown = stats.filter((s) => ['users on our apps and websites', 'teams', 'members on record', 'artworks'].includes(s.label) || s.label.startsWith('websites'))
  return (
    <>
      <p className="ar-panel__kicker">The mark at 0, 0</p>
      <h2 id="ar-panel-title" tabIndex={-1}>
        {site.headline}
      </h2>
      {site.about.map((p) => (
        <p key={p} className="ar-panel__body-copy">
          {p}
        </p>
      ))}
      <dl className="ar-stats">
        {shown.map((s) => (
          <div key={s.label}>
            <dt>{s.label}</dt>
            <dd>{s.display}</dd>
          </div>
        ))}
      </dl>
      <div className="ar-teams">
        <h3>Five teams</h3>
        <ul>
          {verticals.map((v) => (
            <li key={v.id}>
              <strong>{v.name}</strong>
              <span>{v.description}</span>
            </li>
          ))}
        </ul>
        <Link to={`${BASE}/team`} className="ar-btn">
          Show only the team on the wall
        </Link>
      </div>
      <p className="ar-mischief">{site.taglines.mischief}</p>
    </>
  )
}

function ContactPanel() {
  const [name, setName] = useState('')
  const [msg, setMsg] = useState('')
  const href = `mailto:${site.contact.email}?subject=${encodeURIComponent(`Hello DVM${name ? `, from ${name}` : ''}`)}&body=${encodeURIComponent(msg)}`
  return (
    <>
      <p className="ar-panel__kicker">The blue tile, always at {fmtCoord(CONTACT_RECT.x + CONTACT_RECT.w / 2, -(CONTACT_RECT.y + CONTACT_RECT.h / 2))}</p>
      <h2 id="ar-panel-title" tabIndex={-1}>
        Write to DVM
      </h2>
      <p className="ar-panel__lead">
        For fest websites and apps, sponsorships, joining the department or anything on this wall, write to{' '}
        <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>.
      </p>
      <form
        className="ar-form"
        onSubmit={(e) => {
          e.preventDefault()
          window.location.href = href
        }}
      >
        <label>
          <span>Your name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </label>
        <label>
          <span>Message</span>
          <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={5} required />
        </label>
        <button type="submit" className="ar-btn ar-btn--solid">
          Open in your mail app
        </button>
      </form>
      <ul className="ar-socials">
        {socials.map((s) => (
          <li key={s.id}>
            <a href={s.url} target="_blank" rel="noreferrer">
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </>
  )
}

export default function Detail({ kind, target, onClose, filter }: { kind: DetailKind; target: number; tileKey?: string; onClose: () => void; filter: Filter }) {
  const navigate = useNavigate()
  const ref = useRef<HTMLElement>(null)
  const item = target >= 0 ? ITEMS[target] : null

  useEffect(() => {
    const h = ref.current?.querySelector<HTMLElement>('h2')
    h?.focus({ preventScroll: true })
  }, [target])

  // Previous / next along the spiral of this group, nearest the origin first.
  const seq = useMemo(() => {
    if (!item || item.kind === 'contact') return null
    const L = LAYOUTS[filter === 'contact' ? 'all' : filter].rects
    const primary = (i: Item) => (i.kind === 'project' || i.kind === 'video' || i.kind === 'member' || i.kind === 'artwork' || i.kind === 'blog') && i.group === item.group
    const list = ITEMS.filter(primary).sort((a, b) => {
      const da = Math.hypot(L[a.index * 4] + L[a.index * 4 + 2] / 2, L[a.index * 4 + 1] + L[a.index * 4 + 3] / 2)
      const db = Math.hypot(L[b.index * 4] + L[b.index * 4 + 2] / 2, L[b.index * 4 + 1] + L[b.index * 4 + 3] / 2)
      return da - db
    })
    const anchor = list.findIndex((i) => i.route === item.route)
    return { list, anchor }
  }, [item, filter])

  const go = (d: number) => {
    if (!seq || seq.anchor < 0) return
    const n = seq.list[(seq.anchor + d + seq.list.length) % seq.list.length]
    navigate(`${BASE}/${n.route}`, { state: { tile: n.key } })
  }

  const addr = target === MARK_TARGET ? '0, 0' : item ? addressOf(item.index, filter === 'contact' ? 'all' : filter) : ''

  return (
    <aside className={`ar-panel ar-panel--${kind}`} ref={ref} aria-labelledby="ar-panel-title">
      <div className="ar-panel__bar">
        <span className="ar-panel__addr">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 1v14M1 8h14" stroke="currentColor" strokeWidth="1.2" />
          </svg>
          {addr}
        </span>
        <button type="button" className="ar-panel__close" onClick={onClose}>
          Close <kbd>Esc</kbd>
        </button>
      </div>
      <div className="ar-panel__scroll">
        {kind === 'about' && <AboutPanel />}
        {kind === 'contact' && <ContactPanel />}
        {item && kind === 'project' && <ProjectDossier item={item} />}
        {item && kind === 'member' && <MemberCard item={item} />}
        {item && kind === 'journal' && item.artwork && <ArtworkPanel item={item} />}
        {item && kind === 'journal' && item.blog && <BlogPanel item={item} />}
      </div>
      {seq && seq.anchor >= 0 && (
        <div className="ar-panel__foot">
          <button type="button" onClick={() => go(-1)}>
            Previous
          </button>
          <span>
            {seq.anchor + 1} of {seq.list.length}
          </span>
          <button type="button" onClick={() => go(1)}>
            Next
          </button>
        </div>
      )}
    </aside>
  )
}
