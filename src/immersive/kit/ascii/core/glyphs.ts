/**
 * Glyph set, atlas baking and per-glyph shape vectors.
 * Ported from the lab DVM://BOOT engine (dvm-hero-lab/src/designs/boot/engine/glyphs.ts),
 * parameterised by font family so every font gets its own shape table.
 *
 * Index 0..94 = printable ASCII (space .. ~). Extras after that are drawn
 * procedurally (box drawing, blocks, shapes) so lines join pixel-perfectly.
 */

const ASCII: string[] = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i))
const EXTRA = '─│┌┐└┘├┤┬┴┼═║╔╗╚╝╠╣█▀▄▌▐░▒▓●○■□▲▼►◄·°×…↑↓←→–—’‘“”é'
export const GLYPHS: string[] = [...ASCII, ...Array.from(EXTRA)]
export const ASCII_COUNT = 95

const INDEX = new Map<string, number>(GLYPHS.map((g, i) => [g, i]))
const QUESTION = 31

/** Glyph index for a single character (unknown → '?'). */
export function gi(ch: string): number {
  const v = INDEX.get(ch)
  return v === undefined ? QUESTION : v
}

export interface Atlas {
  canvas: HTMLCanvasElement
  cols: number
  cw: number
  ch: number
}

type Seg = 'L' | 'R' | 'U' | 'D'
const LIGHT: Record<string, Seg[]> = {
  '─': ['L', 'R'],
  '│': ['U', 'D'],
  '┌': ['R', 'D'],
  '┐': ['L', 'D'],
  '└': ['U', 'R'],
  '┘': ['U', 'L'],
  '├': ['U', 'D', 'R'],
  '┤': ['U', 'D', 'L'],
  '┬': ['L', 'R', 'D'],
  '┴': ['L', 'R', 'U'],
  '┼': ['L', 'R', 'U', 'D'],
}
// double corners: [horizontal dir (+1 right / -1 left), vertical dir (+1 down / -1 up)]
const DOUBLE_CORNER: Record<string, [number, number]> = {
  '╔': [1, 1],
  '╗': [-1, 1],
  '╚': [1, -1],
  '╝': [-1, -1],
}

/** Draws procedurally-defined glyphs. Returns false if the font should draw it. */
function drawSpecial(ctx: CanvasRenderingContext2D, g: string, x: number, y: number, w: number, h: number): boolean {
  const t = Math.max(1, Math.round(h / 14))
  const cx = x + Math.floor((w - t) / 2)
  const cy = y + Math.floor((h - t) / 2)
  const rect = (rx: number, ry: number, rw: number, rh: number) => {
    if (rw > 0 && rh > 0) ctx.fillRect(rx, ry, rw, rh)
  }
  const segs = LIGHT[g]
  if (segs) {
    for (const s of segs) {
      if (s === 'L') rect(x, cy, cx - x + t, t)
      if (s === 'R') rect(cx, cy, x + w - cx, t)
      if (s === 'U') rect(cx, y, t, cy - y + t)
      if (s === 'D') rect(cx, cy, t, y + h - cy)
    }
    return true
  }
  const gap = Math.max(1, Math.round(t * 1.25))
  if (g === '═') {
    rect(x, cy - gap, w, t)
    rect(x, cy + gap, w, t)
    return true
  }
  if (g === '║') {
    rect(cx - gap, y, t, h)
    rect(cx + gap, y, t, h)
    return true
  }
  if (g === '╠' || g === '╣') {
    const d = g === '╠' ? 1 : -1
    // full outer vertical, inner vertical split by the two horizontals
    rect(cx - d * gap, y, t, h)
    rect(cx + d * gap, y, t, cy - gap - y + t)
    rect(cx + d * gap, cy + gap, t, y + h - cy - gap)
    if (d > 0) {
      rect(cx + gap, cy - gap, x + w - cx - gap, t)
      rect(cx + gap, cy + gap, x + w - cx - gap, t)
    } else {
      rect(x, cy - gap, cx - gap - x + t, t)
      rect(x, cy + gap, cx - gap - x + t, t)
    }
    return true
  }
  const dc = DOUBLE_CORNER[g]
  if (dc) {
    const [hd, vd] = dc
    // outer and inner corner points
    const pts: [number, number][] = [
      [cx - hd * gap, cy - vd * gap],
      [cx + hd * gap, cy + vd * gap],
    ]
    for (const [px, py] of pts) {
      if (hd > 0) rect(px, py, x + w - px, t)
      else rect(x, py, px - x + t, t)
      if (vd > 0) rect(px, py, t, y + h - py)
      else rect(px, y, t, py - y + t)
    }
    return true
  }
  switch (g) {
    case '↑':
    case '↓':
    case '←':
    case '→': {
      const mx = x + w / 2
      const my = y + h / 2
      const s = Math.min(w, h) * 0.42
      ctx.beginPath()
      if (g === '↑' || g === '↓') {
        const d = g === '↑' ? -1 : 1
        rect(cx, Math.round(my - h * 0.28), t, Math.round(h * 0.56))
        ctx.moveTo(mx, my + d * h * 0.3)
        ctx.lineTo(mx - s, my + d * h * 0.3 - d * s)
        ctx.lineTo(mx + s, my + d * h * 0.3 - d * s)
      } else {
        const d = g === '←' ? -1 : 1
        rect(Math.round(mx - w * 0.4), cy, Math.round(w * 0.8), t)
        ctx.moveTo(mx + d * w * 0.45, my)
        ctx.lineTo(mx + d * w * 0.45 - d * s, my - s)
        ctx.lineTo(mx + d * w * 0.45 - d * s, my + s)
      }
      ctx.closePath()
      ctx.fill()
      return true
    }
    case '█':
      rect(x, y, w, h)
      return true
    case '▀':
      rect(x, y, w, Math.round(h / 2))
      return true
    case '▄':
      rect(x, y + Math.round(h / 2), w, h - Math.round(h / 2))
      return true
    case '▌':
      rect(x, y, Math.round(w / 2), h)
      return true
    case '▐':
      rect(x + Math.round(w / 2), y, w - Math.round(w / 2), h)
      return true
    case '░':
    case '▒':
    case '▓': {
      const p = Math.max(1, Math.round(h / 16))
      for (let j = 0; j * p < h; j++)
        for (let i = 0; i * p < w; i++) {
          let on: boolean
          if (g === '▒') on = (i + j) % 2 === 0
          else if (g === '░') on = i % 2 === 0 && j % 2 === 0
          else on = !(i % 2 === 0 && j % 2 === 0)
          if (on) rect(x + i * p, y + j * p, Math.min(p, w - i * p), Math.min(p, h - j * p))
        }
      return true
    }
    case '●':
    case '○': {
      const r = Math.min(w, h) * 0.34
      ctx.beginPath()
      ctx.arc(x + w / 2, y + h / 2, r, 0, Math.PI * 2)
      if (g === '●') ctx.fill()
      else {
        ctx.lineWidth = t
        ctx.strokeStyle = ctx.fillStyle
        ctx.stroke()
      }
      return true
    }
    case '■':
    case '□': {
      const s = Math.round(Math.min(w, h) * 0.66)
      const sx = x + Math.round((w - s) / 2)
      const sy = y + Math.round((h - s) / 2)
      if (g === '■') rect(sx, sy, s, s)
      else {
        rect(sx, sy, s, t)
        rect(sx, sy + s - t, s, t)
        rect(sx, sy, t, s)
        rect(sx + s - t, sy, t, s)
      }
      return true
    }
    case '▲':
    case '▼':
    case '►':
    case '◄': {
      const s = Math.min(w, h) * 0.7
      const mx = x + w / 2
      const my = y + h / 2
      ctx.beginPath()
      if (g === '▲') {
        ctx.moveTo(mx, my - s / 2)
        ctx.lineTo(mx + s / 2, my + s / 2)
        ctx.lineTo(mx - s / 2, my + s / 2)
      } else if (g === '▼') {
        ctx.moveTo(mx, my + s / 2)
        ctx.lineTo(mx + s / 2, my - s / 2)
        ctx.lineTo(mx - s / 2, my - s / 2)
      } else if (g === '►') {
        ctx.moveTo(mx + s / 2, my)
        ctx.lineTo(mx - s / 2, my - s / 2)
        ctx.lineTo(mx - s / 2, my + s / 2)
      } else {
        ctx.moveTo(mx - s / 2, my)
        ctx.lineTo(mx + s / 2, my - s / 2)
        ctx.lineTo(mx + s / 2, my + s / 2)
      }
      ctx.closePath()
      ctx.fill()
      return true
    }
  }
  return false
}

function setupFont(ctx: CanvasRenderingContext2D, family: string, fontPx: number) {
  ctx.font = `${fontPx}px "${family}", ui-monospace, monospace`
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
}

let measureCtx: CanvasRenderingContext2D | null = null
/** Advance width of the font at a given px size. */
export function measureAdvance(family: string, fontPx: number): number {
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d')!
  setupFont(measureCtx, family, fontPx)
  return measureCtx.measureText('M').width
}

function drawGlyphs(ctx: CanvasRenderingContext2D, family: string, list: string[], cols: number, cw: number, ch: number, fontPx: number) {
  setupFont(ctx, family, fontPx)
  const m = ctx.measureText('Mg')
  const asc = m.fontBoundingBoxAscent || fontPx * 0.8
  const desc = m.fontBoundingBoxDescent || fontPx * 0.2
  const base = Math.round((ch - (asc + desc)) / 2 + asc)
  ctx.fillStyle = '#fff'
  for (let i = 0; i < list.length; i++) {
    const g = list[i]
    const x = (i % cols) * cw
    const y = Math.floor(i / cols) * ch
    ctx.save()
    ctx.beginPath()
    ctx.rect(x, y, cw, ch)
    ctx.clip()
    if (!drawSpecial(ctx, g, x, y, cw, ch)) {
      const adv = ctx.measureText(g).width
      ctx.fillText(g, Math.round(x + (cw - adv) / 2), y + base)
    }
    ctx.restore()
  }
}

/**
 * Bake every glyph at exact device-pixel cell size.
 * `transparent` = white on transparent (2D renderer); otherwise white on black (WebGL reads .r).
 */
export function bakeAtlas(family: string, fontPx: number, cw: number, ch: number, transparent = false): Atlas {
  const cols = 16
  const rows = Math.ceil(GLYPHS.length / cols)
  const canvas = document.createElement('canvas')
  canvas.width = cols * cw
  canvas.height = rows * ch
  const ctx = canvas.getContext('2d')!
  if (!transparent) {
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  drawGlyphs(ctx, family, GLYPHS, cols, cw, ch, fontPx)
  return { canvas, cols, cw, ch }
}

/* ------------------------------------------------------------------ */
/* Shape vectors (after Lunardi, "Beyond the luminance ramp", Codrops) */
/* ------------------------------------------------------------------ */

/** Six sample points inside a cell (x right, y down). The right column rides higher. */
export const INNER: [number, number][] = [
  [0.28, 0.26],
  [0.72, 0.14],
  [0.28, 0.56],
  [0.72, 0.44],
  [0.28, 0.86],
  [0.72, 0.74],
]

/** Ten taps inside the neighbouring cells. */
export const OUTER: [number, number][] = [
  [-0.22, 0.18],
  [-0.22, 0.5],
  [-0.22, 0.82],
  [1.22, 0.18],
  [1.22, 0.5],
  [1.22, 0.82],
  [0.28, -0.14],
  [0.72, -0.14],
  [0.28, 1.14],
  [0.72, 1.14],
]
/** Which outer taps each inner sample "faces". */
export const FACING: number[][] = [
  [0, 1, 6],
  [3, 7],
  [1, 2],
  [3, 4],
  [2, 8],
  [5, 9],
]

/**
 * Nearest-glyph search over a 6-D shape vector, with a quantised cache
 * (3 bits per component → 262 144 entries). One instance per font family.
 */
export class Matcher {
  readonly vectors: Float32Array
  readonly count: number
  private cache = new Uint8Array(1 << 18).fill(255)
  private q0 = new Float32Array(6)

  constructor(family: string) {
    this.count = ASCII_COUNT
    this.vectors = computeShapeVectors(family, ASCII.slice(0, ASCII_COUNT))
  }

  /** v: 6 values in 0..1. Returns a glyph index (ASCII range). */
  match(v: Float32Array): number {
    let key = 0
    for (let i = 0; i < 6; i++) {
      let q = Math.floor(v[i] * 8)
      if (q > 7) q = 7
      else if (q < 0) q = 0
      key = (key << 3) | q
    }
    const hit = this.cache[key]
    if (hit !== 255) return hit
    const q0 = this.q0
    for (let i = 5, k = key; i >= 0; i--, k >>= 3) q0[i] = ((k & 7) + 0.5) / 8
    // all-dark bins map to space so the background stays clean
    let any = 0
    for (let i = 0; i < 6; i++) any = Math.max(any, q0[i])
    let best = 0
    if (any > 0.07) {
      let bestD = 1e9
      const vec = this.vectors
      for (let g = 0; g < this.count; g++) {
        let d = 0
        const o = g * 6
        for (let i = 0; i < 6; i++) {
          const diff = q0[i] - vec[o + i]
          d += diff * diff
        }
        if (d < bestD) {
          bestD = d
          best = g
        }
      }
    }
    this.cache[key] = best
    return best
  }
}

const matchers = new Map<string, Matcher>()
/** Shared matcher per font family (the shape table + cache are font specific). */
export function getMatcher(family: string): Matcher {
  let m = matchers.get(family)
  if (!m) {
    m = new Matcher(family)
    matchers.set(family, m)
  }
  return m
}

function computeShapeVectors(family: string, list: string[]): Float32Array {
  const cw = 24
  const ch = 48
  const fontPx = 48
  const cols = 16
  const rows = Math.ceil(list.length / cols)
  const c = document.createElement('canvas')
  c.width = cols * cw
  c.height = rows * ch
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, c.width, c.height)
  drawGlyphs(ctx, family, list, cols, cw, ch, fontPx)
  const img = ctx.getImageData(0, 0, c.width, c.height).data
  const out = new Float32Array(list.length * 6)
  const r = ch * 0.17
  for (let g = 0; g < list.length; g++) {
    const ox = (g % cols) * cw
    const oy = Math.floor(g / cols) * ch
    for (let s = 0; s < 6; s++) {
      const px = ox + INNER[s][0] * cw
      const py = oy + INNER[s][1] * ch
      let sum = 0
      let n = 0
      for (let y = Math.floor(py - r); y <= Math.ceil(py + r); y++)
        for (let x = Math.floor(px - r); x <= Math.ceil(px + r); x++) {
          const dx = x + 0.5 - px
          const dy = y + 0.5 - py
          if (dx * dx + dy * dy > r * r) continue
          n++
          if (x < ox || x >= ox + cw || y < oy || y >= oy + ch) continue
          sum += img[(y * c.width + x) * 4] / 255
        }
      out[g * 6 + s] = n ? sum / n : 0
    }
  }
  for (let s = 0; s < 6; s++) {
    let peak = 0
    for (let g = 0; g < list.length; g++) peak = Math.max(peak, out[g * 6 + s])
    if (peak > 0) for (let g = 0; g < list.length; g++) out[g * 6 + s] /= peak
  }
  return out
}
