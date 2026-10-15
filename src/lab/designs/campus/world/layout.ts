import * as THREE from 'three'
import { exhibitProjects, journalItems, seatedMembers, type BuildingId } from '../content'
import type { VerticalId } from '../../../data'

/* ------------------------------------------------------------------ *
 * Campus plan. Units ≈ 10 m. y-up, north = -z. The real BITS axis runs
 * from the clock tower (north) through the rotunda to the mandir (south).
 * ------------------------------------------------------------------ */

export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const ISLAND_R = 7.7
export function edgeR(theta: number) {
  return ISLAND_R + 0.32 * Math.sin(3 * theta + 1) + 0.2 * Math.sin(7 * theta + 2) + 0.1 * Math.sin(13 * theta + 0.5)
}

/** yaw that turns local +z towards the island centre */
export const facingCentre = (x: number, z: number) => Math.atan2(-x, -z)

export interface Placement {
  pos: THREE.Vector3
  yaw: number
}
const P = (x: number, z: number, yaw = facingCentre(x, z)): Placement => ({ pos: new THREE.Vector3(x, 0, z), yaw })

export const PLACE: Record<BuildingId | 'temple' | 'canal', Placement> = {
  tower: P(0, -4.5, 0),
  studio: P(-4.4, 0.3),
  library: P(4.4, 0.1),
  amphi: P(-2.7, 3.05),
  monument: P(0, 0, 0),
  temple: P(0, 5.15, Math.PI),
  canal: P(3.25, 3.45),
}

export function placementMatrix(p: Placement) {
  return new THREE.Matrix4().compose(p.pos, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.yaw), new THREE.Vector3(1, 1, 1))
}
export function toWorld(p: Placement, x: number, y: number, z: number, out = new THREE.Vector3()) {
  const c = Math.cos(p.yaw)
  const s = Math.sin(p.yaw)
  return out.set(p.pos.x + x * c + z * s, p.pos.y + y, p.pos.z - x * s + z * c)
}
export function dirToWorld(p: Placement, x: number, y: number, z: number, out = new THREE.Vector3()) {
  const c = Math.cos(p.yaw)
  const s = Math.sin(p.yaw)
  return out.set(x * c + z * s, y, -x * s + z * c)
}

/* ---------------- paths ---------------- */
export interface Seg {
  a: [number, number]
  b: [number, number]
  w: number
}
export interface Ring {
  c: [number, number]
  r: number
  w: number
  /** bearing range in radians (0 = north, clockwise), omit for full ring */
  range?: [number, number]
}
const deg = Math.PI / 180
export const SEGS: Seg[] = [
  { a: [0, -3.75], b: [0, 4.45], w: 0.7 }, // the axis
  { a: [-1.9, 0.18], b: [-3.38, 0.3], w: 0.46 }, // to studio
  { a: [1.9, 0.12], b: [3.38, 0.1], w: 0.46 }, // to library
  { a: [-1.38, 1.4], b: [-2.12, 2.35], w: 0.42 }, // to OAT
  { a: [1.38, 1.4], b: [2.42, 2.55], w: 0.42 }, // to canal bridge
]
export const RINGS: Ring[] = [
  { c: [0, 0], r: 1.98, w: 0.5 }, // rotunda ring
  { c: [0, 0], r: 3.55, w: 0.5, range: [-44 * deg, 44 * deg] }, // promenade under the main building
  { c: [0, 0], r: 6.55, w: 0.36 }, // cliff walk
]
/** bearing → xz */
export const bearingXZ = (theta: number, r: number): [number, number] => [Math.sin(theta) * r, -Math.cos(theta) * r]

export function pathDist(x: number, z: number) {
  let d = 1e9
  for (const s of SEGS) {
    const ax = s.a[0], az = s.a[1], bx = s.b[0], bz = s.b[1]
    const vx = bx - ax, vz = bz - az
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz)))
    const dx = x - (ax + vx * t), dz = z - (az + vz * t)
    d = Math.min(d, Math.hypot(dx, dz) - s.w / 2)
  }
  for (const r of RINGS) {
    const dx = x - r.c[0], dz = z - r.c[1]
    const rr = Math.hypot(dx, dz)
    if (r.range) {
      const b = Math.atan2(dx, -dz)
      if (b < r.range[0] || b > r.range[1]) continue
    }
    d = Math.min(d, Math.abs(rr - r.r) - r.w / 2)
  }
  return d
}

/* ---------------- terrain ---------------- */
export const PLAZA_R = 1.52
export const PLAZA_DEPTH = 0.12
export const CANAL = { rIn: 0.84, rOut: 1.27, depth: 0.2, water: -0.075 }

const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
export function groundY(x: number, z: number) {
  let y = 0.025 * Math.sin(x * 1.7 + 0.3) * Math.cos(z * 1.3 - 0.4) + 0.015 * Math.sin(x * 4.1 + z * 3.7)
  const r = Math.hypot(x, z)
  // sunken rotunda
  y -= PLAZA_DEPTH * (1 - smooth(PLAZA_R - 0.18, PLAZA_R + 0.02, r))
  if (r < PLAZA_R) y = -PLAZA_DEPTH
  // canal
  const c = PLACE.canal.pos
  const rc = Math.hypot(x - c.x, z - c.z)
  const inCanal = smooth(CANAL.rIn - 0.06, CANAL.rIn + 0.04, rc) * (1 - smooth(CANAL.rOut - 0.04, CANAL.rOut + 0.06, rc))
  y -= CANAL.depth * inCanal
  // soften the rim
  const th = Math.atan2(x, -z)
  const er = edgeR(th)
  y -= 0.1 * smooth(er - 0.6, er, r)
  // flatten building pads + paths
  if (pathDist(x, z) < 0.05) y = y * 0.35 + (r < PLAZA_R ? -PLAZA_DEPTH * 0.65 : 0)
  return y
}

/* ---------------- studio poster slots (studio local frame) ---------------- */
export interface Slot {
  /** local position / normal (building frame) */
  lp: THREE.Vector3
  ln: THREE.Vector3
  w: number
  h: number
  /** world */
  p: THREE.Vector3
  n: THREE.Vector3
  tilt?: number
}
function mkSlot(pl: Placement, lp: THREE.Vector3, ln: THREE.Vector3, w: number, h: number, tilt = 0): Slot {
  return { lp, ln, w, h, p: toWorld(pl, lp.x, lp.y, lp.z), n: dirToWorld(pl, ln.x, ln.y, ln.z).normalize(), tilt }
}

export const STUDIO = { w: 3.1, d: 2.1, h: 1.0 }
export const posterSlots: Slot[] = (() => {
  const out: Slot[] = []
  const pl = PLACE.studio
  const W = 0.27, H = 0.169
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 9; c++) out.push(mkSlot(pl, new THREE.Vector3((c - 4) * 0.31, 0.75 - r * 0.235, -STUDIO.d / 2 + 0.116), new THREE.Vector3(0, 0, 1), W, H))
  for (const side of [-1, 1])
    for (let r = 0; r < 2; r++)
      for (let c = 0; c < 4; c++)
        out.push(
          mkSlot(pl, new THREE.Vector3(side * (STUDIO.w / 2 - 0.116), 0.64 - r * 0.25, -0.62 + c * 0.36), new THREE.Vector3(-side, 0, 0), W, H),
        )
  return out.slice(0, exhibitProjects.length)
})()
export const projectSlotIndex = new Map(exhibitProjects.map((p, i) => [p.slug, i]))

/* ---------------- library slots ---------------- */
export const LIBRARY = { w: 2.8, d: 2.0, h: 1.15 }
export const journalSlots: Slot[] = (() => {
  const pl = PLACE.library
  const out: Slot[] = []
  // blogs: books on the long shelf, face out
  for (let c = 0; c < 9; c++)
    out.push(mkSlot(pl, new THREE.Vector3((c - 4) * 0.28, 0.34, -LIBRARY.d / 2 + 0.2), new THREE.Vector3(0, 0, 1), 0.19, 0.26, -0.14))
  // artworks: back wall 2×7, side walls 2×3 each
  for (let r = 0; r < 2; r++)
    for (let c = 0; c < 7; c++) out.push(mkSlot(pl, new THREE.Vector3((c - 3) * 0.34, 0.97 - r * 0.29, -LIBRARY.d / 2 + 0.116), new THREE.Vector3(0, 0, 1), 0.27, 0.23))
  for (const side of [-1, 1])
    for (let r = 0; r < 2; r++)
      for (let c = 0; c < 3; c++)
        out.push(mkSlot(pl, new THREE.Vector3(side * (LIBRARY.w / 2 - 0.116), 0.86 - r * 0.3, -0.48 + c * 0.42), new THREE.Vector3(-side, 0, 0), 0.27, 0.23))
  return out.slice(0, journalItems.length)
})()
export const journalSlotIndex = new Map(journalItems.map((j, i) => [j.key, i]))

/* ---------------- amphitheatre seats ---------------- */
export const AMPHI = { tiers: 6, r0: 0.95, dr: 0.24, h: 0.075, span: 80 * deg, stageR: 0.7 }
export interface Seat {
  p: THREE.Vector3
  yaw: number
  tier: number
  phi: number
}
export const seats: Seat[] = (() => {
  const pl = PLACE.amphi
  const n = seatedMembers.length
  const radii = Array.from({ length: AMPHI.tiers }, (_, i) => AMPHI.r0 + AMPHI.dr * i)
  const sum = radii.reduce((a, b) => a + b, 0)
  const counts = radii.map((r) => Math.floor((n * r) / sum))
  let left = n - counts.reduce((a, b) => a + b, 0)
  for (let i = counts.length - 1; left > 0; i = (i - 1 + counts.length) % counts.length, left--) counts[i]++
  const raw: { phi: number; tier: number; r: number }[] = []
  radii.forEach((r, t) => {
    const k = counts[t]
    for (let j = 0; j < k; j++) raw.push({ phi: -AMPHI.span + (2 * AMPHI.span * (j + 0.5)) / k, tier: t, r })
  })
  raw.sort((a, b) => a.phi - b.phi || a.tier - b.tier)
  return raw.map((s) => {
    const lx = Math.sin(s.phi) * s.r
    const lz = -Math.cos(s.phi) * s.r
    const p = toWorld(pl, lx, AMPHI.h * (s.tier + 1), lz)
    return { p, yaw: pl.yaw + Math.atan2(-lx, -lz), tier: s.tier, phi: s.phi }
  })
})()
export const seatIndex = new Map(seatedMembers.map((m, i) => [m.slug, i]))
export const wedgeAnchors: { v: VerticalId; p: THREE.Vector3; count: number }[] = (() => {
  const by = new Map<VerticalId, number[]>()
  seatedMembers.forEach((m, i) => {
    if (!by.has(m.vertical)) by.set(m.vertical, [])
    by.get(m.vertical)!.push(seats[i].phi)
  })
  return [...by.entries()].map(([v, phis]) => {
    const phi = (Math.min(...phis) + Math.max(...phis)) / 2
    const r = AMPHI.r0 + AMPHI.dr * AMPHI.tiers + 0.12
    return { v, p: toWorld(PLACE.amphi, Math.sin(phi) * r, 0.75, -Math.cos(phi) * r), count: phis.length }
  })
})()

/* ---------------- lamps ---------------- */
export const lamps: THREE.Vector3[] = (() => {
  const out: THREE.Vector3[] = []
  const add = (x: number, z: number) => out.push(new THREE.Vector3(x, groundY(x, z), z))
  for (const z of [-3.25, -2.35, 2.45, 3.35, 4.2]) {
    add(-0.5, z)
    add(0.5, z)
  }
  for (let k = 0; k < 8; k++) {
    const [x, z] = bearingXZ((22.5 + 45 * k) * deg, 2.3)
    add(x, z)
  }
  for (let k = 0; k < 12; k++) {
    const [x, z] = bearingXZ((15 + 30 * k) * deg, 6.86)
    add(x, z)
  }
  for (const b of [-30, -15, 15, 30]) {
    const [x, z] = bearingXZ(b * deg, 3.22)
    add(x, z)
  }
  add(-2.7, 0.0)
  add(2.7, 0.45)
  add(-1.95, 1.65)
  add(1.6, 1.95)
  return out
})()

/* ---------------- walkers ---------------- */
export interface Route {
  pts: THREE.Vector3[]
  loop: boolean
  len: number[]
  total: number
}
function mkRoute(xz: [number, number][], loop: boolean): Route {
  const pts = xz.map(([x, z]) => new THREE.Vector3(x, 0, z))
  if (loop) pts.push(pts[0].clone())
  const len = [0]
  for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + pts[i].distanceTo(pts[i - 1]))
  return { pts, loop, len, total: len[len.length - 1] }
}
const circle = (r: number, n = 48, from = -Math.PI, to = Math.PI): [number, number][] =>
  Array.from({ length: n }, (_, i) => bearingXZ(from + ((to - from) * i) / (n - (to - from >= 2 * Math.PI - 1e-6 ? 0 : 1)), r))
export const routes: Route[] = [
  mkRoute(circle(6.55, 72), true),
  mkRoute(circle(1.98, 36), true),
  mkRoute([[0.16, -3.6], [0.16, 4.35]], false),
  mkRoute([[-0.16, 4.35], [-0.16, -3.6]], false),
  mkRoute(circle(3.55, 20, -42 * deg, 42 * deg), false),
  mkRoute([[-1.95, 0.18], [-3.3, 0.3]], false),
  mkRoute([[1.95, 0.12], [3.3, 0.1]], false),
  mkRoute([[-1.4, 1.42], [-2.1, 2.33]], false),
  mkRoute([[1.4, 1.42], [2.4, 2.53]], false),
]

/* ---------------- free space test for scattering ---------------- */
export function isFree(x: number, z: number, margin = 0.2) {
  const r = Math.hypot(x, z)
  const th = Math.atan2(x, -z)
  if (r > edgeR(th) - 0.45) return false
  if (r < 2.5) return false
  if (pathDist(x, z) < margin) return false
  // main building arc
  if (r > 3.1 && r < 5.35 && Math.abs(th) < 50 * deg) return false
  const inBox = (pl: Placement, w: number, d: number, pad: number) => {
    const dx = x - pl.pos.x, dz = z - pl.pos.z
    const c = Math.cos(-pl.yaw), s = Math.sin(-pl.yaw)
    const lx = dx * c + dz * s, lz = -dx * s + dz * c
    return Math.abs(lx) < w / 2 + pad && Math.abs(lz) < d / 2 + pad
  }
  if (inBox(PLACE.studio, STUDIO.w, STUDIO.d + 0.6, 0.35)) return false
  if (inBox(PLACE.library, LIBRARY.w, LIBRARY.d + 0.9, 0.35)) return false
  const near = (pl: Placement, rad: number) => Math.hypot(x - pl.pos.x, z - pl.pos.z) < rad
  if (near(PLACE.amphi, 2.45)) return false
  if (near(PLACE.canal, CANAL.rOut + 0.2) && !near(PLACE.canal, CANAL.rIn - 0.25)) return false
  if (near(PLACE.canal, 0.4)) return false
  if (near(PLACE.temple, 1.05)) return false
  return true
}

/* ---------------- sign anchors (world) ---------------- */
export const signAnchor: Record<BuildingId, THREE.Vector3> = {
  studio: toWorld(PLACE.studio, 0, 1.75, 0),
  library: toWorld(PLACE.library, 0, 2.15, 0),
  amphi: toWorld(PLACE.amphi, -0.2, 0.75, -1.5),
  tower: new THREE.Vector3(0, 5.8, -4.55),
  monument: new THREE.Vector3(0, 2.95, 0),
}
