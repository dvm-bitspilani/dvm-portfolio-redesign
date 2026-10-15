import { useLayoutEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { artworks, blogs, site, socials, team, verticals, type Socials, type VerticalId } from '../../../data'
import {
  BASE,
  FEST_COLOR,
  VERTICAL_COLOR,
  VERTICAL_ORDER,
  exhibitProjects,
  kindLabel,
  projectsByFest,
  verticalById,
  type View,
} from '../content'
import { anchors, campus, useCampus } from '../store'
import { journalSlotIndex, journalSlots, posterSlots, projectSlotIndex, seatIndex, seats } from '../world/layout'
import { useIstClock } from './Chrome'

type Go = (to: string) => void

/* ---------------- shared placard (hangs from the top of the sky) ---------------- */
function Placard({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      campus.set({ panelW: Math.round(window.innerWidth - r.left + 8), panelH: Math.round(window.innerHeight - r.top + 8) })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
      campus.set({ panelW: 0, panelH: 0 })
    }
  }, [])
  return (
    <section ref={ref} className={`cmp-placard${wide ? ' is-wide' : ''}`} aria-label={label}>
      <span className="cmp-placard__wire" aria-hidden="true" />
      <span className="cmp-placard__wire is-r" aria-hidden="true" />
      {children}
    </section>
  )
}

const link = (go: Go, to: string) => ({
  href: to,
  onClick: (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return
    e.preventDefault()
    go(to)
  },
})

const hoverKey = (key: string | null, slot?: { p: { x: number; y: number; z: number }; h: number }) => {
  if (key && slot) anchors.set('caption', { x: slot.p.x, y: slot.p.y + slot.h / 2 + 0.03, z: slot.p.z })
  campus.set({ hoverItem: key })
}

/* ---------------- Work: the studio ---------------- */
export function WorkPanel({ go }: { go: Go }) {
  const hover = useCampus((s) => s.hoverItem)
  return (
    <Placard label="The Studio: projects">
      <div className="cmp-placard__head">
        <h1>The Studio</h1>
        <p className="cmp-lede">
          Every screen on these walls is something we shipped for APOGEE, Oasis, BOSM or the campus. {exhibitProjects.length} of them, newest at
          the back.
        </p>
      </div>
      <div className="cmp-placard__body">
        {projectsByFest.map((g) => (
          <section key={g.fest} className="cmp-group">
            <h2>
              <i style={{ background: FEST_COLOR[g.fest] }} />
              {g.fest === 'Campus' ? 'Around campus' : g.fest}
              <small>{g.items.length}</small>
            </h2>
            <ul className="cmp-rows">
              {g.items.map((p) => {
                const key = `p:${p.slug}`
                return (
                  <li key={p.slug}>
                    <a
                      {...link(go, `${BASE}/work/${p.slug}`)}
                      className={hover === key ? 'is-hot' : undefined}
                      onMouseEnter={() => hoverKey(key, posterSlots[projectSlotIndex.get(p.slug)!])}
                      onMouseLeave={() => hoverKey(null)}
                      onFocus={() => hoverKey(key, posterSlots[projectSlotIndex.get(p.slug)!])}
                      onBlur={() => hoverKey(null)}
                    >
                      <span>{p.title}</span>
                      <small>
                        {kindLabel[p.kind]}
                        {p.year ? `, ${p.year}` : ''}
                      </small>
                    </a>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </Placard>
  )
}

export function ProjectPanel({ go }: { go: Go }) {
  const { slug = '' } = useParams()
  const i = exhibitProjects.findIndex((p) => p.slug === slug)
  const p = exhibitProjects[i]
  if (!p)
    return (
      <Placard label="Project not found">
        <div className="cmp-placard__head">
          <h1>Nothing on this wall</h1>
          <p className="cmp-lede">There's no project called “{slug}” in the studio. It may have been renamed.</p>
          <a className="cmp-btn" {...link(go, `${BASE}/work`)}>
            Back to the studio
          </a>
        </div>
      </Placard>
    )
  const prev = exhibitProjects[(i - 1 + exhibitProjects.length) % exhibitProjects.length]
  const next = exhibitProjects[(i + 1) % exhibitProjects.length]
  const paras = (p.description ?? p.summary ?? '').split(/(?<=\.)\s+(?=[A-Z])/).reduce<string[]>((acc, s) => {
    if (!acc.length || acc[acc.length - 1].length > 260) acc.push(s)
    else acc[acc.length - 1] += ` ${s}`
    return acc
  }, [])
  const img = p.mockup ?? p.cover
  const shots = [...(p.gallery ?? []), ...(p.mobileGallery ?? [])].slice(0, 3)
  return (
    <Placard label={p.title} wide>
      <div className="cmp-placard__head">
        <p className="cmp-meta">
          <i style={{ background: FEST_COLOR[p.fest] }} />
          {p.fest}, {p.date ?? p.year ?? 'undated'}
        </p>
        <h1>{p.title}</h1>
        {(p.subtitle || p.theme) && <p className="cmp-sub">{p.subtitle ?? `Theme: “${p.theme}”`}</p>}
      </div>
      <div className="cmp-placard__body" key={p.slug}>
        {img && (
          <figure className={`cmp-hero-img${p.mockup ? ' is-mockup' : ''}`}>
            <img src={img} alt={`${p.title}${p.mockup ? ' shown on devices' : ' cover'}`} />
          </figure>
        )}
        <div className="cmp-prose">
          {paras.map((t, k) => (
            <p key={k}>{t}</p>
          ))}
        </div>
        <dl className="cmp-facts">
          <div>
            <dt>Type</dt>
            <dd>{kindLabel[p.kind]}</dd>
          </div>
          <div>
            <dt>Made by</dt>
            <dd>{p.verticals.map((v) => verticalById[v].label).join(', ')}</dd>
          </div>
        </dl>
        <div className="cmp-actions">
          {p.links.live && (
            <a className="cmp-btn" href={p.links.live} target="_blank" rel="noreferrer">
              Visit the live site
            </a>
          )}
          {p.links.youtube && (
            <a className="cmp-btn" href={p.links.youtube} target="_blank" rel="noreferrer">
              Watch on YouTube
            </a>
          )}
          {!p.links.youtube && p.youtubeId && (
            <a className="cmp-btn" href={`https://www.youtube.com/watch?v=${p.youtubeId}`} target="_blank" rel="noreferrer">
              Watch on YouTube
            </a>
          )}
          {p.links.playStore && (
            <a className="cmp-btn" href={p.links.playStore} target="_blank" rel="noreferrer">
              Get it on Google Play
            </a>
          )}
        </div>
        {shots.length > 0 && (
          <div className="cmp-shots">
            {shots.map((s) => (
              <a key={s} href={s} target="_blank" rel="noreferrer">
                <img src={s} alt={`${p.title} screenshot`} loading="lazy" />
              </a>
            ))}
          </div>
        )}
      </div>
      <nav className="cmp-placard__foot" aria-label="More screens">
        <a {...link(go, `${BASE}/work/${prev.slug}`)} title={prev.title}>
          Previous screen
        </a>
        <a {...link(go, `${BASE}/work`)}>All projects</a>
        <a {...link(go, `${BASE}/work/${next.slug}`)} title={next.title}>
          Next screen
        </a>
      </nav>
    </Placard>
  )
}

/* ---------------- Team: the amphitheatre ---------------- */
const SOCIAL_LABEL: Record<keyof Socials, string> = {
  github: 'GitHub',
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
  twitter: 'Twitter',
  dribbble: 'Dribbble',
  behance: 'Behance',
  facebook: 'Facebook',
}

export function TeamPanel({ go, view }: { go: Go; view: View }) {
  const filter = useCampus((s) => s.teamFilter)
  const hover = useCampus((s) => s.hoverItem)
  const member = view.focus ? team.find((m) => m.slug === view.focus) : undefined
  const shown = VERTICAL_ORDER.filter((v) => !filter || v === filter)
  const seatOf = (slug: string) => {
    const s = seats[seatIndex.get(slug)!]
    return { p: s.p, h: 0.4 }
  }
  return (
    <Placard label="The Amphitheatre: team">
      <div className="cmp-placard__head">
        <h1>The Amphitheatre</h1>
        <p className="cmp-lede">
          {team.length} people have taken a seat here since 2017. Each colour is one of our five teams; pick someone to see who they are.
        </p>
        <div className="cmp-chips" role="group" aria-label="Filter by team">
          <button type="button" aria-pressed={!filter} onClick={() => campus.set({ teamFilter: null })}>
            Everyone
          </button>
          {VERTICAL_ORDER.map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={filter === v}
              style={{ ['--c' as string]: VERTICAL_COLOR[v] }}
              onClick={() => campus.set({ teamFilter: filter === v ? null : v })}
            >
              <i />
              {verticalById[v].label}
            </button>
          ))}
        </div>
      </div>
      <div className="cmp-placard__body" key={member?.slug ?? 'all'}>
        {member && (
          <article className="cmp-portrait" style={{ ['--c' as string]: VERTICAL_COLOR[member.vertical] }} key={member.slug}>
            <img src={member.photo} alt={`Portrait of ${member.name}`} />
            <div>
              <h2>{member.name}</h2>
              <p>
                {verticalById[member.vertical].name}, joined {member.batch}
              </p>
              {member.designation && <p className="cmp-portrait__role">{member.designation}</p>}
              <ul className="cmp-socials">
                {(Object.entries(member.socials) as [keyof Socials, string][]).map(([k, url]) => (
                  <li key={k}>
                    <a href={url} target="_blank" rel="noreferrer">
                      {SOCIAL_LABEL[k]}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <a className="cmp-x" aria-label="Close portrait" {...link(go, `${BASE}/team`)}>
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </a>
          </article>
        )}
        {filter && <p className="cmp-vdesc">{verticals.find((v) => v.id === filter)?.description}</p>}
        {shown.map((v: VerticalId) => {
          const ms = team.filter((m) => m.vertical === v).sort((a, b) => b.batch - a.batch || a.name.localeCompare(b.name))
          return (
            <section key={v} className="cmp-group">
              <h2>
                <i style={{ background: VERTICAL_COLOR[v] }} />
                {verticalById[v].name}
                <small>{ms.length}</small>
              </h2>
              <ul className="cmp-names">
                {ms.map((m) => {
                  const key = `m:${m.slug}`
                  return (
                    <li key={m.slug}>
                      <a
                        {...link(go, `${BASE}/team?m=${m.slug}`)}
                        className={`${hover === key ? 'is-hot' : ''}${member?.slug === m.slug ? ' is-sel' : ''}`}
                        onMouseEnter={() => hoverKey(key, seatOf(m.slug))}
                        onMouseLeave={() => hoverKey(null)}
                        onFocus={() => hoverKey(key, seatOf(m.slug))}
                        onBlur={() => hoverKey(null)}
                      >
                        {m.name}
                        <small>{m.designation ?? m.batch}</small>
                      </a>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>
    </Placard>
  )
}

/* ---------------- Journal: the library ---------------- */
export function JournalPanel({ go, view }: { go: Go; view: View }) {
  const hover = useCampus((s) => s.hoverItem)
  const focus = view.focus
  const blog = focus?.startsWith('b:') ? blogs.find((b) => b.slug === focus.slice(2)) : undefined
  const art = focus?.startsWith('a:') ? artworks.find((a) => a.slug === focus.slice(2)) : undefined
  const slotOf = (key: string) => journalSlots[journalSlotIndex.get(key)!]
  const row = (key: string, title: string, sub: string) => (
    <li key={key}>
      <a
        {...link(go, `${BASE}/journal?item=${encodeURIComponent(key)}`)}
        className={`${hover === key ? 'is-hot' : ''}${focus === key ? ' is-sel' : ''}`}
        onMouseEnter={() => hoverKey(key, slotOf(key))}
        onMouseLeave={() => hoverKey(null)}
        onFocus={() => hoverKey(key, slotOf(key))}
        onBlur={() => hoverKey(null)}
      >
        <span>{title}</span>
        <small>{sub}</small>
      </a>
    </li>
  )
  return (
    <Placard label="The Library: journal" wide={!!(blog || art)}>
      <div className="cmp-placard__head">
        <h1>The Library</h1>
        <p className="cmp-lede">Writing on the shelf, art on the walls. Everything here was made by people in the department.</p>
      </div>
      <div className="cmp-placard__body" key={focus ?? 'all'}>
        {blog && (
          <article className="cmp-item" key={blog.slug}>
            <img src={blog.cover} alt="" />
            <h2>{blog.title}</h2>
            <p className="cmp-meta">
              {blog.authors.join(' & ')}, {blog.date}, {blog.readMinutes} min read
            </p>
            <p>{blog.excerpt}</p>
            <div className="cmp-actions">
              <a className="cmp-btn" href={blog.url} target="_blank" rel="noreferrer">
                Read it on {blog.platform}
              </a>
              <a className="cmp-btn is-quiet" {...link(go, `${BASE}/journal`)}>
                Back to the shelf
              </a>
            </div>
          </article>
        )}
        {art && (
          <article className="cmp-item" key={art.slug}>
            <img src={art.image} alt={art.title} className="is-art" />
            <h2>{art.title}</h2>
            <p className="cmp-meta">
              {art.artist}, {art.year}
              {art.platform ? ` on ${art.platform}` : ''}
            </p>
            {art.description && <p>{art.description}</p>}
            <div className="cmp-actions">
              {art.links.artwork && (
                <a className="cmp-btn" href={art.links.artwork} target="_blank" rel="noreferrer">
                  See the full piece
                </a>
              )}
              <a className="cmp-btn is-quiet" {...link(go, `${BASE}/journal`)}>
                Back to the walls
              </a>
            </div>
          </article>
        )}
        <section className="cmp-group">
          <h2>
            <i style={{ background: '#8f72ff' }} />
            On the shelf
            <small>{blogs.length}</small>
          </h2>
          <ul className="cmp-rows">{blogs.map((b) => row(`b:${b.slug}`, b.shortTitle ?? b.title, `${b.authors.join(' & ')}, ${b.readMinutes} min`))}</ul>
        </section>
        <section className="cmp-group">
          <h2>
            <i style={{ background: '#ff9a62' }} />
            On the walls
            <small>{artworks.length}</small>
          </h2>
          <ul className="cmp-rows">{artworks.map((a) => row(`a:${a.slug}`, a.title, `${a.artist}, ${a.year}`))}</ul>
        </section>
      </div>
    </Placard>
  )
}

/* ---------------- Contact: the clock tower ---------------- */
export function ContactPanel() {
  const time = useIstClock()
  const [status, setStatus] = useState<'idle' | 'error' | 'sent'>('idle')
  const [error, setError] = useState('')
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const name = String(f.get('name') ?? '').trim()
    const email = String(f.get('email') ?? '').trim()
    const phone = String(f.get('phone') ?? '').trim()
    const message = String(f.get('message') ?? '').trim()
    if (!name || !email || !message) {
      setStatus('error')
      setError('Add your name, email and a message so we can write back.')
      return
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setStatus('error')
      setError('That email address looks incomplete. Check it and send again.')
      return
    }
    campus.set({ transmitAt: performance.now() })
    const body = `${message}\n\n${name}\n${email}${phone ? `\n${phone}` : ''}`
    window.location.href = `mailto:${site.contact.email}?subject=${encodeURIComponent(`Hello DVM, from ${name}`)}&body=${encodeURIComponent(body)}`
    setStatus('sent')
  }
  return (
    <Placard label="The Clock Tower: contact">
      <div className="cmp-placard__head">
        <h1>The Clock Tower</h1>
        <p className="cmp-lede">
          There's a radio on top of the tower. Write to us and the signal goes out to <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>.
        </p>
        <p className="cmp-time-line">It's {time} in Pilani.</p>
      </div>
      <div className="cmp-placard__body">
        <form className="cmp-form" onSubmit={submit} noValidate>
          <label>
            <span>Name</span>
            <input name="name" autoComplete="name" required />
          </label>
          <label>
            <span>Email</span>
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            <span>
              Phone number <em>optional</em>
            </span>
            <input name="phone" type="tel" autoComplete="tel" />
          </label>
          <label>
            <span>Message</span>
            <textarea name="message" rows={4} required />
          </label>
          <button type="submit" className="cmp-btn is-solid">
            Send the signal
          </button>
          <p className="cmp-form__status" role="status" aria-live="polite">
            {status === 'error' && <span className="is-err">{error}</span>}
            {status === 'sent' && <span>Signal sent. Your mail app should open with the message ready to go.</span>}
          </p>
        </form>
        <section className="cmp-group">
          <h2>Elsewhere</h2>
          <ul className="cmp-socials is-row">
            {socials.map((s) => (
              <li key={s.id}>
                <a href={s.url} target="_blank" rel="noreferrer">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Placard>
  )
}
