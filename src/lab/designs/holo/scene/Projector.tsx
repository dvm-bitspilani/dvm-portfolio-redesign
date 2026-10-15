import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { MeshReflectorMaterial } from '@react-three/drei'
import { CYAN, useDisposable, type Signal } from './common'
import { coneFrag, coneVert, dustFrag, dustVert, lensFrag, lensVert, tableFrag } from './shaders'

const additive = {
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  toneMapped: false,
} as const

interface ProjectorProps {
  signal: Signal
  /** Height of the light cone. */
  height?: number
  /** Radius of the cone where it ends. */
  spread?: number
  intensity?: number
  dust?: number
  scale?: number
}

/** The emitter puck, its lens face, the light cone and the dust inside it. */
export function Projector({ signal, height = 2.7, spread = 1.2, intensity = 0.22, dust = 900, scale = 1 }: ProjectorProps) {
  const lensMat = useDisposable(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: lensVert,
        fragmentShader: lensFrag,
        uniforms: { uTime: { value: 0 }, uPower: { value: 1 }, uColor: { value: CYAN.clone() } },
        ...additive,
      }),
    [],
  )
  const coneMat = useDisposable(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: coneVert,
        fragmentShader: coneFrag,
        uniforms: {
          uTime: { value: 0 },
          uPower: { value: 1 },
          uIntensity: { value: intensity },
          uColor: { value: CYAN.clone() },
        },
        side: THREE.DoubleSide,
        ...additive,
      }),
    [intensity],
  )
  const coneGeo = useDisposable(() => {
    const g = new THREE.CylinderGeometry(spread, 0.2, height, 72, 1, true)
    g.translate(0, height / 2 + 0.12, 0)
    return g
  }, [height, spread])
  const innerGeo = useDisposable(() => {
    const g = new THREE.CylinderGeometry(spread * 0.55, 0.12, height * 0.92, 48, 1, true)
    g.translate(0, (height * 0.92) / 2 + 0.12, 0)
    return g
  }, [height, spread])

  const dustGeo = useDisposable(() => {
    const g = new THREE.BufferGeometry()
    const pos = new Float32Array(dust * 3)
    const rnd = new Float32Array(dust)
    for (let i = 0; i < dust; i++) {
      const a = Math.random() * Math.PI * 2
      const r = Math.sqrt(Math.random())
      pos[i * 3] = Math.cos(a) * r
      pos[i * 3 + 1] = Math.random() * height
      pos[i * 3 + 2] = Math.sin(a) * r
      rnd[i] = Math.random()
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aRand', new THREE.BufferAttribute(rnd, 1))
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, height / 2, 0), height)
    return g
  }, [dust, height])
  const dustMat = useDisposable(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: dustVert,
        fragmentShader: dustFrag,
        uniforms: {
          uTime: { value: 0 },
          uPixelRatio: { value: 1 },
          uHeight: { value: height },
          uColor: { value: CYAN.clone() },
          uPower: { value: 1 },
        },
        ...additive,
      }),
    [height],
  )

  useFrame((state) => {
    const t = signal.time
    const p = signal.power
    lensMat.uniforms.uTime.value = t
    lensMat.uniforms.uPower.value = 0.25 + 0.75 * p
    coneMat.uniforms.uTime.value = t
    coneMat.uniforms.uPower.value = p * (0.9 + 0.1 * Math.sin(t * 31) * Math.sin(t * 5.3))
    dustMat.uniforms.uTime.value = t
    dustMat.uniforms.uPower.value = 0.4 + 0.6 * p
    dustMat.uniforms.uPixelRatio.value = state.gl.getPixelRatio()
  })

  return (
    <group scale={scale}>
      {/* puck body */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.62, 0.7, 0.1, 64]} />
        <meshStandardMaterial color="#0b1013" metalness={0.9} roughness={0.32} />
      </mesh>
      <mesh position={[0, 0.105, 0]}>
        <cylinderGeometry args={[0.56, 0.62, 0.012, 64]} />
        <meshStandardMaterial color="#141c20" metalness={1} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.0, 0]} rotation-x={-Math.PI / 2}>
        <torusGeometry args={[0.705, 0.008, 8, 96]} />
        <meshBasicMaterial color={[0.5, 2.2, 2.6]} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.113, 0]} rotation-x={-Math.PI / 2} material={lensMat}>
        <circleGeometry args={[0.55, 64]} />
      </mesh>
      <mesh geometry={coneGeo} material={coneMat} renderOrder={2} />
      <mesh geometry={innerGeo} material={coneMat} renderOrder={2} />
      <points geometry={dustGeo} material={dustMat} renderOrder={3} />
    </group>
  )
}

/** Dark lab table with etched markings. Reflective in the hero, matte elsewhere. */
export function LabTable({ signal, reflective = false, resolution = 512 }: { signal: Signal; reflective?: boolean; resolution?: number }) {
  const markMat = useDisposable(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: lensVert,
        fragmentShader: tableFrag,
        uniforms: { uTime: { value: 0 }, uPower: { value: 1 }, uColor: { value: CYAN.clone() } },
        ...additive,
      }),
    [],
  )
  useFrame(() => {
    markMat.uniforms.uTime.value = signal.time
    markMat.uniforms.uPower.value = 0.3 + 0.7 * signal.power
  })
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.001, 0]}>
        <planeGeometry args={[40, 40]} />
        {reflective ? (
          <MeshReflectorMaterial
            resolution={resolution}
            blur={[400, 120]}
            mixBlur={1}
            mixStrength={3.2}
            mixContrast={1}
            roughness={0.85}
            depthScale={1.1}
            minDepthThreshold={0.35}
            maxDepthThreshold={1.4}
            color="#04080a"
            metalness={0.7}
            mirror={0.85}
          />
        ) : (
          <meshStandardMaterial color="#05090b" metalness={0.6} roughness={0.55} />
        )}
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.002, 0]} material={markMat}>
        <planeGeometry args={[16, 16]} />
      </mesh>
    </group>
  )
}
