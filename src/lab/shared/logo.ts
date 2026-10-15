import * as THREE from 'three'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js'
import logoSvg from './dvm-logo.svg?raw'

/**
 * DVM logo helpers. The logo is two filled paths forming an angular folded
 * ribbon monogram. Everything here is normalised so the logo is centred on the
 * origin, y-up, and exactly 1 unit tall (width ≈ 0.62).
 */

/** Raw SVG markup (white fill). */
export const LOGO_SVG = logoSvg

/** Original path data. Apply LOGO_TRANSFORM to place them in the 375.62 viewBox. */
export const LOGO_PATHS = [
  'M-470.31-189.24V-37.4l106.28,75.91l99.96-75.91v-151.83l-95.53,72.75l-55.04-37.33l-0.63,36.06l55.04,35.43l69.59-51.25v77.19l-72.75,56.3l-70.86-49.97l-1.26-120.84L-470.31-189.24z',
  'M-467.26-11.82l100.58,70.55l114.59-86.03v-177l32.31-22.9v212.9L-370.95,99.58l-99.36-72.4V-11.2L-467.26-11.82z',
]
export const LOGO_TRANSFORM = { x: 532.998, y: 251 }
export const LOGO_VIEWBOX = 375.62

/** Tight bounding box of the paths in original path coordinates. */
const BBOX = { minX: -470.31, maxX: -219.78, minY: -227.2, maxY: 99.58 }
const H = BBOX.maxY - BBOX.minY
const CX = (BBOX.minX + BBOX.maxX) / 2
const CY = (BBOX.minY + BBOX.maxY) / 2

/** Aspect ratio width / height of the tight logo bounds. */
export const LOGO_ASPECT = (BBOX.maxX - BBOX.minX) / H

let shapesCache: THREE.Shape[] | null = null

/** Normalised THREE.Shapes (centred, 1 unit tall, y-up). Cached. */
export function getLogoShapes(): THREE.Shape[] {
  if (shapesCache) return shapesCache
  const data = new SVGLoader().parse(logoSvg)
  const shapes: THREE.Shape[] = []
  for (const p of data.paths) shapes.push(...p.toShapes())
  // SVGLoader applies the group transform; recentre from the actual points.
  const box = new THREE.Box2()
  for (const s of shapes) for (const pt of s.getPoints()) box.expandByPoint(pt)
  const c = box.getCenter(new THREE.Vector2())
  const h = box.max.y - box.min.y
  const m = new THREE.Matrix3().makeScale(1 / h, -1 / h).multiply(new THREE.Matrix3().makeTranslation(-c.x, -c.y))
  const out = shapes.map((s) => {
    const ns = new THREE.Shape(s.getPoints(4).map((p) => p.clone().applyMatrix3(m)))
    ns.holes = s.holes.map((hole) => new THREE.Path(hole.getPoints(4).map((p) => p.clone().applyMatrix3(m))))
    return ns
  })
  shapesCache = out
  return out
}

/** Extruded, centred logo geometry (1 unit tall). */
export function createLogoGeometry(opts: { depth?: number; bevel?: number; bevelSegments?: number; curveSegments?: number } = {}) {
  const { depth = 0.12, bevel = 0.012, bevelSegments = 3, curveSegments = 4 } = opts
  const geo = new THREE.ExtrudeGeometry(getLogoShapes(), {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments,
    curveSegments,
  })
  geo.translate(0, 0, -depth / 2)
  geo.computeVertexNormals()
  return geo
}

/** Flat (2D) logo geometry, 1 unit tall, in the XY plane. */
export function createLogoShapeGeometry() {
  return new THREE.ShapeGeometry(getLogoShapes(), 4)
}

/**
 * Sample points on the logo. 'area' = uniformly inside the filled shape (z = 0),
 * 'surface' = on the surface of the extruded mesh (3D), 'outline' = along edges.
 * Returns xyz triplets.
 */
export function sampleLogoPoints(count: number, mode: 'area' | 'surface' | 'outline' = 'area', depth = 0.12): Float32Array {
  const out = new Float32Array(count * 3)
  if (mode === 'outline') {
    const contours: THREE.Vector2[][] = []
    for (const s of getLogoShapes()) {
      contours.push(s.getPoints(8))
      for (const h of s.holes) contours.push(h.getPoints(8))
    }
    const segs: [THREE.Vector2, THREE.Vector2, number][] = []
    let total = 0
    for (const c of contours)
      for (let i = 0; i < c.length; i++) {
        const a = c[i], b = c[(i + 1) % c.length]
        const len = a.distanceTo(b)
        segs.push([a, b, len])
        total += len
      }
    for (let i = 0; i < count; i++) {
      let r = Math.random() * total
      let k = 0
      while (k < segs.length - 1 && r > segs[k][2]) r -= segs[k++][2]
      const [a, b, len] = segs[k]
      const t = len > 0 ? r / len : 0
      out[i * 3] = a.x + (b.x - a.x) * t
      out[i * 3 + 1] = a.y + (b.y - a.y) * t
      out[i * 3 + 2] = (Math.random() - 0.5) * depth
    }
    return out
  }
  const geo = mode === 'surface' ? createLogoGeometry({ depth, bevel: 0 }) : createLogoShapeGeometry()
  const sampler = new MeshSurfaceSampler(new THREE.Mesh(geo)).build()
  const p = new THREE.Vector3()
  for (let i = 0; i < count; i++) {
    sampler.sample(p)
    out[i * 3] = p.x
    out[i * 3 + 1] = p.y
    out[i * 3 + 2] = p.z
  }
  geo.dispose()
  return out
}

/** Path2D objects in original coordinates; use with drawLogo for Canvas 2D. */
let path2dCache: Path2D[] | null = null
export function getLogoPath2D(): Path2D[] {
  if (!path2dCache) path2dCache = LOGO_PATHS.map((d) => new Path2D(d))
  return path2dCache
}

/** Draw the logo into a 2D canvas centred at (cx, cy) with the given height in px. */
export function drawLogo(ctx: CanvasRenderingContext2D, cx: number, cy: number, height: number, fill: string | CanvasGradient = '#fff') {
  const s = height / H
  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(s, s)
  ctx.translate(-CX, -CY)
  ctx.fillStyle = fill
  for (const p of getLogoPath2D()) ctx.fill(p)
  ctx.restore()
}

/** Is the point (in logo-normalised coords, 1 unit tall, y-up) inside the logo? Uses an offscreen canvas mask. */
let mask: { data: Uint8ClampedArray; size: number } | null = null
export function isInsideLogo(x: number, y: number): boolean {
  if (!mask) {
    const size = 512
    const c = document.createElement('canvas')
    c.width = c.height = size
    const ctx = c.getContext('2d')!
    drawLogo(ctx, size / 2, size / 2, size)
    mask = { data: ctx.getImageData(0, 0, size, size).data, size }
  }
  const px = Math.floor((x + 0.5) * mask.size)
  const py = Math.floor((0.5 - y) * mask.size)
  if (px < 0 || py < 0 || px >= mask.size || py >= mask.size) return false
  return mask.data[(py * mask.size + px) * 4 + 3] > 127
}
