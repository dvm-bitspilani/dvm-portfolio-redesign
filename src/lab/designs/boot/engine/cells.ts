import { FACING, gi, INNER, OUTER, type Matcher } from './glyphs'

const RAMP = Array.from(' .:-=+*#%@').map(gi)

/**
 * Converts a luminance raster (cols*sx × rows*sy pixels, values ~0..1) into
 * glyph indices + tones using shape-vector matching with directional contrast.
 */
export interface CellOptions {
  /** Exponent pushing a sample down when a neighbour it faces is brighter. */
  edge?: number
  /** Exponent applied within the cell against its own peak. */
  contrast?: number
  /** Multiplies all samples before matching. */
  gain?: number
  /** Cells whose 16 samples vary less than this use a tone ramp instead of shape search. */
  flat?: number
  /** Treat out-of-raster samples as edge-clamped instead of black (images). */
  clamp?: boolean
}

export class CellSampler {
  private sat = new Float64Array(1)
  private w = 0
  private h = 0
  private v = new Float32Array(6)
  private e = new Float32Array(10)
  private clampEdges = false

  /** Build the summed-area table for a raster. */
  load(lum: Float32Array, w: number, h: number) {
    const W = w + 1
    if (this.sat.length < W * (h + 1)) this.sat = new Float64Array(W * (h + 1))
    const sat = this.sat
    this.w = w
    this.h = h
    for (let x = 0; x <= w; x++) sat[x] = 0
    for (let y = 1; y <= h; y++) {
      let row = 0
      sat[y * W] = 0
      const li = (y - 1) * w
      for (let x = 1; x <= w; x++) {
        row += lum[li + x - 1]
        sat[y * W + x] = sat[(y - 1) * W + x] + row
      }
    }
  }

  /** Average over a box centred at (px, py) with half-sizes (hx, hy); outside = 0. */
  private box(px: number, py: number, hx: number, hy: number): number {
    const w = this.w
    const h = this.h
    let x0 = Math.round(px - hx)
    let x1 = Math.round(px + hx)
    let y0 = Math.round(py - hy)
    let y1 = Math.round(py + hy)
    if (x1 <= x0) x1 = x0 + 1
    if (y1 <= y0) y1 = y0 + 1
    let area = (x1 - x0) * (y1 - y0)
    if (this.clampEdges) {
      if (x0 >= w) x0 = w - 1
      if (y0 >= h) y0 = h - 1
      if (x1 <= 0) x1 = 1
      if (y1 <= 0) y1 = 1
    }
    if (x0 < 0) x0 = 0
    if (y0 < 0) y0 = 0
    if (x1 > w) x1 = w
    if (y1 > h) y1 = h
    if (x1 <= x0 || y1 <= y0) return 0
    if (this.clampEdges) area = (x1 - x0) * (y1 - y0)
    const W = w + 1
    const s = this.sat
    return (s[y1 * W + x1] - s[y0 * W + x1] - s[y1 * W + x0] + s[y0 * W + x0]) / area
  }

  /**
   * Sample cells [c0..c1) × [r0..r1) of the loaded raster (cell size sx × sy px)
   * and write glyph + tone (0..255) through the callback.
   */
  run(
    cols: number,
    rows: number,
    sx: number,
    sy: number,
    matcher: Matcher,
    out: (cx: number, cy: number, glyph: number, tone: number) => void,
    opts: CellOptions = {},
  ) {
    const edge = opts.edge ?? 2.2
    const contrast = opts.contrast ?? 1.5
    const gain = opts.gain ?? 1
    const flat = opts.flat ?? 0
    this.clampEdges = !!opts.clamp
    const hx = Math.max(0.75, sx * 0.24)
    const hy = Math.max(0.75, sy * 0.15)
    const v = this.v
    const e = this.e
    for (let cy = 0; cy < rows; cy++) {
      for (let cx = 0; cx < cols; cx++) {
        const bx = cx * sx
        const by = cy * sy
        // quick reject: whole 3x3 neighbourhood dark
        const coarse = this.box(bx + sx * 0.5, by + sy * 0.5, sx * 1.5, sy * 1.5)
        if (coarse < 0.004) {
          out(cx, cy, 0, 0)
          continue
        }
        let peak = 0
        let sum = 0
        for (let i = 0; i < 6; i++) {
          const val = Math.min(1, this.box(bx + INNER[i][0] * sx, by + INNER[i][1] * sy, hx, hy) * gain)
          v[i] = val
          sum += val
        }
        for (let i = 0; i < 10; i++) e[i] = Math.min(1, this.box(bx + OUTER[i][0] * sx, by + OUTER[i][1] * sy, hx, hy) * gain)
        if (flat > 0) {
          let lo = 1
          let hi = 0
          for (let i = 0; i < 6; i++) {
            if (v[i] < lo) lo = v[i]
            if (v[i] > hi) hi = v[i]
          }
          for (let i = 0; i < 10; i++) {
            if (e[i] < lo) lo = e[i]
            if (e[i] > hi) hi = e[i]
          }
          if (hi - lo < flat) {
            const m = sum / 6
            const k = Math.min(RAMP.length - 1, Math.floor(m * RAMP.length * 1.02))
            out(cx, cy, RAMP[k], Math.min(255, m * 255))
            continue
          }
        }
        for (let i = 0; i < 6; i++) {
          const f = FACING[i]
          let ext = 0
          for (let k = 0; k < f.length; k++) if (e[f[k]] > ext) ext = e[f[k]]
          const p = Math.max(v[i], ext)
          if (p > 1e-4) v[i] = Math.pow(v[i] / p, edge) * p
          if (v[i] > peak) peak = v[i]
        }
        if (peak > 1e-4) for (let i = 0; i < 6; i++) v[i] = Math.pow(v[i] / peak, contrast) * peak
        const g = matcher.match(v)
        out(cx, cy, g, Math.min(255, (sum / 6) * 255))
      }
    }
  }
}
