import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import type { View } from '../content'
import { anchors, signEls, useCampus } from '../store'
import { CameraRig } from './CameraRig'
import { Scene } from './Scene'
import { PAL } from './materials'

/** Projects registered DOM signs onto their world anchors every frame, depth-sorts them and fades the ones that collide. */
function SignProjector() {
  const { camera, size } = useThree()
  const tmp = useMemo(
    () => ({ v: new THREE.Vector3(), items: [] as { el: HTMLElement; x: number; y: number; d: number; w: number; h: number }[], frame: 0 }),
    [],
  )
  useFrame(() => {
    const { v, items } = tmp
    items.length = 0
    tmp.frame++
    for (const [id, el] of signEls) {
      const a = anchors.get(el.dataset.anchor ?? id)
      if (!a) {
        el.style.visibility = 'hidden'
        continue
      }
      v.set(a.x, a.y, a.z)
      const d = v.distanceToSquared(camera.position)
      v.project(camera)
      let on = v.z < 1 && v.x > -1.2 && v.x < 1.2 && v.y > -1.2 && v.y < 1.2
      // captions must clear the top chrome
      if (on && id === 'caption') on = (1 - v.y) / 2 * size.height > 150 && Math.abs(v.x) < 0.98
      el.style.visibility = on ? '' : 'hidden'
      if (!on) continue
      const x = Math.round(((v.x + 1) / 2) * size.width * 10) / 10
      const y = Math.round(((1 - v.y) / 2) * size.height * 10) / 10
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`
      if (el.classList.contains('cmp-sign')) {
        // plate size is cached and refreshed occasionally (avoids layout reads every frame)
        if (!el.dataset.w || tmp.frame % 90 === 0) {
          const plate = el.firstElementChild as HTMLElement | null
          el.dataset.w = String(plate?.offsetWidth ?? 120)
          el.dataset.h = String((plate?.offsetHeight ?? 44) + 40)
        }
        const w = +el.dataset.w!
        // keep the plate on screen; the stem stays on the building
        const dx = Math.max(w / 2 + 10 - x, Math.min(0, size.width - w / 2 - 10 - x))
        const dxs = `${Math.round(dx)}px`
        if (el.style.getPropertyValue('--dx') !== dxs) el.style.setProperty('--dx', dxs)
        items.push({ el, x: x + dx, y, d, w, h: +el.dataset.h! })
      }
    }
    items.sort((a, b) => a.d - b.d)
    for (let i = 0; i < items.length; i++) {
      const a = items[i]
      let hidden = false
      for (let j = 0; j < i && !hidden; j++) {
        const b = items[j]
        if (b.el.dataset.buried === '1') continue
        hidden = Math.abs(a.x - b.x) < (a.w + b.w) / 2 + 6 && Math.abs(a.y - a.h / 2 - (b.y - b.h / 2)) < (a.h + b.h) / 2 - 30
      }
      const flag = hidden ? '1' : '0'
      if (a.el.dataset.buried !== flag) a.el.dataset.buried = flag
      a.el.style.zIndex = String(50 - i)
    }
  })
  return null
}

function SceneFog() {
  const { scene } = useThree()
  useEffect(() => {
    const f = new THREE.Fog(PAL.fog, 30, 90)
    scene.fog = f
    return () => {
      scene.fog = null
    }
  }, [scene])
  return null
}

export default function World({ view, reduced, mobile, go }: { view: View; reduced: boolean; mobile: boolean; go: (to: string) => void }) {
  const listOpen = useCampus((s) => s.listOpen)
  const [hidden, setHidden] = useState(() => document.hidden)
  useEffect(() => {
    const on = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', on)
    return () => document.removeEventListener('visibilitychange', on)
  }, [])
  const active = !hidden && !listOpen

  return (
    <Canvas
      className="cmp-canvas"
      frameloop={active ? 'always' : 'never'}
      dpr={[1, mobile ? 1.5 : 2]}
      gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
      camera={{ fov: 34, near: 0.05, far: 220, position: [20, 18, 24] }}
      onCreated={({ gl }) => {
        gl.setClearColor(PAL.skyTop)
      }}
      aria-hidden="true"
    >
      <SceneFog />
      <Scene view={view} reduced={reduced} mobile={mobile} go={go} />
      <CameraRig view={view} reduced={reduced} mobile={mobile} />
      <SignProjector />
      <EffectComposer multisampling={mobile ? 0 : 4} enableNormalPass={false}>
        <Bloom mipmapBlur intensity={0.95} luminanceThreshold={0.82} luminanceSmoothing={0.2} radius={0.72} />
        <Vignette offset={0.28} darkness={0.62} />
      </EffectComposer>
    </Canvas>
  )
}
