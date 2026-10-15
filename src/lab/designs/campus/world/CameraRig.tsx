import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import gsap from 'gsap'
import type { View } from '../content'
import { campus } from '../store'
import { PLACE, dirToWorld, journalSlotIndex, journalSlots, posterSlots, projectSlotIndex, seatIndex, seats } from './layout'

interface Shot {
  pos: THREE.Vector3
  target: THREE.Vector3
  home?: boolean
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

export function computeShot(v: View, aspect: number, fovDeg: number): Shot {
  const k = aspect < 1 ? 1 + (1 - aspect) * 1.35 : aspect < 1.25 ? 1.15 : 1
  const front = (id: 'studio' | 'library' | 'amphi') => dirToWorld(PLACE[id], 0, 0, 1)
  switch (v.kind) {
    case 'project': {
      const i = v.focus ? projectSlotIndex.get(v.focus) : undefined
      if (i !== undefined) {
        const s = posterSlots[i]
        return { target: s.p.clone(), pos: s.p.clone().addScaledVector(s.n, 0.66 * k).add(V(0, 0.05, 0)) }
      }
      return computeShot({ kind: 'work' }, aspect, fovDeg)
    }
    case 'work': {
      const f = front('studio')
      const target = PLACE.studio.pos.clone().add(V(0, 0.42, 0)).addScaledVector(f, -0.42)
      return { target, pos: target.clone().addScaledVector(f, 4.1 * k).add(V(0, 2.55 * k, 0)) }
    }
    case 'journal': {
      const i = v.focus ? journalSlotIndex.get(v.focus) : undefined
      if (i !== undefined) {
        const s = journalSlots[i]
        return { target: s.p.clone(), pos: s.p.clone().addScaledVector(s.n, 0.62 * k).add(V(0, 0.08, 0)) }
      }
      const f = front('library')
      const target = PLACE.library.pos.clone().add(V(0, 0.55, 0)).addScaledVector(f, -0.4)
      return { target, pos: target.clone().addScaledVector(f, 3.9 * k).add(V(0, 2.5 * k, 0)) }
    }
    case 'team': {
      const i = v.focus ? seatIndex.get(v.focus) : undefined
      if (i !== undefined) {
        const s = seats[i]
        const toStage = PLACE.amphi.pos.clone().sub(s.p).setY(0).normalize()
        return { target: s.p.clone().add(V(0, 0.1, 0)), pos: s.p.clone().addScaledVector(toStage, 1.9 * k).add(V(0, 0.95 * k, 0)) }
      }
      const f = front('amphi')
      const target = PLACE.amphi.pos.clone().add(V(0, 0.2, 0)).addScaledVector(f, -0.7)
      return { target, pos: target.clone().addScaledVector(f, 4.7 * k).add(V(0, 4.3 * k, 0)) }
    }
    case 'contact': {
      const target = V(0, 4.35, -4.5)
      return { target, pos: target.clone().add(V(1.7 * k, 0.1, 5.9 * k)) }
    }
    default: {
      const target = V(0, 1.0, 0.2)
      const dir = V(0.36, 0.44, 0.82).normalize()
      const hf = Math.atan(Math.tan(THREE.MathUtils.degToRad(fovDeg) / 2) * aspect)
      const dist = Math.max(26, (aspect < 1 ? 6.7 : 11.0) / Math.tan(hf))
      return { target, pos: target.clone().addScaledVector(dir, dist), home: true }
    }
  }
}

const norm = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

export function CameraRig({ view, reduced, mobile }: { view: View; reduced: boolean; mobile: boolean }) {
  const { camera, gl, size, scene } = useThree()
  const cam = camera as THREE.PerspectiveCamera
  const controls = useMemo(() => {
    const c = new OrbitControls(camera, gl.domElement)
    c.enableDamping = true
    c.dampingFactor = 0.075
    c.enablePan = false
    c.rotateSpeed = 0.5
    c.zoomSpeed = 0.6
    c.autoRotateSpeed = -0.32
    return c
  }, [camera, gl])
  useEffect(() => () => controls.dispose(), [controls])

  const flying = useRef(false)
  const first = useRef(true)
  const tween = useRef<gsap.core.Tween | null>(null)
  const idleTimer = useRef(0)
  const shift = useRef({ x: 0, y: 0 })
  const homeShot = useRef(false)

  useEffect(() => {
    const onStart = () => {
      controls.autoRotate = false
      window.clearTimeout(idleTimer.current)
    }
    const onEnd = () => {
      window.clearTimeout(idleTimer.current)
      idleTimer.current = window.setTimeout(() => {
        controls.autoRotate = homeShot.current && !reduced
      }, 4000)
    }
    controls.addEventListener('start', onStart)
    controls.addEventListener('end', onEnd)
    return () => {
      controls.removeEventListener('start', onStart)
      controls.removeEventListener('end', onEnd)
      window.clearTimeout(idleTimer.current)
    }
  }, [controls, reduced])

  const aspectKey = mobile ? 'm' : (size.width / size.height).toFixed(1)
  const fov = mobile ? 44 : 34

  useEffect(() => {
    cam.fov = fov
    cam.near = 0.05
    cam.far = 220
    cam.updateProjectionMatrix()
    const shot = computeShot(view, size.width / size.height, fov)
    homeShot.current = !!shot.home
    tween.current?.kill()

    // unlock limits for the flight
    controls.enabled = false
    controls.autoRotate = false
    controls.minDistance = 0
    controls.maxDistance = Infinity
    controls.minPolarAngle = 0
    controls.maxPolarAngle = Math.PI
    controls.minAzimuthAngle = -Infinity
    controls.maxAzimuthAngle = Infinity

    const from = camera.position.clone()
    const fromT = controls.target.clone()
    if (first.current) {
      // arrive from high above, out of the dark
      from.copy(shot.pos).sub(shot.target).multiplyScalar(1.9).add(shot.target).add(V(0, 9, 0))
      fromT.copy(shot.target).add(V(0, -1.5, 0))
    }
    const finish = () => {
      flying.current = false
      camera.position.copy(shot.pos)
      controls.target.copy(shot.target)
      const off = shot.pos.clone().sub(shot.target)
      const dist = off.length()
      const az = Math.atan2(off.x, off.z)
      const polar = Math.acos(THREE.MathUtils.clamp(off.y / dist, -1, 1))
      if (shot.home) {
        controls.minDistance = dist * 0.5
        controls.maxDistance = dist * 1.45
        controls.minPolarAngle = 0.16 * Math.PI
        controls.maxPolarAngle = 0.43 * Math.PI
      } else {
        controls.minDistance = dist * 0.55
        controls.maxDistance = dist * 1.5
        controls.minPolarAngle = Math.max(0.08, polar - 0.4)
        controls.maxPolarAngle = Math.min(0.49 * Math.PI, polar + 0.3)
        controls.minAzimuthAngle = norm(az - 0.6)
        controls.maxAzimuthAngle = norm(az + 0.6)
      }
      controls.autoRotate = !!shot.home && !reduced
      controls.enabled = true
      controls.update()
    }
    if (reduced) {
      first.current = false
      finish()
      return
    }
    const dist = from.distanceTo(shot.pos)
    const mid = from.clone().lerp(shot.pos, 0.5)
    mid.y = Math.max(from.y, shot.pos.y) + Math.min(dist * 0.22, 4)
    const lookMid = fromT.clone().lerp(shot.target, 0.5)
    const proxy = { t: 0 }
    const p = new THREE.Vector3()
    const lt = new THREE.Vector3()
    flying.current = true
    const duration = first.current ? 3.4 : THREE.MathUtils.clamp(1.1 + dist * 0.07, 1.2, 2.4)
    first.current = false
    tween.current = gsap.to(proxy, {
      t: 1,
      duration,
      ease: 'power2.inOut',
      onUpdate: () => {
        const t = proxy.t
        const a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t
        p.set(a * from.x + b * mid.x + c * shot.pos.x, a * from.y + b * mid.y + c * shot.pos.y, a * from.z + b * mid.z + c * shot.pos.z)
        const te = t * t * (3 - 2 * t)
        lt.copy(fromT).lerp(lookMid, Math.min(1, te * 2)).lerp(shot.target, Math.max(0, te * 2 - 1))
        camera.position.copy(p)
        camera.lookAt(lt)
        controls.target.copy(lt)
      },
      onComplete: finish,
    })
    return () => {
      tween.current?.kill()
    }
  }, [view.kind, view.focus, aspectKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_, dt) => {
    if (!flying.current) controls.update(Math.min(dt, 0.05))
    // keep the subject clear of the reading panel
    const st = campus.get()
    const tx = mobile ? 0 : st.panelW / 2
    const ty = mobile ? st.panelH / 2 : 0
    const s = shift.current
    s.x += (tx - s.x) * Math.min(1, dt * 4)
    s.y += (ty - s.y) * Math.min(1, dt * 4)
    if (Math.abs(s.x) < 0.5 && Math.abs(s.y) < 0.5 && tx === 0 && ty === 0) {
      if (cam.view?.enabled) cam.clearViewOffset()
    } else cam.setViewOffset(size.width, size.height, s.x, s.y, size.width, size.height)
    // fog follows the zoom so the far rim softens but the subject never fogs
    const fog = scene.fog as THREE.Fog | null
    if (fog) {
      const d = camera.position.distanceTo(controls.target)
      fog.near = d * 1.05 + 4
      fog.far = d * 3.2 + 24
    }
  })
  return null
}
