import { forwardRef, useEffect, useImperativeHandle, useRef, type CSSProperties } from 'react'
import styles from './ascii.module.css'
import { applyLook, resolveCrt, type CrtOptions } from './core/crt'
import { ImageView, loadImage } from './core/imageView'
import { Surface, type RendererKind, type Scene } from './core/surface'
import { fontFamily, resolveTheme, type FontName, type PaletteName } from './core/theme'

export interface AsciiImageProps {
  /** image URL (same-origin or CORS-enabled) */
  src: string
  alt?: string
  palette?: PaletteName
  color?: string
  hotColor?: string
  /** glyph size in css px, or 'auto' (≈ 90 columns across) */
  cellSize?: number | 'auto'
  font?: FontName | (string & {})
  /** default false: a flat 2D canvas (no WebGL context, so many can share a page) */
  crt?: boolean | CrtOptions
  transparent?: boolean
  background?: string
  fit?: 'cover' | 'contain'
  /** vertical focus for cover crops, 0 top .. 1 bottom (default 0.4) */
  focusY?: number
  /** gamma after auto-levels (<1 brightens, default 0.9) */
  gamma?: number
  /** swap light and dark (useful for screenshots on white backgrounds) */
  invert?: boolean
  /** 'scan' (default), 'decode' or 'none'; replays when src changes */
  reveal?: 'scan' | 'decode' | 'none'
  revealDuration?: number
  /** cursor raises glyph density / brightness under it */
  interactive?: boolean
  renderer?: 'auto' | RendererKind
  onLoad?: () => void
  onError?: (e: Error) => void
  className?: string
  style?: CSSProperties
}

export interface AsciiImageHandle {
  glitch(strength?: number): void
  replay(): void
  readonly canvas: HTMLCanvasElement | null
}

export const AsciiImage = forwardRef<AsciiImageHandle, AsciiImageProps>(function AsciiImage(props, ref) {
  const {
    src,
    alt = '',
    palette = 'teal',
    color,
    hotColor,
    cellSize = 'auto',
    font = 'vt323',
    crt = false,
    transparent = false,
    background,
    fit = 'cover',
    focusY = 0.4,
    gamma = 0.9,
    invert = false,
    interactive = true,
    renderer = 'auto',
    className,
    style,
  } = props
  const screenRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const surfRef = useRef<Surface | null>(null)
  const viewRef = useRef<ImageView | null>(null)
  const stateRef = useRef({ revealT: 1e9, glitch: 0, lx: NaN, ly: NaN })
  const propsRef = useRef(props)
  propsRef.current = props

  const crtOpts = resolveCrt(crt)
  const kind: RendererKind = renderer === 'auto' ? (crtOpts ? 'webgl' : '2d') : renderer
  const family = fontFamily(font)
  const theme = resolveTheme(palette, color, hotColor)

  useEffect(() => {
    const iv = new ImageView()
    viewRef.current = iv
    const st = stateRef.current
    const scene: Scene = {
      metrics(w) {
        const cs = propsRef.current.cellSize ?? 'auto'
        return { art: cs === 'auto' ? Math.max(5, Math.min(14, w / 52)) : cs }
      },
      resized(s) {
        iv.setRegion(s.art.cols, s.art.rows, s.layout.fcw, s.layout.fch)
      },
      animating(s) {
        if (s.reduced) return false
        return st.revealT < (propsRef.current.revealDuration ?? 1.1) || st.glitch > 0 || s.fp.noise > 0 || s.fp.persistence > 0
      },
      draw(s, dt) {
        st.revealT += dt
        st.glitch = Math.max(0, st.glitch - dt * 1.6)
        if (s.matcher) iv.convert(s.matcher, st.lx, st.ly, propsRef.current.interactive === false ? 0 : 0.8)
        s.art.clear()
        const mode = s.reduced ? 'none' : (propsRef.current.reveal ?? 'scan')
        const p = Math.min(1, st.revealT / (propsRef.current.revealDuration ?? 1.1))
        iv.blit(s.art, 0, 0, p, mode, s.time)
        s.fp.time = s.reduced ? 0 : s.time
        s.fp.glitch = s.reduced ? 0 : st.glitch
      },
    }
    const s = new Surface(screenRef.current!, scene, { family, kind, canvasClass: styles.canvas })
    surfRef.current = s
    return () => {
      s.dispose()
      surfRef.current = null
      viewRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let alive = true
    const iv = viewRef.current
    if (!iv) return
    loadImage(src).then(
      (img) => {
        if (!alive) return
        iv.setImage(img)
        stateRef.current.revealT = 0
        surfRef.current?.request()
        propsRef.current.onLoad?.()
      },
      (e: Error) => {
        if (alive) propsRef.current.onError?.(e)
      },
    )
    return () => {
      alive = false
    }
  }, [src])

  useEffect(() => {
    const s = surfRef.current
    const iv = viewRef.current
    if (!s || !iv) return
    s.setKind(kind)
    s.setFamily(family)
    applyLook(s.fp, theme, crtOpts, transparent ? null : (background ?? (crtOpts ? '#000000' : '#050506')), s.reduced)
    iv.setFit({ fit, focusY, gamma, invert })
    iv.invalidate()
    s.request()
  }, [kind, family, theme.inkCss, theme.hotCss, JSON.stringify(crtOpts), transparent, background, fit, focusY, gamma, invert]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    surfRef.current?.resize()
  }, [cellSize])

  useEffect(() => {
    if (!interactive) return
    const root = rootRef.current!
    const pt = { x: 0, y: 0, inside: false }
    const onMove = (e: PointerEvent) => {
      const s = surfRef.current
      if (!s) return
      s.pointerToArt(e.clientX, e.clientY, pt)
      stateRef.current.lx = pt.x
      stateRef.current.ly = pt.y
      viewRef.current?.invalidate()
      s.request()
    }
    const onLeave = () => {
      stateRef.current.lx = NaN
      viewRef.current?.invalidate()
      surfRef.current?.request()
    }
    root.addEventListener('pointermove', onMove)
    root.addEventListener('pointerleave', onLeave)
    return () => {
      root.removeEventListener('pointermove', onMove)
      root.removeEventListener('pointerleave', onLeave)
    }
  }, [interactive])

  useImperativeHandle(
    ref,
    () => ({
      glitch(strength = 0.8) {
        stateRef.current.glitch = Math.min(1, strength)
        surfRef.current?.request()
      },
      replay() {
        stateRef.current.revealT = 0
        surfRef.current?.request()
      },
      get canvas() {
        return surfRef.current?.canvas ?? null
      },
    }),
    [],
  )

  return (
    <div
      ref={rootRef}
      className={[styles.root, className ?? ''].join(' ')}
      style={{ '--imm-ascii-ink': theme.inkCss, ...style } as CSSProperties}
      role="img"
      aria-label={alt}
    >
      <div ref={screenRef} className={styles.screen} />
    </div>
  )
})
