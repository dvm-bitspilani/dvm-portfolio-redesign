import { useEffect, useRef, type ReactNode } from 'react'
import { DitherSurface, getPlate, INK, type DitherAlgo } from '../lib/dither'
import { isReduced } from '../lib/hooks'

interface Props {
  src: string | null
  caption?: ReactNode
  algo?: DitherAlgo
  tone?: 'bone' | 'red'
  width?: number
  height?: number
  cell?: number
  focusY?: number
}

/**
 * A dithered plate that trails the cursor (used by the Work index and the Team
 * wall). Moving prints it in 1-bit; holding still develops it into colour,
 * starting from the corner nearest the cursor. Swapping the image re-runs the
 * press roller over it.
 */
export default function FloatingPlate({ src, caption, algo = 'atkinson', tone = 'bone', width = 380, height = 250, cell = 2, focusY = 0.3 }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const srcRef = useRef(src)
  const api = useRef<{ setSrc: (s: string | null) => void } | null>(null)

  useEffect(() => {
    srcRef.current = src
    api.current?.setSrc(src)
  }, [src])

  useEffect(() => {
    const el = box.current!
    const surface = new DitherSurface(canvas.current!, tone === 'red' ? INK.red : INK.bone)
    const W = Math.round(width / cell)
    const H = Math.round(height / cell)
    surface.resize(W, H)
    const reduced = isReduced()
    let raf = 0
    let alive = true
    let token = 0
    let px = innerWidth / 2,
      py = innerHeight / 2,
      x = px,
      y = py,
      vx = 0,
      lastMove = performance.now(),
      shown = 0,
      want = 0,
      r = 0,
      printRow = Infinity,
      printStart = 0

    const setSrc = async (s: string | null) => {
      const my = ++token
      if (!s) {
        want = 0
        start()
        return
      }
      try {
        const plate = await getPlate(s, W, H, { algo, focusY })
        if (!alive || my !== token) return
        surface.plate = plate
        want = 1
        r = 0
        printRow = reduced ? Infinity : -1
        printStart = performance.now()
        surface.render(0, 0, 0, 1, printRow, true)
        start()
      } catch {
        /* ignore missing art */
      }
    }
    api.current = { setSrc }

    const frame = (now: number) => {
      raf = 0
      if (!alive) return
      const k = reduced ? 1 : 0.16
      const nx = x + (px - x) * k
      vx = vx * 0.8 + (nx - x) * 0.2
      x = nx
      y += (py - y) * k
      shown += (want - shown) * (reduced ? 1 : 0.18)
      if (Math.abs(want - shown) < 0.01) shown = want
      // hang the plate below-right of the cursor so the hovered line stays legible;
      // flip left / above near the viewport edges
      const flipX = px + 28 + width > innerWidth - 16
      const flipY = py + 44 + height + 60 > innerHeight
      const left = flipX ? x - 28 - width : x + 28
      const top = Math.max(70, flipY ? y - 44 - height - 40 : y + 44)
      const rot = reduced ? 0 : Math.max(-7, Math.min(7, vx * 0.35))
      el.style.transform = `translate3d(${left}px, ${top}px, 0) rotate(${rot}deg) scale(${0.9 + 0.1 * shown})`
      el.style.opacity = String(shown)

      let busy = shown !== want || Math.abs(px - x) > 0.5 || Math.abs(py - y) > 0.5
      if (surface.plate) {
        const printing = printRow !== Infinity
        if (printing) {
          const t = (now - printStart) / 420
          printRow = t >= 1 ? Infinity : Math.floor(H * t)
          busy = true
        }
        const still = now - lastMove > 450
        const diag = Math.hypot(W, H)
        const target = still ? diag * 1.05 : 0
        r += (target - r) * (still ? 0.045 : 0.25)
        if (Math.abs(target - r) < 0.3) r = target
        else busy = true
        // reveal grows from the point of the plate nearest the cursor
        const cx = Math.max(0, Math.min(W, (px - left) / cell))
        const cy = Math.max(0, Math.min(H, (py - top) / cell))
        surface.render(cx, cy, r, 8, printRow, printing)
        if (want && !still) busy = true
      }
      if (busy) raf = requestAnimationFrame(frame)
    }
    const start = () => {
      if (!raf && alive) raf = requestAnimationFrame(frame)
    }
    const onMove = (e: PointerEvent) => {
      px = e.clientX
      py = e.clientY
      lastMove = performance.now()
      if (srcRef.current) start()
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    if (srcRef.current) setSrc(srcRef.current)
    return () => {
      alive = false
      api.current = null
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
    }
  }, [algo, tone, width, height, cell, focusY])

  return (
    <div ref={box} className="pr-float" style={{ width, opacity: 0 }} aria-hidden="true">
      <canvas ref={canvas} style={{ width, height }} />
      {caption && <div className="pr-float-cap">{caption}</div>}
    </div>
  )
}
