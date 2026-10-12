import '@fontsource-variable/jetbrains-mono'
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from 'react'
import texture from '../../../assests/bg_3.png'
import { artworks, projects } from '../../data'
import { AsciiBoot, AsciiImage, AsciiLogo, PALETTES, type AsciiLogoHandle, type AutoRotate, type FontName, type PaletteName, type RevealMode } from './index'
import css from './demo.module.css'

const PALETTE_ORDER: PaletteName[] = ['teal', 'green', 'amber', 'ice', 'pale']
const pick = (slug: string) => projects.find((p) => p.slug === slug)
const wolf = artworks.find((a) => a.slug === 'wolf')
const COVERS: { key: string; src: string; title: string; meta: string }[] = [
  { key: 'a24', p: pick('apogee-24-curtain-raiser') },
  { key: 'o19', p: pick('oasis-19-nucleya-teaser') },
]
  .filter((c) => c.p?.cover)
  .map((c) => ({ key: c.key, src: c.p!.cover!, title: c.p!.title, meta: c.p!.fest as string }))
  .concat(wolf ? [{ key: 'wolf', src: wolf.image, title: wolf.title, meta: wolf.artist }] : [])

/** ?once → the boot uses sessionStorage (first visit per session only) */
const ONCE = typeof location !== 'undefined' && new URLSearchParams(location.search).has('once')

type RotateKey = 'spin' | 'sway' | 'off'
const ROTATE: Record<RotateKey, AutoRotate> = { spin: 0.32, sway: 'sway', off: false }

function Seg<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: T[]; onChange: (v: T) => void }) {
  return (
    <div className={css.seg} role="group" aria-label={label}>
      <span className={css.segLabel}>{label}</span>
      {options.map((o) => (
        <button key={o} type="button" aria-pressed={value === o} onClick={() => onChange(o)}>
          {o}
        </button>
      ))}
    </div>
  )
}

export default function AsciiDemo() {
  const [boot, setBoot] = useState(1)
  const [booting, setBooting] = useState(true)
  const [font, setFont] = useState<FontName>('vt323')
  const [reveal, setReveal] = useState<RevealMode>('decode')
  const [rotate, setRotate] = useState<RotateKey>('spin')
  const [heroCrt, setHeroCrt] = useState(true)
  const heroRef = useRef<AsciiLogoHandle>(null)
  const crtRef = useRef<AsciiLogoHandle>(null)
  const flatRef = useRef<AsciiLogoHandle>(null)
  const texRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const prev = document.body.style.background
    document.body.style.background = '#050506'
    return () => {
      document.body.style.background = prev
    }
  }, [])

  const onHeroMove = (e: RPointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    texRef.current?.style.setProperty('--mx', `${e.clientX - r.left}px`)
    texRef.current?.style.setProperty('--my', `${e.clientY - r.top}px`)
  }

  const replayPair = () => {
    crtRef.current?.replay()
    flatRef.current?.replay()
  }

  return (
    <div className={css.page}>
      {booting && (
        <AsciiBoot
          key={boot}
          waitForLoad
          once={boot === 1 && ONCE}
          onDone={() => {
            setBooting(false)
            heroRef.current?.replay()
          }}
        />
      )}

      <header className={css.bar}>
        <span className={css.mark}>DVM</span>
        <span className={css.crumb}>kit / ascii</span>
        <button
          type="button"
          className={css.btn}
          onClick={() => {
            setBoot((b) => b + 1)
            setBooting(true)
          }}
        >
          Replay boot
        </button>
      </header>

      {/* ---------------- hero ---------------- */}
      <section className={css.hero} onPointerMove={onHeroMove}>
        <div ref={texRef} className={css.texture} style={{ backgroundImage: `url(${texture})` }} />
        <div className={css.grid} />
        <div className={css.giant} aria-hidden="true">
          DVM
        </div>
        <div className={css.heroCopy}>
          <p className={css.kicker}>Department of</p>
          <h1 className={css.title}>Visual Media</h1>
          <p className={css.lede}>
            The mark is rasterised in software every frame, then each cell is matched against 95 glyph shapes. Drag it to spin, move the cursor to light it.
          </p>
          <div className={css.heroActions}>
            <button type="button" className={css.btn} onClick={() => heroRef.current?.glitch()}>
              Glitch
            </button>
            <button type="button" className={css.btn} onClick={() => heroRef.current?.replay()}>
              Replay reveal
            </button>
            <button type="button" className={css.btn} aria-pressed={heroCrt} onClick={() => setHeroCrt((v) => !v)}>
              {heroCrt ? 'CRT glow on' : 'CRT glow off'}
            </button>
          </div>
          <p className={css.motto}>
            CODE.
            <br />
            DESIGN.
            <br />
            ANIMATE.
          </p>
        </div>
        <div className={css.heroCard}>
          <AsciiLogo
            ref={heroRef}
            transparent
            crt={heroCrt ? { curvature: 0, grille: 0, vignette: 0, scanlines: 0.55, noise: 0.5, bloom: 0.9, afterglow: 0.06 } : false}
            autoRotate="sway"
            restPose={{ yaw: -0.38 }}
            caption
            paused={booting}
          />
        </div>
      </section>

      {/* ---------------- flat vs crt ---------------- */}
      <section className={css.section}>
        <div className={css.sectionHead}>
          <h2 className={css.h2}>Two finishes</h2>
          <p className={css.note}>
            Same engine. With <code>crt</code> it goes through a WebGL tube: curvature, scanlines, bloom, phosphor afterglow. With <code>crt={'{false}'}</code> it prints flat onto a 2D canvas, no WebGL context at all.
          </p>
        </div>
        <div className={css.controls}>
          <Seg label="font" value={font} options={['vt323', 'jetbrains', 'plex']} onChange={setFont} />
          <Seg label="reveal" value={reveal} options={['decode', 'scan', 'print', 'none']} onChange={(v) => { setReveal(v); setTimeout(replayPair, 0) }} />
          <Seg label="rotate" value={rotate} options={['spin', 'sway', 'off']} onChange={setRotate} />
          <button type="button" className={css.btn} onClick={replayPair}>
            Replay
          </button>
          <button
            type="button"
            className={css.btn}
            onClick={() => {
              crtRef.current?.glitch()
              flatRef.current?.glitch()
            }}
          >
            Glitch
          </button>
        </div>
        <div className={css.pair}>
          <figure className={css.fig}>
            <div className={css.frame}>
              <AsciiLogo ref={crtRef} bezel font={font} reveal={reveal} autoRotate={ROTATE[rotate]} caption />
            </div>
            <figcaption>CRT, with bezel</figcaption>
          </figure>
          <figure className={css.fig}>
            <div className={`${css.frame} ${css.paper}`}>
              <AsciiLogo ref={flatRef} crt={false} font={font} reveal={reveal} autoRotate={ROTATE[rotate]} caption />
            </div>
            <figcaption>Flat terminal print</figcaption>
          </figure>
        </div>
      </section>

      {/* ---------------- palettes ---------------- */}
      <section className={css.section}>
        <div className={css.sectionHead}>
          <h2 className={css.h2}>Phosphors</h2>
          <p className={css.note}>
            <code>palette</code> presets, or any <code>color</code>. Teal is the redesign default.
          </p>
        </div>
        <div className={css.tiles}>
          {PALETTE_ORDER.map((p, i) => (
            <figure key={p} className={css.tile} style={{ '--ink': PALETTES[p].ink } as CSSProperties}>
              <div className={css.tileFrame}>
                <AsciiLogo palette={p} bezel quality="low" cellSize={7} autoRotate={0.25} restPose={{ yaw: -0.5 + i * 0.5 }} reveal="scan" revealDelay={i * 0.12} />
              </div>
              <figcaption>
                <span className={css.swatch} />
                {p} <span className={css.hex}>{PALETTES[p].ink}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ---------------- images ---------------- */}
      <section className={css.section}>
        <div className={css.sectionHead}>
          <h2 className={css.h2}>Any image</h2>
          <p className={css.note}>
            <code>AsciiImage</code> runs project covers and artworks through the same matcher. Hover to raise glyph density under the cursor.
          </p>
        </div>
        <div className={css.covers}>
          {COVERS.map((c) => (
            <figure key={c.key} className={css.cover}>
              <div className={css.coverFrame}>
                <AsciiImage src={c.src} alt={`${c.title}, rendered in ASCII`} cellSize={8} />
              </div>
              <figcaption>
                {c.title}
                <span className={css.hex}>{c.meta}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className={css.section}>
        <div className={css.sectionHead}>
          <h2 className={css.h2}>Embed</h2>
        </div>
        <pre className={css.code}>{`import { AsciiBoot, AsciiLogo } from './immersive/kit/ascii'

// preloader (drop-in for PreLoader.jsx)
if (initialLoading) return <AsciiBoot waitForLoad once onDone={() => setInitialLoading(false)} />

// hero-side card over the teal texture
<div style={{ position: 'relative', height: 560 }}>
  <AsciiLogo transparent autoRotate="sway" crt={{ curvature: 0, bloom: 0.9 }} />
</div>`}</pre>
      </section>
    </div>
  )
}
