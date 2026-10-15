import { useEffect, useRef, type CSSProperties } from 'react'
import { isReduced } from '../lib/hooks'

interface Props {
  text: string
  /** [wght, wdth] at rest and at the cursor. */
  from?: [number, number]
  to?: [number, number]
  /** Falloff radius in em. */
  radius?: number
  className?: string
  style?: CSSProperties
}

/**
 * Splits a line into letters whose weight/width swell toward the cursor.
 * The loop only runs while the pointer is near the element.
 */
export default function SwellText({ text, from = [300, 75], to = [800, 100], radius = 0.9, className = '', style }: Props) {
  const el = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const root = el.current!
    if (isReduced()) return
    const spans = Array.from(root.querySelectorAll<HTMLSpanElement>('.pr-sw-l'))
    const v = new Float32Array(spans.length)
    const last = new Int32Array(spans.length).fill(-1)
    let px = -1e4,
      py = -1e4,
      raf = 0,
      near = false
    const frame = () => {
      raf = 0
      const fs = parseFloat(getComputedStyle(root).fontSize) || 100
      let busy = false
      const rects = spans.map((s) => s.getBoundingClientRect())
      spans.forEach((s, i) => {
        const b = rects[i]
        const dx = (px - (b.left + b.width / 2)) / fs
        const dy = ((py - (b.top + b.height / 2)) / fs) * 1.2
        const t = near ? Math.exp(-(dx * dx + dy * dy) / (radius * radius)) : 0
        v[i] += (t - v[i]) * 0.14
        if (Math.abs(t - v[i]) > 0.004) busy = true
        const w = Math.round(from[0] + (to[0] - from[0]) * v[i])
        const d = Math.round(from[1] + (to[1] - from[1]) * v[i])
        const key = w * 1000 + d
        if (key !== last[i]) {
          last[i] = key
          s.style.fontVariationSettings = `"wght" ${w}, "wdth" ${d}`
        }
      })
      if (busy || near) raf = requestAnimationFrame(frame)
    }
    const onMove = (e: PointerEvent) => {
      px = e.clientX
      py = e.clientY
      const b = root.getBoundingClientRect()
      const m = parseFloat(getComputedStyle(root).fontSize) * radius * 1.5
      const wasNear = near
      near = px > b.left - m && px < b.right + m && py > b.top - m && py < b.bottom + m
      if ((near || wasNear) && !raf) raf = requestAnimationFrame(frame)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
    }
  }, [from, to, radius])
  return (
    <span ref={el} className={`pr-sw ${className}`} style={style} aria-label={text}>
      {[...text].map((ch, i) => (
        <span key={i} className="pr-sw-l" aria-hidden="true" style={{ fontVariationSettings: `"wght" ${from[0]}, "wdth" ${from[1]}` }}>
          {ch === ' ' ? ' ' : ch}
        </span>
      ))}
    </span>
  )
}
