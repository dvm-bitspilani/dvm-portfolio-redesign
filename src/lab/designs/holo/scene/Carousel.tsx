import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { useEffect, useMemo, useRef } from 'react'
import type { Project } from '../../../data'
import { CYAN, ICE, VIOLET, loadTexture, makeSignal, titleTexture, useDisposable, type Signal } from './common'
import { LabTable, Projector } from './Projector'
import { imageFrag, imageVert } from './shaders'

const CARD_W = 1.6
const CARD_H = 1.0
const CARD_Y = 1.45

export interface CarouselProps {
  items: Project[]
  active: number
  onActive: (i: number) => void
  onOpen: (p: Project) => void
  reduced: boolean
  frameloop: 'always' | 'never' | 'demand'
}

interface CardRuntime {
  mat: THREE.ShaderMaterial
  tex: THREE.Texture
  glitch: number
  solid: number
}

function radiusFor(n: number) {
  return Math.max(3.2, (n * (CARD_W + 0.32)) / (Math.PI * 2))
}

function Ring({ items, active, onActive, onOpen, reduced, signal }: CarouselProps & { signal: Signal }) {
  const group = useRef<THREE.Group>(null)
  const n = items.length
  const R = radiusFor(n)
  const step = (Math.PI * 2) / Math.max(n, 1)
  const theta = useRef(-active * step)
  const drag = useRef({ on: false, x: 0, start: 0, moved: 0 })
  const { camera, gl } = useThree()

  const geo = useDisposable(() => new THREE.PlaneGeometry(CARD_W, CARD_H, 1, 24), [])

  const cards = useMemo<CardRuntime[]>(() => {
    return items.map((p) => {
      const mat = new THREE.ShaderMaterial({
        vertexShader: imageVert,
        fragmentShader: imageFrag,
        uniforms: {
          uMap: { value: null },
          uTime: { value: 0 },
          uGlitch: { value: 1 },
          uSolid: { value: 0 },
          uOpacity: { value: 1 },
          uBuild: { value: reduced ? 1 : 0 },
          uScanY: { value: -10 },
          uBand: { value: 0.1 },
          uScanOn: { value: 0 },
          uCover: { value: new THREE.Vector2(1, 1) },
          uColor: { value: CYAN.clone() },
          uColorB: { value: VIOLET.clone() },
        },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      })
      const src = p.cover ?? p.mockup
      const fit = (t: THREE.Texture) => {
        const img = t.image as { width: number; height: number } | undefined
        if (!img?.width) return
        const ia = img.width / img.height
        const ca = CARD_W / CARD_H
        mat.uniforms.uCover.value.set(ia > ca ? ca / ia : 1, ia > ca ? 1 : ia / ca)
      }
      const tex = src ? loadTexture(src, fit) : titleTexture(p.title, `${p.fest} ${p.year ?? ''}`.trim())
      if (!src) fit(tex)
      mat.uniforms.uMap.value = tex
      return { mat, tex, glitch: 1, solid: 0 }
    })
  }, [items, reduced])

  useEffect(
    () => () => {
      for (const c of cards) {
        c.mat.dispose()
        c.tex.dispose()
      }
    },
    [cards],
  )

  // a glitch spike on the newly focused card
  useEffect(() => {
    const c = cards[active]
    if (c) c.glitch = 0.9
  }, [active, cards])

  // drag to rotate
  useEffect(() => {
    const el = gl.domElement
    const down = (e: PointerEvent) => {
      drag.current = { on: true, x: e.clientX, start: theta.current, moved: 0 }
    }
    const move = (e: PointerEvent) => {
      const d = drag.current
      if (!d.on) return
      const dx = e.clientX - d.x
      d.moved = Math.max(d.moved, Math.abs(dx))
      theta.current = d.start + (dx / el.clientWidth) * step * 6
    }
    const up = () => {
      const d = drag.current
      if (!d.on) return
      d.on = false
      if (d.moved > 6) {
        const idx = ((Math.round(-theta.current / step) % n) + n) % n
        onActive(idx)
      }
    }
    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [gl, step, n, onActive])

  const look = useMemo(() => new THREE.Vector3(0, CARD_Y + 0.2, R - 3.2), [R])

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20)
    if (!reduced) signal.time += dt
    // shortest path to target angle
    if (!drag.current.on) {
      const target = -active * step
      let diff = target - theta.current
      diff = Math.atan2(Math.sin(diff), Math.cos(diff))
      theta.current += diff * (1 - Math.exp(-dt * (reduced ? 30 : 5)))
    }
    const g = group.current
    if (!g) return
    for (let i = 0; i < g.children.length; i++) {
      const m = g.children[i] as THREE.Mesh
      const c = cards[i]
      if (!c) continue
      const a = i * step + theta.current
      m.position.set(Math.sin(a) * R, CARD_Y + Math.sin(signal.time * 0.8 + i) * 0.02, Math.cos(a) * R)
      m.rotation.set(0, a, 0)
      const facing = Math.cos(a)
      const isActive = i === active
      c.solid = THREE.MathUtils.damp(c.solid, isActive && facing > 0.97 ? 1 : 0, 4, dt)
      c.glitch = THREE.MathUtils.damp(c.glitch, isActive ? 0.0 : 0.04, 3.5, dt)
      const u = c.mat.uniforms
      u.uTime.value = signal.time + i * 3.1
      u.uSolid.value = c.solid
      u.uGlitch.value = c.glitch
      u.uOpacity.value = 0.12 + 0.88 * THREE.MathUtils.smoothstep(facing, -0.2, 1)
      u.uBuild.value = Math.min(1, u.uBuild.value + dt * 0.9)
      m.renderOrder = Math.round(facing * 100) + 10
    }
    camera.position.set(Math.sin(signal.time * 0.15) * 0.15, CARD_Y + 1.15, R + 4.9)
    camera.lookAt(look)
    void state
  })

  return (
    <group ref={group}>
      {items.map((p, i) => (
        <mesh
          key={p.slug}
          geometry={geo}
          material={cards[i]?.mat}
          onClick={(e) => {
            e.stopPropagation()
            if (drag.current.moved > 6) return
            if (i === active) onOpen(p)
            else onActive(i)
          }}
          onPointerOver={() => (document.body.style.cursor = 'pointer')}
          onPointerOut={() => (document.body.style.cursor = '')}
        />
      ))}
    </group>
  )
}

export default function Carousel(props: CarouselProps) {
  const signal = useMemo(makeSignal, [])
  useEffect(() => () => void (document.body.style.cursor = ''), [])
  return (
    <Canvas
      className="holo-canvas"
      dpr={[1, 1.75]}
      frameloop={props.frameloop}
      camera={{ position: [0, 3, 12], fov: 30, near: 0.1, far: 80 }}
      gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
      aria-hidden="true"
    >
      <color attach="background" args={['#020508']} />
      <fog attach="fog" args={['#020508', 9, 30]} />
      <ambientLight intensity={0.3} color={ICE} />
      <pointLight position={[0, 0.6, 0]} intensity={6} color="#5ef2ff" distance={8} />
      <LabTable signal={signal} />
      <Projector signal={signal} height={2.6} spread={1.4} intensity={0.3} dust={600} />
      <Ring {...props} signal={signal} />
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <Bloom mipmapBlur intensity={0.9} luminanceThreshold={0.55} luminanceSmoothing={0.2} radius={0.7} />
      </EffectComposer>
    </Canvas>
  )
}
