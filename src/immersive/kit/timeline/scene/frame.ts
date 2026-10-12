import * as THREE from 'three'

export const MARK_HEIGHT = 2.5
export const PAPER_THICKNESS = 0.02
export const FOV = 32

/** Camera framing for the folded mark at a given aspect ratio. */
export function markFrame(aspect: number, right: boolean) {
  const t = Math.tan(THREE.MathUtils.degToRad(FOV / 2))
  if (aspect >= 1.05) {
    const camZ = 6.2
    const halfW = camZ * t * aspect
    return { camZ, markX: right ? Math.min(halfW * 0.42, 1.6) : 0, markY: 0.02, halfW, halfH: camZ * t }
  }
  const camZ = Math.max(6.2, 1.6 / aspect / t)
  return { camZ, markX: 0, markY: right ? camZ * t * 0.36 : 0.02, halfW: camZ * t * aspect, halfH: camZ * t }
}
