import * as THREE from 'three'
import { GeoBuilder, archGeo, bake, glow, tf, type GlowLight } from './builder'
import {
  AMPHI,
  CANAL,
  LIBRARY,
  PLACE,
  PLAZA_R,
  STUDIO,
  bearingXZ,
  edgeR,
  groundY,
  journalSlots,
  lamps,
  pathDist,
  placementMatrix,
  posterSlots,
  rng,
  toWorld,
  isFree,
} from './layout'
import { PAL } from './materials'

/* ---------------- albedo palette ---------------- */
const C = {
  sand: '#dcc69c',
  sandDark: '#b89f77',
  sandDeep: '#9a8262',
  trim: '#efe3c6',
  marble: '#f1edf7',
  concrete: '#8f8896',
  concreteDark: '#6a6474',
  roof: '#4a4256',
  roofDark: '#38314a',
  terracotta: '#6b4c45',
  recess: '#1a1526',
  wood: '#7c5c42',
  woodDark: '#4e392b',
  grassA: '#2e5a4a',
  grassB: '#346250',
  grassC: '#284f42',
  path: '#cbb692',
  pathEdge: '#8d806d',
  plazaA: '#ab9f8c',
  plazaB: '#9b8f7e',
  soil: '#674853',
  rockA: '#4a3a5b',
  rockB: '#3f3253',
  rockDeep: '#272140',
  canalBed: '#1a2235',
  frame: '#16121c',
  seatA: '#bba380',
  seatB: '#a58e6d',
  stage: '#7a5b45',
}
const WIN = PAL.window
const WIN2 = PAL.windowCool
const deg = Math.PI / 180

/* ---------------- light sources for baking ---------------- */
export function bakeLights(): GlowLight[] {
  const L: GlowLight[] = []
  for (const l of lamps) L.push(glow(l.x, l.y + 0.44, l.z, PAL.lamp, 1.25, 0.85))
  L.push(glow(0, 1.5, 0, PAL.violet, 2.8, 0.6))
  L.push(glow(0, 0.2, 0, PAL.lamp, 1.6, 0.25))
  // window spill along the main building
  for (let b = -36; b <= 36; b += 12) {
    const [x, z] = bearingXZ(b * deg, 3.9)
    L.push(glow(x, 0.35, z, WIN, 1.0, 0.5))
  }
  L.push(glow(0, 3.45, -3.95, WIN2, 1.3, 0.55)) // clock face
  // studio: interior + front spill
  const s = (x: number, y: number, z: number, c: string, r: number, i: number) => {
    const p = toWorld(PLACE.studio, x, y, z)
    L.push(glow(p.x, p.y, p.z, c, r, i))
  }
  s(0, 0.85, 0, WIN, 1.9, 0.75)
  s(0, 0.35, 1.5, WIN, 1.5, 0.6)
  const lb = (x: number, y: number, z: number, c: string, r: number, i: number) => {
    const p = toWorld(PLACE.library, x, y, z)
    L.push(glow(p.x, p.y, p.z, c, r, i))
  }
  lb(0, 0.9, 0, WIN, 1.8, 0.75)
  lb(0, 0.35, 1.55, WIN, 1.4, 0.55)
  const am = (x: number, y: number, z: number, c: string, r: number, i: number) => {
    const p = toWorld(PLACE.amphi, x, y, z)
    L.push(glow(p.x, p.y, p.z, c, r, i))
  }
  am(-0.8, 0.7, 0.35, PAL.lamp, 1.7, 0.6)
  am(0.8, 0.7, 0.35, PAL.lamp, 1.7, 0.6)
  am(0, 0.3, 0, PAL.lampHot, 1.0, 0.4)
  const tp = (x: number, y: number, z: number, c: string, r: number, i: number) => {
    const p = toWorld(PLACE.temple, x, y, z)
    L.push(glow(p.x, p.y, p.z, c, r, i))
  }
  tp(-0.55, 0.15, 0.75, PAL.lampHot, 1.4, 0.8)
  tp(0.55, 0.15, 0.75, PAL.lampHot, 1.4, 0.8)
  tp(0, 0.1, -0.8, PAL.lampHot, 1.1, 0.5)
  L.push(glow(PLACE.canal.pos.x, 0.35, PLACE.canal.pos.z, WIN, 1.1, 0.6))
  return L
}

/* ---------------- terrain ---------------- */
function grassColor(x: number, z: number, r: () => number) {
  const n = Math.sin(x * 1.3 + Math.sin(z * 0.9)) + Math.sin(z * 1.7 - x * 0.4)
  const stripe = Math.floor((x + 20) / 0.42) % 2 === 0 && Math.hypot(x, z) < 3.4 && z < 0 ? 0.04 : 0
  const base = n > 0.6 ? C.grassB : n < -0.7 ? C.grassC : C.grassA
  const c = new THREE.Color(base)
  c.offsetHSL(0, 0, (r() - 0.5) * 0.025 + stripe)
  return c
}

export function buildGround(lights: GlowLight[]) {
  const NR = 58
  const NS = 168
  const R = rng(7)
  const ring = (j: number, i: number) => {
    const th = (i / NS) * Math.PI * 2
    const rr = (j / NR) ** 0.92 * edgeR(th)
    const x = Math.sin(th) * rr
    const z = -Math.cos(th) * rr
    return [x, groundY(x, z), z]
  }
  const grid: number[][][] = []
  for (let j = 0; j <= NR; j++) {
    grid[j] = []
    for (let i = 0; i <= NS; i++) grid[j][i] = ring(j, i % NS)
  }
  const pos: number[] = []
  const col: number[] = []
  const cc = new THREE.Color()
  const face = (a: number[], b: number[], c: number[]) => {
    pos.push(...a, ...b, ...c)
    const x = (a[0] + b[0] + c[0]) / 3
    const z = (a[2] + b[2] + c[2]) / 3
    const r = Math.hypot(x, z)
    const pd = pathDist(x, z)
    const cp = PLACE.canal.pos
    const rc = Math.hypot(x - cp.x, z - cp.z)
    if (r < PLAZA_R + 0.02) cc.set(Math.floor(r / 0.26) % 2 ? C.plazaA : C.plazaB)
    else if (rc > CANAL.rIn - 0.02 && rc < CANAL.rOut + 0.02) cc.set(C.canalBed)
    else if (pd < 0) {
      cc.set(C.path)
      cc.offsetHSL(0, 0, (R() - 0.5) * 0.04)
    } else if (pd < 0.07) cc.set(C.pathEdge)
    else cc.copy(grassColor(x, z, R))
    for (let k = 0; k < 3; k++) col.push(cc.r, cc.g, cc.b)
  }
  for (let j = 0; j < NR; j++)
    for (let i = 0; i < NS; i++) {
      const a = grid[j][i], b = grid[j][i + 1], c = grid[j + 1][i], d = grid[j + 1][i + 1]
      if (j === 0) face(a, d, c)
      else {
        face(a, d, c)
        face(a, b, d)
      }
    }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  g.setAttribute('aGlow', new THREE.Float32BufferAttribute(new Float32Array(pos.length), 3))
  g.computeVertexNormals()
  bake(g, lights, { ao: 0 })
  return g
}

export function buildCliff() {
  const NS = 168
  const R = rng(11)
  const rows: { f: number; y: number; jit: number }[] = [
    { f: 1.0, y: 0, jit: 0 },
    { f: 1.005, y: -0.06, jit: 0 },
    { f: 1.0, y: -0.38, jit: 0.04 },
    { f: 0.965, y: -0.62, jit: 0.06 },
    { f: 0.92, y: -1.0, jit: 0.12 },
    { f: 0.84, y: -1.55, jit: 0.16 },
    { f: 0.73, y: -2.2, jit: 0.2 },
    { f: 0.6, y: -2.9, jit: 0.22 },
    { f: 0.46, y: -3.6, jit: 0.22 },
    { f: 0.32, y: -4.3, jit: 0.2 },
    { f: 0.19, y: -5.0, jit: 0.16 },
    { f: 0.08, y: -5.6, jit: 0.1 },
  ]
  const verts: THREE.Vector3[][] = rows.map((row, k) =>
    Array.from({ length: NS }, (_, i) => {
      const th = (i / NS) * Math.PI * 2
      const er = edgeR(th)
      const rr = er * row.f + (k > 1 ? (R() - 0.5) * row.jit * 2 : 0)
      const x = Math.sin(th) * rr
      const z = -Math.cos(th) * rr
      const y = k === 0 ? groundY(x, z) : row.y + (k > 1 ? (R() - 0.5) * row.jit : 0)
      return new THREE.Vector3(x, y, z)
    }),
  )
  const tip = new THREE.Vector3(0.25, -6.15, 0.3)
  const pos: number[] = []
  const col: number[] = []
  const cc = new THREE.Color()
  const push = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, k: number) => {
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z)
    if (k === 0) cc.set(C.grassC)
    else if (k === 1) cc.set(C.soil)
    else {
      cc.set(k % 2 ? C.rockA : C.rockB).lerp(new THREE.Color(C.rockDeep), Math.min(1, (k - 2) / 8))
      cc.offsetHSL((R() - 0.5) * 0.02, 0, (R() - 0.5) * 0.03)
    }
    for (let q = 0; q < 3; q++) col.push(cc.r, cc.g, cc.b)
  }
  for (let k = 0; k < rows.length - 1; k++)
    for (let i = 0; i < NS; i++) {
      const i2 = (i + 1) % NS
      const a = verts[k][i], b = verts[k][i2], c = verts[k + 1][i], d = verts[k + 1][i2]
      push(a, c, d, k)
      push(a, d, b, k)
    }
  const last = verts[rows.length - 1]
  for (let i = 0; i < NS; i++) push(last[i], tip, last[(i + 1) % NS], rows.length)
  // floating shards
  const shard = new THREE.DodecahedronGeometry(1, 0)
  const sp = shard.attributes.position
  for (let s = 0; s < 9; s++) {
    const th = R() * Math.PI * 2
    const rr = 7.6 + R() * 2.4
    const m = tf(Math.sin(th) * rr, -0.8 - R() * 2.6, -Math.cos(th) * rr, R() * 6, 0.2 + R() * 0.35, 0.25 + R() * 0.45, 0.2 + R() * 0.3, R(), R())
    const v = new THREE.Vector3()
    const tri: THREE.Vector3[] = []
    for (let i = 0; i < sp.count; i++) {
      v.fromBufferAttribute(sp, i).applyMatrix4(m)
      tri.push(v.clone())
      if (tri.length === 3) {
        push(tri[0], tri[1], tri[2], 4 + (s % 3))
        tri.length = 0
      }
    }
    // grassy top on the larger shards
  }
  shard.dispose()
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  g.setAttribute('aGlow', new THREE.Float32BufferAttribute(new Float32Array(pos.length), 3))
  g.computeVertexNormals()
  return g
}

/* ---------------- shared bits ---------------- */
const CORNERS = [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const
function chhatri(b: GeoBuilder, x: number, y: number, z: number, s: number, color = C.trim) {
  const p = 0.11 * s
  for (const [dx, dz] of CORNERS) b.box(x + dx * p, y, z + dz * p, 0.035 * s, 0.2 * s, 0.035 * s, color)
  b.box(x, y + 0.2 * s, z, 0.3 * s, 0.035 * s, 0.3 * s, color)
  b.add(new THREE.SphereGeometry(0.13 * s, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), color, tf(x, y + 0.235 * s, z, 0, 1, 1.2, 1))
  b.add(new THREE.ConeGeometry(0.022 * s, 0.1 * s, 5), color, tf(x, y + 0.43 * s, z))
}
const cyl = (rt: number, rb: number, h: number, seg: number) => new THREE.CylinderGeometry(rt, rb, h, seg)
const dome = (r: number, seg = 12) => new THREE.SphereGeometry(r, seg, Math.max(3, seg / 2), 0, Math.PI * 2, 0, Math.PI / 2)

/** Annular sector prism (local xz; φ measured from -z towards +x), base y0, height h. */
function ringSector(rIn: number, rOut: number, a0: number, a1: number, h: number, seg: number) {
  const s = new THREE.Shape()
  // shape (u, v) maps to world (x = u, z = -v) after rotateX(-90°)
  const pt = (r: number, a: number) => [Math.sin(a) * r, Math.cos(a) * r] as const
  const [sx, sy] = pt(rOut, a0)
  s.moveTo(sx, sy)
  for (let i = 1; i <= seg; i++) s.lineTo(...pt(rOut, a0 + ((a1 - a0) * i) / seg))
  for (let i = seg; i >= 0; i--) s.lineTo(...pt(rIn, a0 + ((a1 - a0) * i) / seg))
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 1 })
  g.rotateX(-Math.PI / 2)
  return g
}

/** Square frustum (4-sided cylinder turned 45°), base at y=0. */
const frustum = (rb: number, rt: number, h: number) => cyl(rt, rb, h, 4).rotateY(Math.PI / 4).translate(0, h / 2, 0)

export interface Opening {
  body: THREE.BufferGeometry
  glass: THREE.BufferGeometry
  /** pivot in building-local coordinates */
  pivot: THREE.Vector3
}

/* ---------------- main building + clock tower (world space) ---------------- */
export const TOWER_POS = new THREE.Vector3(0, 0, -4.55)
export const CLOCK_Y = 3.5
export const CLOCK_R = 0.437
export const MAST_TOP = new THREE.Vector3(0, 5.76, -4.55)

export function buildTower(lights: GlowLight[]) {
  const body = new GeoBuilder()
  const glass = new GeoBuilder()
  const faces = new GeoBuilder()
  const R = rng(23)
  for (let k = 0; k <= 10; k++) {
    if (k === 5) continue
    const bearing = (-40 + k * 8) * deg
    const [x, z] = bearingXZ(bearing, 4.35)
    const yaw = Math.atan2(-x, -z)
    const wb = new GeoBuilder()
    const wg = new GeoBuilder()
    const end = k === 0 || k === 10
    const h = end ? 1.08 : 0.86
    const w = end ? 0.72 : 0.64
    wb.box(0, 0, 0, w, h, 0.58, C.sand)
    wb.box(0, 0.4, 0.005, w + 0.02, 0.045, 0.6, C.trim)
    wb.box(0, h, 0.005, w + 0.03, 0.05, 0.62, C.trim)
    wb.box(0, h + 0.05, 0.22, w + 0.02, 0.07, 0.06, C.sandDark)
    wb.box(0, h + 0.05, -0.22, w + 0.02, 0.07, 0.06, C.sandDark)
    wb.box(0, 0, 0.29, w + 0.02, 0.04, 0.06, C.sandDeep)
    for (const ax of [-0.15, 0.15]) {
      wb.add(archGeo(0.18, 0.33, 0.35), C.recess, tf(ax, 0.04, 0.292))
      wg.add(archGeo(0.12, 0.24, 0.35), R() > 0.25 ? WIN : WIN2, tf(ax, 0.5, 0.293), R())
      wg.add(archGeo(0.1, 0.2, 0.35), WIN, tf(ax, 0.52, -0.293, Math.PI), R())
      if (end) wg.add(archGeo(0.1, 0.22, 0.35), WIN2, tf(ax, 0.78, 0.293), R())
    }
    if (end) chhatri(wb, 0, h + 0.05, 0, 1.25)
    const m = tf(x, 0, z, yaw)
    body.addBuilt(wb.build(), m)
    glass.addBuilt(wg.build(), m)
  }
  // the tower (built at origin, moved to TOWER_POS)
  const T = new GeoBuilder()
  const TG = new GeoBuilder()
  T.box(0, 0, 0, 1.18, 1.06, 1.02, C.sand)
  T.box(0, 0, 0.53, 1.2, 0.05, 0.08, C.sandDeep)
  T.add(archGeo(0.38, 0.62, 0.4), C.recess, tf(0, 0.05, 0.512))
  TG.add(archGeo(0.3, 0.5, 0.4), WIN, tf(0, 0.05, 0.508), 0.02)
  T.box(0, 1.06, 0, 1.28, 0.07, 1.12, C.trim)
  for (const ax of [-0.36, 0.36]) TG.add(archGeo(0.13, 0.26, 0.4), WIN, tf(ax, 0.55, 0.512), R())
  T.box(0, 1.13, 0, 0.74, 1.98, 0.74, C.sand)
  for (const [dx, dz] of CORNERS) T.box(dx * 0.36, 1.13, dz * 0.36, 0.1, 1.98, 0.1, C.trim)
  for (let s = 0; s < 4; s++) {
    const a = (s * Math.PI) / 2
    for (const y of [1.55, 2.3]) TG.add(archGeo(0.1, 0.32, 0.4), WIN, tf(Math.sin(a) * 0.372, y, Math.cos(a) * 0.372, a), R())
  }
  T.box(0, 3.08, 0, 0.92, 0.06, 0.92, C.trim)
  T.box(0, 3.14, 0, 0.86, 0.74, 0.86, C.sand)
  T.box(0, 3.88, 0, 0.98, 0.07, 0.98, C.trim)
  for (let s = 0; s < 4; s++) {
    const a = (s * Math.PI) / 2
    const nx = Math.sin(a), nz = Math.cos(a)
    T.add(new THREE.CircleGeometry(0.32, 20), C.frame, tf(nx * 0.432, CLOCK_Y, nz * 0.432, a))
    faces.add(new THREE.CircleGeometry(0.27, 24), '#ffffff', tf(nx * 0.436, CLOCK_Y, nz * 0.436, a))
    for (let t = 0; t < 12; t++) {
      const ang = (t / 12) * Math.PI * 2
      const r = 0.235
      const lx = Math.sin(ang) * r
      const ly = Math.cos(ang) * r
      // tick marks (dark) on the face, oriented in the face plane
      const m = tf(nx * 0.4385 + Math.cos(a) * lx, CLOCK_Y + ly, nz * 0.4385 - Math.sin(a) * lx, a, 1, 1, 1, 0, -ang)
      T.add(new THREE.PlaneGeometry(0.014, t % 3 === 0 ? 0.05 : 0.03), C.frame, m)
    }
  }
  for (const [dx, dz] of CORNERS) {
    T.box(dx * 0.43, 3.95, dz * 0.43, 0.08, 0.16, 0.08, C.trim)
    T.add(new THREE.ConeGeometry(0.05, 0.2, 4), C.trim, tf(dx * 0.43, 4.21, dz * 0.43, Math.PI / 4))
  }
  T.box(0, 3.95, 0, 0.62, 0.5, 0.62, C.sandDark)
  for (let s = 0; s < 4; s++) {
    const a = (s * Math.PI) / 2
    TG.add(archGeo(0.22, 0.36, 0.45), WIN2, tf(Math.sin(a) * 0.312, 4.0, Math.cos(a) * 0.312, a), R())
  }
  T.box(0, 4.45, 0, 0.7, 0.05, 0.7, C.trim)
  T.add(cyl(0.3, 0.33, 0.08, 12), C.trim, tf(0, 4.54, 0))
  T.add(dome(0.31), C.sand, tf(0, 4.58, 0, 0, 1, 1.25, 1))
  T.add(cyl(0.02, 0.05, 0.3, 6), C.trim, tf(0, 5.12, 0))
  T.add(cyl(0.012, 0.02, 0.5, 5), C.concreteDark, tf(0, 5.48, 0))
  for (const y of [5.36, 5.54]) T.box(0, y, 0, 0.22, 0.012, 0.012, C.concreteDark)
  const tm = new THREE.Matrix4().makeTranslation(TOWER_POS.x, 0, TOWER_POS.z)
  body.addBuilt(T.build(), tm)
  glass.addBuilt(TG.build(), tm)
  const facesG = faces.build()
  facesG.applyMatrix4(tm)
  const bodyG = body.build()
  bake(bodyG, lights, { ground: groundY, ao: 0.55 })
  return { body: bodyG, glass: glass.build(), faces: facesG }
}

/* ---------------- studio (local; front = +z) ---------------- */
export function buildStudio(lights: GlowLight[]) {
  const W = placementMatrix(PLACE.studio)
  const { w, d, h } = STUDIO
  const R = rng(31)
  const b = new GeoBuilder()
  const g = new GeoBuilder()
  b.box(0, -0.06, 0.2, w + 0.16, 0.12, d + 0.5, C.concreteDark)
  b.box(0, 0.06, 0, w - 0.2, 0.012, d - 0.2, C.wood)
  b.box(0, 0.072, 0.15, w - 0.9, 0.006, d - 0.75, '#3a2c52')
  b.box(0, 0.074, 0.15, w - 1.0, 0.006, d - 0.85, '#4a3768')
  b.box(0, 0, -d / 2 + 0.05, w, h, 0.1, C.concrete)
  for (const s of [-1, 1]) b.box((s * (w - 0.1)) / 2, 0, 0, 0.1, h, d, C.concrete)
  for (let i = -3; i <= 3; i++) b.box(i * 0.44, 0, -d / 2 - 0.03, 0.05, h, 0.06, C.concreteDark)
  for (const s of [-1, 1]) for (let i = -2; i <= 2; i++) b.box(s * (w / 2 + 0.03), 0, i * 0.4, 0.06, h, 0.05, C.concreteDark)
  for (const s of posterSlots) {
    const yaw = Math.atan2(s.ln.x, s.ln.z)
    b.add(new THREE.BoxGeometry(s.w + 0.035, s.h + 0.035, 0.012), C.frame, tf(s.lp.x - s.ln.x * 0.012, s.lp.y, s.lp.z - s.ln.z * 0.012, yaw))
  }
  for (const tx of [-0.62, 0.62]) {
    b.box(tx, 0.24, 0.12, 0.84, 0.025, 0.34, C.woodDark)
    for (const lx of [-0.36, 0.36]) for (const lz of [-0.02, 0.26]) b.box(tx + lx, 0.06, lz, 0.025, 0.18, 0.025, C.woodDark)
    for (const mx of [-0.25, 0.02, 0.29]) {
      b.box(tx + mx, 0.265, 0.03, 0.02, 0.05, 0.02, C.frame)
      b.box(tx + mx, 0.31, 0.03, 0.17, 0.11, 0.012, C.frame)
      g.add(new THREE.PlaneGeometry(0.15, 0.09), '#8ccfff', tf(tx + mx, 0.365, 0.0375), R())
    }
    for (const cx of [-0.25, 0.25]) b.box(tx + cx, 0.06, 0.42, 0.11, 0.12, 0.11, C.recess)
  }
  const body = b.build()
  bake(body, lights, { world: W, ao: 0.5 })

  // glazed front (falls forward like a drawbridge) – pivot at the front bottom edge
  const f = new GeoBuilder()
  const fg = new GeoBuilder()
  const fz = 0.0
  f.box(0, 0, fz - 0.04, w, 0.12, 0.08, C.concreteDark)
  for (let i = 0; i <= 6; i++) f.box(-w / 2 + 0.05 + (i * (w - 0.1)) / 6, 0.12, fz - 0.04, 0.04, h - 0.12, 0.06, C.frame)
  f.box(0, h - 0.06, fz - 0.04, w, 0.06, 0.08, C.frame)
  f.box(0, 0.55, fz - 0.04, w, 0.03, 0.06, C.frame)
  for (let i = 0; i < 6; i++) {
    const x = -w / 2 + 0.05 + ((i + 0.5) * (w - 0.1)) / 6
    fg.add(new THREE.PlaneGeometry(0.44, 0.41), i % 3 === 1 ? WIN2 : WIN, tf(x, 0.335, fz - 0.035), R())
    fg.add(new THREE.PlaneGeometry(0.44, 0.36), i % 2 ? WIN2 : WIN, tf(x, 0.76, fz - 0.035), R())
  }
  const front: Opening = { body: f.build(), glass: fg.build(), pivot: new THREE.Vector3(0, 0.07, d / 2) }
  bake(front.body, lights, { world: W.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0, d / 2)), ao: 0.2 })
  front.body.translate(0, -0.07, 0)
  front.glass.translate(0, -0.07, 0)

  // saw-tooth roof – pivot at the eaves
  const r = new GeoBuilder()
  const rg = new GeoBuilder()
  const teeth = 4
  const tw = (d + 0.12) / teeth
  for (let t = 0; t < teeth; t++) {
    const z0 = -d / 2 - 0.06 + t * tw
    const shape = new THREE.Shape()
    // shape (u,v) → rotateY(+90°) gives world z = -u, y = v, x = extrude
    shape.moveTo(-z0, 0)
    shape.lineTo(-(z0 + tw), 0)
    shape.lineTo(-(z0 + tw), 0.3)
    shape.lineTo(-z0, 0)
    const eg = new THREE.ExtrudeGeometry(shape, { depth: w + 0.12, bevelEnabled: false })
    eg.rotateY(Math.PI / 2)
    eg.translate(-(w + 0.12) / 2, 0.04, 0)
    r.add(eg, t % 2 ? C.roof : C.roofDark)
    for (let k = 0; k < 6; k++) rg.add(new THREE.PlaneGeometry((w - 0.3) / 6 - 0.05, 0.16), k % 2 ? WIN2 : '#9fd4ff', tf(-w / 2 + 0.15 + ((k + 0.5) * (w - 0.3)) / 6, 0.16, z0 + tw + 0.004), R())
  }
  r.box(0, 0, 0, w + 0.18, 0.045, d + 0.16, C.concreteDark)
  const roof: Opening = { body: r.build(), glass: rg.build(), pivot: new THREE.Vector3(0, h, -d / 2) }
  bake(roof.body, lights, { world: W.clone().multiply(new THREE.Matrix4().makeTranslation(0, h, 0)), ao: 0 })
  // hinge the lid at the back edge
  roof.body.translate(0, 0, d / 2)
  roof.glass.translate(0, 0, d / 2)
  return { body, glass: g.build(), front, roof }
}

/* ---------------- library (local; front = +z) ---------------- */
export function buildLibrary(lights: GlowLight[]) {
  const W = placementMatrix(PLACE.library)
  const { w, d, h } = LIBRARY
  const R = rng(41)
  const b = new GeoBuilder()
  const g = new GeoBuilder()
  b.box(0, -0.06, 0.25, w + 0.2, 0.14, d + 0.7, C.sandDeep)
  for (let i = 0; i < 3; i++) b.box(0, -0.06, d / 2 + 0.62 + i * 0.07, 1.0, 0.1 - i * 0.035, 0.08, C.sandDark)
  b.box(0, 0.08, 0, w - 0.2, 0.012, d - 0.2, C.woodDark)
  b.box(0, 0.092, 0.25, w - 0.8, 0.006, d - 0.9, '#5b2a33')
  b.box(0, 0.094, 0.25, w - 0.95, 0.006, d - 1.05, '#7a3a40')
  b.box(0, 0, -d / 2 + 0.05, w, h, 0.1, C.sand)
  for (const s of [-1, 1]) {
    b.box((s * (w - 0.1)) / 2, 0, 0, 0.1, h, d, C.sand)
    for (const zz of [-0.55, 0, 0.55]) g.add(archGeo(0.16, 0.42, 0.45), WIN, tf(s * (w / 2 + 0.003), 0.3, zz, (s * Math.PI) / 2), R())
    b.box(s * (w / 2 + 0.01), 0.22, 0, 0.03, 0.04, d, C.trim)
  }
  // bookshelf + face-out books (blogs)
  b.box(0, 0.08, -d / 2 + 0.16, 2.6, 0.18, 0.16, C.woodDark)
  b.box(0, 0.08, -d / 2 + 0.11, 2.6, 0.55, 0.04, C.wood)
  for (const s of journalSlots.slice(0, 9)) b.box(s.lp.x, 0.26, s.lp.z - 0.05, s.w + 0.02, 0.012, 0.09, C.trim)
  // frames for artworks
  for (const s of journalSlots.slice(9)) {
    const yaw = Math.atan2(s.ln.x, s.ln.z)
    b.add(new THREE.BoxGeometry(s.w + 0.04, s.h + 0.04, 0.012), '#3a2c22', tf(s.lp.x - s.ln.x * 0.012, s.lp.y, s.lp.z - s.ln.z * 0.012, yaw))
  }
  // reading tables + lamps
  for (const tx of [-0.55, 0.55]) {
    b.box(tx, 0.24, 0.25, 0.7, 0.03, 0.34, C.wood)
    for (const lx of [-0.3, 0.3]) for (const lz of [0.11, 0.39]) b.box(tx + lx, 0.08, lz, 0.025, 0.16, 0.025, C.woodDark)
    b.box(tx, 0.27, 0.25, 0.012, 0.06, 0.012, C.frame)
    g.add(new THREE.ConeGeometry(0.035, 0.03, 8), PAL.lampHot, tf(tx, 0.33, 0.25), 0.01)
  }
  const body = b.build()
  bake(body, lights, { world: W, ao: 0.5 })

  // facade (folds forward) — pivot at the front bottom edge
  const f = new GeoBuilder()
  const fg = new GeoBuilder()
  f.box(0, 0, -0.05, w, h, 0.1, C.sand)
  f.box(0, h, -0.05, w + 0.04, 0.06, 0.14, C.trim)
  f.box(0, 0.5, -0.0, w + 0.02, 0.035, 0.03, C.trim)
  f.add(archGeo(0.34, 0.62, 0.45), C.recess, tf(0, 0.0, 0.002))
  fg.add(archGeo(0.28, 0.56, 0.45), WIN, tf(0, 0.0, 0.004), 0.02)
  for (const x of [-1.0, -0.55, 0.55, 1.0]) {
    fg.add(archGeo(0.18, 0.4, 0.45), x > 0 ? WIN : WIN2, tf(x, 0.12, 0.004), R())
    fg.add(archGeo(0.13, 0.24, 0.45), WIN, tf(x, 0.62, 0.004), R())
  }
  // colonnade
  for (const x of [-1.2, -0.75, -0.3, 0.3, 0.75, 1.2]) {
    f.add(cyl(0.04, 0.05, 0.92, 8), C.trim, tf(x, 0.46 + 0.03, 0.4))
    f.box(x, 0, 0.4, 0.12, 0.04, 0.12, C.trim)
    f.box(x, 0.93, 0.4, 0.12, 0.05, 0.12, C.trim)
  }
  f.box(0, 0.98, 0.22, w + 0.04, 0.1, 0.5, C.sand)
  f.box(0, 1.08, 0.22, w + 0.08, 0.04, 0.54, C.trim)
  chhatri(f, -w / 2 + 0.12, 1.12, 0.36, 0.9)
  chhatri(f, w / 2 - 0.12, 1.12, 0.36, 0.9)
  const front: Opening = { body: f.build(), glass: fg.build(), pivot: new THREE.Vector3(0, 0.08, d / 2) }
  bake(front.body, lights, { world: W.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0, d / 2)), ao: 0.4 })
  front.body.translate(0, -0.08, 0)
  front.glass.translate(0, -0.08, 0)

  // roof with dome and chhatris — pivot at the eaves
  const r = new GeoBuilder()
  const rg = new GeoBuilder()
  r.box(0, 0, 0, w + 0.08, 0.08, d + 0.08, C.sandDark)
  r.box(0, 0.08, 0, w - 0.04, 0.03, d - 0.04, C.terracotta)
  for (const s of [-1, 1]) {
    r.box(0, 0.08, s * (d / 2 - 0.01), w + 0.06, 0.09, 0.06, C.trim)
    r.box(s * (w / 2 - 0.01), 0.08, 0, 0.06, 0.09, d + 0.06, C.trim)
  }
  r.add(cyl(0.46, 0.5, 0.22, 16), C.sand, tf(0, 0.25, 0))
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2
    rg.add(archGeo(0.08, 0.13, 0.4), WIN2, tf(Math.sin(a) * 0.485, 0.17, Math.cos(a) * 0.485, a), R())
  }
  r.add(cyl(0.5, 0.5, 0.04, 16), C.trim, tf(0, 0.37, 0))
  r.add(dome(0.46, 14), C.sand, tf(0, 0.39, 0, 0, 1, 1.2, 1))
  r.add(cyl(0.015, 0.04, 0.28, 6), C.trim, tf(0, 0.98, 0))
  for (const [dx, dz] of CORNERS) chhatri(r, dx * (w / 2 - 0.15), 0.14, dz * (d / 2 - 0.15), 1.0)
  const roof: Opening = { body: r.build(), glass: rg.build(), pivot: new THREE.Vector3(0, h, -d / 2) }
  bake(roof.body, lights, { world: W.clone().multiply(new THREE.Matrix4().makeTranslation(0, h, 0)), ao: 0 })
  // hinge the lid at the back edge
  roof.body.translate(0, 0, d / 2)
  roof.glass.translate(0, 0, d / 2)
  return { body, glass: g.build(), front, roof }
}

/* ---------------- OAT amphitheatre (local; stage at origin, seats behind −z) ---------------- */
export function buildAmphi(lights: GlowLight[]) {
  const W = placementMatrix(PLACE.amphi)
  const b = new GeoBuilder()
  const g = new GeoBuilder()
  const span = AMPHI.span + 6 * deg
  for (let t = 0; t < AMPHI.tiers; t++) {
    const r = AMPHI.r0 + AMPHI.dr * t
    b.add(ringSector(r - AMPHI.dr / 2, r + AMPHI.dr / 2, -span, span, AMPHI.h * (t + 1), 18), t % 2 ? C.seatA : C.seatB)
  }
  const rb = AMPHI.r0 + AMPHI.dr * (AMPHI.tiers - 0.5)
  b.add(ringSector(rb, rb + 0.09, -span - 2 * deg, span + 2 * deg, AMPHI.h * AMPHI.tiers + 0.22, 18), C.sandDark)
  for (const s of [-1, 1]) {
    const a = s * (span + 2 * deg)
    // aisle walls at the ends
    const rIn = AMPHI.r0 - AMPHI.dr / 2
    const shape = new THREE.Shape()
    shape.moveTo(0, 0)
    shape.lineTo(rb + 0.09 - rIn, 0)
    shape.lineTo(rb + 0.09 - rIn, AMPHI.h * AMPHI.tiers + 0.22)
    shape.lineTo(0, AMPHI.h)
    const wall = new THREE.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: false })
    // shape x → radial outward, y → up; extrude → tangential
    const radial = new THREE.Vector3(Math.sin(a), 0, -Math.cos(a))
    const tang = new THREE.Vector3(Math.cos(a), 0, Math.sin(a))
    const m = new THREE.Matrix4().makeBasis(radial, new THREE.Vector3(0, 1, 0), tang.multiplyScalar(s > 0 ? 1 : -1))
    if (m.determinant() < 0) m.makeBasis(radial, new THREE.Vector3(0, 1, 0), tang.multiplyScalar(-1))
    m.setPosition(radial.clone().multiplyScalar(rIn))
    b.add(wall, C.sandDark, m)
  }
  // stage
  b.add(cyl(AMPHI.stageR, AMPHI.stageR + 0.03, 0.1, 20), C.stage, tf(0, 0.05, 0.05))
  b.add(cyl(AMPHI.stageR + 0.05, AMPHI.stageR + 0.05, 0.02, 20), C.sandDark, tf(0, 0.0, 0.05))
  for (const s of [-1, 1]) {
    b.add(cyl(0.012, 0.016, 0.7, 5), C.concreteDark, tf(s * 0.85, 0.35, 0.45))
    b.box(s * 0.85, 0.7, 0.45, 0.07, 0.05, 0.07, C.frame)
    g.add(new THREE.SphereGeometry(0.03, 6, 4), PAL.lampHot, tf(s * 0.85, 0.7, 0.49), 0.01)
  }
  const body = b.build()
  bake(body, lights, { world: W, ao: 0.4 })
  return { body, glass: g.build() }
}

/* ---------------- Saraswati Mandir (local; faces north) ---------------- */
export function buildTemple(lights: GlowLight[]) {
  const W = placementMatrix(PLACE.temple)
  const b = new GeoBuilder()
  const g = new GeoBuilder()
  const M = C.marble
  const M2 = '#dcd6e6'
  b.box(0, 0, 0, 1.25, 0.16, 1.45, M2)
  for (let i = 0; i < 3; i++) b.box(0, 0, 0.78 + i * 0.06, 0.5, 0.16 - i * 0.05, 0.08, M2)
  // mandapa (porch)
  b.box(0, 0.16, 0.3, 0.56, 0.04, 0.5, M)
  for (const [dx, dz] of CORNERS) b.add(cyl(0.025, 0.03, 0.28, 6), M, tf(dx * 0.22, 0.34, 0.3 + dz * 0.19))
  b.box(0, 0.48, 0.3, 0.6, 0.05, 0.54, M)
  b.add(frustum(0.4, 0.06, 0.28), M2, tf(0, 0.53, 0.3))
  // sanctum + shikhara
  b.box(0, 0.16, -0.22, 0.58, 0.46, 0.58, M)
  b.add(archGeo(0.16, 0.3, 0.5), C.recess, tf(0, 0.18, 0.072))
  g.add(archGeo(0.1, 0.22, 0.5), PAL.lampHot, tf(0, 0.18, 0.074), 0.01)
  const tiers: [number, number, number][] = [
    [0.42, 0.37, 0.15],
    [0.37, 0.32, 0.15],
    [0.32, 0.27, 0.15],
    [0.27, 0.21, 0.15],
    [0.21, 0.15, 0.14],
    [0.15, 0.08, 0.13],
  ]
  let y = 0.62
  tiers.forEach(([rb, rt, hh], i) => {
    b.add(frustum(rb, rt, hh), i % 2 ? M : M2, tf(0, y, -0.22))
    y += hh
  })
  b.add(cyl(0.09, 0.09, 0.05, 12), M, tf(0, y + 0.02, -0.22))
  b.add(new THREE.ConeGeometry(0.03, 0.14, 6), '#e8c37a', tf(0, y + 0.12, -0.22))
  for (const [dx, dz] of CORNERS) {
    let yy = 0.62
    for (const [rb, rt, hh] of [[0.13, 0.1, 0.1], [0.1, 0.06, 0.1], [0.06, 0.02, 0.08]] as const) {
      b.add(frustum(rb, rt, hh), M, tf(dx * 0.27, yy, -0.22 + dz * 0.27))
      yy += hh
    }
  }
  // diyas along the platform edge
  for (let i = -4; i <= 4; i++) g.add(new THREE.BoxGeometry(0.025, 0.02, 0.025), PAL.lamp, tf(i * 0.13, 0.17, 0.7), 0.01)
  const body = b.build()
  bake(body, lights, { world: W, ao: 0.35 })
  body.applyMatrix4(W)
  const glass = g.build()
  glass.applyMatrix4(W)
  return { body, glass }
}

/* ---------------- Shiv Ganga canal: pavilion, bridge, kerbs (local; +z faces centre) ---------------- */
export function buildCanal(lights: GlowLight[]) {
  const W = placementMatrix(PLACE.canal)
  const b = new GeoBuilder()
  const g = new GeoBuilder()
  const R = rng(51)
  const gap = 12 * deg
  b.add(ringSector(CANAL.rOut, CANAL.rOut + 0.06, Math.PI + gap, 3 * Math.PI - gap, 0.05, 40), C.sandDark, tf(0, -0.03, 0))
  b.add(ringSector(CANAL.rIn - 0.06, CANAL.rIn, Math.PI + gap, 3 * Math.PI - gap, 0.05, 36), C.sandDark, tf(0, -0.03, 0))
  // bridge on the +z side (towards the centre)
  b.box(0, 0.02, (CANAL.rIn + CANAL.rOut) / 2, 0.3, 0.04, CANAL.rOut - CANAL.rIn + 0.24, C.sand)
  for (const s of [-1, 1]) b.box(s * 0.14, 0.06, (CANAL.rIn + CANAL.rOut) / 2, 0.025, 0.07, CANAL.rOut - CANAL.rIn + 0.2, C.trim)
  // cottage
  b.box(0, 0, 0, 0.52, 0.3, 0.4, C.marble)
  b.add(frustum(0.42, 0.04, 0.22).scale(1.25, 1, 1), C.roof, tf(0, 0.3, 0))
  b.box(0, 0, 0.21, 0.56, 0.03, 0.06, '#d9d2e2')
  for (const x of [-0.14, 0.14]) {
    g.add(archGeo(0.08, 0.15, 0.4), WIN, tf(x, 0.08, 0.202), R())
    g.add(archGeo(0.08, 0.15, 0.4), WIN, tf(x, 0.08, -0.202, Math.PI), R())
  }
  for (const s of [-1, 1]) g.add(archGeo(0.08, 0.15, 0.4), WIN2, tf(s * 0.262, 0.08, 0, (s * Math.PI) / 2), R())
  const body = b.build()
  bake(body, lights, { world: W, ao: 0.4 })
  body.applyMatrix4(W)
  const glass = g.build()
  glass.applyMatrix4(W)
  const water = new THREE.RingGeometry(CANAL.rIn - 0.02, CANAL.rOut + 0.02, 56, 1).rotateX(-Math.PI / 2)
  water.translate(PLACE.canal.pos.x, CANAL.water, PLACE.canal.pos.z)
  return { body, glass, water }
}

/* ---------------- rotunda + monument plinth (world space at origin) ---------------- */
export function buildRotunda(lights: GlowLight[]) {
  const b = new GeoBuilder()
  const gap = 15 * deg
  for (let q = 0; q < 4; q++) {
    const a0 = (q * Math.PI) / 2 + gap
    const a1 = ((q + 1) * Math.PI) / 2 - gap
    b.add(ringSector(PLAZA_R, PLAZA_R + 0.08, a0, a1, 0.17, 8), C.sandDark, tf(0, -0.12, 0))
    b.add(ringSector(PLAZA_R - 0.01, PLAZA_R + 0.09, a0, a1, 0.025, 8), C.trim, tf(0, 0.05, 0))
    // inner step
    b.add(ringSector(PLAZA_R - 0.2, PLAZA_R, a0 - gap * 0.6, a1 + gap * 0.6, 0.06, 8), C.plazaB, tf(0, -0.12, 0))
  }
  // four Rajasthani archways (New Academic Block)
  const outer = new THREE.Shape()
  outer.moveTo(-0.36, 0)
  outer.lineTo(0.36, 0)
  outer.lineTo(0.36, 0.8)
  outer.lineTo(-0.36, 0.8)
  outer.lineTo(-0.36, 0)
  outer.holes.push(new THREE.Path(archShape2(0.42, 0.6).getPoints(6).reverse()))
  const archFrame = new THREE.ExtrudeGeometry(outer, { depth: 0.12, bevelEnabled: false, curveSegments: 6 })
  archFrame.translate(0, 0, -0.06)
  for (let q = 0; q < 4; q++) {
    const bear = (q * Math.PI) / 2
    const [x, z] = bearingXZ(bear, PLAZA_R + 0.04)
    const m = tf(x, -0.04, z, Math.atan2(-x, -z))
    b.add(archFrame, C.sand, m)
    const tb = new GeoBuilder()
    tb.box(0, 0.8, 0, 0.8, 0.05, 0.16, C.trim)
    chhatri(tb, -0.28, 0.85, 0, 0.6)
    chhatri(tb, 0.28, 0.85, 0, 0.6)
    tb.add(dome(0.11, 8), C.trim, tf(0, 0.85, 0, 0, 1, 1.3, 1))
    b.addBuilt(tb.build(), m)
  }
  // plinth
  b.add(cyl(0.84, 0.88, 0.06, 32), C.plazaA, tf(0, -0.09, 0))
  b.add(cyl(0.7, 0.74, 0.05, 8), C.sandDark, tf(0, -0.035, 0))
  b.add(cyl(0.5, 0.58, 0.4, 8), '#3f3652', tf(0, 0.19, 0))
  b.add(cyl(0.6, 0.6, 0.05, 8), C.trim, tf(0, 0.415, 0))
  b.add(cyl(0.56, 0.6, 0.05, 8), C.trim, tf(0, 0.01, 0))
  const body = b.build()
  bake(body, lights, { ground: groundY, ao: 0.4 })
  archFrame.dispose()
  return { body }
}
function archShape2(w: number, h: number) {
  const s = new THREE.Shape()
  const r = w / 2
  s.moveTo(-r, 0)
  s.lineTo(-r, h - r)
  s.quadraticCurveTo(-r, h - r * 0.2, 0, h)
  s.quadraticCurveTo(r, h - r * 0.2, r, h - r)
  s.lineTo(r, 0)
  s.lineTo(-r, 0)
  return s
}

/* ---------------- instanced prop geometry ---------------- */
export function lampGeometry() {
  const b = new GeoBuilder()
  b.box(0, 0, 0, 0.05, 0.04, 0.05, C.frame)
  b.add(cyl(0.01, 0.014, 0.38, 5), '#2a2433', tf(0, 0.22, 0))
  b.box(0, 0.4, 0, 0.055, 0.008, 0.055, '#2a2433')
  b.add(frustum(0.05, 0.005, 0.05), '#2a2433', tf(0, 0.475, 0))
  const post = b.build()
  const bulb = new THREE.IcosahedronGeometry(0.03, 0).translate(0, 0.44, 0)
  return { post, bulb }
}

export function treeGeometries() {
  const n = new GeoBuilder()
  n.add(cyl(0.018, 0.03, 0.3, 5), '#4a3629', tf(0, 0.15, 0))
  n.add(new THREE.IcosahedronGeometry(0.25, 0), '#2b5c49', tf(0, 0.44, 0, 0.3, 1, 0.78, 1))
  n.add(new THREE.IcosahedronGeometry(0.17, 0), '#23503f', tf(0.11, 0.56, -0.05, 1.1, 1, 0.85, 1))
  n.add(new THREE.IcosahedronGeometry(0.14, 0), '#326b55', tf(-0.12, 0.52, 0.08, 2.0, 1, 0.8, 1))
  const a = new GeoBuilder()
  a.add(cyl(0.014, 0.022, 0.16, 5), '#4a3629', tf(0, 0.08, 0))
  a.add(new THREE.ConeGeometry(0.11, 0.6, 6), '#2b6650', tf(0, 0.44, 0))
  a.add(new THREE.ConeGeometry(0.085, 0.36, 6), '#317459', tf(0, 0.7, 0, 0.5))
  return { neem: n.build(), ashoka: a.build() }
}

export function personGeometry() {
  const b = new GeoBuilder()
  b.add(cyl(0.024, 0.034, 0.095, 6), '#ffffff', tf(0, 0.048, 0))
  b.add(new THREE.IcosahedronGeometry(0.026, 1), '#f3dcc4', tf(0, 0.125, 0))
  return b.build()
}

/** Tree placements (instanced): formal ashoka avenue + scattered neem. */
export function treePlacements() {
  const R = rng(97)
  const ashoka: THREE.Matrix4[] = []
  const neem: THREE.Matrix4[] = []
  const avenueZ = [-3.15, -2.6, 2.6, 3.15, 3.7]
  for (const z of avenueZ) for (const x of [-0.95, 0.95]) ashoka.push(tf(x, groundY(x, z), z, R() * 6, 1, 0.9 + R() * 0.3, 1))
  // flanking the main building
  for (const bdeg of [-50, -47, 47, 50]) {
    const [x, z] = bearingXZ(bdeg * deg, 4.6 + (Math.abs(bdeg) === 47 ? -0.5 : 0.5))
    ashoka.push(tf(x, groundY(x, z), z, R(), 1.1, 1.2, 1.1))
  }
  let tries = 0
  while (neem.length < 78 && tries++ < 6000) {
    const th = R() * Math.PI * 2
    const rr = 2.4 + Math.sqrt(R()) * 5.2
    const x = Math.sin(th) * rr
    const z = -Math.cos(th) * rr
    if (!isFree(x, z, 0.22)) continue
    let ok = true
    for (const m of neem) {
      const e = m.elements
      if (Math.hypot(e[12] - x, e[14] - z) < 0.55) {
        ok = false
        break
      }
    }
    if (!ok) continue
    const s = 0.75 + R() * 0.55
    if (R() < 0.22) ashoka.push(tf(x, groundY(x, z), z, R() * 6, s, s * (0.9 + R() * 0.4), s))
    else neem.push(tf(x, groundY(x, z), z, R() * 6, s, s * (0.85 + R() * 0.3), s))
  }
  // trees on the canal island
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + 0.6
    const x = PLACE.canal.pos.x + Math.sin(a) * 0.55
    const z = PLACE.canal.pos.z + Math.cos(a) * 0.55
    neem.push(tf(x, 0, z, a, 0.55, 0.6, 0.55))
  }
  return { ashoka, neem }
}

export function firefliesPositions(count: number) {
  const R = rng(5)
  const out = new Float32Array(count * 3)
  const seeds = new Float32Array(count)
  let i = 0
  while (i < count) {
    const th = R() * Math.PI * 2
    const rr = 1.6 + Math.sqrt(R()) * 5.6
    const x = Math.sin(th) * rr
    const z = -Math.cos(th) * rr
    if (rr > edgeR(th) - 0.2) continue
    out[i * 3] = x
    out[i * 3 + 1] = groundY(x, z) + 0.12 + R() * 0.9
    out[i * 3 + 2] = z
    seeds[i] = R()
    i++
  }
  return { positions: out, seeds }
}

/** Glow tint for instanced props near light sources (cheap fake GI). */
export function glowAt(p: THREE.Vector3, lights: GlowLight[]) {
  const c = new THREE.Color(0, 0, 0)
  for (const l of lights) {
    const d = l.p.distanceTo(p)
    if (d > l.r) continue
    const k = l.i * (1 - d / l.r) ** 2
    c.r += l.c.r * k
    c.g += l.c.g * k
    c.b += l.c.b * k
  }
  return c
}
