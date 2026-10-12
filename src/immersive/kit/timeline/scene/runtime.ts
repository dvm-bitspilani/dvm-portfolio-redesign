import type * as THREE from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import type { Phases } from '../lib/phases'

export type BodyMode = 'home' | 'held' | 'free' | 'return'

/** Filled by the (lazy) physics layer; read by the strip each frame. */
export interface PhysicsBridge {
  mode: BodyMode[]
  pos: THREE.Vector3[]
  quat: THREE.Quaternion[]
  /** extra crease opening per chain / hinge while thrown */
  crumple: number[][]
  onDown(ci: number, e: ThreeEvent<PointerEvent>): void
}

/** Mutable state shared between the DOM component and the WebGL scene (no React renders). */
export interface Runtime {
  /** progress requested by scroll / parent */
  target: number
  /** smoothed progress used for rendering */
  progress: number
  phases: Phases
  startFolded: boolean
  foldOnEnter: boolean
  reduced: boolean
  coarse: boolean
  interactive: boolean
  physics: boolean
  /** mark sits right of centre when an intro overlay is shown */
  markRight: boolean
  captions: (HTMLElement | null)[]
  captionLayer: HTMLElement | null
  intro: HTMLElement | null
  hint: HTMLElement | null
  touched: boolean
  introDone: boolean
  activeIndex: number
  onActive: ((i: number) => void) | null
  /** home pose of each chain body (written by the strip) */
  home: { pos: THREE.Vector3; quat: THREE.Quaternion }[]
  bridge: PhysicsBridge | null
  /** bounds of the view around the folded mark (world units) */
  frame: { halfW: number; halfH: number }
  /** camera rig state written by the strip, read by lights / wall: a = mark→overview, b = overview→timeline */
  cam: { a: number; b: number; x: number; markX: number; markY: number }
}
