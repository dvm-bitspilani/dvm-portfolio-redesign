import * as THREE from 'three'
import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { CHAMBER_Z, FLOOR_Y, RINGS, shieldPoints } from '../layout'
import { RO, fogShader, loopSegments, makeLines, stencilTest } from './stencil'
import { obsidian } from './Gate'

const FLOOR_FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec3 uRings;
  varying vec3 vW;
  float sq(float x) { return x * x; }
  #include <fog_pars_fragment>
  void main(){
    vec3 teal = vec3(0.13, 0.78, 0.72);
    vec3 mag = vec3(1.0, 0.31, 0.64);
    vec3 col = vec3(0.006, 0.016, 0.02);
    float ax = abs(vW.x);
    // twin light lanes converging on the vanishing point
    float lane = exp(-sq((ax - 2.4) * 16.0));
    col += teal * lane * 0.9;
    // centre dash, drifting toward the portals
    float dash = step(0.62, fract(vW.z * 0.22 + uTime * 0.25)) * exp(-sq(vW.x * 26.0));
    col += mag * dash * 0.55;
    // fine survey grid
    vec2 gp = vW.xz / 2.0;
    vec2 g = abs(fract(gp - 0.5) - 0.5) / fwidth(gp);
    float grid = 1.0 - min(min(g.x, g.y), 1.0);
    col += teal * grid * 0.03 * smoothstep(30.0, 4.0, ax);
    // pools of light under each frame and in the chamber
    float pools = 0.0;
    pools += exp(-sq(vW.z - uRings.x) * 0.18);
    pools += exp(-sq(vW.z - uRings.y) * 0.18);
    pools += exp(-sq(vW.z - uRings.z) * 0.18);
    col += mag * pools * exp(-ax * ax * 0.03) * 0.07;
    float cham = exp(-sq(vW.z - ${CHAMBER_Z.toFixed(1)}) * 0.012) * exp(-ax * ax * 0.012);
    col += teal * cham * 0.06;
    float gateGlow = exp(-sq(vW.z + 1.0) * 0.08) * exp(-ax * ax * 0.05);
    col += mag * gateGlow * 0.05;
    gl_FragColor = vec4(col, 1.0);
    #include <fog_fragment>
  }
`

const FLOOR_VERT = /* glsl */ `
  varying vec3 vW;
  #include <fog_pars_vertex>
  void main(){
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    vec4 mvPosition = viewMatrix * w;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`

/** Additive radial glow card (backlight). */
export function haloMaterial(color: string, power = 1, stencilRef = 0) {
  const m = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color).multiplyScalar(power) }, uOpacity: { value: 1 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 uColor; uniform float uOpacity; varying vec2 vUv;
      void main(){ vec2 c = vUv - 0.5; float d = length(c * vec2(1.0, 1.25));
        float a = exp(-d * d * 14.0) * 0.8 + exp(-d * 5.0) * 0.25;
        a *= smoothstep(0.5, 0.32, max(abs(c.x), abs(c.y)));
        gl_FragColor = vec4(uColor * a * uOpacity, 1.0); }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  })
  return stencilTest(m, stencilRef)
}

export function Corridor() {
  const parts = useMemo(() => {
    const floorGeo = new THREE.PlaneGeometry(90, 190, 1, 1)
    const floorMat = fogShader({
      uniforms: { uTime: { value: 0 }, uRings: { value: new THREE.Vector3(RINGS[0].z, RINGS[1].z, RINGS[2].z) } },
      vertex: FLOOR_VERT,
      fragment: FLOOR_FRAG,
    })
    const rings = RINGS.map((r, i) => {
      const pts = shieldPoints(r.w)
      const inner = shieldPoints(r.w - 0.34)
      const shape = new THREE.Shape(pts)
      shape.holes.push(new THREE.Path([...inner].reverse()))
      const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false })
      geo.translate(0, 0, -0.15)
      const color = i === 1 ? '#47e5d3' : '#ff4fa3'
      const front = makeLines(loopSegments(pts, 0.16), color, 1.5, 2.6)
      const innerL = makeLines(loopSegments(inner, 0.16), color, 1.0, 1.2)
      return { geo, front, innerL, r }
    })
    const frameMat = obsidian()
    const haloGate = haloMaterial('#1fb5ac', 0.2)
    const haloChamber = haloMaterial('#1fb5ac', 0.22)
    const haloCore = haloMaterial('#ff4fa3', 0.22)
    const plane = new THREE.PlaneGeometry(1, 1)
    // chamber dais: concentric rings
    const daisGeo = new THREE.CircleGeometry(13, 96)
    const daisMat = fogShader({
      uniforms: { uTime: { value: 0 } },
      vertex: /* glsl */ `varying vec2 vP;
        #include <fog_pars_vertex>
        void main(){ vP = position.xy; vec4 mvPosition = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
        }`,
      fragment: /* glsl */ `uniform float uTime; varying vec2 vP;
        #include <fog_pars_fragment>
        void main(){
          float r = length(vP);
          float rings = smoothstep(0.035, 0.0, abs(fract(r * 0.9 - uTime * 0.05) - 0.5) - 0.46);
          vec3 col = vec3(0.01, 0.025, 0.03) + vec3(0.13, 0.78, 0.72) * rings * 0.12 * smoothstep(13.0, 3.0, r);
          col += vec3(1.0, 0.31, 0.64) * 0.06 * exp(-r * 0.35);
          gl_FragColor = vec4(col, 1.0);
          #include <fog_fragment>
        }`,
    })
    daisMat.polygonOffset = true
    daisMat.polygonOffsetFactor = -1
    return { floorGeo, floorMat, rings, frameMat, haloGate, haloChamber, haloCore, plane, daisGeo, daisMat }
  }, [])

  useEffect(
    () => () => {
      const p = parts
      p.floorGeo.dispose()
      p.floorMat.dispose()
      p.frameMat.dispose()
      p.haloGate.dispose()
      p.haloChamber.dispose()
      p.haloCore.dispose()
      p.plane.dispose()
      p.daisGeo.dispose()
      p.daisMat.dispose()
      for (const r of p.rings) {
        r.geo.dispose()
        for (const l of [r.front, r.innerL]) {
          l.geometry.dispose()
          l.material.dispose()
        }
      }
    },
    [parts],
  )

  useFrame(({ clock, camera }) => {
    // the gate backlight only reads from in front of the gate
    parts.haloGate.uniforms.uOpacity.value = THREE.MathUtils.smoothstep(camera.position.z, -4, 6)
    parts.floorMat.uniforms.uTime.value = clock.elapsedTime
    parts.daisMat.uniforms.uTime.value = clock.elapsedTime
  })

  return (
    <group>
      <mesh geometry={parts.floorGeo} material={parts.floorMat} rotation-x={-Math.PI / 2} position={[0, FLOOR_Y, -55]} />
      <mesh geometry={parts.daisGeo} material={parts.daisMat} rotation-x={-Math.PI / 2} position={[0, FLOOR_Y + 0.02, CHAMBER_Z + 1]} />
      {parts.rings.map(({ geo, front, innerL, r }) => (
        <group key={r.id} position={[0, r.y, r.z]}>
          <mesh geometry={geo} material={parts.frameMat} />
          <primitive object={front} />
          <primitive object={innerL} />
        </group>
      ))}
      {/* backlights: silhouette the gate and the portals */}
      <mesh geometry={parts.plane} material={parts.haloGate} position={[0, 0.6, -9]} scale={[34, 26, 1]} renderOrder={RO.outside} />
      <mesh geometry={parts.plane} material={parts.haloChamber} position={[0, 0, CHAMBER_Z - 9]} scale={[44, 30, 1]} renderOrder={RO.outside} />
      <mesh geometry={parts.plane} material={parts.haloCore} position={[0, -0.4, CHAMBER_Z - 7]} scale={[14, 10, 1]} renderOrder={RO.outside} />
    </group>
  )
}
