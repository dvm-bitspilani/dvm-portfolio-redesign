import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import gsap from 'gsap'
import { ChainPoser, getChains, makeLayout, panelGeometry } from '../lib/strip'
import { createFibreTexture, createStripPrint, type PrintStop } from '../lib/print'
import { panIndex, smooth, stopU } from '../lib/phases'
import type { ToneSpec } from '../lib/tones'
import { FOV, MARK_HEIGHT, PAPER_THICKNESS, markFrame } from './frame'
import type { Runtime } from './runtime'

interface ChainRt {
  group: THREE.Group | null
  meshes: (THREE.Mesh | null)[]
  poser: ChainPoser
  centre: THREE.Vector3
  negCentre: THREE.Matrix4
  relax: number[]
  cursorRelax: number[]
}

interface Props {
  rt: React.RefObject<Runtime>
  tone: ToneSpec
  stops: PrintStop[]
  quality: 'low' | 'high'
  active: boolean
}

const ONE = new THREE.Vector3(1, 1, 1)

export default function PaperStrip({ rt: rtRef, tone, stops, quality, active }: Props) {
  const gl = useThree((s) => s.gl)
  const chains = getChains()
  // logo space is 1 unit tall, so the layout scale is the mark height in world units
  const layout = useMemo(() => makeLayout(MARK_HEIGHT, PAPER_THICKNESS), [])
  const S = layout.scale
  const stripLen = layout.total * S

  /* ------------------------------ materials ------------------------------ */
  const printUniform = useMemo(() => ({ value: 1 }), [])
  const fx = useMemo(
    () => ({
      uGlint: { value: new THREE.Vector3(0, 0, 0) },
      uGlintAmt: { value: 0 },
      uSweep: { value: -20 },
      uFoil: { value: new THREE.Color() },
    }),
    [],
  )
  fx.uFoil.value.set(tone.foilGlow)

  const fibre = useMemo(() => {
    const t = createFibreTexture(512)
    t.repeat.set(stripLen / 0.32, (chains[0].halfWidth * 2 * S) / 0.32)
    t.anisotropy = gl.capabilities.getMaxAnisotropy()
    return t
  }, [gl, stripLen, chains, S])
  useEffect(() => () => fibre.dispose(), [fibre])

  const stopsKey = stops.map((s) => `${s.label}:${s.count}`).join('|')
  const print = useMemo(() => {
    const max = gl.capabilities.maxTextureSize
    const width = Math.min(max, quality === 'high' ? 8192 : 4096)
    const p = createStripPrint({ chains, layout, stops, tone, width })
    p.map.anisotropy = p.mrMap.anisotropy = gl.capabilities.getMaxAnisotropy()
    return p
    // stopsKey stands in for stops (new array identity every render)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chains, layout, tone, quality, gl, stopsKey])
  useEffect(() => {
    let alive = true
    if (document.fonts) {
      Promise.all(tone.fontsToLoad.map((f) => document.fonts.load(f).catch(() => null)))
        .then(() => document.fonts.ready)
        .then(() => alive && print.redraw())
    }
    return () => {
      alive = false
      print.dispose()
    }
  }, [print, tone])

  const mats = useMemo(() => {
    const GLINT = `
  {
    vec2 gd = vFoldWorld.xy - uGlint.xy;
    float cur = exp( -dot( gd, gd ) / 0.09 ) * uGlintAmt;
    float sw = vFoldWorld.x * 0.82 + vFoldWorld.y * 0.57 - uSweep;
    float band = exp( -sw * sw / 0.018 );
    totalEmissiveRadiance += uFoil * metalnessFactor * ( cur * 0.7 + band * 1.0 ) + uFoil * gilt * 0.1;
  }`
    const paperCol = new THREE.Color(tone.paper)
    const shade = (m: THREE.MeshStandardMaterial, kind: 'printed' | 'back' | 'edge') => {
      const printed = kind === 'printed'
      m.onBeforeCompile = (shader) => {
        shader.defines = { ...shader.defines, GILT: '0.06' }
        shader.uniforms.uPrint = printUniform
        shader.uniforms.uPaper = { value: paperCol }
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
  // gilt edges: a foil band along both long edges of the strip, on both sides
  float giltE = min( vFoldUv.y, 1.0 - vFoldUv.y );
  float giltAA = fwidth( giltE ) * 0.75;
  float gilt = ${kind === 'edge' ? '0.0' : '1.0 - smoothstep( GILT - giltAA, GILT + giltAA, giltE )'};
  diffuseColor.rgb = mix( diffuseColor.rgb, uFoil * 0.92, gilt );`,
          )
          .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>\n${printed ? 'metalnessFactor *= uPrint;' : ''}\n  metalnessFactor = max( metalnessFactor, gilt );`)
          .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n${printed ? 'roughnessFactor = mix( 0.82, roughnessFactor, uPrint );' : ''}\n  roughnessFactor = mix( roughnessFactor, 0.3, gilt );`)
          // foil is smooth: take the fibre bump back off it (no glitter)
          .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n  normal = normalize( mix( normal, nonPerturbedNormal, max( gilt, metalnessFactor ) ) );`)
          .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${kind === 'back' ? '' : GLINT}`)
          // paper takes almost nothing from the environment (deep shadow side); foil keeps its reflections
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
      m.customProgramCacheKey = () => `imm-tl-paper-v1-${kind}`
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
    shade(front, 'printed')
    const back = new THREE.MeshStandardMaterial({ color: tone.paperBack, roughness: 0.8, metalness: 0, bumpMap: fibre, bumpScale: 1.7 })
    shade(back, 'back')
    const edge = new THREE.MeshStandardMaterial({ color: tone.edge, roughness: 0.3, metalness: 1, emissive: tone.edgeEmissive, emissiveIntensity: 0.55 })
    shade(edge, 'edge')
    return [front, back, edge]
  }, [print, fibre, tone, printUniform, fx])
  useEffect(() => () => mats.forEach((m) => m.dispose()), [mats])

  const geos = useMemo(() => chains.map((c, ci) => c.panels.map((_, i) => panelGeometry(c, i, layout, ci))), [chains, layout])
  useEffect(() => () => geos.flat().forEach((g) => g.dispose()), [geos])

  /* ------------------------------ runtime ------------------------------ */
  const crt = useMemo<ChainRt[]>(
    () =>
      chains.map((c, ci) => {
        const poser = new ChainPoser(c, layout, ci)
        const box = new THREE.Box2()
        for (const p of c.panels) for (const v of p.logoQuad) box.expandByPoint(new THREE.Vector2(v.x, v.y))
        const cen = box.getCenter(new THREE.Vector2()).multiplyScalar(S)
        const centre = new THREE.Vector3(cen.x, cen.y, 0)
        const n = c.panels.length
        return {
          group: null,
          meshes: new Array(n).fill(null),
          poser,
          centre,
          negCentre: new THREE.Matrix4().makeTranslation(-centre.x, -centre.y, 0),
          relax: new Array(n).fill(0),
          cursorRelax: new Array(n).fill(0),
        }
      }),
    [chains, layout, S],
  )
  // home poses are shared with the physics layer
  useEffect(() => {
    const rt = rtRef.current
    rt.home = crt.map(() => ({ pos: new THREE.Vector3(), quat: new THREE.Quaternion() }))
  }, [crt, rtRef])

  // global fold sequence (farthest-from-root first, chains interleaved)
  const sequence = useMemo(() => {
    const list: { ci: number; k: number; order: number }[] = []
    chains.forEach((c, ci) => c.hinges.forEach((h) => h.k > 0 && list.push({ ci, k: h.k, order: h.order })))
    list.sort((a, b) => a.order - b.order || a.ci - b.ci)
    return list
  }, [chains])

  /* ------------------------------ fold-in on first view ------------------------------ */
  const intro = useRef({ flat: 1, folds: chains.map((c) => c.panels.map(() => 0)), started: false })
  const settle = () => {
    const it = intro.current
    it.flat = 0
    it.folds.forEach((f) => f.fill(1))
    it.started = true
    rtRef.current.introDone = true
  }
  useEffect(() => {
    const rt = rtRef.current
    const it = intro.current
    if (it.started || !active) return
    const ph = rt.phases
    if (!rt.startFolded || !rt.foldOnEnter || rt.reduced || rt.target > ph.unfold[0] + 0.01) {
      settle()
      return
    }
    it.started = true
    const tl = gsap.timeline({ delay: 0.6, onComplete: () => void (rt.introDone = true) })
    const proxies = sequence.map(() => ({ v: 0 }))
    sequence.forEach((s, i) => {
      tl.to(proxies[i], { v: 1, duration: 1.05, ease: 'power3.inOut', onUpdate: () => void (it.folds[s.ci][s.k] = proxies[i].v) }, 0.35 + i * 0.3)
    })
    tl.to(it, { flat: 0, duration: 2.7, ease: 'power2.inOut' }, 0.45)
    return () => {
      // unmounted / paused mid-way: finish the fold so the mark is never left half made
      if (tl.progress() < 1) {
        tl.kill()
        settle()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, sequence, rtRef])

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
      m: new THREE.Matrix4(),
      hover: -1,
      ndc: new THREE.Vector3(),
      paperPlane: new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
      glintHit: new THREE.Vector3(),
      capCache: [] as { x: number; y: number; o: number; vis: boolean }[],
      capW: -1,
      intro: { o: -1, y: -1 },
    }),
    [],
  )
  const onDown = (ci: number) => (e: ThreeEvent<PointerEvent>) => rtRef.current.bridge?.onDown(ci, e)
  const onOver = (ci: number) => () => {
    tmp.hover = ci
    const rt = rtRef.current
    if (rt.bridge && rt.introDone && rt.progress < rt.phases.unfold[0] + 0.005) document.body.style.cursor = 'grab'
  }
  const onOut = () => {
    tmp.hover = -1
    if (!rtRef.current.bridge || rtRef.current.bridge.mode.every((m) => m !== 'held')) document.body.style.cursor = ''
  }
  useEffect(() => () => void (document.body.style.cursor = ''), [])

  /* ------------------------------ frame ------------------------------ */
  useFrame((state, rawDt) => {
    if (!active) return
    const dt = Math.min(rawDt, 1 / 30)
    const rt = rtRef.current
    const ph = rt.phases
    const t = state.clock.elapsedTime
    // ease toward the requested progress (scroll is already user motion, so a short lag reads as weight)
    const k0 = rt.reduced ? 1 : 1 - Math.exp(-dt * 7)
    rt.progress += (rt.target - rt.progress) * k0
    if (Math.abs(rt.target - rt.progress) < 1e-5) rt.progress = rt.target
    const p = rt.progress
    const camera = state.camera as THREE.PerspectiveCamera
    const aspect = state.size.width / state.size.height
    const frame = markFrame(aspect, rt.markRight)
    rt.frame.halfW = frame.halfW
    rt.frame.halfH = frame.halfH

    const [U0, U1] = ph.unfold
    const [Z0, Z1] = ph.zoom
    const u = rt.startFolded ? smooth(U0, U1, p) : 1
    const a = rt.startFolded ? smooth(U0 + (U1 - U0) * 0.03, U1, p) : 1
    const b = smooth(Z0, Z1, p)

    /* camera rig: folded mark -> overview of the whole strip -> stop-by-stop pan */
    const tanH = Math.tan(THREE.MathUtils.degToRad(FOV / 2))
    const wide = aspect >= 1.05
    const timelineZ = wide ? 2.6 : 2.1
    const viewW = timelineZ * tanH * aspect * 2
    const n = rt.captions.length
    const pi = panIndex(ph, p)
    const i0 = Math.min(Math.max(0, n - 2), Math.floor(pi))
    const fu = n <= 1 ? stopU(0, 1) : THREE.MathUtils.lerp(stopU(i0, n), stopU(Math.min(n - 1, i0 + 1), n), pi - i0)
    const stopX = -stripLen / 2 + fu * stripLen
    const tx = Math.min(stopX + viewW * 0.22, stripLen / 2 - viewW * 0.12)
    const overviewZ = Math.max(frame.camZ + 1.2, (stripLen * 0.56) / (tanH * aspect))
    const camX = THREE.MathUtils.lerp(0, tx, b)
    // starting flat next to an intro overlay: keep the overview strip in the lower third, clear of the copy
    const overviewY = !rt.startFolded && rt.markRight ? overviewZ * tanH * 0.42 : 0
    const camY = THREE.MathUtils.lerp(overviewY, wide ? -0.12 : -0.2, b)
    const camZ = THREE.MathUtils.lerp(THREE.MathUtils.lerp(frame.camZ, overviewZ, a), timelineZ, b)
    const sway = rt.interactive && !rt.reduced && !rt.coarse ? 1 - Math.max(a, b) : 0
    camera.position.set(camX + sway * state.pointer.x * 0.08, camY + sway * state.pointer.y * 0.06, camZ)
    camera.lookAt(camX, b < 1 && overviewY > 0 ? THREE.MathUtils.lerp(overviewY, camY * 0.2, b) : camY * 0.2, 0)
    rt.cam.a = a
    rt.cam.b = b
    rt.cam.x = camX
    rt.cam.markX = frame.markX
    rt.cam.markY = frame.markY

    /* active stop */
    const act = b > 0.6 ? Math.round(pi) : -1
    if (act !== rt.activeIndex) {
      rt.activeIndex = act
      for (let i = 0; i < n; i++) rt.captions[i]?.toggleAttribute('data-active', i === act)
      if (act >= 0) rt.onActive?.(act)
    }

    /* light play: cursor glint on the foil + a slow sweep across it */
    const live = rt.interactive && !rt.reduced && !rt.coarse
    if (live) {
      state.raycaster.setFromCamera(state.pointer, camera)
      if (state.raycaster.ray.intersectPlane(tmp.paperPlane, tmp.glintHit)) fx.uGlint.value.lerp(tmp.glintHit, 1 - Math.exp(-dt * 12))
    }
    const glintTarget = live && rt.introDone ? 1 : 0
    fx.uGlintAmt.value += (glintTarget - fx.uGlintAmt.value) * (1 - Math.exp(-dt * 2))
    fx.uSweep.value = rt.reduced ? -20 : camX * 0.82 + THREE.MathUtils.lerp(-4.5, 4.5, (t / 8.5) % 1)

    /* mark pose: tilt toward the cursor, lift when hovered */
    const markLive = 1 - u
    const tiltX = live ? -state.pointer.y * 0.2 * markLive : 0
    const tiltY = live ? state.pointer.x * 0.32 * markLive : 0
    const k = 1 - Math.exp(-dt * 4)
    tmp.tilt.x += (tiltX - tmp.tilt.x) * k
    tmp.tilt.y += (tiltY - tmp.tilt.y) * k
    tmp.lift.v += ((tmp.hover >= 0 && rt.introDone && live ? 0.14 : 0) * markLive - tmp.lift.v) * k
    const bob = rt.reduced ? 0 : Math.sin(t * 0.7) * 0.035 * markLive
    tmp.euler.set(tmp.tilt.x, tmp.tilt.y, rt.reduced ? 0 : Math.sin(t * 0.43) * 0.012 * markLive)
    tmp.markQuat.setFromEuler(tmp.euler)
    tmp.markPos.set(frame.markX, frame.markY + bob, tmp.lift.v)
    tmp.markMat.compose(tmp.markPos, tmp.markQuat, ONE)

    const it = intro.current
    printUniform.value = 0.05 + 0.95 * Math.max(smooth(0.35, 1, it.flat), smooth(0.4, 1, u))
    const flatX = -stripLen / 2 - tmp.markPos.x
    const flatY = -tmp.markPos.y
    const nSeq = sequence.length
    const bridge = rt.bridge

    for (let ci = 0; ci < crt.length; ci++) {
      const c = crt[ci]
      const chain = chains[ci]
      const poser = c.poser
      for (let gi = 0; gi < nSeq; gi++) {
        const s = sequence[gi]
        if (s.ci !== ci) continue
        const start = ((nSeq - 1 - gi) / nSeq) * 0.55
        const unf = smooth(start, start + 0.45, u)
        poser.fold[s.k] = 0.04 + 0.96 * it.folds[ci][s.k] * (1 - unf)
      }
      const mode = bridge ? bridge.mode[ci] : 'home'
      // creases near the pointer lift a little
      for (let kk = 1; kk < chain.panels.length; kk++) {
        let target = 0
        if (live && mode === 'home' && rt.introDone && markLive > 0.01) {
          const h = chain.hinges[kk]
          tmp.v2.set(h.pivot.x * S, h.pivot.y * S, 0).applyMatrix4(poser.matrices[kk]).applyMatrix4(tmp.markMat)
          tmp.ndc.copy(tmp.v2).project(camera)
          const dx = (tmp.ndc.x - state.pointer.x) * aspect
          const dy = tmp.ndc.y - state.pointer.y
          target = 0.5 * Math.exp(-(dx * dx + dy * dy) / 0.035) * markLive
        }
        c.cursorRelax[kk] += (target - c.cursorRelax[kk]) * (1 - Math.exp(-dt * 6))
        const cr = bridge ? (mode === 'free' ? bridge.crumple[ci][kk] : mode === 'held' ? 0.3 : 0) : 0
        c.relax[kk] += (cr - c.relax[kk]) * (1 - Math.exp(-dt * (mode === 'return' ? 5 : 3.5)))
        poser.relax[kk] = c.cursorRelax[kk] + c.relax[kk]
      }
      const flatness = Math.max(it.flat, smooth(0.0, 0.8, u))
      poser.solve(flatness, flatX, flatY)
      for (let j = 0; j < c.meshes.length; j++) {
        const m = c.meshes[j]
        if (!m) continue
        m.matrix.multiplyMatrices(c.negCentre, poser.matrices[j])
        m.matrixWorldNeedsUpdate = true
      }
      // body pose: home (on the mark) unless the physics layer has it
      const home = rt.home[ci]
      if (home) {
        home.pos.copy(c.centre).applyQuaternion(tmp.markQuat).add(tmp.markPos)
        home.quat.copy(tmp.markQuat)
      }
      const g = c.group
      if (g) {
        if (bridge && mode !== 'home') g.matrix.compose(bridge.pos[ci], bridge.quat[ci], ONE)
        else if (home) g.matrix.compose(home.pos, home.quat, ONE)
        g.matrixWorldNeedsUpdate = true
      }
    }

    /* DOM: intro overlay, hint, captions */
    const fadeA = rt.startFolded ? U0 : Z0
    const fadeB = rt.startFolded ? THREE.MathUtils.lerp(U0, U1, 0.45) : THREE.MathUtils.lerp(Z0, Z1, 0.5)
    if (rt.intro) {
      const o = 1 - smooth(fadeA - 0.005, fadeB, p)
      const y = -smooth(fadeA - 0.005, fadeB, p) * 120
      if (Math.abs(o - tmp.intro.o) > 0.002 || Math.abs(y - tmp.intro.y) > 0.2) {
        tmp.intro.o = o
        tmp.intro.y = y
        rt.intro.style.opacity = o.toFixed(3)
        rt.intro.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`
        rt.intro.style.visibility = o < 0.01 ? 'hidden' : 'visible'
      }
    }
    if (rt.hint) rt.hint.style.opacity = rt.touched || !rt.introDone ? '0' : String((1 - smooth(0, U0 + 0.01, p)) * 0.9)

    const capA = smooth(THREE.MathUtils.lerp(Z0, Z1, 0.55), Z1 + 0.004, p)
    const yEdge = -Math.max(chains[0].halfWidth, chains[1].halfWidth) * S - 0.035
    const W = state.size.width
    const Hs = state.size.height
    // caption width follows the projected spacing between stops
    if (n > 1 && rt.captionLayer) {
      tmp.ndc.set(-stripLen / 2 + stopU(0, n) * stripLen, 0, 0).project(camera)
      const xa = tmp.ndc.x
      tmp.ndc.set(-stripLen / 2 + stopU(1, n) * stripLen, 0, 0).project(camera)
      const gap = Math.abs(tmp.ndc.x - xa) * 0.5 * W
      const cw = Math.round(Math.max(170, Math.min(340, gap - 36)))
      if (cw !== tmp.capW && b > 0.9) {
        tmp.capW = cw
        rt.captionLayer.style.setProperty('--imm-tl-cap-w', `${cw}px`)
      }
    }
    for (let i = 0; i < n; i++) {
      const el = rt.captions[i]
      if (!el) continue
      const cache = (tmp.capCache[i] ??= { x: NaN, y: NaN, o: -1, vis: true })
      const wx = -stripLen / 2 + stopU(i, n) * stripLen
      tmp.ndc.set(wx, yEdge, 0).project(camera)
      const sx = (tmp.ndc.x * 0.5 + 0.5) * W
      const sy = (-tmp.ndc.y * 0.5 + 0.5) * Hs
      const vis = capA > 0.001 && sx > -420 && sx < W + 40
      if (vis !== cache.vis) {
        cache.vis = vis
        // stays focusable while hidden: the component scrolls a focused stop into view
        el.style.opacity = vis ? '' : '0'
        el.style.pointerEvents = vis ? '' : 'none'
      }
      if (!vis) continue
      if (Math.abs(capA - cache.o) > 0.002) {
        cache.o = capA
        el.style.setProperty('--imm-tl-cap-a', capA.toFixed(3))
      }
      if (!(Math.abs(sx - cache.x) <= 0.15 && Math.abs(sy - cache.y) <= 0.15)) {
        cache.x = sx
        cache.y = sy
        el.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0)`
      }
    }
  })

  const withEvents = !!rtRef.current.physics
  return (
    <>
      {crt.map((c, ci) => (
        <group key={chains[ci].id} ref={(g) => void (c.group = g)} matrixAutoUpdate={false}>
          {geos[ci].map((g, j) => (
            <mesh
              key={j}
              ref={(m) => void (c.meshes[j] = m)}
              geometry={g}
              material={mats}
              matrixAutoUpdate={false}
              castShadow
              receiveShadow
              {...(withEvents ? { onPointerDown: onDown(ci), onPointerOver: onOver(ci), onPointerOut: onOut } : null)}
            />
          ))}
        </group>
      ))}
    </>
  )
}
