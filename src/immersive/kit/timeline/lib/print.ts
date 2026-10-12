import * as THREE from 'three'
import type { Chain, StripLayout } from './strip'
import type { ToneSpec } from './tones'
import { stopU } from './phases'

/* Deterministic PRNG so the paper looks the same on every visit. */
export function mulberry(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Tileable paper-fibre height map: soft cloudy formation + thousands of short
 * fibres. Used as bump map and (in the shaders) as a tonal variation.
 */
export function createFibreTexture(size = 512) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')!
  const rnd = mulberry(7)
  ctx.fillStyle = 'rgb(128,128,128)'
  ctx.fillRect(0, 0, size, size)
  const wrap = (fn: (ox: number, oy: number) => void) => {
    for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) fn(ox, oy)
  }
  for (let i = 0; i < 260; i++) {
    const x = rnd() * size
    const y = rnd() * size
    const r = 10 + rnd() * 50
    const v = rnd() > 0.5 ? 255 : 0
    const a = 0.025 + rnd() * 0.04
    wrap((ox, oy) => {
      const g = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r)
      g.addColorStop(0, `rgba(${v},${v},${v},${a})`)
      g.addColorStop(1, `rgba(${v},${v},${v},0)`)
      ctx.fillStyle = g
      ctx.fillRect(x + ox - r, y + oy - r, r * 2, r * 2)
    })
  }
  ctx.lineCap = 'round'
  for (let i = 0; i < 3200; i++) {
    const x = rnd() * size
    const y = rnd() * size
    const ang = rnd() * Math.PI * 2
    const l = 4 + rnd() * rnd() * 34
    const bend = (rnd() - 0.5) * 0.9
    const v = rnd() > 0.45 ? 255 : 0
    ctx.strokeStyle = `rgba(${v},${v},${v},${0.06 + rnd() * 0.22})`
    ctx.lineWidth = 0.4 + rnd() * 1.1
    wrap((ox, oy) => {
      if (x + ox < -40 || x + ox > size + 40 || y + oy < -40 || y + oy > size + 40) return
      ctx.beginPath()
      ctx.moveTo(x + ox, y + oy)
      ctx.quadraticCurveTo(
        x + ox + Math.cos(ang + bend) * l * 0.5,
        y + oy + Math.sin(ang + bend) * l * 0.5,
        x + ox + Math.cos(ang) * l,
        y + oy + Math.sin(ang) * l,
      )
      ctx.stroke()
    })
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.NoColorSpace
  return tex
}

export interface PrintStop {
  label: string
  count: number
}

interface StripPrintOpts {
  chains: Chain[]
  layout: StripLayout
  stops: PrintStop[]
  tone: ToneSpec
  width: number
}

/* roughness (G) / metalness (B) values for the second sheet */
const PAPER_MR = 'rgb(0,232,0)'
const FOIL_MR = 'rgb(0,62,255)'
const INK_MR = 'rgb(0,190,0)'

/**
 * Print sheet for the whole strip: a ruler along one edge, origami crease
 * notation, a foil-stamped label at each stop, and the perforation where the two
 * ribbons of the mark meet. Drawn twice: colour, and roughness/metalness.
 */
export function createStripPrint({ chains, layout, stops, tone, width }: StripPrintOpts) {
  const avgH = chains.reduce((a, c) => a + c.halfWidth, 0) / chains.length
  const W = width
  const H = Math.round((W * 2 * avgH) / layout.total)
  const colour = document.createElement('canvas')
  const mr = document.createElement('canvas')
  colour.width = mr.width = W
  colour.height = mr.height = H
  const n = stops.length
  const spacing = n > 1 ? (stopU(1, n) - stopU(0, n)) * W : W * 0.5

  const draw = (ctx: CanvasRenderingContext2D, mode: 'colour' | 'mr') => {
    const c = mode === 'colour'
    const paper = c ? tone.paper : PAPER_MR
    const foil = c ? tone.foil : FOIL_MR
    const ink = c ? tone.ink : INK_MR
    ctx.textAlign = 'left'
    ctx.fillStyle = paper
    ctx.fillRect(0, 0, W, H)
    const ux = (u: number) => u * W
    // ruler along the lower edge
    ctx.fillStyle = ink
    const ticks = 400
    for (let i = 0; i <= ticks; i++) {
      const x = ux(i / ticks)
      const major = i % 10 === 0
      const th = major ? H * 0.17 : i % 5 === 0 ? H * 0.11 : H * 0.065
      ctx.fillRect(x, H - th - H * 0.04, major ? 1.6 : 1, th)
    }
    // crease notation: valley = dashed, mountain = dash-dot
    chains.forEach((chain, ci) => {
      const off = layout.offsets[ci]
      const h = chain.halfWidth
      for (const hg of chain.hinges) {
        if (hg.k === 0) continue
        const toC = (x: number, y: number) => [((x + off) / layout.total) * W, ((h - y) / (2 * h)) * H] as const
        const t = h / Math.abs(hg.axis.y || 1e-6)
        const a = toC(hg.pivot.x - hg.axis.x * t, hg.pivot.y - hg.axis.y * t)
        const b = toC(hg.pivot.x + hg.axis.x * t, hg.pivot.y + hg.axis.y * t)
        ctx.strokeStyle = ink
        ctx.lineWidth = 1.6
        ctx.setLineDash(hg.sign > 0 ? [9, 7] : [14, 5, 2, 5])
        ctx.beginPath()
        ctx.moveTo(a[0], a[1])
        ctx.lineTo(b[0], b[1])
        ctx.stroke()
        ctx.setLineDash([])
      }
    })
    // perforation between the two ribbons
    const gapU = (layout.offsets[1] + chains[1].flatMin - layout.offsets[0] - chains[0].flatMax) / 2
    const perfU = (layout.offsets[0] + chains[0].flatMax + gapU) / layout.total
    ctx.fillStyle = c ? tone.perf : 'rgb(0,255,0)'
    for (let y = H * 0.08; y < H * 0.92; y += H * 0.07) {
      ctx.beginPath()
      ctx.arc(ux(perfU), y, H * 0.014, 0, Math.PI * 2)
      ctx.fill()
    }
    // colophon at the head of the strip, signature at the tail
    ctx.fillStyle = ink
    ctx.font = `${tone.smallWeight} ${Math.round(H * 0.12)}px ${tone.smallFont}`
    ctx.textBaseline = 'alphabetic'
    ctx.fillText('Department of Visual Media, BITS Pilani', ux(0.008), H * 0.3)
    ctx.fillText('One strip, two ribbons, seven folds', ux(0.008), H * 0.47)
    ctx.textAlign = 'right'
    ctx.fillText('Made by DVM', ux(0.992), H * 0.3)
    ctx.textAlign = 'left'
    // stops: a foil rule, the stamped label, and a count
    for (let i = 0; i < n; i++) {
      const s = stops[i]
      const x = ux(stopU(i, n))
      ctx.fillStyle = foil
      ctx.fillRect(x - 1.5, H * 0.06, 3, H * 0.88)
      let size = Math.round(H * tone.yearSize)
      ctx.font = `${tone.yearWeight} ${size}px ${tone.yearFont}`
      const room = spacing - H * 0.3
      const w = ctx.measureText(s.label).width
      if (w > room && room > 0) {
        size = Math.max(Math.round(H * 0.2), Math.floor((size * room) / w))
        ctx.font = `${tone.yearWeight} ${size}px ${tone.yearFont}`
      }
      ctx.fillText(s.label, x + H * 0.09, H * 0.5 + size * 0.36)
      ctx.fillStyle = ink
      ctx.font = `${tone.smallWeight} ${Math.round(H * 0.1)}px ${tone.smallFont}`
      ctx.fillText(`${s.count} ${s.count === 1 ? 'entry' : 'entries'}`, x + H * 0.1, H * 0.2)
    }
  }

  const ctxC = colour.getContext('2d')!
  const ctxM = mr.getContext('2d')!
  draw(ctxC, 'colour')
  draw(ctxM, 'mr')
  const map = new THREE.CanvasTexture(colour)
  map.colorSpace = THREE.SRGBColorSpace
  const mrMap = new THREE.CanvasTexture(mr)
  mrMap.colorSpace = THREE.NoColorSpace
  const redraw = () => {
    draw(ctxC, 'colour')
    draw(ctxM, 'mr')
    map.needsUpdate = true
    mrMap.needsUpdate = true
  }
  const dispose = () => {
    map.dispose()
    mrMap.dispose()
    // release the backing stores early (8k canvases are ~7 MB each)
    colour.width = colour.height = mr.width = mr.height = 1
  }
  return { map, mrMap, redraw, dispose }
}
