import { forwardRef, useEffect, useImperativeHandle, useRef, type CSSProperties } from 'react'
import styles from './ascii.module.css'
import { applyLook, resolveCrt, type CrtOptions } from './core/crt'
import { LogoView, type AutoRotate, type Quality, type RevealMode, type Rotation } from './core/logoView'
import { Surface, type RendererKind, type Scene } from './core/surface'
import { fontFamily, resolveTheme, type FontName, type PaletteName } from './core/theme'

export interface AsciiLogoProps {
  /** phosphor preset (default 'teal' #45e6ff, matching the redesign) */
  palette?: PaletteName
  /** custom ink colour (hex), overrides the palette */
  color?: string
  /** custom highlight colour for the brightest cells (hex) */
  hotColor?: string
  /** glyph font size in css px, or 'auto' (scales with the box) */
  cellSize?: number | 'auto'
  /** 'vt323' (lab look, default) | 'jetbrains' | 'plex' | any loaded CSS family */
  font?: FontName | (string & {})
  /** CRT post (curvature, scanlines, bloom, afterglow, grille…) or false for a flat terminal print */
  crt?: boolean | CrtOptions
  /** dark plastic CRT surround around the glass */
  bezel?: boolean
  /** no background: glyphs composite over the page (teal texture, grid…) */
  transparent?: boolean
  /** background when not transparent (default #000 with CRT, #050506 flat) */
  background?: string
  /** drag to spin (with inertia), cursor light, density near cursor, arrow keys */
  interactive?: boolean
  /** rad/s continuous spin (default 0.32), 'sway' to rock around the rest pose, or false */
  autoRotate?: AutoRotate
  /** controlled offset added to the pose every frame (e.g. driven by scroll progress) */
  rotation?: Rotation
  /** starting / sway-centre pose in radians (default yaw -0.5, pitch 0.1) */
  restPose?: { yaw?: number; pitch?: number }
  /** intro animation: 'decode' (scramble-in + light sweep), 'scan' (rows print top→bottom), 'print' (glyph by glyph with a block cursor), 'none' */
  reveal?: RevealMode | boolean
  revealDuration?: number
  revealDelay?: number
  /** fraction of the box height the mark spans (default 0.78) */
  scale?: number
  /** raster supersampling + refresh rate: low 20 Hz, auto 30 Hz, high 60 Hz */
  quality?: Quality
  /** dotted probe field around the cursor in empty space */
  probe?: boolean
  /** "fig.1 dvm.mark yaw … pitch … glyphs" caption */
  caption?: boolean
  /** stop animating (keeps the last frame) */
  paused?: boolean
  /** 'auto' = WebGL when crt, 2D canvas when flat */
  renderer?: 'auto' | RendererKind
  onRevealEnd?: () => void
  className?: string
  style?: CSSProperties
  'aria-label'?: string
}

export interface AsciiLogoHandle {
  /** tear + scramble burst, 0..1 (default 0.8) */
  glitch(strength?: number): void
  /** replay the reveal animation */
  replay(delay?: number): void
  /** add yaw velocity (rad/s) */
  spin(velocity: number): void
  setPose(yaw: number, pitch: number): void
  readonly canvas: HTMLCanvasElement | null
}

export const AsciiLogo = forwardRef<AsciiLogoHandle, AsciiLogoProps>(function AsciiLogo(props, ref) {
  const {
    palette = 'teal',
    color,
    hotColor,
    cellSize = 'auto',
    font = 'vt323',
    crt = true,
    bezel = false,
    transparent = false,
    background,
    interactive = true,
    autoRotate = 0.32,
    rotation,
    restPose,
    reveal = 'decode',
    revealDuration = 1.7,
    revealDelay = 0,
    scale = 0.78,
    quality = 'auto',
    probe = true,
    caption = false,
    paused = false,
    renderer = 'auto',
    className,
    style,
  } = props
  const rootRef = useRef<HTMLDivElement>(null)
  const screenRef = useRef<HTMLDivElement>(null)
  const capRef = useRef<HTMLSpanElement>(null)
  const capRef2 = useRef<HTMLSpanElement>(null)
  const surfRef = useRef<Surface | null>(null)
  const viewRef = useRef<LogoView | null>(null)
  const propsRef = useRef(props)
  propsRef.current = props
  const regionX = useRef(0)

  const crtOpts = resolveCrt(crt)
  const kind: RendererKind = renderer === 'auto' ? (crtOpts ? 'webgl' : '2d') : renderer
  const family = fontFamily(font)
  const revealMode: RevealMode = reveal === true ? 'decode' : reveal === false ? 'none' : reveal
  const theme = resolveTheme(palette, color, hotColor)

  // mount: surface + scene
  useEffect(() => {
    const screen = screenRef.current!
    const lv = new LogoView()
    viewRef.current = lv
    let capT = 0
    /** left offset of the centred raster region inside the art grid */
    let rx0 = 0
    let revealDone = false
    const deg = (a: number) => String(Math.round((((a * 180) / Math.PI) % 360) + 360) % 360).padStart(3, '0')
    const scene: Scene = {
      metrics(w, h) {
        const cs = propsRef.current.cellSize ?? 'auto'
        return { art: cs === 'auto' ? Math.max(6, Math.min(14, Math.min(h / 56, w / 38))) : cs }
      },
      resized(s) {
        const rc = LogoView.regionCols(s.art.cols, s.art.rows, s.layout.fcw, s.layout.fch)
        rx0 = Math.floor((s.art.cols - rc) / 2)
        regionX.current = rx0
        lv.setRegion(rc, s.art.rows, s.layout.fcw, s.layout.fch)
      },
      animating(s) {
        return lv.moving(s.reduced) || lv.revealing || lv.glitch > 0 || (s.fp.noise > 0 && !s.reduced) || s.fp.persistence > 0
      },
      draw(s, dt) {
        const reduced = s.reduced
        lv.update(dt, s.time, reduced)
        if (s.matcher) lv.convert(s.matcher, dt, s.time, reduced)
        s.art.clear()
        lv.blit(s.art, rx0, 0, s.time, reduced)
        s.fp.time = reduced ? 0 : s.time
        s.fp.glitch = reduced ? 0 : lv.glitch
        if (!revealDone && !lv.revealing && lv.revealProgress >= 1) {
          revealDone = true
          propsRef.current.onRevealEnd?.()
        } else if (lv.revealing) revealDone = false
        capT += dt
        if (capRef.current && (capT > 0.2 || dt === 0)) {
          capT = 0
          capRef.current.textContent = `fig.1 dvm.mark  yaw ${deg(lv.yaw + lv.offset.yaw)}°  pitch ${deg(lv.pitch + lv.offset.pitch)}°`
          if (capRef2.current) capRef2.current.textContent = `${String(lv.lit).padStart(4, ' ')} glyphs`
        }
      },
    }
    const s = new Surface(screen, scene, { family, kind, canvasClass: styles.canvas })
    surfRef.current = s
    if (revealMode !== 'none' && !s.reduced) lv.replay(revealDelay)
    return () => {
      s.dispose()
      surfRef.current = null
      viewRef.current = null
    }
    // the surface is created once; later prop changes are pushed below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // push props into the running surface / view
  useEffect(() => {
    const s = surfRef.current
    const lv = viewRef.current
    if (!s || !lv) return
    s.setKind(kind)
    s.setFamily(family)
    s.paused = paused
    applyLook(s.fp, theme, crtOpts, transparent ? null : (background ?? (crtOpts ? '#000000' : '#050506')), s.reduced)
    lv.autoRotate = autoRotate
    if (restPose?.yaw !== undefined) lv.restYaw = restPose.yaw
    if (restPose?.pitch !== undefined) lv.restPitch = restPose.pitch
    lv.offset.yaw = rotation?.yaw ?? 0
    lv.offset.pitch = rotation?.pitch ?? 0
    lv.offset.roll = rotation?.roll ?? 0
    lv.reveal = revealMode
    lv.revealDuration = revealDuration
    lv.scale = scale
    lv.probe = probe && interactive
    lv.cursorLight = interactive
    lv.density = interactive
    if (lv.quality !== quality) {
      lv.quality = quality
      s.resize()
    }
    lv.invalidate()
    s.request()
  }, [kind, family, paused, theme.inkCss, theme.hotCss, JSON.stringify(crtOpts), transparent, background, autoRotate, rotation?.yaw, rotation?.pitch, rotation?.roll, restPose?.yaw, restPose?.pitch, revealMode, revealDuration, scale, probe, interactive, quality]) // eslint-disable-line react-hooks/exhaustive-deps

  // re-measure on cellSize change
  useEffect(() => {
    surfRef.current?.resize()
  }, [cellSize])

  // pointer: drag to spin on the box, cursor light anywhere on the page
  useEffect(() => {
    if (!interactive) return
    const root = rootRef.current!
    const pt = { x: 0, y: 0, inside: false }
    let dragId = -1
    let lastX = 0
    let lastY = 0
    const coarse = matchMedia('(pointer: coarse)').matches
    const light = (e: PointerEvent) => {
      const s = surfRef.current
      const lv = viewRef.current
      if (!s || !lv) return
      s.pointerToArt(e.clientX, e.clientY, pt)
      lv.lightX = pt.x - regionX.current
      lv.lightY = pt.y
      lv.over = pt.inside || dragId >= 0
      lv.invalidate()
      s.request()
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' && dragId < 0) return
      light(e)
      if (dragId === e.pointerId) {
        viewRef.current?.drag(e.clientX - lastX, e.clientY - lastY, coarse)
        lastX = e.clientX
        lastY = e.clientY
      }
    }
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return
      const lv = viewRef.current
      if (!lv) return
      dragId = e.pointerId
      lastX = e.clientX
      lastY = e.clientY
      lv.startDrag()
      root.classList.add(styles.grabbing)
      try {
        root.setPointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
      light(e)
    }
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== dragId) return
      dragId = -1
      viewRef.current?.endDrag()
      root.classList.remove(styles.grabbing)
      if (e.pointerType !== 'mouse') {
        const lv = viewRef.current
        if (lv) {
          lv.lightX = NaN
          lv.over = false
        }
      }
      surfRef.current?.request()
    }
    const onLeaveWin = () => {
      const lv = viewRef.current
      if (!lv) return
      lv.lightX = NaN
      lv.over = false
      lv.invalidate()
      surfRef.current?.request()
    }
    const onKey = (e: KeyboardEvent) => {
      const lv = viewRef.current
      if (!lv) return
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        lv.spin(e.key === 'ArrowLeft' ? -1.8 : 1.8)
        surfRef.current?.request()
        e.preventDefault()
      }
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeaveWin)
    root.addEventListener('pointerdown', onDown)
    root.addEventListener('pointerup', onUp)
    root.addEventListener('pointercancel', onUp)
    root.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeaveWin)
      root.removeEventListener('pointerdown', onDown)
      root.removeEventListener('pointerup', onUp)
      root.removeEventListener('pointercancel', onUp)
      root.removeEventListener('keydown', onKey)
      onLeaveWin()
    }
  }, [interactive])

  useImperativeHandle(
    ref,
    () => ({
      glitch(strength = 0.8) {
        const lv = viewRef.current
        if (!lv) return
        lv.glitch = Math.max(lv.glitch, Math.min(1, strength))
        lv.invalidate()
        surfRef.current?.request()
      },
      replay(delay = 0) {
        viewRef.current?.replay(delay)
        surfRef.current?.request()
      },
      spin(v: number) {
        viewRef.current?.spin(v)
        surfRef.current?.request()
      },
      setPose(yaw: number, pitch: number) {
        viewRef.current?.setPose(yaw, pitch)
        surfRef.current?.request()
      },
      get canvas() {
        return surfRef.current?.canvas ?? null
      },
    }),
    [],
  )

  const cls = [styles.root, bezel ? styles.bezel : '', interactive ? styles.interactive : '', className ?? ''].join(' ')
  return (
    <div
      ref={rootRef}
      className={cls}
      style={{ '--imm-ascii-ink': theme.inkCss, ...style } as CSSProperties}
      role="img"
      aria-label={props['aria-label'] ?? 'DVM logo rendered in ASCII'}
      tabIndex={interactive ? 0 : undefined}
    >
      <div ref={screenRef} className={styles.screen} />
      {caption && (
        <div className={styles.caption} aria-hidden="true">
          <span ref={capRef} />
          <span ref={capRef2} />
        </div>
      )}
    </div>
  )
})
