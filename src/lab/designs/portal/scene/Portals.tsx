import * as THREE from 'three'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CHAMBER_Z, PORTALS, PORTAL_W, portalRest, shieldPoints, type PortalDef } from '../layout'
import { api, store, usePortal, type WorldId } from '../store'
import { designBase } from '../../registry'
import { RO, loopSegments, makeLines, maskAMaterial, maskBMaterial } from './stencil'
import { obsidian } from './Gate'
import { Sparks } from './Sparks'
import { Streaks } from './Streaks'
import { StencilGroup } from '../worlds/kit'
import { CodeWorld } from '../worlds/CodeWorld'
import { DesignWorld } from '../worlds/DesignWorld'
import { FilmWorld } from '../worlds/FilmWorld'

const BACKDROP: Record<WorldId, [string, string]> = {
  code: ['#0d4a4a', '#010708'],
  design: ['#3d1236', '#060208'],
  film: ['#4a2a10', '#070302'],
}
const STREAK_COLORS: Record<WorldId, string[]> = {
  code: ['#38e1cf', '#ff4fa3', '#d8fff9'],
  design: ['#ff4fa3', '#c9a2ff', '#ffe6f3'],
  film: ['#ffb35c', '#ff4fa3', '#fff1de'],
}

const lean = new THREE.Vector3()

function Portal({ def, mobile }: { def: PortalDef; mobile: boolean }) {
  const space = usePortal((s) => s.space)
  const wanted = usePortal((s) => s.wanted[def.id])
  const inside = space === def.id
  const outside = space === 'outside'
  const pivot = useRef<THREE.Group>(null)
  const scaler = useRef<THREE.Group>(null)
  const worldRef = useRef<THREE.Group>(null)
  const amt = useRef(0)
  const drive = useMemo(() => ({ value: 0.3 }), [])
  const rest = portalRest(def.id)

  const parts = useMemo(() => {
    const pts = shieldPoints(PORTAL_W)
    const outer = shieldPoints(PORTAL_W + 0.5)
    const shape = new THREE.Shape(pts)
    const openGeo = new THREE.ShapeGeometry(shape)
    const frameShape = new THREE.Shape(outer)
    frameShape.holes.push(new THREE.Path([...pts].reverse()))
    const frameGeo = new THREE.ExtrudeGeometry(frameShape, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 })
    frameGeo.translate(0, 0, -0.32)
    const quad = new THREE.PlaneGeometry(2, 2)
    return {
      pts,
      openGeo,
      frameGeo,
      frameMat: obsidian(),
      maskA: maskAMaterial(def.ref),
      maskB: maskBMaterial(def.ref, BACKDROP[def.id][0], BACKDROP[def.id][1]),
      fullA: maskAMaterial(def.ref, true),
      fullB: maskBMaterial(def.ref, BACKDROP[def.id][0], BACKDROP[def.id][1], true),
      quad,
      lineOuter: makeLines(loopSegments(outer, 0.22), def.tint, 1.6, 2.4),
      lineInner: makeLines(loopSegments(pts, 0.22), '#ff4fa3', 1.2, 2.2),
      tint: new THREE.Color(def.tint),
      mag: new THREE.Color('#ff4fa3'),
    }
  }, [def])

  useEffect(
    () => () => {
      const p = parts
      for (const o of [p.openGeo, p.frameGeo, p.frameMat, p.maskA, p.maskB, p.fullA, p.fullB, p.quad]) o.dispose()
      for (const l of [p.lineOuter, p.lineInner]) {
        l.geometry.dispose()
        l.material.dispose()
      }
    },
    [parts],
  )

  useFrame(({ camera }, dt) => {
    const s = store.get()
    const hovered = s.hoverPortal === def.id && outside && !s.flying
    const selected = s.selected === def.id && camera.position.z < CHAMBER_Z + 18 && outside
    const target = hovered ? 1 : selected ? 0.35 : 0
    amt.current += (target - amt.current) * (1 - Math.exp(-dt * (s.flying ? 14 : 5)))
    const h = amt.current
    if (pivot.current) {
      pivot.current.position.set(def.x, rest.m.elements[13], def.z).add(lean.set(0, 0, 0.9 * h).applyQuaternion(rest.q))
      pivot.current.rotation.y = def.rotY * (1 - 0.55 * h)
    }
    if (scaler.current) scaler.current.scale.set(1 + 0.12 * h, 1 + 0.07 * h, 1)
    const approach = THREE.MathUtils.smoothstep(camera.position.z, CHAMBER_Z + 40, CHAMBER_Z + 10)
    drive.value = 0.2 + approach * 0.35 + h * 0.9 + (inside ? 0 : Math.min(s.flying ? 0.6 : 0, 0.6))
    const dim = s.hoverPortal && s.hoverPortal !== def.id ? 0.55 : 1
    parts.lineOuter.material.color.copy(parts.tint).multiplyScalar((1.6 + h * 2.4) * dim)
    parts.lineInner.material.color.copy(parts.mag).multiplyScalar((1.4 + h * 2.6) * dim)
    // world content: only needed near the chamber or when inside
    if (worldRef.current) worldRef.current.visible = inside || (outside && camera.position.z < CHAMBER_Z + 46)
    if (camera.position.z < CHAMBER_Z + 46 && !s.wanted[def.id]) store.want(def.id)
  })

  const base = designBase('portal')
  return (
    <>
      <group ref={pivot} position={[def.x, rest.m.elements[13], def.z]} rotation-y={def.rotY}>
        <group visible={outside}>
          <group ref={scaler}>
            <mesh
              geometry={parts.openGeo}
              material={parts.maskA}
              renderOrder={RO.maskA}
              onPointerOver={(e) => {
                const s = store.get()
                if (s.space !== 'outside' || s.flying || e.camera.position.z > CHAMBER_Z + 34) return
                e.stopPropagation()
                store.set({ hoverPortal: def.id, selected: def.id })
                document.body.style.cursor = 'pointer'
              }}
              onPointerOut={() => {
                if (store.get().hoverPortal === def.id) store.set({ hoverPortal: null })
                document.body.style.cursor = ''
              }}
              onClick={(e) => {
                const s = store.get()
                if (s.space !== 'outside' || s.flying || e.camera.position.z > CHAMBER_Z + 34) return
                e.stopPropagation()
                api.navigate(`${base}/${def.route}`)
              }}
            />
            <mesh geometry={parts.openGeo} material={parts.maskB} renderOrder={RO.maskB} />
            <mesh geometry={parts.frameGeo} material={parts.frameMat} />
            <primitive object={parts.lineOuter} />
            <primitive object={parts.lineInner} />
            <Sparks outline={parts.pts} z={0.24} count={mobile ? 400 : 900} drive={drive} color={def.tint} size={0.9} />
          </group>
        </group>
        <group ref={worldRef}>
          <StencilGroup stencilRef={def.ref}>
            {def.id === 'code' && <CodeWorld enabled={wanted} mobile={mobile} />}
            {def.id === 'design' && <DesignWorld enabled={wanted} mobile={mobile} />}
            {def.id === 'film' && <FilmWorld enabled={wanted} mobile={mobile} />}
          </StencilGroup>
        </group>
      </group>
      {/* fullscreen masks while the camera is inside this world */}
      <mesh geometry={parts.quad} material={parts.fullA} renderOrder={RO.maskA} frustumCulled={false} visible={inside} />
      <mesh geometry={parts.quad} material={parts.fullB} renderOrder={RO.maskB} frustumCulled={false} visible={inside} />
      {(inside || outside) && (
        <Streaks count={mobile ? 300 : 800} rMin={3} rMax={26} length={120} colors={STREAK_COLORS[def.id]} stencilRef={def.ref} matrix={rest.m} />
      )}
    </>
  )
}

export function Portals({ mobile }: { mobile: boolean }) {
  return (
    <>
      {PORTALS.map((p) => (
        <Portal key={p.id} def={p} mobile={mobile} />
      ))}
    </>
  )
}
