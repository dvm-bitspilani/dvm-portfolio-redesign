import * as THREE from 'three'
import { TargetLibrary, type Target } from './targets'

/** Screen-fraction rectangle (0..1, y down) a shape is fitted into. */
export interface Region {
  x0: number
  y0: number
  x1: number
  y1: number
}

export interface Spec {
  target: Target
  /** Region to fit into, or 'world' when the target already holds world coordinates. */
  region: Region | (() => Region) | 'world'
  /** Fraction of the region to fill (default 0.9). */
  fill?: number
  /** Continuous spin about Y, rad/s. */
  spinSpeed?: number
  /** Sway amplitude about Y, rad. */
  sway?: number
  /** Tilt about X, rad. */
  tilt?: number
  /** Accumulated spin (managed by the director). */
  spin?: number
}

export const CAMERA = { fov: 35, dist: 6 }
export const HALF_H = CAMERA.dist * Math.tan(THREE.MathUtils.degToRad(CAMERA.fov / 2))

export const isMobileViewport = () => window.innerWidth < 760

/** Common layouts. */
export const regions = {
  right: (): Region => (isMobileViewport() ? { x0: 0.08, y0: 0.09, x1: 0.92, y1: 0.4 } : { x0: 0.52, y0: 0.14, x1: 0.96, y1: 0.88 }),
  rightTall: (): Region => (isMobileViewport() ? { x0: 0.08, y0: 0.08, x1: 0.92, y1: 0.5 } : { x0: 0.5, y0: 0.08, x1: 0.94, y1: 0.94 }),
  center: (): Region => (isMobileViewport() ? { x0: 0.05, y0: 0.15, x1: 0.95, y1: 0.6 } : { x0: 0.18, y0: 0.12, x1: 0.82, y1: 0.88 }),
  full: (): Region => ({ x0: -0.1, y0: -0.1, x1: 1.1, y1: 1.1 }),
}

export interface PointerState {
  x: number
  y: number
  inside: boolean
  down: boolean
}

/**
 * The director is the single mutable object pages talk to. It is read every
 * frame by the simulation; nothing here triggers React renders.
 */
export class Director {
  readonly lib: TargetLibrary
  readonly reduced: boolean
  readonly mobile: boolean
  a: Spec | null = null
  b: Spec | null = null
  mix = 0
  kick = 0
  burst = 0
  burstOrigin = new THREE.Vector3()
  snap: THREE.DataTexture | null = null
  parallax = 1
  /** Global brightness multiplier target. */
  alpha = 1
  pointer: PointerState = { x: 0, y: 0, inside: false, down: false }
  /** Optional per-frame driver (e.g. the home page scroll morph). */
  driver: ((dt: number) => void) | null = null
  time = 0

  constructor(N: number, reduced: boolean, mobile: boolean) {
    this.lib = new TargetLibrary(N)
    this.reduced = reduced
    this.mobile = mobile
    this.lib.inUse = () => {
      const s = new Set<string>()
      if (this.a) s.add(this.a.target.key)
      if (this.b) s.add(this.b.target.key)
      return s
    }
  }

  get count() {
    return this.lib.count
  }

  /** Discrete formation change: the springs carry the swarm across. */
  show(spec: Spec, opts: { kick?: number; burst?: number } = {}) {
    if (this.a === spec && this.b === spec) return
    const changed = this.a?.target.key !== spec.target.key || this.b?.target.key !== spec.target.key
    this.a = spec
    this.b = spec
    this.mix = 0
    if (changed && !this.reduced) {
      this.kick = Math.max(this.kick, opts.kick ?? 0.55)
      if (opts.burst) this.burst = opts.burst
    }
  }

  /** Continuous morph between two formations (scroll-driven). */
  blend(a: Spec, b: Spec, mix: number) {
    this.a = a
    this.b = b
    this.mix = mix
  }

  explode(strength: number, origin?: THREE.Vector3) {
    if (this.reduced) return
    this.burst = strength
    if (origin) this.burstOrigin.copy(origin)
  }

  /** Teleport the swarm into a world-space texture this frame (then it is released). */
  snapTo(tex: THREE.DataTexture) {
    if (this.reduced) return
    this.snap = tex
  }

  /** Evaluate offset/scale + rotation of a spec for the current viewport. */
  evaluate(spec: Spec, aspect: number, outX: THREE.Vector4, outR: THREE.Vector2) {
    if (spec.region === 'world') {
      outX.set(0, 0, 0, 1)
      outR.set(0, 0)
      return
    }
    const r = typeof spec.region === 'function' ? spec.region() : spec.region
    const halfW = HALF_H * aspect
    const wx0 = (r.x0 * 2 - 1) * halfW
    const wx1 = (r.x1 * 2 - 1) * halfW
    const wy0 = (1 - r.y0 * 2) * HALF_H
    const wy1 = (1 - r.y1 * 2) * HALF_H
    const rw = wx1 - wx0
    const rh = wy0 - wy1
    const fill = spec.fill ?? 0.9
    const s = Math.min(rh, rw / spec.target.aspect) * fill
    outX.set((wx0 + wx1) / 2, (wy0 + wy1) / 2, 0, s)
    const sway = spec.sway && !this.reduced ? Math.sin(this.time * 0.32) * spec.sway : 0
    outR.set((this.reduced ? 0 : spec.spin ?? 0) + sway, spec.tilt ?? 0)
  }

  dispose() {
    this.lib.dispose()
    this.a = this.b = null
    this.driver = null
  }
}
