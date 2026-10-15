// Content model of the wall + deterministic packing on a torus.
// World units are "cells". y grows downward internally; HUD shows y up.
import { projects, team, artworks, blogs, verticals } from '../../../data'
import type { Artwork, Blog, Member, Project } from '../../../data'
import { DIMS } from './dims'

export type Kind = 'project' | 'video' | 'mockup' | 'page' | 'mobile' | 'artwork' | 'blog' | 'member' | 'contact'
export type Group = 'work' | 'team' | 'journal' | 'contact'
export type Filter = 'all' | 'work' | 'team' | 'journal' | 'contact'

export interface Item {
  index: number
  key: string
  kind: Kind
  group: Group
  title: string
  /** One-line caption under the title. */
  line: string
  img?: string
  /** Typeset tile (no image): drawn into the atlas with canvas text. */
  text?: { title: string; sub: string; tone: 'ink' | 'accent' }
  w: number
  h: number
  /** Sub-route within the design, e.g. "work/apogee-24-website". */
  route: string
  /** Sort key for filtered layouts (bigger = nearer the origin). */
  rank: number
  project?: Project
  member?: Member
  artwork?: Artwork
  blog?: Blog
  /** Vertical-anchor for crop: 0 = top, 0.5 = centre. */
  cropY: number
}

export const KIND_CODE: Record<Kind, number> = {
  project: 0, video: 1, mockup: 2, page: 3, mobile: 4, artwork: 5, blog: 6, member: 7, contact: 8,
}

export const KIND_LABEL: Record<Kind, string> = {
  project: 'Project', video: 'Film', mockup: 'Mockup', page: 'Screen', mobile: 'Mobile screen',
  artwork: 'Artwork', blog: 'Essay', member: 'Member', contact: 'Contact',
}

const vLabel = (id: string) => verticals.find((v) => v.id === id)?.label ?? id

/** Centre block reserved for the mark (cells, origin-centred). */
export const CENTRE = { x: -5, y: -4, w: 10, h: 8 }
/** The contact tile has a fixed address on every layout. */
export const CONTACT_RECT = { x: 6, y: -7, w: 4, h: 2 }

function aspectOf(src?: string) {
  if (!src) return 16 / 9
  const d = DIMS[src]
  return d ? d[0] / d[1] : 16 / 9
}

function buildItems(): Item[] {
  const items: Omit<Item, 'index'>[] = []
  const projectRank = (p: Project) => (p.year ?? 2018) * 10 + (p.featured ? 5 : 0) + (p.kind === 'video' ? 0 : 2)

  for (const p of projects) {
    const isVideo = p.kind === 'video'
    const when = [p.fest === 'Campus' ? 'Campus' : p.fest, p.year].filter(Boolean).join(' ')
    const line = `${p.kind === 'video' ? 'Film' : p.kind[0].toUpperCase() + p.kind.slice(1)}, ${when}`
    const base = { group: 'work' as Group, route: `work/${p.slug}`, project: p, rank: projectRank(p) }
    if (p.cover) {
      items.push({
        ...base, key: `p:${p.slug}`, kind: isVideo ? 'video' : 'project', title: p.title, line,
        img: p.cover, w: p.featured ? 5 : 3, h: p.featured ? 3 : 2, cropY: 0.5,
      })
    } else {
      items.push({
        ...base, key: `p:${p.slug}`, kind: 'project', title: p.title, line, w: 3, h: 2, cropY: 0.5,
        text: { title: p.title, sub: line, tone: 'ink' },
      })
    }
    if (p.mockup) {
      const a = aspectOf(p.mockup)
      items.push({
        ...base, key: `pm:${p.slug}`, kind: 'mockup', title: p.title, line: `Mockup of the ${p.kind}, ${when}`,
        img: p.mockup, w: a > 1.2 ? 3 : 2, h: 2, cropY: 0.5, rank: base.rank - 1,
      })
    }
    p.gallery?.forEach((g, i) => {
      const d = DIMS[g]
      if (!d || d[0] < 400) return
      const a = d[0] / d[1]
      const [w, h] = a > 1.3 ? [3, 2] : a > 0.8 ? [2, 2] : [2, 3]
      items.push({
        ...base, key: `pg:${p.slug}:${i}`, kind: 'page', title: p.title, line: `Desktop screen, ${when}`,
        img: g, w, h, cropY: 0, rank: base.rank - 2,
      })
    })
    p.mobileGallery?.forEach((g, i) => {
      const d = DIMS[g]
      if (!d || d[0] < 250) return
      const a = d[0] / d[1]
      items.push({
        ...base, key: `pmb:${p.slug}:${i}`, kind: 'mobile', title: p.title, line: `Mobile screen, ${when}`,
        img: g, w: 1, h: a > 0.42 ? 2 : 3, cropY: 0, rank: base.rank - 3,
      })
    })
  }

  artworks.forEach((a, i) => {
    const r = aspectOf(a.image)
    const big = i % 5 === 0
    let w: number, h: number
    if (r >= 1.25) [w, h] = big ? [4, 3] : [3, 2]
    else if (r > 0.8) [w, h] = big ? [3, 3] : [2, 2]
    else [w, h] = big ? [3, 4] : [2, 3]
    items.push({
      key: `a:${a.slug}`, kind: 'artwork', group: 'journal', title: a.title, line: `Artwork by ${a.artist}, ${a.year}`,
      img: a.image, w, h, route: `journal/${a.slug}`, rank: new Date(a.date).getTime() / 1e10, artwork: a, cropY: 0.5,
    })
  })

  for (const b of blogs) {
    items.push({
      key: `b:${b.slug}`, kind: 'blog', group: 'journal', title: b.shortTitle ?? b.title,
      line: `Essay by ${b.authors.join(' & ')}, ${b.date}`, img: b.cover, w: 3, h: 2, route: `journal/${b.slug}`,
      rank: new Date(b.isoDate).getTime() / 1e10 + 0.01, blog: b, cropY: 0.5,
    })
  }

  for (const m of team) {
    const por = !!m.isPorHolder
    items.push({
      key: `m:${m.slug}`, kind: 'member', group: 'team', title: m.name,
      line: m.designation ?? `${vLabel(m.vertical)} team, joined ${m.batch}`,
      img: m.photo, w: por ? 2 : 1, h: por ? 2 : 1, route: `team/${m.slug}`,
      rank: m.batch * 10 + (por ? 5 : 0), member: m, cropY: 0.35,
    })
  }

  items.push({
    key: 'contact', kind: 'contact', group: 'contact', title: 'Write to DVM', line: 'admin@bits-dvm.org',
    w: CONTACT_RECT.w, h: CONTACT_RECT.h, route: 'contact', rank: 0, cropY: 0.5,
    text: { title: 'Write to DVM', sub: 'admin@bits-dvm.org', tone: 'accent' },
  })

  return items.map((it, index) => ({ ...it, index }))
}

export const ITEMS: Item[] = buildItems()
export const CONTACT_INDEX = ITEMS.findIndex((i) => i.kind === 'contact')

// ---------------------------------------------------------------- packing

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

const totalArea = ITEMS.reduce((s, i) => s + i.w * i.h, 0) + CENTRE.w * CENTRE.h
const ASPECT = 1.4
let pw = Math.ceil(Math.sqrt((totalArea * 1.035) * ASPECT))
if (pw % 2) pw++
let ph = Math.ceil((totalArea * 1.035) / pw)
if (ph % 2) ph++
/** Period of the infinite wall in cells. */
export const PERIOD = { w: pw, h: ph }

export interface Layout {
  /** x, y (top-left, cells, origin-centred, y down), w, h per item. */
  rects: Float32Array
  /** 1 = matches the filter, 0 = background item. */
  match: Uint8Array
}

/** Candidate cell order: by elliptical distance from the origin, with jitter. */
function cellOrder(seed: number, jitter: number) {
  const rnd = mulberry(seed)
  const cells: { x: number; y: number; d: number }[] = []
  for (let y = -PERIOD.h / 2; y < PERIOD.h / 2; y++)
    for (let x = -PERIOD.w / 2; x < PERIOD.w / 2; x++) {
      const cx = x + 0.5, cy = y + 0.5
      const d = Math.hypot(cx / ASPECT, cy) + (rnd() - 0.5) * jitter
      cells.push({ x, y, d })
    }
  cells.sort((a, b) => a.d - b.d)
  return cells
}

function pack(order: Item[], seed: number, matchSet: Set<number> | null, jitter: number): Layout {
  const W = PERIOD.w, H = PERIOD.h
  const occ = new Uint8Array(W * H)
  const gi = (x: number, y: number) => {
    const gx = (((x + W / 2) % W) + W) % W
    const gy = (((y + H / 2) % H) + H) % H
    return gy * W + gx
  }
  const fits = (x: number, y: number, w: number, h: number) => {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (occ[gi(x + i, y + j)]) return false
    return true
  }
  const mark = (x: number, y: number, w: number, h: number) => {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) occ[gi(x + i, y + j)] = 1
  }
  mark(CENTRE.x, CENTRE.y, CENTRE.w, CENTRE.h)
  mark(CONTACT_RECT.x, CONTACT_RECT.y, CONTACT_RECT.w, CONTACT_RECT.h)

  const rects = new Float32Array(ITEMS.length * 4)
  const match = new Uint8Array(ITEMS.length)
  const cells = cellOrder(seed, jitter)
  const ci = ITEMS[CONTACT_INDEX]
  rects.set([CONTACT_RECT.x, CONTACT_RECT.y, CONTACT_RECT.w, CONTACT_RECT.h], ci.index * 4)
  match[ci.index] = matchSet ? (matchSet.has(ci.index) ? 1 : 0) : 1

  // Pointer to the first cell that might still be free, per footprint, keeps this O(n).
  let start = 0
  for (const it of order) {
    if (it.kind === 'contact') continue
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
    if (!placed) {
      // Should not happen (period has slack); park it on top of the origin, hidden.
      rects.set([0, 0, 0.001, 0.001], it.index * 4)
    }
    match[it.index] = matchSet ? (matchSet.has(it.index) ? 1 : 0) : 1
  }
  return { rects, match }
}

/** Interleave the archive so the default wall mixes kinds into a bento rhythm. */
function mixedOrder(): Item[] {
  const rnd = mulberry(8)
  const big = ITEMS.filter((i) => i.w * i.h > 1 && i.kind !== 'contact')
  const small = ITEMS.filter((i) => i.w * i.h === 1)
  const shuffle = <T,>(a: T[]) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }
  // Featured work first (closest to the mark), then a seeded mix.
  const featured = big.filter((i) => i.project?.featured && (i.kind === 'project' || i.kind === 'video'))
  const rest = shuffle(big.filter((i) => !featured.includes(i)))
  shuffle(small)
  // Keep ~45% of the 1x1 portraits back as gap fillers.
  const fillers = small.splice(0, Math.floor(small.length * 0.45))
  const out: Item[] = [...featured]
  let si = 0
  rest.forEach((it, i) => {
    out.push(it)
    if (i % 2 === 1 && si < small.length) out.push(small[si++])
    if (i % 3 === 2 && si < small.length) out.push(small[si++])
  })
  while (si < small.length) out.push(small[si++])
  out.push(...fillers)
  return out
}

function groupOrder(group: Group): Item[] {
  const matching = ITEMS.filter((i) => i.group === group).sort((a, b) => b.rank - a.rank || b.w * b.h - a.w * a.h)
  const others = mixedOrder().filter((i) => i.group !== group)
  return [...matching, ...others]
}

function buildLayouts(): Record<Filter, Layout> {
  const all = pack(mixedOrder(), 4, null, 3.2)
  const sets = (g: Group) => new Set(ITEMS.filter((i) => i.group === g).map((i) => i.index))
  const contactMatch = new Uint8Array(ITEMS.length)
  contactMatch[CONTACT_INDEX] = 1
  return {
    all,
    work: pack(groupOrder('work'), 11, sets('work'), 1.2),
    team: pack(groupOrder('team'), 12, sets('team'), 0.6),
    journal: pack(groupOrder('journal'), 13, sets('journal'), 1.2),
    contact: { rects: all.rects, match: contactMatch },
  }
}

export const LAYOUTS = buildLayouts()

export const FILTER_COUNTS: Record<Filter, number> = {
  all: ITEMS.length - 1,
  work: ITEMS.filter((i) => i.group === 'work').length,
  team: ITEMS.filter((i) => i.group === 'team').length,
  journal: ITEMS.filter((i) => i.group === 'journal').length,
  contact: 1,
}

/** Display coordinate of an item's centre in a layout (y up, one decimal max). */
export function addressOf(index: number, filter: Filter = 'all') {
  const r = LAYOUTS[filter].rects
  const x = r[index * 4] + r[index * 4 + 2] / 2
  const y = -(r[index * 4 + 1] + r[index * 4 + 3] / 2)
  return fmtCoord(x, y)
}

export function fmtNum(v: number) {
  const r = Math.round(v * 10) / 10
  const s = Number.isInteger(r) ? String(Math.abs(r)) : Math.abs(r).toFixed(1)
  return (r < 0 ? '−' : '') + s
}
export const fmtCoord = (x: number, y: number) => `${fmtNum(x)}, ${fmtNum(y)}`

export function findByRoute(kind: 'project' | 'member' | 'journal', slug: string): Item | undefined {
  if (kind === 'project') return ITEMS.find((i) => i.key === `p:${slug}`)
  if (kind === 'member') return ITEMS.find((i) => i.key === `m:${slug}`)
  return ITEMS.find((i) => i.key === `a:${slug}` || i.key === `b:${slug}`)
}
