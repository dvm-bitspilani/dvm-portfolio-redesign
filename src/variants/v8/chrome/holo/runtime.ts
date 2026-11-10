// The mutable runtime shared by the mark controller (chrome/markControl.js), the persistent mark
// canvas (chrome/HoloMarkCanvas.tsx) and the home hero's stage (home/HeroStage.tsx).
//
// Who writes what (one writer per field at a time):
//   yaw / pitch / hidden / fps / driven / displayScale   the controller (chrome/markControl.js)
//   yawAdd / pitchAdd / pointer                          the hero stage, while it is on screen
//   signal                                               the hero stage while `driven`; the menu's
//                                                        morph while `morph`; else the mark canvas
//                                                        settles it on its own
//   signal.probe*                                        always the mark canvas (from `pointer`)
import { makeSignal, type Signal } from './common'
import { makeFx, type SignalState } from './SignalEffect'

/** Box side / mark height. The mark box is always square. */
export const MARK_K = 2.2
export const FOV = 30
/** Camera distance at which MARK_K world units fill the box height. */
export const CAM_Z = MARK_K / (2 * Math.tan((FOV / 2) * (Math.PI / 180)))

/** The pointer over the hero, as the stage sees it (smoothed; NDC of the hero box). */
export interface MarkPointer {
  x: number
  y: number
  /** Over the hero box. */
  inside: boolean
  /** Smoothed pointer speed (NDC units / s). */
  speed: number
  /** The pointer on the mark's front face, mark-local (1 unit tall, centred on 0), with the
   *  mark's current turn undone. Not clamped: it runs past the mark when the pointer is away. */
  mx: number
  my: number
  /** The last pointer to move was a hovering one (mouse / pen), not a finger. */
  hover: boolean
  /** Seconds since the pointer last moved over the hero. */
  idle: number
  /** The stage is live (not waiting for the preloader or booting the mark). */
  live: boolean
  /** Counts touch taps on the hero (each one plays the one-shot wake at mx / my). */
  taps: number
}

export interface MarkRuntime {
  signal: Signal
  fx: SignalState
  yaw: number
  pitch: number
  /** Extra turn toward the cursor, written by the hero stage (0 when docked). */
  yawAdd: number
  pitchAdd: number
  /**
   * The pointer over the hero: the hero stage keeps this up to date while it drives the mark;
   * HoloMarkCanvas's frame loop turns it into the interference wake (`signal.probe*`).
   */
  pointer: MarkPointer
  /** Frames per second to render while nothing else is driving it (0 = only on `invalidate`). */
  fps: number
  reduced: boolean
  /** True while the home hero's stage controller writes the signal (boot phases, the turn). */
  driven: boolean
  /** The box is invisible (op < 0.01) or the live mark failed: render nothing. */
  hidden: boolean
  /** The menu is (de)materialising the mark: leave build / scatter to its tween. */
  morph: boolean
  /** Lower particle budget (phones). */
  narrow: boolean
  /** On-screen size / drawing-buffer size of the box (CSS scale of the canvas wrapper). */
  displayScale: number
  /** Request one frame (the canvas's demand loop). */
  invalidate: () => void
  /** Restart the canvas's frame-rate ticker after it slept (hidden, fps 0, tab hidden). */
  wake: () => void
}

export function makeMarkRuntime(reduced: boolean, narrow: boolean): MarkRuntime {
  return {
    signal: { ...makeSignal(), time: reduced ? 4.2 : 0 },
    fx: makeFx(),
    yaw: 0.06,
    pitch: -0.12,
    yawAdd: 0,
    pitchAdd: 0,
    pointer: { x: 0, y: 0, inside: false, speed: 0, mx: 0, my: 0, hover: false, idle: 0, live: false, taps: 0 },
    fps: 0,
    reduced,
    driven: false,
    hidden: true,
    morph: false,
    narrow,
    displayScale: 1,
    invalidate: () => {},
    wake: () => {},
  }
}
