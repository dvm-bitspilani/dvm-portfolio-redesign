import * as THREE from 'three'
import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { RO, loopSegments, makeLines, stencilTest } from '../scene/stencil'
import { useTex } from '../scene/textures'
import type { Placed } from '../layout'
import { api, store, type WorldId } from '../store'

/** Applies the world's stencil test + render order to everything inside it. */
export function StencilGroup({ stencilRef, children }: { stencilRef: number; children: ReactNode }) {
  const g = useRef<THREE.Group>(null)
  const tick = useRef(0)
  useFrame(() => {
    if (!g.current || tick.current++ % 20 !== 0) return
    g.current.traverse((o) => {
      if (o.renderOrder < RO.world) o.renderOrder = RO.world
      const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined
      if (!m) return
      for (const mm of Array.isArray(m) ? m : [m]) {
        if (mm.stencilFunc !== THREE.EqualStencilFunc || mm.stencilRef !== stencilRef) stencilTest(mm, stencilRef)
      }
    })
  })
  return <group ref={g}>{children}</group>
}

export const canInteract = (world: WorldId) => {
  const s = store.get()
  return s.space === world && !s.flying
}

let shared: { box: THREE.BoxGeometry; plane: THREE.PlaneGeometry; plates: Map<WorldId, THREE.MeshPhysicalMaterial> } | null = null
/** Shared geometry + one plate material per world (stencil state lives on the material). */
export function kit() {
  if (!shared)
    shared = { box: new THREE.BoxGeometry(1, 1, 1), plane: new THREE.PlaneGeometry(1, 1), plates: new Map() }
  return shared
}
export function plateFor(world: WorldId) {
  const k = kit()
  let m = k.plates.get(world)
  if (!m) {
    m = new THREE.MeshPhysicalMaterial({ color: '#090d10', roughness: 0.3, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.1 })
    k.plates.set(world, m)
  }
  return m
}
export function disposeKit() {
  if (!shared) return
  shared.box.dispose()
  shared.plane.dispose()
  shared.plates.forEach((m) => m.dispose())
  shared = null
}

export interface PanelProps {
  world: WorldId
  placed: Placed<{ slug: string }>
  url?: string
  enabled: boolean
  tint: string
  /** 'cover' crops the image into w x h; 'fit' resizes the panel to the image aspect (keeps h). */
  fit?: 'cover' | 'fit'
  href: string
  external?: boolean
  maxW?: number
  plate?: boolean
  children?: ReactNode
}

/** A textured panel in a world: hover lifts it toward you, click navigates/flies to it. */
export function Panel({ world, placed, url, enabled, tint, fit = 'cover', href, external, maxW = 3.4, plate = true, children }: PanelProps) {
  const { tex, aspect } = useTex(url, enabled)
  const inner = useRef<THREE.Group>(null)
  const amt = useRef(0)
  const slug = placed.item.slug

  let w = placed.w
  const h = placed.h
  if (fit === 'fit' && aspect > 0) w = THREE.MathUtils.clamp(h * aspect, h * 0.6, maxW)

  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: new THREE.Color(tint).multiplyScalar(0.12), toneMapped: false }),
    [tint],
  )
  useEffect(() => {
    if (!tex) return
    if (fit === 'cover' && aspect > 0) {
      const target = w / h
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping
      if (aspect > target) {
        tex.repeat.set(target / aspect, 1)
        tex.offset.set((1 - target / aspect) / 2, 0)
      } else {
        tex.repeat.set(1, aspect / target)
        tex.offset.set(0, (1 - aspect / target) / 2)
      }
    }
    mat.map = tex
    mat.color.setScalar(0.86)
    mat.needsUpdate = true
  }, [tex, aspect, fit, w, h, mat])

  const lines = useMemo(() => {
    const hw = w / 2 + 0.06
    const hh = h / 2 + 0.06
    return makeLines(
      loopSegments([new THREE.Vector2(-hw, -hh), new THREE.Vector2(hw, -hh), new THREE.Vector2(hw, hh), new THREE.Vector2(-hw, hh)], 0.07),
      tint,
      1.3,
      1,
    )
  }, [w, h, tint])
  const baseCol = useMemo(() => new THREE.Color(tint), [tint])

  useEffect(() => () => mat.dispose(), [mat])
  useEffect(
    () => () => {
      lines.geometry.dispose()
      lines.material.dispose()
    },
    [lines],
  )

  useFrame((_, dt) => {
    const s = store.get()
    const focused = s.target.kind === 'world' && s.target.focus === slug
    const on = s.hoverItem === slug || focused ? 1 : 0
    amt.current += (on - amt.current) * (1 - Math.exp(-dt * 8))
    if (inner.current) {
      inner.current.position.z = amt.current * 0.35
      inner.current.scale.setScalar(1 + amt.current * 0.04)
    }
    lines.material.color.copy(baseCol).multiplyScalar(0.9 + amt.current * 2.6)
  })

  const over = (e: ThreeEvent<PointerEvent>) => {
    if (!canInteract(world)) return
    e.stopPropagation()
    store.set({ hoverItem: slug })
    document.body.style.cursor = 'pointer'
  }
  const out = () => {
    if (store.get().hoverItem === slug) store.set({ hoverItem: null })
    document.body.style.cursor = ''
  }
  const click = (e: ThreeEvent<MouseEvent>) => {
    if (!canInteract(world)) return
    e.stopPropagation()
    if (external) window.open(href, '_blank', 'noopener')
    else api.navigate(href)
  }

  const k = kit()
  return (
    <group position={placed.pos} quaternion={placed.quat}>
      <group ref={inner}>
        {plate && <mesh geometry={k.box} material={plateFor(world)} scale={[w + 0.2, h + 0.2, 0.08]} position-z={-0.03} />}
        <mesh geometry={k.plane} material={mat} scale={[w, h, 1]} position-z={0.03} onPointerOver={over} onPointerOut={out} onClick={click} />
        <primitive object={lines} />
        {children}
      </group>
    </group>
  )
}
