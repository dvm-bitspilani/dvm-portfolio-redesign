// The constellation engine: sim + renderer + camera + input + labels, one rAF loop.
// React only talks to it through setFocus / setInsets / zoomBy / fit and the callbacks.
import * as THREE from 'three'
import { GraphRenderer } from './renderer'
import { LAYOUT_EDGE_VIS, Sim, type Layout } from './sim'
import { COLORS, type GNode, type Graph } from './model'

export interface Focus {
  layout: Layout
  /** Node ids to frame ('all' = every visible node). */
  frame: 'all' | string[]
  /** Minimum framed span in world units (so a single node keeps some context). */
  frameMin?: number
  selected: string | null
  /** The route's cluster: these stay lit, everything else dims. */
  emphasis: string[] | null
  guides: { people: number; work: number; spiral: number }
}

export interface Insets {
  top: number
  right: number
  bottom: number
  left: number
}

export interface CorePose {
  x: number
  y: number
  /** Mark height in css px. */
  h: number
  opacity: number
}

export interface EngineOptions {
  reduced: boolean
  compact: boolean
  labelLayer: HTMLElement
  onSelect: (n: GNode) => void
  onCore: (p: CorePose) => void
  onHover?: (n: GNode | null) => void
  /** true once the visitor pans/zooms away from the focus framing, false when it is re-framed. */
  onExplore?: (exploring: boolean) => void
}

const MAX_SCALE = 4.6
const PIC = 96
/** Largest on-screen radius of a node glyph (the mark is exempt). */
const MAX_PX = 26
const MIN_SCALE = 0.12

interface Slot {
  el: HTMLDivElement
  t: HTMLSpanElement
  s: HTMLSpanElement
  node: number
  cls: string
  x: number
  y: number
  o: number
  sub: boolean
  side: number
}

/** Pooled DOM labels (no React per frame). */
class Labels {
  slots: Slot[] = []
  bySlot = new Map<number, Slot>()
  constructor(readonly root: HTMLElement, size: number) {
    for (let k = 0; k < size; k++) {
      const el = document.createElement('div')
      el.className = 'v6-label'
      el.setAttribute('aria-hidden', 'true')
      const t = document.createElement('span')
      t.className = 'v6-label-t'
      const s = document.createElement('span')
      s.className = 'v6-label-s'
      el.append(t, s)
      el.style.opacity = '0'
      root.appendChild(el)
      this.slots.push({ el, t, s, node: -1, cls: '', x: -1, y: -1, o: 0, sub: false, side: 1 })
    }
  }
  dispose() {
    for (const s of this.slots) s.el.remove()
  }
}

interface Pic {
  el: HTMLDivElement
  img: HTMLImageElement
  node: number
  x: number
  y: number
  k: number
  o: number
}

/** Pooled DOM images: up close, nodes resolve into their portrait / cover / artwork. */
class Pics {
  slots: Pic[] = []
  constructor(readonly root: HTMLElement, size: number) {
    for (let k = 0; k < size; k++) {
      const el = document.createElement('div')
      el.className = 'v6-pic'
      el.setAttribute('aria-hidden', 'true')
      const img = document.createElement('img')
      img.alt = ''
      img.decoding = 'async'
      img.draggable = false
      el.appendChild(img)
      el.style.opacity = '0'
      root.appendChild(el)
      this.slots.push({ el, img, node: -1, x: 0, y: 0, k: 0, o: 0 })
    }
  }
  dispose() {
    for (const s of this.slots) s.el.remove()
  }
}

export function imageOf(nd: GNode): string | null {
  if (nd.member) return nd.member.photo
  if (nd.project) return nd.project.cover || nd.project.mockup || null
  if (nd.blog) return nd.blog.cover
  if (nd.art) return nd.art.image
  return null
}

const tmp = new THREE.Vector3()

export class GraphEngine {
  readonly g: Graph
  readonly sim: Sim
  readonly r: GraphRenderer
  private container: HTMLElement
  private opts: EngineOptions
  private labels: Labels
  private pics: Pics
  private picA: Float32Array
  private srcs: (string | null)[]
  private n: number

  cam = { x: 0, y: 0, s: 0.6 }
  private goal: { x: number; y: number; s: number } | null = null
  private follow = false
  private vel = { x: 0, y: 0 }
  private tilt = { x: 0, y: 0, tx: 0, ty: 0 }
  private insets: Insets = { top: 0, right: 0, bottom: 0, left: 0 }
  private focus: Focus = { layout: 'constellation', frame: 'all', selected: null, emphasis: null, guides: { people: 0, work: 0, spiral: 0 } }
  private guideA = { people: 0, work: 0, spiral: 0 }
  private square = 0

  private sel = -1
  private hover = -1
  private alpha: Float32Array
  private glow: Float32Array
  private lab: Float32Array
  private emph: Uint8Array
  private nbSel: Uint8Array
  private nbHover: Uint8Array
  private edgeA: Float32Array
  sx: Float32Array
  sy: Float32Array
  spx: Float32Array
  private widths: Float32Array
  private chosen: Uint8Array
  private order: number[] = []
  private rings: { parent: number; r: number; set: 'people' | 'work' }[] = []

  private raf = 0
  private lastT = 0
  private time = 0
  private onScreen = true
  private dirty = 3
  private disposed = false
  private ro: ResizeObserver
  private io: IntersectionObserver
  private pointers = new Map<number, { x: number; y: number }>()
  private drag: { x0: number; y0: number; lx: number; ly: number; lt: number; moved: boolean; touch: boolean } | null = null
  private pinch: { d0: number; s0: number; wx: number; wy: number } | null = null
  private keys = new Set<string>()
  private coreFade = 0

  constructor(container: HTMLElement, canvas: HTMLCanvasElement, sim: Sim, opts: EngineOptions) {
    this.container = container
    this.sim = sim
    this.g = sim.g
    this.opts = opts
    const n = (this.n = this.g.nodes.length)
    this.alpha = new Float32Array(n)
    this.glow = new Float32Array(n)
    this.lab = new Float32Array(n)
    this.emph = new Uint8Array(n)
    this.nbSel = new Uint8Array(n)
    this.nbHover = new Uint8Array(n)
    this.sx = new Float32Array(n)
    this.sy = new Float32Array(n)
    this.spx = new Float32Array(n)
    this.chosen = new Uint8Array(n)
    this.edgeA = new Float32Array(this.g.edges.length)
    this.widths = new Float32Array(n)

    // orbit guides: one ring per (vertical, batch) and (fest, ring)
    const seen = new Set<string>()
    for (const nd of this.g.nodes) {
      if (nd.parent < 0) continue
      const pk = this.g.nodes[nd.parent].kind
      if (pk !== 'vertical' && pk !== 'fest') continue
      const key = `${nd.parent}:${nd.orbitR}`
      if (seen.has(key)) continue
      seen.add(key)
      this.rings.push({ parent: nd.parent, r: nd.orbitR, set: pk === 'vertical' ? 'people' : 'work' })
    }

    this.r = new GraphRenderer(canvas, n, this.g.edges.length, this.rings.length * 48 + 200)
    this.pics = new Pics(opts.labelLayer, opts.compact ? 16 : 40)
    this.labels = new Labels(opts.labelLayer, opts.compact ? 22 : 64)
    this.picA = new Float32Array(n)
    this.srcs = this.g.nodes.map(imageOf)
    this.measureLabels()
    document.fonts?.ready.then(() => !this.disposed && this.measureLabels())

    for (let i = 0; i < n; i++) this.alpha[i] = sim.vis[i]
    sim.rotate = !opts.reduced

    const rect = container.getBoundingClientRect()
    this.r.resize(rect.width, rect.height)
    this.ro = new ResizeObserver(() => {
      const b = container.getBoundingClientRect()
      this.r.resize(b.width, b.height)
      if (this.follow || this.goal) this.retarget(true)
      this.dirty = 3
    })
    this.ro.observe(container)
    this.io = new IntersectionObserver(([e]) => {
      this.onScreen = e.isIntersecting
      if (this.onScreen) this.kick()
    })
    this.io.observe(container)

    canvas.addEventListener('pointerdown', this.onDown)
    canvas.addEventListener('pointermove', this.onMove)
    canvas.addEventListener('pointerup', this.onUp)
    canvas.addEventListener('pointercancel', this.onUp)
    canvas.addEventListener('pointerleave', this.onLeave)
    canvas.addEventListener('wheel', this.onWheel, { passive: false })
    container.addEventListener('keydown', this.onKey)
    container.addEventListener('keyup', this.onKeyUp)
    container.addEventListener('blur', this.onBlur, true)
    document.addEventListener('visibilitychange', this.onVis)
    this.kick()
  }

  // ------------------------------------------------------------------ public API

  /** First frame: either the intro burst (nodes thrown out of the mark) or straight to the focus. */
  start(focus: Focus, intro: boolean) {
    this.applyFocus(focus)
    const fit = this.fitFor(focus)
    if (intro && !this.opts.reduced) {
      this.sim.burst()
      for (let i = 0; i < this.n; i++) this.alpha[i] = 0
      this.cam = { x: 0, y: 0, s: Math.min(MAX_SCALE, fit.s * 2) }
      this.introUntil = performance.now() + 1900
      this.goal = fit
      this.follow = true
    } else {
      if (this.opts.reduced) this.sim.snap()
      this.cam = { ...this.fitFor(focus) }
      this.goal = null
      this.follow = true
      for (let i = 0; i < this.n; i++) this.alpha[i] = this.targetAlpha(i)
    }
    this.kick()
  }

  setFocus(focus: Focus) {
    this.setExploring(false)
    const layoutChanged = focus.layout !== this.sim.layout
    this.applyFocus(focus)
    if (layoutChanged && this.opts.reduced) this.sim.snap()
    this.follow = true
    this.retarget(this.opts.reduced)
    this.kick()
  }

  setInsets(i: Insets) {
    const same = i.top === this.insets.top && i.right === this.insets.right && i.bottom === this.insets.bottom && i.left === this.insets.left
    this.insets = i
    if (!same && (this.follow || this.goal)) this.retarget(this.opts.reduced)
    this.kick()
  }

  zoomBy(f: number) {
    const W = this.r.width, H = this.r.height
    this.zoomAt(W / 2, H / 2, f)
  }

  /** Light up a node's neighbourhood from outside the canvas (list hover, search results). */
  preview(id: string | null) {
    const nd = id ? this.g.byId.get(id) : null
    this.setHover(nd ? nd.i : -1)
  }

  /** Re-frame the current focus. */
  fit() {
    this.setExploring(false)
    this.follow = true
    this.retarget(this.opts.reduced)
    this.kick()
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    this.ro.disconnect()
    this.io.disconnect()
    const c = this.r.canvas
    c.removeEventListener('pointerdown', this.onDown)
    c.removeEventListener('pointermove', this.onMove)
    c.removeEventListener('pointerup', this.onUp)
    c.removeEventListener('pointercancel', this.onUp)
    c.removeEventListener('pointerleave', this.onLeave)
    c.removeEventListener('wheel', this.onWheel)
    this.container.removeEventListener('keydown', this.onKey)
    this.container.removeEventListener('keyup', this.onKeyUp)
    this.container.removeEventListener('blur', this.onBlur, true)
    document.removeEventListener('visibilitychange', this.onVis)
    this.labels.dispose()
    this.pics.dispose()
    this.r.dispose()
  }

  // ------------------------------------------------------------------ focus

  private applyFocus(f: Focus) {
    this.focus = f
    this.sim.setLayout(f.layout)
    this.emph.fill(f.emphasis ? 0 : 1)
    if (f.emphasis) for (const id of f.emphasis) {
      const nd = this.g.byId.get(id)
      if (nd) this.emph[nd.i] = 1
    }
    this.emph[this.g.core.i] = 1
    const s = f.selected ? this.g.byId.get(f.selected) : null
    this.sel = s ? s.i : -1
    this.neighbours(this.sel, this.nbSel)
    this.neighbours(this.hover, this.nbHover)
  }

  private neighbours(i: number, out: Uint8Array) {
    out.fill(0)
    if (i < 0) return
    const vis = LAYOUT_EDGE_VIS[this.sim.layout]
    for (const k of this.g.edgesOf[i]) {
      const e = this.g.edges[k]
      if (vis[e.kind] <= 0 && !(e.kind === 'time' && this.sim.layout === 'legacy')) continue
      out[e.a === i ? e.b : e.a] = 1
    }
  }

  private frameSet(f: Focus): number[] {
    if (f.frame === 'all') {
      const out: number[] = []
      for (let i = 0; i < this.n; i++) if (this.sim.vis[i] > 0.5) out.push(i)
      return out
    }
    const out: number[] = []
    for (const id of f.frame) {
      const nd = this.g.byId.get(id)
      if (nd) out.push(nd.i)
    }
    return out.length ? out : [this.g.core.i]
  }

  private fitFor(f: Focus) {
    const set = this.frameSet(f)
    const { x, y } = this.sim
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
    for (const i of set) {
      const r = this.g.nodes[i].r
      x0 = Math.min(x0, x[i] - r); x1 = Math.max(x1, x[i] + r)
      y0 = Math.min(y0, y[i] - r); y1 = Math.max(y1, y[i] + r)
    }
    const min = f.frameMin ?? 120
    let cx = (x0 + x1) / 2, cy = (y0 + y1) / 2
    const bw = Math.max(min, x1 - x0), bh = Math.max(min, y1 - y0)
    // centre on the selected node when there is one
    if (this.sel >= 0 && f.frame !== 'all' && set.length <= 2) {
      cx = x[this.sel]; cy = y[this.sel]
    }
    const W = this.r.width, H = this.r.height
    const ins = this.insets
    const pad = this.opts.compact ? 18 : 48
    const aw = Math.max(80, W - ins.left - ins.right - pad * 2)
    const ah = Math.max(80, H - ins.top - ins.bottom - pad * 2)
    const s = Math.max(MIN_SCALE, Math.min(MAX_SCALE * 0.6, Math.min(aw / bw, ah / bh)))
    const acx = ins.left + pad + aw / 2, acy = ins.top + pad + ah / 2
    return { x: cx - (acx - W / 2) / s, y: cy - (acy - H / 2) / s, s }
  }

  private retarget(instant: boolean) {
    const fit = this.fitFor(this.focus)
    if (instant) {
      this.cam = { ...fit }
      this.goal = null
      this.dirty = 3
    } else this.goal = fit
  }

  // ------------------------------------------------------------------ loop

  private kick() {
    this.dirty = Math.max(this.dirty, 2)
    if (!this.raf && !this.disposed) {
      this.lastT = performance.now()
      this.raf = requestAnimationFrame(this.frame)
    }
  }

  private onVis = () => {
    if (!document.hidden) this.kick()
  }

  private frame = (now: number) => {
    this.raf = 0
    if (this.disposed || document.hidden || !this.onScreen) return
    const dt = Math.min(0.05, Math.max(0.001, (now - this.lastT) / 1000))
    this.lastT = now
    const reduced = this.opts.reduced
    if (!reduced) this.time += dt

    // sim (orbits pause under the cursor so targets hold still)
    this.sim.rotate = !reduced && this.hover < 0 && !this.drag
    const simMoving = !reduced || this.sim.energy() > 0.002
    if (simMoving) this.sim.step(dt)

    const camMoving = this.updateCamera(dt)
    const fading = this.updateAlphas(dt)

    if (reduced && !camMoving && !fading && this.dirty <= 0 && !simMoving) {
      return // idle: wait for the next kick
    }
    this.dirty = Math.max(0, this.dirty - 1)
    this.draw()
    this.raf = requestAnimationFrame(this.frame)
  }

  private updateCamera(dt: number) {
    const c = this.cam
    let moving = false
    // keyboard pan
    if (this.keys.size) {
      const sp = (520 * dt) / c.s
      if (this.keys.has('ArrowLeft')) c.x -= sp
      if (this.keys.has('ArrowRight')) c.x += sp
      if (this.keys.has('ArrowUp')) c.y -= sp
      if (this.keys.has('ArrowDown')) c.y += sp
      moving = true
    }
    if (this.follow) this.goal = this.fitFor(this.focus)
    if (this.goal) {
      const k = this.opts.reduced ? 1 : 1 - Math.exp(-dt * 3.4)
      const g = this.goal
      c.x += (g.x - c.x) * k
      c.y += (g.y - c.y) * k
      c.s = Math.exp(Math.log(c.s) + (Math.log(g.s) - Math.log(c.s)) * k)
      const done = Math.abs(g.x - c.x) * c.s < 0.3 && Math.abs(g.y - c.y) * c.s < 0.3 && Math.abs(g.s / c.s - 1) < 0.002
      if (done && !this.follow) this.goal = null
      moving = moving || !done
    }
    if (!this.drag && (this.vel.x || this.vel.y)) {
      c.x += this.vel.x * dt
      c.y += this.vel.y * dt
      const d = Math.exp(-dt * 4.2)
      this.vel.x *= d
      this.vel.y *= d
      if (Math.hypot(this.vel.x, this.vel.y) * c.s < 4) this.vel.x = this.vel.y = 0
      moving = true
    }
    // pointer parallax tilt
    const t = this.tilt
    if (!this.opts.reduced) {
      const k = 1 - Math.exp(-dt * 2.5)
      t.x += (t.tx - t.x) * k
      t.y += (t.ty - t.y) * k
    }
    return moving
  }

  private targetAlpha(i: number) {
    let a = this.sim.vis[i]
    if (i === this.g.core.i) return 1
    if (this.sel >= 0) a *= i === this.sel || this.nbSel[i] ? 1 : 0.3
    else if (!this.emph[i]) a *= 0.26
    if (this.hover >= 0) a *= i === this.hover || this.nbHover[i] ? 1 : 0.2
    return a
  }

  private updateAlphas(dt: number) {
    const k = this.opts.reduced ? 1 : 1 - Math.exp(-dt * 7)
    let fading = false
    for (let i = 0; i < this.n; i++) {
      const ta = this.targetAlpha(i)
      const tg = i === this.sel ? 1 : i === this.hover ? 0.95 : this.nbHover[i] ? 0.45 : this.nbSel[i] ? 0.28 : 0
      const da = ta - this.alpha[i], dg = tg - this.glow[i]
      this.alpha[i] += da * k
      this.glow[i] += dg * k
      if (Math.abs(da) > 0.004 || Math.abs(dg) > 0.004) fading = true
    }
    const G = this.focus.guides
    const gk = this.opts.reduced ? 1 : 1 - Math.exp(-dt * 3)
    const ga = this.guideA
    ga.people += (G.people - ga.people) * gk
    ga.work += (G.work - ga.work) * gk
    ga.spiral += ((this.sim.layout === 'legacy' ? G.spiral : 0) - ga.spiral) * gk
    const sq = this.sim.layout === 'grid' ? 1 : 0
    this.square += (sq - this.square) * gk
    if (Math.abs(sq - this.square) > 0.004) fading = true
    return fading
  }

  // ------------------------------------------------------------------ draw

  private draw() {
    const { g, sim, r } = this
    const { x, y } = sim
    const flat = 1 - this.square
    const reduced = this.opts.reduced

    r.setView(this.cam.x, this.cam.y, this.cam.s, this.tilt.x, this.tilt.y)
    r.setLook(this.opts.compact ? 1.5 : 1.7, this.square, this.opts.compact ? 3.5 : 5, 1 - this.square * 0.6)

    // nodes
    const P = r.nodePos, D = r.nodeData, C = r.nodeColor
    for (const nd of g.nodes) {
      const i = nd.i
      P[i * 3] = x[i]; P[i * 3 + 1] = -y[i]; P[i * 3 + 2] = nd.z * flat
      const isCore = nd.kind === 'core'
      D[i * 4] = isCore ? nd.r * (1 - this.square * 0.7) : nd.r
      D[i * 4 + 1] = isCore ? (this.square > 0.5 ? 0 : 5) : nd.shape
      D[i * 4 + 2] = isCore ? 0.9 * (1 - this.square) : this.alpha[i]
      D[i * 4 + 3] = this.glow[i]
      C[i * 3] = nd.color[0]; C[i * 3 + 1] = nd.color[1]; C[i * 3 + 2] = nd.color[2]
    }
    r.commitNodes()

    // edges
    const vis = LAYOUT_EDGE_VIS[sim.layout]
    const E = r.edges
    let ec = 0
    const kEase = reduced ? 1 : 0.12
    g.edges.forEach((e, k) => {
      let target = 0
      const lv = e.kind === 'time' ? 0 : vis[e.kind]
      const hot = (this.hover >= 0 && (e.a === this.hover || e.b === this.hover)) || (this.sel >= 0 && (e.a === this.sel || e.b === this.sel))
      if (lv > 0) {
        target = e.alpha * lv * Math.min(this.alpha[e.a], this.alpha[e.b])
        if (hot) {
          const cap = e.kind === 'built' ? 0.32 : 1
          target = Math.min(cap, Math.max(target * 2.8, 0.55 * lv * Math.min(this.alpha[e.a], this.alpha[e.b])))
        }
      }
      this.edgeA[k] += (target - this.edgeA[k]) * kEase
      const a = this.edgeA[k]
      if (a < 0.004) return
      const na = g.nodes[e.a], nb = g.nodes[e.b]
      const col = e.kind === 'year' ? COLORS.copper : e.kind === 'author' || e.kind === 'artist' ? COLORS.pale : COLORS.teal
      E.set(ec++, x[e.a], y[e.a], na.z * flat, x[e.b], y[e.b], nb.z * flat, col[0], col[1], col[2], a, hot ? 1.7 : 1.05, reduced ? 0 : e.pulse, e.phase)
    })
    E.commit(ec)

    // guides
    const Gd = r.guides
    let gc = 0
    const ga = this.guideA
    for (const ring of this.rings) {
      const a = (ring.set === 'people' ? ga.people : ga.work) * Math.min(1, this.alpha[ring.parent] + 0.2)
      if (a < 0.01) continue
      const px = x[ring.parent], py = y[ring.parent]
      const SEG = 48
      for (let s = 0; s < SEG; s++) {
        const a0 = (s / SEG) * Math.PI * 2, a1 = ((s + 1) / SEG) * Math.PI * 2
        Gd.set(gc++, px + Math.cos(a0) * ring.r, py + Math.sin(a0) * ring.r, 0, px + Math.cos(a1) * ring.r, py + Math.sin(a1) * ring.r, 0, 0.27, 0.9, 1, a * 0.13, 0.8)
      }
    }
    if (ga.spiral > 0.01) {
      const pts: [number, number][] = [[0, 0], ...g.years.map((yn) => [x[yn.i], y[yn.i]] as [number, number])]
      const STEPS = 14
      const total = (pts.length - 1) * STEPS
      let prev = pts[0]
      let k = 0
      for (let s = 0; s < pts.length - 1; s++) {
        const p0 = pts[Math.max(0, s - 1)], p1 = pts[s], p2 = pts[s + 1], p3 = pts[Math.min(pts.length - 1, s + 2)]
        for (let t = 1; t <= STEPS; t++) {
          const u = t / STEPS, u2 = u * u, u3 = u2 * u
          const cx = 0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * u + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * u2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * u3)
          const cy = 0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3)
          const c = COLORS.copper
          Gd.set(gc++, prev[0], prev[1], 0, cx, cy, 0, c[0], c[1], c[2], ga.spiral * 0.75, 1.6, reduced ? 0 : 0.045, 0, total, k)
          prev = [cx, cy]
          k++
        }
      }
    }
    Gd.commit(gc)

    r.render(this.time)
    this.project()
    this.placePics()
    this.placeLabels()
    this.poseCore()
  }

  private project() {
    const cam = this.r.camera
    const W = this.r.width, H = this.r.height
    const D = cam.position.z
    const flat = 1 - this.square
    const { x, y } = this.sim
    for (const nd of this.g.nodes) {
      const i = nd.i
      const z = nd.z * flat
      tmp.set(x[i], -y[i], z).project(cam)
      this.sx[i] = (tmp.x * 0.5 + 0.5) * W
      this.sy[i] = (-tmp.y * 0.5 + 0.5) * H
      const persp = D / Math.max(1, D - z)
      const r = nd.kind === 'core' ? nd.r : nd.r + (13 - nd.r) * this.square
      const px = Math.max(r * this.cam.s * persp, this.opts.compact ? 1.5 : 1.7)
      this.spx[i] = nd.kind === 'core' ? px : Math.min(px, MAX_PX)
    }
  }

  private poseCore() {
    const c = this.g.core.i
    const h = this.spx[c] * 2.9
    const target = this.square > 0.5 ? 0 : 1
    this.coreFade += (target - this.coreFade) * (this.opts.reduced ? 1 : 0.15)
    this.opts.onCore({ x: this.sx[c], y: this.sy[c], h, opacity: this.coreFade })
  }

  // ------------------------------------------------------------------ pictures

  private placePics() {
    const W = this.r.width, H = this.r.height
    const P = this.pics.slots
    const grid = this.square > 0.5
    const min = this.opts.compact ? 8 : 9
    // targets
    const want: number[] = []
    if (!grid && performance.now() >= this.introUntil) {
      for (let i = 0; i < this.n; i++) {
        if (!this.srcs[i] || this.alpha[i] < 0.3) continue
        const r = this.spx[i]
        if (r < min) continue
        const x = this.sx[i], y = this.sy[i]
        if (x < -r || x > W + r || y < -r || y > H + r) continue
        want.push(i)
      }
      want.sort((a, b) => this.spx[b] - this.spx[a])
      want.length = Math.min(want.length, P.length)
    }
    const on = new Uint8Array(this.n)
    for (const i of want) on[i] = 1
    const k = this.opts.reduced ? 1 : 0.18
    for (let i = 0; i < this.n; i++) {
      const t = on[i] ? Math.min(1, (this.spx[i] - min) / 4 + 0.25) : 0
      this.picA[i] += (t - this.picA[i]) * k
    }
    // keep slots stable
    for (const s of P) if (s.node >= 0 && this.picA[s.node] < 0.02) s.node = -1
    const held = new Set(P.filter((s) => s.node >= 0).map((s) => s.node))
    let free = 0
    for (const i of want) {
      if (held.has(i)) continue
      while (free < P.length && P[free].node !== -1) free++
      if (free >= P.length) break
      const s = P[free]
      s.node = i
      const src = this.srcs[i]!
      if (s.img.getAttribute('src') !== src) s.img.src = src
      s.el.dataset.kind = this.g.nodes[i].kind
      held.add(i)
    }
    for (const s of P) {
      if (s.node < 0) {
        if (s.o) {
          s.el.style.opacity = '0'
          s.o = 0
        }
        continue
      }
      const i = s.node
      const r = this.spx[i] * (this.g.nodes[i].kind === 'member' ? 1 : 1.15)
      const sc = Math.round(((2 * r) / PIC) * 1000) / 1000
      const x = Math.round(this.sx[i] * 2) / 2, y = Math.round(this.sy[i] * 2) / 2
      if (x !== s.x || y !== s.y || sc !== s.k) {
        s.el.style.transform = `translate3d(${x - PIC / 2}px, ${y - PIC / 2}px, 0) scale(${sc})`
        s.x = x; s.y = y; s.k = sc
      }
      const o = Math.round(this.picA[i] * Math.min(1, this.alpha[i] * 1.2) * 100) / 100
      if (o !== s.o) {
        s.el.style.opacity = String(o)
        s.o = o
      }
    }
  }

  // ------------------------------------------------------------------ labels

  private fontFor(nd: GNode) {
    if (nd.kind === 'year') return '600 15px Orbitron, sans-serif'
    if (nd.kind === 'fest' || nd.kind === 'vertical' || nd.kind === 'hub') return '500 12px Orbitron, sans-serif'
    return '600 14px Rajdhani, sans-serif'
  }

  private measureLabels() {
    const ctx = document.createElement('canvas').getContext('2d')
    if (!ctx) return
    for (const nd of this.g.nodes) {
      ctx.font = this.fontFor(nd)
      this.widths[nd.i] = ctx.measureText(nd.label).width + 4
    }
  }

  /** Labels point away from the mark: nodes left of it carry their label on the left. */
  private side(i: number) {
    if (this.sim.layout === 'legacy' && this.g.nodes[i].kind === 'year') return 1
    return this.sx[i] < this.sx[this.g.core.i] - 4 ? -1 : 1
  }

  /** Rings and diamonds read larger than their radius (halo, outline). */
  private labelGap(i: number) {
    const k = this.g.nodes[i].kind
    return k === 'fest' || k === 'hub' || k === 'year' ? 1.5 : k === 'vertical' ? 1.35 : 1
  }

  private labelClass(nd: GNode) {
    if (nd.kind === 'year') return 'v6-label year'
    if (nd.kind === 'fest' || nd.kind === 'vertical' || nd.kind === 'hub') return 'v6-label major'
    return 'v6-label minor'
  }

  private placeLabels() {
    const { g } = this
    const W = this.r.width, H = this.r.height
    const compact = this.opts.compact
    const legacy = this.sim.layout === 'legacy'
    const grid = this.square > 0.5
    const intro = performance.now() < this.introUntil
    const max = this.labels.slots.length
    const order = this.order
    order.length = 0
    this.chosen.fill(0)
    if (!grid) {
      for (const nd of g.nodes) {
        const i = nd.i
        if (nd.kind === 'core') continue
        const a = this.alpha[i]
        if (a < 0.22 && i !== this.hover) continue
        const sx = this.sx[i], sy = this.sy[i]
        if (sx < -40 || sx > W + 10 || sy < this.labelTop || sy > H + 20) continue
        const major = nd.kind === 'fest' || nd.kind === 'vertical' || nd.kind === 'hub' || nd.kind === 'year'
        const hot = i === this.sel || i === this.hover
        const nb = this.nbHover[i] || (this.nbSel[i] && this.hover < 0)
        let threshold = nd.kind === 'member' ? 6.2 : legacy ? 5 : 6
        if (this.focus.emphasis && this.emph[i]) threshold *= 0.78
        if (compact) threshold *= 1.25
        if (!(hot || major || nb || this.spx[i] >= threshold)) continue
        if (intro && !major) continue
        if (major && nd.kind !== 'year' && legacy && !hot && !nb) continue
        order.push(i)
      }
      const pr = (i: number) => {
        const nd = g.nodes[i]
        let p = i === this.hover ? 1000 : i === this.sel ? 900 : 0
        if (this.nbHover[i]) p += 400
        else if (this.nbSel[i]) p += 300
        if (nd.kind === 'year') p += 260
        else if (nd.kind === 'fest' || nd.kind === 'vertical') p += 240
        else if (nd.kind === 'hub') p += 200
        return p + this.spx[i] * 4 + this.alpha[i] * 20
      }
      order.sort((a, b) => pr(b) - pr(a))
    }

    // greedy collision against already placed labels
    const rects: number[] = []
    let placed = 0
    for (const i of order) {
      if (placed >= max) break
      const hot = i === this.hover || i === this.sel
      const w = this.widths[i] * (hot ? 1.12 : 1) + 6
      const h = hot ? 34 : 18
      const gap = this.spx[i] * this.labelGap(i) + 6
      const lx = this.side(i) > 0 ? this.sx[i] + gap : this.sx[i] - gap - w
      const ly = this.sy[i] - h / 2
      let hit = false
      for (let k = 0; k < rects.length; k += 4) {
        if (lx < rects[k + 2] && lx + w > rects[k] && ly < rects[k + 3] && ly + h > rects[k + 1]) {
          hit = true
          break
        }
      }
      if (!hot && (lx < 2 || lx + w > W - 2)) continue
      if (hit && !hot) continue
      rects.push(lx, ly, lx + w, ly + h)
      this.chosen[i] = 1
      placed++
    }

    // fade
    const k = this.opts.reduced ? 1 : 0.2
    for (let i = 0; i < this.n; i++) this.lab[i] += ((this.chosen[i] ? 1 : 0) - this.lab[i]) * k

    // assign pooled elements: keep existing assignments stable
    const L = this.labels
    const want: number[] = []
    for (let i = 0; i < this.n; i++) if (this.lab[i] > 0.03) want.push(i)
    const keep = new Set<number>()
    for (const s of L.slots) {
      if (s.node >= 0 && this.lab[s.node] > 0.03) keep.add(s.node)
      else s.node = -1
    }
    let free = 0
    for (const i of want) {
      if (keep.has(i)) continue
      while (free < L.slots.length && L.slots[free].node !== -1) free++
      if (free >= L.slots.length) break
      L.slots[free].node = i
      L.slots[free].cls = ''
      keep.add(i)
    }
    for (const s of L.slots) {
      if (s.node < 0) {
        if (s.o !== 0) {
          s.el.style.opacity = '0'
          s.o = 0
        }
        continue
      }
      const i = s.node
      const nd = g.nodes[i]
      const hot = i === this.hover || i === this.sel
      const cls = this.labelClass(nd) + (hot ? ' hot' : '') + (i === this.sel ? ' sel' : '')
      if (s.cls !== cls || s.t.textContent !== nd.label) {
        s.el.className = cls
        s.cls = cls
        s.t.textContent = nd.label
      }
      const wantSub = hot
      if (wantSub !== s.sub) {
        s.s.textContent = wantSub ? nd.sub : ''
        s.sub = wantSub
      }
      const side = this.side(i)
      const gap = this.spx[i] * this.labelGap(i) + 6
      const lx = Math.round((this.sx[i] + side * gap) * 2) / 2
      const ly = Math.round(this.sy[i] * 2) / 2
      if (lx !== s.x || ly !== s.y || side !== s.side) {
        s.el.style.transform = `translate3d(${lx}px, ${ly}px, 0) translate(${side > 0 ? 0 : -100}%, -50%)`
        s.el.style.alignItems = side > 0 ? 'flex-start' : 'flex-end'
        s.el.style.textAlign = side > 0 ? 'left' : 'right'
        s.side = side
        s.x = lx
        s.y = ly
      }
      const o = Math.round(Math.min(1, this.lab[i] * Math.max(this.alpha[i], hot ? 1 : 0.35)) * 100) / 100
      if (o !== s.o) {
        s.el.style.opacity = String(o)
        s.o = o
      }
    }
  }

  // ------------------------------------------------------------------ input

  private local(e: PointerEvent | WheelEvent) {
    const b = this.r.canvas.getBoundingClientRect()
    return { x: e.clientX - b.left, y: e.clientY - b.top }
  }

  pick(px: number, py: number, touch = false): number {
    let best = -1
    let bestD = Infinity
    const slack = touch ? 14 : 6
    const c = this.g.core.i
    if (this.square < 0.5) {
      const dc = Math.hypot(px - this.sx[c], py - this.sy[c])
      if (dc < this.spx[c] * 0.9) return c
    }
    for (let i = 0; i < this.n; i++) {
      if (i === c || this.alpha[i] < 0.12) continue
      const d = Math.hypot(px - this.sx[i], py - this.sy[i])
      const lim = this.spx[i] + slack
      if (d < lim && d - this.spx[i] < bestD) {
        bestD = d - this.spx[i]
        best = i
      }
    }
    return best
  }

  private setHover(i: number) {
    if (i === this.hover) return
    this.hover = i
    this.neighbours(i, this.nbHover)
    this.r.canvas.style.cursor = i >= 0 ? 'pointer' : this.drag ? 'grabbing' : 'grab'
    this.opts.onHover?.(i >= 0 ? this.g.nodes[i] : null)
    this.kick()
  }

  /** During the intro bloom only the big hubs are labelled. */
  private introUntil = 0
  /** Labels above this line would sit under the header / breadcrumb. */
  labelTop = -20
  private exploring = false
  private setExploring(v: boolean) {
    if (v === this.exploring) return
    this.exploring = v
    this.opts.onExplore?.(v)
  }

  private stopAuto() {
    this.follow = false
    this.goal = null
    this.setExploring(true)
  }

  private onDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const p = this.local(e)
    this.r.canvas.setPointerCapture(e.pointerId)
    this.pointers.set(e.pointerId, p)
    this.vel.x = this.vel.y = 0
    if (this.pointers.size === 1) {
      this.drag = { x0: p.x, y0: p.y, lx: p.x, ly: p.y, lt: performance.now(), moved: false, touch: e.pointerType !== 'mouse' }
    } else if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()]
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2
      this.pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, s0: this.cam.s, ...this.worldAt(mx, my) }
      if (this.drag) this.drag.moved = true
    }
    this.kick()
  }

  private worldAt(px: number, py: number) {
    return { wx: this.cam.x + (px - this.r.width / 2) / this.cam.s, wy: this.cam.y + (py - this.r.height / 2) / this.cam.s }
  }

  private onMove = (e: PointerEvent) => {
    const p = this.local(e)
    if (e.pointerType === 'mouse') {
      this.tilt.tx = (p.x / this.r.width - 0.5) * 2
      this.tilt.ty = (p.y / this.r.height - 0.5) * 2
    }
    if (!this.pointers.has(e.pointerId)) {
      if (e.pointerType === 'mouse') this.setHover(this.pick(p.x, p.y))
      this.kick()
      return
    }
    this.pointers.set(e.pointerId, p)
    if (this.pinch && this.pointers.size >= 2) {
      const [a, b] = [...this.pointers.values()]
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2
      this.cam.s = Math.max(MIN_SCALE, Math.min(MAX_SCALE, this.pinch.s0 * (d / this.pinch.d0)))
      this.cam.x = this.pinch.wx - (mx - this.r.width / 2) / this.cam.s
      this.cam.y = this.pinch.wy - (my - this.r.height / 2) / this.cam.s
      this.stopAuto()
      this.kick()
      return
    }
    const d = this.drag
    if (!d) return
    const dx = p.x - d.lx, dy = p.y - d.ly
    if (!d.moved && Math.hypot(p.x - d.x0, p.y - d.y0) > (d.touch ? 8 : 4)) {
      d.moved = true
      this.stopAuto()
      this.setHover(-1)
      this.r.canvas.style.cursor = 'grabbing'
    }
    if (d.moved) {
      this.cam.x -= dx / this.cam.s
      this.cam.y -= dy / this.cam.s
      const now = performance.now()
      const dts = Math.max(1, now - d.lt) / 1000
      const k = 0.35
      this.vel.x = this.vel.x * (1 - k) + (-dx / this.cam.s / dts) * k
      this.vel.y = this.vel.y * (1 - k) + (-dy / this.cam.s / dts) * k
      d.lt = now
    }
    d.lx = p.x
    d.ly = p.y
    this.kick()
  }

  private onUp = (e: PointerEvent) => {
    const had = this.pointers.delete(e.pointerId)
    if (this.r.canvas.hasPointerCapture(e.pointerId)) this.r.canvas.releasePointerCapture(e.pointerId)
    if (this.pointers.size < 2) this.pinch = null
    const d = this.drag
    if (!had || !d) return
    if (this.pointers.size > 0) return
    this.drag = null
    if (!d.moved && e.type === 'pointerup') {
      const p = this.local(e)
      const i = this.pick(p.x, p.y, d.touch)
      if (i >= 0) this.opts.onSelect(this.g.nodes[i])
      this.vel.x = this.vel.y = 0
    } else if (this.opts.reduced || performance.now() - d.lt > 90) {
      this.vel.x = this.vel.y = 0
    }
    this.r.canvas.style.cursor = this.hover >= 0 ? 'pointer' : 'grab'
    this.kick()
  }

  private onLeave = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') {
      this.setHover(-1)
      this.tilt.tx = this.tilt.ty = 0
    }
  }

  private zoomAt(px: number, py: number, f: number) {
    const { wx, wy } = this.worldAt(px, py)
    this.cam.s = Math.max(MIN_SCALE, Math.min(MAX_SCALE, this.cam.s * f))
    this.cam.x = wx - (px - this.r.width / 2) / this.cam.s
    this.cam.y = wy - (py - this.r.height / 2) / this.cam.s
    this.stopAuto()
    this.vel.x = this.vel.y = 0
    this.kick()
  }

  private onWheel = (e: WheelEvent) => {
    e.preventDefault()
    const p = this.local(e)
    let dy = e.deltaY
    if (e.deltaMode === 1) dy *= 16
    else if (e.deltaMode === 2) dy *= 400
    this.zoomAt(p.x, p.y, Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0018)))
  }

  private onKey = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement) !== this.container) return
    if (e.metaKey || e.ctrlKey || e.altKey) return
    if (e.key.startsWith('Arrow')) {
      e.preventDefault()
      this.keys.add(e.key)
      this.stopAuto()
      this.kick()
    } else if (e.key === '+' || e.key === '=') {
      e.preventDefault()
      this.zoomBy(1.25)
    } else if (e.key === '-' || e.key === '_') {
      e.preventDefault()
      this.zoomBy(0.8)
    } else if (e.key === '0') {
      e.preventDefault()
      this.fit()
    }
  }
  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key)
  }
  private onBlur = () => {
    this.keys.clear()
  }
}
