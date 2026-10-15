import { useEffect, useRef, type CSSProperties } from 'react'
import { DitherSurface, getPlate, loadImage, INK, type DitherAlgo, type RGB } from '../lib/dither'
import { isReduced } from '../lib/hooks'

interface Props {
  src: string
  alt: string
  algo?: DitherAlgo
  /** CSS px per printed dot. */
  cell?: number
  tone?: 'bone' | 'red'
  /** Reveal radius in CSS px. */
  radius?: number
  focusY?: number
  contrast?: number
  className?: string
  style?: CSSProperties
  /** Reveal fully in colour (e.g. while the parent card is hovered or focused). */
  develop?: boolean
  /** Called with the source image's natural aspect ratio (w/h) once loaded. */
  onRatio?: (r: number) => void
}

/**
 * A 1-bit dithered plate that prints itself row by row when it scrolls into
 * view and un-dithers to full colour inside a circle around the cursor.
 * Holding still "develops" the whole plate.
 */
export default function DitherImage({ src, alt, algo = 'atkinson', cell = 2, tone = 'bone', radius = 96, focusY = 0.5, contrast = 1.25, className, style, develop = false, onRatio }: Props) {
  const wrap = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const developRef = useRef(develop)
  const ratioRef = useRef(onRatio)
  useEffect(() => {
    ratioRef.current = onRatio
  }, [onRatio])
  const kick = useRef<() => void>(() => {})

  useEffect(() => {
    developRef.current = develop
    kick.current()
  }, [develop])

  useEffect(() => {
    const el = wrap.current!
    const cv = canvas.current!
    const surface = new DitherSurface(cv, (tone === 'red' ? INK.red : INK.bone) as RGB)
    const reduced = isReduced()
    let raf = 0
    let alive = true
    let visible = false
    let loaded = false
    let printRow = reduced ? Infinity : -1
    let printStart = 0
    // reveal state, in dot units
    let px = -999,
      py = -999,
      inside = false,
      r = 0,
      lastMove = 0
    let token = 0

    const load = async () => {
      const w = surface.w,
        h = surface.h
      if (!w || !h) return
      const my = ++token
      try {
        if (ratioRef.current) {
          const img = await loadImage(src)
          ratioRef.current(img.naturalWidth / img.naturalHeight)
        }
        const plate = await getPlate(src, w, h, { algo, focusY, contrast })
        if (!alive || my !== token) return
        surface.plate = plate
        if (!loaded && !reduced) {
          printRow = -1
          printStart = performance.now()
        }
        loaded = true
        el.dataset.ready = '1'
        start()
      } catch {
        el.dataset.ready = 'error'
      }
    }

    const size = () => {
      const w = Math.max(8, Math.round(el.clientWidth / cell))
      const h = Math.max(8, Math.round(el.clientHeight / cell))
      if (w === surface.w && h === surface.h) return
      surface.resize(w, h)
      if (visible) load()
    }

    const frame = (now: number) => {
      raf = 0
      if (!alive || !surface.plate) return
      let busy = false
      const printing = printRow !== Infinity
      if (printing) {
        const t = (now - printStart) / 900
        printRow = t >= 1 ? Infinity : Math.floor(surface.h * (1 - Math.pow(1 - t, 2.2)))
        busy = true
      }
      const still = inside && now - lastMove > 650
      const diag = Math.hypot(surface.w, surface.h)
      const target = developRef.current ? diag : inside ? (still ? diag : radius / cell) : 0
      const k = target > r ? (still || developRef.current ? 0.035 : 0.2) : 0.12
      r += (target - r) * k
      if (Math.abs(target - r) < 0.3) r = target
      else busy = true
      const cx = developRef.current && !inside ? surface.w / 2 : px
      const cy = developRef.current && !inside ? surface.h / 2 : py
      surface.render(cx, cy, r, 7, printRow, printing)
      if (inside && !still) busy = true // keep watching for stillness
      if (busy) raf = requestAnimationFrame(frame)
    }
    const start = () => {
      if (!raf && alive && surface.plate) raf = requestAnimationFrame(frame)
    }
    kick.current = start

    const onMove = (e: PointerEvent) => {
      const b = cv.getBoundingClientRect()
      px = ((e.clientX - b.left) / b.width) * surface.w
      py = ((e.clientY - b.top) / b.height) * surface.h
      inside = true
      lastMove = performance.now()
      start()
    }
    const onLeave = () => {
      inside = false
      start()
    }
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerenter', onMove)
    el.addEventListener('pointerleave', onLeave)

    const ro = new ResizeObserver(size)
    ro.observe(el)
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !visible) {
          visible = true
          size()
          load()
        }
      },
      { rootMargin: '120px' },
    )
    io.observe(el)
    return () => {
      alive = false
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerenter', onMove)
      el.removeEventListener('pointerleave', onLeave)
      kick.current = () => {}
    }
  }, [src, algo, cell, tone, radius, focusY, contrast])

  return (
    <div ref={wrap} className={`pr-dither ${className ?? ''}`} style={style} role="img" aria-label={alt}>
      <canvas ref={canvas} aria-hidden="true" />
    </div>
  )
}
