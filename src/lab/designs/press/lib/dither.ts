/**
 * Canvas 2D 1-bit dithering for the PRESS design.
 *
 * Each image is rasterised once into a small buffer (one buffer pixel = one
 * printed dot), dithered with Atkinson / Floyd–Steinberg / Bayer, and cached
 * as a "plate": the 1-bit mask plus the original colour pixels. A DitherSurface
 * then composites the plate into a canvas every frame it needs to: dots where
 * the plate is printed, full colour inside a reveal circle whose edge is
 * itself an ordered (Bayer) dither, and a red "roller" line while printing.
 */

export type DitherAlgo = 'atkinson' | 'floyd' | 'bayer'

export interface Plate {
  w: number
  h: number
  /** RGBA colour pixels, w*h*4. */
  color: Uint8ClampedArray
  /** 1 = paper (lit dot), 0 = ink (transparent). */
  bits: Uint8Array
}

/** 8×8 Bayer matrix, normalised to (0,1). */
export const BAYER8 = (() => {
  const m = [
    0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57,
    25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
  ]
  return Float32Array.from(m, (v) => (v + 0.5) / 64)
})()

const imageCache = new Map<string, Promise<HTMLImageElement>>()
export function loadImage(src: string): Promise<HTMLImageElement> {
  let p = imageCache.get(src)
  if (!p) {
    p = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.decoding = 'async'
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error(`press: failed to load ${src}`))
      img.src = src
    })
    imageCache.set(src, p)
    p.catch(() => imageCache.delete(src))
  }
  return p
}

let scratch: HTMLCanvasElement | null = null
function scratchCtx(w: number, h: number) {
  if (!scratch) scratch = document.createElement('canvas')
  if (scratch.width !== w) scratch.width = w
  if (scratch.height !== h) scratch.height = h
  return scratch.getContext('2d', { willReadFrequently: true })!
}

export interface PlateOptions {
  algo?: DitherAlgo
  /** Vertical focus for cover-fit cropping, 0 = top, 0.5 = centre. */
  focusY?: number
  contrast?: number
  brightness?: number
}

const plateCache = new Map<string, Plate>()
const MAX_PLATES = 80

export async function getPlate(src: string, w: number, h: number, opts: PlateOptions = {}): Promise<Plate> {
  const { algo = 'atkinson', focusY = 0.5, contrast = 1.25, brightness = 0.02 } = opts
  const key = `${src}|${w}x${h}|${algo}|${focusY}|${contrast}|${brightness}`
  const hit = plateCache.get(key)
  if (hit) return hit
  const img = await loadImage(src)
  const ctx = scratchCtx(w, h)
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, w, h)
  // object-fit: cover
  const ir = img.naturalWidth / img.naturalHeight
  const r = w / h
  let sw = img.naturalWidth
  let sh = img.naturalHeight
  if (ir > r) sw = sh * r
  else sh = sw / r
  const sx = (img.naturalWidth - sw) / 2
  const sy = (img.naturalHeight - sh) * focusY
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h)
  const color = ctx.getImageData(0, 0, w, h).data
  const n = w * h
  const lum = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const o = i * 4
    const l = (0.2126 * color[o] + 0.7152 * color[o + 1] + 0.0722 * color[o + 2]) / 255
    lum[i] = (l - 0.5) * contrast + 0.5 + brightness
  }
  const bits = algo === 'bayer' ? bayer(lum, w, h) : algo === 'floyd' ? floyd(lum, w, h) : atkinson(lum, w, h)
  const plate: Plate = { w, h, color: new Uint8ClampedArray(color), bits }
  if (plateCache.size > MAX_PLATES) plateCache.delete(plateCache.keys().next().value!)
  plateCache.set(key, plate)
  return plate
}

function atkinson(l: Float32Array, w: number, h: number) {
  const out = new Uint8Array(w * h)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      const v = l[i]
      const b = v > 0.5 ? 1 : 0
      out[i] = b
      const e = (v - b) / 8
      if (x + 1 < w) l[i + 1] += e
      if (x + 2 < w) l[i + 2] += e
      if (y + 1 < h) {
        if (x > 0) l[i + w - 1] += e
        l[i + w] += e
        if (x + 1 < w) l[i + w + 1] += e
      }
      if (y + 2 < h) l[i + 2 * w] += e
    }
  return out
}

function floyd(l: Float32Array, w: number, h: number) {
  const out = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    // serpentine scan avoids the diagonal "worm" artefacts
    const ltr = (y & 1) === 0
    for (let k = 0; k < w; k++) {
      const x = ltr ? k : w - 1 - k
      const dir = ltr ? 1 : -1
      const i = y * w + x
      const v = l[i]
      const b = v > 0.5 ? 1 : 0
      out[i] = b
      const e = v - b
      const xn = x + dir
      if (xn >= 0 && xn < w) l[i + dir] += (e * 7) / 16
      if (y + 1 < h) {
        const xp = x - dir
        if (xp >= 0 && xp < w) l[i + w - dir] += (e * 3) / 16
        l[i + w] += (e * 5) / 16
        if (xn >= 0 && xn < w) l[i + w + dir] += e / 16
      }
    }
  }
  return out
}

function bayer(l: Float32Array, w: number, h: number) {
  const out = new Uint8Array(w * h)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      out[i] = l[i] > BAYER8[(y & 7) * 8 + (x & 7)] ? 1 : 0
    }
  return out
}

export type RGB = readonly [number, number, number]
export const INK = {
  bone: [236, 230, 218] as RGB,
  red: [255, 46, 46] as RGB,
}
const ROLLER: RGB = [255, 46, 46]

/**
 * Owns one canvas whose backing store is exactly one pixel per printed dot.
 * Scale it up with CSS (image-rendering: pixelated).
 */
export class DitherSurface {
  readonly canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private img: ImageData | null = null
  w = 0
  h = 0
  plate: Plate | null = null
  ink: RGB
  private last = { x0: 0, y0: 0, x1: 0, y1: 0 }

  constructor(canvas: HTMLCanvasElement, ink: RGB = INK.bone) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.ink = ink
  }

  resize(w: number, h: number) {
    if (w === this.w && h === this.h) return
    this.w = this.canvas.width = Math.max(1, w)
    this.h = this.canvas.height = Math.max(1, h)
    this.img = this.ctx.createImageData(this.w, this.h)
    this.last = { x0: 0, y0: 0, x1: this.w, y1: this.h }
  }

  /**
   * Composite the plate. (cx, cy, r) is the colour reveal circle in dot units,
   * `feather` the width of the dithered edge, `printRow` how many rows have
   * been printed so far (rows beyond it are blank; Infinity = all).
   * Only the dirty rectangle (union of last and current circle) is rewritten
   * unless `full` is set.
   */
  render(cx: number, cy: number, r: number, feather: number, printRow = Infinity, full = false) {
    const plate = this.plate
    const img = this.img
    if (!plate || !img || plate.w !== this.w || plate.h !== this.h) return
    const { w, h } = this
    const reach = r + feather
    let x0 = 0,
      y0 = 0,
      x1 = w,
      y1 = h
    if (!full && printRow === Infinity) {
      const c = reach > 0 ? { x0: Math.floor(cx - reach), y0: Math.floor(cy - reach), x1: Math.ceil(cx + reach), y1: Math.ceil(cy + reach) } : { x0: 0, y0: 0, x1: 0, y1: 0 }
      x0 = Math.max(0, Math.min(c.x0, this.last.x0))
      y0 = Math.max(0, Math.min(c.y0, this.last.y0))
      x1 = Math.min(w, Math.max(c.x1, this.last.x1))
      y1 = Math.min(h, Math.max(c.y1, this.last.y1))
      if (c.x1 <= c.x0) {
        // nothing revealed now: only restore the previous area
        x0 = Math.max(0, this.last.x0)
        y0 = Math.max(0, this.last.y0)
        x1 = Math.min(w, this.last.x1)
        y1 = Math.min(h, this.last.y1)
      }
      this.last = c
    } else {
      this.last = { x0: 0, y0: 0, x1: w, y1: h }
    }
    if (x1 <= x0 || y1 <= y0) return
    const out = img.data
    const { color, bits } = plate
    const [ir, ig, ib] = this.ink
    const inv = feather > 0 ? 1 / feather : 1e6
    const r2out = reach * reach
    for (let y = y0; y < y1; y++) {
      const dy = y - cy
      const brow = (y & 7) * 8
      const rowState = y > printRow ? 0 : y > printRow - 2 ? 2 : 1
      for (let x = x0; x < x1; x++) {
        const i = y * w + x
        const o = i * 4
        if (rowState === 0) {
          out[o + 3] = 0
          continue
        }
        if (rowState === 2) {
          out[o] = ROLLER[0]
          out[o + 1] = ROLLER[1]
          out[o + 2] = ROLLER[2]
          out[o + 3] = 255
          continue
        }
        const dx = x - cx
        const d2 = dx * dx + dy * dy
        if (reach > 0 && d2 < r2out) {
          const m = (r - Math.sqrt(d2)) * inv + 0.5
          if (m > BAYER8[brow + (x & 7)]) {
            out[o] = color[o]
            out[o + 1] = color[o + 1]
            out[o + 2] = color[o + 2]
            out[o + 3] = 255
            continue
          }
        }
        if (bits[i]) {
          out[o] = ir
          out[o + 1] = ig
          out[o + 2] = ib
          out[o + 3] = 255
        } else out[o + 3] = 0
      }
    }
    this.ctx.putImageData(img, 0, 0, x0, y0, x1 - x0, y1 - y0)
  }
}
