import * as THREE from 'three'
import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { designBase } from '../../registry'
import { FILM_END, filmHelix, filmLayout, filmProjects } from '../layout'
import { Panel } from './kit'

/** FILM: an unspooled reel. Frames ride a helix of film stock up the projector's beam. */
export function FilmWorld({ enabled, mobile }: { enabled: boolean; mobile: boolean }) {
  const parts = useMemo(() => {
    // ---- film ribbon along the helix
    const s0 = -0.7
    const s1 = filmProjects.length - 0.3
    const steps = Math.ceil((s1 - s0) / 0.04)
    const pos: number[] = []
    const uv: number[] = []
    const idx: number[] = []
    const half = 1.22
    let len = 0
    let prev = filmHelix(s0)
    for (let i = 0; i <= steps; i++) {
      const s = s0 + (i / steps) * (s1 - s0)
      const c = filmHelix(s)
      const t = filmHelix(s + 0.01).sub(filmHelix(s - 0.01)).normalize()
      const n = new THREE.Vector3(-c.x, -c.y, 0).normalize()
      const b = new THREE.Vector3().crossVectors(t, n).normalize()
      c.addScaledVector(n, -0.06)
      len += c.distanceTo(prev)
      prev = c.clone()
      pos.push(c.x + b.x * half, c.y + b.y * half, c.z + b.z * half, c.x - b.x * half, c.y - b.y * half, c.z - b.z * half)
      uv.push(len, 0, len, 1)
      if (i < steps) {
        const a = i * 2
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
      }
    }
    const ribbonGeo = new THREE.BufferGeometry()
    ribbonGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    ribbonGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    ribbonGeo.setIndex(idx)
    const ribbonMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `varying vec2 vUv; varying float vD; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.0); vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: /* glsl */ `uniform float uTime; varying vec2 vUv; varying float vD;
        void main(){
          float y = vUv.y;
          float edge = step(y, 0.13) + step(0.87, y);
          // sprocket holes: rounded boxes along both edges
          float u = fract(vUv.x * 2.2);
          vec2 q = vec2(abs(u - 0.5) * 2.0, abs((y < 0.5 ? y : 1.0 - y) - 0.065) / 0.035);
          float hole = edge * (1.0 - smoothstep(0.42, 0.5, q.x)) * (1.0 - smoothstep(0.75, 1.0, q.y));
          vec3 stock = vec3(0.05, 0.028, 0.016);
          vec3 warm = vec3(1.0, 0.62, 0.28);
          vec3 col = stock + warm * 0.05 * (1.0 - edge);
          col = mix(col, warm * 1.8, hole);
          // light washing down the strip from the projector
          col += warm * 0.08 * smoothstep(0.0, 1.0, sin(vUv.x * 0.08 - uTime * 0.6) * 0.5 + 0.5);
          float fog = smoothstep(70.0, 10.0, vD);
          gl_FragColor = vec4(col * fog, 1.0);
        }`,
      side: THREE.DoubleSide,
      toneMapped: false,
    })
    // ---- projector + beam
    const pz = FILM_END - 16
    const beamGeo = new THREE.CylinderGeometry(0.4, 11, 92, 48, 1, true)
    beamGeo.rotateX(Math.PI / 2) // axis along z, narrow end at -z
    beamGeo.translate(0, 0, pz + 46)
    const beamMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uZ0: { value: pz }, uZ1: { value: pz + 92 } },
      vertexShader: `varying vec3 vP; varying vec3 vN; varying vec3 vV; void main(){ vP = position; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: /* glsl */ `uniform float uTime; uniform float uZ0; uniform float uZ1; varying vec3 vP; varying vec3 vN; varying vec3 vV;
        void main(){
          float t = clamp((vP.z - uZ0) / (uZ1 - uZ0), 0.0, 1.0);
          float rim = pow(max(1.0 - abs(dot(vN, vV)), 0.0), 1.5);
          float flick = 0.85 + 0.15 * sin(uTime * 24.0) * sin(uTime * 7.0);
          float a = (1.0 - t) * (1.0 - t) * (0.25 + rim * 0.5) * flick;
          gl_FragColor = vec4(vec3(1.0, 0.72, 0.4) * a * 0.32, 1.0);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
    })
    const lampGeo = new THREE.CircleGeometry(1.4, 48)
    const lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd7a0').multiplyScalar(4), toneMapped: false })
    // ---- dust in the beam
    const dc = mobile ? 400 : 1200
    const dp = new Float32Array(dc * 3)
    for (let i = 0; i < dc; i++) {
      const a = Math.random() * Math.PI * 2
      const r = Math.sqrt(Math.random()) * 7
      dp.set([Math.cos(a) * r, Math.sin(a) * r, 4 - Math.random() * (4 - pz)], i * 3)
    }
    const dustGeo = new THREE.BufferGeometry()
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dp, 3))
    const dustMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uPR: { value: Math.min(window.devicePixelRatio, 2) } },
      vertexShader: `uniform float uTime; uniform float uPR; varying float vA;
        void main(){ vec3 p = position; p.x += sin(uTime * 0.3 + position.z) * 0.3; p.y += cos(uTime * 0.25 + position.x * 2.0) * 0.3;
          vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
          vA = smoothstep(50.0, 4.0, -mv.z) * (0.5 + 0.5 * sin(uTime + position.y * 9.0));
          gl_PointSize = uPR * 2.4 * (6.0 / max(-mv.z, 1.0)); }`,
      fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(1.0, 0.75, 0.45) * 1.4 * smoothstep(0.5, 0.0, d) * vA, 1.0); }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    })
    return { ribbonGeo, ribbonMat, beamGeo, beamMat, lampGeo, lampMat, dustGeo, dustMat, pz }
  }, [mobile])

  useEffect(
    () => () => {
      const p = parts
      for (const o of [p.ribbonGeo, p.ribbonMat, p.beamGeo, p.beamMat, p.lampGeo, p.lampMat, p.dustGeo, p.dustMat]) o.dispose()
    },
    [parts],
  )

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    parts.ribbonMat.uniforms.uTime.value = t
    parts.beamMat.uniforms.uTime.value = t
    parts.dustMat.uniforms.uTime.value = t
  })

  const base = designBase('portal')
  return (
    <group>
      <mesh geometry={parts.ribbonGeo} material={parts.ribbonMat} />
      <mesh geometry={parts.lampGeo} material={parts.lampMat} position={[0, 0, parts.pz]} />
      <mesh geometry={parts.beamGeo} material={parts.beamMat} renderOrder={5} frustumCulled={false} />
      <points geometry={parts.dustGeo} material={parts.dustMat} renderOrder={5} frustumCulled={false} />
      {filmLayout.map((pl) => (
        <Panel
          key={pl.item.slug}
          world="film"
          placed={pl}
          url={pl.item.cover}
          enabled={enabled}
          tint="#ffb35c"
          plate={false}
          href={`${base}/work/${pl.item.slug}`}
        />
      ))}
    </group>
  )
}
