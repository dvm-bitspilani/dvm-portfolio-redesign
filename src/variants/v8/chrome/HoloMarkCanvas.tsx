// The one live hologram mark of V8 (one WebGL context for the whole variant).
// Adapted from the lab's HoloMark (src/lab/designs/holo/scene/HeroScene.tsx): the extruded DVM
// mark with the additive hologram shader, its point cloud and the voxel dust, plus bloom and the
// signal (tear / static / collapse) pass. It renders into a square box whose side is MARK_K ×
// the mark height (chrome/markControl.js poses that box), on demand at `rt.fps`.
// The canvas is opaque black and composited with `mix-blend-mode: screen`, so only light lands
// on the page and bloom works like it does in the lab.
// Hover: the interference wake. The hero stage keeps `rt.pointer` current (mapped onto the mark's
// face); the frame loop below turns it into `signal.probe*` and the uProbe* uniforms: a soft,
// axis-free disc of travelling rings around the pointer (chrome/holo/shaders.ts). Only while the
// hero drives the mark and is live, never in reduced motion, gone with the flight's lift; a touch
// tap plays it once.
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { useEffect, useMemo, useRef } from 'react'
import { clamp, dampUpDown, sineOut, sub } from '../lib/math'
import { createLogoGeometry, sampleLogoPoints } from '../../../immersive/shared/logo'
import { CYAN, PALE, useDisposable, type Signal } from './holo/common'
import { SignalEffect } from './holo/SignalEffect'
import { cloudFrag, cloudVert, holoFrag, holoVert, voxelFrag, voxelVert } from './holo/shaders'
import { CAM_Z, FOV, type MarkRuntime } from './holo/runtime'
import { useContextLoss } from './holo/glHealth'

/** Resting chroma split of the mark (output px at the box edge; ≤ 1 px wherever the masked box
 *  shows, chrome/mark.module.css). The glitch adds its own split on top. */
const MARK_REST_ABERRATION_PX = 1.25

/** The interference wake (mark units: the mark is 1 tall, ~0.77 wide). */
const WAKE = {
  /** Disc radius at rest, and how much fast moves widen it (per NDC/s of pointer speed, capped). */
  r: 0.26,
  rPerSpeed: 0.02,
  rMax: 0.12,
  /** Fades out between these distances of the pointer from the mark's centre. */
  near: 0.62,
  far: 0.85,
  /** Where the disc's centre may go. */
  maxX: 0.6,
  maxY: 0.55,
  /** Presence rates (per s): in, out, and the gate (driven / live / reduced) closing. */
  onUp: 7,
  onDown: 4,
  gateUp: 6,
  gateDown: 8,
  /** Position follow: attached while hovering, lazy otherwise. */
  follow: 16,
  followIdle: 3,
  /** Kick (the wake): pointer speed (NDC/s) from which it starts / at which it is full, and its
   *  rise / decay rates. */
  kickFrom: 0.4,
  kickFull: 6,
  kickUp: 8,
  kickDown: 2.2,
  /** No move for this long (s): the disc dissolves. */
  idleS: 3.5,
  /** Touch tap: the one-shot wake's rise and total length (s), and its kick. */
  tapRiseS: 0.1,
  tapS: 1.2,
  tapKick: 0.8,
}

/* ------------------------------------------------------------------ */

function HoloMark({ rt }: { rt: MarkRuntime }) {
  const signal = rt.signal
  const groupRef = useRef<THREE.Group>(null)
  const geo = useDisposable(() => createLogoGeometry({ depth: 0.16, bevel: 0.012, bevelSegments: 2 }), [])

  const shared = useMemo(
    () => ({
      uTime: { value: 0 },
      uGlitch: { value: 0 },
      uPower: { value: 1 },
      uBuild: { value: 1 },
      uProbe: { value: new THREE.Vector3() },
      uProbeOn: { value: 0 },
      uProbeR: { value: WAKE.r },
      uProbeKick: { value: 0 },
    }),
    [],
  )
  /** The wake's own state: hover presence, the gate, the tap clock and the last tap seen. */
  const wake = useRef({ on: 0, gate: 0, tapT: WAKE.tapS, taps: rt.pointer.taps })

  const holoMat = useDisposable(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: holoVert,
        fragmentShader: holoFrag,
        uniforms: {
          ...shared,
          uFlicker: { value: 1 },
          uColor: { value: CYAN.clone() },
          uColorB: { value: PALE.clone() },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    [],
  )

  const cloud = useDisposable(() => {
    const n = rt.narrow ? 2600 : 6000
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
  }, [rt.narrow])
  const cloudMat = useDisposable(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: cloudVert,
        fragmentShader: cloudFrag,
        uniforms: {
          uTime: shared.uTime,
          uBuild: shared.uBuild,
          uPower: shared.uPower,
          uProbe: shared.uProbe,
          uProbeOn: shared.uProbeOn,
          uProbeR: shared.uProbeR,
          uProbeKick: shared.uProbeKick,
          uScatter: { value: 0 },
          uSize: { value: 4.5 },
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
  const voxCount = rt.narrow ? 70 : 130
  const voxGeo = useDisposable(() => {
    const g = new THREE.BoxGeometry(0.011, 0.011, 0.011)
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
        uniforms: {
          uTime: shared.uTime,
          uGlitch: shared.uGlitch,
          uPower: shared.uPower,
          uProbe: shared.uProbe,
          uProbeOn: shared.uProbeOn,
          uColor: { value: CYAN.clone() },
        },
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
    const q = 0.03
    for (let i = 0; i < voxCount; i++) {
      const out = 1 + Math.random() * 0.25
      const x = Math.round((pts[i * 3] * out) / q) * q
      const y = Math.round((pts[i * 3 + 1] * out) / q) * q
      const z = Math.round(((Math.random() - 0.5) * 0.32) / q) * q
      m.makeTranslation(x, y, z)
      mesh.setMatrixAt(i, m)
    }
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [voxCount])

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20)
    const s: Signal = signal
    if (!rt.reduced) s.time += dt
    // Nobody is driving the signal (flight, menu): settle it.
    if (!rt.driven) {
      s.glitch = THREE.MathUtils.damp(s.glitch, 0, 5, dt)
      if (!rt.morph) {
        s.scatter = THREE.MathUtils.damp(s.scatter, 0, 4, dt)
        s.build = Math.min(1, s.build + dt * 0.9)
      }
      s.power = THREE.MathUtils.damp(s.power, 1, 6, dt)
      rt.fx.glitch = s.glitch * 0.85
      rt.fx.loss = Math.max(0, rt.fx.loss - dt * 4)
      rt.fx.static = Math.max(0, rt.fx.static - dt * 4)
      rt.fx.aberration = s.glitch * 0.01
    }
    // HOVER HOOK: the interference wake, from `rt.pointer` (written by the hero stage while it
    // drives the mark). Gated to the live hero stage: never under a preloader or during the boot,
    // in the menu, in flight or docked (all !driven), nor in reduced motion; × (1 - lift) on top.
    {
      const p = rt.pointer
      const w = wake.current
      const can = rt.driven && p.live && !rt.reduced
      w.gate = dampUpDown(w.gate, can ? 1 : 0, WAKE.gateUp, WAKE.gateDown, dt)
      const tx = clamp(p.mx, -WAKE.maxX, WAKE.maxX)
      const ty = clamp(p.my, -WAKE.maxY, WAKE.maxY)
      // a touch tap: one-shot, at the tap
      if (p.taps !== w.taps) {
        w.taps = p.taps
        if (can) {
          w.tapT = 0
          s.probe.set(tx, ty, 0)
          s.probeKick = Math.max(s.probeKick, WAKE.tapKick)
        }
      }
      w.tapT = Math.min(WAKE.tapS, w.tapT + dt)
      const tap =
        w.tapT < WAKE.tapRiseS ? sineOut(w.tapT / WAKE.tapRiseS) : (1 - sub(w.tapT, WAKE.tapRiseS, WAKE.tapS)) ** 2
      // hover: over the hero, near the mark, and moved in the last few seconds
      const hovering = can && p.inside && p.hover && p.idle < WAKE.idleS
      const near = 1 - sub(Math.hypot(p.mx, p.my), WAKE.near, WAKE.far)
      const target = hovering ? near : 0
      w.on = dampUpDown(w.on, target, WAKE.onUp, WAKE.onDown, dt)
      // appear where the pointer is (no glide in from the last spot), then follow it
      if (s.probeOn < 0.02 && target > 0) s.probe.set(tx, ty, 0)
      else {
        const k = 1 - Math.exp(-(hovering ? WAKE.follow : WAKE.followIdle) * dt)
        s.probe.x += (tx - s.probe.x) * k
        s.probe.y += (ty - s.probe.y) * k
      }
      const speed = hovering ? p.speed : 0
      const rT = WAKE.r + Math.min(speed * WAKE.rPerSpeed, WAKE.rMax)
      s.probeR = THREE.MathUtils.damp(s.probeR, rT, 5, dt)
      const kickT = sub(speed, WAKE.kickFrom, WAKE.kickFull)
      s.probeKick = dampUpDown(s.probeKick, kickT, WAKE.kickUp, WAKE.kickDown, dt)
      const on = Math.max(w.on, tap) * w.gate * (1 - clamp(s.lift, 0, 1))
      // (exactly 0 once it has faded: the idle hologram is untouched)
      s.probeOn = on < 1e-3 ? 0 : on
      shared.uProbe.value.copy(s.probe)
      shared.uProbeOn.value = s.probeOn
      shared.uProbeR.value = s.probeR
      shared.uProbeKick.value = s.probeKick
    }
    shared.uTime.value = s.time
    shared.uGlitch.value = s.glitch
    shared.uPower.value = s.power
    shared.uBuild.value = s.build
    cloudMat.uniforms.uScatter.value = s.scatter + s.glitch * 0.06
    // point sprites are sized in buffer px: scale them to the box's on-screen size
    cloudMat.uniforms.uPixelRatio.value = state.gl.getPixelRatio() * rt.displayScale
    const g = groupRef.current
    if (g) {
      g.rotation.y = rt.yaw + rt.yawAdd
      g.rotation.x = rt.pitch + rt.pitchAdd
      g.position.y = rt.reduced || rt.driven ? 0 : Math.sin(s.time * 0.9) * 0.012
    }
  })

  return (
    <>
      <group ref={groupRef}>
        <mesh geometry={geo} material={holoMat} renderOrder={5} />
        <points geometry={cloud} material={cloudMat} renderOrder={6} />
        <instancedMesh ref={voxRef} args={[voxGeo, voxMat, voxCount]} renderOrder={6} />
      </group>
    </>
  )
}

/** Renders frames at `rt.fps` (demand mode) and exposes `invalidate` / `wake` to the controller.
 *  The ticker sleeps (no requestAnimationFrame at all) while the box is hidden, the rate is 0 or
 *  the tab is hidden; the controller wakes it when that changes. */
function Ticker({ rt }: { rt: MarkRuntime }) {
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => {
    let raf = 0
    let last = 0
    const asleep = () => document.hidden || rt.hidden || rt.fps <= 0
    const loop = (now: number) => {
      if (asleep()) {
        raf = 0
        return
      }
      raf = requestAnimationFrame(loop)
      const fps = rt.reduced ? Math.min(rt.fps, 4) : rt.fps
      if (now - last < 1000 / fps) return
      last = now
      invalidate()
    }
    const wake = () => {
      if (!raf && !asleep()) raf = requestAnimationFrame(loop)
    }
    rt.invalidate = () => invalidate()
    rt.wake = wake
    document.addEventListener('visibilitychange', wake)
    wake()
    return () => {
      cancelAnimationFrame(raf)
      raf = 0
      document.removeEventListener('visibilitychange', wake)
      rt.invalidate = () => {}
      rt.wake = () => {}
    }
  }, [rt, invalidate])
  return null
}

function Scene({ rt }: { rt: MarkRuntime }) {
  const effect = useDisposable(() => new SignalEffect(rt.fx, { restPx: MARK_REST_ABERRATION_PX }), [rt])
  return (
    <>
      <color attach="background" args={['#000000']} />
      <HoloMark rt={rt} />
      <Ticker rt={rt} />
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <Bloom mipmapBlur intensity={1.05} luminanceThreshold={0.3} luminanceSmoothing={0.25} radius={0.7} />
        <primitive object={effect} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </>
  )
}

/** The live mark's canvas. `onLost` fires when the WebGL context is lost (and is not restored);
 *  an error while creating it is caught by the boundary around it (chrome/mark.jsx). */
export default function HoloMarkCanvas({ rt, onLost }: { rt: MarkRuntime; onLost?: () => void }) {
  const onCreated = useContextLoss(onLost)
  return (
    <Canvas
      aria-hidden="true"
      dpr={[1, rt.narrow ? 1.25 : 1.5]}
      frameloop="demand"
      // measure the wrapper's layout size, not its CSS-scaled box: the drawing buffer is the
      // quantised resolution (chrome/markControl.js render()), never a per-frame size
      resize={{ offsetSize: true }}
      camera={{ position: [0, 0, CAM_Z], fov: FOV, near: 0.1, far: 30 }}
      gl={{ antialias: false, powerPreference: 'high-performance', alpha: false, stencil: false }}
      style={{ position: 'absolute', inset: 0 }}
      onCreated={onCreated}
    >
      <Scene rt={rt} />
    </Canvas>
  )
}
