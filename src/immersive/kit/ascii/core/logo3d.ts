import { createLogoGeometry } from '../../../shared/logo'

// Ported from the lab DVM://BOOT engine (logo3d.ts); rotation hoisted out of the frame loop (no per-frame closures).

/**
 * A tiny software rasteriser for the extruded DVM mark. Renders per-pixel lit
 * luminance (key light + specular + rim + a movable cursor light) with a
 * z-buffer, then darkens creases between faces so the glyph search can
 * resolve them as lines.
 */
export interface LogoPose {
  yaw: number
  pitch: number
  roll: number
  /** cursor light, in raster pixel coords (or NaN when absent) */
  lx: number
  ly: number
  /** cursor light strength */
  li: number
  /** key light strength (nox dims it) */
  key: number
  /** extra exposure */
  gain: number
  /** 0..1 height of a scan sweep band (or <0 for none) */
  sweep: number
}

export class LogoRaster {
  w = 0
  h = 0
  /** pixel aspect correction: px height / px width in screen space */
  aspect = 1
  /** fraction of the raster height the 1-unit-tall mark spans */
  scale = 0.78
  lum = new Float32Array(0)
  private z = new Float32Array(0)
  private tri = new Int32Array(0)
  private readonly verts: Float32Array // object-space, 9 per tri
  private readonly norms: Float32Array // 3 per tri
  private readonly T: number
  private cam: Float32Array // camera-space verts
  private scr: Float32Array // screen x,y per vertex
  private cn: Float32Array // camera-space normals per tri
  private tmp = new Float32Array(3)

  constructor() {
    const geo = createLogoGeometry({ depth: 0.24, bevel: 0.022, bevelSegments: 3, curveSegments: 6 })
    const pos = geo.getAttribute('position')
    const idx = geo.getIndex()
    const count = idx ? idx.count : pos.count
    const T = Math.floor(count / 3)
    this.T = T
    this.verts = new Float32Array(T * 9)
    this.norms = new Float32Array(T * 3)
    for (let t = 0; t < T; t++) {
      for (let k = 0; k < 3; k++) {
        const vi = idx ? idx.getX(t * 3 + k) : t * 3 + k
        this.verts[t * 9 + k * 3] = pos.getX(vi)
        this.verts[t * 9 + k * 3 + 1] = pos.getY(vi)
        this.verts[t * 9 + k * 3 + 2] = pos.getZ(vi)
      }
      const o = t * 9
      const ax = this.verts[o + 3] - this.verts[o]
      const ay = this.verts[o + 4] - this.verts[o + 1]
      const az = this.verts[o + 5] - this.verts[o + 2]
      const bx = this.verts[o + 6] - this.verts[o]
      const by = this.verts[o + 7] - this.verts[o + 1]
      const bz = this.verts[o + 8] - this.verts[o + 2]
      let nx = ay * bz - az * by
      let ny = az * bx - ax * bz
      let nz = ax * by - ay * bx
      const l = Math.hypot(nx, ny, nz) || 1
      nx /= l
      ny /= l
      nz /= l
      this.norms[t * 3] = nx
      this.norms[t * 3 + 1] = ny
      this.norms[t * 3 + 2] = nz
    }
    geo.dispose()
    this.cam = new Float32Array(T * 9)
    this.scr = new Float32Array(T * 6)
    this.cn = new Float32Array(T * 3)
  }

  resize(w: number, h: number, aspect: number) {
    w = Math.max(1, Math.floor(w))
    h = Math.max(1, Math.floor(h))
    this.aspect = aspect
    if (w === this.w && h === this.h) return
    this.w = w
    this.h = h
    this.lum = new Float32Array(w * h)
    this.z = new Float32Array(w * h)
    this.tri = new Int32Array(w * h)
  }

  private cyw = 1
  private syw = 0
  private cp = 1
  private sp = 0
  private cr = 1
  private sr = 0
  private setRot(yaw: number, pitch: number, roll: number) {
    this.cyw = Math.cos(yaw)
    this.syw = Math.sin(yaw)
    this.cp = Math.cos(pitch)
    this.sp = Math.sin(pitch)
    this.cr = Math.cos(roll)
    this.sr = Math.sin(roll)
  }
  /** R = Rx(pitch) * Ry(yaw) * Rz(roll) */
  private rotInto = (x: number, y: number, z: number, out: Float32Array, o: number) => {
    const x1 = x * this.cr - y * this.sr
    const y1 = x * this.sr + y * this.cr
    const x2 = x1 * this.cyw + z * this.syw
    const z2 = -x1 * this.syw + z * this.cyw
    out[o] = x2
    out[o + 1] = y1 * this.cp - z2 * this.sp
    out[o + 2] = y1 * this.sp + z2 * this.cp
  }

  render(p: LogoPose) {
    const { w, h, T } = this
    if (!w || !h) return
    const lum = this.lum
    const zb = this.z
    const tb = this.tri
    lum.fill(0)
    zb.fill(1e9)
    tb.fill(-1)

    const D = 3.4
    const ax = this.aspect // px height / px width → x scale
    // focal: 1-unit tall logo spans `scale` of the raster height (square-pixel units),
    // limited by width so a tall/narrow box never clips the mark while it spins
    const f = Math.min(h, w / ax / 0.84) * this.scale * D
    const cx = w / 2
    const cy = h / 2

    this.setRot(p.yaw, p.pitch, p.roll)
    const rot = this.rotInto
    const V = this.verts
    const C = this.cam
    const S = this.scr
    const N = this.cn
    const tmp = this.tmp
    for (let t = 0; t < T; t++) {
      for (let k = 0; k < 3; k++) {
        const o = t * 9 + k * 3
        rot(V[o], V[o + 1], V[o + 2], C, o)
        C[o + 2] -= D
        const iz = 1 / -C[o + 2]
        S[t * 6 + k * 2] = cx + C[o] * f * iz * ax
        S[t * 6 + k * 2 + 1] = cy - C[o + 1] * f * iz
      }
      rot(this.norms[t * 3], this.norms[t * 3 + 1], this.norms[t * 3 + 2], tmp, 0)
      N[t * 3] = tmp[0]
      N[t * 3 + 1] = tmp[1]
      N[t * 3 + 2] = tmp[2]
    }

    // lights (camera space)
    let kx = -0.42
    let ky = 0.5
    let kz = 0.78
    const kl = Math.hypot(kx, ky, kz)
    kx /= kl
    ky /= kl
    kz /= kl
    const hasCursor = Number.isFinite(p.lx) && p.li > 0
    const lzc = -D + 1.1
    const lxc = hasCursor ? ((p.lx - cx) / (f * ax)) * (D - 1.1) : 0
    const lyc = hasCursor ? (-(p.ly - cy) / f) * (D - 1.1) : 0

    for (let t = 0; t < T; t++) {
      const s = t * 6
      const x0 = S[s]
      const y0 = S[s + 1]
      const x1 = S[s + 2]
      const y1 = S[s + 3]
      const x2 = S[s + 4]
      const y2 = S[s + 5]
      const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0)
      if (Math.abs(area) < 1e-6) continue
      const inv = 1 / area
      let minX = Math.max(0, Math.floor(Math.min(x0, x1, x2)))
      let maxX = Math.min(w - 1, Math.ceil(Math.max(x0, x1, x2)))
      let minY = Math.max(0, Math.floor(Math.min(y0, y1, y2)))
      let maxY = Math.min(h - 1, Math.ceil(Math.max(y0, y1, y2)))
      if (minX > maxX || minY > maxY) continue
      const o = t * 9
      const pz0 = C[o + 2]
      const pz1 = C[o + 5]
      const pz2 = C[o + 8]
      // normal facing the viewer
      let nx = N[t * 3]
      let ny = N[t * 3 + 1]
      let nz = N[t * 3 + 2]
      // view direction at the centroid
      const gx = -(C[o] + C[o + 3] + C[o + 6]) / 3
      const gy = -(C[o + 1] + C[o + 4] + C[o + 7]) / 3
      const gz = -(pz0 + pz1 + pz2) / 3
      if (nx * gx + ny * gy + nz * gz < 0) {
        nx = -nx
        ny = -ny
        nz = -nz
      }
      const diffK = Math.max(0, nx * kx + ny * ky + nz * kz)
      for (let y = minY; y <= maxY; y++) {
        const py = y + 0.5
        for (let x = minX; x <= maxX; x++) {
          const px = x + 0.5
          const w0 = ((x1 - px) * (y2 - py) - (x2 - px) * (y1 - py)) * inv
          const w1 = ((x2 - px) * (y0 - py) - (x0 - px) * (y2 - py)) * inv
          const w2 = 1 - w0 - w1
          if (w0 < 0 || w1 < 0 || w2 < 0) continue
          const depth = -(w0 * pz0 + w1 * pz1 + w2 * pz2)
          const i = y * w + x
          if (depth >= zb[i]) continue
          zb[i] = depth
          tb[i] = t
          // camera-space position
          const Px = w0 * C[o] + w1 * C[o + 3] + w2 * C[o + 6]
          const Py = w0 * C[o + 1] + w1 * C[o + 4] + w2 * C[o + 7]
          const Pz = -depth
          let vx = -Px
          let vy = -Py
          let vz = -Pz
          const vl = 1 / Math.sqrt(vx * vx + vy * vy + vz * vz)
          vx *= vl
          vy *= vl
          vz *= vl
          // blinn specular
          let hx = kx + vx
          let hy = ky + vy
          let hz = kz + vz
          const hl = 1 / Math.sqrt(hx * hx + hy * hy + hz * hz)
          hx *= hl
          hy *= hl
          hz *= hl
          let sp2 = Math.max(0, nx * hx + ny * hy + nz * hz)
          sp2 *= sp2
          sp2 *= sp2
          sp2 *= sp2
          sp2 *= sp2 // ^16
          const ndv = Math.max(0, nx * vx + ny * vy + nz * vz)
          const rim = (1 - ndv) * (1 - ndv)
          // gentle vertical gradient so flat faces still carry tone
          const grad = 0.82 + 0.3 * (Py + 0.5)
          let L = 0.05 + p.key * (0.62 * diffK * grad + 0.55 * sp2) + rim * 0.32
          if (hasCursor) {
            let dx = lxc - Px
            let dy = lyc - Py
            let dz = lzc - Pz
            const d2 = dx * dx + dy * dy + dz * dz
            const dl = 1 / Math.sqrt(d2)
            dx *= dl
            dy *= dl
            dz *= dl
            const nd = Math.max(0, nx * dx + ny * dy + nz * dz)
            L += (p.li * nd) / (1 + d2 * 7)
          }
          if (p.sweep >= 0) {
            const sy = 1 - y / h
            const d = (sy - p.sweep) * 18
            L += Math.exp(-d * d) * 0.7
          }
          lum[i] = L * p.gain
        }
      }
    }

    // crease + silhouette darkening between faces with different normals
    for (let y = 0; y < h - 1; y++) {
      for (let x = 0; x < w - 1; x++) {
        const i = y * w + x
        const a = tb[i]
        if (a < 0) continue
        const r = tb[i + 1]
        const d = tb[i + w]
        let crease = false
        if (r >= 0 && r !== a) {
          const dot = N[a * 3] * N[r * 3] + N[a * 3 + 1] * N[r * 3 + 1] + N[a * 3 + 2] * N[r * 3 + 2]
          if (Math.abs(dot) < 0.8) crease = true
        }
        if (!crease && d >= 0 && d !== a) {
          const dot = N[a * 3] * N[d * 3] + N[a * 3 + 1] * N[d * 3 + 1] + N[a * 3 + 2] * N[d * 3 + 2]
          if (Math.abs(dot) < 0.8) crease = true
        }
        if (crease) lum[i] *= 0.3
      }
    }
  }
}
