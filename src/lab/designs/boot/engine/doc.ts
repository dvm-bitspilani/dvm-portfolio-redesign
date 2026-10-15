import { blitAscii, getAscii, type AsciiOpts } from './asciiImage'
import type { Engine, Rect } from './engine'
import { wrapLine, type LaidChar, type Line } from './grid'

/** A scrollable rich document: text lines + inline ASCII image blocks (with optional side text). */
export type Block =
  | { kind: 'text'; line: Line; indent?: number; max?: number }
  | { kind: 'img'; url: string; h: number; w?: number; x?: number; side?: Line[]; opts?: AsciiOpts }
  | { kind: 'gap'; n?: number }
  | { kind: 'anchor'; id: string }

export interface ImgRef {
  url: string
  row: number
  h: number
  w: number
  x: number
  opts?: AsciiOpts
}
export interface Row {
  chars?: LaidChar[]
  x?: number
  img?: ImgRef
}
export interface Laid {
  rows: Row[]
  anchors: Map<string, number>
}

export function text(line: Line | string, indent = 0, max?: number): Block {
  return { kind: 'text', line: typeof line === 'string' ? [{ t: line }] : line, indent, max }
}

export function layoutDoc(blocks: Block[], width: number): Laid {
  const rows: Row[] = []
  const anchors = new Map<string, number>()
  for (const b of blocks) {
    if (b.kind === 'anchor') anchors.set(b.id, rows.length)
    else if (b.kind === 'gap') {
      for (let i = 0; i < (b.n ?? 1); i++) rows.push({})
    } else if (b.kind === 'text') {
      const ind = b.indent ?? 0
      for (const r of wrapLine(b.line, Math.max(8, Math.min(width, b.max ?? width) - ind), 0)) rows.push({ chars: r, x: ind })
    } else {
      const x = b.x ?? 0
      const w = Math.max(4, Math.min(width - x, b.w ?? width))
      const ref: ImgRef = { url: b.url, row: 0, h: b.h, w, x, opts: b.opts }
      const sideX = x + w + 2
      const sideW = width - sideX
      const side: LaidChar[][] = []
      if (b.side && sideW > 12) for (const l of b.side) side.push(...wrapLine(l, sideW))
      const n = Math.max(b.h, side.length)
      for (let i = 0; i < n; i++) {
        const row: Row = {}
        if (i < b.h) row.img = i === 0 ? ref : { ...ref, row: i }
        if (side[i]) {
          row.chars = side[i]
          row.x = sideX
        }
        rows.push(row)
      }
    }
  }
  return { rows, anchors }
}

/** Draw rows[scroll..] into region r. */
export function drawRows(e: Engine, rows: Row[], r: Rect, scroll: number) {
  const g = e.main
  g.clip(r.x, r.y, r.x + r.w, r.y + r.h)
  let lastImg = ''
  for (let j = 0; j < r.h; j++) {
    const row = rows[scroll + j]
    if (!row) break
    const y = r.y + j
    if (row.img) {
      const im = row.img
      const key = `${im.url}|${y - im.row}|${im.x}`
      if (key !== lastImg) {
        lastImg = key
        drawImage(e, im.url, { x: r.x + im.x, y: y - im.row, w: im.w, h: im.h }, r, im.opts)
      }
    }
    if (row.chars) {
      let x = r.x + (row.x ?? 0)
      for (const c of row.chars) {
        const s = c.seg
        const link = s.cmd || s.href || s.to !== undefined ? e.segLink(s) : 0
        g.put(x, y, c.ch, { b: s.b, f: s.f, link })
        x++
      }
    }
  }
  g.noClip()
}

/**
 * Draw an ASCII-converted image into the fine grid filling main-cell rect `box`,
 * clipped to main-cell rect `clipR`. Shows sparse static while loading, NO SIGNAL on error.
 */
export function drawImage(e: Engine, url: string, box: Rect, clipR: Rect = box, opts?: AsciiOpts, reveal = 1) {
  const f = e.fine
  const fx0 = e.toFineX(box.x)
  const fy0 = e.toFineY(box.y)
  const cols = e.toFineX(box.x + box.w) - fx0
  const rows = e.toFineY(box.y + box.h) - fy0
  if (cols <= 0 || rows <= 0) return
  f.clip(e.toFineX(clipR.x), e.toFineY(clipR.y), e.toFineX(clipR.x + clipR.w), e.toFineY(clipR.y + clipR.h))
  const a = url ? getAscii(url, cols, rows, e.imgSX, e.imgSY, e.matcher, opts) : 'error'
  if (a && a !== 'error') {
    blitAscii(f, a, fx0, fy0, 50, 210, reveal)
  } else {
    const t = Math.floor(e.time * 12)
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        const h = Math.sin((i + fx0) * 12.9898 + (j + fy0) * 78.233 + t * 3.1) * 43758.5453
        const v = h - Math.floor(h)
        if (v > (a === 'error' ? 0.9 : 0.965)) f.put(fx0 + i, fy0 + j, v > 0.985 ? ':' : '.', { b: 70 })
      }
  }
  f.noClip()
  if (a === 'error') {
    const msg = 'NO SIGNAL'
    e.main.clip(clipR.x, clipR.y, clipR.x + clipR.w, clipR.y + clipR.h)
    e.main.text(box.x + Math.floor((box.w - msg.length) / 2), box.y + Math.floor(box.h / 2), msg, { b: 120 })
    e.main.noClip()
  }
}
