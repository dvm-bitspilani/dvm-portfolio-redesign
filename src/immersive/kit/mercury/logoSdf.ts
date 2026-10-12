/**
 * Exact 2D signed distance to the DVM mark, without three.js.
 *
 * The mark is two straight-edged filled contours. We parse the original SVG
 * path data (same strings as `src/immersive/shared/logo.ts` LOGO_PATHS — copied
 * here so the homepage logo doesn't pull three.js/SVGLoader into its chunk),
 * normalise to 1 unit tall / centred / y-up, drop collinear points, and bake
 * the polygons into GLSL const arrays. A CPU twin drives the droplet physics.
 */

const PATHS = [
  'M-470.31-189.24V-37.4l106.28,75.91l99.96-75.91v-151.83l-95.53,72.75l-55.04-37.33l-0.63,36.06l55.04,35.43l69.59-51.25v77.19l-72.75,56.3l-70.86-49.97l-1.26-120.84L-470.31-189.24z',
  'M-467.26-11.82l100.58,70.55l114.59-86.03v-177l32.31-22.9v212.9L-370.95,99.58l-99.36-72.4V-11.2L-467.26-11.82z',
]

type Pt = [number, number]

/** Minimal parser for straight-line path data (M/L/H/V/Z, absolute + relative). */
function parsePath(d: string): Pt[] {
  const tok = d.match(/[MLHVZmlhvz]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g) ?? []
  const pts: Pt[] = []
  let x = 0, y = 0, cmd = 'M', i = 0
  const num = () => parseFloat(tok[i++])
  while (i < tok.length) {
    if (/[A-Za-z]/.test(tok[i])) cmd = tok[i++]
    switch (cmd) {
      case 'M': case 'L': x = num(); y = num(); break
      case 'm': case 'l': x += num(); y += num(); break
      case 'H': x = num(); break
      case 'h': x += num(); break
      case 'V': y = num(); break
      case 'v': y += num(); break
      case 'Z': case 'z': continue
    }
    pts.push([x, y])
    if (cmd === 'M') cmd = 'L'
    if (cmd === 'm') cmd = 'l'
  }
  return pts
}

export type Poly = Float32Array // x0,y0,x1,y1,...

let polysCache: Poly[] | null = null
let svgBox = { minX: 0, minY: 0, w: 1, h: 1 }

export function getLogoPolys(): Poly[] {
  if (polysCache) return polysCache
  const raw = PATHS.map(parsePath)
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const p of raw) for (const [x, y] of p) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y)
  }
  svgBox = { minX, minY, w: maxX - minX, h: maxY - minY }
  const h = maxY - minY, cx = (minX + maxX) / 2, cy = (minY + maxY) / 2
  const out: Poly[] = []
  for (const path of raw) {
    const clean: Pt[] = []
    for (const [px, py] of path) {
      const p: Pt = [(px - cx) / h, -(py - cy) / h]
      const l = clean[clean.length - 1]
      if (!l || Math.hypot(p[0] - l[0], p[1] - l[1]) > 1e-5) clean.push(p)
    }
    if (clean.length > 2) {
      const f = clean[0], l = clean[clean.length - 1]
      if (Math.hypot(f[0] - l[0], f[1] - l[1]) < 1e-5) clean.pop()
    }
    const simp: Pt[] = []
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

/** Logo bounds in local units (1 unit tall, centred). */
export function getLogoBounds() {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const p of getLogoPolys())
    for (let i = 0; i < p.length; i += 2) {
      minX = Math.min(minX, p[i]); maxX = Math.max(maxX, p[i])
      minY = Math.min(minY, p[i + 1]); maxY = Math.max(maxY, p[i + 1])
    }
  return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY }
}

const f = (n: number) => (Number.isInteger(n) ? n.toFixed(1) : n.toFixed(6))

/** GLSL: const arrays + `logoSdf2(p)` (box early-out) + `logoSdf2Exact(p)`. */
export function logoGlsl(): string {
  const polys = getLogoPolys()
  const b = getLogoBounds()
  const cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2
  const hx = b.width / 2, hy = b.height / 2
  let src = ''
  polys.forEach((p, k) => {
    const n = p.length / 2
    const verts: string[] = []
    for (let i = 0; i < n; i++) verts.push(`vec2(${f(p[i * 2])},${f(p[i * 2 + 1])})`)
    src += `const vec2 P${k}[${n}] = vec2[${n}](${verts.join(',')});\n`
    // Exact polygon SDF (after Inigo Quilez): nearest edge + crossing-number sign.
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
  const all = polys.map((_, k) => `sdPoly${k}(p)`).reduce((a, c) => `min(${a},${c})`)
  src += `const vec2 LOGO_C = vec2(${f(cx)},${f(cy)});
const vec2 LOGO_H = vec2(${f(hx)},${f(hy)});
float logoSdf2(vec2 p){
  vec2 q = abs(p-LOGO_C)-LOGO_H;
  float box = length(max(q,0.0)) + min(max(q.x,q.y),0.0);
  if(box > 0.06) return box; // lower bound of the true distance: safe to march
  return ${all};
}
float logoSdf2Exact(vec2 p){ return ${all}; }\n`
  return src
}

/** CPU twin: signed distance + nearest boundary point. Writes [d, nx, ny] into `out`. */
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
      if (d2 < best) { best = d2; bx = qx; by = qy }
      if ((ay > py) !== (cy > py) && px < ((cx - ax) * (py - ay)) / (cy - ay) + ax) s = !s
    }
    if (s) inside = true
  }
  out[0] = Math.sqrt(best) * (inside ? -1 : 1)
  out[1] = bx
  out[2] = by
  return out
}

/** Static silver SVG of the mark (WebGL fallback / reduced-data contexts). */
export function logoFallbackSvg(): string {
  getLogoPolys()
  const { minX, minY, w, h } = svgBox
  const pad = h * 0.02
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX - pad} ${minY - pad} ${w + pad * 2} ${h + pad * 2}">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="0.35" y2="1"><stop offset="0" stop-color="#f4fbff"/>` +
    `<stop offset="0.46" stop-color="#9fb4bd"/><stop offset="0.54" stop-color="#3c4a52"/><stop offset="1" stop-color="#dff6ff"/></linearGradient></defs>` +
    PATHS.map((d) => `<path fill="url(#g)" d="${d}"/>`).join('') + `</svg>`
}
