import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { CuboidCollider, RigidBody, useRapier, type RapierRigidBody } from '@react-three/rapier'
import gsap from 'gsap'
import { ChainPoser, getChains, makeLayout, panelGeometry, type Chain } from '../lib/strip'
import { createFibreTexture, createStripPrint, PAPER_HEX } from '../lib/paper'
import { heroFrame, MARK_HEIGHT, PAPER_THICKNESS, smooth, type StageState } from './stage'

type Mode = 'home' | 'held' | 'free' | 'return'

interface Runtime {
  mode: Mode
  body: RapierRigidBody | null
  meshes: (THREE.Mesh | null)[]
  poser: ChainPoser
  centre: THREE.Vector3
  half: THREE.Vector3
  negCentre: THREE.Matrix4
  vel: THREE.Vector3
  last: THREE.Vector3
  offset: THREE.Vector3
  freeT: number
  retT: number
  from: THREE.Vector3
  fromQ: THREE.Quaternion
  crumple: number[]
  relax: number[]
  cursorRelax: number[]
}

const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)

export default function PaperMark({ stage, active }: { stage: React.MutableRefObject<StageState>; active: boolean }) {
  const { rapier } = useRapier()
  const gl = useThree((s) => s.gl)
  const size = useThree((s) => s.size)
  const frame = useMemo(() => heroFrame(size.width / size.height), [size.width, size.height])

  const chains = getChains()
  // logo space is 1 unit tall, so the layout scale is the mark height in world units
  const layout = useMemo(() => makeLayout(MARK_HEIGHT, PAPER_THICKNESS), [])
  const S = layout.scale

  /* ------------------------------ materials ------------------------------ */
  const printUniform = useMemo(() => ({ value: 1 }), [])
  /* light-play uniforms shared by every paper material: a glint that follows the
     cursor across the copper, and a slow sweep of light across the foil */
  const fx = useMemo(
    () => ({
      uGlint: { value: new THREE.Vector3(0, 0, 0) },
      uGlintAmt: { value: 0 },
      uSweep: { value: -20 },
      uFoil: { value: new THREE.Color('#ffb27a') },
    }),
    [],
  )
  const mats = useMemo(() => {
    const coarse = stage.current.coarse
    const fibre = createFibreTexture(512)
    const stripLen = layout.total * S
    const stripW = chains[0].halfWidth * 2 * S
    fibre.repeat.set(stripLen / 0.32, stripW / 0.32)
    fibre.anisotropy = gl.capabilities.getMaxAnisotropy()
    const print = createStripPrint({ chains, layout, timeline: stage.current.timeline, width: coarse ? 4096 : 8192 })
    print.map.anisotropy = print.mrMap.anisotropy = gl.capabilities.getMaxAnisotropy()
    const GLINT = `
  {
    vec2 gd = vFoldWorld.xy - uGlint.xy;
    float cur = exp( -dot( gd, gd ) / 0.09 ) * uGlintAmt;
    float sw = vFoldWorld.x * 0.82 + vFoldWorld.y * 0.57 - uSweep;
    float band = exp( -sw * sw / 0.018 );
    totalEmissiveRadiance += uFoil * metalnessFactor * ( cur * 0.9 + band * 1.0 ) + uFoil * gilt * 0.1;
  }`
    const tone = (m: THREE.MeshStandardMaterial, kind: 'printed' | 'back' | 'edge') => {
      const printed = kind === 'printed'
      m.onBeforeCompile = (shader) => {
        shader.defines = { ...shader.defines, GILT: '0.06' }
        shader.uniforms.uPrint = printUniform
        shader.uniforms.uPaper = { value: new THREE.Color(PAPER_HEX) }
        Object.assign(shader.uniforms, fx)
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>\nvarying vec3 vFoldWorld;\nvarying vec2 vFoldUv;')
          .replace('#include <project_vertex>', '#include <project_vertex>\n  vFoldWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;\n  vFoldUv = uv;')
        shader.fragmentShader = shader.fragmentShader
          .replace(
            '#include <common>',
            `#include <common>
uniform float uPrint;
uniform vec3 uPaper;
uniform vec3 uGlint;
uniform float uGlintAmt;
uniform float uSweep;
uniform vec3 uFoil;
varying vec3 vFoldWorld;
varying vec2 vFoldUv;`,
          )
          .replace(
            '#include <map_fragment>',
            `#include <map_fragment>
${printed ? 'diffuseColor.rgb = mix( uPaper, diffuseColor.rgb, uPrint );' : ''}
#ifdef USE_BUMPMAP
  float fib = texture2D( bumpMap, vBumpMapUv ).r;
  diffuseColor.rgb *= 0.86 + 0.28 * fib;
#endif
  // gilt edges: a copper-foil band along both long edges of the strip, on both sides
  float giltE = min( vFoldUv.y, 1.0 - vFoldUv.y );
  float giltAA = fwidth( giltE ) * 0.75;
  float gilt = ${kind === 'edge' ? '0.0' : '1.0 - smoothstep( GILT - giltAA, GILT + giltAA, giltE )'};
  diffuseColor.rgb = mix( diffuseColor.rgb, uFoil * 0.92, gilt );`,
          )
          .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>\n${printed ? 'metalnessFactor *= uPrint;' : ''}\n  metalnessFactor = max( metalnessFactor, gilt );`)
          .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n${printed ? 'roughnessFactor = mix( 0.82, roughnessFactor, uPrint );' : ''}\n  roughnessFactor = mix( roughnessFactor, 0.3, gilt );`)
          // foil is smooth: take most of the fibre bump back off the copper (no glitter)
          .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n  normal = normalize( mix( normal, nonPerturbedNormal, max( gilt, metalnessFactor ) ) );`)
          .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${kind === 'back' ? '' : GLINT}`)
          // paper takes almost nothing from the environment (keeps the shadow side deep);
          // the copper keeps its reflections
          .replace(
            '#include <lights_fragment_maps>',
            `#include <lights_fragment_maps>
  iblIrradiance *= ${kind === 'edge' ? '1.0' : '0.22'};
  radiance *= mix( 0.3, 1.0, metalnessFactor );`,
          )
          // fibre grain shows only where light actually lands
          .replace(
            '#include <opaque_fragment>',
            `#ifdef USE_BUMPMAP
  float litLum = dot( outgoingLight, vec3( 0.2126, 0.7152, 0.0722 ) );
  outgoingLight *= mix( 1.0, 0.62 + 0.76 * fib, smoothstep( 0.004, 0.07, litLum ) * ( 1.0 - metalnessFactor ) );
#endif
#include <opaque_fragment>`,
          )
      }
      m.customProgramCacheKey = () => `fold-paper-v3-${kind}`
    }
    const front = new THREE.MeshStandardMaterial({
      map: print.map,
      roughnessMap: print.mrMap,
      metalnessMap: print.mrMap,
      roughness: 1,
      metalness: 1,
      bumpMap: fibre,
      bumpScale: 1.7,
    })
    tone(front, 'printed')
    const back = new THREE.MeshStandardMaterial({ color: '#252220', roughness: 0.8, metalness: 0, bumpMap: fibre, bumpScale: 1.7 })
    tone(back, 'back')
    const edge = new THREE.MeshStandardMaterial({ color: '#f3a874', roughness: 0.3, metalness: 1, emissive: '#c25a22', emissiveIntensity: 0.55 })
    tone(edge, 'edge')
    let alive = true
    document.fonts?.ready.then(() =>
      Promise.all([
        document.fonts.load('400 80px "Instrument Serif"'),
        document.fonts.load('500 20px "Bricolage Grotesque Variable"'),
      ]).then(() => alive && print.redraw()),
    )
    return {
      list: [front, back, edge] as THREE.Material[],
      dispose: () => {
        alive = false
        ;[front, back, edge].forEach((m) => m.dispose())
        fibre.dispose()
        print.map.dispose()
        print.mrMap.dispose()
      },
    }
  }, [chains, layout, S, gl, stage, printUniform, fx])
  useEffect(() => () => mats.dispose(), [mats])

  const geos = useMemo(() => chains.map((c, ci) => c.panels.map((_, i) => panelGeometry(c, i, layout, ci))), [chains, layout])
  useEffect(() => () => geos.flat().forEach((g) => g.dispose()), [geos])

  /* ------------------------------ runtime ------------------------------ */
  const rts = useMemo<Runtime[]>(
    () =>
      chains.map((c: Chain, ci) => {
        const poser = new ChainPoser(c, layout, ci)
        const box = new THREE.Box2()
        for (const p of c.panels) for (const v of p.logoQuad) box.expandByPoint(new THREE.Vector2(v.x, v.y))
        const cen = box.getCenter(new THREE.Vector2()).multiplyScalar(S)
        const sz = box.getSize(new THREE.Vector2()).multiplyScalar(S / 2)
        const centre = new THREE.Vector3(cen.x, cen.y, 0)
        const n = c.panels.length
        return {
          mode: 'home',
          body: null,
          meshes: new Array(n).fill(null),
          poser,
          centre,
          half: new THREE.Vector3(sz.x, sz.y, 0.05),
          negCentre: new THREE.Matrix4().makeTranslation(-centre.x, -centre.y, 0),
          vel: new THREE.Vector3(),
          last: new THREE.Vector3(),
          offset: new THREE.Vector3(),
          freeT: 0,
          retT: 0,
          from: new THREE.Vector3(),
          fromQ: new THREE.Quaternion(),
          crumple: new Array(n).fill(0),
          relax: new Array(n).fill(0),
          cursorRelax: new Array(n).fill(0),
        }
      }),
    [chains, layout, S],
  )

  // global fold sequence (farthest-from-root first, chains interleaved)
  const sequence = useMemo(() => {
    const list: { ci: number; k: number; order: number }[] = []
    chains.forEach((c, ci) => c.hinges.forEach((h) => h.k > 0 && list.push({ ci, k: h.k, order: h.order })))
    list.sort((a, b) => a.order - b.order || a.ci - b.ci)
    return list
  }, [chains])

  /* ------------------------------ intro ------------------------------ */
  const intro = useRef({ flat: 1, folds: chains.map((c) => c.panels.map(() => 0)) })
  useEffect(() => {
    const st = stage.current
    const it = intro.current
    if (st.reduced) {
      it.flat = 0
      it.folds.forEach((f) => f.fill(1))
      st.introDone = true
      return
    }
    it.flat = 1
    it.folds.forEach((f) => f.fill(0))
    const tl = gsap.timeline({ delay: 1.0, onComplete: () => void (st.introDone = true) })
    const proxies = sequence.map(() => ({ v: 0 }))
    sequence.forEach((s, i) => {
      tl.to(
        proxies[i],
        {
          v: 1,
          duration: 1.05,
          ease: 'power3.inOut',
          onUpdate: () => void (it.folds[s.ci][s.k] = proxies[i].v),
        },
        0.35 + i * 0.3,
      )
    })
    tl.to(it, { flat: 0, duration: 2.7, ease: 'power2.inOut' }, 0.45)
    return () => {
      tl.kill()
    }
  }, [sequence, stage])

  /* ------------------------------ interaction ------------------------------ */
  const tmp = useMemo(
    () => ({
      markPos: new THREE.Vector3(),
      markQuat: new THREE.Quaternion(),
      markMat: new THREE.Matrix4(),
      euler: new THREE.Euler(),
      tilt: new THREE.Vector2(),
      lift: { v: 0 },
      v: new THREE.Vector3(),
      v2: new THREE.Vector3(),
      q: new THREE.Quaternion(),
      q2: new THREE.Quaternion(),
      plane: new THREE.Plane(new THREE.Vector3(0, 0, 1), -0.45),
      hit: new THREE.Vector3(),
      hover: -1,
      held: -1,
      ndc: new THREE.Vector3(),
      paperPlane: new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
      glintHit: new THREE.Vector3(),
    }),
    [],
  )

  const canGrab = () => {
    const st = stage.current
    return !st.reduced && !st.coarse && st.introDone && st.progress < 0.02
  }

  const release = (ci: number) => {
    const rt = rts[ci]
    tmp.held = -1
    document.body.style.cursor = tmp.hover >= 0 ? 'grab' : ''
    if (rt.mode !== 'held' || !rt.body) return
    rt.mode = 'free'
    rt.freeT = 0
    rt.body.setBodyType(rapier.RigidBodyType.Dynamic, true)
    const v = rt.vel.clampLength(0, 13)
    rt.body.setLinvel({ x: v.x, y: v.y, z: v.z * 0.5 }, true)
    rt.body.setAngvel({ x: v.y * 1.1 + (Math.random() - 0.5) * 3, y: -v.x * 0.9, z: (Math.random() - 0.5) * 5 - v.x * 0.4 }, true)
    rt.crumple = rt.crumple.map(() => 0.35 + Math.random() * 1.15)
  }

  const onDown = (ci: number) => (e: ThreeEvent<PointerEvent>) => {
    if (!canGrab() || tmp.held >= 0) return
    const rt = rts[ci]
    if (rt.mode !== 'home' || !rt.body) return
    e.stopPropagation()
    stage.current.touched = true
    rt.mode = 'held'
    tmp.held = ci
    const p = rt.body.translation()
    rt.last.set(p.x, p.y, p.z)
    rt.vel.set(0, 0, 0)
    e.ray.intersectPlane(tmp.plane, tmp.hit)
    rt.offset.set(p.x - tmp.hit.x, p.y - tmp.hit.y, 0)
    document.body.style.cursor = 'grabbing'
    const up = () => {
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      window.removeEventListener('blur', up)
      release(ci)
    }
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    window.addEventListener('blur', up)
  }
  const onOver = (ci: number) => () => {
    tmp.hover = ci
    if (canGrab() && tmp.held < 0) document.body.style.cursor = 'grab'
  }
  const onOut = () => {
    tmp.hover = -1
    if (tmp.held < 0) document.body.style.cursor = ''
  }
  useEffect(() => () => void (document.body.style.cursor = ''), [])

  /* ------------------------------ frame ------------------------------ */
  useFrame((state, rawDt) => {
    if (!active) return
    const dt = Math.min(rawDt, 1 / 30)
    const st = stage.current
    const t = state.clock.elapsedTime
    const p = st.progress
    const u = st.reduced ? 0 : smooth(0.025, 0.2, p) // unfold
    const pan = smooth(0.34, 0.98, p)
    const camera = state.camera as THREE.PerspectiveCamera
    const aspect = state.size.width / state.size.height

    /* camera rig: hero -> overview of the whole strip -> close pan along it */
    const tanH = Math.tan(THREE.MathUtils.degToRad(frame.fov / 2))
    const stripLen = layout.total * S
    const wide = aspect >= 1.05
    const timelineZ = wide ? 2.6 : 2.1
    const viewW = timelineZ * tanH * aspect * 2
    const x0 = -stripLen / 2 + viewW * 0.42
    const x1 = stripLen / 2 - viewW * 0.42
    const overviewZ = Math.max(frame.camZ + 1.2, (stripLen * 0.56) / (tanH * aspect))
    const a = smooth(0.03, 0.2, p) // hero -> overview
    const b = smooth(0.2, 0.33, p) // overview -> timeline start
    const hx = 0
    const ox = 0
    const tx0 = THREE.MathUtils.lerp(x0, x1, pan)
    const camX = THREE.MathUtils.lerp(THREE.MathUtils.lerp(hx, ox, a), tx0, b)
    const camY = THREE.MathUtils.lerp(0, wide ? -0.12 : -0.2, b)
    const camZ = THREE.MathUtils.lerp(THREE.MathUtils.lerp(frame.camZ, overviewZ, a), timelineZ, b)
    const camW = Math.max(a, b)
    const sway = 1 - camW
    camera.position.set(camX + sway * state.pointer.x * 0.08, camY + sway * state.pointer.y * 0.06, camZ)
    camera.lookAt(camX, camY * 0.2, 0)

    /* light play: cursor glint on the copper + a slow sweep across the foil */
    if (!st.reduced && !st.coarse) {
      state.raycaster.setFromCamera(state.pointer, camera)
      if (state.raycaster.ray.intersectPlane(tmp.paperPlane, tmp.glintHit)) fx.uGlint.value.lerp(tmp.glintHit, 1 - Math.exp(-dt * 12))
    }
    const glintTarget = st.reduced || st.coarse || !st.introDone ? 0 : 1
    fx.uGlintAmt.value += (glintTarget - fx.uGlintAmt.value) * (1 - Math.exp(-dt * 2))
    fx.uSweep.value = st.reduced ? -20 : camX * 0.82 + THREE.MathUtils.lerp(-4.5, 4.5, (t / 8.5) % 1)

    /* mark pose: tilt toward the cursor, lift when hovered */
    const live = 1 - u
    const allowTilt = !st.reduced && !st.coarse
    const tx = allowTilt ? -state.pointer.y * 0.2 * live : 0
    const ty = allowTilt ? state.pointer.x * 0.32 * live : 0
    const k = 1 - Math.exp(-dt * 4)
    tmp.tilt.x += (tx - tmp.tilt.x) * k
    tmp.tilt.y += (ty - tmp.tilt.y) * k
    tmp.lift.v += ((tmp.hover >= 0 && st.introDone ? 0.14 : 0) * live - tmp.lift.v) * k
    const bob = st.reduced ? 0 : Math.sin(t * 0.7) * 0.035 * live
    tmp.euler.set(tmp.tilt.x, tmp.tilt.y, Math.sin(t * 0.43) * 0.012 * live)
    tmp.markQuat.setFromEuler(tmp.euler)
    tmp.markPos.set(frame.markX, frame.markY + bob, tmp.lift.v)
    tmp.markMat.compose(tmp.markPos, tmp.markQuat, tmp.v.set(1, 1, 1))

    const it = intro.current
    printUniform.value = 0.05 + 0.95 * Math.max(smooth(0.35, 1, it.flat), smooth(0.4, 1, u))
    const flatX = -stripLen / 2 - tmp.markPos.x
    const flatY = -tmp.markPos.y
    const nSeq = sequence.length

    /* per chain */
    for (let ci = 0; ci < rts.length; ci++) {
      const rt = rts[ci]
      const chain = chains[ci]
      const poser = rt.poser
      // fold amounts
      for (let gi = 0; gi < nSeq; gi++) {
        const s = sequence[gi]
        if (s.ci !== ci) continue
        const start = ((nSeq - 1 - gi) / nSeq) * 0.55
        const unf = smooth(start, start + 0.45, u)
        poser.fold[s.k] = 0.04 + 0.96 * it.folds[ci][s.k] * (1 - unf)
      }
      // cursor lift of creases near the pointer
      for (let kk = 1; kk < chain.panels.length; kk++) {
        let target = 0
        if (allowTilt && rt.mode === 'home' && st.introDone && live > 0.01) {
          const h = chain.hinges[kk]
          tmp.v2.set(h.pivot.x * S, h.pivot.y * S, 0).applyMatrix4(poser.matrices[kk]).applyMatrix4(tmp.markMat)
          tmp.ndc.copy(tmp.v2).project(camera)
          const dx = (tmp.ndc.x - state.pointer.x) * aspect
          const dy = tmp.ndc.y - state.pointer.y
          target = 0.5 * Math.exp(-(dx * dx + dy * dy) / 0.035) * live
        }
        rt.cursorRelax[kk] += (target - rt.cursorRelax[kk]) * (1 - Math.exp(-dt * 6))
        const cr = rt.mode === 'free' ? rt.crumple[kk] : rt.mode === 'held' ? 0.3 : 0
        rt.relax[kk] += (cr - rt.relax[kk]) * (1 - Math.exp(-dt * (rt.mode === 'return' ? 5 : 3.5)))
        poser.relax[kk] = rt.cursorRelax[kk] + rt.relax[kk]
      }
      const flatness = Math.max(it.flat, smooth(0.0, 0.8, u))
      poser.solve(flatness, flatX, flatY)
      for (let j = 0; j < rt.meshes.length; j++) {
        const m = rt.meshes[j]
        if (!m) continue
        m.matrix.multiplyMatrices(rt.negCentre, poser.matrices[j])
        m.matrixWorldNeedsUpdate = true
      }

      /* body */
      const body = rt.body
      if (!body) continue
      // home pose of this chain's body
      const home = tmp.v.copy(rt.centre).applyQuaternion(tmp.markQuat).add(tmp.markPos)
      if ((rt.mode === 'free' || rt.mode === 'held') && p > 0.02) {
        if (rt.mode === 'held') tmp.held = -1
        rt.mode = 'free'
        rt.freeT = 99
      }
      if (rt.mode === 'home') {
        body.setNextKinematicTranslation(home)
        body.setNextKinematicRotation(tmp.markQuat)
      } else if (rt.mode === 'held') {
        state.raycaster.setFromCamera(state.pointer, camera)
        if (state.raycaster.ray.intersectPlane(tmp.plane, tmp.hit)) {
          tmp.hit.add(rt.offset)
          tmp.hit.x = THREE.MathUtils.clamp(tmp.hit.x, -frame.halfW + 0.3, frame.halfW - 0.3)
          tmp.hit.y = THREE.MathUtils.clamp(tmp.hit.y, -frame.halfH + 0.3, frame.halfH + 0.6)
          const cur = body.translation()
          tmp.v2.set(cur.x, cur.y, cur.z).lerp(tmp.hit, 1 - Math.exp(-dt * 22))
          const inst = tmp.hit.copy(tmp.v2).sub(rt.last).divideScalar(Math.max(dt, 1e-3))
          rt.vel.lerp(inst, 0.4)
          rt.last.copy(tmp.v2)
          body.setNextKinematicTranslation(tmp.v2)
          tmp.euler.set(rt.vel.y * 0.035 + tmp.tilt.x, -rt.vel.x * 0.05 + tmp.tilt.y, -rt.vel.x * 0.03)
          tmp.q.setFromEuler(tmp.euler)
          const r = body.rotation()
          tmp.q2.set(r.x, r.y, r.z, r.w).slerp(tmp.q, 1 - Math.exp(-dt * 10))
          body.setNextKinematicRotation(tmp.q2)
        }
      } else if (rt.mode === 'free') {
        rt.freeT += dt
        const lv = body.linvel()
        const speed = Math.hypot(lv.x, lv.y, lv.z)
        if ((rt.freeT > 3 && speed < 0.7) || rt.freeT > 5) {
          rt.mode = 'return'
          rt.retT = 0
          const tr = body.translation()
          const ro = body.rotation()
          rt.from.set(tr.x, tr.y, tr.z)
          rt.fromQ.set(ro.x, ro.y, ro.z, ro.w)
          body.setBodyType(rapier.RigidBodyType.KinematicPositionBased, true)
          rt.crumple.fill(0)
        }
      } else if (rt.mode === 'return') {
        rt.retT = Math.min(1, rt.retT + dt / 1.25)
        const e = easeInOut(rt.retT)
        tmp.v2.copy(rt.from).lerp(home, e)
        tmp.v2.y += Math.sin(Math.PI * e) * 0.45
        tmp.v2.z += Math.sin(Math.PI * e) * 0.6
        body.setNextKinematicTranslation(tmp.v2)
        tmp.q.copy(rt.fromQ).slerp(tmp.markQuat, e)
        body.setNextKinematicRotation(tmp.q)
        if (rt.retT >= 1) rt.mode = 'home'
      }
    }

    /* DOM: hero copy + timeline captions */
    if (st.hero) {
      const o = 1 - smooth(0.015, 0.11, p)
      st.hero.style.opacity = String(o)
      st.hero.style.transform = `translate3d(0, ${-p * 260}px, 0)`
      st.hero.style.visibility = o < 0.01 ? 'hidden' : 'visible'
    }
    if (st.hint) st.hint.style.opacity = String(st.touched || !st.introDone ? 0 : (1 - smooth(0.0, 0.04, p)) * 0.9)
    const capW = smooth(0.29, 0.34, p)
    const yEdge = -Math.max(chains[0].halfWidth, chains[1].halfWidth) * S - 0.035
    for (let i = 0; i < st.timeline.length; i++) {
      const el = st.captions[i]
      if (!el) continue
      if (capW <= 0.001) {
        el.style.visibility = 'hidden'
        continue
      }
      const wx = -stripLen / 2 + st.timeline[i].u * stripLen
      tmp.ndc.set(wx, yEdge, 0).project(camera)
      const sx = (tmp.ndc.x * 0.5 + 0.5) * state.size.width
      const sy = (-tmp.ndc.y * 0.5 + 0.5) * state.size.height
      const off = sx < -400 || sx > state.size.width + 40
      el.style.visibility = off ? 'hidden' : 'visible'
      el.style.opacity = String(capW)
      el.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0)`
    }
  })

  return (
    <>
      {rts.map((rt, ci) => {
        const home = rt.centre.clone().add(new THREE.Vector3(frame.markX, frame.markY, 0))
        return (
          <RigidBody
            key={chains[ci].id}
            ref={(b) => void (rt.body = b)}
            type="kinematicPosition"
            colliders={false}
            position={[home.x, home.y, home.z]}
            ccd
            linearDamping={0.25}
            angularDamping={0.45}
          >
            <CuboidCollider args={[rt.half.x, rt.half.y, rt.half.z]} restitution={0.35} friction={0.7} density={0.6} />
            {geos[ci].map((g, j) => (
              <mesh
                key={j}
                ref={(m) => void (rt.meshes[j] = m)}
                geometry={g}
                material={mats.list}
                matrixAutoUpdate={false}
                castShadow
                receiveShadow
                onPointerDown={onDown(ci)}
                onPointerOver={onOver(ci)}
                onPointerOut={onOut}
              />
            ))}
          </RigidBody>
        )
      })}
    </>
  )
}
