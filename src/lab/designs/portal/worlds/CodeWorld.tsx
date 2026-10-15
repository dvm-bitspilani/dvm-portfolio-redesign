import * as THREE from 'three'
import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { designBase } from '../../registry'
import { codeLayout } from '../layout'
import { fogShader } from '../scene/stencil'
import { Panel } from './kit'

/** CODE: a glowing survey grid with data towers; project screens line an avenue into depth. */
export function CodeWorld({ enabled, mobile }: { enabled: boolean; mobile: boolean }) {
  const parts = useMemo(() => {
    const floorGeo = new THREE.PlaneGeometry(170, 170)
    const floorMat = fogShader({
      uniforms: { uTime: { value: 0 } },
      vertex: /* glsl */ `varying vec2 vP;
        #include <fog_pars_vertex>
        void main(){ vP = position.xy; vec4 mvPosition = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
        }`,
      fragment: /* glsl */ `uniform float uTime; varying vec2 vP;
        #include <fog_pars_fragment>
        float h1(float n){ return fract(sin(n * 91.7) * 43758.5); }
        void main(){
          vec3 teal = vec3(0.12, 0.88, 0.8);
          vec3 mag = vec3(1.0, 0.31, 0.64);
          vec2 p = vP;
          vec2 g1 = abs(fract(p / 2.0 - 0.5) - 0.5) / fwidth(p / 2.0);
          float minor = 1.0 - min(min(g1.x, g1.y), 1.0);
          vec2 g2 = abs(fract(p / 10.0 - 0.5) - 0.5) / fwidth(p / 10.0);
          float major = 1.0 - min(min(g2.x, g2.y), 1.0);
          vec3 col = vec3(0.004, 0.02, 0.022);
          col += teal * (minor * 0.08 + major * 0.32);
          // packets racing along the major lines toward the viewer
          float lx = floor(p.x / 10.0 + 0.5);
          float onLine = 1.0 - smoothstep(0.0, 0.09, abs(p.x - lx * 10.0));
          float pk = smoothstep(0.92, 1.0, fract(p.y * 0.035 + uTime * (0.25 + h1(lx) * 0.4) + h1(lx + 3.0)));
          col += mix(teal, mag, h1(lx + 7.0)) * onLine * pk * 2.2;
          float ly = floor(p.y / 10.0 + 0.5);
          float onLineY = 1.0 - smoothstep(0.0, 0.09, abs(p.y - ly * 10.0));
          float pky = smoothstep(0.94, 1.0, fract(p.x * 0.03 - uTime * (0.2 + h1(ly) * 0.3) + h1(ly + 5.0)));
          col += teal * onLineY * pky * 1.6;
          gl_FragColor = vec4(col, 1.0);
          #include <fog_fragment>
        }`,
    })
    // data towers
    const n = mobile ? 60 : 150
    const towerGeo = new THREE.BoxGeometry(1, 1, 1)
    towerGeo.translate(0, 0.5, 0)
    const towerMat = new THREE.MeshStandardMaterial({ color: '#06171a', emissive: '#0b4846', emissiveIntensity: 0.55, roughness: 0.35, metalness: 0.6 })
    const towers = new THREE.InstancedMesh(towerGeo, towerMat, n)
    const capGeo = new THREE.PlaneGeometry(1, 1)
    capGeo.rotateX(-Math.PI / 2)
    const capMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#38e1cf').multiplyScalar(1.8), toneMapped: false })
    const caps = new THREE.InstancedMesh(capGeo, capMat, n)
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const col = new THREE.Color()
    for (let i = 0; i < n; i++) {
      const side = i % 2 === 0 ? -1 : 1
      const x = side * (8 + Math.pow(Math.random(), 1.4) * 34)
      const z = 4 - Math.random() * 120
      const w = 1 + Math.random() * 2.4
      const hgt = 0.6 + Math.pow(Math.random(), 2.2) * 16
      m.compose(new THREE.Vector3(x, -2.4, z), q, new THREE.Vector3(w, hgt, w))
      towers.setMatrixAt(i, m)
      m.compose(new THREE.Vector3(x, -2.4 + hgt + 0.01, z), q, new THREE.Vector3(w * 0.96, 1, w * 0.96))
      caps.setMatrixAt(i, m)
      caps.setColorAt(i, Math.random() < 0.18 ? col.set('#ff4fa3').multiplyScalar(2) : col.set('#38e1cf').multiplyScalar(0.6 + Math.random() * 1.4))
    }
    towers.computeBoundingSphere()
    caps.computeBoundingSphere()
    // rising data motes
    const mc = mobile ? 300 : 900
    const mp = new Float32Array(mc * 3)
    for (let i = 0; i < mc; i++) mp.set([(Math.random() - 0.5) * 40, Math.random() * 14 - 2.4, 4 - Math.random() * 115], i * 3)
    const moteGeo = new THREE.BufferGeometry()
    moteGeo.setAttribute('position', new THREE.BufferAttribute(mp, 3))
    const moteMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uPR: { value: Math.min(window.devicePixelRatio, 2) } },
      vertexShader: `uniform float uTime; uniform float uPR; varying float vA;
        void main(){ vec3 p = position; p.y = mod(p.y + 2.4 + uTime * (0.3 + fract(position.x) * 0.6), 14.0) - 2.4;
          vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
          vA = smoothstep(60.0, 8.0, -mv.z); gl_PointSize = uPR * 3.0 * (6.0 / max(-mv.z, 1.0)); }`,
      fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(0.3, 1.0, 0.92) * 1.6 * smoothstep(0.5, 0.0, d) * vA, 1.0); }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    })
    return { floorGeo, floorMat, towers, towerGeo, towerMat, caps, capGeo, capMat, moteGeo, moteMat }
  }, [mobile])

  useEffect(
    () => () => {
      const p = parts
      p.floorGeo.dispose()
      p.floorMat.dispose()
      p.towerGeo.dispose()
      p.towerMat.dispose()
      p.capGeo.dispose()
      p.capMat.dispose()
      p.towers.dispose()
      p.caps.dispose()
      p.moteGeo.dispose()
      p.moteMat.dispose()
    },
    [parts],
  )

  useFrame(({ clock }) => {
    parts.floorMat.uniforms.uTime.value = clock.elapsedTime
    parts.moteMat.uniforms.uTime.value = clock.elapsedTime
  })

  const base = designBase('portal')
  return (
    <group>
      <mesh geometry={parts.floorGeo} material={parts.floorMat} rotation-x={-Math.PI / 2} position={[0, -2.4, -55]} />
      <primitive object={parts.towers} />
      <primitive object={parts.caps} />
      <points geometry={parts.moteGeo} material={parts.moteMat} frustumCulled={false} renderOrder={4} />
      {codeLayout.map((pl) => (
        <Panel
          key={pl.item.slug}
          world="code"
          placed={pl}
          url={pl.item.cover}
          enabled={enabled}
          tint="#38e1cf"
          href={`${base}/work/${pl.item.slug}`}
        />
      ))}
    </group>
  )
}
