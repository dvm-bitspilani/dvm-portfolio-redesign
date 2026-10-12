import { gi } from './glyphs'

/** Cell flags (bit field, mirrored in both renderers). */
export const F_INV = 1 // inverse video
export const F_HOT = 4 // white-hot phosphor core
export const F_BLINK = 8

export const B_DIM = 95
export const B_MID = 150
export const B_NORM = 200
export const B_BRIGHT = 245

export interface Style {
  b?: number
  f?: number
}

/** A character-cell framebuffer (glyph index + brightness + flags per cell). */
export class Grid {
  cols = 0
  rows = 0
  glyph = new Uint8Array(0)
  bright = new Uint8Array(0)
  flags = new Uint8Array(0)
  /** bumped on every resize so renderers know to reallocate */
  version = 0

  resize(cols: number, rows: number) {
    cols = Math.max(1, cols | 0)
    rows = Math.max(1, rows | 0)
    if (cols === this.cols && rows === this.rows) return
    this.cols = cols
    this.rows = rows
    const n = cols * rows
    this.glyph = new Uint8Array(n)
    this.bright = new Uint8Array(n)
    this.flags = new Uint8Array(n)
    this.version++
  }

  clear() {
    this.glyph.fill(0)
    this.bright.fill(0)
    this.flags.fill(0)
  }

  set(x: number, y: number, g: number, b: number, f = 0) {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return
    const i = y * this.cols + x
    this.glyph[i] = g
    this.bright[i] = b < 0 ? 0 : b > 255 ? 255 : b
    this.flags[i] = f
  }

  put(x: number, y: number, ch: string, s: Style = {}) {
    this.set(x, y, gi(ch), s.b ?? B_NORM, s.f ?? 0)
  }

  /** Write a string; returns x after the last char. Stops at maxW chars. */
  text(x: number, y: number, str: string, s: Style = {}, maxW = 1e9): number {
    const b = s.b ?? B_NORM
    const f = s.f ?? 0
    let n = 0
    for (let i = 0; i < str.length && n < maxW; i++, n++) this.set(x + n, y, gi(str[i]), b, f)
    return x + n
  }

  /** Right-aligned text ending at x (exclusive). */
  textR(xEnd: number, y: number, str: string, s: Style = {}) {
    return this.text(xEnd - str.length, y, str, s)
  }

  fill(x: number, y: number, w: number, h: number, ch = ' ', s: Style = {}) {
    const g = gi(ch)
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, g, s.b ?? B_NORM, s.f ?? 0)
  }
}
