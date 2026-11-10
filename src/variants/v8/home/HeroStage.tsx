// The hero's projector stage: lab table, emitter, light cone and dust, with bloom and the
// signal pass. Adapted from the lab's HeroScene.tsx (src/lab/designs/holo/scene).
// The projector (chrome/holo/Projector.tsx) is the pedestal's body under the original
// projector's light: the original's lights (ambient 0.25, lens key 3, beam 1.6), always lit (no
// power-up), dimming only as the mark leaves the beam; camera and layout in ./stageLayout.ts.
// The hologram itself is NOT in this canvas: it is the variant's one persistent mark
// (chrome/mark.jsx), posed over the beam by home/Hero.jsx. This canvas drives the shared signal
// while the hero owns the mark (`rt.driven`): the boot and live phases and the turn of the mark
// toward the cursor. User input never tears or glitches the hologram (no click-to-cut, no speed
// shimmer). The pointer is kept in `rt.pointer`, mapped onto the mark's face, and the mark
// canvas turns it into the interference wake (chrome/HoloMarkCanvas.tsx); a touch tap there is
// a one-shot wake.
// The camera is fixed (no parallax) so the DOM mark and the beam stay aligned.
// The pose is frozen at the hero's resting yaw / pitch until the stage is live (no idle turn, no
// cursor turn), so the preloader's printed mark and the hologram coincide. The mark is held dark
// and scattered until the preloader lets go (`revealed`), then builds out of the scatter.
//
// Robustness: the optional parts degrade on their own instead of taking the whole stage down
// (an error there would trip the hero's GLBoundary): the reflective floor falls back to the
// matte one, the MSAA composer to a plain one and then to no post-processing at all, and a
// failed studio-env bake leaves satin hardware (chrome/holo/stageKit.ts). The frame loop is
// kicked whenever the stage becomes active again (R3F does not draw on a frameloop change).
// `?debug=stage` (lib/stageDebug.ts): frames drawn and canvas size go to the readout.
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { Component, useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { useDisposable } from '../chrome/holo/common'
import { useContextLoss } from '../chrome/holo/glHealth'
import { SignalEffect } from '../chrome/holo/SignalEffect'
import { LabTable, Projector } from '../chrome/holo/Projector'
import type { MarkRuntime } from '../chrome/holo/runtime'
import { easeOutCubic } from '../lib/math'
import { stageDebug, stageDebugOn, stageDegraded } from '../lib/stageDebug'
import { FOV, STAGE_LAYOUT, stageMark, type StageMark } from './stageLayout'

export type HeroPhase = 'wait' | 'boot' | 'live'

/** The mark's front face, mark-local z (createLogoGeometry: depth 0.16 centred, bevel 0.012). */
const FACE_Z = 0.092
/** A touch counts as a tap (the one-shot wake) if it lifts within this long, this close. */
const TAP_MS = 350
const TAP_PX = 12
/** Live: how fast a mark that went live while not driven finishes building (per s). */
const LIVE_BUILD_RATE = 1.5
/** MSAA samples for the stage on desktop (clean silhouettes on the puck); phones skip it. */
const STAGE_MSAA = 4

export interface HeroStageProps {
  rt: MarkRuntime
  reduced: boolean
  narrow: boolean
  /** Renders only while true (near the viewport, tab visible). */
  active: boolean
  /** The preloader has started to dissolve: boot the hologram. */
  revealed: boolean
  container: RefObject<HTMLElement | null>
  onPhase: (p: HeroPhase) => void
  /** The WebGL context was lost (home/Hero.jsx shows the CSS stage instead). */
  onLost?: () => void
}

function Controller({ rt, reduced, narrow, active, container, onPhase, revealed }: HeroStageProps) {
  const { camera, invalidate } = useThree()
  const st = useRef({
    phase: 'wait' as HeroPhase,
    phaseT: 0,
    ptr: new THREE.Vector2(0, 0),
    ptrSmooth: new THREE.Vector2(0, 0),
    prev: new THREE.Vector2(0, 0),
    inside: false,
    speed: 0,
    /** The pointer on the mark's plane, in mark heights from the mark's centre (y up), before
     *  the turn is undone; the box layout it was measured with; the last pointer kind. */
    face: new THREE.Vector2(0, 0),
    box: null as (StageMark & { W: number; H: number }) | null,
    hover: false,
    lastMove: -1e9,
    /** Touch taps: where / when the finger went down, and how many taps so far. */
    downX: 0,
    downY: 0,
    downAt: -1e9,
    // (from the runtime's count, so a remounted stage never replays a tap)
    taps: rt.pointer.taps,
  })
  const revealedRef = useRef(revealed)
  revealedRef.current = revealed

  // the camera looks at the stage's focus point (fixed, so the DOM mark can be laid out from it)
  useEffect(() => {
    const c = narrow ? STAGE_LAYOUT.camera.narrow : STAGE_LAYOUT.camera.desktop
    camera.position.set(c.pos[0], c.pos[1], c.pos[2])
    camera.lookAt(c.look[0], c.look[1], c.look[2])
    camera.updateMatrixWorld()
    invalidate()
  }, [camera, narrow, invalidate])

  // pointer tracking on window (overlays sit above the canvas)
  useEffect(() => {
    // (a new breakpoint poses the mark differently: measure the box again)
    st.current.box = null
    /** The pointer on the mark's plane (the mark's box is laid out from the stage camera, the
     *  same way home/Hero.jsx poses it); false when the hero is not measurable. */
    const toFace = (cx: number, cy: number) => {
      const el = container.current
      if (!el) return false
      const r = el.getBoundingClientRect()
      const s = st.current
      if (!s.box || s.box.W !== r.width || s.box.H !== r.height) {
        s.box = { ...stageMark(r.width, r.height, narrow), W: r.width, H: r.height }
      }
      const b = s.box
      s.face.set((cx - r.left - b.x) / b.h, -(cy - r.top - b.y) / b.h)
      return true
    }
    const onMove = (e: PointerEvent) => {
      const el = container.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width
      const y = (e.clientY - r.top) / r.height
      const s = st.current
      const was = s.inside
      s.inside = x >= 0 && x <= 1 && y >= 0 && y <= 1
      s.ptr.set(x * 2 - 1, -(y * 2 - 1))
      // the wake follows hovering pointers only (a finger gets the tap instead)
      s.hover = e.pointerType !== 'touch'
      if (s.hover && s.inside) {
        s.lastMove = performance.now()
        toFace(e.clientX, e.clientY)
      }
      // demand mode: a frame only for pointer moves over the hero (and the one that leaves it)
      if (reduced && (s.inside || was)) invalidate()
    }
    const onLeave = () => {
      st.current.inside = false
    }
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return
      const s = st.current
      s.downX = e.clientX
      s.downY = e.clientY
      s.downAt = performance.now()
    }
    // a tap (not the start of a scroll: those end in pointercancel) on the hero
    const onUp = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return
      const s = st.current
      const quick = performance.now() - s.downAt < TAP_MS
      s.downAt = -1e9
      if (!quick || Math.hypot(e.clientX - s.downX, e.clientY - s.downY) > TAP_PX) return
      const el = container.current
      if (!el) return
      const r = el.getBoundingClientRect()
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return
      if (toFace(e.clientX, e.clientY)) s.taps++
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onDown, { passive: true })
    window.addEventListener('pointerup', onUp, { passive: true })
    document.addEventListener('pointerleave', onLeave)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointerleave', onLeave)
    }
  }, [container, rt, reduced, narrow, invalidate])

  // demand-mode (reduced motion) needs a few frames once the DOM has laid out (and again each
  // time the stage becomes active: invalidate() does nothing while the frameloop is "never")
  useEffect(() => {
    if (!reduced || !active) return
    let n = 0
    const id = window.setInterval(() => {
      invalidate()
      if (++n > 12) window.clearInterval(id)
    }, 120)
    const onResize = () => invalidate()
    window.addEventListener('resize', onResize)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('resize', onResize)
    }
  }, [reduced, active, invalidate])

  // the mark is held dark until the preloader lets go, then boots
  useEffect(() => {
    const sig = rt.signal
    if (reduced) {
      st.current.phase = 'live'
      sig.build = 1
      sig.scatter = 0
      onPhase('live')
      return
    }
    // a fresh canvas after a failure (home/Hero.jsx's GLBoundary): the mark already stands
    // built in the beam (home/Hero.jsx resets it on arrival), so no second boot
    if (revealedRef.current && sig.build > 0.98 && sig.scatter < 0.05) {
      st.current.phase = 'live'
      onPhase('live')
      return
    }
    sig.build = 0
    sig.scatter = 1.2
    onPhase('wait')
  }, [reduced, rt, onPhase])

  // leaving the stage (scrolled away, route change): put the rotation back, let go of the wake
  useEffect(
    () => () => {
      rt.yawAdd = 0
      rt.pitchAdd = 0
      rt.pointer.inside = false
      rt.pointer.live = false
    },
    [rt],
  )

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20)
    const s = st.current
    const sig = rt.signal
    const fx = rt.fx
    const revealed = revealedRef.current

    // the persistent mark advances sig.time; while it is flying / docked / in the menu, leave the
    // signal alone (the mark settles it itself). A boot that falls in that time is not replayed
    // later: the mark is already built by the time it comes back.
    if (!rt.driven) {
      if (revealed && s.phase !== 'live') {
        s.phase = 'live'
        s.phaseT = 0
        onPhase('live')
      }
      rt.pointer.inside = false
      rt.yawAdd = THREE.MathUtils.damp(rt.yawAdd, 0, 4, dt)
      rt.pitchAdd = THREE.MathUtils.damp(rt.pitchAdd, 0, 4, dt)
      return
    }

    // smoothed pointer + speed (kept in rt.pointer: the hook for a hover effect on the mark)
    const k = 1 - Math.exp(-dt * 7)
    s.ptrSmooth.lerp(s.ptr, k)
    const inst = s.ptr.distanceTo(s.prev) / Math.max(dt, 1e-3)
    s.prev.copy(s.ptr)
    s.speed = THREE.MathUtils.damp(s.speed, inst, 10, dt)
    const ptr = rt.pointer
    ptr.x = s.ptrSmooth.x
    ptr.y = s.ptrSmooth.y
    ptr.inside = s.inside
    ptr.speed = s.speed
    ptr.hover = s.hover
    ptr.idle = (performance.now() - s.lastMove) / 1000
    // the pointer on the mark's front face with the mark's current turn undone (rotation.y then
    // rotation.x, as three applies them; the mark canvas's own perspective is negligible here),
    // so the wake sits under the pointer whichever way the mark faces
    {
      const yaw = rt.yaw + rt.yawAdd
      const pitch = rt.pitch + rt.pitchAdd
      const cy = Math.cos(yaw)
      const sy = Math.sin(yaw)
      const mx = (s.face.x - FACE_Z * sy) / cy
      ptr.mx = mx
      ptr.my = (s.face.y + (FACE_Z * cy - mx * sy) * Math.sin(pitch)) / Math.cos(pitch)
    }
    // (after mx / my, so the mark never plays a tap at a stale spot)
    ptr.taps = s.taps

    // phases
    s.phaseT += dt
    // (no speed shimmer: fast pointer moves kick the wake instead of tearing the whole mark)
    let glitchTarget = 0
    if (s.phase === 'wait') {
      // dark and scattered under the preloader
      sig.power = 1
      sig.build = 0
      sig.scatter = 1.2
      fx.static = 0
      fx.loss = 0
      if (revealed) {
        s.phase = 'boot'
        s.phaseT = 0
        // the strike's snow
        fx.static = 0.6
        onPhase('boot')
      }
    } else if (s.phase === 'boot') {
      const t = s.phaseT
      sig.power = 1
      // solid about a second after the preloader clears
      sig.build = easeOutCubic(t / 1.4)
      sig.scatter = (1 - easeOutCubic(t / 1.2)) * 1.2
      fx.loss = Math.max(0, fx.loss - dt * 6)
      fx.static = Math.max(0, 1 - t / 0.35) * (fx.static > 0 ? 1 : 0)
      glitchTarget = Math.max(glitchTarget, (1 - t / 1.2) * 0.5)
      if (t > 1.5) {
        s.phase = 'live'
        s.phaseT = 0
        sig.build = 1
        sig.scatter = 0
        onPhase('live')
      }
    } else {
      // live (the signal-loss pass stays at rest: nothing on the page cuts the signal). A mark
      // that went live while it was away finishes its build here instead of snapping.
      sig.power = 1
      sig.build = Math.min(1, sig.build + dt * LIVE_BUILD_RATE)
      sig.scatter = THREE.MathUtils.damp(sig.scatter, 0, 6, dt)
      fx.loss = 0
      fx.static = Math.max(0, fx.static - dt * 6)
    }
    ptr.live = s.phase === 'live'
    sig.glitch = THREE.MathUtils.damp(sig.glitch, glitchTarget, glitchTarget > sig.glitch ? 18 : 5, dt)
    fx.glitch = sig.glitch * 0.85
    // (chroma split only while it glitches; the stage pass itself has no resting split)
    fx.aberration = sig.glitch * 0.01

    // the mark turns to face the cursor (an offset on top of the pose the home page pushes); held
    // at the resting pose until live, so the preloader's printed mark lands on it
    const idleRot = reduced ? 0 : Math.sin(sig.time * 0.35) * 0.16
    const px = s.inside ? s.ptrSmooth.x : 0
    const py = s.inside ? s.ptrSmooth.y : 0
    const hold = s.phase === 'live' ? 1 - sig.lift : 0
    rt.yawAdd = THREE.MathUtils.damp(rt.yawAdd, (px * 0.55 + idleRot) * hold, 4, dt)
    rt.pitchAdd = THREE.MathUtils.damp(rt.pitchAdd, -py * 0.12 * hold, 4, dt)
  })
  return null
}

/** The original stage's lights, unchanged in strength and always on: a cool fill, the lens key
 *  (in front of and above the lens, raised with the pedestal's lens) and the beam light. */
function StageLights() {
  const L = STAGE_LAYOUT
  return (
    <>
      <ambientLight intensity={0.25} color="#5fd4e6" />
      <pointLight position={[0, L.device.lensY + 0.29, 0.6]} intensity={3} color="#45e6ff" distance={4} />
      <pointLight position={[0, L.logoY, 0.4]} intensity={1.6} color="#45e6ff" distance={3.5} />
    </>
  )
}

/**
 * An error boundary inside the stage's own tree: an optional part that throws (the reflector's
 * render targets, an MSAA composer) is swapped for its cheaper `fallback` instead of tripping
 * the hero's GLBoundary, which would replace the whole stage.
 */
class Degrade extends Component<{ part: string; fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.warn(`[v8] the hero stage's ${this.props.part} failed; using a simpler one.`, error)
    stageDegraded(this.props.part, error)
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

/** Bloom, the signal pass and tone mapping. */
function Post({ effect, msaa }: { effect: SignalEffect; msaa: number }) {
  return (
    <EffectComposer multisampling={msaa} enableNormalPass={false}>
      <Bloom mipmapBlur intensity={1.0} luminanceThreshold={0.34} luminanceSmoothing={0.25} radius={0.7} />
      <primitive object={effect} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}

/** `?debug=stage` only: frames drawn and the canvas size, for the readout. */
function DebugProbe() {
  useEffect(() => {
    stageDebug.frames = 0
  }, [])
  useFrame((state) => {
    stageDebug.frames++
    const el = state.gl.domElement
    stageDebug.canvasW = el.width
    stageDebug.canvasH = el.height
    stageDebug.cssW = Math.round(state.size.width)
    stageDebug.cssH = Math.round(state.size.height)
  })
  return null
}

function Scene(props: HeroStageProps) {
  const { rt, narrow, active } = props
  // no resting chroma split on the stage: only the glitch splits it
  const effect = useDisposable(() => new SignalEffect(rt.fx, { restPx: 0 }), [rt])
  const maxSamples = useThree((s) => s.gl.capabilities.maxSamples)
  const invalidate = useThree((s) => s.invalidate)
  const msaa = narrow ? 0 : Math.min(STAGE_MSAA, maxSamples || 0)
  // back on screen (frameloop "never" → "always" / "demand"): R3F does not restart its loop for
  // a frameloop change, so ask for a frame (the mark may be asleep and not tick the loop for us)
  useEffect(() => {
    if (active) invalidate()
  }, [active, invalidate])

  const matte = <LabTable signal={rt.signal} />
  const plain = (
    <Degrade part="post-processing (rendering without bloom)" fallback={null}>
      <Post effect={effect} msaa={0} />
    </Degrade>
  )
  return (
    <>
      <color attach="background" args={['#050506']} />
      <fog attach="fog" args={['#050506', STAGE_LAYOUT.fog[0], STAGE_LAYOUT.fog[1]]} />
      <StageLights />
      {narrow ? (
        matte
      ) : (
        <Degrade part="reflective floor (matte instead)" fallback={matte}>
          <LabTable signal={rt.signal} reflective resolution={512} />
        </Degrade>
      )}
      <Projector signal={rt.signal} cone={STAGE_LAYOUT.cone} dust={narrow ? 400 : 1000} />
      <Controller {...props} />
      {/* MSAA on desktop: clean silhouettes on the hardware (phones keep the cheaper path) */}
      {msaa > 0 ? (
        <Degrade part="MSAA composer (plain composer instead)" fallback={plain}>
          <Post effect={effect} msaa={msaa} />
        </Degrade>
      ) : (
        plain
      )}
      {stageDebugOn() && <DebugProbe />}
    </>
  )
}

export default function HeroStage(props: HeroStageProps) {
  const { active, reduced, narrow, onLost } = props
  const cam = STAGE_LAYOUT.camera
  const c = narrow ? cam.narrow : cam.desktop
  const onCreated = useContextLoss(onLost)
  return (
    <Canvas
      onCreated={onCreated}
      aria-hidden="true"
      dpr={[1, narrow ? 1.25 : 1.6]}
      frameloop={!active ? 'never' : reduced ? 'demand' : 'always'}
      camera={{ position: [c.pos[0], c.pos[1], c.pos[2]], fov: FOV, near: 0.1, far: 60 }}
      gl={{ antialias: false, powerPreference: 'high-performance', alpha: false, stencil: false }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <Scene {...props} />
    </Canvas>
  )
}
