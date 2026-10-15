import { Uniform } from 'three'
import { Effect, EffectAttribute, BlendFunction } from 'postprocessing'
import { signalEffectFrag } from './shaders'

/** Shared mutable signal state: written by scene logic, read by the effect each frame. */
export interface SignalState {
  glitch: number
  loss: number
  static: number
  aberration: number
}

export class SignalEffect extends Effect {
  state: SignalState
  constructor(state: SignalState) {
    super('HoloSignal', signalEffectFrag, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map<string, Uniform>([
        ['uTime', new Uniform(0)],
        ['uGlitch', new Uniform(0)],
        ['uLoss', new Uniform(0)],
        ['uStatic', new Uniform(0)],
        ['uAberration', new Uniform(0.004)],
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
