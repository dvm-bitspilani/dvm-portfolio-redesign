import * as THREE from 'three'
import type { TimelineYear } from '../lib/timeline'

/** Mutable state shared between the DOM page and the WebGL scene (no React renders). */
export interface StageState {
  /** 0..1 scroll progress through the pinned stage */
  progress: number
  reduced: boolean
  coarse: boolean
  /** set by the scene once the intro fold has finished */
  introDone: boolean
  /** timeline captions (one per year), positioned by the scene every frame */
  captions: (HTMLElement | null)[]
  timeline: TimelineYear[]
  /** hero copy element, faded by the scene with the unfold */
  hero: HTMLElement | null
  hint: HTMLElement | null
  /** user interacted with the paper (hides the hint) */
  touched: boolean
}

export const MARK_HEIGHT = 2.5
export const PAPER_THICKNESS = 0.02

export const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x))

/** Camera framing for the hero at a given aspect ratio. */
export function heroFrame(aspect: number) {
  const fov = 32
  const t = Math.tan(THREE.MathUtils.degToRad(fov / 2))
  if (aspect >= 1.05) {
    const camZ = 6.2
    const halfW = camZ * t * aspect
    return { fov, camZ, markX: Math.min(halfW * 0.42, 1.6), markY: 0.02, halfW, halfH: camZ * t }
  }
  const camZ = Math.max(6.2, 1.6 / aspect / t)
  return { fov, camZ, markX: 0, markY: camZ * t * 0.36, halfW: camZ * t * aspect, halfH: camZ * t }
}

