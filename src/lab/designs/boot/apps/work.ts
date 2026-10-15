import type { Project } from '../../../data'
import { drawImage } from '../engine/doc'
import type { App, Engine, KeyEv, PointerInfo, Rect } from '../engine/engine'
import { B_BRIGHT, B_DIM, B_MID, B_NORM, F_INV, padR, trunc, wrapLine } from '../engine/grid'
import { coverOf, FEST_ORDER, KIND_TAG, ORDERED, clamp } from './util'

type Kind = 'all' | Project['kind']
const KINDS: Kind[] = ['all', 'website', 'app', 'portal', 'video']

type Entry = { dir: string; count: number } | { p: Project; last: boolean }

export class WorkApp implements App {
  readonly id = 'work' as const
  private kind: Kind = 'all'
  private sel = 0 // index into files
  private scroll = 0
  private entries: Entry[] = []
  private files: Project[] = []
  private listRect: Rect = { x: 0, y: 0, w: 0, h: 0 }

  constructor() {
    this.rebuild()
  }

  private rebuild() {
    const list = ORDERED.filter((p) => this.kind === 'all' || p.kind === this.kind)
    this.files = list
    this.entries = []
    for (const f of FEST_ORDER) {
      const ps = list.filter((p) => p.fest === f)
      if (!ps.length) continue
      this.entries.push({ dir: f.toLowerCase(), count: ps.length })
      ps.forEach((p, i) => this.entries.push({ p, last: i === ps.length - 1 }))
    }
    this.sel = clamp(this.sel, 0, Math.max(0, this.files.length - 1))
  }

  cwd() {
    return '~/work'
  }

  chips() {
    const p = this.files[this.sel]
    return ['cd ~', p ? `open ${p.slug}` : 'ls projects', 'ls projects', 'team', 'cat journal', 'contact']
  }

  private setKind(k: Kind) {
    const cur = this.files[this.sel]
    this.kind = k
    this.rebuild()
    const i = cur ? this.files.indexOf(cur) : -1
    this.sel = i >= 0 ? i : 0
    this.scroll = 0
  }

  key(e: Engine, k: KeyEv) {
    if (k.key === 'ArrowDown') {
      this.sel = Math.min(this.files.length - 1, this.sel + 1)
      return true
    }
    if (k.key === 'ArrowUp') {
      this.sel = Math.max(0, this.sel - 1)
      return true
    }
    if (k.key === 'ArrowRight' && !e.prompt.buf) {
      this.setKind(KINDS[(KINDS.indexOf(this.kind) + 1) % KINDS.length])
      return true
    }
    if (k.key === 'ArrowLeft' && !e.prompt.buf) {
      this.setKind(KINDS[(KINDS.indexOf(this.kind) + KINDS.length - 1) % KINDS.length])
      return true
    }
    if (k.key === 'Enter' && !e.prompt.buf) {
      const p = this.files[this.sel]
      if (p) e.go(`work/${p.slug}`)
      return true
    }
    if (k.key === 'Home' && !e.prompt.buf) {
      this.sel = 0
      return true
    }
    if (k.key === 'End' && !e.prompt.buf) {
      this.sel = this.files.length - 1
      return true
    }
    return false
  }

  wheel(_e: Engine, dy: number) {
    this.sel = clamp(this.sel + dy, 0, this.files.length - 1)
  }

  pointer(_e: Engine, p: PointerInfo) {
    // hover over a file row selects it (preview follows the cursor)
    if (p.type !== 'move') return false
    const r = this.listRect
    if (p.cx < r.x || p.cx >= r.x + r.w || p.cy < r.y || p.cy >= r.y + r.h) return false
    const ent = this.entries[this.scroll + (p.cy - r.y)]
    if (ent && 'p' in ent) this.sel = this.files.indexOf(ent.p)
    return false
  }

  draw(e: Engine, r: Rect) {
    const g = e.main
    // filter tabs
    let x = r.x
    for (const k of KINDS) {
      const n = k === 'all' ? ORDERED.length : ORDERED.filter((p) => p.kind === k).length
      const on = this.kind === k
      const link = e.link(() => this.setKind(k))
      x = g.text(x, r.y, on ? `[*] ${k} ${n}` : `[ ] ${k} ${n}`, { b: on ? B_BRIGHT : B_MID, link }) + 3
    }
    if (!e.narrow) g.textR(r.x + r.w, r.y, '←→ filter   ↑↓ select   enter opens', { b: B_DIM })

    const top = r.y + 2
    const H = r.h - 2
    if (e.narrow) {
      const ph = Math.min(Math.floor(H * 0.45), 14)
      this.drawPreview(e, { x: r.x, y: top, w: r.w, h: ph }, true)
      this.drawList(e, { x: r.x, y: top + ph + 1, w: r.w, h: H - ph - 1 })
    } else {
      const lw = Math.min(46, Math.max(34, Math.floor(r.w * 0.34)))
      this.drawList(e, { x: r.x, y: top, w: lw, h: H })
      this.drawPreview(e, { x: r.x + lw + 1, y: top, w: r.w - lw - 1, h: H }, false)
    }
  }

  private drawList(e: Engine, R: Rect) {
    const g = e.main
    g.box(R.x, R.y, R.w, R.h, { b: B_DIM }, '/work', true)
    const inner: Rect = { x: R.x + 1, y: R.y + 1, w: R.w - 2, h: R.h - 2 }
    this.listRect = inner
    // keep selection visible
    const selEntry = this.entries.findIndex((en) => 'p' in en && en.p === this.files[this.sel])
    if (selEntry >= 0) {
      if (selEntry < this.scroll + 1) this.scroll = Math.max(0, selEntry - 1)
      if (selEntry >= this.scroll + inner.h - 1) this.scroll = selEntry - inner.h + 2
    }
    this.scroll = clamp(this.scroll, 0, Math.max(0, this.entries.length - inner.h))
    for (let j = 0; j < inner.h; j++) {
      const en = this.entries[this.scroll + j]
      if (!en) break
      const y = inner.y + j
      if ('dir' in en) {
        g.text(inner.x + 1, y, `${en.dir}/`, { b: B_BRIGHT })
        g.textR(inner.x + inner.w - 1, y, String(en.count), { b: B_DIM })
      } else {
        const p = en.p
        const on = this.files[this.sel] === p
        const link = e.link(() => e.go(`work/${p.slug}`))
        const branch = en.last ? '└── ' : '├── '
        g.text(inner.x + 1, y, branch, { b: B_DIM, link })
        const tag = KIND_TAG[p.kind]
        const nameW = inner.w - 6 - tag.length - 1
        const style = on ? { b: 190, f: F_INV, link } : { b: B_NORM, link }
        g.text(inner.x + 5, y, padR(trunc(p.slug, nameW), nameW), style)
        g.textR(inner.x + inner.w - 1, y, tag, { b: on ? B_NORM : B_DIM, link })
      }
    }
    // footer in frame
    g.text(R.x + 2, R.y + R.h - 1, ` ${this.sel + 1}/${this.files.length} `, { b: B_MID })
    if (this.entries.length > inner.h) {
      const th = Math.max(1, Math.round((inner.h * inner.h) / this.entries.length))
      const maxS = this.entries.length - inner.h
      const ty = inner.y + Math.round(((inner.h - th) * this.scroll) / maxS)
      g.vline(R.x + R.w - 1, ty, th, '█', { b: 90 })
    }
  }

  private drawPreview(e: Engine, R: Rect, compact: boolean) {
    const g = e.main
    const p = this.files[this.sel]
    g.box(R.x, R.y, R.w, R.h, { b: B_DIM }, p ? `${p.fest.toLowerCase()}/${p.slug}` : 'preview', true)
    if (!p) return
    const ix = R.x + 2
    const iw = R.w - 4
    let y = R.y + 1
    // cover (16:9-ish)
    const ideal = Math.round((iw * e.cw * 0.5625) / e.ch)
    const ch = compact ? R.h - 4 : Math.max(6, Math.min(ideal, Math.floor((R.h - 2) * 0.56)))
    const cw = compact ? Math.min(iw, Math.round((ch * e.ch) / e.cw / 0.5625)) : iw
    drawImage(e, coverOf(p), { x: ix, y, w: cw, h: ch })
    if (compact) {
      const tx = ix + cw + 2
      const tw = iw - cw - 2
      if (tw > 10) {
        let yy = y
        for (const row of wrapLine([{ t: p.title }], tw)) g.text(tx, yy++, row.map((c) => c.ch).join(''), { b: B_BRIGHT })
        g.text(tx, yy + 1, `${KIND_TAG[p.kind]}  ${p.year ?? ''}`, { b: B_MID })
        g.text(tx, yy + 3, '[ open ]', { b: B_BRIGHT, link: e.link(() => e.go(`work/${p.slug}`)) })
      }
      return
    }
    y += ch + 1
    const bottom = R.y + R.h - 2
    g.text(ix, y, trunc(p.title, iw), { b: B_BRIGHT })
    y += 1
    if (p.subtitle && y < bottom) g.text(ix, y++, trunc(p.subtitle, iw), { b: B_MID })
    y += 1
    const kv = (k: string, v: string) => {
      if (y >= bottom) return
      g.text(ix, y, padR(k, 10), { b: B_DIM })
      g.text(ix + 10, y, trunc(v, iw - 10), { b: B_NORM })
      y++
    }
    kv('fest', `${p.fest}${p.year ? `  ${p.year}` : ''}${p.date ? `  (${p.date})` : ''}`)
    kv('kind', p.kind)
    if (p.theme) kv('theme', p.theme)
    kv('teams', p.verticals.join('  '))
    y++
    const sum = p.summary ?? p.description ?? ''
    const maxRows = Math.max(0, bottom - y - 2)
    const rows = wrapLine([{ t: sum }], iw)
    for (let i = 0; i < Math.min(maxRows, rows.length); i++) {
      let s = rows[i].map((c) => c.ch).join('')
      if (i === maxRows - 1 && rows.length > maxRows) s = trunc(s + '…', iw)
      g.text(ix, y++, s, { b: B_MID })
    }
    // actions
    const ay = R.y + R.h - 2
    let ax = ix
    const act = (label: string, fn: () => void, b = B_NORM) => {
      const link = e.link(fn)
      ax = g.text(ax, ay, `[ ${label} ]`, { b, link }) + 2
    }
    act('open README', () => e.go(`work/${p.slug}`), B_BRIGHT)
    if (p.links.live) act('live site', () => window.open(p.links.live, '_blank', 'noopener'))
    if (p.links.playStore) act('play store', () => window.open(p.links.playStore, '_blank', 'noopener'))
    if (p.links.youtube || p.youtubeId) act('youtube', () => window.open(p.links.youtube ?? `https://www.youtube.com/watch?v=${p.youtubeId}`, '_blank', 'noopener'))
  }
}
