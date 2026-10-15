import * as THREE from 'three'
import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { store, type Space } from '../store'

/**
 * DOM text tracked to 3D points. Text stays real, crisp DOM (selectable, accessible),
 * positioned every frame from the camera; it scales with depth and fades in/out by distance.
 */
export interface AnchorRec {
  el: HTMLElement
  pos: THREE.Vector3
  space: Space | 'any'
  near: number
  far: number
  refDist: number
  minS: number
  maxS: number
  enabled: boolean
  shown: boolean
  lastT: string
  lastO: number
}

export const anchors = new Set<AnchorRec>()

type Vec = THREE.Vector3 | [number, number, number]

export interface AnchorProps {
  at: Vec
  space?: Space | 'any'
  /** Fully faded at near * 0.55, fully visible from near. */
  near?: number
  /** Visible up to far * 0.7, gone at far. */
  far?: number
  /** Depth at which scale = 1; 0 disables depth scaling. */
  refDist?: number
  minS?: number
  maxS?: number
  enabled?: boolean
  className?: string
  align?: 'center' | 'top' | 'left' | 'right' | 'bottom'
  children: ReactNode
}

export function Anchor({
  at,
  space = 'outside',
  near = 2,
  far = 40,
  refDist = 0,
  minS = 0.35,
  maxS = 1.8,
  enabled = true,
  className = '',
  align = 'center',
  children,
}: AnchorProps) {
  const ref = useRef<HTMLDivElement>(null)
  const rec = useRef<AnchorRec | null>(null)
  const x = Array.isArray(at) ? at[0] : at.x
  const y = Array.isArray(at) ? at[1] : at.y
  const z = Array.isArray(at) ? at[2] : at.z

  useLayoutEffect(() => {
    const el = ref.current!
    const r: AnchorRec = {
      el,
      pos: new THREE.Vector3(x, y, z),
      space,
      near,
      far,
      refDist,
      minS,
      maxS,
      enabled: true,
      shown: false,
      lastT: '',
      lastO: -1,
    }
    rec.current = r
    anchors.add(r)
    return () => {
      anchors.delete(r)
    }
  }, [x, y, z, space, near, far, refDist, minS, maxS])

  useLayoutEffect(() => {
    if (rec.current) rec.current.enabled = enabled
  })

  return (
    <div ref={ref} className={`pt-anchor ${className}`} style={{ visibility: 'hidden', opacity: 0 }}>
      <div className={`pt-a-in pt-a-${align}`}>{children}</div>
    </div>
  )
}

const v = new THREE.Vector3()

/** Runs inside the Canvas after the camera rig. */
export function AnchorProjector() {
  const size = useThree((s) => s.size)
  useFrame(({ camera }) => {
    const space = store.get().space
    const w = size.width
    const h = size.height
    for (const a of anchors) {
      let alpha = 0
      let depth = 1
      if (a.enabled && (a.space === 'any' || a.space === space)) {
        v.copy(a.pos).applyMatrix4(camera.matrixWorldInverse)
        depth = -v.z
        if (depth > 0.2) {
          const inA = THREE.MathUtils.smoothstep(depth, a.near * 0.55, a.near)
          const outA = 1 - THREE.MathUtils.smoothstep(depth, a.far * 0.7, a.far)
          alpha = inA * outA
        }
      }
      if (alpha < 0.01) {
        if (a.shown) {
          a.el.style.visibility = 'hidden'
          a.el.style.opacity = '0'
          a.el.classList.remove('is-live')
          a.shown = false
          a.lastO = -1
        }
        continue
      }
      v.applyMatrix4(camera.projectionMatrix)
      const px = (v.x * 0.5 + 0.5) * w
      const py = (-v.y * 0.5 + 0.5) * h
      if (px < -w * 0.5 || px > w * 1.5 || py < -h * 0.5 || py > h * 1.5) {
        if (a.shown) {
          a.el.style.visibility = 'hidden'
          a.shown = false
          a.lastO = -1
        }
        continue
      }
      const s = a.refDist > 0 ? THREE.MathUtils.clamp(a.refDist / depth, a.minS, a.maxS) : 1
      const t = `translate3d(${px.toFixed(1)}px,${py.toFixed(1)}px,0) scale(${s.toFixed(3)})`
      if (t !== a.lastT) {
        a.el.style.transform = t
        a.lastT = t
      }
      const o = Math.round(alpha * 100) / 100
      if (o !== a.lastO) {
        a.el.style.opacity = String(o)
        a.lastO = o
        a.el.classList.toggle('is-live', o > 0.45)
      }
      if (!a.shown) {
        a.el.style.visibility = 'visible'
        a.shown = true
      }
    }
  }, -1)
  return null
}
