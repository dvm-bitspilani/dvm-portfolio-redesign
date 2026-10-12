import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { fests, site, socials, stats, verticals, type Socials } from '../../../data'
import { fmtCoord, MARK_TARGET, type WallItem, type WallModel } from '../model'
import type { ItemLinkProps } from './IndexList'

const vName = (id: string) => verticals.find((v) => v.id === id)
const SOCIAL_LABEL: Record<keyof Socials, string> = {
  github: 'GitHub', linkedin: 'LinkedIn', instagram: 'Instagram', twitter: 'Twitter', dribbble: 'Dribbble', behance: 'Behance', facebook: 'Facebook',
}
const KIND_LABEL: Record<string, string> = {
  project: 'project', film: 'film', mockup: 'mockup', screen: 'desktop screen', mobile: 'mobile screen',
  artwork: 'artwork', essay: 'essay', member: 'member', contact: 'contact',
}

function Ext({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className="imm-archive-btn" href={href} target="_blank" rel="noreferrer">
      {children}
      <svg viewBox="0 0 12 12" aria-hidden="true">
        <path d="M3.5 2.5h6v6M9.5 2.5 2.5 9.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
      </svg>
      <span className="imm-archive-vh"> (opens in a new tab)</span>
    </a>
  )
}

function SocialLinks({ s }: { s?: Socials }) {
  const entries = Object.entries(s ?? {}).filter(([, v]) => v) as [keyof Socials, string][]
  if (!entries.length) return null
  return (
    <ul className="imm-archive-socials">
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

interface Ctx {
  Link: ComponentType<ItemLinkProps>
  model: WallModel
}

function Thumbs({ items, current, label, ctx }: { items: WallItem[]; current?: number; label: string; ctx: Ctx }) {
  if (items.length < 2) return null
  const { Link } = ctx
  return (
    <div className="imm-archive-thumbs">
      <h3>{label}</h3>
      <ul>
        {items.map((it) => (
          <li key={it.id}>
            <Link item={it} className={it.index === current ? 'is-current' : ''} current={it.index === current} title={`${it.item.title}, ${KIND_LABEL[it.kind] ?? it.kind}`}>
              {it.img ? <img src={it.img} alt="" loading="lazy" /> : <span className="imm-archive-thumbs__txt">{it.item.title}</span>}
              <span className="imm-archive-vh">
                {it.item.title}, {KIND_LABEL[it.kind] ?? it.kind}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ProjectDossier({ item, ctx }: { item: WallItem; ctx: Ctx }) {
  const p = item.item.project!
  const [play, setPlay] = useState(false)
  const tiles = ctx.model.items.filter((i) => i.item.project?.slug === p.slug)
  const kindWord = p.kind === 'video' ? 'Film' : p.kind === 'app' ? 'App' : p.kind === 'portal' ? 'Portal' : 'Website'
  const fest = fests.find((f) => f.id === p.fest)
  return (
    <>
      <p className="imm-archive-panel__kicker">
        {kindWord} for {p.fest === 'Campus' ? 'the campus' : p.fest}
        {p.date ? `, ${p.date}` : p.year ? `, ${p.year}` : ''}
      </p>
      <h2 id="imm-archive-panel-title" tabIndex={-1}>
        {p.title}
      </h2>
      {p.subtitle && <p className="imm-archive-panel__sub">{p.subtitle}</p>}
      {p.summary && <p className="imm-archive-panel__lead">{p.summary}</p>}

      {p.youtubeId && (
        <div className="imm-archive-film">
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
              <span className="imm-archive-film__play" aria-hidden="true" />
              <span className="imm-archive-film__label">Play here</span>
            </button>
          )}
        </div>
      )}

      <dl className="imm-archive-meta">
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

      <div className="imm-archive-actions">
        {p.links.live && <Ext href={p.links.live}>Open the live site</Ext>}
        {p.links.playStore && <Ext href={p.links.playStore}>Get it on Google Play</Ext>}
        {p.links.youtube && <Ext href={p.links.youtube}>Watch on YouTube</Ext>}
      </div>

      <Thumbs items={tiles} current={item.index} label={`On the wall (${tiles.length})`} ctx={ctx} />

      {p.description && p.description !== p.summary && <p className="imm-archive-panel__body-copy">{p.description}</p>}
      {(p.festContext || fest) && (
        <details className="imm-archive-more">
          <summary>About {p.fest === 'Campus' ? 'this project' : p.fest}</summary>
          <p>{p.festContext ?? fest?.blurb}</p>
        </details>
      )}
    </>
  )
}

function MemberCard({ item, ctx }: { item: WallItem; ctx: Ctx }) {
  const m = item.item.member!
  const v = vName(m.vertical)
  const mates = ctx.model.items.filter((i) => i.item.member && i.item.member.batch === m.batch && i.item.member.vertical === m.vertical)
  return (
    <>
      <p className="imm-archive-panel__kicker">
        {v?.name ?? m.vertical}, joined {m.batch}
      </p>
      <h2 id="imm-archive-panel-title" tabIndex={-1}>
        {m.name}
      </h2>
      {m.designation && <p className="imm-archive-panel__lead">{m.designation}</p>}
      <SocialLinks s={m.socials} />
      <Thumbs items={mates} current={item.index} label={`${v?.label ?? ''} batch of ${m.batch} (${mates.length})`} ctx={ctx} />
      {v && (
        <details className="imm-archive-more" open>
          <summary>What the {v.label} team does</summary>
          <p>{v.description}</p>
        </details>
      )}
    </>
  )
}

function ArtworkPanel({ item, ctx }: { item: WallItem; ctx: Ctx }) {
  const a = item.item.artwork!
  const others = ctx.model.items.filter((i) => i.item.artwork && i.item.artwork.artist === a.artist)
  return (
    <>
      <p className="imm-archive-panel__kicker">
        Artwork by {a.artist}, {a.year}
      </p>
      <h2 id="imm-archive-panel-title" tabIndex={-1}>
        {a.title}
      </h2>
      {a.description && <p className="imm-archive-panel__lead">{a.description}</p>}
      <div className="imm-archive-actions">
        {a.links.artwork && <Ext href={a.links.artwork}>{a.platform ? `See it on ${a.platform}` : 'See the original'}</Ext>}
        {a.links.portfolio && <Ext href={a.links.portfolio}>{a.artist.split(' ')[0]}’s portfolio</Ext>}
      </div>
      <SocialLinks s={a.artistSocials} />
      <Thumbs items={others} current={item.index} label={`More by ${a.artist} (${others.length})`} ctx={ctx} />
    </>
  )
}

function EssayPanel({ item }: { item: WallItem }) {
  const b = item.item.blog!
  return (
    <>
      <p className="imm-archive-panel__kicker">
        Essay, {b.date}, {b.readMinutes} min read
      </p>
      <h2 id="imm-archive-panel-title" tabIndex={-1}>
        {b.title}
      </h2>
      <p className="imm-archive-panel__by">By {b.authors.join(' and ')}</p>
      <p className="imm-archive-panel__lead">{b.excerpt}</p>
      {b.tags.length > 0 && (
        <ul className="imm-archive-tags" aria-label="Topics">
          {b.tags.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      )}
      <div className="imm-archive-actions">
        <Ext href={b.url}>Read it on {b.platform}</Ext>
      </div>
    </>
  )
}

function GenericPanel({ item }: { item: WallItem }) {
  const s = item.item
  return (
    <>
      <p className="imm-archive-panel__kicker">{s.line ?? KIND_LABEL[s.kind] ?? s.kind}</p>
      <h2 id="imm-archive-panel-title" tabIndex={-1}>
        {s.title}
      </h2>
      {s.image && <img className="imm-archive-panel__img" src={s.image} alt="" />}
      {s.href && (
        <div className="imm-archive-actions">
          <Ext href={s.href}>Open</Ext>
        </div>
      )}
    </>
  )
}

function AboutPanel({ onFilter, hasTeam }: { onFilter: (id: string) => void; hasTeam: boolean }) {
  const shown = stats.filter((s) => ['users on our apps and websites', 'teams', 'members on record', 'artworks'].includes(s.label) || s.label.startsWith('websites') || s.label.startsWith('teasers'))
  return (
    <>
      <p className="imm-archive-panel__kicker">The mark at 0, 0</p>
      <h2 id="imm-archive-panel-title" tabIndex={-1}>
        {site.headline}
      </h2>
      {site.about.map((p) => (
        <p key={p} className="imm-archive-panel__body-copy">
          {p}
        </p>
      ))}
      <dl className="imm-archive-stats">
        {shown.map((s) => (
          <div key={s.label}>
            <dt>{s.label}</dt>
            <dd>{s.display}</dd>
          </div>
        ))}
      </dl>
      <div className="imm-archive-teams">
        <h3>Five teams</h3>
        <ul>
          {verticals.map((v) => (
            <li key={v.id}>
              <strong>{v.name}</strong>
              <span>{v.description}</span>
            </li>
          ))}
        </ul>
        {hasTeam && (
          <button type="button" className="imm-archive-btn" onClick={() => onFilter('team')}>
            Show only the team on the wall
          </button>
        )}
      </div>
    </>
  )
}

function ContactPanel({ item }: { item?: WallItem }) {
  const [name, setName] = useState('')
  const [msg, setMsg] = useState('')
  const email = site.contact.email
  const href = `mailto:${email}?subject=${encodeURIComponent(`Hello DVM${name ? `, from ${name}` : ''}`)}&body=${encodeURIComponent(msg)}`
  const pin = item?.item.pin
  return (
    <>
      <p className="imm-archive-panel__kicker">{pin && item ? `The teal tile, always at ${fmtCoord(pin.x + item.w / 2, -(pin.y + item.h / 2))}` : 'Contact'}</p>
      <h2 id="imm-archive-panel-title" tabIndex={-1}>
        Write to DVM
      </h2>
      <p className="imm-archive-panel__lead">
        For fest websites and apps, sponsorships, joining the department or anything on this wall, write to <a href={`mailto:${email}`}>{email}</a>.
      </p>
      <form
        className="imm-archive-form"
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
        <button type="submit" className="imm-archive-btn imm-archive-btn--solid">
          Open in your mail app
        </button>
      </form>
      <ul className="imm-archive-socials">
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

export default function Detail({
  target, model, filter, onClose, onOpen, onFilter, Link, style,
}: {
  target: number
  model: WallModel
  filter: string
  onClose: () => void
  onOpen: (id: string) => void
  onFilter: (id: string) => void
  Link: ComponentType<ItemLinkProps>
  style?: React.CSSProperties
}) {
  const ref = useRef<HTMLElement>(null)
  const item = target >= 0 ? model.items[target] : null
  const ctx: Ctx = { Link, model }

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true })
  }, [target])

  const addrFilter = model.layout(filter).count <= 2 ? 'all' : filter

  // Previous / next along the spiral of this category, nearest the origin first.
  const seq = useMemo(() => {
    if (!item || item.kind === 'contact') return null
    const owner = item.item.parent ? model.byId.get(item.item.parent) ?? item : item
    const L = model.layout(addrFilter).rects
    const list = model.items
      .filter((i) => i.primary && i.kind !== 'contact' && i.item.category === owner.item.category)
      .sort((a, b) => {
        const da = Math.hypot(L[a.index * 4] + L[a.index * 4 + 2] / 2, L[a.index * 4 + 1] + L[a.index * 4 + 3] / 2)
        const db = Math.hypot(L[b.index * 4] + L[b.index * 4 + 2] / 2, L[b.index * 4 + 1] + L[b.index * 4 + 3] / 2)
        return da - db
      })
    return { list, anchor: list.indexOf(owner) }
  }, [item, model, addrFilter])

  const go = (d: number) => {
    if (!seq || seq.anchor < 0) return
    onOpen(seq.list[(seq.anchor + d + seq.list.length) % seq.list.length].id)
  }

  const addr = target === MARK_TARGET ? '0, 0' : item ? model.addressOf(item.index, addrFilter) : ''
  const s = item?.item
  const kind = target === MARK_TARGET ? 'about' : item?.kind ?? 'generic'

  return (
    <aside className={`imm-archive-panel imm-archive-panel--${kind}`} ref={ref} aria-labelledby="imm-archive-panel-title" style={style}>
      <div className="imm-archive-panel__bar">
        <span className="imm-archive-panel__addr">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 1v14M1 8h14" stroke="currentColor" strokeWidth="1.2" />
          </svg>
          {addr}
        </span>
        <button type="button" className="imm-archive-panel__close" onClick={onClose}>
          Close <kbd>Esc</kbd>
        </button>
      </div>
      <div className="imm-archive-panel__scroll">
        {target === MARK_TARGET && <AboutPanel onFilter={onFilter} hasTeam={model.items.some((i) => i.kind === 'member')} />}
        {item && kind === 'contact' && <ContactPanel item={item} />}
        {item && s?.project && <ProjectDossier item={item} ctx={ctx} />}
        {item && !s?.project && s?.member && <MemberCard item={item} ctx={ctx} />}
        {item && !s?.project && s?.artwork && <ArtworkPanel item={item} ctx={ctx} />}
        {item && !s?.project && s?.blog && <EssayPanel item={item} />}
        {item && kind !== 'contact' && !s?.project && !s?.member && !s?.artwork && !s?.blog && <GenericPanel item={item} />}
      </div>
      {seq && seq.anchor >= 0 && seq.list.length > 1 && (
        <div className="imm-archive-panel__foot">
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
