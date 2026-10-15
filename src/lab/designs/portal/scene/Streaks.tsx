import * as THREE from 'three'
import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { live } from '../store'
import { RO, stencilTest } from './stencil'

/**
 * Star field that stretches into streaks with camera velocity. Field wraps around the camera
 * along z so it never runs out. Each segment = 2 vertices (head, tail).
 */
export interface StreaksProps {
  count?: number
  rMin?: number
  rMax?: number
  length?: number
  colors?: string[]
  stencilRef?: number
  /** Local frame (world-space matrix) of the field; field z runs along local z. */
  matrix?: THREE.Matrix4
}


export function Streaks({ count = 1400, rMin = 4, rMax = 34, length = 150, colors = ['#ff4fa3', '#47e5d3', '#e9f1ef'], stencilRef = 0, matrix }: StreaksProps) {
  const { geo, mat } = useMemo(() => {
    const pos = new Float32Array(count * 6)
    const end = new Float32Array(count * 2)
    const col = new Float32Array(count * 6)
    const pal = colors.map((c) => new THREE.Color(c))
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2
      const r = rMin + Math.pow(Math.random(), 0.8) * (rMax - rMin)
      const x = Math.cos(a) * r
      const y = Math.sin(a) * r * 0.7
      const z = (Math.random() - 0.5) * length
      pos.set([x, y, z, x, y, z], i * 6)
      end[i * 2] = 0
      end[i * 2 + 1] = 1
      const c = pal[Math.random() < 0.55 ? pal.length - 1 : Math.floor(Math.random() * (pal.length - 1))]
      const k = 0.35 + Math.random() * 0.65
      col.set([c.r * k, c.g * k, c.b * k, c.r * k, c.g * k, c.b * k], i * 6)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aEnd', new THREE.BufferAttribute(end, 1))
    g.setAttribute('aCol', new THREE.BufferAttribute(col, 3))
    const m = new THREE.ShaderMaterial({
      uniforms: {
        uVel: { value: new THREE.Vector3() },
        uCam: { value: new THREE.Vector3() },
        uLen: { value: length },
        uInv: { value: new THREE.Matrix4() },
      },
      vertexShader: /* glsl */ `
        attribute float aEnd; attribute vec3 aCol;
        uniform vec3 uVel; uniform vec3 uCam; uniform float uLen;
        varying vec3 vCol; varying float vF;
        void main(){
          vec3 p = position;
          // wrap along z around the camera (both in field-local space)
          p.z = mod(p.z - uCam.z + uLen * 0.5, uLen) - uLen * 0.5 + uCam.z;
          float sp = length(uVel);
          p -= uVel * aEnd * 0.055;
          p.z += aEnd * 0.05;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float d = -mv.z;
          vF = smoothstep(uLen * 0.5, uLen * 0.12, d) * smoothstep(0.5, 3.0, d);
          vCol = aCol * (0.55 + min(sp * 0.04, 1.4)) * mix(1.0, 0.35, aEnd);
        }`,
      fragmentShader: /* glsl */ `
        varying vec3 vCol; varying float vF;
        void main(){ gl_FragColor = vec4(vCol * vF, 1.0); }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    })
    stencilTest(m, stencilRef)
    return { geo: g, mat: m }
  }, [count, rMin, rMax, length, colors, stencilRef])

  useEffect(
    () => () => {
      geo.dispose()
      mat.dispose()
    },
    [geo, mat],
  )

  const inv = useMemo(() => (matrix ? matrix.clone().invert() : new THREE.Matrix4()), [matrix])

  useFrame(({ camera }) => {
    // local-space camera & velocity
    mat.uniforms.uCam.value.copy(camera.position).applyMatrix4(inv)
    const v = mat.uniforms.uVel.value as THREE.Vector3
    const sp = Math.min(live.vel.length(), 80)
    if (sp < 0.05) v.set(0, 0, 0)
    else v.copy(live.vel).transformDirection(inv).multiplyScalar(sp)
  })

  return (
    <lineSegments
      geometry={geo}
      material={mat}
      renderOrder={stencilRef ? RO.worldFx : RO.outside}
      frustumCulled={false}
      matrixAutoUpdate={!matrix}
      matrix={matrix ?? undefined}
    />
  )
}
