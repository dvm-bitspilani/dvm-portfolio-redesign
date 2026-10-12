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

export type ShapeMaker = (n: number) => ShapeData | Promise<ShapeData>

export const DUST = 0.1
const MAX_CACHED = 12

const rand = Math.random

function makeTexture(data: Float32Array, N: number) {
  const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat, THREE.FloatType)
  t.minFilter = t.magFilter = THREE.NearestFilter
  t.generateMipmaps = false
  t.colorSpace = THREE.NoColorSpace
  t.needsUpdate = true
  return t
}

const yieldTask = () => new Promise<void>((r) => setTimeout(r, 0))

export class TargetLibrary {
  readonly N: number
  readonly count: number
  readonly shapeCount: number
  readonly dust: Float32Array
  private cache = new Map<string, Promise<Target>>()
  private resolved = new Map<string, Target>()
  private order: string[] = []
  /** Keys currently on stage (never evicted). */
  inUse: () => Set<string> = () => new Set()
  private queue: Promise<unknown> = Promise.resolve()
  private disposed = false

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

  peek(key: string): Target | undefined {
    const t = this.resolved.get(key)
    if (t) this.touch(key)
    return t
  }

  /** Get (or build once) a target. Builds are serialised so they never stack up in one frame. */
  get(key: string, make: ShapeMaker): Promise<Target> {
    const hit = this.cache.get(key)
    if (hit) {
      this.touch(key)
      return hit
    }
    const p: Promise<Target> = this.queue.then(yieldTask).then(async () => {
      if (this.disposed) throw new Error('disposed')
      const shape = await make(this.shapeCount)
      if (this.disposed) throw new Error('disposed')
      const t: Target = { key, tex: makeTexture(this.pack(shape), this.N), aspect: shape.aspect }
      this.resolved.set(key, t)
      this.evict()
      return t
    })
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
    const used = this.inUse()
    const evictable = this.order.filter((k) => !used.has(k) && this.resolved.has(k))
    while (this.resolved.size > MAX_CACHED && evictable.length) {
      const k = evictable.shift()!
      this.resolved.get(k)?.tex.dispose()
      this.resolved.delete(k)
      this.cache.delete(k)
      this.order.splice(this.order.indexOf(k), 1)
    }
  }

  dispose() {
    this.disposed = true
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
  const g = () => (rand() + rand() + rand() - 1.5) / 1.5
  for (let i = 0; i < n; i++) {
    const outer = rand() < 0.15
    const a = rand() * Math.PI * 2
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

/** A soft, clumpy nebula: a few gaussian lobes threaded with faint filaments. */
export function cloudShape(n: number): ShapeData {
  const pts = new Float32Array(n * 4)
  const lobes: [number, number, number, number][] = []
  for (let i = 0; i < 6; i++) lobes.push([(rand() - 0.5) * 1.3, (rand() - 0.5) * 0.55, (rand() - 0.5) * 0.4, 0.1 + rand() * 0.16])
  const gauss = () => {
    const u = Math.max(rand(), 1e-6)
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand())
  }
  for (let i = 0; i < n; i++) {
    const o = i * 4
    if (rand() < 0.22) {
      // filament between two lobes
      const a = lobes[(rand() * lobes.length) | 0], b = lobes[(rand() * lobes.length) | 0]
      const t = rand()
      pts[o] = a[0] + (b[0] - a[0]) * t + gauss() * 0.025
      pts[o + 1] = a[1] + (b[1] - a[1]) * t + gauss() * 0.025 + Math.sin(t * Math.PI) * 0.08
      pts[o + 2] = a[2] + (b[2] - a[2]) * t + gauss() * 0.04
      pts[o + 3] = 0.3 + 0.3 * rand()
    } else {
      const l = lobes[(rand() * lobes.length) | 0]
      pts[o] = l[0] + gauss() * l[3] * 1.4
      pts[o + 1] = l[1] + gauss() * l[3]
      pts[o + 2] = l[2] + gauss() * l[3]
      pts[o + 3] = 0.35 + 0.55 * Math.pow(rand(), 2)
    }
  }
  return { pts, aspect: 1.8 }
}

/** Arbitrary user points (xyz or xyzw), normalised to 1 unit tall and resampled to n. */
export function pointsShape(src: Float32Array, n: number, stride: 3 | 4 = 3): ShapeData {
  const m = Math.floor(src.length / stride)
  const pts = new Float32Array(n * 4)
  if (!m) return { pts, aspect: 1 }
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity
  for (let i = 0; i < m; i++) {
    const x = src[i * stride], y = src[i * stride + 1], z = src[i * stride + 2]
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
    if (z < minZ) minZ = z
    if (z > maxZ) maxZ = z
  }
  const h = Math.max(maxY - minY, 1e-6)
  const w = Math.max(maxX - minX, 1e-6)
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2
  const jitter = m < n ? 0.004 : 0
  for (let k = 0; k < n; k++) {
    const i = m >= n ? Math.floor((k * m) / n) : (rand() * m) | 0
    const o = k * 4
    pts[o] = (src[i * stride] - cx) / h + (rand() - 0.5) * jitter
    pts[o + 1] = (src[i * stride + 1] - cy) / h + (rand() - 0.5) * jitter
    pts[o + 2] = (src[i * stride + 2] - cz) / h + (rand() - 0.5) * jitter
    pts[o + 3] = stride === 4 ? src[i * 4 + 3] : 0.45 + 0.5 * rand()
  }
  return { pts, aspect: w / h }
}

interface CanvasSampleOpts {
  luminance?: boolean
  gamma?: number
  depth?: number
  relief?: number
  fullFrame?: boolean
  vignette?: number
  oval?: boolean
  floor?: number
  invert?: boolean | 'auto'
}

/** Weighted sample of canvas pixels → normalised points (1 unit tall, centred). */
export function sampleCanvas(canvas: HTMLCanvasElement, n: number, opts: CanvasSampleOpts = {}): ShapeData {
  const { luminance = false, gamma = 1, depth = 0.06, relief = 0, fullFrame = false, vignette = 0, oval = false, floor = 0.35, invert = false } = opts
  const w = canvas.width, h = canvas.height
  const px = canvas.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, w, h).data
  const weight = new Float32Array(w * h)
  if (luminance) {
    let flip = invert === true
    if (invert === 'auto') {
      // Light UIs (white pages) would fill the whole frame; sample their dark detail instead.
      let sum = 0
      for (let i = 0; i < w * h; i++) sum += (0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2]) / 255
      flip = sum / (w * h) > 0.55
    }
    let lo = Infinity, hi = -Infinity
    for (let i = 0; i < w * h; i++) {
      let l = (0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2]) / 255
      if (flip) l = 1 - l
      l *= px[i * 4 + 3] / 255
      weight[i] = l
      if (l < lo) lo = l
      if (l > hi) hi = l
    }
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
  if (total <= 0) return { pts, aspect: bw / bh }
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
  c.width = Math.max(1, Math.round(w))
  c.height = Math.max(1, Math.round(h))
  return c
}

type LS = CanvasRenderingContext2D & { letterSpacing: string }

export const DEFAULT_FONT = '"Stretch Pro", "Orbitron", sans-serif'

/** Draw lines of text centred and sample them. */
export async function textShape(text: string, n: number, opts: { font?: string; weight?: number | string; tracking?: number } = {}): Promise<ShapeData> {
  const family = opts.font ?? DEFAULT_FONT
  const weight = opts.weight ?? 400
  const size = 260
  // Non-zero tracking also disables optional ligatures (Stretch Pro turns "EE"/"ff" into glyph joins).
  const tracking = opts.tracking ?? 6
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  if (!lines.length) lines.push(' ')
  await document.fonts.load(`${weight} ${size}px ${family}`, lines.join('')).catch(() => undefined)
  const measure = canvas(4, 4).getContext('2d')! as LS
  measure.font = `${weight} ${size}px ${family}`
  measure.letterSpacing = `${tracking}px`
  const widest = Math.max(...lines.map((l) => measure.measureText(l).width))
  const lineH = size * 1.08
  const W = Math.min(4096, widest + size * 0.6)
  const H = lineH * lines.length + size * 0.4
  // Keep the sampling canvas a sensible size regardless of text length.
  const k = Math.min(1, 2400 / W)
  const c = canvas(W * k, H * k)
  const ctx = c.getContext('2d', { willReadFrequently: true })! as LS
  ctx.scale(k, k)
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `${weight} ${size}px ${family}`
  ctx.letterSpacing = `${tracking}px`
  lines.forEach((l, i) => ctx.fillText(l, W / 2, size * 0.2 + lineH * (i + 0.5)))
  return sampleCanvas(c, n, { depth: 0.08 })
}

async function loadImage(url: string) {
  const img = new Image()
  img.decoding = 'async'
  try {
    if (new URL(url, location.href).origin !== location.origin) img.crossOrigin = 'anonymous'
  } catch {
    /* relative URL */
  }
  img.src = url
  await img.decode()
  return img
}

export interface ImageShapeOpts {
  fit?: 'contain' | 'cover' | 'portrait'
  /** Width / height of the area to cover (only used for fit: 'cover'). */
  coverAspect?: number
  /** Sample dark areas instead of bright ones; 'auto' flips light images (default). */
  invert?: boolean | 'auto'
  /** Density contrast exponent (default 1.5). */
  contrast?: number
}

/** Image → density field by luminance. */
export async function imageShape(url: string, n: number, opts: ImageShapeOpts = {}): Promise<ShapeData> {
  const img = await loadImage(url)
  const portrait = opts.fit === 'portrait'
  let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight
  if (opts.fit === 'cover' && opts.coverAspect) {
    const a = sw / sh
    if (a > opts.coverAspect) {
      sw = sh * opts.coverAspect
      sx = (img.naturalWidth - sw) / 2
    } else {
      sh = sw / opts.coverAspect
      sy = (img.naturalHeight - sh) / 2
    }
  }
  const W = portrait ? 220 : 340
  const H = Math.max(1, Math.round((W * sh) / sw))
  const c = canvas(W, H)
  const g = c.getContext('2d', { willReadFrequently: true })!
  g.drawImage(img, sx, sy, sw, sh, 0, 0, W, H)
  return sampleCanvas(c, n, {
    luminance: true,
    gamma: opts.contrast ?? (portrait ? 1.25 : 1.5),
    relief: portrait ? 0.16 : 0.12,
    depth: 0.015,
    fullFrame: true,
    vignette: portrait ? 0.45 : 0.06,
    oval: portrait,
    floor: 0.3,
    invert: opts.invert ?? 'auto',
  })
}
