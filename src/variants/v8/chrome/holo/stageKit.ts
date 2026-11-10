// Non-component pieces of the projector stage (chrome/holo/Projector.tsx; kept apart from the
// components so React fast refresh stays clean): the additive blend preset, the cone spec, the
// pedestal's graphite materials (lit by a tiny baked studio environment, satin if that bake
// fails), the HDR glow material, and the stage's light levels (the original projector's: always
// lit, dimming only as the mark leaves the beam, with the lens's pulse).
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { stageDegraded } from '../../lib/stageDebug'
import { CYAN, useDisposable, type Signal } from './common'

export const additive = {
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  toneMapped: false,
} as const

/** The light cone in world units (home/stageLayout.ts `cone`). */
export interface ConeSpec {
  baseY: number
  height: number
  baseR: number
  topR: number
}

/** A small neutral studio, baked once to a PMREM env map: graphite room, soft overhead box, a
 *  front strip (the band on the chamfers and the side), side strips (silhouette) and a low back
 *  strip (the far rim of the top). Null when the bake fails (the metal goes satin). */
export function useStudioEnv(): THREE.Texture | null {
  const gl = useThree((s) => s.gl)
  const target = useDisposable(() => {
    try {
      const scene = new THREE.Scene()
      scene.background = new THREE.Color('#0b0d10')
      const geo = new THREE.PlaneGeometry(1, 1)
      const mats: THREE.Material[] = []
      const add = (intensity: number, pos: [number, number, number], scale: [number, number]) => {
        const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#eef3f5').multiplyScalar(intensity), side: THREE.DoubleSide, toneMapped: false })
        mats.push(mat)
        const m = new THREE.Mesh(geo, mat)
        m.position.set(...pos)
        m.scale.set(scale[0], scale[1], 1)
        m.lookAt(0, 0, 0)
        scene.add(m)
      }
      add(0.45, [0, 5, 0.5], [5, 5])
      add(1.8, [0, 4.2, 2.4], [8, 1])
      add(0.6, [-4.2, 2.6, 0.6], [0.8, 4])
      add(0.6, [4.2, 2.6, 0.6], [0.8, 4])
      add(1.0, [0, 1.2, -4.5], [7, 0.6])
      const pmrem = new THREE.PMREMGenerator(gl)
      const rt = pmrem.fromScene(scene, 0.04)
      pmrem.dispose()
      geo.dispose()
      mats.forEach((m) => m.dispose())
      return { texture: rt.texture as THREE.Texture | null, dispose: () => rt.dispose() }
    } catch (error) {
      stageDegraded('studio env (hardware lit by the stage lights only)', error)
      return { texture: null, dispose: () => {} }
    }
  }, [gl])
  return target.texture
}

/** The pedestal's graphite family: anodised body, bright machined chamfers, a satin deck,
 *  the lens well's wall (it glows with the lens), dark seams and the faintly glowing vents. */
export function useGraphite() {
  const env = useStudioEnv()
  const metal = (withEnv: THREE.MeshStandardMaterialParameters, satin: THREE.MeshStandardMaterialParameters) =>
    new THREE.MeshStandardMaterial(env ? { ...withEnv, envMap: env } : satin)
  const body = useDisposable(
    () => metal({ color: '#66707a', metalness: 0.86, roughness: 0.4, envMapIntensity: 1.25 }, { color: '#3c454c', metalness: 0.35, roughness: 0.5 }),
    [env],
  )
  const chamfer = useDisposable(
    () => metal({ color: '#c3ccd2', metalness: 1, roughness: 0.2, envMapIntensity: 1.6 }, { color: '#79848b', metalness: 0.5, roughness: 0.32 }),
    [env],
  )
  const deck = useDisposable(
    () => metal({ color: '#3e464d', metalness: 0.8, roughness: 0.5, envMapIntensity: 1.0 }, { color: '#2a3137', metalness: 0.3, roughness: 0.55 }),
    [env],
  )
  const well = useDisposable(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#0d1215',
        metalness: 0.5,
        roughness: 0.4,
        emissive: CYAN.clone(),
        emissiveIntensity: 0,
        side: THREE.BackSide,
        ...(env ? { envMap: env, envMapIntensity: 0.6 } : {}),
      }),
    [env],
  )
  const seam = useDisposable(() => new THREE.MeshBasicMaterial({ color: '#020304' }), [])
  const vent = useDisposable(() => new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false }), [])
  return { body, chamfer, deck, well, seam, vent }
}

/** An HDR emissive (halo, rims, seams, LEDs): its colour is set per frame. */
export function useGlow() {
  return useDisposable(() => new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false }), [])
}

/** The stage's light levels for this frame (the original projector's behaviour). */
export interface StageLevels {
  /** The beam: the signal, dimmed as the mark leaves (`signal.lift`). */
  p: number
  /** The lens and everything lit with it: never fully dark (0.25 at rest without a beam). */
  lens: number
  /** The cone's fast shimmer / flicker on top of `p`. */
  cone: number
  /** The lens's pulse (a ring born at the core every 1 / 0.45 s, lensFrag): 1 at its birth,
   *  decaying to 0 before the next. `pulseAt(delay)` is the same beat a little later. */
  pulse: number
  pulseAt: (delay: number) => number
}

const fract = (x: number) => x - Math.floor(x)
/** The lens shader's pulse rate (lensFrag: `fract(uTime * 0.45)`). */
const PULSE_RATE = 0.45

export function stageLevels(signal: Signal): StageLevels {
  const t = signal.time
  const p = signal.power * (1 - signal.lift * 0.92)
  const beat = (delay: number) => {
    const k = 1 - fract((t - delay) * PULSE_RATE)
    return k * k * k
  }
  return {
    p,
    lens: 0.25 + 0.75 * p,
    cone: p * (0.9 + 0.1 * Math.sin(t * 31) * Math.sin(t * 5.3)),
    pulse: beat(0),
    pulseAt: beat,
  }
}
