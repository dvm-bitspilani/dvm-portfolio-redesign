import type { SwarmEngine } from './engine/SwarmEngine'
import type { SwarmController, SwarmShowOptions, SwarmStats, SwarmTarget } from './types'

interface Req {
  target: SwarmTarget
  opts?: SwarmShowOptions
}

/**
 * Stable controller that outlives engine rebuilds (count/quality/reduced-motion
 * changes recreate the GPU side). It remembers the desired base/override
 * formations and replays them onto each new engine.
 */
export class SwarmHandle implements SwarmController {
  private engine: SwarmEngine | null = null
  private base: Req | null = null
  private over: Req | null = null
  private preloads = new Set<SwarmTarget>()

  attach(engine: SwarmEngine) {
    this.engine = engine
    if (this.preloads.size) void engine.preload([...this.preloads])
    if (this.base) void engine.show(this.base.target, this.base.opts, 'base')
    if (this.over) void engine.show(this.over.target, this.over.opts, 'override')
  }

  detach(engine: SwarmEngine) {
    if (this.engine === engine) this.engine = null
  }

  setTarget(target: SwarmTarget, opts?: SwarmShowOptions) {
    this.base = { target, opts }
    return this.engine ? this.engine.show(target, opts, 'base') : Promise.resolve()
  }

  override(target: SwarmTarget, opts?: SwarmShowOptions) {
    this.over = { target, opts }
    return this.engine ? this.engine.show(target, opts, 'override') : Promise.resolve()
  }

  clearOverride(opts?: SwarmShowOptions) {
    if (!this.over) return
    this.over = null
    this.engine?.clearOverride(opts)
  }

  preload(targets: SwarmTarget[]) {
    for (const t of targets) this.preloads.add(t)
    return this.engine ? this.engine.preload(targets) : Promise.resolve()
  }

  scrub(a: SwarmTarget, b: SwarmTarget, t: number, oa?: SwarmShowOptions, ob?: SwarmShowOptions) {
    this.base = { target: t < 0.5 ? a : b, opts: t < 0.5 ? oa : ob ?? oa }
    this.engine?.scrub(a, b, t, oa, ob)
  }

  explode(strength?: number) {
    this.engine?.explode(strength)
  }

  stats(): SwarmStats {
    return this.engine?.stats() ?? { particles: 0, fps: 0, dpr: 1, running: false, gl: false }
  }
}
