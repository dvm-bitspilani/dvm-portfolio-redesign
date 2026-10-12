import { CellSampler } from './cells'
import { gi, type Matcher } from './glyphs'
import { F_HOT, type Grid } from './grid'
import { LogoRaster } from './logo3d'

const SCRAMBLE = Array.from('#%&$@*+=<>/\\|?!;:').map(gi)
const BLOCK = gi('█')
const DOT = gi('.')
const COLON = gi(':')

export type RevealMode = 'decode' | 'scan' | 'print' | 'none'
/** radians per second of continuous spin, 'sway' (oscillate around the rest pose), or false */
export type AutoRotate = number | 'sway' | false
export type Quality = 'auto' | 'low' | 'high'

export interface Rotation {
  yaw?: number
  pitch?: number
  roll?: number
}

function hash(i: number) {
  const h = Math.sin(i * 127.1 + 311.7) * 43758.5453
  return h - Math.floor(h)
}
const wrapPi = (a: number) => a - Math.round(a / (Math.PI * 2)) * Math.PI * 2

/**
 * The 3D DVM mark as shape-matched ASCII: software raster → summed-area sampling →
 * 6-D glyph matcher, plus drag-to-spin inertia, cursor light, density boost near the
 * cursor, reveal animations and glitch scramble. Writes into a region of a Grid.
 * Ported from the lab HomeApp logo.
 */
export class LogoView {
  private raster: LogoRaster | null = null
  private sampler = new CellSampler()
  cols = 0
  rows = 0
  glyph = new Uint8Array(0)
  tone = new Uint8Array(0)
  lit = 0
  private minRow = 0
  private litRows = 1

  yaw = -0.5
  pitch = 0.1
  private yawVel = 0
  private pitchVel = 0
  private auto = 0
  dragging = false

  autoRotate: AutoRotate = 0.32
  restYaw = -0.5
  restPitch = 0.1
  offset: Required<Rotation> = { yaw: 0, pitch: 0, roll: 0 }
  quality: Quality = 'auto'
  scale = 0.78
  probe = true
  cursorLight = true
  /** raise glyph density around the cursor */
  density = true
  /** extra exposure */
  exposure = 1

  /** light position in region cell coords (fractional); NaN = none */
  lightX = NaN
  lightY = NaN
  /** pointer over the region itself (stronger light + probe field) */
  over = false

  reveal: RevealMode = 'decode'
  revealDuration = 1.7
  private revealT = 1e9
  glitch = 0

  private sx = 3
  private sy = 7
  private acc = 1e9
  private needs = true
  private outCb = (x: number, y: number, g: number, t: number) => {
    const k = y * this.cols + x
    this.glyph[k] = g
    this.tone[k] = t
    if (g) {
      this.lit++
      if (y < this.minRow) this.minRow = y
      if (y > this.litRows) this.litRows = y
    }
  }

  /**
   * Columns worth rasterising for a box of `cols` × `rows` cells: the spinning mark never
   * needs more than ~0.95 × its height in width, so wide boxes get a centred region.
   */
  static regionCols(cols: number, rows: number, fcw: number, fch: number) {
    return Math.min(cols, Math.ceil((rows * fch * 0.95) / fcw))
  }

  /** Size the region (art cells) and the raster behind it. */
  setRegion(cols: number, rows: number, fcw: number, fch: number) {
    const sy = this.quality === 'low' ? 5 : this.quality === 'high' ? 9 : 7
    const sx = Math.max(2, Math.round((sy * fcw) / fch))
    if (cols === this.cols && rows === this.rows && sx === this.sx && sy === this.sy) return
    this.sx = sx
    this.sy = sy
    this.cols = cols
    this.rows = rows
    this.glyph = new Uint8Array(cols * rows)
    this.tone = new Uint8Array(cols * rows)
    if (!this.raster) this.raster = new LogoRaster()
    this.raster.resize(cols * sx, rows * sy, fch / sy / (fcw / sx))
    this.invalidate()
  }

  invalidate() {
    this.needs = true
  }

  replay(delay = 0) {
    this.revealT = -delay
    this.needs = true
  }
  finishReveal() {
    this.revealT = 1e9
  }
  get revealing() {
    return this.reveal !== 'none' && this.revealT < this.revealDuration
  }
  get revealProgress() {
    return this.reveal === 'none' ? 1 : Math.max(0, Math.min(1, this.revealT / this.revealDuration))
  }

  spin(v: number) {
    this.yawVel += v
  }

  setPose(yaw: number, pitch: number) {
    this.yaw = yaw
    this.pitch = pitch
    this.yawVel = 0
    this.pitchVel = 0
    this.needs = true
  }

  /** Inertia still moving or auto-rotating? */
  moving(reduced: boolean) {
    if (this.dragging || Math.abs(this.yawVel) > 0.01 || Math.abs(this.pitchVel) > 0.01) return true
    if (reduced) return false
    return this.autoRotate === 'sway' || (typeof this.autoRotate === 'number' && this.autoRotate !== 0)
  }

  drag(dx: number, dy: number, coarse: boolean) {
    const k = 0.0105 * (coarse ? 1.4 : 1)
    this.yaw += dx * k
    this.pitch = Math.max(-0.75, Math.min(0.75, this.pitch + dy * k * 0.6))
    this.yawVel = this.yawVel * 0.5 + dx * k * 60 * 0.5
    this.pitchVel = this.pitchVel * 0.5 + dy * k * 36 * 0.5
    this.needs = true
  }
  startDrag() {
    this.dragging = true
    this.yawVel = 0
    this.pitchVel = 0
  }
  endDrag() {
    this.dragging = false
  }

  update(dt: number, time: number, reduced: boolean) {
    this.revealT += dt
    this.glitch = Math.max(0, this.glitch - dt * 1.6)
    if (this.dragging) return
    this.yaw += this.yawVel * dt
    this.pitch += this.pitchVel * dt
    const damp = Math.exp(-dt * 2.4)
    this.yawVel *= damp
    this.pitchVel *= damp
    const idle = Math.abs(this.yawVel) < 0.25
    const ar = this.autoRotate
    if (typeof ar === 'number') {
      const target = reduced || !idle ? 0 : ar
      this.auto += (target - this.auto) * (1 - Math.exp(-dt * 1.2))
      this.yaw += this.auto * dt
    } else if (ar === 'sway' && idle && !reduced) {
      const target = this.restYaw + 0.62 * Math.sin(time * 0.42)
      this.yaw += wrapPi(target - this.yaw) * (1 - Math.exp(-dt * 1.4))
    }
    const restPitch = this.restPitch + (reduced || ar === false ? 0 : 0.07 * Math.sin(time * 0.45))
    if (Math.abs(this.pitchVel) < 0.3) this.pitch += (restPitch - this.pitch) * (1 - Math.exp(-dt * 1.5))
    this.pitch = Math.max(-0.8, Math.min(0.8, this.pitch))
  }

  /** Re-rasterise + re-match if due (30 Hz by default, immediately while dragging). */
  convert(matcher: Matcher, dt: number, time: number, reduced: boolean) {
    const L = this.raster
    if (!L || !this.cols || !this.rows) return
    this.acc += dt
    const hz = this.quality === 'low' ? 1 / 20 : this.quality === 'high' ? 1 / 60 : 1 / 30
    if (!(this.acc >= hz || this.dragging || this.needs)) return
    this.acc = 0
    this.needs = false
    L.scale = this.scale
    const lx = this.lightX * this.sx
    const ly = this.lightY * this.sy
    const hasLight = this.cursorLight && Number.isFinite(lx)
    const p = this.revealProgress
    const sweep = this.reveal !== 'none' && this.reveal !== 'print' && p < 1 && !reduced ? 1.15 - p * 1.3 : -1
    L.render({
      yaw: this.yaw + this.offset.yaw,
      pitch: this.pitch + this.offset.pitch,
      roll: this.offset.roll,
      lx: hasLight ? lx : NaN,
      ly: hasLight ? ly : NaN,
      li: hasLight ? (this.over ? 0.9 : 0.35) : 0,
      key: 1,
      gain: (1.08 + (reduced ? 0 : 0.04 * Math.sin(time * 2.1))) * this.exposure,
      sweep,
    })
    if (hasLight && this.density) this.boost(L, lx, ly, this.over ? 0.55 : 0.25, L.h * 0.22)
    this.sampler.load(L.lum, L.w, L.h)
    this.lit = 0
    this.minRow = this.rows
    this.litRows = 0
    this.sampler.run(this.cols, this.rows, this.sx, this.sy, matcher, this.outCb, { edge: 2.4, contrast: 1.5, gain: 0.95, flat: 0.1 })
    // litRows currently holds the max lit row
    this.litRows = Math.max(1, this.litRows - this.minRow + 1)
  }

  private boost(L: LogoRaster, lx: number, ly: number, amount: number, radius: number) {
    const w = L.w
    const h = L.h
    const ax = L.aspect
    const rx = radius * ax
    const x0 = Math.max(0, Math.floor(lx - rx))
    const x1 = Math.min(w - 1, Math.ceil(lx + rx))
    const y0 = Math.max(0, Math.floor(ly - radius))
    const y1 = Math.min(h - 1, Math.ceil(ly + radius))
    const lum = L.lum
    const inv = 1 / (radius * radius)
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const i = y * w + x
        if (lum[i] <= 0) continue
        const dx = (x - lx) / ax
        const dy = y - ly
        const d2 = (dx * dx + dy * dy) * inv
        if (d2 >= 1) continue
        lum[i] *= 1 + amount * (1 - d2) * (1 - d2)
      }
  }

  /** Write the current glyphs into `grid` at (x0, y0) with reveal / glitch / probe field. */
  blit(grid: Grid, x0: number, y0: number, time: number, reduced: boolean, dim = 1) {
    const cols = this.cols
    const rows = this.rows
    const mode = reduced ? 'none' : this.reveal
    const p = this.revealProgress
    const revealing = mode !== 'none' && p < 1
    const tq = Math.floor(time * 20)
    const gq = Math.floor(time * 24)
    const glitch = reduced ? 0 : this.glitch
    let headK = -1
    let headO = -1
    const scanRow = p * 1.12 * rows
    for (let y = 0; y < rows; y++) {
      const tearRow = glitch > 0.001 && hash(y * 3.1 + gq * 0.37) < glitch * 0.35
      for (let x = 0; x < cols; x++) {
        const k = y * cols + x
        const g = this.glyph[k]
        if (!g) continue
        const tone = this.tone[k]
        let b = 70 + tone * 0.78
        let flags = tone > 215 ? F_HOT : 0
        let glyph = g
        if (revealing) {
          if (mode === 'decode') {
            const th = hash(k)
            if (p * 1.25 < th) continue
            if (p * 1.25 < th + 0.22) {
              glyph = SCRAMBLE[(k * 7 + tq) % SCRAMBLE.length]
              b = 230
              flags = F_HOT
            }
          } else if (mode === 'scan') {
            if (y > scanRow) continue
            if (y > scanRow - 1.5) {
              b = 255
              flags = F_HOT
            }
          } else {
            const o = ((y - this.minRow) * cols + x) / (this.litRows * cols)
            if (o > p) continue
            if (o > headO) {
              headO = o
              headK = k
            }
          }
        }
        if (tearRow && hash(k + gq) < 0.6) {
          glyph = SCRAMBLE[(k * 13 + gq) % SCRAMBLE.length]
          flags = F_HOT
        }
        grid.set(x0 + x, y0 + y, glyph, Math.min(255, b * dim), flags)
      }
    }
    // print mode: a block cursor rides the head of the print
    if (revealing && mode === 'print' && headK >= 0) {
      const hx = (headK % cols) + 1
      const hy = Math.floor(headK / cols)
      grid.set(x0 + Math.min(cols - 1, hx), y0 + hy, BLOCK, 255, F_HOT)
    }
    // probe field: dotted halo around the cursor in empty space (may spill outside the region)
    if (this.probe && this.over && !reduced && Number.isFinite(this.lightX)) {
      const pfx = this.lightX
      const pfy = this.lightY
      const R = 9
      for (let y = Math.floor(pfy - R); y <= pfy + R; y++)
        for (let x = Math.floor(pfx - R * 2); x <= pfx + R * 2; x++) {
          const gx = x0 + x
          const gy = y0 + y
          if (gx < 0 || gy < 0 || gx >= grid.cols || gy >= grid.rows) continue
          if (x >= 0 && y >= 0 && x < cols && y < rows && this.glyph[y * cols + x]) continue
          if ((x + y * 3) % 4 !== 0 || y % 2) continue
          const d = Math.hypot((x - pfx) / 2, y - pfy) / R
          if (d > 1) continue
          grid.set(x0 + x, y0 + y, d < 0.45 ? COLON : DOT, 140 * (1 - d) * dim)
        }
    }
  }
}
