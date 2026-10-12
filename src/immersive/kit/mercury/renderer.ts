import { FullscreenPass, QualityGovernor, loadImage } from './gl'
import { buildMercuryShader, HALF_DEPTH, MAX_BLOBS, MAX_RIPPLES } from './shader'
import { getLogoBounds, logoSdfCpu } from './logoSdf'
import type { MercuryEnv } from './themes'

/**
 * Framework-agnostic engine behind <MercuryLogo />. Owns one WebGL2 context,
 * the droplet physics, pointer listeners, the render loop and its lifecycle
 * (IntersectionObserver / visibility / reduced motion). No per-frame allocation.
 */

export type MercuryQuality = 'auto' | 'low' | 'medium' | 'high' | { scale: number; steps: number }

export interface MercuryFit {
  /** contain: whole mark fits inside the padded box (default). height/width: fit one axis only. */
  mode?: 'contain' | 'height' | 'width'
  /** Padding as a fraction of the box on each side (0..0.45). Default 0.12. */
  padding?: number
  /** Extra multiplier on the fitted size. Default 1. */
  scale?: number
  /** Offset of the mark's centre, -1..1 of the half-box (x: right, y: down). */
  x?: number
  y?: number
}

export interface MercuryBackdrop {
  /** Image URL, or any texture source (img, canvas, video, ImageBitmap). */
  source: string | TexImageSource
  /** Element the image is laid out over (as CSS background). Default: the mark's own box. */
  element?: HTMLElement | null
  /** How the image covers `element`. Default 'cover'. */
  fit?: 'cover' | 'contain' | 'fill'
  /** Re-upload every frame while glass is visible (canvas/video sources). */
  live?: boolean
  /** Base blur (mip LOD) of the refraction. Default 1.2. */
  frost?: number
}

export interface RendererOptions {
  background: 'transparent' | 'studio'
  progress: number
  smoothing: number
  env: MercuryEnv
  sheen: number
  exposure: number
  shadow: number
  floor: number
  contours: number
  fit: Required<MercuryFit>
  yaw: number
  pitch: number
  tilt: number
  sway: number
  interactive: boolean
  quality: MercuryQuality
  fps: number
  animate: boolean
  backdrop: MercuryBackdrop | null
  intro: boolean
  introDelay: number
  pointerTarget: HTMLElement | Window | null
  onReady?: () => void
  onContextLost?: () => void
}

export interface MercuryStats {
  tier: number
  renderScale: number
  steps: number
  bufferWidth: number
  bufferHeight: number
  fps: number
  frameMs: number
}

const TIERS = [
  { scale: 0.4, steps: 52 },
  { scale: 0.5, steps: 64 },
  { scale: 0.6, steps: 80 },
  { scale: 0.72, steps: 96 },
  { scale: 0.86, steps: 110 },
]
const FOV = (34 * Math.PI) / 180
const FOCAL = 1 / Math.tan(FOV / 2)
const CHAIN = 4
const DROPS = 6
const BREAK = 0.36
const REATTACH = 0.16
const CHAIN_S = [1, 0.68, 0.4, 0.14]
const CHAIN_IN = [0.058, 0.044, 0.034, 0.026]
const CHAIN_OUT = [0.062, 0.046, 0.04, 0.05]
const IGNORE = 'a, button, input, textarea, select, label, summary, [contenteditable], [data-noblob], [data-mercury-ignore]'

interface Body { x: number; y: number; z: number; vx: number; vy: number; vz: number; r: number }
interface Drop extends Body { alive: boolean; merged: boolean; age: number; delay: number }
interface Ripple { x: number; y: number; t: number; a: number }

const mkBody = (): Body => ({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, r: 0 })
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

function sourceSize(s: TexImageSource): [number, number] {
  if (typeof HTMLImageElement !== 'undefined' && s instanceof HTMLImageElement) return [s.naturalWidth || 1, s.naturalHeight || 1]
  if (typeof HTMLVideoElement !== 'undefined' && s instanceof HTMLVideoElement) return [s.videoWidth || 1, s.videoHeight || 1]
  if (typeof VideoFrame !== 'undefined' && s instanceof VideoFrame) return [s.displayWidth || 1, s.displayHeight || 1]
  const o = s as { width?: number; height?: number }
  return [o.width || 1, o.height || 1]
}

export class MercuryRenderer {
  private pass: FullscreenPass
  private o: RendererOptions
  private disposed = false
  private readonly canvas: HTMLCanvasElement

  // lifecycle
  private raf = 0
  private last = 0
  private lastDraw = 0
  private visible = true
  private reduced = false
  private readyFired = false
  private cssW = 1
  private cssH = 1
  private ro: ResizeObserver
  private io: IntersectionObserver
  private mql: MediaQueryList
  private gov: QualityGovernor | null = null
  private tier = 2
  private steps = 80
  private fpsEma = 60
  private frameMsEma = 16

  // backdrop
  private bdTex: WebGLTexture
  private bdSource: TexImageSource | null = null
  private bdKey: unknown = null
  private bdW = 1
  private bdH = 1

  // pointer
  private target: HTMLElement | Window | null = null
  private pointer = { cx: 0, cy: 0, has: false, active: false, down: false, nx: 0, ny: 0, sx: 0, sy: 0 }
  private hoverAttr = false

  // simulation state
  private time = 0
  private targetMode = 0
  private baseYaw = 0
  private basePitch = 0
  private chain: Body[] = Array.from({ length: CHAIN }, mkBody)
  private drops: Drop[] = Array.from({ length: DROPS }, () => ({ ...mkBody(), alive: false, merged: false, age: 0, delay: 0 }))
  private ripples: Ripple[] = Array.from({ length: MAX_RIPPLES }, () => ({ x: 0, y: 0, t: -99, a: 0 }))
  private ripHead = 0
  private blobBuf = new Float32Array(MAX_BLOBS * 4)
  private ripBuf = new Float32Array(MAX_RIPPLES * 4)
  private sdf = new Float32Array(3)
  private smooth = { yaw: 0, pitch: 0, mode: 0, fade: 0 }
  private fadeStart = 0
  private attached = true
  private anchorX = 0
  private anchorY = 0
  private local = { x: 0, y: 0 }
  private L = { x: 0, y: 0, scale: 1 }
  private R = new Float32Array(9)
  private RT = new Float32Array(9)
  private cam = new Float32Array(9)
  private camPos = new Float32Array(3)

  constructor(host: HTMLElement, canvas: HTMLCanvasElement, opts: RendererOptions) {
    this.canvas = canvas
    this.o = opts
    this.pass = new FullscreenPass(canvas, buildMercuryShader())
    this.bdTex = this.pass.createTexture()
    this.targetMode = clamp(opts.progress, 0, 2)
    this.smooth.mode = this.targetMode
    this.smooth.yaw = this.baseYaw = opts.yaw
    this.smooth.pitch = this.basePitch = opts.pitch

    this.mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    this.reduced = this.mql.matches
    this.mql.addEventListener('change', this.onMotionPref)

    this.applyQuality()
    this.setBackdrop(opts.backdrop)
    this.bindPointer(opts.pointerTarget)

    const r = host.getBoundingClientRect()
    this.cssW = Math.max(1, r.width)
    this.cssH = Math.max(1, r.height)
    this.ro = new ResizeObserver((entries) => {
      const cr = entries[entries.length - 1].contentRect
      this.cssW = Math.max(1, cr.width)
      this.cssH = Math.max(1, cr.height)
      this.invalidate()
    })
    this.ro.observe(host)
    this.io = new IntersectionObserver(
      (entries) => {
        this.visible = entries[entries.length - 1].isIntersecting
        if (this.visible) this.resume()
      },
      { rootMargin: '120px' },
    )
    this.io.observe(host)
    document.addEventListener('visibilitychange', this.onVis)
    canvas.addEventListener('webglcontextlost', this.onLost)

    if (opts.intro && !this.isStatic) this.playIntro(opts.introDelay)
    else this.smooth.fade = 1
    this.resume()
  }

  // ------------------------------------------------------------------ public

  get isStatic() {
    return !this.o.animate || this.reduced
  }

  setOptions(next: RendererOptions) {
    const prev = this.o
    this.o = next
    if (next.progress !== prev.progress) this.targetMode = clamp(next.progress, 0, 2)
    if (next.yaw !== prev.yaw) this.baseYaw = next.yaw
    if (next.pitch !== prev.pitch) this.basePitch = next.pitch
    if (next.quality !== prev.quality) this.applyQuality()
    if (next.backdrop !== prev.backdrop) this.setBackdrop(next.backdrop)
    if (next.pointerTarget !== this.target) this.bindPointer(next.pointerTarget)
    if (next.animate !== prev.animate) this.resume()
    this.invalidate()
  }

  /** Material stage 0 chrome · 1 glass · 2 x-ray (fractional = blend). */
  setProgress(p: number, immediate = false) {
    this.targetMode = clamp(p, 0, 2)
    if (immediate) this.smooth.mode = this.targetMode
    this.invalidate()
  }

  /** Base orientation in radians (e.g. a scroll-driven spin). Cursor tilt and sway add on top. */
  setRotation(yaw: number, pitch?: number, immediate = false) {
    this.baseYaw = yaw
    if (pitch !== undefined) this.basePitch = pitch
    if (immediate) {
      this.smooth.yaw = this.baseYaw
      this.smooth.pitch = this.basePitch
    }
    this.invalidate()
  }

  /** Drop a bead at canvas-local CSS px (default: random spot above the mark). */
  drop(x?: number, y?: number) {
    if (x === undefined || y === undefined) {
      this.spawnDrop((Math.random() - 0.5) * 0.4, 1.2 + Math.random() * 0.3, 0.02, 0, -0.4, 0, 0.04 + Math.random() * 0.02)
    } else if (this.toLocal(x, y)) {
      this.dropAtLocal(this.local.x, this.local.y)
    }
    this.invalidate()
  }

  /** Small surface ripple at the mark centre (badge hover etc). */
  ripple(amount = 0.01) {
    this.addRipple((Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.4, amount)
    this.invalidate()
  }

  playIntro(delay = 0) {
    this.fadeStart = this.time + delay
    this.smooth.fade = 0
    this.spawnDrop(0.05, 1.3, 0.02, 0, -0.4, 0, 0.06, delay + 0.25)
    this.spawnDrop(-0.22, 1.6, 0.0, 0.02, -0.3, 0, 0.042, delay + 0.55)
    this.spawnDrop(0.27, 1.9, 0.0, -0.03, -0.3, 0, 0.035, delay + 0.85)
    this.invalidate()
  }

  refreshBackdrop() {
    this.uploadBackdrop()
    this.invalidate()
  }

  getStats(): MercuryStats {
    return {
      tier: this.tier,
      renderScale: this.pass.scale,
      steps: this.steps,
      bufferWidth: this.pass.width,
      bufferHeight: this.pass.height,
      fps: Math.round(this.fpsEma),
      frameMs: Math.round(this.frameMsEma * 10) / 10,
    }
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    cancelAnimationFrame(this.raf)
    this.raf = 0
    this.ro.disconnect()
    this.io.disconnect()
    this.mql.removeEventListener('change', this.onMotionPref)
    document.removeEventListener('visibilitychange', this.onVis)
    this.canvas.removeEventListener('webglcontextlost', this.onLost)
    this.bindPointer(null)
    this.pass.dispose()
  }

  // ------------------------------------------------------------- lifecycle

  private onMotionPref = () => {
    this.reduced = this.mql.matches
    if (this.reduced) this.smooth.fade = 1
    this.resume()
  }
  private onVis = () => {
    if (!document.hidden) this.resume()
  }
  private onLost = (e: Event) => {
    e.preventDefault()
    cancelAnimationFrame(this.raf)
    this.raf = 0
    this.o.onContextLost?.()
  }

  private get wantsLoop() {
    return !this.disposed && this.visible && !document.hidden && !this.isStatic
  }

  private resume() {
    this.last = performance.now()
    this.invalidate()
  }

  invalidate() {
    if (this.disposed || this.raf || document.hidden || !this.visible) return
    this.raf = requestAnimationFrame(this.frame)
  }

  private applyQuality() {
    const q = this.o.quality
    this.gov = null
    if (typeof q === 'object') {
      this.pass.scale = clamp(q.scale, 0.2, 1)
      this.steps = Math.round(clamp(q.steps, 24, 160))
      this.tier = -1
      return
    }
    const coarse = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 700
    const setTier = (t: number) => {
      this.tier = t
      this.pass.scale = TIERS[t].scale
      this.steps = TIERS[t].steps
    }
    if (q === 'low') setTier(1)
    else if (q === 'medium') setTier(2)
    else if (q === 'high') setTier(4)
    else {
      const start = coarse ? 1 : 2
      setTier(start)
      this.gov = new QualityGovernor(start, 0, coarse ? 2 : TIERS.length - 1, setTier)
    }
  }

  // --------------------------------------------------------------- backdrop

  private setBackdrop(spec: MercuryBackdrop | null) {
    const key = spec?.source ?? null
    if (key === this.bdKey) return
    this.bdKey = key
    this.bdSource = null
    if (!spec) return
    const src = spec.source
    if (typeof src === 'string') {
      loadImage(src)
        .then((img) => {
          if (this.disposed || this.bdKey !== src) return
          this.bdSource = img
          this.uploadBackdrop()
          this.invalidate()
        })
        .catch((err) => console.warn(err))
    } else if (typeof HTMLImageElement !== 'undefined' && src instanceof HTMLImageElement && !src.complete) {
      src.addEventListener('load', () => {
        if (this.disposed || this.bdKey !== src) return
        this.bdSource = src
        this.uploadBackdrop()
        this.invalidate()
      }, { once: true })
    } else {
      this.bdSource = src
      this.uploadBackdrop()
    }
  }

  private uploadBackdrop() {
    if (!this.bdSource || this.disposed || this.pass.isLost) return
    const [w, h] = sourceSize(this.bdSource)
    if (w < 2 || h < 2) return
    this.bdW = w
    this.bdH = h
    this.pass.uploadTexture(this.bdTex, this.bdSource)
  }

  // ---------------------------------------------------------------- pointer

  private bindPointer(t: HTMLElement | Window | null) {
    const old = this.target
    if (old) {
      old.removeEventListener('pointermove', this.onMove as EventListener)
      old.removeEventListener('pointerdown', this.onDown as EventListener)
      old.removeEventListener('pointerup', this.onUp as EventListener)
      old.removeEventListener('pointercancel', this.onUp as EventListener)
      if (old === window) {
        document.documentElement.removeEventListener('pointerleave', this.onLeave)
        window.removeEventListener('blur', this.onLeave)
      } else old.removeEventListener('pointerleave', this.onLeave)
      if (this.hoverAttr && old instanceof HTMLElement) old.removeAttribute('data-mercury-hover')
      this.hoverAttr = false
    }
    this.target = t
    this.pointer.has = false
    this.pointer.active = false
    if (!t) return
    t.addEventListener('pointermove', this.onMove as EventListener, { passive: true })
    t.addEventListener('pointerdown', this.onDown as EventListener, { passive: true })
    t.addEventListener('pointerup', this.onUp as EventListener, { passive: true })
    t.addEventListener('pointercancel', this.onUp as EventListener, { passive: true })
    if (t === window) {
      document.documentElement.addEventListener('pointerleave', this.onLeave)
      window.addEventListener('blur', this.onLeave)
    } else t.addEventListener('pointerleave', this.onLeave)
  }

  private onMove = (e: PointerEvent) => {
    this.pointer.cx = e.clientX
    this.pointer.cy = e.clientY
    this.pointer.has = true
    this.pointer.active = e.pointerType !== 'touch' || this.pointer.down
  }
  private onLeave = () => {
    this.pointer.active = false
    this.pointer.has = false
  }
  private onUp = (e: PointerEvent) => {
    if (e.pointerType === 'touch') {
      this.pointer.down = false
      this.pointer.active = false
      this.pointer.has = false
    }
  }
  private onDown = (e: PointerEvent) => {
    this.onMove(e)
    if (e.pointerType === 'touch') {
      this.pointer.down = true
      this.pointer.active = true
    }
    if (!this.o.interactive || this.isStatic || e.button > 0) return
    if (this.smooth.fade < 0.6 || this.smooth.mode > 1.6) return
    const t = e.target as Element | null
    if (t && typeof t.closest === 'function' && t.closest(IGNORE)) return
    const r = this.canvas.getBoundingClientRect()
    if (!this.toLocal(e.clientX - r.left, e.clientY - r.top)) return
    this.dropAtLocal(this.local.x, this.local.y)
    this.invalidate()
  }

  // ------------------------------------------------------------------ math

  private setRot(yaw: number, pitch: number) {
    const R = this.R, RT = this.RT
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch)
    R[0] = cy; R[1] = 0; R[2] = -sy
    R[3] = sy * sp; R[4] = cp; R[5] = cy * sp
    R[6] = sy * cp; R[7] = -sp; R[8] = cy * cp
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) RT[i * 3 + j] = R[j * 3 + i]
  }

  private lookAt(px: number, py: number, pz: number) {
    const cam = this.cam
    let bx = px, by = py, bz = pz
    const bl = Math.hypot(bx, by, bz); bx /= bl; by /= bl; bz /= bl
    let rx = bz, rz = -bx
    const rl = Math.hypot(rx, rz); rx /= rl; rz /= rl
    const ux = by * rz, uy = bz * rx - bx * rz, uz = -by * rx
    cam[0] = rx; cam[1] = 0; cam[2] = rz
    cam[3] = ux; cam[4] = uy; cam[5] = uz
    cam[6] = bx; cam[7] = by; cam[8] = bz
  }

  /** Canvas-local CSS px → logo-local plane coords in this.local. */
  private toLocal(sx: number, sy: number) {
    const cam = this.cam, R = this.R, L = this.L, cp = this.camPos
    const cssW = this.cssW, cssH = this.cssH
    const ndcX = (sx * 2 - cssW) / cssH, ndcY = -((sy * 2 - cssH) / cssH)
    let dx = cam[0] * ndcX + cam[3] * ndcY - cam[6] * FOCAL
    let dy = cam[1] * ndcX + cam[4] * ndcY - cam[7] * FOCAL
    let dz = cam[2] * ndcX + cam[5] * ndcY - cam[8] * FOCAL
    const dl = Math.hypot(dx, dy, dz); dx /= dl; dy /= dl; dz /= dl
    const nx = R[6], ny = R[7], nz = R[8]
    const denom = dx * nx + dy * ny + dz * nz
    if (Math.abs(denom) < 1e-4) return false
    const t = ((L.x - cp[0]) * nx + (L.y - cp[1]) * ny + (0 - cp[2]) * nz) / denom
    const hx = cp[0] + dx * t - L.x, hy = cp[1] + dy * t - L.y, hz = cp[2] + dz * t
    this.local.x = (R[0] * hx + R[1] * hy + R[2] * hz) / L.scale
    this.local.y = (R[3] * hx + R[4] * hy + R[5] * hz) / L.scale
    return Math.abs(this.local.x) < 2.5 && Math.abs(this.local.y) < 2
  }

  // --------------------------------------------------------------- physics

  private addRipple(x: number, y: number, a: number) {
    const r = this.ripples[this.ripHead]
    r.x = x; r.y = y; r.t = this.time; r.a = a
    this.ripHead = (this.ripHead + 1) % MAX_RIPPLES
  }

  private spawnDrop(x: number, y: number, z: number, vx: number, vy: number, vz: number, r: number, delay = 0) {
    let d: Drop | undefined
    for (const q of this.drops) if (!q.alive) { d = q; break }
    if (!d) { d = this.drops[0]; for (const q of this.drops) if (q.age > d.age) d = q }
    d.x = x; d.y = y; d.z = z; d.vx = vx; d.vy = vy; d.vz = vz; d.r = r
    d.alive = true; d.merged = false; d.age = 0; d.delay = delay
  }

  private dropAtLocal(lx: number, ly: number) {
    const sdf = logoSdfCpu(lx, ly, this.sdf)
    if (sdf[0] < 0) {
      this.addRipple(lx, ly, 0.012)
      this.spawnDrop(lx, ly, HALF_DEPTH + 0.03, (Math.random() - 0.5) * 0.4, 0.5, 1.6, 0.045 + Math.random() * 0.015)
    } else {
      const len = Math.max(1e-4, sdf[0])
      this.spawnDrop(lx, ly, 0, ((lx - sdf[1]) / len) * 0.5, 0.7, 0.3, 0.04 + Math.random() * 0.025)
    }
  }

  private blobN = 0
  private bound = 0.68
  private pushBlob(b: Body) {
    const n = this.blobN
    if (b.r < 0.002 || n >= MAX_BLOBS) return
    const buf = this.blobBuf
    buf[n * 4] = b.x; buf[n * 4 + 1] = b.y; buf[n * 4 + 2] = b.z; buf[n * 4 + 3] = b.r
    this.bound = Math.max(this.bound, Math.hypot(b.x, b.y, b.z) + b.r + 0.1)
    this.blobN = n + 1
  }

  private step(dt: number, pActive: boolean) {
    const sdf = this.sdf
    const lx = this.local.x, ly = this.local.y
    logoSdfCpu(lx, ly, sdf)
    const d = sdf[0]
    if (pActive) { this.anchorX = sdf[1]; this.anchorY = sdf[2] }
    const ax = this.anchorX, ay = this.anchorY
    const ux = d !== 0 ? (lx - ax) / Math.max(Math.abs(d), 1e-4) : 0
    const uy = d !== 0 ? (ly - ay) / Math.max(Math.abs(d), 1e-4) : 0
    const stretch = Math.min(1, Math.max(0, d) / BREAK)
    const chain = this.chain
    for (let i = 0; i < CHAIN; i++) {
      const b = chain[i]
      let rx = ax, ry = ay, rz = 0, rr = 0
      if (pActive && d < 0) {
        rx = lx; ry = ly; rz = HALF_DEPTH * 0.7
        rr = CHAIN_IN[i]
        this.attached = true
      } else if (pActive && this.attached) {
        if (d > BREAK) {
          // the neck snaps: the head flies on as a free bead
          this.attached = false
          chain[0].vx += ux * 0.8; chain[0].vy += uy * 0.8
        } else {
          rx = ax + (lx - ax) * CHAIN_S[i]
          ry = ay + (ly - ay) * CHAIN_S[i]
          rr = CHAIN_OUT[i] * (i === 0 ? 1 - 0.25 * stretch : 1 - 0.5 * stretch)
        }
      }
      if (pActive && !this.attached) {
        if (i === 0) { rx = lx; ry = ly; rr = 0.052 } else rr = 0
        if (d < REATTACH) this.attached = true
      }
      const K = i === 0 ? 230 : 120 - i * 18
      const C = i === 0 ? 15 : 10
      b.vx += ((rx - b.x) * K - b.vx * C) * dt
      b.vy += ((ry - b.y) * K - b.vy * C) * dt
      b.vz += ((rz - b.z) * K - b.vz * C) * dt
      b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt
      b.r += (rr - b.r) * Math.min(1, dt * (rr > b.r ? 9 : 5))
    }

    for (const q of this.drops) {
      if (!q.alive) continue
      q.age += dt
      if (q.age < q.delay) continue
      logoSdfCpu(q.x, q.y, sdf)
      const qd = sdf[0]
      const tx = qd < 0 ? q.x : sdf[1], ty = qd < 0 ? q.y : sdf[2]
      const k = q.merged ? 30 : 11
      q.vx += ((tx - q.x) * k - q.vx * 2.4) * dt
      q.vy += ((ty - q.y) * k - q.vy * 2.4 - (qd > 0.2 ? 2.2 : 0)) * dt
      q.vz += ((0 - q.z) * k - q.vz * 3) * dt
      q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt
      if (!q.merged && qd < 0.012 && Math.abs(q.z) < HALF_DEPTH + q.r) {
        q.merged = true
        this.addRipple(q.x, q.y, 0.006 + q.r * 0.08)
      }
      if (q.merged) q.r -= dt * 0.07
      if (q.r <= 0 || q.age > q.delay + 7) q.alive = false
    }
  }

  // ----------------------------------------------------------------- frame

  private frame = (now: number) => {
    this.raf = 0
    if (this.disposed || this.pass.isLost) return
    const o = this.o
    const isStatic = this.isStatic
    if (o.fps > 0 && !isStatic && now - this.lastDraw < 1000 / o.fps - 2) {
      this.raf = requestAnimationFrame(this.frame)
      return
    }
    const t0 = performance.now()
    const dtMs = Math.max(0, now - this.last)
    this.last = now
    this.lastDraw = now
    if (!isStatic && dtMs < 250) {
      this.gov?.sample(dtMs)
      this.fpsEma += (1000 / Math.max(1, dtMs) - this.fpsEma) * 0.05
    }
    const dt = isStatic ? 0 : Math.min(dtMs / 1000, 1 / 30)
    this.time += dt

    const pass = this.pass
    const cssW = this.cssW, cssH = this.cssH
    pass.resize(cssW, cssH)
    const aspect = cssW / cssH

    // ---- fit: camera distance so the mark sits inside the padded box
    const fit = o.fit
    const lb = LOGO_BOUNDS
    const avail = 1 - 2 * clamp(fit.padding, 0, 0.45)
    const margin = 1.1
    const hH = (0.5 * lb.height * margin) / avail
    const hW = (0.5 * lb.width * margin) / (avail * aspect)
    let halfH = fit.mode === 'height' ? hH : fit.mode === 'width' ? hW : Math.max(hH, hW)
    halfH /= Math.max(0.05, fit.scale)
    const dist = halfH * FOCAL
    const cp = this.camPos
    cp[0] = 0; cp[1] = 0.075 * halfH; cp[2] = dist
    this.lookAt(cp[0], cp[1], cp[2])
    const L = this.L
    L.x = clamp(fit.x, -1.5, 1.5) * halfH * aspect
    L.y = -clamp(fit.y, -1.5, 1.5) * halfH
    L.scale = 1

    // ---- material + fade
    const k = isStatic || o.smoothing <= 0 ? 1 : 1 - Math.exp(-dt * o.smoothing)
    this.smooth.mode += (this.targetMode - this.smooth.mode) * k
    if (Math.abs(this.targetMode - this.smooth.mode) < 1e-4) this.smooth.mode = this.targetMode
    if (isStatic) this.smooth.fade = 1
    else if (this.smooth.fade < 1) this.smooth.fade = clamp((this.time - this.fadeStart) * 1.4, 0, 1)
    const mode = this.smooth.mode

    // ---- pointer (canvas-local)
    const p = this.pointer
    if (p.has) {
      const r = this.canvas.getBoundingClientRect()
      p.sx = p.cx - r.left
      p.sy = p.cy - r.top
      p.nx = clamp((p.sx / Math.max(1, r.width)) * 2 - 1, -1.5, 1.5)
      p.ny = clamp((p.sy / Math.max(1, r.height)) * 2 - 1, -1.5, 1.5)
    }

    // ---- orientation
    const xr = Math.max(0, mode - 1)
    const tilt = isStatic ? 0 : o.tilt
    const sway = isStatic ? 0 : o.sway
    const yawT = this.baseYaw + (p.has ? p.nx * 0.2 * tilt : 0) + Math.sin(this.time * 0.31) * 0.07 * sway + xr * Math.sin(this.time * 0.45) * 0.55 * sway
    const pitchT = this.basePitch + (p.has ? -p.ny * 0.1 * tilt : 0) + Math.sin(this.time * 0.23) * 0.03 * sway
    const kr = isStatic ? 1 : Math.min(1, dt * 3)
    this.smooth.yaw += (yawT - this.smooth.yaw) * kr
    this.smooth.pitch += (pitchT - this.smooth.pitch) * kr
    this.setRot(this.smooth.yaw, this.smooth.pitch)

    // ---- physics
    let simActive = false
    if (!isStatic) {
      const pActive = o.interactive && p.active && this.smooth.fade > 0.6 && mode < 1.6 && this.toLocal(p.sx, p.sy)
      this.step(dt, pActive)
      // expose hover state for custom cursors
      if (this.target instanceof HTMLElement) {
        const over = pActive && logoSdfCpu(this.local.x, this.local.y, this.sdf)[0] < 0.02
        if (over !== this.hoverAttr) {
          this.hoverAttr = over
          if (over) this.target.setAttribute('data-mercury-hover', '')
          else this.target.removeAttribute('data-mercury-hover')
        }
      }
      simActive = true
    }

    // ---- draw
    pass.use()
    const studio = o.background === 'studio'
    if (!studio && this.smooth.fade < 0.004) pass.clear()
    else this.upload(cssW, cssH, mode, studio, simActive)

    if (!this.readyFired) {
      this.readyFired = true
      o.onReady?.()
    }
    this.frameMsEma += (performance.now() - t0 - this.frameMsEma) * 0.05
    if (this.wantsLoop) this.raf = requestAnimationFrame(this.frame)
  }

  private upload(cssW: number, cssH: number, mode: number, studio: boolean, sim: boolean) {
    const pass = this.pass, o = this.o, L = this.L, cam = this.cam, cp = this.camPos, env = o.env
    pass.set2f('uRes', pass.width, pass.height)
    pass.set1f('uPxPerCss', pass.pxPerCss)
    pass.set1f('uTime', this.time)
    pass.set1f('uMode', mode)
    pass.set3f('uCamPos', cp[0], cp[1], cp[2])
    pass.setMat3('uCamRot', cam)
    pass.set1f('uFocal', FOCAL)
    pass.set3f('uLogoPos', L.x, L.y, 0)
    pass.setMat3('uLogoRotT', this.RT)
    pass.set1f('uLogoScale', L.scale)
    pass.set1f('uBlendK', 0.1)
    pass.set1i('uSteps', this.steps)
    pass.set1i('uStudio', studio ? 1 : 0)
    pass.set1f('uFloorY', L.y - 0.5 * L.scale - 0.035)
    pass.set1f('uFloorAmt', studio ? o.floor : 0)
    pass.set1f('uShadow', o.shadow)
    pass.set1f('uContours', o.contours)
    pass.set2f('uShadowOff', 0.035, -0.055)
    pass.set1f('uFade', this.smooth.fade)
    pass.set1f('uSheen', o.sheen)
    pass.set1f('uExposure', o.exposure)
    pass.set1f('uEnvSpin', this.isStatic ? 0.12 : Math.sin(this.time * 0.17) * 0.35)
    pass.set3v('uEnvTop', env.top)
    pass.set3v('uEnvKey', env.key)
    pass.set3v('uEnvRim', env.rim)
    pass.set3v('uEnvFill', env.fill)
    pass.set3v('uEnvCard', env.card)
    pass.set3v('uEnvPanel', env.panel)
    pass.set3v('uEnvHaze', env.haze)
    pass.set3v('uGlassTint', env.glass)
    pass.set3v('uXrayTint', env.xray)
    pass.set3v('uBgTop', env.bgTop)
    pass.set3v('uBgBottom', env.bgBottom)
    pass.set3v('uBgGlow', env.bgGlow)

    // logo centre on screen + mark height in css px
    const vx = L.x - cp[0], vy = L.y - cp[1], vz = -cp[2]
    const cx = vx * cam[0] + vy * cam[1] + vz * cam[2]
    const cy = vx * cam[3] + vy * cam[4] + vz * cam[5]
    const cz = -(vx * cam[6] + vy * cam[7] + vz * cam[8])
    const sxp = (cx / cz) * FOCAL, syp = (cy / cz) * FOCAL
    pass.set2f('uLogoScreen', (sxp * cssH + cssW) / 2, cssH - (syp * cssH + cssH) / 2)
    const markPx = (cssH * FOCAL) / (2 * cz) * L.scale
    pass.set1f('uMarkPx', markPx)

    // backdrop transform (only matters while glass is visible)
    const bd = o.backdrop
    const hasBd = !!(bd && this.bdSource)
    pass.set1i('uHasBackdrop', hasBd ? 1 : 0)
    pass.set1f('uFrost', bd?.frost ?? 1.2)
    if (hasBd && bd && mode > 0.02 && mode < 1.98) {
      if (bd.live) this.uploadBackdrop()
      const cr = this.canvas.getBoundingClientRect()
      let ex = 0, ey = 0, ew = cr.width, eh = cr.height
      if (bd.element) {
        const er = bd.element.getBoundingClientRect()
        ex = er.left - cr.left; ey = er.top - cr.top; ew = er.width; eh = er.height
      }
      let dw = ew, dh = eh
      if (bd.fit !== 'fill') {
        const s = bd.fit === 'contain' ? Math.min(ew / this.bdW, eh / this.bdH) : Math.max(ew / this.bdW, eh / this.bdH)
        dw = this.bdW * s
        dh = this.bdH * s
      }
      const ox = ex + (ew - dw) / 2, oy = ey + (eh - dh) / 2
      pass.set4f('uBdXform', 1 / Math.max(1, dw), 1 / Math.max(1, dh), -ox / Math.max(1, dw), -oy / Math.max(1, dh))
    }
    pass.setTex('uBackdrop', 0, this.bdTex)

    // blobs + ripples
    this.blobN = 0
    this.bound = 0.68
    if (sim) {
      for (const b of this.chain) this.pushBlob(b)
      for (const q of this.drops) if (q.alive && q.age >= q.delay) this.pushBlob(q)
    }
    const n = this.blobN, bound = this.bound, buf = this.blobBuf
    pass.set4fv('uBlobs', buf)
    pass.set1i('uBlobN', n)
    let rn = 0
    const rb = this.ripBuf
    for (const r of this.ripples) {
      if (this.time - r.t > 3.2) continue
      rb[rn * 4] = r.x; rb[rn * 4 + 1] = r.y; rb[rn * 4 + 2] = r.t; rb[rn * 4 + 3] = r.a
      rn++
    }
    pass.set4fv('uRipples', rb)
    pass.set1i('uRippleN', rn)
    pass.set4f('uBound', L.x, L.y, 0, bound * L.scale)
    pass.draw()
  }
}

const LOGO_BOUNDS = getLogoBounds()
