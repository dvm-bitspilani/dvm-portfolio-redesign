// Postprocessing pass for the hologram canvases (copied from the lab's Holo design):
// chroma split, tearing, CRT collapse and static on signal loss.
import { Uniform } from 'three'
import { Effect, EffectAttribute, BlendFunction } from 'postprocessing'
import { signalEffectFrag } from './shaders'

/** Shared mutable signal state: written by scene logic, read by the effect each frame. */
export interface SignalState {
  glitch: number
  loss: number
  static: number
  /** Glitch-time chroma split (UV fraction at the buffer edge, on top of the glitch's own). 0 at rest. */
  aberration: number
}

export const makeFx = (): SignalState => ({ glitch: 0, loss: 0, static: 0, aberration: 0 })

export interface SignalEffectOptions {
  /**
   * Resting chroma split in output (drawing-buffer) pixels at the buffer's edge, falling to 0 at
   * its centre. Pixel-defined so it never grows with the canvas size or a page zoom. The stage
   * passes 0 (no fringes on the whole stage); the mark keeps a hairline.
   */
  restPx?: number
}

export class SignalEffect extends Effect {
  state: SignalState
  constructor(state: SignalState, { restPx = 0 }: SignalEffectOptions = {}) {
    super('HoloSignal', signalEffectFrag, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map<string, Uniform>([
        ['uTime', new Uniform(0)],
        ['uGlitch', new Uniform(0)],
        ['uLoss', new Uniform(0)],
        ['uStatic', new Uniform(0)],
        ['uAberration', new Uniform(0)],
        ['uRestPx', new Uniform(restPx)],
      ]),
    })
    this.state = state
  }
  update(_r: unknown, _i: unknown, dt = 0) {
    const u = this.uniforms
    u.get('uTime')!.value += Math.min(dt, 0.1)
    u.get('uGlitch')!.value = this.state.glitch
    u.get('uLoss')!.value = this.state.loss
    u.get('uStatic')!.value = this.state.static
    u.get('uAberration')!.value = this.state.aberration
  }
}
