import * as THREE from 'three'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { createLogoGeometry } from '../../../shared/logo'
import { GATE_DEPTH, GATE_POS, GATE_S, cavityPolygon } from '../layout'
import { api, live, store } from '../store'
import { RO, edgeSegments, makeLines, stencilTest } from './stencil'
import { Sparks } from './Sparks'

export const obsidian = () =>
  new THREE.MeshPhysicalMaterial({
    color: '#0a0f12',
    roughness: 0.24,
    metalness: 0.15,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.25,
  })

const tmp = new THREE.Vector3()
const ndc = new THREE.Vector3()

/** The DVM mark as a monumental obsidian gateway. Its cavity is the way through. */
export function Gate() {
  const hover = useRef(0)
  const hovering = useRef(false)
  const drive = useMemo(() => ({ value: 0.5 }), [])
  const light = useRef<THREE.PointLight>(null)

  const parts = useMemo(() => {
    const geo = createLogoGeometry({ depth: GATE_DEPTH, bevel: 0.005, bevelSegments: 2 })
    const flat = createLogoGeometry({ depth: GATE_DEPTH, bevel: 0 })
    const segs = edgeSegments(flat, 25)
    flat.dispose()
    const front: number[] = []
    const back: number[] = []
    const side: number[] = []
    for (let i = 0; i < segs.length; i += 6) {
      const za = segs[i + 2]
      const zb = segs[i + 5]
      const s = segs.slice(i, i + 6).map((v) => v * GATE_S)
      if (za > 0 && zb > 0) front.push(...s)
      else if (za < 0 && zb < 0) back.push(...s)
      else side.push(...s)
    }
    const lFront = makeLines(front, '#ff4fa3', 1.6, 3.2)
    const lBack = makeLines(back, '#ff4fa3', 1.0, 0.9)
    const lSide = makeLines(side, '#47e5d3', 1.0, 1.4)
    const mat = obsidian()

    const cav = cavityPolygon()
    const shape = new THREE.Shape(cav)
    const memGeo = new THREE.ShapeGeometry(shape)
    const memMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uHover: { value: 0 }, uFade: { value: 1 }, uC: { value: new THREE.Vector2(-GATE_POS.x, -GATE_POS.y) } },
      vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `
        uniform float uTime; uniform float uHover; uniform float uFade; uniform vec2 uC; varying vec2 vP;
        void main(){
          vec2 c = vP - uC;
          float r = length(c);
          float a = atan(c.y, c.x);
          float swirl = sin(r * 9.0 + uTime * 2.4 + sin(a * 6.0 + uTime) * 0.12);
          float ring = smoothstep(0.82, 1.0, swirl) * (0.2 + 0.8 * uHover) * smoothstep(0.1, 0.6, r);
          vec3 teal = vec3(0.16, 0.85, 0.78);
          vec3 mag = vec3(1.0, 0.31, 0.64);
          vec3 col = mix(teal, mag, 0.5 + 0.5 * sin(a + uTime * 0.4)) * (0.05 + ring * 0.22);
          col += mag * 0.18 * uHover * exp(-r * 1.2);
          gl_FragColor = vec4(col * uFade, 1.0);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
    })
    stencilTest(memMat, 0)
    return { geo, mat, lFront, lBack, lSide, cav, memGeo, memMat }
  }, [])

  useEffect(
    () => () => {
      parts.geo.dispose()
      parts.mat.dispose()
      for (const l of [parts.lFront, parts.lBack, parts.lSide]) {
        l.geometry.dispose()
        l.material.dispose()
      }
      parts.memGeo.dispose()
      parts.memMat.dispose()
    },
    [parts],
  )

  const frontZ = (GATE_DEPTH / 2) * GATE_S + 0.01

  useFrame(({ camera, clock }, dt) => {
    const s = store.get()
    const target = hovering.current && s.region === 'front' && !s.flying ? 1 : 0
    hover.current += (target - hover.current) * (1 - Math.exp(-dt * 6))
    const near = THREE.MathUtils.smoothstep(camera.position.z, 14, 3) // approaching the doorway
    drive.value = 0.45 + hover.current * 0.75 + near * 0.6 + Math.min(live.speed * 0.02, 0.5)
    parts.memMat.uniforms.uTime.value = clock.elapsedTime
    parts.memMat.uniforms.uHover.value = Math.max(hover.current, near)
    // cursor light: project the pointer onto a plane just in front of the gate
    if (light.current) {
      ndc.set(live.pointerX, live.pointerY, 0.5).unproject(camera)
      tmp.copy(ndc).sub(camera.position).normalize()
      const t = (2.2 - camera.position.z) / (tmp.z || -1)
      if (t > 0 && camera.position.z > 3) {
        light.current.position.copy(camera.position).addScaledVector(tmp, t).sub(GATE_POS)
        light.current.intensity = 70 + hover.current * 80
      } else light.current.intensity = 0
    }
  })

  return (
    <group position={GATE_POS}>
      <group scale={GATE_S}>
        <mesh
          geometry={parts.geo}
          material={parts.mat}
          onPointerOver={() => (hovering.current = true)}
          onPointerOut={() => (hovering.current = false)}
        />
      </group>
      <primitive object={parts.lFront} />
      <primitive object={parts.lBack} />
      <primitive object={parts.lSide} />
      <mesh
        geometry={parts.memGeo}
        material={parts.memMat}
        position-z={0}
        renderOrder={RO.worldFx + 1}
        onPointerOver={(e) => {
          e.stopPropagation()
          hovering.current = true
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          hovering.current = false
          document.body.style.cursor = ''
        }}
        onClick={(e) => {
          e.stopPropagation()
          if (store.get().region === 'front') api.goStation(1)
        }}
      />
      <Sparks outline={parts.cav} z={frontZ} count={1100} drive={drive} color="#ff4fa3" />
      <pointLight ref={light} color="#ff4fa3" intensity={0} distance={16} decay={2} />
    </group>
  )
}
