import { useEffect, useRef } from 'react'
import { drawLogo, isInsideLogo } from '../shared/logo'

/**
 * Lightweight generative stand-in for a poster image: one Canvas 2D drawing,
 * redrawn only on resize. Each known slug gets a sketch of its own medium; any
 * other slug gets a generic glowing mark.
 */

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

function rng(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function rgba(hex: string, a: number) {
  const m = hex.replace('#', '')
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m.slice(0, 6)
  const n = parseInt(full, 16)
  if (Number.isNaN(n)) return `rgba(255,255,255,${a})`
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

type Sketch = (ctx: CanvasRenderingContext2D, w: number, h: number, accent: string, r: () => number) => void

/** Map canvas px to logo-normalised coords for a logo of height `lh` centred at (cx, cy). */
const inside = (px: number, py: number, cx: number, cy: number, lh: number) => isInsideLogo((px - cx) / lh, -(py - cy) / lh)

const sketches: Record<string, Sketch> = {
  holo(ctx, w, h, accent) {
    const cx = w / 2, cy = h * 0.46, lh = h * 0.56
    // projector cone
    const cone = ctx.createLinearGradient(0, h, 0, cy - lh / 2)
    cone.addColorStop(0, rgba(accent, 0.28))
    cone.addColorStop(1, rgba(accent, 0))
    ctx.fillStyle = cone
    ctx.beginPath()
    ctx.moveTo(cx - w * 0.04, h * 0.95)
    ctx.lineTo(cx + w * 0.04, h * 0.95)
    ctx.lineTo(cx + lh * 0.55, cy - lh / 2)
    ctx.lineTo(cx - lh * 0.55, cy - lh / 2)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = rgba(accent, 0.5)
    ctx.beginPath()
    ctx.ellipse(cx, h * 0.95, w * 0.12, h * 0.018, 0, 0, Math.PI * 2)
    ctx.fill()
    // chromatic split
    ctx.globalCompositeOperation = 'lighter'
    drawLogo(ctx, cx - 3, cy, lh, 'rgba(255,40,120,0.25)')
    ctx.shadowColor = accent
    ctx.shadowBlur = 24
    drawLogo(ctx, cx, cy, lh, rgba(accent, 0.55))
    ctx.shadowBlur = 0
    ctx.globalCompositeOperation = 'source-over'
    // scanlines
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 2)
    ctx.fillStyle = rgba(accent, 0.18)
    ctx.fillRect(0, cy + lh * 0.1, w, 3)
  },

  boot(ctx, w, h, accent, r) {
    const cell = Math.max(8, Math.round(w / 64))
    const cx = w / 2, cy = h / 2, lh = h * 0.72
    const ramp = '.:-=+*#%@'
    ctx.font = `600 ${cell * 1.15}px ui-monospace, monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (let y = cell / 2; y < h; y += cell * 1.35)
      for (let x = cell / 2; x < w; x += cell * 0.82) {
        if (inside(x, y, cx, cy, lh)) {
          const shade = 0.35 + 0.65 * ((x - cx + lh * 0.3) / (lh * 0.6))
          const k = Math.min(ramp.length - 1, Math.max(0, Math.floor(shade * ramp.length + r() * 1.5)))
          ctx.fillStyle = rgba(accent, 0.55 + 0.45 * shade)
          ctx.fillText(ramp[k], x, y)
        } else if (r() < 0.05) {
          ctx.fillStyle = rgba(accent, 0.14)
          ctx.fillText(r() < 0.5 ? '0' : '1', x, y)
        }
      }
    // CRT vignette
    const v = ctx.createRadialGradient(cx, cy, h * 0.2, cx, cy, w * 0.7)
    v.addColorStop(0, 'rgba(0,0,0,0)')
    v.addColorStop(1, 'rgba(0,0,0,0.75)')
    ctx.fillStyle = v
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = rgba(accent, 0.8)
    ctx.font = `500 ${Math.max(10, cell)}px ui-monospace, monospace`
    ctx.textAlign = 'left'
    ctx.fillText('dvm@lab:~$ _', cell * 2, h - cell * 2)
  },

  fold(ctx, w, h, accent, r) {
    // paper strips crossing the frame
    for (let i = 0; i < 7; i++) {
      const y = h * (0.08 + i * 0.14) + r() * 10
      const tilt = (r() - 0.5) * h * 0.25
      const g = ctx.createLinearGradient(0, y, w, y + tilt)
      g.addColorStop(0, '#0d0d0f')
      g.addColorStop(0.5, i % 2 ? '#1a1a1d' : '#121214')
      g.addColorStop(1, '#0a0a0b')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y + tilt)
      ctx.lineTo(w, y + tilt + h * 0.09)
      ctx.lineTo(0, y + h * 0.09)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = rgba(accent, 0.35)
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y + tilt)
      ctx.stroke()
    }
    const cx = w / 2, cy = h / 2, lh = h * 0.66
    ctx.shadowColor = 'rgba(0,0,0,0.9)'
    ctx.shadowBlur = 40
    ctx.shadowOffsetY = 18
    const g = ctx.createLinearGradient(cx - lh * 0.3, cy - lh / 2, cx + lh * 0.3, cy + lh / 2)
    g.addColorStop(0, '#1c1c1f')
    g.addColorStop(0.48, '#2a2a2e')
    g.addColorStop(0.5, '#0e0e10')
    g.addColorStop(1, '#202024')
    drawLogo(ctx, cx, cy, lh, g)
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetY = 0
    // copper edge glints
    ctx.globalCompositeOperation = 'lighter'
    drawLogo(ctx, cx + 2, cy - 2, lh, rgba(accent, 0.55))
    ctx.globalCompositeOperation = 'source-over'
    drawLogo(ctx, cx, cy, lh, g)
  },

  swarm(ctx, w, h, accent, r) {
    const cx = w / 2, cy = h / 2, lh = h * 0.7
    const n = Math.round((w * h) / 22)
    ctx.globalCompositeOperation = 'lighter'
    for (let i = 0; i < n; i++) {
      const x = r() * w, y = r() * h
      const isIn = inside(x, y, cx, cy, lh)
      if (!isIn && r() > 0.03) continue
      const a = isIn ? 0.35 + r() * 0.55 : 0.08 + r() * 0.2
      ctx.fillStyle = r() < 0.15 ? `rgba(255,255,255,${a})` : rgba(accent, a)
      const s = isIn ? 1 + r() * 1.4 : 0.6 + r()
      ctx.fillRect(x + (isIn ? 0 : (r() - 0.5) * 20), y, s, s)
    }
    ctx.globalCompositeOperation = 'source-over'
  },

  mercury(ctx, w, h) {
    const cx = w / 2, cy = h * 0.5, lh = h * 0.66
    const floor = ctx.createRadialGradient(cx, h * 1.1, 0, cx, h * 1.1, w * 0.7)
    floor.addColorStop(0, 'rgba(255,255,255,0.14)')
    floor.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = floor
    ctx.fillRect(0, 0, w, h)
    const g = ctx.createLinearGradient(0, cy - lh / 2, 0, cy + lh / 2)
    g.addColorStop(0, '#fafafa')
    g.addColorStop(0.32, '#7d7f86')
    g.addColorStop(0.5, '#151518')
    g.addColorStop(0.62, '#c9ccd4')
    g.addColorStop(1, '#2a2b30')
    ctx.shadowColor = 'rgba(255,255,255,0.18)'
    ctx.shadowBlur = 30
    drawLogo(ctx, cx, cy, lh, g)
    ctx.shadowBlur = 0
    // thin-film sheen
    ctx.save()
    ctx.globalCompositeOperation = 'overlay'
    const film = ctx.createLinearGradient(cx - lh * 0.4, cy - lh * 0.4, cx + lh * 0.4, cy + lh * 0.4)
    film.addColorStop(0, 'rgba(120,80,255,0.7)')
    film.addColorStop(0.35, 'rgba(0,220,255,0.5)')
    film.addColorStop(0.65, 'rgba(255,220,90,0.5)')
    film.addColorStop(1, 'rgba(255,60,160,0.6)')
    drawLogo(ctx, cx, cy, lh, film)
    ctx.restore()
    // droplets
    ctx.fillStyle = '#cfd1d7'
    for (const [dx, dy, rad] of [[0.28, -0.1, 0.035], [0.34, 0.06, 0.018], [-0.3, 0.22, 0.024]]) {
      const x = cx + dx * lh, y = cy + dy * lh, rr = rad * lh
      const dg = ctx.createRadialGradient(x - rr * 0.4, y - rr * 0.4, 0, x, y, rr)
      dg.addColorStop(0, '#ffffff')
      dg.addColorStop(0.6, '#6c6e75')
      dg.addColorStop(1, '#141417')
      ctx.fillStyle = dg
      ctx.beginPath()
      ctx.arc(x, y, rr, 0, Math.PI * 2)
      ctx.fill()
    }
  },

  press(ctx, w, h, accent) {
    // 1-bit ordered dither of a soft blob
    const s = Math.max(3, Math.round(w / 180))
    const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
    ctx.fillStyle = 'rgba(236,236,236,0.55)'
    for (let y = 0, j = 0; y < h; y += s, j++)
      for (let x = 0, i = 0; x < w; x += s, i++) {
        const d = Math.hypot((x - w * 0.68) / w, (y - h * 0.6) / h)
        const v = Math.max(0, 0.75 - d * 1.6)
        if (v > (bayer[(j % 4) * 4 + (i % 4)] + 0.5) / 16) ctx.fillRect(x, y, s - 1, s - 1)
      }
    ctx.fillStyle = accent
    ctx.font = `800 ${h * 0.62}px 'Bricolage Grotesque Variable', system-ui, sans-serif`
    ctx.textBaseline = 'alphabetic'
    ctx.fillText('DVM', w * 0.04, h * 0.78)
    ctx.fillStyle = 'rgba(236,236,236,0.85)'
    ctx.font = `600 ${Math.max(9, h * 0.035)}px 'Bricolage Grotesque Variable', system-ui, sans-serif`
    ctx.fillText('Department of Visual Media', w * 0.05, h * 0.9)
    ctx.fillRect(w * 0.05, h * 0.1, w * 0.9, 2)
  },

  default(ctx, w, h, accent) {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.5)
    g.addColorStop(0, rgba(accent, 0.18))
    g.addColorStop(1, rgba(accent, 0))
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
    ctx.shadowColor = accent
    ctx.shadowBlur = 30
    drawLogo(ctx, w / 2, h / 2, h * 0.6, rgba(accent, 0.85))
    ctx.shadowBlur = 0
  },
}

export default function PosterPlaceholder({ slug, accent }: { slug: string; accent: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let raf = 0
    let lastW = 0
    let lastH = 0
    const draw = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = Math.max(1, Math.round(rect.width))
      const h = Math.max(1, Math.round(rect.height))
      if (w === lastW && h === lastH) return
      lastW = w
      lastH = h
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.fillStyle = '#070708'
      ctx.fillRect(0, 0, w, h)
      ;(sketches[slug] ?? sketches.default)(ctx, w, h, accent, rng(hash(slug)))
    }
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(draw)
    })
    ro.observe(canvas)
    // Redraw once webfonts arrive (Press sketch uses type).
    document.fonts?.ready.then(() => {
      lastW = 0
      draw()
    })
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [slug, accent])

  return <canvas ref={ref} className="lab-poster__canvas" aria-hidden="true" />
}
