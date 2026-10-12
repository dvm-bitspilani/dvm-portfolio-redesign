import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import '@fontsource-variable/jetbrains-mono'
import { MercuryBadge, MercuryLogo, paintHeroBackdrop, type MercuryLogoHandle, type MercuryMaterial } from './index'
import bg3 from '../../../assests/bg_3.png'
import lettersSrc from '../../../assests/image.png'
import hamSrc from '../../../assests/hamBtn.png'
import s from './demo.module.css'

gsap.registerPlugin(ScrollTrigger)

type EnvName = 'teal' | 'neutral'
type Mask = { x: number; y: number; r: number } // fractions of the box (r of width)

const MATERIALS: { id: MercuryMaterial; label: string }[] = [
  { id: 'chrome', label: 'Chrome' },
  { id: 'glass', label: 'Glass' },
  { id: 'xray', label: 'X-ray' },
]
const ENVS: { id: EnvName; label: string }[] = [
  { id: 'teal', label: 'Teal studio' },
  { id: 'neutral', label: 'Neutral' },
]

// ------------------------------------------------------------------ helpers

const imgCache = new Map<string, Promise<HTMLImageElement>>()
function loadImg(src: string) {
  let p = imgCache.get(src)
  if (!p) {
    p = new Promise((res, rej) => {
      const i = new Image()
      i.onload = () => res(i)
      i.onerror = rej
      i.src = src
    })
    imgCache.set(src, p)
  }
  return p
}

function useMedia(q: string) {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches)
  useEffect(() => {
    const mql = window.matchMedia(q)
    const on = () => setM(mql.matches)
    on()
    mql.addEventListener('change', on)
    return () => mql.removeEventListener('change', on)
  }, [q])
  return m
}

/**
 * Paints the hero's layers into a canvas (same mask as the DOM) so glass
 * refracts the real texture, grid and letters. Repaints on resize.
 */
function useHeroBackdrop(box: RefObject<HTMLElement | null>, mask: Mask, onPaint: () => void, colorWash = true) {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null)
  const onPaintRef = useRef(onPaint)
  onPaintRef.current = onPaint
  useEffect(() => {
    let alive = true
    let ro: ResizeObserver | null = null
    const c = document.createElement('canvas')
    Promise.all([loadImg(bg3), loadImg(lettersSrc)])
      .then(([texture, letters]) => {
        if (!alive || !box.current) return
        const paint = () => {
          const el = box.current
          if (!el) return
          const w = el.clientWidth, h = el.clientHeight
          paintHeroBackdrop(c, { width: w, height: h, texture, letters, mask: { x: w * mask.x, y: h * mask.y, r: w * mask.r }, colorWash })
          onPaintRef.current()
        }
        paint()
        setCanvas(c)
        ro = new ResizeObserver(paint)
        ro.observe(box.current)
      })
      .catch(() => {})
    return () => {
      alive = false
      ro?.disconnect()
    }
  }, [box, mask.x, mask.y, mask.r, colorWash])
  return canvas
}

function HeroLayers({ mask, wash = true, lettersRef, gridRef, textureRef }: { mask: Mask; wash?: boolean; lettersRef?: RefObject<HTMLImageElement | null>; gridRef?: RefObject<HTMLDivElement | null>; textureRef?: RefObject<HTMLDivElement | null> }) {
  const vars = { '--mx': `${mask.x * 100}%`, '--my': `${mask.y * 100}%`, '--mr': `${mask.r * 100}vw` } as CSSProperties
  return (
    <div className={s.layers} style={vars} aria-hidden="true">
      <div ref={gridRef} className={s.grid} />
      <div ref={textureRef} className={s.texture} style={{ backgroundImage: `url(${bg3})` }} />
      <img ref={lettersRef} className={s.letters} src={lettersSrc} alt="" draggable={false} />
      {wash && <div className={s.wash} />}
    </div>
  )
}

function Seg<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className={s.seg} role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

// --------------------------------------------------------------------- hero

const HERO_MASK: Mask = { x: 0.6, y: 0.2, r: 0.4 }
// ?quality=low|medium|high to compare tiers (default auto)
const qualityParam = (() => {
  const q = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('quality') : null
  return q === 'low' || q === 'medium' || q === 'high' ? q : 'auto'
})()

function Hero() {
  const heroRef = useRef<HTMLElement>(null)
  const mercRef = useRef<MercuryLogoHandle>(null)
  const lettersRef = useRef<HTMLImageElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const textureRef = useRef<HTMLDivElement>(null)
  const deptRef = useRef<HTMLDivElement>(null)
  const subRef = useRef<HTMLDivElement>(null)
  const mobile = useMedia('(max-width: 768px)')
  const [material, setMaterial] = useState<MercuryMaterial>('chrome')
  const [env, setEnv] = useState<EnvName>('teal')
  const [sheen, setSheen] = useState(1)
  const [shadow, setShadow] = useState(true)
  const [interactive, setInteractive] = useState(true)
  const backdrop = useHeroBackdrop(heroRef, HERO_MASK, () => mercRef.current?.refreshBackdrop())
  const statsRef = useRef<HTMLParagraphElement>(null)
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has('stats')) return
    const id = window.setInterval(() => {
      const st = mercRef.current?.getStats()
      if (st && statsRef.current) statsRef.current.textContent = JSON.stringify(st)
    }, 500)
    return () => window.clearInterval(id)
  }, [])

  // The redesign's own intro, so the beads land as the letters finish revealing.
  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = gsap.context(() => {
      gsap.set(lettersRef.current, { clipPath: 'inset(0 100% 0 0)' })
      gsap.set([gridRef.current, textureRef.current], { autoAlpha: 0 })
      const tl = gsap.timeline({ delay: 0.3 })
      tl.to([gridRef.current, textureRef.current], { autoAlpha: 1, duration: 0.6, ease: 'power1.out' })
        .to(lettersRef.current, { clipPath: 'inset(0 0% 0 0)', ease: 'none', duration: 1 }, '-=0.2')
        .from(deptRef.current, { x: -100, opacity: 0, duration: 0.5 })
        .from(subRef.current ? Array.from(subRef.current.children) : [], { x: -100, opacity: 0, duration: 0.6, stagger: 0.2 }, '<')
    }, heroRef)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={heroRef} className={s.hero} aria-label="Hero with the mercury mark">
      <HeroLayers mask={HERO_MASK} lettersRef={lettersRef} gridRef={gridRef} textureRef={textureRef} />

      <div ref={deptRef} className={s.dept}>
        <div>DEPARTMENT OF</div>
        <div>VISUAL MEDIA</div>
      </div>
      <div ref={subRef} className={s.sub}>
        <div>CODE.</div>
        <div>DESIGN.</div>
        <div>ANIMATE.</div>
      </div>

      <div className={s.markLayer}>
        <MercuryLogo
          ref={mercRef}
          background="transparent"
          material={material}
          env={env}
          sheen={sheen}
          shadow={shadow ? 0.65 : 0}
          interactive={interactive}
          pointerTarget={heroRef}
          backdrop={backdrop ? { source: backdrop, element: heroRef, frost: 0.9 } : null}
          fit={mobile ? { padding: 0.14, y: -0.08 } : { padding: 0.19, y: 0.035 }}
          introDelay={0.9}
          quality={qualityParam}
          label="DVM, Department of Visual Media"
        />
      </div>

      <nav className={s.nav}>
        <a className={s.brand} href="#top" onClick={(e) => e.preventDefault()}>
          <MercuryBadge size={30} />
          DVM
        </a>
        <img className={s.ham} src={hamSrc} alt="" />
      </nav>

      <div className={s.dock} data-mercury-ignore>
        <p ref={statsRef} className={s.hint} data-stats />
        <p className={s.hint}>Bring the cursor to the mark to pull the mercury. Click to drop a bead.</p>
        <div className={s.panel}>
          <Seg label="Material" value={material} options={MATERIALS} onChange={setMaterial} />
          <Seg label="Environment" value={env} options={ENVS} onChange={setEnv} />
          <label className={s.range}>
            Sheen
            <input type="range" min={0} max={2} step={0.05} value={sheen} onChange={(e) => setSheen(+e.target.value)} />
          </label>
          <button type="button" className={s.toggle} aria-pressed={shadow} onClick={() => setShadow((v) => !v)}>
            Shadow
          </button>
          <button type="button" className={s.toggle} aria-pressed={interactive} onClick={() => setInteractive((v) => !v)}>
            Droplets
          </button>
        </div>
      </div>
    </section>
  )
}

// ------------------------------------------------------- scroll progression

const STAGE_MASK: Mask = { x: 0.69, y: 0.42, r: 0.34 }
const STAGE_MASK_MOBILE: Mask = { x: 0.5, y: 0.3, r: 0.75 }
const STEPS = [
  { name: 'Liquid chrome', copy: 'Polished mercury. An oil-slick film blooms wherever a droplet necks into the mark.' },
  { name: 'Glass', copy: 'The mark turns to thick glass and bends the texture, grid and letters sitting behind it.' },
  { name: 'X-ray', copy: 'Rim light only, with the distance field around the mark drawn as contour lines.' },
]

/** Scroll progress → material stage, with a hold on each stage. */
function stageFor(p: number) {
  const ease = (t: number) => t * t * (3 - 2 * t)
  const seg = (a: number, b: number) => ease(Math.min(1, Math.max(0, (p - a) / (b - a))))
  return seg(0.12, 0.42) + seg(0.58, 0.88)
}

function Stages() {
  const sectionRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const mercRef = useRef<MercuryLogoHandle>(null)
  const fillRef = useRef<HTMLDivElement>(null)
  const valueRef = useRef<HTMLElement>(null)
  const stepRefs = useRef<(HTMLDivElement | null)[]>([])
  const mobile = useMedia('(max-width: 768px)')
  const mask = mobile ? STAGE_MASK_MOBILE : STAGE_MASK
  const backdrop = useHeroBackdrop(stageRef, mask, () => mercRef.current?.refreshBackdrop(), false)

  useLayoutEffect(() => {
    const apply = (p: number) => {
      const st = stageFor(p)
      mercRef.current?.setProgress(st)
      if (fillRef.current) fillRef.current.style.height = `${(st / 2) * 100}%`
      if (valueRef.current) valueRef.current.textContent = st.toFixed(2)
      const active = Math.round(st)
      stepRefs.current.forEach((el, i) => el?.setAttribute('data-active', String(i === active)))
    }
    const trigger = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: 'top top',
      end: 'bottom bottom',
      pin: stageRef.current,
      pinSpacing: false,
      onUpdate: (self) => apply(self.progress),
      onRefresh: (self) => apply(self.progress),
    })
    apply(trigger.progress)
    return () => trigger.kill()
  }, [])

  return (
    <section ref={sectionRef} className={s.stages} aria-label="Scroll-driven material progression">
      <div ref={stageRef} className={s.stage}>
        <HeroLayers mask={mask} wash={false} />
        <div className={s.markLayer}>
          <MercuryLogo
            ref={mercRef}
            smoothing={9}
            intro={false}
            pointerTarget={stageRef}
            backdrop={backdrop ? { source: backdrop, element: stageRef, frost: 0.8 } : null}
            fit={mobile ? { padding: 0.14, y: -0.3, scale: 0.9 } : { padding: 0.17, x: 0.4 }}
            label="DVM mark changing material as you scroll"
          />
        </div>
        <div className={s.rail}>
          <h2 className={s.railTitle}>Scroll to change the material</h2>
          <div className={s.track}>
            <div ref={fillRef} className={s.fill} />
          </div>
          {STEPS.map((st, i) => (
            <div key={st.name} ref={(el) => { stepRefs.current[i] = el }} className={s.step} data-active={i === 0}>
              <h3>
                <span>{i + 1}</span>
                {st.name}
              </h3>
              <p>{st.copy}</p>
            </div>
          ))}
          <div className={s.readout}>
            progress <b ref={valueRef}>0.00</b> / 2
          </div>
        </div>
      </div>
    </section>
  )
}

// ------------------------------------------------------------------- studio

function Studio() {
  const ref = useRef<HTMLElement>(null)
  const mobile = useMedia('(max-width: 768px)')
  const [env, setEnv] = useState<EnvName>('teal')
  const [material, setMaterial] = useState<MercuryMaterial>('chrome')
  return (
    <section ref={ref} className={s.studio} aria-label="Studio mode">
      <MercuryLogo
        background="studio"
        env={env}
        material={material}
        intro={false}
        pointerTarget={ref}
        fit={mobile ? { padding: 0.12, y: -0.28, scale: 0.92 } : { padding: 0.15, x: 0.36 }}
        label="DVM mark in studio mode"
      />
      <div className={s.studioCopy}>
        <h2>Studio</h2>
        <p>
          The same mark with its own cyclorama and a glossy floor that reflects it. Use it where the mark stands alone, like
          a loading screen or a 404.
        </p>
        <div className={s.panel} data-mercury-ignore>
          <Seg label="Material" value={material} options={MATERIALS} onChange={setMaterial} />
          <Seg label="Environment" value={env} options={ENVS} onChange={setEnv} />
        </div>
        <pre className={s.code}>
          <em>{'// fills its positioned parent'}</em>
          {'\n<'}
          <i>MercuryLogo</i>
          {'\n  background="studio"\n  env="'}
          {env}
          {'"\n  material="'}
          {material}
          {'"\n  fit={{ padding: 0.15, x: 0.36 }}\n/>'}
        </pre>
      </div>
    </section>
  )
}

// ------------------------------------------------------------------- badges

function Badges() {
  return (
    <section className={s.badges} aria-label="Badge sizes">
      <div className={s.navbar}>
        <span className={s.brand}>
          <MercuryBadge size={34} />
          DVM
        </span>
        <img className={s.ham} src={hamSrc} alt="" />
      </div>
      <div className={s.badgeRow}>
        <figure>
          <MercuryBadge size={24} />
          <figcaption>Footer, 24 px</figcaption>
        </figure>
        <figure>
          <MercuryBadge size={36} />
          <figcaption>Navbar, 36 px</figcaption>
        </figure>
        <figure>
          <MercuryBadge size={64} />
          <figcaption>Chrome</figcaption>
        </figure>
        <figure>
          <MercuryBadge size={64} material="glass" />
          <figcaption>Glass</figcaption>
        </figure>
        <figure>
          <MercuryBadge size={64} material="xray" />
          <figcaption>X-ray</figcaption>
        </figure>
        <figure>
          <MercuryBadge size={64} env="neutral" />
          <figcaption>Neutral studio</figcaption>
        </figure>
      </div>
      <p className={s.footerLine}>DEPARTMENT OF VISUAL MEDIA, BITS PILANI</p>
    </section>
  )
}

export default function MercuryDemo() {
  useEffect(() => {
    const prev = document.title
    document.title = 'Kit / mercury'
    const id = requestAnimationFrame(() => ScrollTrigger.refresh())
    return () => {
      cancelAnimationFrame(id)
      document.title = prev
    }
  }, [])
  return (
    <main className={s.page}>
      <Hero />
      <Stages />
      <Studio />
      <Badges />
    </main>
  )
}
