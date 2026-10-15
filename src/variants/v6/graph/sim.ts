// A small force simulation, written for this graph (no d3).
// Every node is a damped particle pulled by:
//   - a spring toward its layout target (an anchor, an orbit slot around its parent, a spiral
//     slot or a grid cell — targets move every tick, so orbits turn and clusters follow hubs),
//   - link springs on the cross edges (project ↔ team, post ↔ author, artwork ↔ artist),
//   - pairwise repulsion within a cutoff, plus hard collision on the node radii.
// Switching layout only swaps the targets: the same particles fly to their new places.
import { ANCHORS, type Graph } from './model'

export type Layout = 'constellation' | 'legacy' | 'grid'

const DECAY = 0.6 // velocity kept per tick (d3's velocityDecay 0.4)
const CUTOFF = 240
const REPULSE = 10
const PAD = 3

const CHARGE: Record<string, number> = { core: 0, hub: 14, fest: 26, vertical: 26, project: 3.4, member: 1.4, blog: 3, art: 3, year: 9 }

export const LAYOUT_EDGE_VIS: Record<Layout, Record<string, number>> = {
  constellation: { hub: 1, fest: 1, built: 1, member: 1, journal: 1, author: 1, gallery: 1, artist: 1, year: 0, time: 0 },
  legacy: { hub: 0.35, fest: 0, built: 0, member: 0, journal: 0, author: 0.6, gallery: 0, artist: 0.6, year: 1, time: 1 },
  grid: { hub: 0, fest: 0, built: 0, member: 0, journal: 0, author: 0, gallery: 0, artist: 0, year: 0, time: 0 },
}

export class Sim {
  readonly g: Graph
  readonly n: number
  x: Float32Array
  y: Float32Array
  vx: Float32Array
  vy: Float32Array
  tx: Float32Array
  ty: Float32Array
  tk: Float32Array
  /** Layout visibility target per node (the renderer eases toward it). */
  vis: Float32Array
  active: Uint8Array
  charge: Float32Array
  layout: Layout = 'constellation'
  /** Orbit clock (s). */
  t = 0
  rotate = true
  private legacyX: Float32Array
  private legacyY: Float32Array
  private legacyK: Float32Array
  private gridX: Float32Array
  private gridY: Float32Array
  private rest: Float32Array

  constructor(g: Graph) {
    this.g = g
    const n = (this.n = g.nodes.length)
    const F = () => new Float32Array(n)
    this.x = F(); this.y = F(); this.vx = F(); this.vy = F()
    this.tx = F(); this.ty = F(); this.tk = F(); this.vis = F()
    this.charge = F(); this.active = new Uint8Array(n)
    this.legacyX = F(); this.legacyY = F(); this.legacyK = F()
    this.gridX = F(); this.gridY = F(); this.rest = F()
    g.nodes.forEach((nd) => (this.charge[nd.i] = CHARGE[nd.kind] ?? 2))
    this.prepareLegacy()
    this.prepareGrid()
    this.snap()
  }

  /** Place every node on its target (parents first, so orbits land around them). */
  snap() {
    for (let pass = 0; pass < 3; pass++) {
      this.computeTargets()
      for (let i = 0; i < this.n; i++) {
        this.x[i] = this.tx[i]
        this.y[i] = this.ty[i]
      }
    }
    this.vx.fill(0)
    this.vy.fill(0)
  }

  /** Spiral of years from the mark outward; each year's nodes in a sunflower disc around it. */
  private prepareLegacy() {
    const { nodes, years } = this.g
    const ring = nodes.filter((nd) => nd.kind === 'fest' || nd.kind === 'vertical' || nd.kind === 'hub')
    ring.forEach((nd, k) => {
      const a = -Math.PI / 2 + (k / ring.length) * Math.PI * 2 + 0.18
      this.legacyX[nd.i] = Math.cos(a) * 1060
      this.legacyY[nd.i] = Math.sin(a) * 1060
    })
    years.forEach((yn, k) => {
      const a = -Math.PI / 2 + k * 0.92
      const r = 150 + 84 * k
      this.legacyX[yn.i] = Math.cos(a) * r
      this.legacyY[yn.i] = Math.sin(a) * r
    })
    const prio: Record<string, number> = { project: 0, blog: 1, art: 2, member: 3 }
    for (const yn of years) {
      const items = nodes
        .filter((nd) => nd.year === yn.year && nd.kind !== 'year')
        .sort((a, b) => prio[a.kind] - prio[b.kind] || a.label.localeCompare(b.label))
      items.forEach((it, j) => {
        const rho = 11 * Math.sqrt(j + 0.5) + 18
        const phi = j * 2.39996 + yn.year! * 0.7
        this.legacyX[it.i] = Math.cos(phi) * rho // offset from the year node
        this.legacyY[it.i] = Math.sin(phi) * rho
        this.legacyK[it.i] = 1 // relative to the year
      })
    }
    // undated items sit close to the mark
    nodes.forEach((nd, k) => {
      if ((nd.kind === 'project' || nd.kind === 'member') && !nd.year) {
        this.legacyX[nd.i] = Math.cos(k) * 96
        this.legacyY[nd.i] = Math.sin(k) * 96
      }
    })
  }

  /** "Every node as a tile": a square grid around the origin, filled from the centre out. */
  private prepareGrid() {
    const order = ['core', 'hub', 'fest', 'vertical', 'project', 'blog', 'art', 'member']
    const list = this.g.nodes.filter((nd) => nd.kind !== 'year').sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))
    const side = Math.ceil(Math.sqrt(list.length)) + 3
    const cells: [number, number][] = []
    for (let gy = -side; gy <= side; gy++) for (let gx = -side; gx <= side; gx++) if (gx || gy) cells.push([gx, gy])
    cells.sort((a, b) => Math.max(Math.abs(a[0]) * 0.8, Math.abs(a[1])) - Math.max(Math.abs(b[0]) * 0.8, Math.abs(b[1])) || Math.atan2(a[1], a[0]) - Math.atan2(b[1], b[0]))
    const C = 40
    let c = 0
    for (const nd of list) {
      if (nd.kind === 'core') continue
      const [gx, gy] = cells[c++]
      this.gridX[nd.i] = gx * C
      this.gridY[nd.i] = gy * C
    }
  }

  setLayout(l: Layout) {
    if (l === this.layout) return
    this.layout = l
    this.computeTargets()
  }

  /** Bloom every node out of the mark along the line to where it will settle (the intro). */
  burst() {
    this.snap()
    for (let i = 0; i < this.n; i++) {
      if (i === this.g.core.i) continue
      const fx = this.x[i], fy = this.y[i]
      const j = 0.75 + ((i * 7919) % 100) / 400
      this.x[i] = fx * 0.05
      this.y[i] = fy * 0.05
      this.vx[i] = fx * 0.055 * j
      this.vy[i] = fy * 0.055 * j
    }
  }

  private computeTargets() {
    const { nodes } = this.g
    const L = this.layout
    const x = this.x, y = this.y
    for (const nd of nodes) {
      const i = nd.i
      let tx = 0, ty = 0, tk = 0.05, vis = 1, active = 1
      if (nd.kind === 'core') {
        tk = 1
      } else if (L === 'constellation') {
        if (nd.kind === 'year') {
          tx = this.legacyX[i]; ty = this.legacyY[i]; vis = 0; active = 0; tk = 0.05
        } else if (nd.parent >= 0) {
          const a = nd.angle0 + nd.omega * this.t
          tx = x[nd.parent] + Math.cos(a) * nd.orbitR
          ty = y[nd.parent] + Math.sin(a) * nd.orbitR
          tk = 0.07
        } else {
          const p = ANCHORS[nd.id] || [0, 0]
          tx = p[0]; ty = p[1]; tk = 0.03
        }
      } else if (L === 'legacy') {
        if (nd.kind === 'year') {
          tx = this.legacyX[i]; ty = this.legacyY[i]; tk = 0.05
        } else if (this.legacyK[i] && nd.year) {
          const yn = this.g.byId.get(`year:${nd.year}`)!
          tx = x[yn.i] + this.legacyX[i]; ty = y[yn.i] + this.legacyY[i]; tk = 0.06
          vis = nd.kind === 'member' ? 0.85 : 1
        } else {
          tx = this.legacyX[i]; ty = this.legacyY[i]; tk = 0.03
          vis = nd.kind === 'project' || nd.kind === 'member' ? 0.8 : 0.32
        }
      } else {
        if (nd.kind === 'year') {
          tx = this.legacyX[i]; ty = this.legacyY[i]; vis = 0; active = 0
        } else {
          tx = this.gridX[i]; ty = this.gridY[i]; tk = 0.1
        }
      }
      this.tx[i] = tx; this.ty[i] = ty; this.tk[i] = tk; this.vis[i] = vis; this.active[i] = active
    }
  }

  /** One tick. */
  tick() {
    const { nodes, edges } = this.g
    const n = this.n
    const x = this.x, y = this.y, vx = this.vx, vy = this.vy
    this.computeTargets()
    const grid = this.layout === 'grid'

    // target springs
    for (let i = 0; i < n; i++) {
      vx[i] += (this.tx[i] - x[i]) * this.tk[i]
      vy[i] += (this.ty[i] - y[i]) * this.tk[i]
    }

    // cross-edge springs (constellation only: they bend the orbits toward collaborators)
    if (this.layout === 'constellation') {
      for (const e of edges) {
        if (e.k <= 0) continue
        const a = e.a, b = e.b
        const dx = x[b] - x[a], dy = y[b] - y[a]
        const d = Math.sqrt(dx * dx + dy * dy) || 1
        // only satellites bend toward collaborators; hubs keep their anchors
        const f = Math.min(0.9, ((d - e.len) / d) * e.k * d) / d
        if (nodes[a].parent >= 0) { vx[a] += dx * f; vy[a] += dy * f }
        if (nodes[b].parent >= 0) { vx[b] -= dx * f; vy[b] -= dy * f }
      }
    }

    // repulsion + collision
    const rad = this.rest
    for (let i = 0; i < n; i++) rad[i] = grid ? 15 : nodes[i].r
    const c2 = CUTOFF * CUTOFF
    for (let i = 0; i < n; i++) {
      if (!this.active[i]) continue
      const qi = this.charge[i], xi = x[i], yi = y[i], ri = rad[i]
      for (let j = i + 1; j < n; j++) {
        if (!this.active[j]) continue
        let dx = x[j] - xi, dy = y[j] - yi
        let d2 = dx * dx + dy * dy
        if (d2 > c2) continue
        if (d2 < 1e-4) {
          dx = ((i * 31 + j) % 7) - 3 || 1
          dy = ((i * 17 + j) % 5) - 2 || 1
          d2 = dx * dx + dy * dy
        }
        const d = Math.sqrt(d2)
        let f = grid ? 0 : (REPULSE * qi * this.charge[j]) / Math.max(d2, 64)
        const overlap = ri + rad[j] + PAD - d
        if (overlap > 0) f += overlap * 0.35
        const fx = (dx / d) * f, fy = (dy / d) * f
        vx[i] -= fx; vy[i] -= fy
        vx[j] += fx; vy[j] += fy
      }
    }

    // integrate
    const core = this.g.core.i
    for (let i = 0; i < n; i++) {
      vx[i] *= DECAY
      vy[i] *= DECAY
      x[i] += vx[i]
      y[i] += vy[i]
    }
    x[core] = 0; y[core] = 0; vx[core] = 0; vy[core] = 0
  }

  /** Advance by dt seconds (fixed 60 Hz ticks, at most 3 per call). */
  step(dt: number) {
    if (this.rotate) this.t += dt
    const ticks = Math.min(3, Math.max(1, Math.round(dt * 60)))
    for (let k = 0; k < ticks; k++) this.tick()
  }

  /** Run to rest synchronously (reduced motion, or a jump). */
  settle(iters = 260) {
    for (let k = 0; k < iters; k++) this.tick()
    this.vx.fill(0)
    this.vy.fill(0)
  }

  /** Mean speed in world units per tick (to know when the layout has settled). */
  energy() {
    let s = 0
    for (let i = 0; i < this.n; i++) s += Math.abs(this.vx[i]) + Math.abs(this.vy[i])
    return s / this.n
  }
}
