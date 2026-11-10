// Shared bits of the V8 hologram (adapted from the lab's Holo design, src/lab/designs/holo/scene/common.ts):
// brand colours instead of the lab's cyan/violet, and a `lift` channel that lets the home
// page dim the projector as the mark leaves the beam.
import * as THREE from 'three'
import { useEffect, useMemo } from 'react'

/** The renderer palette: V2 brand teal (#45e6ff, CSS `--teal`) and the pale rim (#cfe8ff). */
export const CYAN = new THREE.Color('#45e6ff')
export const PALE = new THREE.Color('#cfe8ff')

/** Mutable signal shared by the hero controller and every hologram material (no React state per frame). */
export interface Signal {
  time: number
  /** Carrier: 1 = live, 0 = cut (static). */
  power: number
  glitch: number
  /** Build sweep of the mark, 0..1. */
  build: number
  /** Point-cloud scatter, 0 = on the mark. */
  scatter: number
  /** 0 = the mark sits in the beam, 1 = it has left the projector (home page scroll). */
  lift: number
  /**
   * The pointer's interference wake on the mark (written by the mark canvas from `rt.pointer`).
   * Mark-local: 1 unit tall, centred on 0, before the yaw / pitch turn; z stays 0.
   */
  probe: THREE.Vector3
  /** 0..1, how present the wake is (0 = the hologram's idle look, untouched). */
  probeOn: number
  /** Radius of the disturbance, mark-local. */
  probeR: number
  /** 0..1, recent-motion energy (the wake): ring speed and dot lift. Decays. */
  probeKick: number
}

export const makeSignal = (): Signal => ({
  time: 0,
  power: 1,
  glitch: 0,
  build: 1,
  scatter: 0,
  lift: 0,
  probe: new THREE.Vector3(),
  probeOn: 0,
  probeR: 0.26,
  probeKick: 0,
})

/** useMemo + dispose on unmount for GPU resources created imperatively. */
export function useDisposable<T extends { dispose: () => void }>(factory: () => T, deps: unknown[]): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo(factory, deps)
  useEffect(() => () => value.dispose(), [value])
  return value
}
