import { gi } from './glyphs'

export const F_INV = 1 // inverse video
export const F_UL = 2 // underline
export const F_HOT = 4 // white-hot phosphor core
export const F_BLINK = 8
export const F_HOVER = 16 // set by the engine for hovered links

export const B_DIM = 95
export const B_MID = 150
export const B_NORM = 200
export const B_BRIGHT = 245

export interface Style {
  b?: number
  f?: number
  link?: number
}

/** A character-cell framebuffer. */
export class Grid {
  cols = 0
  rows = 0
  glyph = new Uint8Array(0)
  bright = new Uint8Array(0)
  flags = new Uint8Array(0)
  link = new Uint16Array(0)
  /** Clip rectangle (inclusive x0,y0; exclusive x1,y1). */
  cx0 = 0
  cy0 = 0
  cx1 = 0
  cy1 = 0

  resize(cols: number, rows: number) {
    if (cols === this.cols && rows === this.rows) return
    this.cols = cols
    this.rows = rows
    const n = cols * rows
    this.glyph = new Uint8Array(n)
    this.bright = new Uint8Array(n)
    this.flags = new Uint8Array(n)
    this.link = new Uint16Array(n)
    this.noClip()
  }

  clear() {
    this.glyph.fill(0)
    this.bright.fill(0)
    this.flags.fill(0)
    this.link.fill(0)
  }

  clip(x0: number, y0: number, x1: number, y1: number) {
    this.cx0 = Math.max(0, x0)
    this.cy0 = Math.max(0, y0)
    this.cx1 = Math.min(this.cols, x1)
    this.cy1 = Math.min(this.rows, y1)
  }
  noClip() {
    this.cx0 = 0
    this.cy0 = 0
    this.cx1 = this.cols
    this.cy1 = this.rows
  }

  set(x: number, y: number, g: number, b: number, f = 0, link = 0) {
    if (x < this.cx0 || y < this.cy0 || x >= this.cx1 || y >= this.cy1) return
    const i = y * this.cols + x
    this.glyph[i] = g
    this.bright[i] = b
    this.flags[i] = f
    this.link[i] = link
  }

  put(x: number, y: number, ch: string, s: Style = {}) {
    this.set(x, y, gi(ch), s.b ?? B_NORM, s.f ?? 0, s.link ?? 0)
  }

  /** Write a string; returns x after the last char. Stops at maxW chars. */
  text(x: number, y: number, str: string, s: Style = {}, maxW = 1e9): number {
    const b = s.b ?? B_NORM
    const f = s.f ?? 0
    const l = s.link ?? 0
    let n = 0
    for (const ch of str) {
      if (n >= maxW) break
      this.set(x + n, y, gi(ch), b, f, l)
      n++
    }
    return x + n
  }

  /** Right-aligned text ending at x (exclusive). */
  textR(xEnd: number, y: number, str: string, s: Style = {}) {
    return this.text(xEnd - Array.from(str).length, y, str, s)
  }

  fill(x: number, y: number, w: number, h: number, ch = ' ', s: Style = {}) {
    const g = gi(ch)
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, g, s.b ?? B_NORM, s.f ?? 0, s.link ?? 0)
  }

  /** Apply flags/link over an existing region without changing glyphs. */
  mark(x: number, y: number, w: number, h: number, s: Style) {
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        const xx = x + i
        const yy = y + j
        if (xx < this.cx0 || yy < this.cy0 || xx >= this.cx1 || yy >= this.cy1) continue
        const k = yy * this.cols + xx
        if (s.f !== undefined) this.flags[k] |= s.f
        if (s.b !== undefined) this.bright[k] = s.b
        if (s.link !== undefined) this.link[k] = s.link
      }
  }

  hline(x: number, y: number, w: number, ch = '─', s: Style = {}) {
    this.fill(x, y, w, 1, ch, s)
  }
  vline(x: number, y: number, h: number, ch = '│', s: Style = {}) {
    this.fill(x, y, 1, h, ch, s)
  }

  box(x: number, y: number, w: number, h: number, s: Style = {}, title?: string, double = false) {
    if (w < 2 || h < 2) return
    const [tl, tr, bl, br, hz, vt] = double ? ['╔', '╗', '╚', '╝', '═', '║'] : ['┌', '┐', '└', '┘', '─', '│']
    const st = { b: s.b ?? B_DIM }
    this.put(x, y, tl, st)
    this.put(x + w - 1, y, tr, st)
    this.put(x, y + h - 1, bl, st)
    this.put(x + w - 1, y + h - 1, br, st)
    this.hline(x + 1, y, w - 2, hz, st)
    this.hline(x + 1, y + h - 1, w - 2, hz, st)
    this.vline(x, y + 1, h - 2, vt, st)
    this.vline(x + w - 1, y + 1, h - 2, vt, st)
    if (title) this.text(x + 2, y, ` ${title} `, { b: s.b ?? B_BRIGHT }, w - 4)
  }
}

/* ---------------- rich text ---------------- */

export interface Seg {
  t: string
  b?: number
  f?: number
  /** Shell command to run when clicked. */
  cmd?: string
  /** External URL to open when clicked. */
  href?: string
  /** Internal route (relative to design base) to navigate to. */
  to?: string
}
export type Line = Seg[]

export interface LaidChar {
  ch: string
  seg: Seg
}

/** Word-wrap a line of segments into rows of at most `width` chars. */
export function wrapLine(line: Line, width: number, indent = 0): LaidChar[][] {
  const chars: LaidChar[] = []
  for (const seg of line) for (const ch of seg.t) chars.push({ ch, seg })
  if (width <= 0) return [chars]
  const out: LaidChar[][] = []
  let start = 0
  let first = true
  while (start < chars.length) {
    const w = first ? width : width - indent
    if (chars.length - start <= w) {
      out.push(chars.slice(start))
      break
    }
    let cut = start + w
    let k = cut
    while (k > start && chars[k].ch !== ' ') k--
    if (k > start + w * 0.4) cut = k
    out.push(chars.slice(start, cut))
    start = cut
    while (start < chars.length && chars[start].ch === ' ') start++
    first = false
  }
  if (!out.length) out.push([])
  if (indent > 0)
    for (let i = 1; i < out.length; i++) {
      const pad: LaidChar[] = Array.from({ length: indent }, () => ({ ch: ' ', seg: { t: ' ' } }))
      out[i] = pad.concat(out[i])
    }
  return out
}

export function plain(t: string, b?: number, f?: number): Line {
  return [{ t, b, f }]
}

export function padR(s: string, n: number) {
  const len = Array.from(s).length
  return len >= n ? Array.from(s).slice(0, n).join('') : s + ' '.repeat(n - len)
}
export function padL(s: string, n: number) {
  const len = Array.from(s).length
  return len >= n ? s : ' '.repeat(n - len) + s
}
export function trunc(s: string, n: number) {
  const a = Array.from(s)
  if (a.length <= n) return s
  return a.slice(0, Math.max(0, n - 1)).join('') + '…'
}
