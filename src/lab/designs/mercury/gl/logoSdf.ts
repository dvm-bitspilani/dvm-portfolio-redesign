import { getLogoShapes } from '../../../shared/logo'

/**
 * Exact 2D signed distance to the DVM mark.
 * The logo is two straight-edged filled contours; we pull their vertices out of
 * getLogoShapes() (1 unit tall, centred, y-up), drop duplicates/collinear
 * points, and bake them into GLSL as const arrays so the edge loops unroll.
 * The same polygons drive a CPU twin of the SDF used by the droplet physics.
 */

export type Poly = Float32Array // x0,y0,x1,y1,...

let polysCache: Poly[] | null = null

export function getLogoPolys(): Poly[] {
  if (polysCache) return polysCache
  const out: Poly[] = []
  for (const shape of getLogoShapes()) {
    const pts = shape.getPoints(1).map((p) => [p.x, p.y] as [number, number])
    // drop closing duplicate + consecutive duplicates
    const clean: [number, number][] = []
    for (const p of pts) {
      const l = clean[clean.length - 1]
      if (!l || Math.hypot(p[0] - l[0], p[1] - l[1]) > 1e-5) clean.push(p)
    }
    if (clean.length > 2) {
      const f = clean[0], l = clean[clean.length - 1]
      if (Math.hypot(f[0] - l[0], f[1] - l[1]) < 1e-5) clean.pop()
    }
    // drop collinear vertices
    const simp: [number, number][] = []
    for (let i = 0; i < clean.length; i++) {
      const a = clean[(i - 1 + clean.length) % clean.length], b = clean[i], c = clean[(i + 1) % clean.length]
      const cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])
      if (Math.abs(cross) > 1e-7) simp.push(b)
    }
    out.push(new Float32Array(simp.flat()))
  }
  polysCache = out
  return out
}

/** Logo bounds in local units (computed from the polygons). */
export function getLogoBounds() {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const p of getLogoPolys())
    for (let i = 0; i < p.length; i += 2) {
      minX = Math.min(minX, p[i]); maxX = Math.max(maxX, p[i])
      minY = Math.min(minY, p[i + 1]); maxY = Math.max(maxY, p[i + 1])
    }
  return { minX, maxX, minY, maxY }
}

const f = (n: number) => (Number.isInteger(n) ? n.toFixed(1) : n.toFixed(6))

/** GLSL: const arrays + `float logoSdf2(vec2 p)` (exact, with a cheap box early-out). */
export function logoGlsl(): string {
  const polys = getLogoPolys()
  const b = getLogoBounds()
  const cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2
  const hx = (b.maxX - b.minX) / 2, hy = (b.maxY - b.minY) / 2
  let src = ''
  polys.forEach((p, k) => {
    const n = p.length / 2
    const verts: string[] = []
    for (let i = 0; i < n; i++) verts.push(`vec2(${f(p[i * 2])},${f(p[i * 2 + 1])})`)
    src += `const vec2 P${k}[${n}] = vec2[${n}](${verts.join(',')});\n`
    // Exact polygon SDF (after Inigo Quilez, "2D distance functions"): nearest
    // edge distance + crossing-number sign.
    src += `float sdPoly${k}(vec2 p){
  float d = dot(p-P${k}[0], p-P${k}[0]); float s = 1.0;
  for(int i=0, j=${n - 1}; i<${n}; j=i, i++){
    vec2 e = P${k}[j]-P${k}[i]; vec2 w = p-P${k}[i];
    vec2 q = w - e*clamp(dot(w,e)/dot(e,e), 0.0, 1.0);
    d = min(d, dot(q,q));
    bvec3 c = bvec3(p.y>=P${k}[i].y, p.y<P${k}[j].y, e.x*w.y>e.y*w.x);
    if(all(c) || all(not(c))) s = -s;
  }
  return s*sqrt(d);
}\n`
  })
  src += `const vec2 LOGO_C = vec2(${f(cx)},${f(cy)});
const vec2 LOGO_H = vec2(${f(hx)},${f(hy)});
float logoSdf2(vec2 p){
  vec2 q = abs(p-LOGO_C)-LOGO_H;
  float box = length(max(q,0.0)) + min(max(q.x,q.y),0.0);
  if(box > 0.06) return box; // lower bound of the true distance: safe to march
  return ${polys.map((_, k) => `sdPoly${k}(p)`).reduce((a, c) => `min(${a},${c})`)};
}
float logoSdf2Exact(vec2 p){
  return ${polys.map((_, k) => `sdPoly${k}(p)`).reduce((a, c) => `min(${a},${c})`)};
}\n`
  return src
}

/** CPU twin: signed distance + nearest boundary point. Writes into `out` = [d, nx, ny]. */
export function logoSdfCpu(px: number, py: number, out: Float32Array) {
  let best = Infinity, bx = 0, by = 0, inside = false
  for (const poly of getLogoPolys()) {
    const n = poly.length / 2
    let s = false
    for (let i = 0, j = n - 1; i < n; j = i, i++) {
      const ax = poly[i * 2], ay = poly[i * 2 + 1], cx = poly[j * 2], cy = poly[j * 2 + 1]
      const ex = cx - ax, ey = cy - ay, wx = px - ax, wy = py - ay
      const t = Math.min(1, Math.max(0, (wx * ex + wy * ey) / (ex * ex + ey * ey)))
      const qx = ax + ex * t, qy = ay + ey * t
      const d2 = (px - qx) ** 2 + (py - qy) ** 2
      if (d2 < best) {
        best = d2; bx = qx; by = qy
      }
      if ((ay > py) !== (cy > py) && px < ((cx - ax) * (py - ay)) / (cy - ay) + ax) s = !s
    }
    if (s) inside = true
  }
  out[0] = Math.sqrt(best) * (inside ? -1 : 1)
  out[1] = bx
  out[2] = by
  return out
}
