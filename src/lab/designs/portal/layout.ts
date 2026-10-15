import * as THREE from 'three'
import { projects, artworks, blogs, team, verticals } from '../../data'
import type { Artwork, Blog, Member, Project, VerticalId } from '../../data'
import type { WorldId } from './store'

/* ------------------------------------------------------------------ gate */

/** World height of the DVM mark. */
export const GATE_S = 7.2
/** Extrusion depth in normalised logo units. */
export const GATE_DEPTH = 0.16

// The logo's own SVG frame (see src/shared/logo.ts): centre + height of the tight bbox.
const SVG_CX = (-470.31 + -219.78) / 2
const SVG_CY = (-227.2 + 99.58) / 2
const SVG_H = 99.58 - -227.2
const norm = (x: number, y: number) => new THREE.Vector2((x - SVG_CX) / SVG_H, -(y - SVG_CY) / SVG_H)

/** Centre of the mark's inner cavity (the doorway), normalised. */
const CAV_C = norm(-362.5, -50)
/** Gate group position: puts the cavity centre exactly on the z axis. */
export const GATE_POS = new THREE.Vector3(-CAV_C.x * GATE_S, -CAV_C.y * GATE_S, 0)

/** The cavity polygon (negative space under the M chevron), in gate-local world units. */
export function cavityPolygon(): THREE.Vector2[] {
  const pts: [number, number][] = [
    [-415.27, -117.75],
    [-360.23, -82.32],
    [-290.64, -133.57],
    [-290.64, -56.38],
    [-363.39, -0.08],
    [-434.25, -50.05],
    [-434.96, -117.75],
  ]
  return pts.map(([x, y]) => norm(x, y).multiplyScalar(GATE_S))
}

/* ------------------------------------------------------------- frames */

/** Symmetric shield derived from the mark: inverted chevron top, V base. */
export function shieldPoints(w: number): THREE.Vector2[] {
  const p: [number, number][] = [
    [-0.5, 0.5],
    [0, 0.3],
    [0.5, 0.5],
    [0.5, -0.22],
    [0, -0.72],
    [-0.5, -0.22],
  ]
  return p.map(([x, y]) => new THREE.Vector2(x * w, y * w))
}

export const FLOOR_Y = -3.3

export const RINGS = [
  { id: 'about', z: -14, w: 8.6, y: 0.9 },
  { id: 'numbers', z: -29, w: 8.6, y: 0.9 },
  { id: 'teams', z: -44, w: 8.6, y: 0.9 },
] as const

/* ------------------------------------------------------------- portals */

export const CHAMBER_Z = -62
export const PORTAL_W = 3.3
export const PORTAL_Y = -0.92

export interface PortalDef {
  id: WorldId
  label: string
  ref: number
  x: number
  z: number
  rotY: number
  route: string
  blurb: string
  tint: string
}

export const codeProjects: Project[] = projects.filter((p) => p.kind !== 'video')
export const filmProjects: Project[] = projects.filter((p) => p.kind === 'video')

export const PORTALS: PortalDef[] = [
  {
    id: 'code',
    label: 'Code',
    ref: 1,
    x: -4.75,
    z: CHAMBER_Z + 1.5,
    rotY: 0.32,
    route: 'work',
    blurb: `${codeProjects.length} websites, apps and portals`,
    tint: '#38e1cf',
  },
  {
    id: 'design',
    label: 'Design',
    ref: 2,
    x: 0,
    z: CHAMBER_Z,
    rotY: 0,
    route: 'journal',
    blurb: `${artworks.length} artworks and ${blogs.length} essays`,
    tint: '#ff4fa3',
  },
  {
    id: 'film',
    label: 'Film',
    ref: 3,
    x: 4.75,
    z: CHAMBER_Z + 1.5,
    rotY: -0.32,
    route: 'work?world=film',
    blurb: `${filmProjects.length} teasers, promos and curtain raisers`,
    tint: '#ffb35c',
  },
]

export const portalById = (id: WorldId) => PORTALS.find((p) => p.id === id)!

const restMatrices = new Map<WorldId, { m: THREE.Matrix4; inv: THREE.Matrix4; q: THREE.Quaternion }>()
export function portalRest(id: WorldId) {
  let r = restMatrices.get(id)
  if (!r) {
    const p = portalById(id)
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, p.rotY, 0))
    const m = new THREE.Matrix4().compose(new THREE.Vector3(p.x, PORTAL_Y, p.z), q, new THREE.Vector3(1, 1, 1))
    r = { m, inv: m.clone().invert(), q }
    restMatrices.set(id, r)
  }
  return r
}

/** World-local -> world position (portal at rest). */
export function W(id: WorldId, x: number, y: number, z: number, out = new THREE.Vector3()) {
  return out.set(x, y, z).applyMatrix4(portalRest(id).m)
}
export function toLocal(id: WorldId, v: THREE.Vector3, out = new THREE.Vector3()) {
  return out.copy(v).applyMatrix4(portalRest(id).inv)
}

/** Portal opening bounds in local space (for crossing tests). */
export const PORTAL_BOUNDS = { x: PORTAL_W * 0.5, top: PORTAL_W * 0.5, bottom: -PORTAL_W * 0.72 }

/* ---------------------------------------------------------- world items */

export interface Placed<T> {
  item: T
  pos: THREE.Vector3
  quat: THREE.Quaternion
  w: number
  h: number
}

const yaw = (a: number) => new THREE.Quaternion().setFromEuler(new THREE.Euler(0, a, 0))

export const CODE_STEP = 5.4
export const codeLayout: Placed<Project>[] = codeProjects.map((p, i) => {
  const side = i % 2 === 0 ? -1 : 1
  return {
    item: p,
    pos: new THREE.Vector3(side * 3.6, 0.25, -8 - i * CODE_STEP),
    quat: yaw(-side * 0.55),
    w: 3.6,
    h: 2.25,
  }
})
export const CODE_END = -8 - (codeProjects.length - 1) * CODE_STEP + 2

export const FILM_STEP = 3.6
export const FILM_R = 3.7
export function filmHelix(s: number) {
  // s = continuous frame index
  const th = s * 0.95 + Math.PI * 0.85
  return new THREE.Vector3(Math.cos(th) * FILM_R, Math.sin(th) * FILM_R * 0.78, -7 - s * FILM_STEP)
}
export const filmLayout: Placed<Project>[] = filmProjects.map((p, i) => {
  const pos = filmHelix(i)
  const m = new THREE.Matrix4().lookAt(pos, new THREE.Vector3(0, 0, pos.z + 4.5), new THREE.Vector3(0, 1, 0))
  // lookAt points -z at the target; we want +z (front face) facing the axis
  const quat = new THREE.Quaternion().setFromRotationMatrix(m).multiply(yaw(Math.PI))
  return { item: p, pos, quat, w: 2.9, h: 1.63 }
})
export const FILM_END = -7 - (filmProjects.length - 1) * FILM_STEP + 1

export const ART_STEP = 3.5
export const artLayout: Placed<Artwork>[] = artworks.map((a, i) => {
  const side = i % 2 === 0 ? -1 : 1
  const lane = (i >> 1) % 3
  return {
    item: a,
    pos: new THREE.Vector3(side * (3.7 + lane * 0.45), 0.35 + (((i * 7) % 5) - 2) * 0.2, -7 - i * ART_STEP),
    quat: yaw(-side * (0.42 + lane * 0.06)),
    w: 2.6,
    h: 2.2,
  }
})
export const BLOG_Z = -7 - artworks.length * ART_STEP - 3
export const blogLayout: Placed<Blog>[] = blogs.map((b, i) => {
  const n = blogs.length
  const a = (i / (n - 1) - 0.5) * 2.3
  const R = 7.2
  const pos = new THREE.Vector3(Math.sin(a) * R, i % 2 === 0 ? 0.55 : -0.85, BLOG_Z - Math.cos(a) * R)
  return { item: b, pos, quat: yaw(-a), w: 2.2, h: 1.24 }
})
export const DESIGN_END = BLOG_Z + 0.5

export const WORLD_RAIL: Record<WorldId, { start: number; end: number }> = {
  code: { start: -1.4, end: CODE_END },
  film: { start: -1.4, end: FILM_END },
  design: { start: -1.4, end: DESIGN_END },
}

export function worldItems(id: WorldId): Placed<{ slug: string }>[] {
  if (id === 'code') return codeLayout
  if (id === 'film') return filmLayout
  return [...artLayout, ...blogLayout]
}

/* ---------------------------------------------------------------- team */

export const TEAM_ORIGIN = new THREE.Vector3(0, 52, -22)
export const TEAM_BATCHES = [...new Set(team.map((m) => m.batch))].sort((a, b) => b - a)
export const TEAM_STEP = 6.8
export const batchZ = (b: number) => -(TEAM_BATCHES[0] - b) * TEAM_STEP
export const TEAM_RAIL = { start: 11, end: batchZ(TEAM_BATCHES[TEAM_BATCHES.length - 1]) - 3 }

export const VERTICAL_ORDER: VerticalId[] = verticals.map((v) => v.id)
export const VERTICAL_COLOR: Record<VerticalId, string> = {
  frontend: '#38e1cf',
  backend: '#6aa8ff',
  app: '#b7f06a',
  design: '#ff4fa3',
  video: '#ffb35c',
}
export const verticalAngle = (v: VerticalId) => Math.PI / 2 + VERTICAL_ORDER.indexOf(v) * ((Math.PI * 2) / 5)

function hash(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

export interface TeamStar {
  m: Member
  index: number
  pos: THREE.Vector3 // team-local
}
export const teamStars: TeamStar[] = (() => {
  const groups = new Map<string, Member[]>()
  for (const m of team) {
    const k = `${m.vertical}:${m.batch}`
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k)!.push(m)
  }
  const out: TeamStar[] = []
  team.forEach((m, index) => {
    const g = groups.get(`${m.vertical}:${m.batch}`)!
    const j = g.indexOf(m)
    const n = g.length
    const base = verticalAngle(m.vertical)
    const spread = 0.62 / Math.max(1, Math.sqrt(n))
    const a = base + (j - (n - 1) / 2) * spread + (hash(index) - 0.5) * 0.08
    const r = 2.3 + (j % 3) * 0.95 + hash(index + 9) * 0.5
    const z = batchZ(m.batch) + (hash(index + 3) - 0.5) * 2.2
    out.push({ m, index, pos: new THREE.Vector3(Math.cos(a) * r * 1.25, Math.sin(a) * r, z) })
  })
  return out
})()

/* -------------------------------------------------------------- stations */

export const HOME_STATIONS = ['The gate', 'We are DVM', 'In numbers', 'Five teams', 'Three worlds'] as const
