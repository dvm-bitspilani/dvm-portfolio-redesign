import '@fontsource/vt323'
import '@fontsource/ibm-plex-mono/500.css'
import './boot.css'
import { createContext, useContext, useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link, Outlet, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { artworks, blogs, projects, site, socials, team, verticals } from '../../data'
import { designBase } from '../registry'
import { makeApp } from './apps'
import { Engine, THEMES, type RouteId, type RouteParams, type ThemeName } from './engine/engine'

const BASE = designBase('boot')

interface Ctx {
  sync: (id: RouteId, p: RouteParams) => void
}
const EngineCtx = createContext<Ctx>({ sync: () => {} })

function Layout() {
  const screenRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const engineRef = useRef<Engine | null>(null)
  const routeRef = useRef<{ id: RouteId; p: RouteParams }>({ id: 'home', p: {} })
  const navigate = useNavigate()
  const navRef = useRef(navigate)
  navRef.current = navigate
  const [announce, setAnnounce] = useState('')
  const [state, setState] = useState<{ theme: ThemeName; crt: boolean; power: boolean }>({ theme: 'green', crt: true, power: true })

  useEffect(() => {
    const html = document.documentElement
    const prev = { o: html.style.overflow, b: document.body.style.overflow, bg: document.body.style.background }
    html.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    document.body.style.background = '#050505'
    return () => {
      html.style.overflow = prev.o
      document.body.style.overflow = prev.b
      document.body.style.background = prev.bg
    }
  }, [])

  useEffect(() => {
    const host = screenRef.current!
    // fresh canvas per mount so a disposed WebGL context is never reused
    const canvas = document.createElement('canvas')
    canvas.className = 'boot-canvas'
    canvas.setAttribute('aria-hidden', 'true')
    host.prepend(canvas)
    const e = new Engine(
      canvas,
      inputRef.current!,
      {
        navigate: (path) => navRef.current(path ? `${BASE}/${path}` : BASE),
        announce: (m) => setAnnounce(m),
        onState: (s) => setState({ theme: s.theme, crt: s.crt, power: s.power }),
      },
      makeApp,
    )
    engineRef.current = e
    e.init(routeRef.current.id, routeRef.current.p)
    if (!e.coarse) inputRef.current?.focus({ preventScroll: true })
    return () => {
      e.dispose()
      engineRef.current = null
      canvas.remove()
    }
  }, [])

  const ctx = useRef<Ctx>({
    sync: (id, p) => {
      routeRef.current = { id, p }
      engineRef.current?.setRoute(id, p)
    },
  })

  const ink = THEMES[state.theme].css
  const e = () => engineRef.current
  return (
    <EngineCtx.Provider value={ctx.current}>
      <div className="boot-root" style={{ '--ink': ink } as CSSProperties} data-crt={state.crt ? 'on' : 'off'}>
        <div className="boot-monitor">
          <div className="boot-screen" ref={screenRef}>
            <textarea
              ref={inputRef}
              className="boot-input"
              aria-label="Terminal command line. Type help and press Enter."
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              rows={1}
            />
          </div>
          <div className="boot-chin">
            <div className="boot-badge" aria-hidden="true">
              <span className="boot-wordmark">DVM</span>
              <span className="boot-model">visual media terminal · model 26</span>
            </div>
            <div className="boot-controls">
              <div className="boot-knob" role="group" aria-label="Phosphor colour">
                {(Object.keys(THEMES) as ThemeName[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    className="boot-key"
                    aria-pressed={state.theme === t}
                    onClick={() => e()?.setTheme(t)}
                    style={{ '--led': THEMES[t].css } as CSSProperties}
                  >
                    <i aria-hidden="true" />
                    {t}
                  </button>
                ))}
              </div>
              <button type="button" className="boot-key" aria-pressed={state.crt} onClick={() => e()?.setCrt(!state.crt)} title="Curvature, scanlines and glow">
                <i aria-hidden="true" />
                crt
              </button>
              <button
                type="button"
                className="boot-power"
                aria-label={state.power ? 'Power off the terminal' : 'Power on the terminal'}
                onClick={() => {
                  const en = e()
                  if (!en) return
                  if (state.power) en.powerOff()
                  else en.boot()
                }}
              >
                <span className="boot-led" data-on={state.power} aria-hidden="true" />
                <span aria-hidden="true">⏻</span>
              </button>
            </div>
          </div>
        </div>
        <nav className="boot-sr boot-nav" aria-label="Sections">
          <Link to={BASE}>Home</Link>
          <Link to={`${BASE}/work`}>Work</Link>
          <Link to={`${BASE}/team`}>Team</Link>
          <Link to={`${BASE}/journal`}>Journal</Link>
          <Link to={`${BASE}/contact`}>Contact</Link>
        </nav>
        <main className="boot-sr">
          <Outlet />
        </main>
        <div className="boot-sr" aria-live="polite">
          {announce}
        </div>
      </div>
    </EngineCtx.Provider>
  )
}

function useSync(id: RouteId, p: RouteParams) {
  const { sync } = useContext(EngineCtx)
  const key = JSON.stringify(p)
  useEffect(() => {
    sync(id, JSON.parse(key) as RouteParams)
  }, [id, key, sync])
}

function Home() {
  useSync('home', {})
  return (
    <article>
      <h1>
        {site.name}: {site.fullName}, {site.institution}
      </h1>
      {site.about.map((p) => (
        <p key={p}>{p}</p>
      ))}
      <h2>Selected projects</h2>
      <ul>
        {projects
          .filter((p) => p.featured)
          .map((p) => (
            <li key={p.slug}>
              <Link to={`${BASE}/work/${p.slug}`}>{p.title}</Link>
            </li>
          ))}
      </ul>
      <p>{site.taglines.mischief}</p>
    </article>
  )
}

function Work() {
  useSync('work', {})
  return (
    <article>
      <h1>Work: {projects.length} projects</h1>
      <ul>
        {projects.map((p) => (
          <li key={p.slug}>
            <Link to={`${BASE}/work/${p.slug}`}>{p.title}</Link> ({p.fest}, {p.kind}
            {p.year ? `, ${p.year}` : ''}). {p.summary}
          </li>
        ))}
      </ul>
    </article>
  )
}

function ProjectPage() {
  const { slug = '' } = useParams()
  useSync('project', { slug })
  const p = projects.find((x) => x.slug === slug)
  if (!p) return <h1>Project not found</h1>
  return (
    <article>
      <h1>{p.title}</h1>
      <p>
        {p.fest}, {p.kind}
        {p.year ? `, ${p.year}` : ''}
        {p.theme ? `. Theme: ${p.theme}` : ''}
      </p>
      {p.description && <p>{p.description}</p>}
      <ul>
        {p.links.live && (
          <li>
            <a href={p.links.live}>Live site</a>
          </li>
        )}
        {p.links.playStore && (
          <li>
            <a href={p.links.playStore}>Play Store</a>
          </li>
        )}
        {(p.links.youtube || p.youtubeId) && (
          <li>
            <a href={p.links.youtube ?? `https://www.youtube.com/watch?v=${p.youtubeId}`}>YouTube</a>
          </li>
        )}
      </ul>
      <Link to={`${BASE}/work`}>Back to work</Link>
    </article>
  )
}

function Team() {
  const [sp] = useSearchParams()
  const v = sp.get('v') ?? ''
  useSync('team', v ? { vertical: v } : {})
  return (
    <article>
      <h1>Team: {team.length} members</h1>
      {verticals
        .filter((x) => !v || x.id === v)
        .map((x) => (
          <section key={x.id}>
            <h2>{x.name}</h2>
            <p>{x.description}</p>
            <ul>
              {team
                .filter((m) => m.vertical === x.id)
                .map((m) => (
                  <li key={m.slug}>
                    {m.name}
                    {m.batch ? `, batch ${m.batch}` : ''}
                    {m.designation ? `, ${m.designation}` : ''}
                  </li>
                ))}
            </ul>
          </section>
        ))}
    </article>
  )
}

function Journal() {
  const [sp] = useSearchParams()
  const s = sp.get('s') ?? ''
  useSync('journal', s ? { section: s } : {})
  return (
    <article>
      <h1>Journal</h1>
      <h2>Posts</h2>
      <ul>
        {blogs.map((b) => (
          <li key={b.slug}>
            <a href={b.url}>{b.title}</a> by {b.authors.join(', ')}, {b.date}. {b.excerpt}
          </li>
        ))}
      </ul>
      <h2>Artworks</h2>
      <ul>
        {artworks.map((a) => (
          <li key={a.slug}>
            {a.links.artwork ? <a href={a.links.artwork}>{a.title}</a> : a.title} by {a.artist}, {a.year}
          </li>
        ))}
      </ul>
    </article>
  )
}

function Contact() {
  useSync('contact', {})
  return (
    <article>
      <h1>Contact</h1>
      <p>
        Write to <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>.
      </p>
      <ul>
        {socials.map((s) => (
          <li key={s.id}>
            <a href={s.url}>{s.label}</a>
          </li>
        ))}
      </ul>
    </article>
  )
}

export default function BootDesign() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="work" element={<Work />} />
        <Route path="work/:slug" element={<ProjectPage />} />
        <Route path="team" element={<Team />} />
        <Route path="journal" element={<Journal />} />
        <Route path="contact" element={<Contact />} />
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  )
}
