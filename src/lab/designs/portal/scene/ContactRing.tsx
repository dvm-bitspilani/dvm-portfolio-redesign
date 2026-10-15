import * as THREE from 'three'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { GATE_DEPTH, GATE_S } from '../layout'
import { store } from '../store'
import { RO, stencilTest } from './stencil'

/** Contact: the gate transmits. Rings of signal pulse outward from the cavity. */
export function ContactRing() {
  const mesh = useRef<THREE.Mesh>(null)
  const amt = useRef(0)
  const { geo, mat } = useMemo(() => {
    const g = new THREE.PlaneGeometry(60, 60)
    const m = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uAmt: { value: 0 } },
      vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `uniform float uTime; uniform float uAmt; varying vec2 vP;
        void main(){
          float r = length(vP * vec2(1.0, 1.15));
          float a = atan(vP.y, vP.x);
          float w = fract(r * 0.3 - uTime * 0.45);
          float ring = smoothstep(0.0, 0.015, w) * smoothstep(0.05, 0.015, w);
          float dash = step(0.35, fract(a * 9.549 + r * 0.05 - uTime * 0.2));
          float fall = smoothstep(29.0, 4.0, r) * smoothstep(1.4, 3.2, r);
          vec3 mag = vec3(1.0, 0.31, 0.64);
          vec3 teal = vec3(0.16, 0.85, 0.78);
          vec3 col = mix(mag, teal, smoothstep(4.0, 22.0, r)) * ring * (0.35 + 0.65 * dash) * fall * 0.9;
          gl_FragColor = vec4(col * uAmt, 1.0);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    })
    stencilTest(m, 0)
    return { geo: g, mat: m }
  }, [])
  useEffect(
    () => () => {
      geo.dispose()
      mat.dispose()
    },
    [geo, mat],
  )
  useFrame(({ clock }, dt) => {
    const on = store.get().target.kind === 'contact' ? 1 : 0
    amt.current += (on - amt.current) * (1 - Math.exp(-dt * 2.5))
    mat.uniforms.uAmt.value = amt.current
    mat.uniforms.uTime.value = clock.elapsedTime
    if (mesh.current) mesh.current.visible = amt.current > 0.01
  })
  return <mesh ref={mesh} geometry={geo} material={mat} position={[0, 0, (GATE_DEPTH / 2) * GATE_S - 0.9]} renderOrder={RO.outside} visible={false} />
}
