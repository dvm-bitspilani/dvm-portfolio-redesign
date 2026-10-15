import { artworks, blogs, projects, team, verticals } from '../../../data'
import { drawLogo } from '../../../shared/logo'
import { CellSampler } from './cells'
import type { Engine } from './engine'
import { B_BRIGHT, B_DIM, B_MID, B_NORM, F_BLINK, F_INV } from './grid'

interface Step {
  t: number
  dur: number
  /** label (left) and value (right, revealed with dots) */
  render: (p: number, narrow: boolean) => { text: string; b?: number; ok?: boolean }
}

const builds = projects.filter((p) => p.kind !== 'video').length
const videos = projects.length - builds
const batches = [...new Set(team.map((m) => m.batch).filter(Boolean))].sort()
const festCount = (f: string) => projects.filter((p) => p.fest === f).length

function dots(label: string, width: number, p: number) {
  const n = Math.max(2, width - label.length)
  return label + ' ' + '.'.repeat(Math.floor((n - 1) * Math.min(1, p)))
}

function buildSteps(): Step[] {
  const s: Step[] = []
  let t = 0.15
  const add = (dur: number, render: Step['render'], gap = 0.09) => {
    s.push({ t, dur, render })
    t += dur + gap
  }
  const line = (text: string, b = B_NORM) => () => ({ text, b })
  add(0, line('DVM BIOS v26.10, a phosphor-powered terminal', B_BRIGHT))
  add(0, line('Copyright (C) 2017-2026 Department of Visual Media, BITS Pilani', B_MID))
  add(0, line(''), 0.2)
  add(0, (_p, n) => ({ text: n ? 'CPU  : 5 teams' : `Main Processor : 5 teams (${verticals.map((v) => v.label).join(', ')})` }))
  add(0.75, (p, n) => {
    const v = Math.floor(team.length * Math.min(1, p * 1.1))
    return { text: `${n ? 'MEM  : ' : 'Memory Testing : '}${String(v).padStart(3, ' ')} members${p >= 1 ? ' OK' : ''}`, b: B_BRIGHT }
  })
  add(0.4, (p, n) => {
    const k = Math.ceil(batches.length * p)
    return { text: (n ? 'BAT  : ' : 'Batches        : ') + batches.slice(0, k).join(' ') }
  })
  add(0, line(''), 0.12)
  add(0.25, (p) => ({ text: 'Detecting fests' + '.'.repeat(Math.floor(p * 3)) }))
  const fests: [string, string, string, string][] = [
    ['Primary Master  ', 'BOSM  ', 'open sports meet, since 1986', 'BOSM'],
    ['Primary Slave   ', 'Oasis ', '96 hours of culture', 'Oasis'],
    ['Secondary Master', 'APOGEE', 'technical extravaganza', 'APOGEE'],
    ['Secondary Slave ', 'Campus', 'portals & tools', 'Campus'],
  ]
  for (const [slot, name, desc, id] of fests)
    add(0.32, (p, n) => {
      const label = n ? `  ${name} ${festCount(id)} builds` : `  ${slot} : ${name} ${desc}`
      return { text: dots(label, n ? 30 : 62, p) + (p >= 1 ? ' OK' : ''), ok: p >= 1 }
    })
  add(0, line(''), 0.1)
  add(0.4, (p, n) => ({ text: dots(n ? `/work ${projects.length}` : `Mounting /work     ${projects.length} projects (${builds} builds, ${videos} videos)`, n ? 30 : 62, p) + (p >= 1 ? ' OK' : '') }))
  add(0.35, (p, n) => ({ text: dots(n ? `/journal ${blogs.length + artworks.length}` : `Mounting /journal  ${blogs.length} posts, ${artworks.length} artworks`, n ? 30 : 62, p) + (p >= 1 ? ' OK' : '') }))
  add(0.35, (p, n) => ({ text: dots(n ? 'users 5000+' : 'Load average       5000+ users on our apps and websites', n ? 30 : 62, p) + (p >= 1 ? ' OK' : '') }))
  add(0, line(''), 0.15)
  add(0.3, (p) => ({ text: 'Starting dvmsh' + '.'.repeat(Math.floor(p * 3)), b: B_NORM }))
  add(0, line('We solemnly swear that we are upto no good.', B_BRIGHT), 0.7)
  return s
}

export class Boot {
  private e: Engine
  private t = 0
  private steps = buildSteps()
  private end: number
  private logo: { glyph: Uint8Array; tone: Uint8Array; cols: number; rows: number } | null = null

  constructor(e: Engine) {
    this.e = e
    const last = this.steps[this.steps.length - 1]
    this.end = last.t + last.dur + 0.75
    if (e.reduced) this.t = this.end - 1.2
  }

  skip() {
    this.e.finishBoot()
  }

  private ensureLogo(cols: number, rows: number) {
    if (this.logo && this.logo.cols === cols && this.logo.rows === rows) return this.logo
    const e = this.e
    const sx = e.imgSX
    const sy = e.imgSY
    const W = cols * sx
    const H = rows * sy
    const c = document.createElement('canvas')
    c.width = W
    c.height = H
    const ctx = c.getContext('2d', { willReadFrequently: true })!
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, W, H)
    // pixels are not square: squash x by the cell aspect
    const pxAspect = e.fch / sy / (e.fcw / sx)
    ctx.save()
    ctx.scale(pxAspect, 1)
    drawLogo(ctx, W / 2 / pxAspect, H / 2, H * 0.92, '#fff')
    ctx.restore()
    const d = ctx.getImageData(0, 0, W, H).data
    const lum = new Float32Array(W * H)
    for (let i = 0; i < lum.length; i++) lum[i] = d[i * 4] / 255
    const s = new CellSampler()
    s.load(lum, W, H)
    const glyph = new Uint8Array(cols * rows)
    const tone = new Uint8Array(cols * rows)
    s.run(cols, rows, sx, sy, e.matcher, (x, y, g, t) => {
      glyph[y * cols + x] = g
      tone[y * cols + x] = t
    })
    this.logo = { glyph, tone, cols, rows }
    return this.logo
  }

  draw(dt: number) {
    const e = this.e
    this.t += dt
    if (this.t >= this.end) {
      this.e.finishBoot()
      return
    }
    const g = e.main
    const n = e.narrow
    const x0 = n ? 1 : 3
    let y = n ? 1 : 2
    for (const s of this.steps) {
      if (this.t < s.t) break
      const p = s.dur > 0 ? Math.min(1, (this.t - s.t) / s.dur) : 1
      const r = s.render(p, n)
      g.text(x0, y, r.text, { b: r.b ?? B_NORM }, g.cols - x0 - 1)
      y++
      if (y >= g.rows - 2) break
    }
    // blinking cursor on the line being written
    g.put(x0, y, '_', { b: B_BRIGHT, f: F_BLINK })

    // "energy star" logo, top right
    if (!n) {
      const lw = 16
      const lh = 9
      const lx = g.cols - lw - 3
      const ly = 2
      const fc = e.toFineX(lx + lw) - e.toFineX(lx)
      const fr = e.toFineY(ly + lh) - e.toFineY(ly)
      const L = this.ensureLogo(fc, fr)
      const fx = e.toFineX(lx)
      const fy = e.toFineY(ly)
      const reveal = Math.min(1, this.t / 0.9)
      for (let j = 0; j < L.rows; j++) {
        if (j / L.rows > reveal) break
        for (let i = 0; i < L.cols; i++) {
          const k = j * L.cols + i
          if (L.glyph[k]) e.fine.set(fx + i, fy + j, L.glyph[k], 120 + L.tone[k] * 0.5)
        }
      }
      g.text(lx, ly + lh, '  visual media  ', { b: B_DIM })
    }

    const msg = n ? 'tap or press any key to skip' : 'Press DEL to enter SETUP, any key to skip'
    g.text(x0, g.rows - 1, msg, { b: B_MID })
    if (!n) {
      const id = `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-DVM-BITS-PILANI-2026`
      g.textR(g.cols - 3, g.rows - 1, id, { b: B_DIM })
    }
    // skip chip (clickable)
    const link = e.link(() => this.skip())
    g.textR(g.cols - (n ? 1 : 3), n ? 0 : 1, '[ skip ]', { b: B_BRIGHT, f: F_INV, link })
  }
}
