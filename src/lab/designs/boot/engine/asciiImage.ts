import { CellSampler } from './cells'
import type { Matcher } from './glyphs'
import type { Grid } from './grid'

/** Image → shape-matched ASCII, cached per (url, size). */
export interface AsciiImg {
  cols: number
  rows: number
  glyph: Uint8Array
  tone: Uint8Array
}

const images = new Map<string, HTMLImageElement | 'error'>()
const pending = new Set<string>()
const results = new Map<string, AsciiImg>()
const sampler = new CellSampler()
let work: HTMLCanvasElement | null = null
let budget = 2

/** Call once per frame: limits how many conversions run per frame. */
export function asciiBeginFrame() {
  budget = 2
}

function loadImage(url: string) {
  if (images.has(url) || pending.has(url)) return
  pending.add(url)
  const img = new Image()
  img.decoding = 'async'
  if (/^https?:/.test(url)) img.crossOrigin = 'anonymous'
  img.onload = () => {
    pending.delete(url)
    images.set(url, img)
  }
  img.onerror = () => {
    pending.delete(url)
    images.set(url, 'error')
  }
  img.src = url
}

export interface AsciiOpts {
  /** 'cover' crops to fill, 'contain' letterboxes. */
  fit?: 'cover' | 'contain'
  /** vertical focus for cover crops (0 top .. 1 bottom) */
  focusY?: number
  /** gamma applied after auto-levels (<1 brightens) */
  gamma?: number
}

/**
 * Returns the ASCII conversion, or null while the image is loading,
 * or 'error' if it failed. Conversion is synchronous once the image is loaded.
 */
export function getAscii(url: string, cols: number, rows: number, sx: number, sy: number, matcher: Matcher, opts: AsciiOpts = {}): AsciiImg | null | 'error' {
  if (cols <= 0 || rows <= 0) return null
  const key = `${url}|${cols}|${rows}|${sx}|${sy}|${opts.fit ?? 'cover'}|${opts.focusY ?? ''}|${opts.gamma ?? ''}`
  const hit = results.get(key)
  if (hit) return hit
  const img = images.get(url)
  if (img === 'error') return 'error'
  if (!img) {
    loadImage(url)
    return null
  }
  if (budget <= 0) return null
  budget--
  const W = cols * sx
  const H = rows * sy
  if (!work) work = document.createElement('canvas')
  work.width = W
  work.height = H
  const ctx = work.getContext('2d', { willReadFrequently: true })!
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, W, H)
  // the destination pixels are not square: a cell is (sx px) wide and (sy px) tall
  // but displays as cellW × cellH. We assume caller picked sx/sy matching the cell aspect.
  const ir = img.naturalWidth / img.naturalHeight
  const dr = W / H
  let dw: number
  let dh: number
  if ((opts.fit ?? 'cover') === 'cover' ? ir > dr : ir < dr) {
    dh = H
    dw = H * ir
  } else {
    dw = W
    dh = W / ir
  }
  const fy = opts.focusY ?? 0.35
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, (W - dw) / 2, (H - dh) * fy, dw, dh)
  const data = ctx.getImageData(0, 0, W, H).data
  const lum = new Float32Array(W * H)
  const hist = new Uint32Array(256)
  for (let i = 0, j = 0; i < lum.length; i++, j += 4) {
    const l = Math.round(0.2126 * data[j] + 0.7152 * data[j + 1] + 0.0722 * data[j + 2])
    lum[i] = l
    hist[l]++
  }
  // auto-levels on 2% / 99% percentiles
  const lo = percentile(hist, lum.length * 0.02)
  const hi = Math.max(lo + 1, percentile(hist, lum.length * 0.99))
  const g = opts.gamma ?? 0.9
  for (let i = 0; i < lum.length; i++) {
    const v = Math.min(1, Math.max(0, (lum[i] - lo) / (hi - lo)))
    lum[i] = Math.pow(v, g)
  }
  sampler.load(lum, W, H)
  const res: AsciiImg = { cols, rows, glyph: new Uint8Array(cols * rows), tone: new Uint8Array(cols * rows) }
  sampler.run(
    cols,
    rows,
    sx,
    sy,
    matcher,
    (cx, cy, gl, tone) => {
      res.glyph[cy * cols + cx] = gl
      res.tone[cy * cols + cx] = tone
    },
    { edge: 1.6, contrast: 1.3, gain: 1.05, flat: 0.07, clamp: true },
  )
  results.set(key, res)
  return res
}

function percentile(hist: Uint32Array, target: number) {
  let acc = 0
  for (let i = 0; i < 256; i++) {
    acc += hist[i]
    if (acc >= target) return i
  }
  return 255
}

/** Blit an ASCII image into a grid at (x, y), with brightness scaled from tone. */
export function blitAscii(grid: Grid, a: AsciiImg, x: number, y: number, minB = 70, maxB = 235, reveal = 1) {
  for (let j = 0; j < a.rows; j++) {
    if (j / a.rows > reveal) break
    for (let i = 0; i < a.cols; i++) {
      const k = j * a.cols + i
      const g = a.glyph[k]
      if (!g) continue
      const b = minB + ((maxB - minB) * a.tone[k]) / 255
      grid.set(x + i, y + j, g, b)
    }
  }
}
