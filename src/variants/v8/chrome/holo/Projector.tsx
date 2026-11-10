// The hero's projector: the pedestal's body under the original projector's light.
//
// The model (dimensions in home/stageLayout.ts PEDESTAL): a stepped plinth of three machined
// graphite discs, each with a chamfered foot, a tapered side with a fine panel seam and a bright
// top chamfer, separated by recessed necks whose seams glow teal; fine vent slits on the middle
// disc, two status LEDs on the plinth deck, the lens recessed in a well under the top deck with a
// bright glass rim, and a slowly turning ring of fine ticks and segments hovering just outside
// the top disc. Graphite metal is lit by a tiny baked studio environment (stageKit.ts; satin if
// that bake fails).
//
// Everything else is the original projector's, as first shipped: always lit (no power-up), the
// bright HDR halo ring on the floor around the base, the lens face (rings, rotating ticks, a
// sweep, a pulse every 1 / 0.45 s; shaders.ts lensFrag), the flared cone with its inner core and
// fast shimmer / flicker (coneFrag), 1000 dust motes (400 on phones), the lab table with its
// markings on a reflective floor (LabTable below), and the dimming as the mark leaves the beam
// (`signal.lift`). The cone stands on the pedestal's lens. The parts of the pedestal that carry
// light follow the lens: the glass rim, the well and the vents glow with it, and the neck seams
// and the tick ring brighten with each lens pulse (the seams a beat later, top to bottom, as if
// it ran down the pedestal).
// Brightness: the lens, the halo, the rims, the seams and the cone are HDR (> 1) so they bloom on
// a normal laptop screen.
import * as THREE from 'three'
import { useCallback, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MeshReflectorMaterial } from '@react-three/drei'
import { CYAN, useDisposable, type Signal } from './common'
import { coneFrag, coneVert, dustFrag, dustVert, lensFrag, lensVert, tableFrag, tickRingFrag } from './shaders'
import { additive, stageLevels, useGlow, useGraphite, type ConeSpec } from './stageKit'
import { PEDESTAL, deckY, type PedestalDisc } from '../../home/stageLayout'

/** The original's HDR halo on the floor just outside the base (radius, colour). */
const HALO_R = 0.705
const HALO_RGB = [0.4, 2.0, 2.3] as const
/** The vent groups' centres on the middle disc, either side of the front (radians from +z). */
const VENT_CENTRES = [0.6, -0.6] as const
/** The status LEDs on the plinth deck (radius, angles from the front toward +x). */
const LED_R = 0.6
const LED_ANGLES = [0.5, 0.58] as const
/** How much later each neck seam catches the lens pulse (s, upper then lower). */
const SEAM_DELAY = [0.12, 0.24] as const

/** Thin slots set into a cylinder's side, in groups centred on the given angles (0 = facing the
 *  camera, +z), as one instanced mesh. */
function Vents({
  material,
  radius,
  y,
  height,
  centres,
  perGroup,
  pitch,
}: {
  material: THREE.Material
  radius: number
  y: number
  height: number
  centres: readonly number[]
  perGroup: number
  pitch: number
}) {
  const count = centres.length * perGroup
  const matrices = useMemo(() => {
    const out: THREE.Matrix4[] = []
    const q = new THREE.Quaternion()
    const up = new THREE.Vector3(0, 1, 0)
    for (const c of centres) {
      for (let i = 0; i < perGroup; i++) {
        const a = c + (i - (perGroup - 1) / 2) * pitch
        q.setFromAxisAngle(up, a)
        out.push(new THREE.Matrix4().compose(new THREE.Vector3(Math.sin(a) * radius, y, Math.cos(a) * radius), q, new THREE.Vector3(1, 1, 1)))
      }
    }
    return out
  }, [centres, perGroup, pitch, radius, y])
  const place = useCallback(
    (m: THREE.InstancedMesh | null) => {
      if (!m) return
      matrices.forEach((mat, i) => m.setMatrixAt(i, mat))
      m.instanceMatrix.needsUpdate = true
      m.computeBoundingSphere()
    },
    [matrices],
  )
  return (
    <instancedMesh ref={place} args={[undefined, material, count]}>
      <boxGeometry args={[0.009, height, 0.008]} />
    </instancedMesh>
  )
}

/** One machined disc: chamfered foot, tapered side, top chamfer, deck ring, a fine panel seam. */
function DiscMesh({ d, m }: { d: PedestalDisc; m: ReturnType<typeof useGraphite> }) {
  const { footH, chamferH } = PEDESTAL
  const sideY0 = d.y0 + footH
  const chamferY0 = sideY0 + d.sideH
  const top = deckY(d)
  return (
    <>
      <mesh position={[0, d.y0 + footH / 2, 0]} material={m.chamfer}>
        <cylinderGeometry args={[d.r, d.r - 0.012, footH, 128, 1, true]} />
      </mesh>
      <mesh position={[0, sideY0 + d.sideH / 2, 0]} material={m.body}>
        <cylinderGeometry args={[d.rTop, d.r, d.sideH, 128, 1, true]} />
      </mesh>
      <mesh position={[0, chamferY0 + chamferH / 2, 0]} material={m.chamfer}>
        <cylinderGeometry args={[d.rTop - d.chamfer, d.rTop, chamferH, 128, 1, true]} />
      </mesh>
      <mesh position={[0, top, 0]} rotation-x={-Math.PI / 2} material={m.deck}>
        <ringGeometry args={[d.rDeckIn, d.rTop - d.chamfer, 128]} />
      </mesh>
      <mesh position={[0, sideY0 + d.sideH * 0.62, 0]} rotation-x={-Math.PI / 2} material={m.seam}>
        <torusGeometry args={[d.rTop + 0.0028, 0.002, 4, 128]} />
      </mesh>
    </>
  )
}

export function Projector({ signal, cone, dust = 1000, intensity = 0.22 }: { signal: Signal; cone: ConeSpec; dust?: number; intensity?: number }) {
  const { baseY, height, baseR, topR } = cone
  const { discs, necks, lensY, lensR, ring: R } = PEDESTAL

  // ---- the pedestal's materials
  const m = useGraphite()
  const lensRim = useGlow()
  const seamGlow = [useGlow(), useGlow()] as const
  const ledSteady = useGlow()
  const ledBlink = useGlow()
  const halo = useDisposable(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(...HALO_RGB), toneMapped: false }), [])
  const ringMat = useDisposable(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: lensVert,
        fragmentShader: tickRingFrag,
        uniforms: { uTime: { value: 0 }, uPower: { value: 1 }, uInner: { value: R.inner / R.outer }, uColor: { value: CYAN.clone() } },
        side: THREE.DoubleSide,
        ...additive,
      }),
    [R.inner, R.outer],
  )
  const ring = useRef<THREE.Mesh>(null)

  // ---- the original's lens, beam and dust
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
        uniforms: { uTime: { value: 0 }, uPower: { value: 1 }, uIntensity: { value: intensity }, uColor: { value: CYAN.clone() } },
        side: THREE.DoubleSide,
        ...additive,
      }),
    [intensity],
  )
  const coneGeo = useDisposable(() => {
    const g = new THREE.CylinderGeometry(topR, baseR, height, 72, 1, true)
    g.translate(0, height / 2 + baseY, 0)
    return g
  }, [height, topR, baseR, baseY])
  const innerGeo = useDisposable(() => {
    const g = new THREE.CylinderGeometry(topR * 0.55, baseR * 0.6, height * 0.92, 48, 1, true)
    g.translate(0, (height * 0.92) / 2 + baseY, 0)
    return g
  }, [height, topR, baseR, baseY])
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
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, baseY + height / 2, 0), height)
    return g
  }, [dust, height, baseY])
  const dustMat = useDisposable(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: dustVert,
        fragmentShader: dustFrag,
        uniforms: {
          uTime: { value: 0 },
          uPixelRatio: { value: 1 },
          uHeight: { value: height },
          uBaseY: { value: baseY },
          // (the original's motes: 0.2 at the lens to 1.15 at the top of a 1.25 cone)
          uR0: { value: baseR },
          uR1: { value: topR * 0.92 },
          uColor: { value: CYAN.clone() },
          uPower: { value: 1 },
        },
        ...additive,
      }),
    [height, baseY, baseR, topR],
  )

  useFrame((state) => {
    const t = signal.time
    const L = stageLevels(signal)
    // the original's beam
    lensMat.uniforms.uTime.value = t
    lensMat.uniforms.uPower.value = L.lens
    coneMat.uniforms.uTime.value = t
    coneMat.uniforms.uPower.value = L.cone
    dustMat.uniforms.uTime.value = t
    dustMat.uniforms.uPower.value = 0.4 + 0.6 * L.p
    dustMat.uniforms.uPixelRatio.value = state.gl.getPixelRatio()
    // the pedestal's lit parts follow the lens (and its pulse)
    lensRim.color.setRGB(0.42, 2.0, 2.4).multiplyScalar(L.lens)
    m.well.emissiveIntensity = 0.55 * L.lens
    m.vent.color.setRGB(0.03, 0.2, 0.24).multiplyScalar(0.4 + 0.6 * L.p)
    seamGlow[0].color.setRGB(0.3, 1.55, 1.85).multiplyScalar(L.lens * (0.8 + 0.5 * L.pulseAt(SEAM_DELAY[0])))
    seamGlow[1].color.setRGB(0.3, 1.55, 1.85).multiplyScalar(L.lens * (0.8 + 0.5 * L.pulseAt(SEAM_DELAY[1])))
    ringMat.uniforms.uTime.value = t
    ringMat.uniforms.uPower.value = 1.15 * L.lens * (0.75 + 0.45 * L.pulse)
    // a slow turn (reduced motion: signal.time stands still, so does the ring)
    if (ring.current) ring.current.rotation.z = t * 0.06
    // status LEDs: a steady teal one, and a pale one that blinks slowly
    const on = 0.4 + 0.6 * L.p
    ledSteady.color.setRGB(0.35, 2.1, 2.5).multiplyScalar(on)
    ledBlink.color.setRGB(1.6, 1.9, 1.95).multiplyScalar(on * (0.25 + 0.75 * Math.pow(Math.max(0, Math.sin(t * 1.6)), 8)))
  })

  const top = discs[2]
  const wellTop = deckY(top)
  const wellH = wellTop - lensY
  return (
    <group>
      {discs.map((d) => (
        <DiscMesh key={d.y0} d={d} m={m} />
      ))}
      {/* recessed necks with glowing seams */}
      {necks.map((n, i) => (
        <group key={n.y0}>
          <mesh position={[0, (n.y0 + n.y1) / 2, 0]} material={m.seam}>
            <cylinderGeometry args={[n.r, n.r, n.y1 - n.y0, 96, 1, true]} />
          </mesh>
          <mesh position={[0, (n.y0 + n.y1) / 2, 0]} rotation-x={-Math.PI / 2} material={seamGlow[i]}>
            <torusGeometry args={[n.r + 0.001, 0.0035, 6, 128]} />
          </mesh>
        </group>
      ))}
      {/* vents on the middle disc */}
      <Vents
        material={m.vent}
        radius={discs[1].rTop + 0.001}
        y={discs[1].y0 + PEDESTAL.footH + discs[1].sideH * 0.42}
        height={0.04}
        centres={VENT_CENTRES}
        perGroup={7}
        pitch={0.036}
      />
      {/* status LEDs on the plinth deck */}
      {LED_ANGLES.map((a, i) => (
        <mesh key={a} position={[Math.sin(a) * LED_R, deckY(discs[0]) + 0.002, Math.cos(a) * LED_R]} material={i === 0 ? ledSteady : ledBlink}>
          <cylinderGeometry args={[0.011, 0.011, 0.004, 16]} />
        </mesh>
      ))}
      {/* the lens well, the lens and its glass rim */}
      <mesh position={[0, lensY + wellH / 2, 0]} material={m.well}>
        <cylinderGeometry args={[top.rDeckIn, lensR, wellH, 128, 1, true]} />
      </mesh>
      <mesh position={[0, lensY, 0]} rotation-x={-Math.PI / 2} material={lensMat}>
        <circleGeometry args={[lensR, 96]} />
      </mesh>
      <mesh position={[0, lensY + 0.002, 0]} rotation-x={-Math.PI / 2} material={lensRim}>
        <torusGeometry args={[lensR - 0.002, 0.0038, 6, 128]} />
      </mesh>
      {/* the turning tick ring around the top disc */}
      <mesh ref={ring} position={[0, R.y, 0]} rotation-x={-Math.PI / 2} material={ringMat} renderOrder={1}>
        <ringGeometry args={[R.inner, R.outer, 192, 1]} />
      </mesh>
      {/* the original's bright halo on the floor around the base */}
      <mesh position={[0, 0, 0]} rotation-x={-Math.PI / 2} material={halo}>
        <torusGeometry args={[HALO_R, 0.008, 8, 96]} />
      </mesh>
      {/* the beam: cone, inner core, dust */}
      <mesh geometry={coneGeo} material={coneMat} renderOrder={2} />
      <mesh geometry={innerGeo} material={coneMat} renderOrder={2} />
      <points geometry={dustGeo} material={dustMat} renderOrder={3} />
    </group>
  )
}

/** The original dark lab table with etched markings. Reflective on desktop, matte on phones
 *  (and wherever the reflector fails: the hero stage wraps the reflective one in a boundary that
 *  falls back to the matte one). */
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
    markMat.uniforms.uPower.value = (0.3 + 0.7 * signal.power) * (1 - signal.lift * 0.6)
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
