import * as THREE from 'three'
import { LOGO_ASPECT, sampleLogoPoints } from '../../../shared/logo'

/**
 * Target shapes as N×N float textures. Shapes are normalised to 1 unit tall,
 * centred on the origin; `aspect` = width / height. The last DUST fraction of
 * texels are ambient dust (w = -1) with identical positions in every target so
 * dust never has to travel between formations.
 */

export interface Target {
  key: string
  tex: THREE.DataTexture
  aspect: number
}

export interface ShapeData {
  /** shapeCount * 4 floats: xyz + brightness */
  pts: Float32Array
  aspect: number
}

export const DUST = 0.1

const rand = Math.random

function makeTexture(data: Float32Array, N: number) {
  const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat, THREE.FloatType)
  t.minFilter = t.magFilter = THREE.NearestFilter
  t.generateMipmaps = false
  t.colorSpace = THREE.NoColorSpace
  t.needsUpdate = true
  return t
}

const yieldFrame = () => new Promise<void>((r) => setTimeout(r, 0))

export class TargetLibrary {
  readonly N: number
  readonly count: number
  readonly shapeCount: number
  readonly dust: Float32Array
  private cache = new Map<string, Promise<Target>>()
  private resolved = new Map<string, Target>()
  private order: string[] = []
  private pinned = new Set<string>()
  /** Keys currently used by the director (never evicted). */
  inUse: () => Set<string> = () => new Set()
  private queue: Promise<unknown> = Promise.resolve()

  constructor(N: number) {
    this.N = N
    this.count = N * N
    this.shapeCount = Math.floor(this.count * (1 - DUST))
    const dn = this.count - this.shapeCount
    this.dust = new Float32Array(dn * 4)
    for (let i = 0; i < dn; i++) {
      // A deep, wide shell around the stage: in front of and behind the focal plane.
      const u = rand() * 2 - 1
      const a = rand() * Math.PI * 2
      const s = Math.sqrt(1 - u * u)
      const r = 2.2 + Math.pow(rand(), 0.6) * 4.5
      this.dust[i * 4] = Math.cos(a) * s * r * 1.5
      this.dust[i * 4 + 1] = u * r * 0.8
      this.dust[i * 4 + 2] = Math.sin(a) * s * r - 1.0
      this.dust[i * 4 + 3] = -1
    }
  }

  /** Initial particle positions: a scattered nebula; w = seed. */
  initialPositions(): Float32Array {
    const out = new Float32Array(this.count * 4)
    for (let i = 0; i < this.count; i++) {
      const u = rand() * 2 - 1
      const a = rand() * Math.PI * 2
      const s = Math.sqrt(1 - u * u)
      const r = 1.5 + rand() * 5
      out[i * 4] = Math.cos(a) * s * r * 1.6
      out[i * 4 + 1] = u * r * 0.9
      out[i * 4 + 2] = Math.sin(a) * s * r - 2
      out[i * 4 + 3] = rand()
    }
    return out
  }

  /** Pack shape points: sort by x (stable cross-shape correspondence), append dust. */
  pack(shape: ShapeData): Float32Array {
    const { pts } = shape
    const n = this.shapeCount
    const data = new Float32Array(this.count * 4)
    // counting sort on quantised x
    let minX = Infinity, maxX = -Infinity
    for (let i = 0; i < n; i++) {
      const x = pts[i * 4]
      if (x < minX) minX = x
      if (x > maxX) maxX = x
    }
    const BINS = 4096
    const span = Math.max(maxX - minX, 1e-6)
    const bin = new Uint16Array(n)
    const counts = new Uint32Array(BINS + 1)
    for (let i = 0; i < n; i++) {
      const b = Math.min(BINS - 1, Math.floor(((pts[i * 4] - minX) / span) * BINS))
      bin[i] = b
      counts[b + 1]++
    }
    for (let b = 0; b < BINS; b++) counts[b + 1] += counts[b]
    for (let i = 0; i < n; i++) {
      const o = counts[bin[i]]++ * 4
      data[o] = pts[i * 4]
      data[o + 1] = pts[i * 4 + 1]
      data[o + 2] = pts[i * 4 + 2]
      data[o + 3] = pts[i * 4 + 3]
    }
    data.set(this.dust, n * 4)
    return data
  }

  texture(data: Float32Array) {
    return makeTexture(data, this.N)
  }

  peek(key: string): Target | undefined {
    const t = this.resolved.get(key)
    if (t) this.touch(key)
    return t
  }

  /** Get (or build once) a target. Builds are serialised so they never stack up in one frame. */
  get(key: string, make: (n: number) => ShapeData | Promise<ShapeData>, pin = false): Promise<Target> {
    if (pin) this.pinned.add(key)
    const hit = this.cache.get(key)
    if (hit) {
      this.touch(key)
      return hit
    }
    const p: Promise<Target> = this.queue.then(yieldFrame).then(async () => {
      const shape = await make(this.shapeCount)
      const t: Target = { key, tex: makeTexture(this.pack(shape), this.N), aspect: shape.aspect }
      this.resolved.set(key, t)
      this.evict()
      return t
    })
    // keep the queue alive after failures
    this.queue = p.catch(() => undefined)
    p.catch(() => this.cache.delete(key))
    this.cache.set(key, p)
    this.touch(key)
    return p
  }

  private touch(key: string) {
    const i = this.order.indexOf(key)
    if (i >= 0) this.order.splice(i, 1)
    this.order.push(key)
  }

  private evict() {
    const MAX = 16
    const used = this.inUse()
    const evictable = this.order.filter((k) => !this.pinned.has(k) && !used.has(k) && this.resolved.has(k))
    while (this.resolved.size > MAX && evictable.length) {
      const k = evictable.shift()!
      this.resolved.get(k)?.tex.dispose()
      this.resolved.delete(k)
      this.cache.delete(k)
      this.order.splice(this.order.indexOf(k), 1)
    }
  }

  dispose() {
    for (const t of this.resolved.values()) t.tex.dispose()
    this.resolved.clear()
    this.cache.clear()
    this.order = []
  }
}

/* ------------------------------------------------------------------ */
/* Shape generators                                                    */
/* ------------------------------------------------------------------ */

export function logoShape(n: number): ShapeData {
  const nSurf = Math.floor(n * 0.3)
  const nArea = n - nSurf
  const area = sampleLogoPoints(nArea, 'area')
  const surf = sampleLogoPoints(nSurf, 'surface', 0.14)
  const pts = new Float32Array(n * 4)
  for (let i = 0; i < nArea; i++) {
    pts[i * 4] = area[i * 3]
    pts[i * 4 + 1] = area[i * 3 + 1]
    pts[i * 4 + 2] = (rand() - 0.5) * 0.1
    pts[i * 4 + 3] = 0.3 + 0.45 * rand()
  }
  for (let i = 0; i < nSurf; i++) {
    const o = (nArea + i) * 4
    pts[o] = surf[i * 3]
    pts[o + 1] = surf[i * 3 + 1]
    pts[o + 2] = surf[i * 3 + 2]
    pts[o + 3] = 0.9 + 0.5 * rand()
  }
  return { pts, aspect: LOGO_ASPECT }
}

interface CanvasSampleOpts {
  /** Use luminance (rgb) as weight instead of alpha. */
  luminance?: boolean
  /** Exponent applied to the weight (contrast of density). */
  gamma?: number
  /** z thickness for flat shapes. */
  depth?: number
  /** z relief scale by weight (images). */
  relief?: number
  /** Keep full canvas bounds rather than cropping to the drawn content. */
  fullFrame?: boolean
  /** Soft edge falloff width (0 = none). */
  vignette?: number
  /** Elliptical instead of rectangular falloff. */
  oval?: boolean
  /** Brightness floor for images. */
  floor?: number
}

/** Weighted sample of canvas pixels → normalised points (1 unit tall, centred). */
export function sampleCanvas(canvas: HTMLCanvasElement, n: number, opts: CanvasSampleOpts = {}): ShapeData {
  const { luminance = false, gamma = 1, depth = 0.06, relief = 0, fullFrame = false, vignette = 0, oval = false, floor = 0.35 } = opts
  const w = canvas.width, h = canvas.height
  const px = canvas.getContext('2d')!.getImageData(0, 0, w, h).data
  const weight = new Float32Array(w * h)
  let lo = Infinity, hi = -Infinity
  if (luminance) {
    for (let i = 0; i < w * h; i++) {
      const l = (0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2]) / 255
      weight[i] = l
      if (l < lo) lo = l
      if (l > hi) hi = l
    }
    // auto-contrast + gamma + vignette
    const span = Math.max(hi - lo, 0.05)
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x
        let v = Math.max(0, (weight[i] - lo) / span)
        v = Math.pow(v, gamma)
        if (vignette > 0) {
          if (oval) {
            const dx = (x / w - 0.5) * 2, dy = (y / h - 0.5) * 2
            const rr = Math.sqrt(dx * dx + dy * dy)
            v *= 1 - Math.min(1, Math.max(0, (rr - (1 - vignette)) / vignette))
          } else {
            const edge = Math.min(x / w, 1 - x / w, y / h, 1 - y / h)
            v *= Math.min(1, edge / vignette)
          }
        }
        weight[i] = v
      }
  } else {
    for (let i = 0; i < w * h; i++) weight[i] = px[i * 4 + 3] > 40 ? px[i * 4 + 3] / 255 : 0
  }
  // bounds
  let x0 = 0, y0 = 0, x1 = w, y1 = h
  if (!fullFrame) {
    x0 = w; y0 = h; x1 = 0; y1 = 0
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        if (weight[y * w + x] > 0) {
          if (x < x0) x0 = x
          if (x > x1) x1 = x
          if (y < y0) y0 = y
          if (y > y1) y1 = y
        }
    x1 += 1; y1 += 1
    if (x1 <= x0) { x0 = 0; y0 = 0; x1 = w; y1 = h }
  }
  const bw = x1 - x0, bh = y1 - y0
  const cdf = new Float32Array(w * h)
  let total = 0
  for (let i = 0; i < w * h; i++) {
    total += weight[i] > 0 ? weight[i] : 0
    cdf[i] = total
  }
  const pts = new Float32Array(n * 4)
  const cx = x0 + bw / 2, cy = y0 + bh / 2
  for (let k = 0; k < n; k++) {
    const r = rand() * total
    let a = 0, b = cdf.length - 1
    while (a < b) {
      const m = (a + b) >> 1
      if (cdf[m] < r) a = m + 1
      else b = m
    }
    const x = a % w, y = (a / w) | 0
    const wv = weight[a]
    pts[k * 4] = (x + rand() - cx) / bh
    pts[k * 4 + 1] = (cy - (y + rand())) / bh
    pts[k * 4 + 2] = (rand() - 0.5) * depth + (luminance ? (wv - 0.5) * relief : 0)
    pts[k * 4 + 3] = luminance ? floor + (1 - floor) * wv : 0.6 + 0.4 * rand()
  }
  return { pts, aspect: bw / bh }
}

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

export const DISPLAY_FONT = '"Unbounded Variable", "Unbounded", sans-serif'
export const WORDMARK_FONT = '"Swarm Jaapokki", "Unbounded Variable", sans-serif'

let jaapokki: Promise<void> | null = null
export function loadWordmarkFont() {
  if (!jaapokki) {
    const face = new FontFace('Swarm Jaapokki', 'url(/assets/fonts/jaapokki-subtract.otf)')
    jaapokki = face
      .load()
      .then((f) => {
        document.fonts.add(f)
      })
      .catch(() => undefined)
  }
  return jaapokki
}

export interface TextLine {
  text: string
  family: string
  weight: number
  size: number
  /** extra letter spacing in px */
  tracking?: number
}

/** Draw lines of text centred and sample them. */
export async function textShape(lines: TextLine[], n: number, depth = 0.08): Promise<ShapeData> {
  await Promise.all(lines.map((l) => document.fonts.load(`${l.weight} ${l.size}px ${l.family}`).catch(() => undefined)))
  await loadWordmarkFont()
  const W = 2000
  const lineH = lines.map((l) => l.size * 1.02)
  const H = Math.ceil(lineH.reduce((a, b) => a + b, 0) + 80)
  const c = canvas(W, H)
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  let y = 40
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]
    ctx.font = `${l.weight} ${l.size}px ${l.family}`
    if (l.tracking) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${l.tracking}px`
    else (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px'
    ctx.fillText(l.text, W / 2, y + lineH[i] / 2)
    y += lineH[i]
  }
  return sampleCanvas(c, n, { depth })
}

/** BITS Pilani main building + clock tower, drawn as a silhouette. */
export function towerShape(n: number): ShapeData {
  const c = canvas(1000, 1000)
  const g = c.getContext('2d')!
  g.fillStyle = '#fff'
  const ground = 930
  // Long two-storey wings.
  g.fillRect(40, 770, 920, ground - 770)
  g.fillRect(30, 762, 940, 10) // parapet
  // End pavilions with chhatri domes
  for (const x of [70, 930]) {
    g.fillRect(x - 32, 720, 64, 50)
    g.beginPath()
    g.ellipse(x, 720, 26, 30, 0, Math.PI, 0)
    g.fill()
    g.fillRect(x - 2, 676, 4, 18)
  }
  // Mid pavilions
  for (const x of [250, 750]) g.fillRect(x - 40, 742, 80, 30)
  // Central stepped pedestal with sloped shoulders.
  g.beginPath()
  g.moveTo(360, ground)
  g.lineTo(360, 742)
  g.lineTo(420, 742)
  g.lineTo(452, 688)
  g.lineTo(548, 688)
  g.lineTo(580, 742)
  g.lineTo(640, 742)
  g.lineTo(640, ground)
  g.closePath()
  g.fill()
  // Tapering shaft
  g.beginPath()
  g.moveTo(452, 700)
  g.lineTo(462, 300)
  g.lineTo(538, 300)
  g.lineTo(548, 700)
  g.closePath()
  g.fill()
  // Clock block + cornices
  g.fillRect(450, 196, 100, 108)
  g.fillRect(442, 296, 116, 10)
  g.fillRect(444, 188, 112, 10)
  // Lantern / belfry
  g.fillRect(468, 112, 64, 78)
  g.fillRect(460, 104, 80, 9)
  // Dome + finial
  g.beginPath()
  g.ellipse(500, 104, 30, 36, 0, Math.PI, 0)
  g.fill()
  g.fillRect(497, 46, 6, 24)
  g.beginPath()
  g.arc(500, 46, 6, 0, Math.PI * 2)
  g.fill()

  // Cut-outs
  g.globalCompositeOperation = 'destination-out'
  // wing windows: two rows
  for (const row of [790, 852]) {
    for (let x = 60; x < 950; x += 26) {
      if (x > 345 && x < 655) continue
      g.fillRect(x, row, 12, 34)
    }
  }
  // pedestal arches
  for (const x of [384, 616]) {
    g.beginPath()
    g.moveTo(x - 12, ground)
    g.lineTo(x - 12, 800)
    g.arc(x, 800, 12, Math.PI, 0)
    g.lineTo(x + 12, ground)
    g.fill()
  }
  g.beginPath()
  g.moveTo(476, ground)
  g.lineTo(476, 820)
  g.arc(500, 820, 24, Math.PI, 0)
  g.lineTo(524, ground)
  g.fill()
  // shaft slit windows
  for (const x of [477, 495, 513]) g.fillRect(x, 360, 10, 250)
  for (let y = 420; y < 610; y += 64) g.fillRect(470, y, 60, 6)
  // clock ring + hands
  g.beginPath()
  g.arc(500, 250, 38, 0, Math.PI * 2)
  g.fill()
  g.globalCompositeOperation = 'source-over'
  g.beginPath()
  g.arc(500, 250, 31, 0, Math.PI * 2)
  g.fill()
  g.globalCompositeOperation = 'destination-out'
  g.lineCap = 'round'
  g.lineWidth = 6
  g.beginPath()
  g.moveTo(500, 250)
  g.lineTo(500, 226)
  g.moveTo(500, 250)
  g.lineTo(518, 258)
  g.stroke()
  // belfry arch
  g.beginPath()
  g.moveTo(488, 190)
  g.lineTo(488, 140)
  g.arc(500, 140, 12, Math.PI, 0)
  g.lineTo(512, 190)
  g.fill()
  g.globalCompositeOperation = 'source-over'

  return sampleCanvas(c, n, { depth: 0.07 })
}

/** Spiral galaxy in the XZ plane (tilt it in the spec). */
export function galaxyShape(n: number): ShapeData {
  const pts = new Float32Array(n * 4)
  const arms = 3
  for (let i = 0; i < n; i++) {
    const core = rand() < 0.18
    let x: number, y: number, z: number
    if (core) {
      const r = Math.pow(rand(), 2) * 0.12
      const a = rand() * Math.PI * 2
      x = Math.cos(a) * r
      z = Math.sin(a) * r
      y = (rand() - 0.5) * 0.05
    } else {
      const r = 0.06 + Math.pow(rand(), 1.4) * 0.5
      const arm = Math.floor(rand() * arms)
      const a = (arm / arms) * Math.PI * 2 + r * 7.5 + (rand() - 0.5) * 0.5 * (1 - r)
      const spread = (rand() - 0.5) * 0.06 * (1 + r * 2)
      x = Math.cos(a) * r + spread
      z = Math.sin(a) * r + (rand() - 0.5) * 0.06 * (1 + r * 2)
      y = (rand() - 0.5) * 0.03 * (1 - r)
    }
    pts[i * 4] = x
    pts[i * 4 + 1] = y
    pts[i * 4 + 2] = z
    pts[i * 4 + 3] = core ? 0.9 : 0.35 + 0.5 * rand()
  }
  return { pts, aspect: 1 }
}

/** A thin halo ring in the XZ plane with a faint outer orbit. */
export function ringShape(n: number): ShapeData {
  const pts = new Float32Array(n * 4)
  for (let i = 0; i < n; i++) {
    const outer = rand() < 0.15
    const a = rand() * Math.PI * 2
    const g = () => (rand() + rand() + rand() - 1.5) / 1.5
    const R = outer ? 0.62 : 0.5
    const t = outer ? 0.006 : 0.022
    const rr = R + g() * t
    pts[i * 4] = Math.cos(a) * rr
    pts[i * 4 + 1] = g() * t
    pts[i * 4 + 2] = Math.sin(a) * rr
    pts[i * 4 + 3] = outer ? 0.5 : 0.65 + 0.35 * rand()
  }
  return { pts, aspect: 1.25 }
}

/** An envelope drawn with strokes. */
export function envelopeShape(n: number): ShapeData {
  const c = canvas(900, 640)
  const g = c.getContext('2d')!
  g.strokeStyle = '#fff'
  g.lineJoin = 'round'
  g.lineCap = 'round'
  g.lineWidth = 26
  g.strokeRect(60, 80, 780, 500)
  g.beginPath()
  g.moveTo(60, 80)
  g.lineTo(450, 380)
  g.lineTo(840, 80)
  g.stroke()
  g.lineWidth = 14
  g.beginPath()
  g.moveTo(60, 580)
  g.lineTo(350, 320)
  g.moveTo(840, 580)
  g.lineTo(550, 320)
  g.stroke()
  return sampleCanvas(c, n, { depth: 0.05 })
}

async function loadImage(url: string) {
  const img = new Image()
  img.decoding = 'async'
  img.src = url
  await img.decode()
  return img
}

/** Image → density field by luminance. */
export async function imageShape(url: string, n: number, opts: { portrait?: boolean } = {}): Promise<ShapeData> {
  const img = await loadImage(url)
  const W = opts.portrait ? 220 : 340
  const H = Math.max(1, Math.round((W * img.naturalHeight) / img.naturalWidth))
  const c = canvas(W, H)
  const g = c.getContext('2d', { willReadFrequently: true })!
  g.drawImage(img, 0, 0, W, H)
  return sampleCanvas(c, n, {
    luminance: true,
    gamma: opts.portrait ? 1.25 : 1.5,
    relief: opts.portrait ? 0.16 : 0.12,
    depth: 0.015,
    fullFrame: true,
    vignette: opts.portrait ? 0.45 : 0.06,
    oval: !!opts.portrait,
    floor: 0.3,
  })
}

/**
 * Sample the glyphs of a DOM element's text, in world coordinates on the z = 0
 * plane, for a camera at (0, 0, dist) looking at the origin.
 */
export function domTextToWorld(el: HTMLElement, lib: TargetLibrary, halfH: number): Float32Array {
  const vw = window.innerWidth, vh = window.innerHeight
  const halfW = halfH * (vw / vh)
  const box = el.getBoundingClientRect()
  const scale = 2
  const c = canvas(Math.max(1, Math.ceil(box.width * scale)), Math.max(1, Math.ceil(box.height * scale)))
  const g = c.getContext('2d', { willReadFrequently: true })!
  const cs = getComputedStyle(el)
  g.scale(scale, scale)
  g.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
  ;(g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing
  g.fillStyle = '#fff'
  g.textBaseline = 'alphabetic'
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  const range = document.createRange()
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent ?? ''
    const re = /\S+/g
    for (let m = re.exec(text); m; m = re.exec(text)) {
      range.setStart(node, m.index)
      range.setEnd(node, m.index + m[0].length)
      const rects = range.getClientRects()
      if (!rects.length) continue
      const r = rects[0]
      const metrics = g.measureText(m[0])
      const asc = metrics.fontBoundingBoxAscent ?? r.height * 0.8
      const desc = metrics.fontBoundingBoxDescent ?? r.height * 0.2
      const baseline = r.top + (r.height - (asc + desc)) / 2 + asc
      g.fillText(m[0], r.left - box.left, baseline - box.top)
    }
  }
  const px = g.getImageData(0, 0, c.width, c.height).data
  const valid: number[] = []
  for (let i = 0; i < c.width * c.height; i++) if (px[i * 4 + 3] > 100) valid.push(i)
  const data = new Float32Array(lib.count * 4)
  for (let i = 0; i < lib.count; i++) data[i * 4 + 3] = -1
  if (!valid.length) return data
  for (let i = 0; i < lib.shapeCount; i++) {
    const k = valid[(rand() * valid.length) | 0]
    const sx = box.left + ((k % c.width) + rand()) / scale
    const sy = box.top + (((k / c.width) | 0) + rand()) / scale
    data[i * 4] = (sx / vw) * 2 * halfW - halfW
    data[i * 4 + 1] = halfH - (sy / vh) * 2 * halfH
    data[i * 4 + 2] = (rand() - 0.5) * 0.02
    data[i * 4 + 3] = 1
  }
  return data
}
