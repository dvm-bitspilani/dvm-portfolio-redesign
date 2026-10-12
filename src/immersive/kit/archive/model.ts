// The wall's content model: normalised items + deterministic packing on a torus.
// World units are "cells", origin-centred, y grows downward internally (the HUD shows y up).
import { resolveFilter } from './items'
import type { ArchiveFilterDef, ArchiveFilterInput, ArchiveItem } from './types'

export interface WallItem {
  index: number
  id: string
  item: ArchiveItem
  kind: string
  /** Shader kind code (film tiles get a play glyph). */
  code: number
  w: number
  h: number
  img?: string
  cropY: number
  rank: number
  /** Top-level record (no parent): listed, linkable, part of prev / next. */
  primary: boolean
  text?: { title: string; sub: string; tone: 'ink' | 'accent' }
}

export interface Layout {
  /** x, y (top-left), w, h per item. */
  rects: Float32Array
  /** 1 = matches the filter, 0 = background item. */
  match: Uint8Array
  count: number
}

/** Centre block reserved for the centrepiece (cells, origin-centred). */
export const CENTRE = { x: -5, y: -4, w: 10, h: 8 }
/** Mark geometry inside the centre block. */
export const MARK = { cx: 0, cy: -0.85, h: 4.1 }
export const ABOUT_ID = 'about'
export const MARK_TARGET = -2

const KIND_CODE: Record<string, number> = { project: 0, film: 1, mockup: 2, screen: 3, mobile: 4, artwork: 5, essay: 6, member: 7, contact: 8 }

function mulberry(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashStr(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

function sizeFor(it: ArchiveItem): [number, number] {
  if (it.size) return [Math.max(1, Math.round(it.size[0])), Math.max(1, Math.round(it.size[1]))]
  const a = it.aspect ?? 16 / 9
  if (it.kind === 'member') return [1, 1]
  if (it.kind === 'mobile') return [1, a > 0.42 ? 2 : 3]
  if (a >= 1.25) return [3, 2]
  if (a > 0.8) return [2, 2]
  return [2, 3]
}

const ASPECT = 1.4

export class WallModel {
  readonly items: WallItem[]
  readonly byId = new Map<string, WallItem>()
  readonly period: { w: number; h: number }
  private layouts = new Map<string, Layout>()
  private filterDefs = new Map<string, Required<ArchiveFilterDef>>()
  private mixed: WallItem[] | null = null

  constructor(src: ArchiveItem[]) {
    const seen = new Set<string>()
    this.items = src.map((item, index) => {
      let id = item.id || `item-${index}`
      if (seen.has(id) || id === ABOUT_ID) {
        let k = 2
        while (seen.has(`${id}-${k}`)) k++
        id = `${id}-${k}`
      }
      seen.add(id)
      const [w, h] = sizeFor(item)
      const t = item.text ?? (item.image ? undefined : {})
      return {
        index, id, item, kind: item.kind, code: KIND_CODE[item.kind] ?? 9, w, h,
        img: item.image, cropY: item.cropY ?? 0.5, rank: item.rank ?? 0, primary: !item.parent,
        text: t ? { title: t.title ?? item.title, sub: t.sub ?? item.line ?? '', tone: t.tone ?? 'ink' } : undefined,
      }
    })
    for (const it of this.items) this.byId.set(it.id, it)

    const area = this.items.reduce((s, i) => s + i.w * i.h, 0) + CENTRE.w * CENTRE.h
    let pw = Math.ceil(Math.sqrt(area * 1.035 * ASPECT))
    pw = Math.max(pw + (pw % 2), 22)
    let ph = Math.ceil((area * 1.035) / pw)
    ph = Math.max(ph + (ph % 2), 16)
    // Leave room for pinned tiles and the widest item.
    for (const it of this.items) {
      const p = it.item.pin
      if (p) {
        pw = Math.max(pw, 2 * Math.max(Math.abs(p.x), Math.abs(p.x + it.w)) + 2)
        ph = Math.max(ph, 2 * Math.max(Math.abs(p.y), Math.abs(p.y + it.h)) + 2)
      }
      pw = Math.max(pw, it.w + 2)
      ph = Math.max(ph, it.h + 2)
    }
    this.period = { w: pw + (pw % 2), h: ph + (ph % 2) }
  }

  get count() {
    return this.items.length
  }

  filter(f: ArchiveFilterInput) {
    const id = typeof f === 'string' ? f : f.id
    let d = this.filterDefs.get(id)
    if (!d || typeof f !== 'string') {
      d = resolveFilter(f)
      this.filterDefs.set(id, d)
    }
    return d
  }

  layout(filterId: string): Layout {
    let L = this.layouts.get(filterId)
    if (L) return L
    if (filterId === 'all') {
      L = this.pack(this.mixedOrder(), 4, null, 3.2)
    } else {
      const def = this.filter(filterId)
      const set = new Set(this.items.filter((i) => def.test(i.item)).map((i) => i.index))
      if (set.size <= 2) {
        // A tiny selection (e.g. the contact tile): keep the full wall, just light the matches.
        const all = this.layout('all')
        const match = new Uint8Array(this.items.length)
        set.forEach((i) => (match[i] = 1))
        L = { rects: all.rects, match, count: set.size }
      } else {
        const matching = this.items.filter((i) => set.has(i.index)).sort((a, b) => b.rank - a.rank || b.w * b.h - a.w * a.h)
        const others = this.mixedOrder().filter((i) => !set.has(i.index))
        const big = set.size > 120
        L = this.pack([...matching, ...others], 11 + (hashStr(filterId) % 97), set, big ? 0.6 : 1.2)
      }
    }
    this.layouts.set(filterId, L)
    return L
  }

  /** Display coordinate of an item's centre in a layout (y up). */
  addressOf(index: number, filterId = 'all') {
    const r = this.layout(filterId).rects
    return fmtCoord(r[index * 4] + r[index * 4 + 2] / 2, -(r[index * 4 + 1] + r[index * 4 + 3] / 2))
  }

  /** Cells covered by the matching tiles of a filter (used to pull back so its ring reads). */
  matchedArea(filterId: string) {
    const L = this.layout(filterId)
    let a = 0
    for (let i = 0; i < this.items.length; i++) if (L.match[i]) a += this.items[i].w * this.items[i].h
    return a
  }

  // ---------------------------------------------------------------- packing

  private cellOrder(seed: number, jitter: number) {
    const rnd = mulberry(seed)
    const { w: W, h: H } = this.period
    const cells: { x: number; y: number; d: number }[] = []
    for (let y = -H / 2; y < H / 2; y++)
      for (let x = -W / 2; x < W / 2; x++) {
        const d = Math.hypot((x + 0.5) / ASPECT, y + 0.5) + (rnd() - 0.5) * jitter
        cells.push({ x, y, d })
      }
    cells.sort((a, b) => a.d - b.d)
    return cells
  }

  private pack(order: WallItem[], seed: number, matchSet: Set<number> | null, jitter: number): Layout {
    const { w: W, h: H } = this.period
    const N = this.items.length
    const occ = new Uint8Array(W * H)
    const gi = (x: number, y: number) => ((((y + H / 2) % H) + H) % H) * W + ((((x + W / 2) % W) + W) % W)
    const fits = (x: number, y: number, w: number, h: number) => {
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (occ[gi(x + i, y + j)]) return false
      return true
    }
    const mark = (x: number, y: number, w: number, h: number) => {
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) occ[gi(x + i, y + j)] = 1
    }
    mark(CENTRE.x, CENTRE.y, CENTRE.w, CENTRE.h)

    const rects = new Float32Array(N * 4)
    const match = new Uint8Array(N)
    let count = 0
    const setMatch = (i: number) => {
      match[i] = matchSet ? (matchSet.has(i) ? 1 : 0) : 1
      count += match[i]
    }
    for (const it of this.items) {
      const p = it.item.pin
      if (!p) continue
      mark(p.x, p.y, it.w, it.h)
      rects.set([p.x, p.y, it.w, it.h], it.index * 4)
      setMatch(it.index)
    }

    const cells = this.cellOrder(seed, jitter)
    let start = 0
    for (const it of order) {
      if (it.item.pin) continue
      let placed = false
      while (start < cells.length && occ[gi(cells[start].x, cells[start].y)]) start++
      for (let k = start; k < cells.length; k++) {
        const c = cells[k]
        const x = c.x - Math.floor((it.w - 1) / 2)
        const y = c.y - Math.floor((it.h - 1) / 2)
        if (fits(x, y, it.w, it.h)) {
          mark(x, y, it.w, it.h)
          rects.set([x, y, it.w, it.h], it.index * 4)
          placed = true
          break
        }
      }
      // Should not happen (the period has slack): park it on the origin, invisible.
      if (!placed) rects.set([0, 0, 0.001, 0.001], it.index * 4)
      setMatch(it.index)
    }
    return { rects, match, count }
  }

  /** Interleave kinds into a bento rhythm; featured work hugs the origin. */
  private mixedOrder(): WallItem[] {
    if (this.mixed) return this.mixed
    const rnd = mulberry(8)
    const shuffle = <T,>(a: T[]) => {
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1))
        ;[a[i], a[j]] = [a[j], a[i]]
      }
      return a
    }
    const free = this.items.filter((i) => !i.item.pin)
    const big = free.filter((i) => i.w * i.h > 1)
    const small = free.filter((i) => i.w * i.h === 1)
    const featured = big.filter((i) => i.item.featured && i.primary)
    const rest = shuffle(big.filter((i) => !featured.includes(i)))
    shuffle(small)
    const fillers = small.splice(0, Math.floor(small.length * 0.45))
    const out: WallItem[] = [...featured]
    let si = 0
    rest.forEach((it, i) => {
      out.push(it)
      if (i % 2 === 1 && si < small.length) out.push(small[si++])
      if (i % 3 === 2 && si < small.length) out.push(small[si++])
    })
    while (si < small.length) out.push(small[si++])
    out.push(...fillers)
    return (this.mixed = out)
  }
}

export function fmtNum(v: number) {
  const r = Math.round(v * 10) / 10
  const s = Number.isInteger(r) ? String(Math.abs(r)) : Math.abs(r).toFixed(1)
  return (r < 0 ? '−' : '') + s
}
export const fmtCoord = (x: number, y: number) => `${fmtNum(x)}, ${fmtNum(y)}`
