import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/**
 * Low-poly merge builder: every part becomes flat-shaded, non-indexed geometry
 * with a per-vertex colour and a seed, merged into one draw call. A bake pass
 * then adds "fake GI" (warm lamp pools, window spill, contact darkening) into
 * an `aGlow` attribute and the colours.
 */

const _q = new THREE.Quaternion()
const _e = new THREE.Euler()
const _v = new THREE.Vector3()
const _s = new THREE.Vector3()

/** compose(x,y,z, ry, sx,sy,sz, rx, rz) */
export function tf(x = 0, y = 0, z = 0, ry = 0, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) {
  _e.set(rx, ry, rz, 'YXZ')
  _q.setFromEuler(_e)
  return new THREE.Matrix4().compose(_v.set(x, y, z), _q, _s.set(sx, sy, sz))
}

// cached unit primitives (never mutated; builder copies them)
const unitBox = new THREE.BoxGeometry(1, 1, 1)
const unitPlane = new THREE.PlaneGeometry(1, 1)

export function archShape(w: number, h: number, pointed = 0) {
  const s = new THREE.Shape()
  const r = w / 2
  s.moveTo(-r, 0)
  s.lineTo(-r, h - r)
  if (pointed > 0) {
    s.quadraticCurveTo(-r, h - r * (1 - pointed), 0, h)
    s.quadraticCurveTo(r, h - r * (1 - pointed), r, h - r)
  } else s.absarc(0, h - r, r, Math.PI, 0, true)
  s.lineTo(r, 0)
  s.lineTo(-r, 0)
  return s
}
const archCache = new Map<string, THREE.BufferGeometry>()
/** flat arch (unit-ish, sized), in XY facing +z, base at y=0 */
export function archGeo(w: number, h: number, pointed = 0) {
  const k = `${w}|${h}|${pointed}`
  if (!archCache.has(k)) archCache.set(k, new THREE.ShapeGeometry(archShape(w, h, pointed), 5))
  return archCache.get(k)!
}

export class GeoBuilder {
  private parts: THREE.BufferGeometry[] = []

  /** Add any geometry (it is copied, not consumed). */
  add(src: THREE.BufferGeometry, color: THREE.ColorRepresentation, m?: THREE.Matrix4, seed = 0) {
    let g = src.index ? src.toNonIndexed() : src.clone()
    for (const name of Object.keys(g.attributes)) if (name !== 'position') g.deleteAttribute(name)
    g.clearGroups()
    if (m) g.applyMatrix4(m)
    g.computeVertexNormals()
    const n = g.attributes.position.count
    const c = new THREE.Color(color)
    const col = new Float32Array(n * 3)
    const sd = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      col[i * 3] = c.r
      col[i * 3 + 1] = c.g
      col[i * 3 + 2] = c.b
      sd[i] = seed
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(sd, 1))
    this.parts.push(g)
    return this
  }

  /** Add an already-built geometry (keeps its colours/seeds), optionally transformed. */
  addBuilt(src: THREE.BufferGeometry, m?: THREE.Matrix4) {
    const g = src.index ? src.toNonIndexed() : src.clone()
    for (const name of Object.keys(g.attributes)) if (!['position', 'color', 'aSeed'].includes(name)) g.deleteAttribute(name)
    g.clearGroups()
    if (m) g.applyMatrix4(m)
    g.computeVertexNormals()
    this.parts.push(g)
    return this
  }

  /** Axis-aligned (in local frame) box with its BOTTOM at y. */
  box(x: number, y: number, z: number, w: number, h: number, d: number, color: THREE.ColorRepresentation, ry = 0, seed = 0) {
    return this.add(unitBox, color, tf(x, y + h / 2, z, ry, w, h, d), seed)
  }
  /** Plane facing +z (before rotation). */
  plane(m: THREE.Matrix4, color: THREE.ColorRepresentation, seed = 0) {
    return this.add(unitPlane, color, m, seed)
  }
  /** Apply a matrix to everything added so far that hasn't been grouped. */
  transformAll(m: THREE.Matrix4) {
    for (const p of this.parts) {
      p.applyMatrix4(m)
      p.computeVertexNormals()
    }
    return this
  }

  get empty() {
    return this.parts.length === 0
  }

  build(): THREE.BufferGeometry {
    const g = this.parts.length ? mergeGeometries(this.parts, false)! : new THREE.BufferGeometry()
    for (const p of this.parts) p.dispose()
    this.parts = []
    if (!g.attributes.aGlow && g.attributes.position) g.setAttribute('aGlow', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3))
    g.computeBoundingSphere()
    return g
  }
}

/* ---------------- baking ---------------- */
export interface GlowLight {
  p: THREE.Vector3
  c: THREE.Color
  r: number
  i: number
}
export const glow = (x: number, y: number, z: number, color: THREE.ColorRepresentation, r: number, i: number): GlowLight => ({
  p: new THREE.Vector3(x, y, z),
  c: new THREE.Color(color),
  r,
  i,
})

/**
 * Bake warm light + contact AO into a built geometry.
 * `world` maps the geometry's local frame to world space (for light positions).
 */
export function bake(
  g: THREE.BufferGeometry,
  lights: GlowLight[],
  opts: { world?: THREE.Matrix4; ground?: (x: number, z: number) => number; ao?: number; skyAo?: boolean } = {},
) {
  const pos = g.attributes.position as THREE.BufferAttribute
  const nor = g.attributes.normal as THREE.BufferAttribute
  const col = g.attributes.color as THREE.BufferAttribute
  const glowAttr = g.attributes.aGlow as THREE.BufferAttribute
  if (!pos) return g
  const W = opts.world ?? new THREE.Matrix4()
  const NM = new THREE.Matrix3().getNormalMatrix(W)
  g.computeBoundingSphere()
  const bs = g.boundingSphere!.clone().applyMatrix4(W)
  const near = lights.filter((l) => l.p.distanceTo(bs.center) < bs.radius + l.r)
  const p = new THREE.Vector3()
  const n = new THREE.Vector3()
  const d = new THREE.Vector3()
  const ao = opts.ao ?? 0.5
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i).applyMatrix4(W)
    n.fromBufferAttribute(nor, i).applyMatrix3(NM).normalize()
    let r = 0, gg = 0, b = 0
    for (const l of near) {
      d.subVectors(l.p, p)
      const dist = d.length()
      if (dist > l.r) continue
      const fall = (1 - dist / l.r) ** 2
      const lam = 0.3 + 0.7 * Math.max(0, n.dot(d.divideScalar(dist || 1)))
      const k = l.i * fall * lam
      r += l.c.r * k
      gg += l.c.g * k
      b += l.c.b * k
    }
    glowAttr.setXYZ(i, r, gg, b)
    if (ao > 0) {
      const gy = opts.ground ? opts.ground(p.x, p.z) : 0
      const h = p.y - gy
      // darken the feet of vertical faces + undersides
      const vert = 1 - Math.abs(n.y)
      let f = 1 - ao * vert * (1 - Math.min(1, Math.max(0, h / 0.32)))
      if (n.y < -0.5) f *= 0.55
      col.setXYZ(i, col.getX(i) * f, col.getY(i) * f, col.getZ(i) * f)
    }
  }
  glowAttr.needsUpdate = true
  col.needsUpdate = true
  return g
}
