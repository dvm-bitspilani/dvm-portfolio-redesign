import { useEffect, useRef, useState, type RefObject } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { GPUComputationRenderer, type Variable } from 'three/examples/jsm/misc/GPUComputationRenderer.js'
import { CAMERA, type Director } from './director'
import { positionShader, renderFragment, renderVertex, velocityShader } from './shaders'

interface Sim {
  gpu: GPUComputationRenderer
  velVar: Variable
  posVar: Variable
  points: THREE.Points
  material: THREE.ShaderMaterial
  geometry: THREE.BufferGeometry
}

const INTERACTIVE = 'a, button, input, textarea, select, label, summary, [role="button"], [data-nohold]'

function Swarm({ director }: { director: Director }) {
  const gl = useThree((s) => s.gl)
  const group = useRef<THREE.Group>(null)
  const sim = useRef<Sim | null>(null)
  const scratch = useRef({
    ray: new THREE.Raycaster(),
    plane: new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
    hit: new THREE.Vector3(),
    cursor: new THREE.Vector3(99, 99, 0),
    prev: new THREE.Vector3(99, 99, 0),
    vel: new THREE.Vector3(),
    raw: new THREE.Vector3(),
    ndc: new THREE.Vector2(),
    on: 0,
    hold: 0,
    parallax: 1,
    alpha: 0,
    first: true,
  })

  useEffect(() => {
    const N = director.lib.N
    const gpu = new GPUComputationRenderer(N, N, gl)
    if (!gl.extensions.has('EXT_color_buffer_float')) gpu.setDataType(THREE.HalfFloatType)
    const pos0 = gpu.createTexture()
    ;(pos0.image.data as Float32Array).set(director.lib.initialPositions())
    const vel0 = gpu.createTexture()
    const velVar = gpu.addVariable('textureVelocity', velocityShader, vel0)
    const posVar = gpu.addVariable('texturePosition', positionShader, pos0)
    gpu.setVariableDependencies(velVar, [velVar, posVar])
    gpu.setVariableDependencies(posVar, [velVar, posVar])
    const blank = new THREE.DataTexture(new Float32Array(4), 1, 1, THREE.RGBAFormat, THREE.FloatType)
    blank.needsUpdate = true
    Object.assign(velVar.material.uniforms, {
      uTime: { value: 0 },
      uDt: { value: 0 },
      uSnap: { value: 0 },
      uSnapTex: { value: blank },
      uTexA: { value: pos0 },
      uTexB: { value: pos0 },
      uXA: { value: new THREE.Vector4(0, 0, 0, 1) },
      uXB: { value: new THREE.Vector4(0, 0, 0, 1) },
      uRA: { value: new THREE.Vector2() },
      uRB: { value: new THREE.Vector2() },
      uMix: { value: 0 },
      uStiff: { value: 0 },
      uDamp: { value: 5.2 },
      uNoise: { value: director.reduced ? 0 : 0.09 },
      uNoiseFreq: { value: 0.9 },
      uKick: { value: 0 },
      uBurst: { value: 0 },
      uBurstOrigin: { value: new THREE.Vector3() },
      uCursor: { value: new THREE.Vector3(99, 99, 0) },
      uCursorVel: { value: new THREE.Vector3() },
      uCursorOn: { value: 0 },
      uCursorRadius: { value: 0.5 },
      uHold: { value: 0 },
      uMaxSpeed: { value: 9 },
    })
    Object.assign(posVar.material.uniforms, {
      uTime: { value: 0 },
      uDt: { value: 0 },
      uSnap: { value: 0 },
      uSnapTex: { value: blank },
    })
    const err = gpu.init()
    if (err) {
      console.warn('[swarm] GPGPU unavailable:', err)
      gpu.dispose()
      blank.dispose()
      return
    }

    const count = N * N
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    const ref = new Float32Array(count * 2)
    for (let i = 0; i < count; i++) {
      ref[i * 2] = ((i % N) + 0.5) / N
      ref[i * 2 + 1] = (Math.floor(i / N) + 0.5) / N
    }
    geometry.setAttribute('aRef', new THREE.BufferAttribute(ref, 2))
    const material = new THREE.ShaderMaterial({
      vertexShader: renderVertex,
      fragmentShader: renderFragment,
      uniforms: {
        uPos: { value: null },
        uVel: { value: null },
        uSize: { value: director.mobile ? 0.011 : 0.0058 },
        uScale: { value: 1000 },
        uFocus: { value: CAMERA.dist },
        uAperture: { value: director.mobile ? 0.012 : 0.024 },
        uAlpha: { value: 0 },
        uHeat: { value: 0.3 },
        uTime: { value: 0 },
        uC0: { value: new THREE.Color('#3a12c2') },
        uC1: { value: new THREE.Color('#8b5cff') },
        uC2: { value: new THREE.Color('#d6c6ff') },
        uC3: { value: new THREE.Color('#ffffff') },
      },
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    })
    const points = new THREE.Points(geometry, material)
    points.frustumCulled = false
    group.current?.add(points)
    sim.current = { gpu, velVar, posVar, points, material, geometry }

    return () => {
      sim.current = null
      points.removeFromParent()
      geometry.dispose()
      material.dispose()
      gpu.dispose()
      blank.dispose()
    }
  }, [director, gl])

  useFrame((state, delta) => {
    const s = sim.current
    if (!s) return
    const k = scratch.current
    const dt = Math.min(delta, 1 / 30)
    director.time += dt
    director.driver?.(dt)

    const vu = s.velVar.material.uniforms
    const pu = s.posVar.material.uniforms
    const ru = s.material.uniforms
    const aspect = state.size.width / state.size.height

    // Formation
    const a = director.a, b = director.b
    if (a && b) {
      a.spin = (a.spin ?? 0) + (a.spinSpeed ?? 0) * dt
      if (b !== a) b.spin = (b.spin ?? 0) + (b.spinSpeed ?? 0) * dt
      director.evaluate(a, aspect, vu.uXA.value, vu.uRA.value)
      director.evaluate(b, aspect, vu.uXB.value, vu.uRB.value)
      vu.uTexA.value = a.target.tex
      vu.uTexB.value = b.target.tex
      vu.uMix.value = director.mix
      vu.uStiff.value = director.reduced ? 70 : 30
      vu.uDamp.value = director.reduced ? 16 : 5.2
    } else {
      vu.uStiff.value = 0
    }
    director.kick = director.kick < 0.002 ? 0 : director.kick * Math.exp(-dt * 1.5)
    vu.uKick.value = director.kick
    vu.uBurst.value = director.burst
    vu.uBurstOrigin.value.copy(director.burstOrigin)
    director.burst = 0
    const snap = director.snap
    vu.uSnap.value = pu.uSnap.value = snap ? 1 : 0
    if (snap) pu.uSnapTex.value = snap
    director.snap = null

    // Cursor → world on the z = 0 plane.
    const p = director.pointer
    k.ndc.set(p.x, p.y)
    k.ray.setFromCamera(k.ndc, state.camera)
    if (k.ray.ray.intersectPlane(k.plane, k.hit)) {
      if (k.first) {
        k.prev.copy(k.hit)
        k.first = false
      }
      k.cursor.copy(k.hit)
      k.raw.subVectors(k.cursor, k.prev).divideScalar(Math.max(dt, 1e-3))
      k.prev.copy(k.cursor)
      k.vel.lerp(k.raw, 0.25)
      if (k.vel.length() > 8) k.vel.setLength(8)
    }
    const wantOn = p.inside && !director.reduced ? 1 : 0
    k.on += (wantOn - k.on) * (1 - Math.exp(-dt * 5))
    k.hold += ((p.down && !director.reduced ? 1 : 0) - k.hold) * (1 - Math.exp(-dt * (p.down ? 3 : 6)))
    vu.uCursor.value.copy(k.cursor)
    vu.uCursorVel.value.copy(k.vel)
    vu.uCursorOn.value = k.on
    vu.uHold.value = k.hold
    vu.uCursorRadius.value = director.mobile ? 0.75 : 0.62

    vu.uTime.value = pu.uTime.value = director.time
    vu.uDt.value = pu.uDt.value = dt

    s.gpu.compute()

    // Camera parallax (home only by default).
    k.parallax += ((director.reduced ? 0 : director.parallax) - k.parallax) * (1 - Math.exp(-dt * 3))
    const cam = state.camera
    const tx = p.x * 0.38 * k.parallax
    const ty = p.y * 0.2 * k.parallax
    cam.position.x += (tx - cam.position.x) * (1 - Math.exp(-dt * 2.5))
    cam.position.y += (ty - cam.position.y) * (1 - Math.exp(-dt * 2.5))
    cam.position.z = CAMERA.dist
    cam.lookAt(0, 0, 0)

    k.alpha += (director.alpha - k.alpha) * (1 - Math.exp(-dt * 3))
    ru.uPos.value = s.gpu.getCurrentRenderTarget(s.posVar).texture
    ru.uVel.value = s.gpu.getCurrentRenderTarget(s.velVar).texture
    ru.uScale.value = (state.size.height * state.viewport.dpr * 0.5) / Math.tan(THREE.MathUtils.degToRad(CAMERA.fov / 2))
    ru.uTime.value = director.time
    ru.uAlpha.value = k.alpha * (director.mobile ? 1.0 : 0.5)
  })

  return <group ref={group} />
}

/** Pointer + hold bookkeeping, and a small cursor ring that swells into a well while held. */
function usePointer(director: Director, ring: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const p = director.pointer
    const root = document.documentElement
    let raf = 0
    let rx = -100, ry = -100, x = -100, y = -100
    const move = (e: PointerEvent) => {
      p.x = (e.clientX / window.innerWidth) * 2 - 1
      p.y = -(e.clientY / window.innerHeight) * 2 + 1
      p.inside = true
      x = e.clientX
      y = e.clientY
    }
    const down = (e: PointerEvent) => {
      if (e.pointerType === 'touch') {
        move(e)
        return
      }
      if (e.button !== 0) return
      const t = e.target as Element | null
      if (t?.closest(INTERACTIVE)) return
      p.down = true
      root.classList.add('sw-holding')
    }
    const mousedown = (e: MouseEvent) => {
      const t = e.target as Element | null
      if (e.button === 0 && !t?.closest(INTERACTIVE)) e.preventDefault()
    }
    const up = (e: PointerEvent) => {
      p.down = false
      root.classList.remove('sw-holding')
      if (e.pointerType === 'touch') p.inside = false
    }
    const leave = () => {
      p.inside = false
      p.down = false
      root.classList.remove('sw-holding')
    }
    const tick = () => {
      rx += (x - rx) * 0.25
      ry += (y - ry) * 0.25
      const el = ring.current
      if (el) el.style.transform = `translate3d(${rx}px, ${ry}px, 0)`
      raf = requestAnimationFrame(tick)
    }
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerdown', down)
    window.addEventListener('mousedown', mousedown)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    window.addEventListener('blur', leave)
    root.addEventListener('mouseleave', leave)
    if (!director.mobile) raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('mousedown', mousedown)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      window.removeEventListener('blur', leave)
      root.removeEventListener('mouseleave', leave)
      root.classList.remove('sw-holding')
    }
  }, [director, ring])
}

export default function SwarmCanvas({ director }: { director: Director }) {
  const [visible, setVisible] = useState(() => !document.hidden)
  const ring = useRef<HTMLDivElement>(null)
  usePointer(director, ring)
  useEffect(() => {
    const sync = () => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', sync)
    return () => document.removeEventListener('visibilitychange', sync)
  }, [])

  return (
    <>
      <div className="sw-canvas" aria-hidden="true">
        <Canvas
          dpr={director.mobile ? [1, 1.5] : [1, 1.75]}
          camera={{ fov: CAMERA.fov, position: [0, 0, CAMERA.dist], near: 0.1, far: 60 }}
          gl={{ antialias: false, alpha: false, powerPreference: 'high-performance', stencil: false }}
          frameloop={visible ? 'always' : 'never'}
          fallback={<div className="sw-nogl" />}
        >
          <color attach="background" args={['#05030b']} />
          <Swarm director={director} />
          <EffectComposer multisampling={0}>
            <Bloom mipmapBlur intensity={director.mobile ? 0.7 : 0.95} luminanceThreshold={0.16} luminanceSmoothing={0.35} radius={0.72} />
          </EffectComposer>
        </Canvas>
      </div>
      {!director.mobile && <div className="sw-ring" ref={ring} aria-hidden="true" />}
    </>
  )
}
