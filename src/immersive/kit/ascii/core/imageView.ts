import { CellSampler } from './cells'
import { gi, type Matcher } from './glyphs'
import { F_HOT, type Grid } from './grid'

const SCRAMBLE = Array.from('#%&$@*+=<>/\\|?!;:').map(gi)

function hash(i: number) {
  const h = Math.sin(i * 127.1 + 311.7) * 43758.5453
  return h - Math.floor(h)
}

const cache = new Map<string, Promise<HTMLImageElement>>()
export function loadImage(src: string): Promise<HTMLImageElement> {
  let p = cache.get(src)
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image()
      img.decoding = 'async'
      if (/^https?:/.test(src) && !src.startsWith(location.origin)) img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = () => {
        cache.delete(src)
        reject(new Error(`AsciiImage: failed to load ${src}`))
      }
      img.src = src
    })
    cache.set(src, p)
  }
  return p
}

export interface ImageFit {
  fit: 'cover' | 'contain'
  /** vertical focus for cover crops (0 top .. 1 bottom) */
  focusY: number
  /** gamma after auto-levels (<1 brightens) */
  gamma: number
  /** negative: dark areas get the glyphs (for bright, light-background images) */
  invert?: boolean
}

/**
 * Any image → shape-matched ASCII (auto-levels, edge-clamped sampling, tone ramp for flat
 * areas). Ported from the lab asciiImage.ts; adds the cursor density boost.
 */
export class ImageView {
  img: HTMLImageElement | null = null
  cols = 0
  rows = 0
  glyph = new Uint8Array(0)
  tone = new Uint8Array(0)
  private sx = 3
  private sy = 7
  private base = new Float32Array(0)
  private work = new Float32Array(0)
  private W = 0
  private H = 0
  private sampler = new CellSampler()
  private canvas: HTMLCanvasElement | null = null
  private dirty = true
  private rastered = false
  fit: ImageFit = { fit: 'cover', focusY: 0.4, gamma: 0.9 }
  private outCb = (x: number, y: number, g: number, t: number) => {
    const k = y * this.cols + x
    this.glyph[k] = g
    this.tone[k] = t
  }

  setImage(img: HTMLImageElement | null) {
    this.img = img
    this.rastered = false
    this.dirty = true
  }

  setFit(f: ImageFit) {
    if (f.fit === this.fit.fit && f.focusY === this.fit.focusY && f.gamma === this.fit.gamma && !!f.invert === !!this.fit.invert) return
    this.fit = f
    this.rastered = false
    this.dirty = true
  }

  setRegion(cols: number, rows: number, fcw: number, fch: number) {
    const sy = 7
    const sx = Math.max(2, Math.round((sy * fcw) / fch))
    if (cols === this.cols && rows === this.rows && sx === this.sx) return
    this.cols = cols
    this.rows = rows
    this.sx = sx
    this.sy = sy
    this.glyph = new Uint8Array(cols * rows)
    this.tone = new Uint8Array(cols * rows)
    this.rastered = false
    this.dirty = true
  }

  invalidate() {
    this.dirty = true
  }

  private rasterise() {
    const img = this.img
    if (!img || !this.cols) return
    const W = this.cols * this.sx
    const H = this.rows * this.sy
    this.W = W
    this.H = H
    if (!this.canvas) this.canvas = document.createElement('canvas')
    const c = this.canvas
    c.width = W
    c.height = H
    const ctx = c.getContext('2d', { willReadFrequently: true })!
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, W, H)
    // destination pixels are sx × sy per cell, displayed as fcw × fch; sx was chosen to keep them square
    const ir = img.naturalWidth / Math.max(1, img.naturalHeight)
    const dr = W / H
    let dw: number
    let dh: number
    if (this.fit.fit === 'cover' ? ir > dr : ir < dr) {
      dh = H
      dw = H * ir
    } else {
      dw = W
      dh = W / ir
    }
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, (W - dw) / 2, (H - dh) * this.fit.focusY, dw, dh)
    let data: Uint8ClampedArray
    try {
      data = ctx.getImageData(0, 0, W, H).data
    } catch {
      // tainted (cross-origin without CORS): nothing we can read
      return
    }
    if (this.base.length !== W * H) {
      this.base = new Float32Array(W * H)
      this.work = new Float32Array(W * H)
    }
    const lum = this.base
    const hist = new Uint32Array(256)
    for (let i = 0, j = 0; i < lum.length; i++, j += 4) {
      const l = Math.round(0.2126 * data[j] + 0.7152 * data[j + 1] + 0.0722 * data[j + 2])
      lum[i] = l
      hist[l]++
    }
    const lo = percentile(hist, lum.length * 0.02)
    const hi = Math.max(lo + 1, percentile(hist, lum.length * 0.99))
    const g = this.fit.gamma
    const inv = !!this.fit.invert
    for (let i = 0; i < lum.length; i++) {
      const v = Math.min(1, Math.max(0, (lum[i] - lo) / (hi - lo)))
      lum[i] = Math.pow(inv ? 1 - v : v, g)
    }
    this.rastered = true
  }

  /** Re-match glyphs when dirty. lightX/Y in region cell coords (NaN = none). */
  convert(matcher: Matcher, lightX: number, lightY: number, boost: number) {
    if (!this.dirty || !this.img) return
    if (!this.rastered) this.rasterise()
    if (!this.rastered) return
    this.dirty = false
    let src = this.base
    if (Number.isFinite(lightX) && boost > 0) {
      src = this.work
      src.set(this.base)
      const lx = lightX * this.sx
      const ly = lightY * this.sy
      const R = this.H * 0.28
      const ax = 1
      const x0 = Math.max(0, Math.floor(lx - R * ax))
      const x1 = Math.min(this.W - 1, Math.ceil(lx + R * ax))
      const y0 = Math.max(0, Math.floor(ly - R))
      const y1 = Math.min(this.H - 1, Math.ceil(ly + R))
      const inv = 1 / (R * R)
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) {
          const dx = x - lx
          const dy = y - ly
          const d2 = (dx * dx + dy * dy) * inv
          if (d2 >= 1) continue
          const i = y * this.W + x
          src[i] = Math.min(1, src[i] * (1 + boost * (1 - d2) * (1 - d2)) + 0.05 * boost * (1 - d2))
        }
    }
    this.sampler.load(src, this.W, this.H)
    this.sampler.run(this.cols, this.rows, this.sx, this.sy, matcher, this.outCb, { edge: 1.6, contrast: 1.3, gain: 1.05, flat: 0.07, clamp: true })
  }

  /** p: reveal progress 0..1 ('scan' rows, 'decode' scramble-in, 'none'). */
  blit(grid: Grid, x0: number, y0: number, p: number, mode: 'scan' | 'decode' | 'none', time: number, minB = 60, maxB = 240) {
    const cols = this.cols
    const tq = Math.floor(time * 20)
    const scanRow = p * 1.1 * this.rows
    for (let y = 0; y < this.rows; y++) {
      if (mode === 'scan' && p < 1 && y > scanRow) break
      const lead = mode === 'scan' && p < 1 && y > scanRow - 1.5
      for (let x = 0; x < cols; x++) {
        const k = y * cols + x
        let g = this.glyph[k]
        if (!g) continue
        let b = minB + ((maxB - minB) * this.tone[k]) / 255
        let f = 0
        if (lead) {
          b = 255
          f = F_HOT
        } else if (mode === 'decode' && p < 1) {
          const th = hash(k)
          if (p * 1.25 < th) continue
          if (p * 1.25 < th + 0.22) {
            g = SCRAMBLE[(k * 7 + tq) % SCRAMBLE.length]
            b = 230
            f = F_HOT
          }
        }
        grid.set(x0 + x, y0 + y, g, b, f)
      }
    }
  }
}

function percentile(hist: Uint32Array, target: number) {
  let acc = 0
  for (let i = 0; i < 256; i++) {
    acc += hist[i]
    if (acc >= target) return i
  }
  return 255
}
