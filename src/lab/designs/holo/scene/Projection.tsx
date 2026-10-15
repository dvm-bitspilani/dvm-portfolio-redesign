import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { CYAN, VIOLET, loadTexture, makeSignal, titleTexture, useDisposable, type Signal } from './common'
import { LabTable, Projector } from './Projector'
import { imageFrag, imageVert } from './shaders'

export interface ProjectionProps {
  /** Image to project. Falls back to a title card. */
  src?: string
  fallbackTitle: string
  /** Width / height of the projected plane. */
  aspect?: number
  reduced: boolean
  frameloop: 'always' | 'never' | 'demand'
  container: RefObject<HTMLElement | null>
  /** 0 = pure hologram until scanned, 1 = materialised. */
  solid?: number
}

const PLANE_H = 1.5
const PLANE_Y = 1.45

function Plate({ src, fallbackTitle, aspect = 1.6, reduced, container, solid = 0, signal }: ProjectionProps & { signal: Signal }) {
  const { camera, invalidate } = useThree()
  const mesh = useRef<THREE.Mesh>(null)
  const w = PLANE_H * aspect
  const geo = useDisposable(() => new THREE.PlaneGeometry(w, PLANE_H, 1, 32), [w])
  const mat = useDisposable(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: imageVert,
        fragmentShader: imageFrag,
        uniforms: {
          uMap: { value: null },
          uTime: { value: 0 },
          uGlitch: { value: 1 },
          uSolid: { value: 0 },
          uOpacity: { value: 1 },
          uBuild: { value: 0 },
          uScanY: { value: -10 },
          uBand: { value: 0.16 },
          uScanOn: { value: 0 },
          uCover: { value: new THREE.Vector2(1, 1) },
          uColor: { value: CYAN.clone() },
          uColorB: { value: VIOLET.clone() },
        },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    [],
  )

  // swap textures with a rebuild sweep
  useEffect(() => {
    const fit = (t: THREE.Texture) => {
      const img = t.image as { width: number; height: number } | undefined
      if (!img?.width) return
      const ia = img.width / img.height
      mat.uniforms.uCover.value.set(ia > aspect ? aspect / ia : 1, ia > aspect ? 1 : ia / aspect)
      invalidate()
    }
    const tex = src ? loadTexture(src, fit) : titleTexture(fallbackTitle, 'no frames on file')
    if (!src) fit(tex)
    mat.uniforms.uMap.value = tex
    mat.uniforms.uBuild.value = reduced ? 1 : 0
    mat.uniforms.uGlitch.value = reduced ? 0 : 0.9
    invalidate()
    return () => tex.dispose()
  }, [src, fallbackTitle, mat, aspect, reduced, invalidate])

  const st = useMemo(() => ({ ptr: new THREE.Vector2(), inside: false, ray: new THREE.Raycaster(), plane: new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit: new THREE.Vector3() }), [])
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const el = container.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width
      const y = (e.clientY - r.top) / r.height
      st.inside = x >= 0 && x <= 1 && y >= 0 && y <= 1
      st.ptr.set(x * 2 - 1, -(y * 2 - 1))
      if (reduced) invalidate()
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [container, st, reduced, invalidate])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20)
    if (!reduced) signal.time += dt
    const u = mat.uniforms
    u.uTime.value = signal.time
    u.uBuild.value = reduced ? 1 : Math.min(1, u.uBuild.value + dt * 0.75)
    u.uGlitch.value = THREE.MathUtils.damp(u.uGlitch.value, 0.02, 3, dt)
    u.uSolid.value = THREE.MathUtils.damp(u.uSolid.value, solid, 4, dt)
    if (st.inside) {
      st.ray.setFromCamera(st.ptr, camera)
      if (st.ray.ray.intersectPlane(st.plane, st.hit)) u.uScanY.value = THREE.MathUtils.damp(u.uScanY.value < -5 ? st.hit.y : u.uScanY.value, st.hit.y, 14, dt)
    }
    u.uScanOn.value = THREE.MathUtils.damp(u.uScanOn.value, st.inside ? 1 : 0, 6, dt)
    const m = mesh.current
    if (m) {
      m.rotation.y = THREE.MathUtils.damp(m.rotation.y, st.inside ? st.ptr.x * 0.35 : Math.sin(signal.time * 0.4) * 0.12, 4, dt)
      m.rotation.x = THREE.MathUtils.damp(m.rotation.x, st.inside ? -st.ptr.y * 0.12 : 0, 4, dt)
      m.position.y = PLANE_Y + (reduced ? 0 : Math.sin(signal.time * 0.9) * 0.02)
    }
  })

  return <mesh ref={mesh} geometry={geo} material={mat} position={[0, PLANE_Y, 0]} renderOrder={8} />
}

export default function Projection(props: ProjectionProps) {
  const signal = useMemo(makeSignal, [])
  const z = 3.6 + Math.max(0, (props.aspect ?? 1.6) - 1.2) * 1.3
  return (
    <Canvas
      className="holo-canvas"
      dpr={[1, 1.75]}
      frameloop={props.reduced ? 'demand' : props.frameloop}
      camera={{ position: [0, 1.55, z], fov: 36, near: 0.1, far: 40 }}
      onCreated={({ camera }) => camera.lookAt(0, 1.2, 0)}
      gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
      aria-hidden="true"
    >
      <color attach="background" args={['#020508']} />
      <fog attach="fog" args={['#020508', 5, 14]} />
      <pointLight position={[0, 0.5, 0.6]} intensity={3} color="#5ef2ff" distance={4} />
      <LabTable signal={signal} />
      <Projector signal={signal} height={2.0} spread={(props.aspect ?? 1.6) * 0.62} intensity={0.16} dust={300} scale={0.8} />
      <Plate {...props} signal={signal} />
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <Bloom mipmapBlur intensity={0.8} luminanceThreshold={0.6} luminanceSmoothing={0.2} radius={0.65} />
      </EffectComposer>
    </Canvas>
  )
}
