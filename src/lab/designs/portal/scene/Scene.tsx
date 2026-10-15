import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing'
import { RenderPass, ToneMappingMode } from 'postprocessing'
import type { Camera, Scene as ThreeScene } from 'three'
import { live, usePortal } from '../store'
import { AnchorProjector } from '../ui/anchors'
import { CameraRig } from './CameraRig'
import { ContactRing } from './ContactRing'
import { Corridor } from './Corridor'
import { Gate } from './Gate'
import { Portals } from './Portals'
import { Streaks } from './Streaks'
import { TeamSky } from './TeamSky'
import { SanitizeEffect, WarpEffect } from './WarpEffect'

function Effects({ reduced, mobile }: { reduced: boolean; mobile: boolean }) {
  const warp = useMemo(() => new WarpEffect(), [])
  const clean = useMemo(() => new SanitizeEffect(), [])
  useEffect(
    () => () => {
      warp.dispose()
      clean.dispose()
    },
    [warp, clean],
  )
  useFrame(() => {
    warp.strength = reduced ? 0 : Math.min(Math.max((live.speed - 4) / 26, 0), 1.25)
    warp.time = (performance.now() / 1000) % 100
  })
  return (
    <EffectComposer multisampling={mobile ? 0 : 4} stencilBuffer mergeMode="none" renderPass={stencilClearingPass}>
      <primitive object={clean} dispose={null} />
      <Bloom mipmapBlur intensity={mobile ? 0.7 : 0.95} luminanceThreshold={0.9} luminanceSmoothing={0.25} radius={0.72} />
      <primitive object={warp} dispose={null} />
      <Vignette offset={0.22} darkness={0.78} />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
    </EffectComposer>
  )
}

/** The stencil carries portal ids, so it must be cleared every frame (RenderPass skips it by default). */
const stencilClearingPass = (scene: ThreeScene, camera: Camera) => {
  const p = new RenderPass(scene, camera)
  p.clearPass.setClearFlags(true, true, true)
  return p
}

const OUTER_STREAKS = ['#ff4fa3', '#47e5d3', '#e9f1ef']

export function Scene({ reduced, mobile }: { reduced: boolean; mobile: boolean }) {
  const space = usePortal((s) => s.space)
  const outside = space === 'outside'
  return (
    <>
      <color attach="background" args={['#03080b']} />
      <fogExp2 attach="fog" args={['#050d11', 0.02]} />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" color="#ff4fa3" intensity={3} position={[0, 5, 14]} scale={[16, 1.2, 1]} />
        <Lightformer form="rect" color="#47e5d3" intensity={1.3} position={[-12, 0, 8]} scale={[3, 14, 1]} />
        <Lightformer form="rect" color="#e9f1ef" intensity={1.6} position={[10, -2, 10]} scale={[2, 10, 1]} />
        <Lightformer form="ring" color="#47e5d3" intensity={0.8} position={[0, 0, -20]} scale={8} />
        <Lightformer form="rect" color="#ffffff" intensity={0.8} position={[0, 14, 0]} rotation-x={Math.PI / 2} scale={[20, 4, 1]} />
      </Environment>
      <ambientLight intensity={0.12} />
      <directionalLight position={[-6, 10, 8]} intensity={0.5} color="#9fe8e0" />
      <CameraRig />
      <group visible={outside}>
        <Gate />
        <Corridor />
        <ContactRing />
        <TeamSky />
        {outside && <Streaks count={mobile ? 600 : 1600} colors={OUTER_STREAKS} />}
      </group>
      <Portals mobile={mobile} />
      <AnchorProjector />
      <Effects reduced={reduced} mobile={mobile} />
    </>
  )
}
