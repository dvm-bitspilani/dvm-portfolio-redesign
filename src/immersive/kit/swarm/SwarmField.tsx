import { useEffect, useImperativeHandle, useMemo, useRef, useState, type CSSProperties, type Ref } from 'react'
import { createPortal } from 'react-dom'
import { SwarmEngine, type EngineSettings } from './engine/SwarmEngine'
import { SwarmHandle } from './controller'
import type { SwarmController, SwarmPalette, SwarmQuality, SwarmShowOptions, SwarmTarget } from './types'
import styles from './swarm.module.css'

export interface SwarmFieldProps extends SwarmShowOptions {
  /** Formation to show. Changing it morphs (same as `ref.current.setTarget`). */
  target?: SwarmTarget
  /** Colour ramp slow → fast. Default 'teal' (deep teal → #45e6ff → white-hot). */
  palette?: SwarmPalette
  /** Particle count, or 'auto' (≈200k desktop / 65k touch). Changing it rebuilds the GPU side. */
  count?: 'auto' | number
  /** 'low' = fewer particles + DPR 1; 'high' = more particles + DPR 2. */
  quality?: SwarmQuality
  /** Cursor repel/vortex wake + parallax. Default true. */
  interactive?: boolean
  /** Press and hold (mouse/pen) on empty space to pull the swarm into a black hole. Default true. */
  holdToAttract?: boolean
  /** 'transparent' or any CSS colour. Default '#050506'. */
  background?: 'transparent' | (string & {})
  /** Bloom post-processing. Default true. */
  bloom?: boolean
  /** Camera parallax with the cursor, 0..1. Default 0.35. */
  parallax?: number
  /** Overall brightness multiplier. Default 1. */
  brightness?: number
  /** Freeze the simulation (still disposes normally). */
  paused?: boolean
  /** Small cursor ring that collapses into a well while holding. Default true on fine pointers. */
  cursorRing?: boolean
  className?: string
  style?: CSSProperties
  ref?: Ref<SwarmController>
  /** Internal: SwarmProvider passes its own long-lived handle. */
  controller?: SwarmHandle
}

const pointKeys = new WeakMap<Float32Array, number>()
let pointSeq = 0
/** Cheap identity for effect deps (inline target objects are fine). */
export function targetSig(t: SwarmTarget | undefined): string {
  if (!t) return ''
  if (typeof t === 'string') return t
  if ('text' in t) return `t|${t.text}|${t.font}|${t.weight}|${t.tracking}`
  if ('image' in t) return `i|${t.image}|${t.fit}|${t.invert}|${t.contrast}`
  let id = pointKeys.get(t.points)
  if (id === undefined) pointKeys.set(t.points, (id = ++pointSeq))
  return `p|${t.key ?? id}`
}

function placementSig(p: SwarmShowOptions['placement']) {
  if (!p || typeof p === 'string') return p ?? ''
  if (typeof p === 'function') return 'fn'
  return `${p.x0},${p.y0},${p.x1},${p.y1}`
}

function useEnv() {
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [mobile] = useState(() => matchMedia('(pointer: coarse)').matches || innerWidth < 760)
  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => setReduced(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return { reduced, mobile }
}

function sideFor(count: 'auto' | number, quality: SwarmQuality, mobile: boolean) {
  if (typeof count === 'number') return Math.max(32, Math.min(1024, Math.round(Math.sqrt(count))))
  if (quality === 'low') return mobile ? 180 : 320
  if (quality === 'high') return mobile ? 320 : 512
  // 448² = 200,704 particles on desktop; 256² = 65,536 on touch devices.
  return mobile ? 256 : 448
}

export function SwarmField(props: SwarmFieldProps) {
  const {
    target,
    palette = 'teal',
    count = 'auto',
    quality = 'auto',
    interactive = true,
    holdToAttract = true,
    background = '#050506',
    bloom = true,
    parallax = 0.35,
    brightness = 1,
    paused = false,
    cursorRing = true,
    className,
    style,
    ref,
    controller,
    placement,
    fill,
    spin,
    tilt,
    sway,
    morphDuration,
    kick,
    burst,
  } = props
  const { reduced, mobile } = useEnv()
  const root = useRef<HTMLDivElement>(null)
  const ring = useRef<HTMLDivElement>(null)
  const engineRef = useRef<SwarmEngine | null>(null)
  const own = useMemo(() => new SwarmHandle(), [])
  const handle = controller ?? own
  const [noGL, setNoGL] = useState(false)
  useImperativeHandle(ref, () => handle, [handle])

  const settings: EngineSettings = {
    palette,
    background,
    bloom,
    interactive,
    holdToAttract,
    parallax,
    brightness,
    paused,
    defaults: { placement, morphDuration, kick, burst },
  }
  const settingsRef = useRef(settings)
  const paletteSig = typeof palette === 'string' ? palette : palette.join()
  const pSig = placementSig(placement)

  // Engine lifecycle: rebuilt only when the particle budget or reduced-motion changes.
  const N = sideFor(count, quality, mobile)
  const dprCap = quality === 'low' ? 1 : quality === 'high' ? 2 : mobile ? 1.5 : 1.75
  useEffect(() => {
    const el = root.current
    if (!el) return
    const engine = new SwarmEngine(el, { N, mobile, reduced, dprCap }, settingsRef.current, cursorRing && !mobile ? ring.current : null)
    engineRef.current = engine
    setNoGL(!engine.glOk)
    handle.attach(engine)
    return () => {
      handle.detach(engine)
      engine.dispose()
      engineRef.current = null
    }
  }, [N, mobile, reduced, dprCap, cursorRing, handle])

  // Cheap settings updates (no rebuild).
  useEffect(() => {
    settingsRef.current = settings
    engineRef.current?.update(settings)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paletteSig, background, bloom, interactive, holdToAttract, parallax, brightness, paused, pSig, morphDuration, kick, burst])

  // Declarative target.
  const tSig = targetSig(target)
  const latest = useRef({ target, opts: {} as SwarmShowOptions })
  latest.current = { target, opts: { placement, fill, spin, tilt, sway, morphDuration, kick, burst } }
  useEffect(() => {
    const { target: t, opts } = latest.current
    if (t) void handle.setTarget(t, opts)
  }, [tSig, pSig, fill, spin, tilt, sway, handle])

  return (
    <div ref={root} className={[styles.field, noGL ? styles.noGL : '', className].filter(Boolean).join(' ')} style={style} aria-hidden="true">
      {cursorRing && !mobile && createPortal(<div ref={ring} className={styles.ring} />, document.body)}
    </div>
  )
}
