import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { CuboidCollider, Physics, RigidBody, useRapier, type RapierRigidBody } from '@react-three/rapier'
import { getChains } from '../lib/strip'
import { MARK_HEIGHT } from './frame'
import type { BodyMode, PhysicsBridge, Runtime } from './runtime'

/**
 * Optional grab-and-throw for the folded mark (lazy chunk; pulls in rapier).
 * Each ribbon is one rigid body with a box collider. The strip keeps posing the
 * panels; this layer only owns the ribbons' world transforms while they fly.
 */
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)

interface BodyRt {
  body: RapierRigidBody | null
  half: THREE.Vector3
  vel: THREE.Vector3
  last: THREE.Vector3
  offset: THREE.Vector3
  freeT: number
  retT: number
  from: THREE.Vector3
  fromQ: THREE.Quaternion
}

function Bodies({ rt, active }: { rt: React.RefObject<Runtime>; active: boolean }) {
  const { rapier } = useRapier()
  const chains = getChains()
  const bodies = useMemo<BodyRt[]>(
    () =>
      chains.map((c) => {
        const box = new THREE.Box2()
        for (const p of c.panels) for (const v of p.logoQuad) box.expandByPoint(new THREE.Vector2(v.x, v.y))
        const sz = box.getSize(new THREE.Vector2()).multiplyScalar(MARK_HEIGHT / 2)
        return {
          body: null,
          half: new THREE.Vector3(sz.x, sz.y, 0.05),
          vel: new THREE.Vector3(),
          last: new THREE.Vector3(),
          offset: new THREE.Vector3(),
          freeT: 0,
          retT: 0,
          from: new THREE.Vector3(),
          fromQ: new THREE.Quaternion(),
        }
      }),
    [chains],
  )
  const tmp = useMemo(
    () => ({
      plane: new THREE.Plane(new THREE.Vector3(0, 0, 1), -0.45),
      hit: new THREE.Vector3(),
      v: new THREE.Vector3(),
      q: new THREE.Quaternion(),
      q2: new THREE.Quaternion(),
      e: new THREE.Euler(),
    }),
    [],
  )
  const bridge = useMemo<PhysicsBridge>(
    () => ({
      mode: chains.map(() => 'home' as BodyMode),
      pos: chains.map(() => new THREE.Vector3()),
      quat: chains.map(() => new THREE.Quaternion()),
      crumple: chains.map((c) => c.panels.map(() => 0)),
      onDown: () => {},
    }),
    [chains],
  )

  const release = (ci: number) => {
    const b = bodies[ci]
    if (bridge.mode[ci] !== 'held' || !b.body) return
    document.body.style.cursor = ''
    bridge.mode[ci] = 'free'
    b.freeT = 0
    b.body.setBodyType(rapier.RigidBodyType.Dynamic, true)
    const v = b.vel.clampLength(0, 13)
    b.body.setLinvel({ x: v.x, y: v.y, z: v.z * 0.5 }, true)
    b.body.setAngvel({ x: v.y * 1.1 + (Math.random() - 0.5) * 3, y: -v.x * 0.9, z: (Math.random() - 0.5) * 5 - v.x * 0.4 }, true)
    bridge.crumple[ci] = bridge.crumple[ci].map(() => 0.35 + Math.random() * 1.15)
  }
  const goHome = (ci: number) => {
    const b = bodies[ci]
    if (!b.body) return
    bridge.mode[ci] = 'return'
    b.retT = 0
    const tr = b.body.translation()
    const ro = b.body.rotation()
    b.from.set(tr.x, tr.y, tr.z)
    b.fromQ.set(ro.x, ro.y, ro.z, ro.w)
    b.body.setBodyType(rapier.RigidBodyType.KinematicPositionBased, true)
    bridge.crumple[ci].fill(0)
  }

  bridge.onDown = (ci: number, e: ThreeEvent<PointerEvent>) => {
    const r = rt.current
    if (r.reduced || r.coarse || !r.introDone || r.progress > r.phases.unfold[0] + 0.005) return
    if (bridge.mode.some((m) => m === 'held')) return
    const b = bodies[ci]
    if (bridge.mode[ci] !== 'home' || !b.body) return
    e.stopPropagation()
    r.touched = true
    bridge.mode[ci] = 'held'
    const p = b.body.translation()
    b.last.set(p.x, p.y, p.z)
    b.vel.set(0, 0, 0)
    e.ray.intersectPlane(tmp.plane, tmp.hit)
    b.offset.set(p.x - tmp.hit.x, p.y - tmp.hit.y, 0)
    document.body.style.cursor = 'grabbing'
    const up = () => {
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      window.removeEventListener('blur', up)
      release(ci)
    }
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    window.addEventListener('blur', up)
  }

  useEffect(() => {
    const r = rt.current
    r.bridge = bridge
    return () => {
      if (r.bridge === bridge) r.bridge = null
      document.body.style.cursor = ''
    }
  }, [rt, bridge])

  useFrame((state, rawDt) => {
    if (!active) return
    const dt = Math.min(rawDt, 1 / 30)
    const r = rt.current
    const scrolled = r.progress > r.phases.unfold[0] + 0.01
    for (let ci = 0; ci < bodies.length; ci++) {
      const b = bodies[ci]
      const body = b.body
      const home = r.home[ci]
      if (!body || !home) continue
      let mode = bridge.mode[ci]
      if ((mode === 'held' || mode === 'free') && scrolled) {
        if (mode === 'held') document.body.style.cursor = ''
        goHome(ci)
        mode = 'return'
      }
      if (mode === 'home') {
        body.setNextKinematicTranslation(home.pos)
        body.setNextKinematicRotation(home.quat)
      } else if (mode === 'held') {
        state.raycaster.setFromCamera(state.pointer, state.camera)
        if (state.raycaster.ray.intersectPlane(tmp.plane, tmp.hit)) {
          tmp.hit.add(b.offset)
          tmp.hit.x = THREE.MathUtils.clamp(tmp.hit.x, -r.frame.halfW + 0.3, r.frame.halfW - 0.3)
          tmp.hit.y = THREE.MathUtils.clamp(tmp.hit.y, -r.frame.halfH + 0.3, r.frame.halfH + 0.6)
          const cur = body.translation()
          tmp.v.set(cur.x, cur.y, cur.z).lerp(tmp.hit, 1 - Math.exp(-dt * 22))
          const inst = tmp.hit.copy(tmp.v).sub(b.last).divideScalar(Math.max(dt, 1e-3))
          b.vel.lerp(inst, 0.4)
          b.last.copy(tmp.v)
          body.setNextKinematicTranslation(tmp.v)
          tmp.e.set(b.vel.y * 0.035, -b.vel.x * 0.05, -b.vel.x * 0.03)
          tmp.q.setFromEuler(tmp.e)
          const ro = body.rotation()
          tmp.q2.set(ro.x, ro.y, ro.z, ro.w).slerp(tmp.q, 1 - Math.exp(-dt * 10))
          body.setNextKinematicRotation(tmp.q2)
        }
      } else if (mode === 'free') {
        b.freeT += dt
        const lv = body.linvel()
        const speed = Math.hypot(lv.x, lv.y, lv.z)
        if ((b.freeT > 3 && speed < 0.7) || b.freeT > 5) goHome(ci)
      } else if (mode === 'return') {
        b.retT = Math.min(1, b.retT + dt / 1.25)
        const e = easeInOut(b.retT)
        tmp.v.copy(b.from).lerp(home.pos, e)
        tmp.v.y += Math.sin(Math.PI * e) * 0.45
        tmp.v.z += Math.sin(Math.PI * e) * 0.6
        body.setNextKinematicTranslation(tmp.v)
        tmp.q.copy(b.fromQ).slerp(home.quat, e)
        body.setNextKinematicRotation(tmp.q)
        if (b.retT >= 1) bridge.mode[ci] = 'home'
      }
      const tr = body.translation()
      const ro = body.rotation()
      bridge.pos[ci].set(tr.x, tr.y, tr.z)
      bridge.quat[ci].set(ro.x, ro.y, ro.z, ro.w)
    }
  })

  return (
    <>
      {bodies.map((b, ci) => (
        <RigidBody
          key={chains[ci].id}
          ref={(x) => void (b.body = x)}
          type="kinematicPosition"
          colliders={false}
          ccd
          linearDamping={0.25}
          angularDamping={0.45}
        >
          <CuboidCollider args={[b.half.x, b.half.y, b.half.z]} restitution={0.35} friction={0.7} density={0.6} />
        </RigidBody>
      ))}
    </>
  )
}

/** Walls around the view of the folded mark so thrown ribbons stay on screen. */
function Bounds({ rt }: { rt: React.RefObject<Runtime> }) {
  const [box, setBox] = useState({ W: 0, H: 0 })
  const last = useRef('')
  useFrame(() => {
    const { halfW, halfH } = rt.current.frame
    const k = `${halfW.toFixed(2)}-${halfH.toFixed(2)}`
    if (k !== last.current && halfW > 0) {
      last.current = k
      setBox({ W: halfW, H: halfH })
    }
  })
  const { W, H } = box
  if (!W) return null
  return (
    <RigidBody key={last.current} type="fixed" colliders={false}>
      <CuboidCollider args={[W * 3, 0.3, 3]} position={[0, -H - 0.3, 0]} friction={0.9} restitution={0.25} />
      <CuboidCollider args={[0.3, H * 4, 3]} position={[-W - 0.3, 0, 0]} />
      <CuboidCollider args={[0.3, H * 4, 3]} position={[W + 0.3, 0, 0]} />
      <CuboidCollider args={[W * 3, H * 4, 0.2]} position={[0, 0, -0.6 - 0.2]} />
      <CuboidCollider args={[W * 3, H * 4, 0.2]} position={[0, 0, 2.2]} />
      <CuboidCollider args={[W * 3, 0.3, 3]} position={[0, H + 2.4, 0]} />
    </RigidBody>
  )
}

export default function PhysicsLayer({ rt, active }: { rt: React.RefObject<Runtime>; active: boolean }) {
  return (
    <Physics gravity={[0, -14, 0]} timeStep={1 / 60} paused={!active}>
      <Bodies rt={rt} active={active} />
      <Bounds rt={rt} />
    </Physics>
  )
}
