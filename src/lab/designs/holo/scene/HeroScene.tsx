import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { EffectComposer, Bloom, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { createLogoGeometry, sampleLogoPoints } from '../../../shared/logo'
import { CYAN, VIOLET, easeInCubic, easeOutCubic, makeSignal, useDisposable, type Signal } from './common'
import { LabTable, Projector } from './Projector'
import { SignalEffect, type SignalState } from './SignalEffect'
import { cloudFrag, cloudVert, holoFrag, holoVert, lensVert, sheetFrag, voxelFrag, voxelVert } from './shaders'

export type HeroPhase = 'boot' | 'live' | 'loss' | 'static'

/** DOM hooks the scene writes into every frame (labels, leader lines, telemetry). */
export interface HeroOverlayRefs {
  labels: RefObject<(HTMLElement | null)[]>
  lines: RefObject<(SVGPolylineElement | null)[]>
  dots: RefObject<(SVGCircleElement | null)[]>
  telemetry: RefObject<Record<string, HTMLElement | null>>
  reticle: RefObject<HTMLElement | null>
}

/** Anchor points on the mark (logo-local, 1 unit tall) and where their labels float, in viewport fractions. */
export const LABEL_ANCHORS: { id: string; anchor: [number, number]; offset: [number, number] }[] = [
  { id: 'frontend', anchor: [-0.36, 0.37], offset: [-0.12, -0.06] },
  { id: 'design', anchor: [-0.37, 0.06], offset: [-0.15, 0.03] },
  { id: 'backend', anchor: [0.37, 0.46], offset: [0.16, -0.07] },
  { id: 'app', anchor: [0.37, 0.08], offset: [0.18, 0.02] },
  { id: 'video', anchor: [-0.08, -0.47], offset: [0.15, 0.1] },
]

const LOGO_Y = 1.62
const MARK_SCALE = 1.55
const MARK_SCALE_NARROW = 1.3

interface SceneProps {
  reduced: boolean
  narrow: boolean
  overlay: HeroOverlayRefs
  container: RefObject<HTMLElement | null>
  onPhase: (p: HeroPhase) => void
  kick: RefObject<(() => void) | null>
  /** Index of a hovered vertical label; the scanner locks to its anchor. -1 = none. */
  lock: RefObject<number>
}

/* ------------------------------------------------------------------ */

function HoloMark({ signal, narrow, groupRef }: { signal: Signal; narrow: boolean; groupRef: RefObject<THREE.Group | null> }) {
  const geo = useDisposable(() => createLogoGeometry({ depth: 0.16, bevel: 0.012, bevelSegments: 2 }), [])

  const shared = useMemo(
    () => ({
      uTime: { value: 0 },
      uScanY: { value: -10 },
      uBand: { value: 0.11 },
      uScanOn: { value: 0 },
      uGlitch: { value: 0 },
      uPower: { value: 1 },
      uBuild: { value: 1 },
    }),
    [],
  )

  const holoMat = useDisposable(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: holoVert,
        fragmentShader: holoFrag,
        uniforms: {
          ...shared,
          uFlicker: { value: 1 },
          uColor: { value: CYAN.clone() },
          uColorB: { value: VIOLET.clone() },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    [],
  )

  // Chrome that only exists inside the scanner band (dissolve edges).
  const chromeMat = useDisposable(() => {
    const m = new THREE.MeshStandardMaterial({ color: '#e9f3f6', metalness: 1, roughness: 0.16, envMapIntensity: 1.6 })
    m.onBeforeCompile = (s) => {
      s.uniforms.uScanY = shared.uScanY
      s.uniforms.uBand = shared.uBand
      s.uniforms.uScanOn = shared.uScanOn
      s.uniforms.uTime = shared.uTime
      s.uniforms.uPower = shared.uPower
      s.vertexShader = s.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vHoloW;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvHoloW = (modelMatrix * vec4(transformed, 1.0)).xyz;')
      s.fragmentShader = s.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
varying vec3 vHoloW;
uniform float uScanY; uniform float uBand; uniform float uScanOn; uniform float uTime; uniform float uPower;
float hChrome(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }`,
        )
        .replace(
          '#include <clipping_planes_fragment>',
          `#include <clipping_planes_fragment>
{
  float d = abs(vHoloW.y - uScanY);
  float m = 1.0 - smoothstep(uBand * 0.55, uBand, d);
  float n = hChrome(floor(vHoloW.xy * 140.0) + floor(uTime * 20.0));
  if (m * uScanOn * step(0.5, uPower) < n * 0.9 + 0.05) discard;
}`,
        )
    }
    return m
  }, [])

  const cloud = useDisposable(() => {
    const n = narrow ? 2600 : 7000
    const pos = sampleLogoPoints(n, 'surface', 0.16)
    const dir = new Float32Array(n * 3)
    const rnd = new Float32Array(n)
    const v = new THREE.Vector3()
    for (let i = 0; i < n; i++) {
      v.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize()
      dir.set([v.x, v.y, v.z], i * 3)
      rnd[i] = Math.random()
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aDir', new THREE.BufferAttribute(dir, 3))
    g.setAttribute('aRand', new THREE.BufferAttribute(rnd, 1))
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 3)
    return g
  }, [narrow])
  const cloudMat = useDisposable(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: cloudVert,
        fragmentShader: cloudFrag,
        uniforms: {
          uTime: shared.uTime,
          uBuild: shared.uBuild,
          uPower: shared.uPower,
          uScatter: { value: 0 },
          uSize: { value: 7 },
          uPixelRatio: { value: 1 },
          uColor: { value: CYAN.clone() },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [],
  )

  // Voxel dust: a quantised lattice of tiny cubes hugging the mark.
  const voxCount = narrow ? 80 : 150
  const voxGeo = useDisposable(() => {
    const g = new THREE.BoxGeometry(0.016, 0.016, 0.016)
    const seeds = new Float32Array(voxCount)
    for (let i = 0; i < voxCount; i++) seeds[i] = Math.random()
    g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1))
    return g
  }, [voxCount])
  const voxMat = useDisposable(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: voxelVert,
        fragmentShader: voxelFrag,
        uniforms: { uTime: shared.uTime, uGlitch: shared.uGlitch, uPower: shared.uPower, uColor: { value: CYAN.clone() } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [],
  )
  const voxRef = useRef<THREE.InstancedMesh>(null)
  useEffect(() => {
    const mesh = voxRef.current
    if (!mesh) return
    const pts = sampleLogoPoints(voxCount, 'outline', 0.16)
    const m = new THREE.Matrix4()
    const q = 0.045
    for (let i = 0; i < voxCount; i++) {
      const out = 1 + Math.random() * 0.25
      const x = Math.round((pts[i * 3] * out) / q) * q
      const y = Math.round((pts[i * 3 + 1] * out) / q) * q
      const z = Math.round(((Math.random() - 0.5) * 0.5) / q) * q
      m.makeTranslation(x, y, z)
      mesh.setMatrixAt(i, m)
    }
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [voxCount])

  const sheetMat = useDisposable(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: lensVert,
        fragmentShader: sheetFrag,
        uniforms: { uTime: shared.uTime, uOn: shared.uScanOn, uColor: { value: CYAN.clone() } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    [],
  )
  const sheetRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    shared.uTime.value = signal.time
    shared.uScanY.value = signal.scanY
    shared.uBand.value = signal.band
    shared.uScanOn.value = signal.scanOn
    shared.uGlitch.value = signal.glitch
    shared.uPower.value = signal.power
    shared.uBuild.value = signal.build
    cloudMat.uniforms.uScatter.value = signal.scatter + signal.glitch * 0.08
    cloudMat.uniforms.uPixelRatio.value = state.gl.getPixelRatio()
    if (sheetRef.current) sheetRef.current.position.y = signal.scanY
  })

  const s = narrow ? MARK_SCALE_NARROW : MARK_SCALE
  return (
    <>
      <group ref={groupRef} position={[0, LOGO_Y, 0]}>
        <group scale={s}>
          <mesh geometry={geo} material={chromeMat} />
          <mesh geometry={geo} material={holoMat} renderOrder={5} />
          <points geometry={cloud} material={cloudMat} renderOrder={6} />
          <instancedMesh ref={voxRef} args={[voxGeo, voxMat, voxCount]} renderOrder={6} />
        </group>
      </group>
      <mesh ref={sheetRef} rotation-x={-Math.PI / 2} material={sheetMat} renderOrder={7}>
        <planeGeometry args={[2.6, 1.3]} />
      </mesh>
    </>
  )
}

/* ------------------------------------------------------------------ */

function Controller({
  signal,
  fx,
  groupRef,
  reduced,
  narrow,
  overlay,
  container,
  onPhase,
  kick,
  lock,
}: {
  signal: Signal
  fx: SignalState
  groupRef: RefObject<THREE.Group | null>
} & Omit<SceneProps, never>) {
  const { camera, size, invalidate } = useThree()
  const st = useRef({
    phase: 'boot' as HeroPhase,
    phaseT: 0,
    ptr: new THREE.Vector2(0, 0),
    ptrSmooth: new THREE.Vector2(0, 0),
    prev: new THREE.Vector2(0, 0),
    inside: false,
    lastMove: -10,
    speed: 0,
    frame: 0,
    fps: 60,
    carrier: 98,
  })
  const tmp = useMemo(
    () => ({
      ray: new THREE.Raycaster(),
      plane: new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
      hit: new THREE.Vector3(),
      v: new THREE.Vector3(),
      look: new THREE.Vector3(0, 1.32, 0),
    }),
    [],
  )

  // pointer tracking on window (overlays sit above the canvas)
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const el = container.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width
      const y = (e.clientY - r.top) / r.height
      const s = st.current
      s.inside = x >= 0 && x <= 1 && y >= 0 && y <= 1
      s.ptr.set(x * 2 - 1, -(y * 2 - 1))
      s.lastMove = signal.time
      const ret = overlay.reticle.current
      if (ret) {
        ret.style.transform = `translate3d(${e.clientX - r.left}px, ${e.clientY - r.top}px, 0)`
        ret.style.opacity = s.inside ? '1' : '0'
      }
      if (reduced) invalidate()
    }
    const onLeave = () => {
      st.current.inside = false
      if (overlay.reticle.current) overlay.reticle.current.style.opacity = '0'
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerleave', onLeave)
    return () => {
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerleave', onLeave)
    }
  }, [container, overlay, signal, reduced, invalidate])

  // click → signal loss
  useEffect(() => {
    kick.current = () => {
      const s = st.current
      if (reduced || s.phase === 'loss' || s.phase === 'static') return
      s.phase = 'loss'
      s.phaseT = 0
      onPhase('loss')
    }
    return () => {
      kick.current = null
    }
  }, [kick, onPhase, reduced])

  // demand-mode (reduced motion) needs a few frames once the DOM overlay has laid out
  useEffect(() => {
    if (!reduced) return
    let n = 0
    const id = window.setInterval(() => {
      invalidate()
      if (++n > 30) window.clearInterval(id)
    }, 80)
    const onResize = () => invalidate()
    window.addEventListener('resize', onResize)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('resize', onResize)
    }
  }, [reduced, invalidate])

  useEffect(() => {
    if (reduced) {
      st.current.phase = 'live'
      signal.build = 1
      onPhase('live')
    } else onPhase('boot')
  }, [reduced, signal, onPhase])

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20)
    const s = st.current
    if (!reduced) signal.time += dt
    else signal.time = 4.2
    s.frame++
    s.fps = THREE.MathUtils.lerp(s.fps, 1 / Math.max(rawDt, 1e-3), 0.05)

    // smoothed pointer + speed
    const k = 1 - Math.exp(-dt * 7)
    s.ptrSmooth.lerp(s.ptr, k)
    const inst = s.ptr.distanceTo(s.prev) / Math.max(dt, 1e-3)
    s.prev.copy(s.ptr)
    s.speed = THREE.MathUtils.damp(s.speed, inst, 10, dt)

    // phases
    s.phaseT += dt
    let glitchTarget = reduced ? 0 : THREE.MathUtils.clamp((s.speed - 2.2) / 7, 0, 1)
    if (s.phase === 'boot') {
      const t = s.phaseT
      signal.power = 1
      signal.build = easeOutCubic(t / 1.9)
      signal.scatter = (1 - easeOutCubic(t / 1.6)) * 1.2
      fx.loss = Math.max(0, fx.loss - dt * 6)
      fx.static = Math.max(0, 1 - t / 0.35) * (fx.static > 0 ? 1 : 0)
      glitchTarget = Math.max(glitchTarget, (1 - t / 1.2) * 0.5)
      if (t > 2.0) {
        s.phase = 'live'
        s.phaseT = 0
        signal.build = 1
        signal.scatter = 0
        onPhase('live')
      }
    } else if (s.phase === 'loss') {
      const t = s.phaseT / 0.5
      fx.loss = easeInCubic(t)
      signal.scatter = t * 0.6
      glitchTarget = 1
      if (s.phaseT > 0.5) {
        s.phase = 'static'
        s.phaseT = 0
        onPhase('static')
      }
    } else if (s.phase === 'static') {
      fx.loss = 1
      fx.static = 1
      signal.power = 0
      signal.build = 0
      glitchTarget = 0.4
      if (s.phaseT > 0.85) {
        s.phase = 'boot'
        s.phaseT = 0
        signal.power = 1
        onPhase('boot')
      }
    }
    signal.glitch = THREE.MathUtils.damp(signal.glitch, glitchTarget, glitchTarget > signal.glitch ? 18 : 5, dt)
    fx.glitch = signal.glitch * 0.85
    fx.aberration = 0.0035 + signal.glitch * 0.01

    // scanner: follows cursor, otherwise sweeps on its own
    const idle = (!s.inside || signal.time - s.lastMove > 3.5) && lock.current < 0
    let targetY: number
    const li = lock.current
    if (li >= 0 && groupRef.current) {
      const sc = narrow ? MARK_SCALE_NARROW : MARK_SCALE
      const a = LABEL_ANCHORS[li].anchor
      tmp.v.set(a[0] * sc, a[1] * sc, 0).applyMatrix4(groupRef.current.matrixWorld)
      targetY = tmp.v.y
    } else if (!idle) {
      tmp.ray.setFromCamera(s.ptr, camera)
      if (tmp.ray.ray.intersectPlane(tmp.plane, tmp.hit)) targetY = tmp.hit.y
      else targetY = LOGO_Y
    } else {
      targetY = LOGO_Y + Math.sin(signal.time * 0.55) * 0.95
    }
    signal.scanY = THREE.MathUtils.damp(signal.scanY < -5 ? targetY : signal.scanY, targetY, idle ? 3 : 14, dt)
    const scanOnTarget = s.phase === 'live' || s.phase === 'boot' ? (idle ? 0.75 : 1) : 0
    signal.scanOn = THREE.MathUtils.damp(signal.scanOn, scanOnTarget * (s.phase === 'boot' ? signal.build : 1), 6, dt)
    signal.band = THREE.MathUtils.damp(signal.band, 0.1 + (lock.current >= 0 ? 0.05 : 0) + Math.min(s.speed * 0.01, 0.05), 6, dt)

    // the mark turns to face the cursor; camera parallax
    const g = groupRef.current
    if (g) {
      const idleRot = reduced ? 0 : Math.sin(signal.time * 0.35) * 0.18
      const px = s.inside ? s.ptrSmooth.x : 0
      const py = s.inside ? s.ptrSmooth.y : 0
      g.rotation.y = THREE.MathUtils.damp(g.rotation.y, px * 0.6 + idleRot, 4, dt)
      g.rotation.x = THREE.MathUtils.damp(g.rotation.x, -py * 0.14, 4, dt)
      g.position.y = LOGO_Y + (reduced ? 0 : Math.sin(signal.time * 0.9) * 0.025)
      g.updateMatrixWorld()
    }
    const camZ = narrow ? 8.2 : 5.8
    camera.position.x = THREE.MathUtils.damp(camera.position.x, s.ptrSmooth.x * 0.35, 3, dt)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, (narrow ? 1.9 : 1.62) + s.ptrSmooth.y * 0.12, 3, dt)
    tmp.look.y = narrow ? 0.75 : 1.32
    camera.position.z = camZ
    camera.lookAt(tmp.look)

    // labels + leader lines (projected anchors)
    const labels = overlay.labels.current
    const lines = overlay.lines.current
    const dots = overlay.dots.current
    if (g && labels && lines && dots) {
      const scale = narrow ? MARK_SCALE_NARROW : MARK_SCALE
      const w = size.width
      const h = size.height
      for (let i = 0; i < LABEL_ANCHORS.length; i++) {
        const a = LABEL_ANCHORS[i]
        tmp.v.set(a.anchor[0] * scale, a.anchor[1] * scale, 0)
        tmp.v.applyMatrix4(g.matrixWorld).project(camera)
        const ax = (tmp.v.x * 0.5 + 0.5) * w
        const ay = (-tmp.v.y * 0.5 + 0.5) * h
        const lx = ax + a.offset[0] * w
        const ly = ay + a.offset[1] * h
        const el = labels[i]
        if (el) el.style.transform = `translate3d(${lx.toFixed(1)}px, ${ly.toFixed(1)}px, 0)`
        const ln = lines[i]
        if (ln) {
          const ex = ax + a.offset[0] * w * 0.35
          ln.setAttribute('points', `${ax.toFixed(1)},${ay.toFixed(1)} ${ex.toFixed(1)},${ly.toFixed(1)} ${lx.toFixed(1)},${ly.toFixed(1)}`)
        }
        const dt0 = dots[i]
        if (dt0) {
          dt0.setAttribute('cx', ax.toFixed(1))
          dt0.setAttribute('cy', ay.toFixed(1))
        }
      }
    }

    // telemetry readouts, ~8 Hz
    if (s.frame % 8 === 0) {
      const tl = overlay.telemetry.current
      if (tl) {
        s.carrier = THREE.MathUtils.lerp(s.carrier, signal.power * (99.4 - signal.glitch * 40) + Math.random() * 0.4, 0.5)
        if (tl.scan) tl.scan.textContent = (signal.scanY - LOGO_Y).toFixed(3).padStart(6, '+')
        if (tl.carrier) tl.carrier.textContent = `${s.carrier.toFixed(1)}%`
        if (tl.glitch) tl.glitch.textContent = signal.glitch.toFixed(2)
        if (tl.fps) tl.fps.textContent = Math.round(s.fps).toString()
        if (tl.yaw) tl.yaw.textContent = `${THREE.MathUtils.radToDeg(g ? g.rotation.y : 0).toFixed(1)}°`
        if (tl.bar) tl.bar.style.transform = `scaleX(${(s.carrier / 100).toFixed(3)})`
      }
    }
    state.gl.domElement.dataset.phase = s.phase
  })
  return null
}

/* ------------------------------------------------------------------ */

function Scene(props: SceneProps) {
  const signal = useMemo(() => ({ ...makeSignal(), build: props.reduced ? 1 : 0, scatter: props.reduced ? 0 : 1.2 }), [props.reduced])
  const fx = useMemo<SignalState>(() => ({ glitch: 0, loss: 0, static: props.reduced ? 0 : 0.6, aberration: 0.004 }), [props.reduced])
  const effect = useDisposable(() => new SignalEffect(fx), [fx])
  const groupRef = useRef<THREE.Group>(null)

  return (
    <>
      <color attach="background" args={['#020508']} />
      <fog attach="fog" args={['#020508', 7, 17]} />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={3} color="#ffffff" position={[0, 5, -4]} scale={[10, 2, 1]} />
        <Lightformer form="rect" intensity={2.2} color="#5ef2ff" position={[-5, 1, 2]} rotation-y={Math.PI / 2} scale={[6, 1.2, 1]} />
        <Lightformer form="rect" intensity={1.6} color="#7a5cff" position={[5, 2, 1]} rotation-y={-Math.PI / 2} scale={[6, 0.6, 1]} />
        <Lightformer form="ring" intensity={2} color="#bff9ff" position={[0, -2, 3]} scale={3} />
        <Lightformer form="rect" intensity={4} color="#ffffff" position={[0, 2.5, 7]} scale={[12, 0.5, 1]} />
        <Lightformer form="rect" intensity={2.5} color="#dffcff" position={[0, 0.6, 7]} scale={[12, 0.25, 1]} />
        <Lightformer form="rect" intensity={1.8} color="#5ef2ff" position={[-3, 1.2, 6]} scale={[2, 6, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#8a6cff" position={[3, 1.2, 6]} scale={[1.5, 6, 1]} />
      </Environment>
      <pointLight position={[0, 0.4, 0.6]} intensity={3} color="#5ef2ff" distance={4} />
      <LabTable signal={signal} reflective={!props.narrow} resolution={props.narrow ? 256 : 512} />
      <Projector signal={signal} dust={props.narrow ? 400 : 1100} height={2.75} spread={1.25} />
      <HoloMark signal={signal} narrow={props.narrow} groupRef={groupRef} />
      <Controller signal={signal} fx={fx} groupRef={groupRef} {...props} />
      <EffectComposer multisampling={0} enableNormalPass={false} mergeMode="none">
        <Bloom mipmapBlur intensity={1.15} luminanceThreshold={0.32} luminanceSmoothing={0.25} radius={0.72} />
        <primitive object={effect} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </>
  )
}

export default function HeroCanvas(props: SceneProps & { active: boolean }) {
  const { active, ...rest } = props
  return (
    <Canvas
      className="holo-canvas"
      aria-hidden="true"
      dpr={[1, props.narrow ? 1.5 : 2]}
      frameloop={!active ? 'never' : props.reduced ? 'demand' : 'always'}
      camera={{ position: [0, 1.62, props.narrow ? 8.2 : 5.8], fov: 34, near: 0.1, far: 60 }}
      gl={{ antialias: false, powerPreference: 'high-performance', alpha: false, stencil: false }}
    >
      <Scene {...rest} />
    </Canvas>
  )
}
