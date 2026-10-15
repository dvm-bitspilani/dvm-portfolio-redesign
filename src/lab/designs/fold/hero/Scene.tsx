import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, Sparkles } from '@react-three/drei'
import { CuboidCollider, Physics, RigidBody } from '@react-three/rapier'
import { Bloom, EffectComposer, N8AO, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import PaperMark from './PaperMark'
import { createFibreTexture } from '../lib/paper'
import { heroFrame, smooth, type StageState } from './stage'

const BG = '#050404'

/**
 * The wall behind the paper: near-black, barely-there fibre, and a warm glow
 * that sits behind the mark (and later behind the strip) so the paper reads as
 * a lit object in a dark room rather than brown on brown.
 */
function Backdrop({ stage }: { stage: React.MutableRefObject<StageState> }) {
  const tex = useMemo(() => {
    const t = createFibreTexture(512)
    t.repeat.set(40, 20)
    return t
  }, [])
  const halo = useMemo(() => ({ value: new THREE.Vector3(0, 0, 0) }), [])
  const haloAmt = useMemo(() => ({ value: 1 }), [])
  const mat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ color: '#060505', roughness: 1, bumpMap: tex, bumpScale: 0.7 })
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uHalo = halo
      shader.uniforms.uHaloAmt = haloAmt
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWallPos;')
        .replace('#include <project_vertex>', '#include <project_vertex>\n  vWallPos = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;')
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform vec3 uHalo;\nuniform float uHaloAmt;\nvarying vec3 vWallPos;')
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
  totalEmissiveRadiance += vec3( 0.95, 0.42, 0.18 ) * ( exp( -hr / 0.5 ) * 0.032 + exp( -hr / 2.6 ) * 0.007 ) * uHaloAmt * ( 0.85 + 0.3 * fib );`,
        )
    }
    m.customProgramCacheKey = () => 'fold-wall-v2'
    return m
  }, [tex, halo, haloAmt])
  useEffect(
    () => () => {
      tex.dispose()
      mat.dispose()
    },
    [tex, mat],
  )
  useFrame((state) => {
    const st = stage.current
    const f = heroFrame(state.size.width / state.size.height)
    const a = smooth(0.03, 0.2, st.progress)
    const b = smooth(0.2, 0.33, st.progress)
    // behind the mark in the hero, behind the strip (just above centre) on the timeline
    halo.value.set(
      THREE.MathUtils.lerp(f.markX + 0.25, state.camera.position.x + 0.2, b),
      THREE.MathUtils.lerp(f.markY + 0.15, 0.05, b),
      0,
    )
    haloAmt.value = THREE.MathUtils.lerp(1 - 0.55 * a, 0.4, b)
  })
  return (
    <mesh position={[0, 0, -0.6]} receiveShadow material={mat}>
      <planeGeometry args={[60, 30]} />
    </mesh>
  )
}

/**
 * Night still-life lighting:
 *  - key: a hard, shadow-casting spot from high left (the cast shadow on the wall)
 *  - rake: a grazing spot from the far left, skimming the paper so every crease
 *    splits into a lit facet and a dark one (and the fibre grain shows)
 *  - rim: warm back light from behind/above catching the copper edges
 *  - glint: a small warm point that follows the cursor across the paper
 */
function Lights({ stage }: { stage: React.MutableRefObject<StageState> }) {
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
    const st = stage.current
    const cx = state.camera.position.x
    const f = heroFrame(state.size.width / state.size.height)
    const b = smooth(0.2, 0.33, st.progress)
    const fx = THREE.MathUtils.lerp(f.markX, cx, b)
    if (key.current) {
      key.current.position.set(fx - 2.5, 3.5, 4.4)
      keyTarget.position.set(fx + 0.15, -0.15, 0)
    }
    if (key.current) key.current.intensity = THREE.MathUtils.lerp(330, 90, b)
    if (rake.current) {
      rake.current.intensity = THREE.MathUtils.lerp(1100, 520, b)
      rake.current.position.set(fx - 5.2, THREE.MathUtils.lerp(2.1, 1.5, b), THREE.MathUtils.lerp(1.15, 0.7, b))
      rakeTarget.position.set(fx + 0.6, -0.1, 0)
    }
    if (glint.current) {
      const live = st.coarse || st.reduced ? 0 : 1
      const cam = state.camera as THREE.PerspectiveCamera
      const z = THREE.MathUtils.lerp(1.0, 0.75, b)
      const hh = (cam.position.z - z) * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2))
      glint.current.position.set(cx + state.pointer.x * hh * cam.aspect, state.pointer.y * hh, z)
      glint.current.intensity = 3.2 * live
    }
  })
  return (
    <>
      <hemisphereLight args={['#f4ece6', '#000000', 0.05]} />
      <spotLight
        ref={key}
        color="#fff4ea"
        intensity={330}
        angle={0.28}
        penumbra={0.75}
        decay={2}
        distance={20}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-radius={3}
        shadow-camera-near={1}
        shadow-camera-far={16}
      />
      <spotLight ref={rake} color="#fff1e4" intensity={1100} angle={0.36} penumbra={0.6} decay={2} distance={16} />
      <directionalLight position={[2.4, 3.2, -2.6]} intensity={5.5} color="#ff8a4c" />
      <directionalLight position={[-3, -2.5, -2]} intensity={2.2} color="#ff6a3d" />
      <pointLight ref={glint} color="#ffc49a" intensity={3.2} distance={2.6} decay={2} />
    </>
  )
}

function Bounds({ stage }: { stage: React.MutableRefObject<StageState> }) {
  const size = useThree((s) => s.size)
  const f = heroFrame(size.width / size.height)
  const reduced = stage.current.reduced
  if (reduced) return null
  const W = f.halfW
  const H = f.halfH
  return (
    <group key={`${W.toFixed(2)}-${H.toFixed(2)}`}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[W * 3, 0.3, 3]} position={[0, -H - 0.3, 0]} friction={0.9} restitution={0.25} />
        <CuboidCollider args={[0.3, H * 4, 3]} position={[-W - 0.3, 0, 0]} />
        <CuboidCollider args={[0.3, H * 4, 3]} position={[W + 0.3, 0, 0]} />
        <CuboidCollider args={[W * 3, H * 4, 0.2]} position={[0, 0, -0.6 - 0.2]} />
        <CuboidCollider args={[W * 3, H * 4, 0.2]} position={[0, 0, 2.2]} />
        <CuboidCollider args={[W * 3, 0.3, 3]} position={[0, H + 2.4, 0]} />
      </RigidBody>
    </group>
  )
}

export default function Scene({ stage, active }: { stage: React.MutableRefObject<StageState>; active: boolean }) {
  const [dpr] = useState(() => Math.min(2, window.devicePixelRatio || 1))
  const coarse = stage.current.coarse
  return (
    <Canvas
      className="fold-canvas"
      shadows="percentage"
      dpr={coarse ? Math.min(dpr, 1.5) : dpr}
      frameloop={active ? 'always' : 'never'}
      camera={{ fov: 32, position: [0, 0, 6.2], near: 0.1, far: 60 }}
      gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.setClearColor(BG)
      }}
      aria-hidden
    >
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 8, 17]} />
      {/* reflections for the copper only (paper materials mostly ignore the env) */}
      <Environment resolution={128} frames={1} environmentIntensity={1}>
        <Lightformer form="rect" intensity={3.2} color="#fff0e2" position={[-3, 3, 4]} scale={[5, 2.5, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={2.4} color="#ffe2c8" position={[0, 1.2, 6]} scale={[9, 1.4, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={5} color="#ff8a55" position={[5, 0.5, 0.6]} scale={[1, 7, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={4} color="#ffd2ae" position={[-5, -0.5, 0.4]} scale={[1, 7, 1]} target={[0, 0, 0]} />
        <Lightformer form="ring" intensity={1.6} color="#ffffff" position={[0, 4, -3]} scale={2} target={[0, 0, 0]} />
      </Environment>
      <Lights stage={stage} />
      <Backdrop stage={stage} />
      <Suspense fallback={null}>
        <Physics gravity={[0, -14, 0]} timeStep={1 / 60} paused={!active}>
          <PaperMark stage={stage} active={active} />
          <Bounds stage={stage} />
        </Physics>
      </Suspense>
      {!stage.current.reduced && (
        <Sparkles count={coarse ? 24 : 60} scale={[9, 4.5, 2.2]} position={[0, 0, 0.3]} size={1.2} speed={0.16} opacity={0.32} color="#ffc4a3" noise={0.8} />
      )}
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <N8AO aoRadius={0.75} distanceFalloff={0.9} intensity={3.2} quality={coarse ? 'performance' : 'medium'} halfRes color="#000000" />
        <Bloom mipmapBlur luminanceThreshold={0.72} luminanceSmoothing={0.15} intensity={0.55} radius={0.6} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <Vignette offset={0.18} darkness={0.9} />
        {/* no film-grain pass: it speckled the foil highlights; the paper fibre carries the texture */}
      </EffectComposer>
    </Canvas>
  )
}
