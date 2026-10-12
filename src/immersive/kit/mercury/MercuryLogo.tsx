import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { MercuryRenderer, type MercuryBackdrop, type MercuryFit, type MercuryQuality, type MercuryStats, type RendererOptions } from './renderer'
import { resolveEnv, type MercuryEnv, type MercuryEnvName } from './themes'
import { logoFallbackSvg } from './logoSdf'
import styles from './MercuryLogo.module.css'

export type MercuryMaterial = 'chrome' | 'glass' | 'xray'
export type MercuryPointerTarget = 'parent' | 'self' | 'window' | HTMLElement | RefObject<HTMLElement | null> | null

export interface MercuryLogoBackdrop extends Omit<MercuryBackdrop, 'element'> {
  element?: HTMLElement | RefObject<HTMLElement | null> | null
}

export interface MercuryLogoProps {
  /** 'transparent' composites (premultiplied) over whatever is behind; 'studio' paints its own cyclorama + floor. */
  background?: 'transparent' | 'studio'
  /** Static material. Ignored when `progress` is given. */
  material?: MercuryMaterial
  /** Material progression: 0 chrome → 1 glass → 2 x-ray (or 0..1 with progressRange={1}). */
  progress?: number
  progressRange?: 1 | 2
  /** Approach rate (1/s) towards a new progress. 0 = follow exactly (e.g. already scrubbed by GSAP). Default 6. */
  smoothing?: number
  /** Reflection environment. 'teal' (default) matches the redesign, 'neutral' is the lab original. */
  env?: MercuryEnvName | MercuryEnv
  /** Accent colour for the low card / rim strip / x-ray lines (any hex). */
  tint?: string
  /** Oil-slick thin-film intensity, 0 = clean chrome. Default 1. */
  sheen?: number
  exposure?: number
  /** Soft drop shadow on an implicit plane behind the mark, 0..1. Default 0.6 (transparent) / 0 (studio). */
  shadow?: number
  /** Studio floor reflection + caustics, 0..1. Default 1. Studio mode only. */
  floor?: number
  /** X-ray stage: strength of the distance-field contour lines around the mark, 0..1. Default 1. */
  contours?: number
  fit?: MercuryFit
  /** Base orientation in radians. Default yaw 0.08, pitch -0.13. */
  rotation?: { yaw?: number; pitch?: number }
  /** How much the mark turns toward the cursor. Default 1. */
  tilt?: number
  /** Idle drift amount. Default 1. */
  sway?: number
  /** Cursor droplets / necks / snap, click-to-drop beads. Default true. */
  interactive?: boolean
  /** Element whose pointer events drive the mark. Default 'parent' (the canvas never takes events). */
  pointerTarget?: MercuryPointerTarget
  quality?: MercuryQuality
  /** Frame-rate cap, 0 = display rate. */
  fps?: number
  /** false = render a still frame on demand (also forced by prefers-reduced-motion). */
  animate?: boolean
  /** What the glass refracts. Without it: studio refracts its cyclorama, transparent glass is see-through. */
  backdrop?: MercuryLogoBackdrop | null
  /** Fade in + three beads fall into the mark. Default true. */
  intro?: boolean
  introDelay?: number
  label?: string
  className?: string
  style?: CSSProperties
  onReady?: () => void
}

export interface MercuryLogoHandle {
  /** Same units as the `progress` prop. */
  setProgress(p: number, immediate?: boolean): void
  /** Base orientation in radians, e.g. a scroll-scrubbed spin (cursor tilt adds on top). */
  setRotation(yaw: number, pitch?: number, immediate?: boolean): void
  /** Drop a bead at canvas-local CSS px, or a random one from above. */
  drop(x?: number, y?: number): void
  ripple(amount?: number): void
  playIntro(delay?: number): void
  /** Re-upload the backdrop texture (after redrawing a canvas source). */
  refreshBackdrop(): void
  getStats(): MercuryStats | null
  readonly canvas: HTMLCanvasElement | null
}

const MATERIAL_STAGE: Record<MercuryMaterial, number> = { chrome: 0, glass: 1, xray: 2 }
let fallbackUrl: string | null = null

const isRef = (v: unknown): v is RefObject<HTMLElement | null> => !!v && typeof v === 'object' && 'current' in (v as object)

function resolveTarget(t: MercuryPointerTarget | undefined, root: HTMLElement | null): HTMLElement | Window | null {
  if (!root || t === null) return null
  if (t === undefined || t === 'parent') return root.parentElement
  if (t === 'self') return root
  if (t === 'window') return window
  if (isRef(t)) return t.current
  return t
}

export const MercuryLogo = forwardRef<MercuryLogoHandle, MercuryLogoProps>(function MercuryLogo(props, ref) {
  const {
    background = 'transparent',
    material = 'chrome',
    progress,
    progressRange = 2,
    smoothing = 6,
    env = 'teal',
    tint,
    sheen = 1,
    exposure = 1,
    shadow,
    floor = 1,
    contours = 1,
    fit,
    rotation,
    tilt = 1,
    sway = 1,
    interactive = true,
    pointerTarget,
    quality = 'auto',
    fps = 0,
    animate = true,
    backdrop = null,
    intro = true,
    introDelay = 0,
    label = 'DVM',
    className,
    style,
    onReady,
  } = props

  const rootRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<MercuryRenderer | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [failed, setFailed] = useState(false)
  const [gen, setGen] = useState(0)

  const resolvedEnv = useMemo(() => resolveEnv(env, tint), [env, tint])
  const stageScale = progressRange === 1 ? 2 : 1
  const stage = progress !== undefined ? progress * stageScale : MATERIAL_STAGE[material]
  const fitR = useMemo<Required<MercuryFit>>(
    () => ({ mode: fit?.mode ?? 'contain', padding: fit?.padding ?? 0.12, scale: fit?.scale ?? 1, x: fit?.x ?? 0, y: fit?.y ?? 0 }),
    [fit?.mode, fit?.padding, fit?.scale, fit?.x, fit?.y],
  )

  const build = (): RendererOptions => {
    const bdEl = backdrop?.element
    return {
      background,
      progress: stage,
      smoothing,
      env: resolvedEnv,
      sheen,
      exposure,
      shadow: shadow ?? (background === 'studio' ? 0 : 0.6),
      floor,
      contours,
      fit: fitR,
      yaw: rotation?.yaw ?? 0.08,
      pitch: rotation?.pitch ?? -0.13,
      tilt,
      sway,
      interactive,
      quality,
      fps,
      animate,
      backdrop: backdrop ? { ...backdrop, element: isRef(bdEl) ? bdEl.current : (bdEl ?? null) } : null,
      intro,
      introDelay,
      pointerTarget: resolveTarget(pointerTarget, rootRef.current),
      onReady,
      onContextLost: undefined,
    }
  }
  const buildRef = useRef(build)
  buildRef.current = build

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const canvas = document.createElement('canvas')
    canvas.className = styles.canvas
    canvas.setAttribute('aria-hidden', 'true')
    root.appendChild(canvas)
    canvasRef.current = canvas
    let r: MercuryRenderer
    try {
      r = new MercuryRenderer(root, canvas, buildRef.current())
    } catch (err) {
      console.warn('[mercury] WebGL2 unavailable, showing the static mark', err)
      canvas.remove()
      canvasRef.current = null
      setFailed(true)
      return
    }
    rendererRef.current = r
    const onRestored = () => setGen((g) => g + 1)
    canvas.addEventListener('webglcontextrestored', onRestored)
    return () => {
      canvas.removeEventListener('webglcontextrestored', onRestored)
      r.dispose()
      rendererRef.current = null
      canvasRef.current = null
      canvas.remove()
    }
  }, [gen])

  // Push props every render (cheap: the renderer shallow-compares what matters).
  useEffect(() => {
    const r = rendererRef.current
    if (!r) return
    // The renderer only reloads the backdrop texture when `source` changes.
    const next = buildRef.current()
    r.setOptions(next)
  })

  useImperativeHandle(
    ref,
    () => ({
      setProgress: (p, immediate) => rendererRef.current?.setProgress(p * (progressRange === 1 ? 2 : 1), immediate),
      setRotation: (yaw, pitch, immediate) => rendererRef.current?.setRotation(yaw, pitch, immediate),
      drop: (x, y) => rendererRef.current?.drop(x, y),
      ripple: (a) => rendererRef.current?.ripple(a),
      playIntro: (d) => rendererRef.current?.playIntro(d),
      refreshBackdrop: () => rendererRef.current?.refreshBackdrop(),
      getStats: () => rendererRef.current?.getStats() ?? null,
      get canvas() {
        return canvasRef.current
      },
    }),
    [progressRange],
  )

  if (failed && !fallbackUrl) fallbackUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(logoFallbackSvg())
  const rootStyle: CSSProperties | undefined = pointerTarget === 'self' ? { pointerEvents: 'auto', ...style } : style

  return (
    <div
      ref={rootRef}
      className={[styles.root, background === 'studio' ? styles.studio : '', className].filter(Boolean).join(' ')}
      style={rootStyle}
      role="img"
      aria-label={label}
    >
      {failed && (
        <div className={styles.fallback}>
          <img src={fallbackUrl!} alt="" />
        </div>
      )}
    </div>
  )
})

export interface MercuryBadgeProps {
  /** Box size (px or any CSS length). Default 36. */
  size?: number | string
  env?: MercuryEnvName | MercuryEnv
  tint?: string
  material?: MercuryMaterial
  sheen?: number
  /** Ripple the surface when hovered. Default true. */
  hoverRipple?: boolean
  animate?: boolean
  label?: string
  className?: string
  style?: CSSProperties
}

/**
 * Small, cheap chrome mark for navbars / footers: low step count, 30 fps cap,
 * no droplets; tilts toward the cursor while hovered and ripples on enter.
 */
export function MercuryBadge({ size = 36, env = 'teal', tint, material = 'chrome', sheen = 0.8, hoverRipple = true, animate = true, label = 'DVM', className, style }: MercuryBadgeProps) {
  const ref = useRef<MercuryLogoHandle>(null)
  return (
    <span
      className={[styles.badge, className].filter(Boolean).join(' ')}
      style={{ width: size, height: size, ...style }}
      onPointerEnter={hoverRipple ? () => ref.current?.ripple(0.014) : undefined}
    >
      <MercuryLogo
        ref={ref}
        env={env}
        tint={tint}
        material={material}
        sheen={sheen}
        animate={animate}
        label={label}
        interactive={false}
        intro={false}
        shadow={0}
        contours={0}
        quality={{ scale: 1, steps: 56 }}
        fps={30}
        tilt={2.2}
        sway={0.7}
        fit={{ padding: 0.03 }}
        pointerTarget="parent"
      />
    </span>
  )
}
