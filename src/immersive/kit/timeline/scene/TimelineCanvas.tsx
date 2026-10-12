import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, Sparkles } from '@react-three/drei'
import { Bloom, EffectComposer, N8AO, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import PaperStrip from './PaperStrip'
import { createFibreTexture, type PrintStop } from '../lib/print'
import type { ToneSpec } from '../lib/tones'
import { FOV } from './frame'
import type { Runtime } from './runtime'

// rapier (~2 MB wasm) only loads when physics is switched on
const PhysicsLayer = lazy(() => import('./PhysicsLayer'))

export interface TimelineCanvasProps {
  rt: React.RefObject<Runtime>
  tone: ToneSpec
  stops: PrintStop[]
  quality: 'low' | 'high'
  transparent: boolean
  active: boolean
  physics: boolean
  eventSource: HTMLElement
}

/**
 * The wall behind the paper: near-black, barely-there fibre, a glow that sits
 * behind the mark (and later behind the strip) so the paper reads as a lit object
 * in a dark room. The teal tone adds the redesign's faint vertical rules.
 */
function Wall({ rt, tone }: { rt: React.RefObject<Runtime>; tone: ToneSpec }) {
  const tex = useMemo(() => {
    const t = createFibreTexture(256)
    t.repeat.set(40, 20)
    return t
  }, [])
  const u = useMemo(
    () => ({
      uHalo: { value: new THREE.Vector3() },
      uHaloAmt: { value: 1 },
      uHaloCol: { value: new THREE.Vector3() },
      uGrid: { value: 0 },
    }),
    [],
  )
  u.uHaloCol.value.set(...tone.halo)
  u.uGrid.value = tone.grid
  const mat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ color: tone.wall, roughness: 1, bumpMap: tex, bumpScale: 0.7 })
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, u)
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWallPos;')
        .replace('#include <project_vertex>', '#include <project_vertex>\n  vWallPos = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;')
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform vec3 uHalo;\nuniform float uHaloAmt;\nuniform vec3 uHaloCol;\nuniform float uGrid;\nvarying vec3 vWallPos;')
        .replace(
          '#include <map_fragment>',
          `#include <map_fragment>
  float fib = texture2D( bumpMap, vBumpMapUv ).r;
  diffuseColor.rgb *= 0.8 + 0.4 * fib;`,
        )
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
  vec2 hd = ( vWallPos.xy - uHalo.xy ) * vec2( 0.62, 0.8 );
  float hr = dot( hd, hd );
  float glow = exp( -hr / 0.5 ) * 0.032 + exp( -hr / 2.6 ) * 0.007;
  totalEmissiveRadiance += uHaloCol * glow * uHaloAmt * ( 0.85 + 0.3 * fib );
  // vertical rules every 0.24 units, lit only inside the glow
  float gx = abs( fract( vWallPos.x / 0.24 ) - 0.5 ) * 0.24;
  float rule = 1.0 - smoothstep( 0.0, fwidth( vWallPos.x ) * 1.2, gx );
  totalEmissiveRadiance += uHaloCol * rule * uGrid * ( exp( -hr / 1.6 ) * 0.05 + 0.004 ) * uHaloAmt;`,
        )
    }
    m.customProgramCacheKey = () => 'imm-tl-wall-v1'
    return m
  }, [tex, u, tone.wall])
  useEffect(() => () => mat.dispose(), [mat])
  useEffect(() => () => tex.dispose(), [tex])
  useFrame((state) => {
    const c = rt.current.cam
    u.uHalo.value.set(
      THREE.MathUtils.lerp(c.markX + 0.25, state.camera.position.x + 0.2, c.b),
      THREE.MathUtils.lerp(c.markY + 0.15, 0.05, c.b),
      0,
    )
    u.uHaloAmt.value = THREE.MathUtils.lerp(1 - 0.55 * c.a, 0.4, c.b)
  })
  return (
    <mesh position={[0, 0, -0.6]} receiveShadow material={mat}>
      <planeGeometry args={[80, 40]} />
    </mesh>
  )
}

/** Transparent mode: only the cast shadow lands on the page. */
function ShadowCatcher() {
  return (
    <mesh position={[0, 0, -0.6]} receiveShadow>
      <planeGeometry args={[80, 40]} />
      <shadowMaterial transparent opacity={0.55} />
    </mesh>
  )
}

/**
 * Night still-life lighting:
 *  - key: hard shadow-casting spot from high left (the cast shadow on the wall)
 *  - rake: grazing spot from the far left, skimming the paper so every crease splits
 *    into a lit facet and a dark one (and the fibre grain shows)
 *  - rims: coloured back lights catching the foil edges
 *  - glint: a small point light that follows the cursor across the paper
 */
function Lights({ rt, tone, quality }: { rt: React.RefObject<Runtime>; tone: ToneSpec; quality: 'low' | 'high' }) {
  const key = useRef<THREE.SpotLight>(null)
  const rake = useRef<THREE.SpotLight>(null)
  const glint = useRef<THREE.PointLight>(null)
  const keyTarget = useMemo(() => new THREE.Object3D(), [])
  const rakeTarget = useMemo(() => new THREE.Object3D(), [])
  const scene = useThree((s) => s.scene)
  useEffect(() => {
    scene.add(keyTarget, rakeTarget)
    if (key.current) key.current.target = keyTarget
    if (rake.current) rake.current.target = rakeTarget
    return () => void scene.remove(keyTarget, rakeTarget)
  }, [scene, keyTarget, rakeTarget])
  useFrame((state) => {
    const r = rt.current
    const c = r.cam
    const cx = state.camera.position.x
    const b = c.b
    const fx = THREE.MathUtils.lerp(c.markX, cx, b)
    if (key.current) {
      key.current.position.set(fx - 2.5, 3.5, 4.4)
      keyTarget.position.set(fx + 0.15, -0.15, 0)
      key.current.intensity = THREE.MathUtils.lerp(330, 90, b)
    }
    if (rake.current) {
      rake.current.intensity = THREE.MathUtils.lerp(1100, 520, b)
      rake.current.position.set(fx - 5.2, THREE.MathUtils.lerp(2.1, 1.5, b), THREE.MathUtils.lerp(1.15, 0.7, b))
      rakeTarget.position.set(fx + 0.6, -0.1, 0)
    }
    if (glint.current) {
      const live = r.coarse || r.reduced || !r.interactive ? 0 : 1
      const cam = state.camera as THREE.PerspectiveCamera
      const z = THREE.MathUtils.lerp(1.0, 0.75, b)
      const hh = (cam.position.z - z) * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2))
      glint.current.position.set(cx + state.pointer.x * hh * cam.aspect, state.pointer.y * hh, z)
      glint.current.intensity = 3.2 * live
    }
  })
  const map = quality === 'high' ? 2048 : 1024
  return (
    <>
      <hemisphereLight args={[tone.hemi, '#000000', 0.05]} />
      <spotLight
        ref={key}
        color={tone.key}
        intensity={330}
        angle={0.28}
        penumbra={0.75}
        decay={2}
        distance={20}
        castShadow
        shadow-mapSize-width={map}
        shadow-mapSize-height={map}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-radius={3}
        shadow-camera-near={1}
        shadow-camera-far={16}
      />
      <spotLight ref={rake} color={tone.rake} intensity={1100} angle={0.36} penumbra={0.6} decay={2} distance={16} />
      <directionalLight position={[2.4, 3.2, -2.6]} intensity={5.5} color={tone.rimA} />
      <directionalLight position={[-3, -2.5, -2]} intensity={2.2} color={tone.rimB} />
      <pointLight ref={glint} color={tone.glint} intensity={3.2} distance={2.6} decay={2} />
    </>
  )
}

export default function TimelineCanvas({ rt, tone, stops, quality, transparent, active, physics, eventSource }: TimelineCanvasProps) {
  const [dpr] = useState(() => Math.min(2, window.devicePixelRatio || 1))
  const r = rt.current
  const low = quality === 'low'
  return (
    <Canvas
      shadows="percentage"
      dpr={low ? Math.min(dpr, 1.5) : dpr}
      frameloop={active ? 'always' : 'never'}
      camera={{ fov: FOV, position: [0, 0, 6.2], near: 0.1, far: 60 }}
      gl={{ antialias: transparent || low, alpha: transparent, powerPreference: 'high-performance' }}
      eventSource={eventSource}
      eventPrefix="client"
      onCreated={({ gl }) => gl.setClearColor(tone.bg, transparent ? 0 : 1)}
      style={{ position: 'absolute', inset: 0 }}
      aria-hidden
    >
      {!transparent && <color attach="background" args={[tone.bg]} />}
      {!transparent && <fog attach="fog" args={[tone.bg, 8, 17]} />}
      {/* reflections for the foil only (paper materials mostly ignore the env) */}
      <Environment resolution={128} frames={1} environmentIntensity={1}>
        <Lightformer form="rect" intensity={3.2} color={tone.formers.warm} position={[-3, 3, 4]} scale={[5, 2.5, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={2.4} color={tone.formers.soft} position={[0, 1.2, 6]} scale={[9, 1.4, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={5} color={tone.formers.sideA} position={[5, 0.5, 0.6]} scale={[1, 7, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={4} color={tone.formers.sideB} position={[-5, -0.5, 0.4]} scale={[1, 7, 1]} target={[0, 0, 0]} />
        <Lightformer form="ring" intensity={1.6} color="#ffffff" position={[0, 4, -3]} scale={2} target={[0, 0, 0]} />
      </Environment>
      <Lights rt={rt} tone={tone} quality={quality} />
      {transparent ? <ShadowCatcher /> : <Wall rt={rt} tone={tone} />}
      <PaperStrip rt={rt} tone={tone} stops={stops} quality={quality} active={active} />
      {physics && (
        <Suspense fallback={null}>
          <PhysicsLayer rt={rt} active={active} />
        </Suspense>
      )}
      {!r.reduced && (
        <Sparkles
          count={r.coarse || low ? 24 : 60}
          scale={[9, 4.5, 2.2]}
          position={[0, 0, 0.3]}
          size={1.2}
          speed={0.16}
          opacity={0.32}
          color={tone.sparkle}
          noise={0.8}
        />
      )}
      {!transparent &&
        (low ? (
          <EffectComposer multisampling={0} enableNormalPass={false}>
            <Bloom mipmapBlur luminanceThreshold={0.72} luminanceSmoothing={0.15} intensity={0.55} radius={0.6} />
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
            <Vignette offset={0.18} darkness={0.9} />
          </EffectComposer>
        ) : (
          <EffectComposer multisampling={0} enableNormalPass={false}>
            <N8AO aoRadius={0.75} distanceFalloff={0.9} intensity={3.2} quality="medium" halfRes color="#000000" />
            <Bloom mipmapBlur luminanceThreshold={0.72} luminanceSmoothing={0.15} intensity={0.55} radius={0.6} />
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
            <Vignette offset={0.18} darkness={0.9} />
          </EffectComposer>
        ))}
    </Canvas>
  )
}
