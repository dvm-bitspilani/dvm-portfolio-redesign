import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ham from '../../../assests/hamBtn.png'
import bg3 from '../../../assests/bg_3.png'
import { LOGO_PATHS, LOGO_TRANSFORM } from '../../shared/logo'
import { ArchiveWall, buildArchiveItems, type ArchiveItem, type ArchiveWallHandle, type ArchiveWallProps } from './index'
import s from './demo.module.css'

type PresetId = 'page' | 'projects' | 'transparent' | 'slot' | 'quiet'

const PRESETS: { id: PresetId; label: string; note: string }[] = [
  { id: 'page', label: 'Archive page', note: 'Everything, URL-synced (?f=…&item=…), built-in dossier.' },
  { id: 'projects', label: 'Projects page', note: 'Only work and films, tabs by team, opens on Work.' },
  { id: 'transparent', label: 'Over the texture', note: 'background="transparent": the page’s grid and outlined DVM show through.' },
  { id: 'slot', label: 'Custom centrepiece', note: 'centerpiece={<node />} tracked to 0, 0; detail="none" with onOpen.' },
  { id: 'quiet', label: 'Static backdrop', note: 'interactive={false}, no tabs or HUD, low quality: a living wallpaper.' },
]

/** Example DOM centrepiece: the mark inside slow survey rings. Rendered at 640 x 512 and scaled by the wall. */
function RingMark() {
  return (
    <svg className={s.ring} viewBox="0 0 640 512" aria-hidden="true">
      <g className={s.ringSpin}>
        <circle cx="320" cy="236" r="200" fill="none" stroke="#45e6ff" strokeOpacity="0.5" strokeDasharray="2 10" />
        <circle cx="320" cy="236" r="168" fill="none" stroke="#45e6ff" strokeOpacity="0.25" />
      </g>
      <circle cx="320" cy="236" r="132" fill="none" stroke="#cfe8ff" strokeOpacity="0.18" strokeDasharray="40 8" />
      <g transform="translate(232 148) scale(0.47)">
        <g transform={`translate(${LOGO_TRANSFORM.x} ${LOGO_TRANSFORM.y})`}>
          {LOGO_PATHS.map((d) => (
            <path key={d} d={d} fill="#ffffff" />
          ))}
        </g>
      </g>
    </svg>
  )
}

export default function ArchiveDemo() {
  const [preset, setPreset] = useState<PresetId>('page')
  const [drawer, setDrawer] = useState(false)
  const [quality, setQuality] = useState<'auto' | 'low' | 'high'>('auto')
  const [texture, setTexture] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const wall = useRef<ArchiveWallHandle>(null)

  // Page-level: the archive owns the viewport while mounted.
  useEffect(() => {
    const html = document.documentElement, body = document.body
    const prev = [html.style.overflow, body.style.overflow, body.style.background, body.style.margin]
    html.style.overflow = body.style.overflow = 'hidden'
    body.style.background = '#050506'
    body.style.margin = '0'
    return () => {
      ;[html.style.overflow, body.style.overflow, body.style.background, body.style.margin] = prev
    }
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(t)
  }, [toast])

  const projectItems = useMemo<ArchiveItem[]>(
    () => buildArchiveItems({ members: false, artworks: false, essays: false, contact: false }),
    [],
  )

  const props: ArchiveWallProps = useMemo(() => {
    const base: ArchiveWallProps = { insetTop: 88, quality, texture }
    switch (preset) {
      case 'projects':
        return {
          ...base,
          items: projectItems,
          filters: ['all', 'work', 'films', 'design', 'frontend', 'backend', 'app'],
          initialFilter: 'work',
          title: 'Projects',
          routing: true,
        }
      case 'transparent':
        return { ...base, background: 'transparent', routing: true }
      case 'slot':
        return {
          ...base,
          centerpiece: <RingMark />,
          detail: 'none',
          onOpen: (it) => it && setToast(`onOpen("${it.id}")  ${it.title}`),
        }
      case 'quiet':
        return { ...base, interactive: false, showTabs: false, showHud: false, title: false, quality: 'low', intro: false }
      default:
        return { ...base, routing: true }
    }
  }, [preset, quality, texture, projectItems])

  return (
    <div className={`${s.page} ${preset === 'transparent' ? s.isTextured : ''}`}>
      {preset === 'transparent' && (
        <div className={s.backdrop} aria-hidden="true">
          <div className={s.texture} style={{ backgroundImage: `url(${bg3})` }} />
          <div className={s.grid} />
          <div className={s.letters}>DVM</div>
        </div>
      )}

      <main className={s.wall}>
        {/* key: creation-time options (items / quality / intro) remount the wall */}
        <ArchiveWall key={preset} ref={wall} {...props} />
      </main>

      {/* Replica of the redesign's Navbar */}
      <header className={s.nav}>
        <Link to="/" className={s.brand}>
          DVM
        </Link>
        <div className={s.navRight}>
          <button type="button" className={s.presetBtn} onClick={() => setDrawer((d) => !d)} aria-expanded={drawer}>
            Kit presets
          </button>
          <button type="button" className={s.ham} onClick={() => setDrawer((d) => !d)} aria-label="Open the presets">
            <img src={ham} alt="" />
          </button>
        </div>
      </header>

      {drawer && (
        <aside className={s.drawer} aria-label="ArchiveWall presets">
          <h2>ArchiveWall</h2>
          <p className={s.lede}>Same component, five ways to mount it.</p>
          <ul className={s.presets}>
            {PRESETS.map((p) => (
              <li key={p.id}>
                <button type="button" aria-pressed={preset === p.id} onClick={() => setPreset(p.id)}>
                  <strong>{p.label}</strong>
                  <span>{p.note}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className={s.row}>
            <span>quality</span>
            {(['auto', 'low', 'high'] as const).map((q) => (
              <button key={q} type="button" aria-pressed={quality === q} onClick={() => setQuality(q)}>
                {q}
              </button>
            ))}
          </div>
          <div className={s.row}>
            <span>texture</span>
            <button type="button" aria-pressed={texture} onClick={() => setTexture((t) => !t)}>
              {texture ? 'on' : 'off'}
            </button>
          </div>
          <div className={s.row}>
            <span>ref</span>
            <button type="button" onClick={() => wall.current?.open('apogee-24-website')}>
              open(&apos;apogee-24-website&apos;)
            </button>
            <button type="button" onClick={() => wall.current?.home()}>
              home()
            </button>
          </div>
        </aside>
      )}

      {toast && (
        <div className={s.toast} role="status">
          {toast}
        </div>
      )}
    </div>
  )
}
