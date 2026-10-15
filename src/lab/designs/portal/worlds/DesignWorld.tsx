import * as THREE from 'three'
import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { designBase } from '../../registry'
import { BLOG_Z, artLayout, blogLayout } from '../layout'
import { fogShader } from '../scene/stencil'
import { Panel } from './kit'

/** DESIGN: a night gallery. Artworks hang in pools of light; essays wait in an arc at the end. */
export function DesignWorld({ enabled, mobile }: { enabled: boolean; mobile: boolean }) {
  const parts = useMemo(() => {
    const floorGeo = new THREE.PlaneGeometry(80, 140)
    const spots = new Float32Array(artLayout.length * 2)
    artLayout.forEach((a, i) => spots.set([a.pos.x * 0.85, a.pos.z], i * 2))
    const floorMat = fogShader({
      uniforms: { uTime: { value: 0 } },
      vertex: /* glsl */ `varying vec3 vL;
        #include <fog_pars_vertex>
        void main(){ vL = vec3(position.x, 0.0, -position.y) + vec3(0.0, 0.0, ${(-60).toFixed(1)});
          vec4 mvPosition = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
        }`,
      fragment: /* glsl */ `uniform float uTime; varying vec3 vL;
        float sq(float x) { return x * x; }
        #include <fog_pars_fragment>
        void main(){
          vec3 plum = vec3(0.03, 0.008, 0.026);
          vec3 col = plum;
          // pools of light beneath the hanging works (two lanes)
          float zz = fract((vL.z + 7.0) / 3.5);
          float lane = exp(-sq(abs(vL.x) - 3.4) * 0.5);
          float pool = exp(-sq((zz - 0.5) * 3.5) * 0.6) * lane;
          col += vec3(1.0, 0.45, 0.72) * pool * 0.09;
          // polished marble veins
          float v = sin(vL.x * 1.7 + sin(vL.z * 0.6) * 2.0) * sin(vL.z * 0.9 + vL.x * 0.3);
          col += vec3(0.25, 0.08, 0.2) * smoothstep(0.96, 1.0, v) * 0.25;
          // aisle runner
          col += vec3(1.0, 0.31, 0.64) * exp(-vL.x * vL.x * 6.0) * 0.05;
          gl_FragColor = vec4(col, 1.0);
          #include <fog_fragment>
        }`,
    })
    // light cones above each work
    const coneGeo = new THREE.ConeGeometry(1.15, 4.6, 32, 1, true)
    coneGeo.translate(0, -2.3, 0)
    const coneMat = new THREE.ShaderMaterial({
      vertexShader: `varying float vY; varying vec3 vN; varying vec3 vV; void main(){ vY = position.y; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying float vY; varying vec3 vN; varying vec3 vV; float sq(float x) { return x * x; } void main(){ float t = clamp(-vY / 4.6, 0.0, 1.0); float rim = max(1.0 - abs(dot(vN, vV)), 0.0); gl_FragColor = vec4(vec3(1.0, 0.7, 0.86) * (1.0 - t) * (1.0 - t) * sq(rim) * 0.12, 1.0); }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
    })
    // drifting pigment motes
    const pc = mobile ? 300 : 800
    const pp = new Float32Array(pc * 3)
    for (let i = 0; i < pc; i++) pp.set([(Math.random() - 0.5) * 26, Math.random() * 8 - 2, 4 - Math.random() * 115], i * 3)
    const moteGeo = new THREE.BufferGeometry()
    moteGeo.setAttribute('position', new THREE.BufferAttribute(pp, 3))
    const moteMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uPR: { value: Math.min(window.devicePixelRatio, 2) } },
      vertexShader: `uniform float uTime; uniform float uPR; varying float vA; varying float vK;
        void main(){ vec3 p = position; p.y += sin(uTime * 0.4 + position.x) * 0.4; p.x += cos(uTime * 0.3 + position.z) * 0.3;
          vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; vK = fract(position.z * 3.1);
          vA = smoothstep(45.0, 5.0, -mv.z); gl_PointSize = uPR * 2.6 * (6.0 / max(-mv.z, 1.0)); }`,
      fragmentShader: `varying float vA; varying float vK; void main(){ float d = length(gl_PointCoord - 0.5); vec3 c = mix(vec3(1.0, 0.31, 0.64), vec3(0.75, 0.6, 1.0), vK); gl_FragColor = vec4(c * 1.3 * smoothstep(0.5, 0.0, d) * vA, 1.0); }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    })
    // essay arc: a thin glowing ring on the floor
    const arcGeo = new THREE.RingGeometry(7.0, 7.08, 96, 1, Math.PI * 0.12, Math.PI * 0.76)
    const arcMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff4fa3').multiplyScalar(2.2), toneMapped: false, side: THREE.DoubleSide })
    return { floorGeo, floorMat, coneGeo, coneMat, moteGeo, moteMat, arcGeo, arcMat }
  }, [mobile])

  useEffect(
    () => () => {
      const p = parts
      for (const o of [p.floorGeo, p.floorMat, p.coneGeo, p.coneMat, p.moteGeo, p.moteMat, p.arcGeo, p.arcMat]) o.dispose()
    },
    [parts],
  )

  useFrame(({ clock }) => {
    parts.moteMat.uniforms.uTime.value = clock.elapsedTime
  })

  const base = designBase('portal')
  return (
    <group>
      <mesh geometry={parts.floorGeo} material={parts.floorMat} rotation-x={-Math.PI / 2} position={[0, -2.4, -60]} />
      <points geometry={parts.moteGeo} material={parts.moteMat} renderOrder={5} frustumCulled={false} />
      <mesh geometry={parts.arcGeo} material={parts.arcMat} rotation-x={-Math.PI / 2} position={[0, -2.38, BLOG_Z]} />
      {artLayout.map((pl) => (
        <group key={pl.item.slug}>
          <mesh geometry={parts.coneGeo} material={parts.coneMat} position={[pl.pos.x, 4.2, pl.pos.z]} renderOrder={5} />
          <Panel
            world="design"
            placed={pl}
            url={pl.item.image}
            enabled={enabled}
            tint="#ff7cbf"
            fit="fit"
            maxW={3.3}
            href={`${base}/journal?art=${pl.item.slug}`}
          />
        </group>
      ))}
      {blogLayout.map((pl) => (
        <Panel
          key={pl.item.slug}
          world="design"
          placed={pl}
          url={pl.item.cover}
          enabled={enabled}
          tint="#c9a2ff"
          href={pl.item.url}
          external
        />
      ))}
    </group>
  )
}
