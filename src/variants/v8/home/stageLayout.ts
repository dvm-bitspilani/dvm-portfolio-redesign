// Where the hologram sits over the projector stage. The stage canvas (HeroStage.tsx) has a fixed
// camera; the live mark is a separate fixed box (chrome/mark.jsx), so this mirrors the stage's
// projection in plain THREE math to get the mark's centre and height in CSS px of the hero.
// Everything that poses against the stage reads the same layout: the canvas (HeroStage.tsx), the
// DOM mark (Hero.jsx via `stageMark`), the preloader (chrome/Boot.jsx) and the SVG stand-in
// (chrome/holo/StageFallback.tsx).
//
// The projector is the pedestal (chrome/holo/Projector.tsx; its dimensions are PEDESTAL below)
// under the original's beam and framing: A's nearly level camera, A's mark size and A's flared
// cone (0.2 at the lens to 1.25 at the top, 2.75 tall), all lifted by the pedestal's extra height
// so the cone starts in the recessed lens (y 0.388) and the mark keeps A's run up the beam above
// it. The camera is pulled back a little so the taller plinth fits: on desktop (16:10) the mark's
// top is ~16 % down, the lens ~73 %, the plinth's front edge ~89 % and the first table ring just
// above the fold; on phones the plinth's front edge is at ~62 %, above the hero copy (which
// starts at ~69 %).
import * as THREE from 'three'

export const FOV = 34

type Vec3 = readonly [number, number, number]

/** One machined disc of the pedestal: chamfered foot, tapered side, top chamfer, and a deck ring
 *  from the chamfer's inner edge (rTop - chamfer) in to rDeckIn. World units. */
export interface PedestalDisc {
  y0: number
  /** Side radius at the foot / under the top chamfer. */
  r: number
  rTop: number
  sideH: number
  chamfer: number
  rDeckIn: number
}

const FOOT_H = 0.01
const CHAMFER_H = 0.016
const DISCS: readonly PedestalDisc[] = [
  { y0: 0, r: 0.7, rTop: 0.695, sideH: 0.094, chamfer: 0.036, rDeckIn: 0.535 },
  { y0: 0.142, r: 0.56, rTop: 0.556, sideH: 0.09, chamfer: 0.026, rDeckIn: 0.425 },
  { y0: 0.284, r: 0.45, rTop: 0.446, sideH: 0.092, chamfer: 0.028, rDeckIn: 0.386 },
]
/** The top of a disc's deck. */
export const deckY = (d: PedestalDisc) => d.y0 + FOOT_H + d.sideH + CHAMFER_H

/** The emitter: a stepped plinth of three machined discs (plinth, middle, top) separated by
 *  recessed necks with glowing seams, the lens recessed 0.014 under the top deck (0.402), and a
 *  tick ring hovering just outside the top disc. */
export const PEDESTAL = {
  footH: FOOT_H,
  chamferH: CHAMFER_H,
  discs: DISCS,
  /** The recessed necks between the discs (radius = the deck's inner edge); their seams glow. */
  necks: [
    { y0: deckY(DISCS[0]), y1: DISCS[1].y0, r: 0.535 },
    { y0: deckY(DISCS[1]), y1: DISCS[2].y0, r: 0.425 },
  ],
  lensY: 0.388,
  lensR: 0.372,
  /** The turning tick ring: inner / outer radius, just above the top deck. */
  ring: { inner: 0.475, outer: 0.6, y: deckY(DISCS[2]) + 0.006 },
} as const

export interface StageLayoutSpec {
  camera: { desktop: { pos: Vec3; look: Vec3 }; narrow: { pos: Vec3; look: Vec3 } }
  /** World y of the mark's centre, and its world height (desktop / phones). */
  logoY: number
  markScale: number
  markScaleNarrow: number
  /** The light cone (world units): base just above the lens, height, radius at the lens and at the top. */
  cone: { baseY: number; height: number; baseR: number; topR: number }
  /** The emitter's footprint radius, lens height and lens radius. */
  device: { radius: number; lensY: number; lensR: number }
  /** Scene fog (near, far). */
  fog: readonly [number, number]
}

export const STAGE_LAYOUT: StageLayoutSpec = {
  camera: {
    desktop: { pos: [0, 1.85, 6.4], look: [0, 1.32, 0] },
    narrow: { pos: [0, 2.6, 8.6], look: [0, 0.45, 0] },
  },
  logoY: 1.86,
  markScale: 1.55,
  markScaleNarrow: 1.3,
  cone: { baseY: PEDESTAL.lensY + 0.007, height: 2.75, baseR: 0.2, topR: 1.25 },
  device: { radius: DISCS[0].r, lensY: PEDESTAL.lensY, lensR: PEDESTAL.lensR },
  fog: [7.5, 17.5],
}

export interface StageMark {
  /** Centre and height of the mark in px of the stage box. */
  x: number
  y: number
  h: number
  /** World scale of the mark in the stage. */
  scale: number
}

export function stageCamera(narrow: boolean, aspect: number) {
  const c = narrow ? STAGE_LAYOUT.camera.narrow : STAGE_LAYOUT.camera.desktop
  const cam = new THREE.PerspectiveCamera(FOV, aspect, 0.1, 60)
  cam.position.set(c.pos[0], c.pos[1], c.pos[2])
  cam.lookAt(c.look[0], c.look[1], c.look[2])
  cam.updateMatrixWorld()
  cam.updateProjectionMatrix()
  return cam
}

export function stageMark(W: number, H: number, narrow: boolean): StageMark {
  const L = STAGE_LAYOUT
  const cam = stageCamera(narrow, Math.max(1e-3, W / Math.max(1, H)))
  const scale = narrow ? L.markScaleNarrow : L.markScale
  const px = (v: THREE.Vector3) => ({ x: (v.x * 0.5 + 0.5) * W, y: (-v.y * 0.5 + 0.5) * H })
  const t = px(new THREE.Vector3(0, L.logoY + scale / 2, 0).project(cam))
  const b = px(new THREE.Vector3(0, L.logoY - scale / 2, 0).project(cam))
  return { x: (t.x + b.x) / 2, y: (t.y + b.y) / 2, h: Math.max(40, b.y - t.y), scale }
}
