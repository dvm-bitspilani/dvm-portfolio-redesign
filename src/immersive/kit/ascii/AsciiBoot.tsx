import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { drawLogo } from '../../shared/logo'
import styles from './ascii.module.css'
import { bootId, customScript, defaultScript, scriptEnd, type BootLine, type BootStep } from './bootScript'
import { CellSampler } from './core/cells'
import { applyLook, resolveCrt, type CrtOptions } from './core/crt'
import type { Matcher } from './core/glyphs'
import { B_BRIGHT, B_DIM, B_MID, B_NORM, F_BLINK, F_INV } from './core/grid'
import { LogoView } from './core/logoView'
import { Surface, type Scene } from './core/surface'
import { fontFamily, resolveTheme, type FontName, type PaletteName } from './core/theme'

export interface AsciiBootProps {
  /** called once the overlay has fully exited (or immediately when `once` already ran this session) */
  onDone?: () => void
  /** called when the exit (power-off / fade) starts, i.e. when the page underneath begins to show */
  onExit?: () => void
  /** show once per browser session; a string sets the sessionStorage key (default key 'imm-ascii-boot') */
  once?: boolean | string
  /** any key / click / tap (and the Skip button) jumps to the exit (default true) */
  skippable?: boolean
  /** hold on the assembled logo until window `load` + fonts (capped by maxWait), like PreLoader's waitForLoad */
  waitForLoad?: boolean
  /** safety cap in seconds for waitForLoad (default 4, same as PreLoader) */
  maxWait?: number
  /** time multiplier (default 1 ≈ 3.9 s from power-on to exit; 2 = twice as fast) */
  speed?: number
  palette?: PaletteName
  color?: string
  hotColor?: string
  font?: FontName | (string & {})
  /** CRT post on the boot screen (default true); false = flat terminal print */
  crt?: boolean | CrtOptions
  /** 'power-off' collapses the tube to a line while the page fades in behind; 'fade' = opacity+scale like PreLoader. Default: power-off with CRT, fade without. */
  exit?: 'auto' | 'fade' | 'power-off'
  /** replace the POST lines (strings, or {text, dur, bright}) */
  lines?: BootLine[]
  /** finish on the assembling 3D ASCII logo (default true) */
  logo?: boolean
  /** render inside the positioned parent instead of a fixed viewport overlay (demos, cards) */
  contained?: boolean
  /** lock page scroll while booting (default: true unless contained) */
  lockScroll?: boolean
  className?: string
  style?: CSSProperties
}

const BASE_SPEED = 1.45
const LOGO_REVEAL = 1.0
const HOLD = 0.9
const DEFAULT_KEY = 'imm-ascii-boot'

function seen(once: AsciiBootProps['once']) {
  if (!once) return false
  try {
    return sessionStorage.getItem(typeof once === 'string' ? once : DEFAULT_KEY) === '1'
  } catch {
    return false
  }
}

/** Flat 2D DVM mark → art cells (the BIOS "energy star" badge). */
function badge(matcher: Matcher, cols: number, rows: number, fcw: number, fch: number) {
  const sy = 7
  const sx = Math.max(2, Math.round((sy * fcw) / fch))
  const W = cols * sx
  const H = rows * sy
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, W, H)
  const pxAspect = fch / sy / (fcw / sx)
  ctx.save()
  ctx.scale(pxAspect, 1)
  drawLogo(ctx, W / 2 / pxAspect, H / 2, H * 0.92, '#fff')
  ctx.restore()
  const d = ctx.getImageData(0, 0, W, H).data
  const lum = new Float32Array(W * H)
  for (let i = 0; i < lum.length; i++) lum[i] = d[i * 4] / 255
  const s = new CellSampler()
  s.load(lum, W, H)
  const glyph = new Uint8Array(cols * rows)
  const tone = new Uint8Array(cols * rows)
  s.run(cols, rows, sx, sy, matcher, (x, y, g, t) => {
    glyph[y * cols + x] = g
    tone[y * cols + x] = t
  })
  return { glyph, tone, cols, rows }
}

/**
 * DVM://BOOT preloader: power-on, a BIOS POST built from the real DVM data
 * (teams, members, batches, fests, projects, journal), then the 3D ASCII mark
 * assembles and the tube powers off onto the page.
 */
export function AsciiBoot(props: AsciiBootProps) {
  const {
    once = false,
    skippable = true,
    contained = false,
    palette = 'teal',
    color,
    hotColor,
    crt = true,
    exit = 'auto',
    className,
    style,
  } = props
  const [phase, setPhase] = useState<'run' | 'exit' | 'done'>(() => (seen(once) ? 'done' : 'run'))
  const [exitMode, setExitMode] = useState<'fade' | 'power-off'>('fade')
  const screenRef = useRef<HTMLDivElement>(null)
  const propsRef = useRef(props)
  propsRef.current = props
  const crtOpts = resolveCrt(crt)
  const theme = resolveTheme(palette, color, hotColor)
  const mode: 'fade' | 'power-off' = exit === 'auto' ? (crtOpts ? 'power-off' : 'fade') : exit
  const modeRef = useRef(mode)
  modeRef.current = mode
  const doneRef = useRef(false)
  /** engine-side exit clock (drives the power-off squash) */
  const exitClock = useRef<{ exitT: number } | null>(null)

  const beginExit = useCallback(() => {
    if (doneRef.current) return
    doneRef.current = true
    if (exitClock.current) exitClock.current.exitT = 0
    setExitMode(modeRef.current)
    setPhase('exit')
  }, [])

  // already booted this session: finish immediately
  useEffect(() => {
    if (phase === 'done' && !doneRef.current) {
      doneRef.current = true
      propsRef.current.onDone?.()
    }
  }, [phase])

  // exit → done
  useEffect(() => {
    if (phase !== 'exit') return
    propsRef.current.onExit?.()
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const ms = reduced ? 350 : exitMode === 'power-off' ? 650 : 950
    const id = setTimeout(() => {
      const o = propsRef.current.once
      if (o) {
        try {
          sessionStorage.setItem(typeof o === 'string' ? o : DEFAULT_KEY, '1')
        } catch {
          /* private mode */
        }
      }
      setPhase('done')
      propsRef.current.onDone?.()
    }, ms)
    return () => clearTimeout(id)
  }, [phase, exitMode])

  // scroll lock
  useEffect(() => {
    const lock = props.lockScroll ?? !contained
    if (!lock || phase === 'done') return
    const html = document.documentElement
    const prev = html.style.overflow
    html.style.overflow = 'hidden'
    return () => {
      html.style.overflow = prev
    }
  }, [phase === 'done', contained, props.lockScroll]) // eslint-disable-line react-hooks/exhaustive-deps

  // the engine
  const running = phase !== 'done'
  useEffect(() => {
    if (!running) return
    const host = screenRef.current!
    const P = () => propsRef.current
    const steps: BootStep[] = P().lines ? customScript(P().lines!) : defaultScript()
    const tLogo = scriptEnd(steps) + 0.15
    const withLogo = P().logo !== false
    const lv = new LogoView()
    lv.reveal = 'decode'
    lv.revealDuration = LOGO_REVEAL
    lv.autoRotate = 'sway'
    lv.restYaw = -0.32
    lv.restPitch = 0.08
    lv.probe = false
    lv.cursorLight = false
    lv.scale = 0.86
    const id = bootId()
    const st = {
      t: 0,
      real: 0,
      power: 0,
      logoT: -1,
      glitch: 0,
      exitT: -1,
      loaded: !P().waitForLoad,
      reveal: 0,
      badge: null as ReturnType<typeof badge> | null,
      region: { fx: 0, fy: 0, fc: 0, fr: 0 },
    }
    const markLoaded = () => {
      void document.fonts.ready.then(() => {
        st.loaded = true
      })
    }
    if (!st.loaded) {
      if (document.readyState === 'complete') markLoaded()
      else window.addEventListener('load', markLoaded, { once: true })
    }
    let reduced = false
    let exitedAt = -1

    const scene: Scene = {
      metrics(w, h) {
        const narrow = w < 720
        const fs = Math.max(13, Math.min(23, Math.min(h / 38, w / (narrow ? 44 : 70))))
        return { main: fs, art: fs * 0.56, insetX: narrow ? 0.03 : 0.032, insetY: narrow ? 0.025 : 0.04 }
      },
      resized(s) {
        const g = s.main!
        const top = 1
        const bottom = g.rows - 4
        const fx = s.toArtX(2)
        const fy = s.toArtY(top)
        const full = s.toArtX(g.cols - 2) - fx
        const fr = s.toArtY(bottom) - fy
        const fc = LogoView.regionCols(full, fr, s.layout.fcw, s.layout.fch)
        st.region = { fx: fx + Math.floor((full - fc) / 2), fy, fc, fr }
        lv.setRegion(st.region.fc, st.region.fr, s.layout.fcw, s.layout.fch)
        st.badge = null
      },
      animating() {
        return true
      },
      draw(s, dt) {
        reduced = s.reduced
        const g = s.main!
        const narrow = s.cssW < 720
        const speed = BASE_SPEED * (P().speed ?? 1)
        st.real += dt
        st.t += dt * speed
        st.power += dt
        st.glitch = Math.max(0, st.glitch - dt * 1.6)
        if (st.real > (P().maxWait ?? 4)) st.loaded = true
        if (reduced && st.t < tLogo + LOGO_REVEAL) {
          // reduced motion: skip straight to the finished screen
          st.t = withLogo ? tLogo + LOGO_REVEAL : tLogo
          lv.finishReveal()
          lv.setPose(lv.restYaw, lv.restPitch)
        }
        g.clear()
        s.art.clear()
        const x0 = narrow ? 1 : 3

        if (!withLogo || st.t < tLogo) {
          // ---- BIOS POST
          let y = narrow ? 1 : 2
          for (const step of steps) {
            if (st.t < step.t) break
            const p = step.dur > 0 ? Math.min(1, (st.t - step.t) / step.dur) : 1
            const r = step.render(p, narrow)
            g.text(x0, y, r.text, { b: r.b ?? B_NORM }, g.cols - x0 - 1)
            y++
            if (y >= g.rows - 2) break
          }
          g.put(x0, y, '_', { b: B_BRIGHT, f: F_BLINK })
          // energy-star badge, top right
          if (!narrow && s.matcher && g.cols > 96) {
            const lw = 16
            const lh = 9
            const lx = g.cols - lw - 3
            const ly = 2
            const fc = s.toArtX(lx + lw) - s.toArtX(lx)
            const fr = s.toArtY(ly + lh) - s.toArtY(ly)
            if (!st.badge || st.badge.cols !== fc || st.badge.rows !== fr) st.badge = badge(s.matcher, fc, fr, s.layout.fcw, s.layout.fch)
            const B = st.badge
            const fx = s.toArtX(lx)
            const fy = s.toArtY(ly)
            const rv = reduced ? 1 : Math.min(1, st.t / 0.9)
            for (let j = 0; j < B.rows && j / B.rows <= rv; j++)
              for (let i = 0; i < B.cols; i++) {
                const k = j * B.cols + i
                if (B.glyph[k]) s.art.set(fx + i, fy + j, B.glyph[k], 120 + B.tone[k] * 0.5)
              }
            g.text(lx, ly + lh, '  visual media  ', { b: B_DIM })
          }
          if (st.t >= scriptEnd(steps) && !withLogo && st.loaded && exitedAt < 0) {
            exitedAt = st.t
            beginExit()
          }
        } else {
          // ---- the mark assembles
          if (st.logoT < 0) {
            st.logoT = 0
            st.glitch = reduced ? 0 : 0.55
            if (!reduced) {
              lv.setPose(-1.65, 0.28)
              lv.spin(3.3)
              lv.replay(0)
            }
          }
          st.logoT += dt * speed
          lv.update(dt * speed, s.time, reduced)
          if (s.matcher) lv.convert(s.matcher, dt, s.time, reduced)
          const R = st.region
          lv.blit(s.art, R.fx, R.fy, s.time, reduced)
          // caption, typed
          const cap = narrow ? 'Department of Visual Media' : 'Department of Visual Media, BITS Pilani'
          const n = reduced ? cap.length : Math.max(0, Math.floor((st.logoT - 0.45) * 46))
          const cy = g.rows - 3
          const cx = Math.floor((g.cols - cap.length) / 2)
          g.text(cx, cy, cap.slice(0, n), { b: B_BRIGHT })
          const typed = n >= cap.length
          if (!typed || !st.loaded) g.put(cx + Math.min(n, cap.length), cy, '_', { b: B_BRIGHT, f: F_BLINK })
          if (typed && !st.loaded) g.text(Math.floor((g.cols - 19) / 2), cy + 1, 'loading assets ...', { b: B_DIM })
          if (st.logoT >= LOGO_REVEAL + HOLD && typed && st.loaded && exitedAt < 0) {
            exitedAt = st.t
            beginExit()
          }
        }

        // footer
        if (P().skippable !== false) g.text(x0, g.rows - 1, narrow ? 'tap or press any key to skip' : 'Press any key to skip', { b: B_MID })
        if (!narrow) g.textR(g.cols - 3, g.rows - 1, id, { b: B_DIM })
        if (!narrow) g.text(x0, 0, ' DVM://BOOT ', { b: B_BRIGHT, f: F_INV })

        // power on / off
        const fp = s.fp
        fp.time = reduced ? 0 : s.time
        fp.blinkOn = reduced ? true : Math.floor(s.time * 1.9) % 2 === 0
        fp.glitch = reduced ? 0 : Math.max(st.glitch, lv.glitch)
        fp.powerX = 1
        fp.powerY = 1
        if (!reduced && fp.fx > 0 && st.power < 0.55) {
          const t = st.power / 0.55
          fp.powerX = Math.min(1, t * 3)
          fp.powerY = Math.max(0.004, Math.min(1, (t - 0.3) / 0.7)) ** 2
        }
        if (st.exitT >= 0) {
          st.exitT += dt
          if (!reduced && modeRef.current === 'power-off') {
            const t = Math.min(1, st.exitT / 0.5)
            fp.powerY = Math.max(0.004, 1 - t * 1.6) ** 2
            fp.powerX = t < 0.6 ? 1 : Math.max(0, 1 - (t - 0.6) / 0.4)
          }
        }
      },
    }
    // the canvas is transparent: the overlay's own background shows through and can fade separately
    const s = new Surface(host, scene, { family: fontFamily(P().font ?? 'vt323'), kind: resolveCrt(P().crt ?? true) ? 'webgl' : '2d', canvasClass: styles.canvas })
    const th = resolveTheme(P().palette ?? 'teal', P().color, P().hotColor)
    applyLook(s.fp, th, resolveCrt(P().crt ?? true), null, s.reduced)
    s.fp.vignette *= 0.8

    exitClock.current = st
    const onKey = (e: KeyboardEvent) => {
      if (P().skippable === false || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'Tab') return
      beginExit()
    }
    const onPointer = (e: PointerEvent) => {
      if (P().skippable === false) return
      if ((e.target as HTMLElement).closest('button')) return
      beginExit()
    }
    window.addEventListener('keydown', onKey)
    const root = host.parentElement!
    root.addEventListener('pointerdown', onPointer)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('load', markLoaded)
      root.removeEventListener('pointerdown', onPointer)
      exitClock.current = null
      s.dispose()
    }
  }, [running]) // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === 'done') return null
  const cls = [
    styles.boot,
    contained ? styles.bootContained : '',
    phase === 'exit' ? (exitMode === 'power-off' ? styles.bootPowerOff : styles.bootFade) : '',
    className ?? '',
  ].join(' ')
  return (
    <div className={cls} style={{ '--imm-ascii-ink': theme.inkCss, ...style } as CSSProperties} role="status" aria-live="polite" aria-busy={phase === 'run'}>
      <span className={styles.srOnly}>Loading DVM, Department of Visual Media</span>
      <div ref={screenRef} className={styles.screen} />
      {skippable && phase === 'run' && (
        <button type="button" className={styles.skip} onClick={() => beginExit()}>
          Skip intro
        </button>
      )}
    </div>
  )
}
