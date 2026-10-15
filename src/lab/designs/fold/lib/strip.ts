import * as THREE from 'three'

/**
 * The DVM mark as folded paper.
 *
 * The logo is two ribbons (the two SVG paths in src/shared/logo.ts). Each ribbon
 * is modelled as a constant-width paper strip whose direction changes are real
 * flat folds: at every corner the strip is folded over a crease that bisects the
 * incoming and outgoing directions (reflection across that crease maps one arm onto
 * the next). Unfolding every crease yields a straight strip, so the same panels can
 * be laid flat as a timeline and folded back into the mark with hinge rotations.
 *
 * Coordinates: "logo" space is the SVG mark normalised to 1 unit tall, y-up,
 * centred (same as getLogoShapes). "flat" space is the unfolded strip running
 * along +x with its centreline on y = 0.
 */

export interface V2 {
  x: number
  y: number
}
type P = [number, number]
interface Line {
  p: V2
  d: V2
}

// Tight bbox of the SVG paths (path coordinates, y-down).
const BB = { minX: -470.31, maxX: -219.78, minY: -227.2, maxY: 99.58 }
const BH = BB.maxY - BB.minY
const BCX = (BB.minX + BB.maxX) / 2
const BCY = (BB.minY + BB.maxY) / 2
const L = ([x, y]: P): V2 => ({ x: (x - BCX) / BH, y: -(y - BCY) / BH })

const sub = (a: V2, b: V2): V2 => ({ x: a.x - b.x, y: a.y - b.y })
const add = (a: V2, b: V2): V2 => ({ x: a.x + b.x, y: a.y + b.y })
const mul = (a: V2, s: number): V2 => ({ x: a.x * s, y: a.y * s })
const dot = (a: V2, b: V2) => a.x * b.x + a.y * b.y
const cross = (a: V2, b: V2) => a.x * b.y - a.y * b.x
const len = (a: V2) => Math.hypot(a.x, a.y)
const norm = (a: V2): V2 => mul(a, 1 / (len(a) || 1))
const perp = (a: V2): V2 => ({ x: -a.y, y: a.x })
const lineThrough = (a: V2, b: V2): Line => ({ p: a, d: norm(sub(b, a)) })

function intersect(l1: Line, l2: Line): V2 {
  const den = cross(l1.d, l2.d)
  if (Math.abs(den) < 1e-9) return l1.p
  const t = cross(sub(l2.p, l1.p), l2.d) / den
  return add(l1.p, mul(l1.d, t))
}
const distToLine = (pt: V2, l: Line) => Math.abs(cross(sub(pt, l.p), l.d))

/** An arm of the ribbon given by its two edge lines (SVG coords). */
interface ArmSpec {
  a: [P, P]
  b: [P, P]
}
interface ChainSpec {
  id: string
  arms: ArmSpec[]
  startCap: [P, P]
  endCap: [P, P]
  /** index of the panel that stays put (hinges fan out from it) */
  root: number
}

/** Path 1 of the mark: the V with the folded-in M notch. */
const CHAIN_V: ChainSpec = {
  id: 'v',
  root: 3,
  startCap: [[-470.31, -189.24], [-435.51, -170.89]],
  arms: [
    { a: [[-470.31, -189.24], [-470.31, -37.4]], b: [[-435.51, -170.89], [-434.25, -50.05]] },
    { a: [[-470.31, -37.4], [-364.03, 38.51]], b: [[-434.25, -50.05], [-363.39, -0.08]] },
    { a: [[-364.03, 38.51], [-264.07, -37.4]], b: [[-363.39, -0.08], [-290.64, -56.38]] },
    { a: [[-264.07, -37.4], [-264.07, -189.23]], b: [[-290.64, -56.38], [-290.64, -133.57]] },
    { a: [[-264.07, -189.23], [-359.6, -116.48]], b: [[-290.64, -133.57], [-360.23, -82.32]] },
    { a: [[-359.6, -116.48], [-414.64, -153.81]], b: [[-360.23, -82.32], [-415.27, -117.75]] },
  ],
  endCap: [[-414.64, -153.81], [-415.27, -117.75]],
}

/** Path 2 of the mark: the outer V that rises into the tall blade. */
const CHAIN_BLADE: ChainSpec = {
  id: 'blade',
  root: 1,
  startCap: [[-470.31, -11.2], [-470.31, 27.18]],
  arms: [
    { a: [[-467.26, -11.82], [-366.68, 58.73]], b: [[-470.31, 27.18], [-370.95, 99.58]] },
    { a: [[-366.68, 58.73], [-252.09, -27.3]], b: [[-370.95, 99.58], [-219.78, -14.3]] },
    { a: [[-252.09, -27.3], [-252.09, -204.3]], b: [[-219.78, -14.3], [-219.78, -227.2]] },
  ],
  endCap: [[-252.09, -204.3], [-219.78, -227.2]],
}

export interface Panel {
  /** quad in logo space (folded), CCW */
  logoQuad: V2[]
  /** quad in flat space, CCW */
  flatQuad: V2[]
  /** centreline start/end in flat space (x only matters) */
  flatStart: number
  flatEnd: number
}

export interface Hinge {
  /** crease between panel k-1 and k (k = index in panels). Flat-space line. */
  k: number
  pivot: V2
  axis: V2
  /** +1/-1 so that the panel on the far side from the root swings toward +z */
  sign: number
  /** fold order: 0 = farthest from root */
  order: number
}

export interface Chain {
  id: string
  halfWidth: number
  root: number
  panels: Panel[]
  hinges: Hinge[] // hinges[k] for k>=1, hinges[0] unused (null-ish)
  /** min/max x of the flat strip (flat space) */
  flatMin: number
  flatMax: number
  /** maps flat space -> logo space (2D affine, proper rotation + translation) */
  flatToLogo: THREE.Matrix3
  /** centroid of the folded chain in logo space */
  logoCentre: V2
}

function reflectAcross(p: V2, c: V2): THREE.Matrix3 {
  const m = new THREE.Matrix3().set(
    c.x * c.x - c.y * c.y, 2 * c.x * c.y, 0,
    2 * c.x * c.y, c.y * c.y - c.x * c.x, 0,
    0, 0, 1,
  )
  const t1 = new THREE.Matrix3().makeTranslation(p.x, p.y)
  const t0 = new THREE.Matrix3().makeTranslation(-p.x, -p.y)
  return t1.multiply(m).multiply(t0)
}
const apply = (m: THREE.Matrix3, v: V2): V2 => {
  const e = m.elements
  return { x: e[0] * v.x + e[3] * v.y + e[6], y: e[1] * v.x + e[4] * v.y + e[7] }
}
const applyDir = (m: THREE.Matrix3, v: V2): V2 => {
  const e = m.elements
  return norm({ x: e[0] * v.x + e[3] * v.y, y: e[1] * v.x + e[4] * v.y })
}
const signedArea = (q: V2[]) => {
  let a = 0
  for (let i = 0; i < q.length; i++) a += cross(q[i], q[(i + 1) % q.length])
  return a / 2
}

function buildChain(spec: ChainSpec): Chain {
  // centrelines + widths
  const centre: Line[] = []
  let wSum = 0
  for (const arm of spec.arms) {
    const la = lineThrough(L(arm.a[0]), L(arm.a[1]))
    const lb = lineThrough(L(arm.b[0]), L(arm.b[1]))
    let db = lb.d
    if (dot(la.d, db) < 0) db = mul(db, -1)
    const mid = mul(add(la.p, lb.p), 0.5)
    centre.push({ p: mid, d: norm(add(la.d, db)) })
    wSum += (distToLine(lb.p, la) + distToLine(la.p, lb)) / 2
  }
  const h = wSum / spec.arms.length / 2
  const n = spec.arms.length
  const startCap = lineThrough(L(spec.startCap[0]), L(spec.startCap[1]))
  const endCap = lineThrough(L(spec.endCap[0]), L(spec.endCap[1]))

  // centreline vertices
  const P: V2[] = [intersect(centre[0], startCap)]
  for (let i = 1; i < n; i++) P.push(intersect(centre[i - 1], centre[i]))
  P.push(intersect(centre[n - 1], endCap))
  // directions follow the traversal order
  const D: V2[] = []
  for (let i = 0; i < n; i++) D.push(norm(sub(P[i + 1], P[i])))
  // crease directions at interior vertices
  const C: V2[] = [startCap.d]
  for (let i = 1; i < n; i++) C.push(norm(add(D[i - 1], D[i])))
  C.push(endCap.d)

  // logo-space quads
  const logoQuads: V2[][] = []
  for (let i = 0; i < n; i++) {
    const nn = perp(D[i])
    const left: Line = { p: add(P[i], mul(nn, h)), d: D[i] }
    const right: Line = { p: add(P[i], mul(nn, -h)), d: D[i] }
    const sB: Line = { p: P[i], d: C[i] }
    const eB: Line = { p: P[i + 1], d: C[i + 1] }
    logoQuads.push([intersect(sB, right), intersect(eB, right), intersect(eB, left), intersect(sB, left)])
  }

  // unfolding isometries G_i: logo -> flat
  const ang = Math.atan2(D[0].y, D[0].x)
  const G0 = new THREE.Matrix3().makeRotation(-ang).multiply(new THREE.Matrix3().makeTranslation(-P[0].x, -P[0].y))
  // note: Matrix3.makeRotation(theta) in three is a CCW rotation by theta? Verify numerically below.
  const G: THREE.Matrix3[] = [G0]
  for (let i = 1; i < n; i++) G.push(G[i - 1].clone().multiply(reflectAcross(P[i], C[i])))

  const panels: Panel[] = logoQuads.map((q, i) => {
    let fq = q.map((v) => apply(G[i], v))
    if (signedArea(fq) < 0) fq = [fq[0], fq[3], fq[2], fq[1]]
    const lq = signedArea(q) < 0 ? [q[0], q[3], q[2], q[1]] : q
    return {
      logoQuad: lq,
      flatQuad: fq,
      flatStart: apply(G[i], P[i]).x,
      flatEnd: apply(G[i], P[i + 1]).x,
    }
  })

  const hinges: Hinge[] = []
  for (let k = 0; k < n; k++) {
    if (k === 0) {
      hinges.push({ k: 0, pivot: { x: 0, y: 0 }, axis: { x: 1, y: 0 }, sign: 1, order: 0 })
      continue
    }
    const pivot = apply(G[k], P[k])
    const axis = applyDir(G[k], C[k])
    // child panel is the one farther from the root
    const child = k > spec.root ? k : k - 1
    const cq = panels[child].flatQuad
    const cen = mul(cq.reduce((a, b) => add(a, b), { x: 0, y: 0 }), 1 / 4)
    const sign = Math.sign(cross(axis, sub(cen, pivot))) || 1
    hinges.push({ k, pivot, axis, sign, order: 0 })
  }
  // order: farthest from root folds first
  const dist = hinges.map((hh) => (hh.k === 0 ? -1 : hh.k > spec.root ? hh.k - spec.root : spec.root - hh.k + 1))
  const sorted = hinges.filter((hh) => hh.k > 0).sort((a, b) => dist[b.k] - dist[a.k])
  sorted.forEach((hh, i) => (hh.order = i))

  let flatMin = Infinity
  let flatMax = -Infinity
  for (const p of panels) for (const v of p.flatQuad) {
    flatMin = Math.min(flatMin, v.x)
    flatMax = Math.max(flatMax, v.x)
  }
  let cx = 0
  let cy = 0
  let cnt = 0
  for (const p of panels) for (const v of p.logoQuad) {
    cx += v.x
    cy += v.y
    cnt++
  }

  return {
    id: spec.id,
    halfWidth: h,
    root: spec.root,
    panels,
    hinges,
    flatMin,
    flatMax,
    flatToLogo: G0.clone().invert(),
    logoCentre: { x: cx / cnt, y: cy / cnt },
  }
}

let cache: Chain[] | null = null
/** Both ribbons of the mark, ordered as they appear on the flat strip. */
export function getChains(): Chain[] {
  if (!cache) cache = [buildChain(CHAIN_V), buildChain(CHAIN_BLADE)]
  return cache
}

/* ------------------------------------------------------------------------- */
/* 3D                                                                        */
/* ------------------------------------------------------------------------- */

export interface StripLayout {
  /** world units per logo unit */
  scale: number
  /** paper thickness (world) */
  thickness: number
  /** per chain: x offset of flat space inside the long strip (logo units) */
  offsets: number[]
  /** total strip length (logo units) */
  total: number
}

export function makeLayout(scale: number, thickness: number, gap = 0.012): StripLayout {
  const chains = getChains()
  const offsets: number[] = []
  let x = 0
  for (const c of chains) {
    offsets.push(x - c.flatMin)
    x += c.flatMax - c.flatMin + gap
  }
  return { scale, thickness, offsets, total: x - gap }
}

/**
 * Prism geometry for one panel, built in flat space scaled to world units.
 * Groups: 0 = front (+z), 1 = back (-z), 2 = edges.
 * uv: x along the whole strip (0..1), y across it (0..1).
 */
export function panelGeometry(chain: Chain, panelIndex: number, layout: StripLayout, chainIndex: number) {
  const q = chain.panels[panelIndex].flatQuad
  const s = layout.scale
  const t = layout.thickness / 2
  const h = chain.halfWidth
  const off = layout.offsets[chainIndex]
  const pos: number[] = []
  const nor: number[] = []
  const uv: number[] = []
  const uvOf = (v: V2) => [(v.x + off) / layout.total, (v.y + h) / (2 * h)]
  const geo = new THREE.BufferGeometry()
  // front: (0,1,2) (0,2,3)
  const tri = (a: V2, b: V2, c: V2, z: number, nz: number) => {
    for (const v of [a, b, c]) {
      pos.push(v.x * s, v.y * s, z)
      nor.push(0, 0, nz)
      uv.push(...uvOf(v))
    }
  }
  tri(q[0], q[1], q[2], t, 1)
  tri(q[0], q[2], q[3], t, 1)
  geo.addGroup(0, 6, 0)
  tri(q[0], q[2], q[1], -t, -1)
  tri(q[0], q[3], q[2], -t, -1)
  geo.addGroup(6, 6, 1)
  // sides
  for (let i = 0; i < 4; i++) {
    const a = q[i]
    const b = q[(i + 1) % 4]
    const e = norm(sub(b, a))
    const nx = e.y
    const ny = -e.x // outward for CCW polygon
    const quad = [
      [a, -t],
      [b, -t],
      [b, t],
      [a, -t],
      [b, t],
      [a, t],
    ] as const
    for (const [v, z] of quad) {
      pos.push(v.x * s, v.y * s, z)
      nor.push(nx, ny, 0)
      uv.push(...uvOf(v))
    }
  }
  geo.addGroup(12, 24, 2)
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  geo.computeBoundingSphere()
  return geo
}

/** Reusable per-chain pose solver (no allocations per frame). */
export class ChainPoser {
  chain: Chain
  layout: StripLayout
  chainIndex: number
  /** world matrices in "mark" space for each panel */
  matrices: THREE.Matrix4[]
  /** fold amount per hinge (index k), 0 = flat, 1 = folded */
  fold: number[]
  /** extra opening per hinge in radians (cursor lift, crumple) */
  relax: number[]
  private foldedRoot = new THREE.Matrix4()
  private fPos = new THREE.Vector3()
  private fQuat = new THREE.Quaternion()
  private tPos = new THREE.Vector3()
  private tQuat = new THREE.Quaternion()
  private tmp = new THREE.Matrix4()
  private tmp2 = new THREE.Matrix4()
  private axis3: THREE.Vector3[]
  private pivot3: THREE.Vector3[]
  private one = new THREE.Vector3(1, 1, 1)
  private identity = new THREE.Quaternion()
  /** relief: how far short of flat a finished fold sits (radians) */
  relief = 0.05

  constructor(chain: Chain, layout: StripLayout, chainIndex: number) {
    this.chain = chain
    this.layout = layout
    this.chainIndex = chainIndex
    const n = chain.panels.length
    this.matrices = Array.from({ length: n }, () => new THREE.Matrix4())
    this.fold = new Array(n).fill(1)
    this.relax = new Array(n).fill(0)
    const s = layout.scale
    const eps = layout.thickness * 0.55
    this.axis3 = chain.hinges.map((hh) => new THREE.Vector3(hh.axis.x, hh.axis.y, 0).normalize())
    this.pivot3 = chain.hinges.map((hh) => new THREE.Vector3(hh.pivot.x * s, hh.pivot.y * s, eps))
    // folded pose of the root panel: flatToLogo * H_1(pi) ... H_root(pi)
    const e = chain.flatToLogo.elements
    const base = new THREE.Matrix4().set(
      e[0], e[3], 0, e[6] * s,
      e[1], e[4], 0, e[7] * s,
      0, 0, 1, 0,
      0, 0, 0, 1,
    )
    for (let k = 1; k <= chain.root; k++) base.multiply(this.hinge(k, Math.PI, new THREE.Matrix4()))
    this.foldedRoot.copy(base)
    this.foldedRoot.decompose(this.fPos, this.fQuat, new THREE.Vector3())
  }

  private hinge(k: number, angle: number, out: THREE.Matrix4) {
    const p = this.pivot3[k]
    out.makeRotationAxis(this.axis3[k], angle)
    // T(p) R T(-p)
    const e = out.elements
    const rx = e[0] * p.x + e[4] * p.y + e[8] * p.z
    const ry = e[1] * p.x + e[5] * p.y + e[9] * p.z
    const rz = e[2] * p.x + e[6] * p.y + e[10] * p.z
    e[12] = p.x - rx
    e[13] = p.y - ry
    e[14] = p.z - rz
    return out
  }

  /**
   * @param flatness 0 = root at its place in the mark, 1 = root on the flat strip
   * @param flatX world x where the flat strip starts (left end), flatY its y
   */
  solve(flatness: number, flatX: number, flatY: number) {
    const { chain, layout } = this
    const s = layout.scale
    const r = chain.root
    // flat root pose: identity rotation, translated so the long strip starts at flatX
    const w = flatness
    this.tPos.set(flatX + layout.offsets[this.chainIndex] * s, flatY, 0).sub(this.fPos).multiplyScalar(w).add(this.fPos)
    this.tQuat.copy(this.fQuat).slerp(this.identity, w)
    this.matrices[r].compose(this.tPos, this.tQuat, this.one)
    for (let k = r + 1; k < chain.panels.length; k++) {
      const hh = chain.hinges[k]
      const ang = hh.sign * (Math.PI - this.relief - this.relax[k]) * this.fold[k]
      this.matrices[k].multiplyMatrices(this.matrices[k - 1], this.hinge(k, ang, this.tmp))
    }
    for (let j = r - 1; j >= 0; j--) {
      const k = j + 1
      const hh = chain.hinges[k]
      const ang = hh.sign * (Math.PI - this.relief - this.relax[k]) * this.fold[k]
      this.matrices[j].multiplyMatrices(this.matrices[j + 1], this.hinge(k, ang, this.tmp2))
    }
  }

  /** Mark-space centre of the folded chain (world units). */
  centre(out: THREE.Vector3) {
    return out.set(this.chain.logoCentre.x * this.layout.scale, this.chain.logoCentre.y * this.layout.scale, 0)
  }
}
