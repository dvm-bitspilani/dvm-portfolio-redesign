import { team, verticals, type Member } from '../../../data'
import { drawImage } from '../engine/doc'
import type { App, Engine, KeyEv, PointerInfo, Rect, RouteParams } from '../engine/engine'
import { B_BRIGHT, B_DIM, B_MID, B_NORM, F_INV, padL, padR, trunc, wrapLine } from '../engine/grid'
import { clamp } from './util'

type SortKey = 'batch' | 'user' | 'vert' | 'cpu'

const PID = new Map<Member, number>(team.map((m, i) => [m, 1001 + i]))
const batches = [...new Set(team.map((m) => m.batch).filter(Boolean))].sort()

function hash(n: number) {
  const h = Math.sin(n * 91.345 + 47.853) * 43758.5453
  return h - Math.floor(h)
}

export class TeamApp implements App {
  readonly id = 'team' as const
  private vert = ''
  private sort: SortKey = 'batch'
  private sel = 0
  private scroll = 0
  private rows: Member[] = []
  private listRect: Rect = { x: 0, y: 0, w: 0, h: 0 }
  private tick = -1
  private cpu = new Map<Member, number>()

  constructor() {
    this.rebuild()
  }

  enter(_e: Engine, p: RouteParams) {
    const v = p.vertical ?? ''
    if (v !== this.vert) {
      this.vert = verticals.some((x) => x.id === v) ? v : ''
      this.rebuild()
      this.sel = 0
      this.scroll = 0
    }
  }

  cwd() {
    return this.vert ? `~/team/${this.vert}` : '~/team'
  }

  chips() {
    return ['cd ~', 'team', ...verticals.map((v) => `team ${v.id}`), 'cd work']
  }

  private rebuild() {
    const list = team.filter((m) => !this.vert || m.vertical === this.vert)
    const s = this.sort
    list.sort((a, b) => {
      if (s === 'user') return a.name.localeCompare(b.name)
      if (s === 'vert') return a.vertical.localeCompare(b.vertical) || b.batch - a.batch
      if (s === 'cpu') return (this.cpu.get(b) ?? 0) - (this.cpu.get(a) ?? 0)
      return b.batch - a.batch || Number(!!b.designation) - Number(!!a.designation) || a.name.localeCompare(b.name)
    })
    const cur = this.rows[this.sel]
    this.rows = list
    const i = cur ? list.indexOf(cur) : -1
    this.sel = i >= 0 ? i : clamp(this.sel, 0, Math.max(0, list.length - 1))
  }

  private setVert(e: Engine, v: string) {
    e.go(v ? `team?v=${v}` : 'team')
  }

  private setSort(s: SortKey) {
    this.sort = s
    this.rebuild()
  }

  key(e: Engine, k: KeyEv) {
    const n = this.rows.length
    const fk = /^F(\d+)$/.exec(k.key)
    if (fk) {
      const i = Number(fk[1])
      if (i === 1) this.setVert(e, '')
      else if (i >= 2 && i <= 6) this.setVert(e, verticals[i - 2].id)
      else if (i === 10) e.go('')
      else return false
      return true
    }
    switch (k.key) {
      case 'ArrowDown':
        this.sel = Math.min(n - 1, this.sel + 1)
        return true
      case 'ArrowUp':
        this.sel = Math.max(0, this.sel - 1)
        return true
      case 'PageDown':
        this.sel = Math.min(n - 1, this.sel + this.listRect.h - 1)
        return true
      case 'PageUp':
        this.sel = Math.max(0, this.sel - this.listRect.h + 1)
        return true
    }
    return false
  }

  wheel(_e: Engine, dy: number) {
    this.sel = clamp(this.sel + dy, 0, this.rows.length - 1)
  }

  pointer(_e: Engine, p: PointerInfo) {
    if (p.type !== 'move') return false
    const r = this.listRect
    if (p.cx < r.x || p.cx >= r.x + r.w || p.cy < r.y || p.cy >= r.y + r.h) return false
    const i = this.scroll + (p.cy - r.y)
    if (i < this.rows.length) this.sel = i
    return false
  }

  private refreshCpu(e: Engine) {
    const t = Math.floor(e.time / 1.6)
    if (t === this.tick) return
    this.tick = t
    for (const m of team) {
      const pid = PID.get(m)!
      const base = hash(pid + t * 13.37)
      let v = Math.pow(base, 3) * 24 + hash(pid) * 1.5
      if (m.designation) v += 3 + hash(pid + t) * 6
      this.cpu.set(m, Math.round(v * 10) / 10)
    }
    if (this.sort === 'cpu') this.rebuild()
  }

  draw(e: Engine, r: Rect) {
    this.refreshCpu(e)
    const g = e.main
    const narrow = e.narrow
    const portraitW = narrow ? 0 : Math.min(40, Math.max(28, Math.floor(r.w * 0.27)))
    const L: Rect = { x: r.x, y: r.y, w: r.w - (portraitW ? portraitW + 2 : 0), h: r.h }

    // meters
    const counts = verticals.map((v) => team.filter((m) => m.vertical === v.id).length)
    const maxC = Math.max(...counts)
    let y = L.y
    const barW = narrow ? Math.max(8, L.w - 16) : Math.min(36, Math.floor(L.w * 0.42) - 14)
    verticals.forEach((v, i) => {
      const on = this.vert === v.id
      const link = e.link(() => this.setVert(e, on ? '' : v.id))
      const wob = e.reduced ? 0 : Math.sin(e.time * 1.7 + i * 2.1) * 0.04
      const fill = Math.round(barW * clamp(counts[i] / maxC + wob, 0, 1))
      g.text(L.x, y, padR(v.id, 9), { b: on ? B_BRIGHT : B_NORM, f: on ? F_INV : 0, link })
      g.put(L.x + 9, y, '[', { b: B_DIM, link })
      g.text(L.x + 10, y, '|'.repeat(fill), { b: on ? B_BRIGHT : B_NORM, link })
      g.text(L.x + 10 + barW - 3, y, padL(String(counts[i]), 3), { b: B_BRIGHT, link })
      g.put(L.x + 10 + barW, y, ']', { b: B_DIM, link })
      y++
    })
    if (!narrow) {
      const sx = L.x + barW + 14
      const por = team.filter((m) => m.designation).length
      const kv = (yy: number, k: string, v: string) => {
        g.text(sx, yy, k, { b: B_MID })
        g.text(sx + k.length, yy, v, { b: B_BRIGHT })
      }
      kv(L.y, 'Tasks: ', `${team.length} total, ${por} with a PoR, ${this.rows.length} shown`)
      kv(L.y + 1, 'Load average: ', '5000+ users across 3 fests')
      kv(L.y + 2, 'Uptime: ', `${batches.length} batches (${batches[0]}–${batches[batches.length - 1]})`)
      const vName = this.vert ? verticals.find((v) => v.id === this.vert)!.name : 'all verticals'
      kv(L.y + 3, 'Filter: ', vName)
      if (this.vert) {
        const desc = verticals.find((v) => v.id === this.vert)!.description
        const rows = wrapLine([{ t: desc }], L.x + L.w - sx)
        if (rows[0]) g.text(sx, L.y + 4, trunc(rows[0].map((c) => c.ch).join('') + (rows.length > 1 ? '…' : ''), L.x + L.w - sx), { b: B_DIM })
      }
    }
    y += 1

    // column header (inverse, clickable sort)
    const cols = narrow
      ? [
          { k: 'user' as SortKey, label: 'USER', w: L.w - 22 },
          { k: 'vert' as SortKey, label: 'VERT', w: 9 },
          { k: 'batch' as SortKey, label: 'BATCH', w: 6 },
          { k: 'cpu' as SortKey, label: '%CPU', w: 6 },
        ]
      : [
          { k: null, label: '  PID', w: 6 },
          { k: 'user' as SortKey, label: 'USER', w: 22 },
          { k: 'vert' as SortKey, label: 'VERT', w: 10 },
          { k: 'batch' as SortKey, label: 'BATCH', w: 7 },
          { k: null, label: 'PR', w: 4 },
          { k: 'cpu' as SortKey, label: ' %CPU', w: 7 },
          { k: null, label: 'TIME+', w: 9 },
          { k: null, label: 'COMMAND', w: Math.max(8, L.w - 65) },
        ]
    g.fill(L.x, y, L.w, 1, ' ', { b: B_MID, f: F_INV })
    let x = L.x
    for (const c of cols) {
      const active = c.k === this.sort
      const link = c.k ? e.link(() => this.setSort(c.k as SortKey)) : 0
      g.text(x, y, padR(c.label + (active ? '▼' : ''), c.w), { b: active ? B_BRIGHT : B_MID, f: F_INV, link })
      x += c.w
    }
    y++

    // process list
    const list: Rect = { x: L.x, y, w: L.w, h: L.y + L.h - y - 1 }
    this.listRect = list
    if (this.sel < this.scroll) this.scroll = this.sel
    if (this.sel >= this.scroll + list.h) this.scroll = this.sel - list.h + 1
    this.scroll = clamp(this.scroll, 0, Math.max(0, this.rows.length - list.h))
    const nowYear = new Date().getFullYear()
    for (let j = 0; j < list.h; j++) {
      const m = this.rows[this.scroll + j]
      if (!m) break
      const yy = list.y + j
      const on = this.scroll + j === this.sel
      const base = on ? { b: 190, f: F_INV } : { b: B_NORM }
      if (on) g.fill(L.x, yy, L.w, 1, ' ', base)
      const cpu = this.cpu.get(m) ?? 0
      const yrs = Math.max(0, nowYear - (m.batch || nowYear))
      const cells = narrow
        ? [trunc(m.name.toLowerCase(), cols[0].w - 1), m.vertical, String(m.batch || ''), cpu.toFixed(1)]
        : [
            padL(String(PID.get(m)), 5) + ' ',
            trunc(m.slug, 21),
            m.vertical,
            String(m.batch || '-'),
            m.designation ? 'RT' : '20',
            padL(cpu.toFixed(1), 5),
            `${yrs}y:${String(Math.floor(hash(PID.get(m)!) * 60)).padStart(2, '0')}.00`,
            trunc(m.designation ?? `dvm --team=${m.vertical}`, cols[cols.length - 1].w),
          ]
      x = L.x
      cells.forEach((v, i) => {
        const dim = !on && (i === 0 || i === 4 || i === 6) && !narrow
        const hot = !on && i === 7 && !!m.designation
        g.text(x, yy, v, { b: dim ? B_DIM : hot ? B_BRIGHT : base.b, f: base.f }, cols[i].w)
        x += cols[i].w
      })
    }

    // htop function bar
    const fy = L.y + L.h - 1
    const keys: [string, string, () => void][] = [
      ['F1', 'All', () => this.setVert(e, '')],
      ...verticals.map((v, i) => [`F${i + 2}`, v.label, () => this.setVert(e, v.id)] as [string, string, () => void]),
      ['F10', 'Quit', () => e.go('')],
    ]
    x = L.x
    for (const [k, label, fn] of keys) {
      if (x + k.length + label.length + 1 > L.x + L.w) break
      const link = e.link(fn)
      x = g.text(x, fy, k, { b: B_BRIGHT, link })
      x = g.text(x, fy, padR(label, narrow ? label.length + 1 : 9), { b: B_MID, f: F_INV, link })
    }

    if (portraitW) this.drawPortrait(e, { x: r.x + r.w - portraitW, y: r.y, w: portraitW, h: r.h })
  }

  private drawPortrait(e: Engine, R: Rect) {
    const g = e.main
    const m = this.rows[this.sel]
    g.box(R.x, R.y, R.w, R.h, { b: B_DIM }, m ? `/proc/${PID.get(m)}` : '/proc', true)
    if (!m) return
    const iw = R.w - 4
    const ph = Math.min(R.h - 12, Math.round((iw * e.cw) / e.ch))
    drawImage(e, m.photo, { x: R.x + 2, y: R.y + 1, w: iw, h: ph }, undefined, { focusY: 0.3, gamma: 0.85 })
    let y = R.y + ph + 2
    const bottom = R.y + R.h - 1
    const put = (t: string, b: number) => {
      for (const row of wrapLine([{ t }], iw)) {
        if (y >= bottom) return
        g.text(R.x + 2, y++, row.map((c) => c.ch).join(''), { b })
      }
    }
    put(m.name, B_BRIGHT)
    put(verticals.find((v) => v.id === m.vertical)?.name ?? m.vertical, B_NORM)
    put(m.batch ? `batch of ${m.batch}` : 'batch unknown', B_MID)
    if (m.designation) put(m.designation, B_BRIGHT)
    y++
    const s = m.socials
    const links: [string, string | undefined][] = [
      ['github', s.github],
      ['linkedin', s.linkedin],
      ['instagram', s.instagram],
      ['dribbble', s.dribbble],
      ['behance', s.behance],
      ['twitter', s.twitter],
    ]
    let x = R.x + 2
    for (const [k, url] of links) {
      if (!url) continue
      const label = `[ ${k} ]`
      if (x + label.length > R.x + R.w - 2) {
        x = R.x + 2
        y++
      }
      if (y >= bottom) break
      x = g.text(x, y, label, { b: B_NORM, link: e.link(() => window.open(url, '_blank', 'noopener')) }) + 1
    }
  }
}
