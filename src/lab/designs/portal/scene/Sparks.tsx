import * as THREE from 'three'
import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { RO } from './stencil'

/**
 * "Sling-ring" sparks: particles born on a closed outline, shot along its tangent
 * and flung outward, cooling from white-hot to the accent colour.
 */
export interface SparksProps {
  outline: THREE.Vector2[]
  z?: number
  count?: number
  color?: string
  /** Mutable intensity driver (0..1+). */
  drive: { value: number }
  size?: number
  speed?: number
}

export function Sparks({ outline, z = 0, count = 900, color = '#ff4fa3', drive, size = 1, speed = 1 }: SparksProps) {
  const { geo, mat } = useMemo(() => {
    // arc-length sampling of the loop
    const segs: { a: THREE.Vector2; b: THREE.Vector2; len: number }[] = []
    let total = 0
    for (let i = 0; i < outline.length; i++) {
      const a = outline[i]
      const b = outline[(i + 1) % outline.length]
      const len = a.distanceTo(b)
      segs.push({ a, b, len })
      total += len
    }
    // polygon winding -> outward normal sign
    let area = 0
    for (let i = 0; i < outline.length; i++) {
      const a = outline[i]
      const b = outline[(i + 1) % outline.length]
      area += a.x * b.y - b.x * a.y
    }
    const ccw = area > 0 ? 1 : -1
    const base = new Float32Array(count * 3)
    const tan = new Float32Array(count * 3)
    const nrm = new Float32Array(count * 3)
    const seed = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      let r = ((i + Math.random()) / count) * total
      let k = 0
      while (k < segs.length - 1 && r > segs[k].len) r -= segs[k++].len
      const s = segs[k]
      const t = s.len > 0 ? r / s.len : 0
      const dx = (s.b.x - s.a.x) / (s.len || 1)
      const dy = (s.b.y - s.a.y) / (s.len || 1)
      base.set([s.a.x + (s.b.x - s.a.x) * t, s.a.y + (s.b.y - s.a.y) * t, z], i * 3)
      tan.set([dx, dy, 0], i * 3)
      nrm.set([dy * ccw, -dx * ccw, 0], i * 3)
      seed[i] = Math.random()
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(base, 3))
    g.setAttribute('aTan', new THREE.BufferAttribute(tan, 3))
    g.setAttribute('aNrm', new THREE.BufferAttribute(nrm, 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    g.computeBoundingSphere()
    g.boundingSphere!.radius += 3
    const m = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uDrive: { value: 0 },
        uSize: { value: size },
        uSpeed: { value: speed },
        uColor: { value: new THREE.Color(color) },
        uPR: { value: Math.min(window.devicePixelRatio, 2) },
      },
      vertexShader: /* glsl */ `
        attribute vec3 aTan; attribute vec3 aNrm; attribute float aSeed;
        uniform float uTime; uniform float uDrive; uniform float uSize; uniform float uSpeed; uniform float uPR;
        varying float vLife; varying float vA;
        void main(){
          float rate = (0.45 + aSeed * 0.9) * uSpeed * (0.6 + uDrive * 0.9);
          float life = fract(uTime * rate + aSeed * 17.31);
          vLife = life;
          float reach = (0.25 + aSeed * 0.9) * (0.5 + uDrive);
          vec3 p = position + aTan * life * reach
                 + aNrm * life * life * (0.15 + aSeed * 0.55) * (0.4 + uDrive)
                 + vec3(0.0, -life * life * 0.35, (aSeed - 0.5) * 0.25);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          vA = (1.0 - life) * smoothstep(0.0, 0.06, life) * clamp(uDrive, 0.0, 1.6) * step(0.18 + (1.0 - min(uDrive, 1.0)) * 0.6, fract(aSeed * 7.13));
          gl_PointSize = uSize * uPR * (1.4 + (1.0 - life) * 2.6) * (9.0 / max(-mv.z, 0.5));
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; varying float vLife; varying float vA;
        void main(){
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          float a = smoothstep(0.5, 0.0, d);
          vec3 hot = vec3(1.0, 0.92, 0.85);
          vec3 col = mix(hot * 2.2, uColor * 2.0, smoothstep(0.0, 0.45, vLife));
          gl_FragColor = vec4(col * a * vA, 1.0);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    })
    return { geo: g, mat: m }
  }, [outline, z, count, color, size, speed])

  useEffect(
    () => () => {
      geo.dispose()
      mat.dispose()
    },
    [geo, mat],
  )

  useFrame((_, dt) => {
    mat.uniforms.uTime.value += Math.min(dt, 0.05)
    mat.uniforms.uDrive.value = drive.value
  })

  return <points geometry={geo} material={mat} renderOrder={RO.worldFx + 2} frustumCulled={false} />
}
