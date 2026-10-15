import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import gsap from 'gsap'
import { createLogoGeometry } from '../../../shared/logo'
import { BASE, VIEW_BUILDING, istTime, type BuildingId, type View } from '../content'
import { anchors, campus } from '../store'
import {
  CLOCK_R,
  CLOCK_Y,
  MAST_TOP,
  TOWER_POS,
  bakeLights,
  buildAmphi,
  buildCanal,
  buildCliff,
  buildGround,
  buildLibrary,
  buildRotunda,
  buildStudio,
  buildTemple,
  buildTower,
  firefliesPositions,
  glowAt,
  lampGeometry,
  personGeometry,
  treeGeometries,
  treePlacements,
  type Opening,
} from './campusGeo'
import { PLACE, lamps, routes, signAnchor, groundY, rng } from './layout'
import { GeoBuilder, tf } from './builder'
import {
  PAL,
  makeBeamMaterial,
  makeGroundRingMaterial,
  makeFireflyMaterial,
  makeGlowMaterial,
  makeMonumentMaterial,
  makeRingMaterial,
  makeSkyMaterial,
  makeStarMaterial,
  makeWaterMaterial,
  makeWindowMaterial,
  makeWorldMaterial,
  shared,
} from './materials'
import { Exhibits } from './Exhibits'

export interface SceneProps {
  view: View
  reduced: boolean
  mobile: boolean
  go: (to: string) => void
}

type Openable = { group: THREE.Group; open: number; kind: 'lid' | 'front'; win: THREE.ShaderMaterial }

/** The DVM mark: ~1.7x the old size, standing on the plinth top (y ≈ 0.42). */
const MARK_SCALE = 2.2
const MARK_Y = 0.44 + MARK_SCALE / 2

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material) {
  const m = new THREE.Mesh(geo, mat)
  m.matrixAutoUpdate = false
  m.updateMatrix()
  return m
}

function buildWorld(dpr: number) {
  const lights = bakeLights()
  const disposables: { dispose: () => void }[] = []
  const track = <T extends { dispose: () => void }>(x: T) => (disposables.push(x), x)

  const baseMat = track(makeWorldMaterial())
  const miscWin = track(makeWindowMaterial())
  const statics = new THREE.Group()
  statics.add(mesh(track(buildGround(lights)), baseMat))
  statics.add(mesh(track(buildCliff()), baseMat))
  const rot = buildRotunda(lights)
  statics.add(mesh(track(rot.body), baseMat))
  const temple = buildTemple(lights)
  statics.add(mesh(track(temple.body), baseMat), mesh(track(temple.glass), miscWin))
  const canal = buildCanal(lights)
  statics.add(mesh(track(canal.body), baseMat), mesh(track(canal.glass), miscWin))
  statics.add(mesh(track(canal.water), track(makeWaterMaterial())))

  // per-building materials so each can light up on hover
  const mats = {} as Record<BuildingId, { world: THREE.ShaderMaterial; win: THREE.ShaderMaterial }>
  for (const id of ['tower', 'studio', 'library', 'amphi', 'monument'] as BuildingId[])
    mats[id] = { world: track(makeWorldMaterial()), win: track(makeWindowMaterial()) }

  const groups = {} as Record<BuildingId, THREE.Group>
  const openables: Partial<Record<BuildingId, Openable[]>> = {}

  // clock tower + main building
  const tw = buildTower(lights)
  groups.tower = new THREE.Group()
  const faceMat = track(makeGlowMaterial('#ffe9bf', 1.0))
  groups.tower.add(mesh(track(tw.body), mats.tower.world), mesh(track(tw.glass), mats.tower.win), mesh(track(tw.faces), faceMat))

  const placeGroup = (id: BuildingId, b: { body: THREE.BufferGeometry; glass: THREE.BufferGeometry; front?: Opening; roof?: Opening }) => {
    const pl = PLACE[id]
    const g = new THREE.Group()
    g.position.copy(pl.pos)
    g.rotation.y = pl.yaw
    g.add(mesh(track(b.body), mats[id].world), mesh(track(b.glass), mats[id].win))
    const ops: Openable[] = []
    for (const [kind, op] of [['front', b.front], ['lid', b.roof]] as const) {
      if (!op) continue
      const pg = new THREE.Group()
      pg.position.copy(op.pivot)
      const win = track(makeWindowMaterial())
      pg.add(mesh(track(op.body), mats[id].world), mesh(track(op.glass), win))
      g.add(pg)
      ops.push({ group: pg, open: 0, kind, win })
    }
    openables[id] = ops
    groups[id] = g
  }
  placeGroup('studio', buildStudio(lights))
  placeGroup('library', buildLibrary(lights))
  placeGroup('amphi', buildAmphi(lights))

  // monument (DVM mark)
  groups.monument = new THREE.Group()
  const logoGeo = track(createLogoGeometry({ depth: 0.38, bevel: 0.045, bevelSegments: 3, curveSegments: 6 }))
  const logo = new THREE.Mesh(logoGeo, track(makeMonumentMaterial()))
  logo.scale.setScalar(MARK_SCALE)
  logo.position.y = MARK_Y
  const shaftGeo = track(new THREE.CylinderGeometry(1.0, 0.72, 6.2, 32, 1, true).translate(0, 3.1, 0))
  const shaft = new THREE.Mesh(shaftGeo, track(makeBeamMaterial(0.13)))
  const coreGeo = track(new THREE.CylinderGeometry(0.42, 0.3, 5.0, 24, 1, true).translate(0, 2.5, 0))
  const core = new THREE.Mesh(coreGeo, track(makeBeamMaterial(0.2, new THREE.Color(0.85, 0.72, 1.0))))
  shaft.position.y = core.position.y = 0.4
  shaft.renderOrder = core.renderOrder = 2
  // the shader reads local xy, so the plane stays in XY and the mesh is laid flat
  const ringGeo0 = track(new THREE.PlaneGeometry(2.9, 2.9))
  const groundRing = new THREE.Mesh(ringGeo0, track(makeGroundRingMaterial()))
  groundRing.rotation.x = -Math.PI / 2
  groundRing.position.y = -0.105
  groundRing.renderOrder = 1
  groups.monument.add(logo, shaft, core, groundRing)
  // invisible hit volume over the plinth so the whole sculpture is clickable
  const hit = new THREE.Mesh(track(new THREE.CylinderGeometry(0.85, 0.85, 3.2, 8)), track(new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })))
  hit.position.y = 1.5
  groups.monument.add(hit)

  // lamps (instanced)
  const lg = lampGeometry()
  const posts = new THREE.InstancedMesh(track(lg.post), baseMat, lamps.length)
  const bulbMat = track(makeGlowMaterial(PAL.lamp, 3.2))
  const bulbs = new THREE.InstancedMesh(track(lg.bulb), bulbMat, lamps.length)
  lamps.forEach((p, i) => {
    const m = new THREE.Matrix4().makeTranslation(p.x, p.y, p.z)
    posts.setMatrixAt(i, m)
    bulbs.setMatrixAt(i, m)
  })
  statics.add(posts, bulbs)

  // trees (instanced, tinted by nearby light = cheap GI)
  const tg = treeGeometries()
  const tp = treePlacements()
  const R = rng(3)
  for (const [geo, list] of [[tg.neem, tp.neem], [tg.ashoka, tp.ashoka]] as const) {
    const im = new THREE.InstancedMesh(track(geo), baseMat, list.length)
    const c = new THREE.Color()
    const p = new THREE.Vector3()
    list.forEach((m, i) => {
      im.setMatrixAt(i, m)
      p.setFromMatrixPosition(m)
      p.y += 0.45
      const gl = glowAt(p, lights)
      const v = 0.85 + R() * 0.3
      c.setRGB(v + gl.r * 1.6, v + gl.g * 1.6, v + gl.b * 1.6)
      im.setColorAt(i, c)
    })
    statics.add(im)
  }

  // sky, stars, fireflies
  const sky = new THREE.Mesh(track(new THREE.SphereGeometry(95, 32, 16)), track(makeSkyMaterial()))
  sky.frustumCulled = false
  sky.renderOrder = -10
  const starGeo = track(new THREE.BufferGeometry())
  {
    const n = 1700
    const R2 = rng(77)
    const pos = new Float32Array(n * 3)
    const size = new Float32Array(n)
    const seed = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      const u = R2() * 2 - 1
      const th = R2() * Math.PI * 2
      const y = Math.abs(u) * 0.95 + 0.02 - (R2() < 0.15 ? 0.3 : 0)
      const r = Math.sqrt(Math.max(0, 1 - y * y))
      pos.set([Math.cos(th) * r * 85, y * 85, Math.sin(th) * r * 85], i * 3)
      size[i] = 0.8 + R2() ** 3 * 3.2
      seed[i] = R2()
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    starGeo.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
    starGeo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
  }
  const stars = new THREE.Points(starGeo, track(makeStarMaterial(dpr)))
  stars.frustumCulled = false
  const ff = firefliesPositions(150)
  const ffGeo = track(new THREE.BufferGeometry())
  ffGeo.setAttribute('position', new THREE.BufferAttribute(ff.positions, 3))
  ffGeo.setAttribute('aSeed', new THREE.BufferAttribute(ff.seeds, 1))
  const fireflies = new THREE.Points(ffGeo, track(makeFireflyMaterial(dpr)))
  fireflies.frustumCulled = false

  // stylised clouds drifting under the island (one instanced draw)
  const cb = new GeoBuilder()
  cb.add(new THREE.IcosahedronGeometry(0.5, 1), '#2a2d63', tf(0, 0, 0, 0, 1.3, 0.55, 1))
  cb.add(new THREE.IcosahedronGeometry(0.38, 1), '#2f3270', tf(0.55, 0.08, 0.1, 0.4, 1.1, 0.6, 1))
  cb.add(new THREE.IcosahedronGeometry(0.34, 1), '#262a5c', tf(-0.55, -0.02, -0.08, 1.0, 1.2, 0.55, 1))
  const cloudGeo = track(cb.build())
  const cloudMat = track(makeWorldMaterial({ emit: 0.08 }))
  const RC = rng(61)
  const clouds = new THREE.InstancedMesh(cloudGeo, cloudMat, 16)
  for (let i = 0; i < 16; i++) {
    const th = (i / 16) * Math.PI * 2 + RC() * 0.3
    const rr = 6.5 + RC() * 6
    const sc = 1.1 + RC() * 1.6
    clouds.setMatrixAt(i, tf(Math.sin(th) * rr, -2.2 - RC() * 3.2, -Math.cos(th) * rr, RC() * 6, sc, sc, sc))
  }
  const cloudRing = new THREE.Group()
  cloudRing.add(clouds)

  // clock hands, antenna light, radio rings
  const handMat = track(makeWorldMaterial())
  handMat.vertexColors = false
  const handGeo = track(new THREE.BoxGeometry(1, 1, 1))
  {
    const col = new Float32Array(handGeo.attributes.position.count * 3).fill(0.04)
    handGeo.setAttribute('color', new THREE.BufferAttribute(col, 3))
    handGeo.setAttribute('aGlow', new THREE.BufferAttribute(new Float32Array(handGeo.attributes.position.count * 3), 3))
  }
  handMat.vertexColors = true
  const hands = new THREE.InstancedMesh(handGeo, handMat, 8)
  const antenna = new THREE.Mesh(track(new THREE.IcosahedronGeometry(0.035, 1)), track(makeGlowMaterial('#ff4d4d', 3)))
  antenna.position.copy(MAST_TOP)
  const ringGeo = track(new THREE.TorusGeometry(1, 0.01, 4, 64).rotateX(Math.PI / 2))
  const rings = [0, 1, 2].map(() => {
    const r = new THREE.Mesh(ringGeo, track(makeRingMaterial()))
    r.position.copy(MAST_TOP)
    r.visible = false
    return r
  })
  groups.tower.add(hands, antenna, ...rings)

  return {
    statics,
    cloudRing,
    groups,
    openables,
    mats,
    sky,
    stars,
    fireflies,
    logo,
    groundRing,
    faceMat,
    bulbMat,
    hands,
    antenna,
    rings,
    lights,
    dispose: () => disposables.forEach((d) => d.dispose()),
  }
}

/* ---------------- walkers ---------------- */
function Walkers({ reduced }: { reduced: boolean }) {
  const data = useMemo(() => {
    const geo = personGeometry()
    const mat = makeWorldMaterial({ emit: 0.12 })
    const R = rng(13)
    const counts = [11, 5, 4, 4, 4, 2, 2, 2, 2]
    const people: { route: number; s: number; v: number; dir: number; off: number }[] = []
    counts.forEach((n, ri) => {
      for (let k = 0; k < n; k++)
        people.push({ route: ri, s: R() * routes[ri].total, v: 0.12 + R() * 0.1, dir: R() < 0.5 ? 1 : -1, off: (R() - 0.5) * 0.18 })
    })
    const im = new THREE.InstancedMesh(geo, mat, people.length)
    const clothes = ['#e7d6b8', '#9db3e0', '#d98d77', '#f0c25e', '#86c4a6', '#c9a2e8', '#f2f0ea', '#e08aa6']
    const c = new THREE.Color()
    people.forEach((_, i) => {
      c.set(clothes[i % clothes.length])
      im.setColorAt(i, c)
    })
    im.frustumCulled = false
    return { im, people, geo, mat }
  }, [])
  useEffect(() => () => (data.geo.dispose(), data.mat.dispose()), [data])
  const m = useMemo(() => new THREE.Matrix4(), [])
  const q = useMemo(() => new THREE.Quaternion(), [])
  const p = useMemo(() => new THREE.Vector3(), [])
  const s = useMemo(() => new THREE.Vector3(1, 1, 1), [])
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), [])
  const step = (dt: number, t: number) => {
    data.people.forEach((w, i) => {
      const r = routes[w.route]
      w.s += w.v * dt * (r.loop ? w.dir : 1)
      let u: number
      let dirSign = 1
      if (r.loop) u = ((w.s % r.total) + r.total) % r.total
      else {
        const period = r.total * 2
        const k = ((w.s % period) + period) % period
        u = k <= r.total ? k : period - k
        dirSign = k <= r.total ? 1 : -1
      }
      let j = 1
      while (j < r.len.length - 1 && r.len[j] < u) j++
      const a = r.pts[j - 1], b = r.pts[j]
      const segL = r.len[j] - r.len[j - 1] || 1
      const f = (u - r.len[j - 1]) / segL
      const dx = (b.x - a.x) * dirSign * (r.loop ? w.dir : 1)
      const dz = (b.z - a.z) * dirSign * (r.loop ? w.dir : 1)
      const len = Math.hypot(dx, dz) || 1
      // side offset so people don't walk in single file
      const ox = (-dz / len) * w.off
      const oz = (dx / len) * w.off
      p.set(a.x + (b.x - a.x) * f + ox, 0, a.z + (b.z - a.z) * f + oz)
      p.y = groundY(p.x, p.z) + Math.abs(Math.sin(t * 9 * w.v * 6 + i)) * 0.012
      q.setFromAxisAngle(up, Math.atan2(dx, dz))
      m.compose(p, q, s)
      data.im.setMatrixAt(i, m)
    })
    data.im.instanceMatrix.needsUpdate = true
  }
  useEffect(() => step(0, 0), []) // eslint-disable-line react-hooks/exhaustive-deps
  useFrame((st, dt) => {
    if (reduced) return
    step(Math.min(dt, 0.05), st.clock.elapsedTime)
  })
  return <primitive object={data.im} />
}

/* ---------------- scene ---------------- */
export function Scene({ view, reduced, mobile, go }: SceneProps) {
  const { gl, camera, viewport } = useThree()
  const w = useMemo(() => buildWorld(Math.min(viewport.dpr, 2)), []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => w.dispose(), [w])
  const root = useRef<THREE.Group>(null)
  const viewRef = useRef(view)
  useEffect(() => {
    viewRef.current = view
  }, [view])

  // sign anchors
  useEffect(() => {
    for (const [id, p] of Object.entries(signAnchor)) anchors.set(id, p)
  }, [])

  // intro: the island rises, lamps come on along the paths, windows light, the mark ignites
  useEffect(() => {
    const g = root.current!
    if (reduced) {
      shared.uGlowOn.value = 1
      shared.uLit.value = 1
      shared.uMon.value = 1
      g.position.y = 0
      campus.set({ introDone: true })
      return
    }
    shared.uGlowOn.value = 0
    shared.uLit.value = 0
    shared.uMon.value = 0
    g.position.y = -2.6
    const tl = gsap.timeline()
    tl.to(g.position, { y: 0, duration: 2.4, ease: 'power3.out' }, 0)
    tl.to(shared.uGlowOn, { value: 1, duration: 1.6, ease: 'steps(9)' }, 1.0)
    tl.to(shared.uLit, { value: 1, duration: 2.0, ease: 'power1.in' }, 1.3)
    tl.to(shared.uMon, { value: 1, duration: 1.0, ease: 'expo.in' }, 2.3)
    tl.call(() => campus.set({ introDone: true }), [], 2.9)
    return () => {
      tl.kill()
    }
  }, [reduced])

  const setCursor = (on: boolean) => {
    gl.domElement.style.cursor = on ? 'pointer' : ''
  }
  const activate = (id: BuildingId) => {
    const route = { studio: 'work', amphi: 'team', library: 'journal', tower: 'contact', monument: '' }[id]
    if (id === 'monument') {
      campus.set({ aboutOpen: true })
      if (viewRef.current.kind !== 'home') go(BASE)
      return
    }
    go(`${BASE}/${route}`)
  }
  const handlers = (id: BuildingId) => ({
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      if (VIEW_BUILDING[viewRef.current.kind] === id) return
      campus.set({ hoverBuilding: id })
      setCursor(true)
    },
    onPointerOut: () => {
      if (campus.get().hoverBuilding === id) campus.set({ hoverBuilding: null })
      setCursor(false)
    },
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation()
      if (e.delta > 6) return
      if (VIEW_BUILDING[viewRef.current.kind] === id && id !== 'monument') return
      activate(id)
    },
  })

  const lastSec = useRef(-1)
  const tmp = useMemo(
    () => ({ m: new THREE.Matrix4(), x: new THREE.Vector3(), y: new THREE.Vector3(), z: new THREE.Vector3(), p: new THREE.Vector3(), c: new THREE.Color() }),
    [],
  )
  const faceBase = useMemo(() => w.faceMat.color.clone(), [w])
  const bulbBase = useMemo(() => w.bulbMat.color.clone(), [w])

  const updateHands = () => {
    const t = istTime()
    const sec = t.getSeconds()
    if (sec === lastSec.current) return
    lastSec.current = sec
    const mins = t.getMinutes() + sec / 60
    const hrs = (t.getHours() % 12) + mins / 60
    const angles = [(hrs / 12) * Math.PI * 2, (mins / 60) * Math.PI * 2]
    const lens = [0.15, 0.23]
    const { m, x, y, z, p } = tmp
    let k = 0
    for (let s = 0; s < 4; s++) {
      const a = (s * Math.PI) / 2
      z.set(Math.sin(a), 0, Math.cos(a))
      const right = tmp.c.setRGB(Math.cos(a), 0, -Math.sin(a))
      for (let h = 0; h < 2; h++) {
        const ang = angles[h]
        y.set(right.r * Math.sin(ang), Math.cos(ang), right.b * Math.sin(ang))
        x.crossVectors(y, z)
        m.makeBasis(x, y, z)
        m.scale(p.set(h ? 0.016 : 0.024, lens[h], 0.008))
        p.set(TOWER_POS.x + z.x * (CLOCK_R + 0.006 + h * 0.003), CLOCK_Y, TOWER_POS.z + z.z * (CLOCK_R + 0.006 + h * 0.003)).addScaledVector(y, lens[h] / 2 - 0.02)
        m.setPosition(p)
        w.hands.setMatrixAt(k++, m)
      }
    }
    w.hands.instanceMatrix.needsUpdate = true
  }

  useFrame((state, dt) => {
    const d = Math.min(dt, 0.05)
    const t = state.clock.elapsedTime
    if (!reduced) shared.uTime.value = t
    const st = campus.get()
    const v = viewRef.current
    const inside = VIEW_BUILDING[v.kind]
    // hover glow
    for (const id of Object.keys(w.mats) as BuildingId[]) {
      const target = st.hoverBuilding === id ? 1 : 0
      const u = w.mats[id].world.uniforms.uHi
      u.value += (target - u.value) * Math.min(1, d * 8)
      w.mats[id].win.uniforms.uHi.value = u.value
    }
    ;(w.logo.material as THREE.ShaderMaterial).uniforms.uHi.value = w.mats.monument.world.uniforms.uHi.value + (st.aboutOpen ? 0.5 : 0)
    ;(w.groundRing.material as THREE.ShaderMaterial).uniforms.uHi.value = (w.logo.material as THREE.ShaderMaterial).uniforms.uHi.value
    // openings: lid swings back, front folds down
    for (const [id, ops] of Object.entries(w.openables) as [BuildingId, Openable[]][]) {
      const target = inside === id && id !== 'amphi' ? 1 : 0
      for (const o of ops) {
        o.open += (target - o.open) * Math.min(1, d * (reduced ? 60 : 2.6))
        const e = o.open * o.open * (3 - 2 * o.open)
        if (o.kind === 'lid') o.group.rotation.x = -e * 1.95
        else o.group.rotation.x = e * 1.42
        o.win.uniforms.uFade.value = e
        o.win.uniforms.uHi.value = w.mats[id].win.uniforms.uHi.value
      }
    }
    // intro-driven emissives
    w.faceMat.color.copy(faceBase).multiplyScalar(0.12 + 0.88 * shared.uLit.value)
    w.bulbMat.color.copy(bulbBase).multiplyScalar(0.05 + 0.95 * shared.uGlowOn.value)
    // monument turns slowly to watch the camera
    const az = Math.atan2(camera.position.x, camera.position.z)
    // always faces the camera on Y (never edge-on), with a gentle sway
    const wob = reduced ? 0 : Math.sin(t * 0.35) * 0.2
    let diff = az + wob - w.logo.rotation.y
    diff = Math.atan2(Math.sin(diff), Math.cos(diff))
    w.logo.rotation.y += diff * Math.min(1, d * 3)
    if (!reduced) w.logo.position.y = MARK_Y + Math.sin(t * 0.8) * 0.03
    // antenna + radio rings
    const since = (performance.now() - st.transmitAt) / 1000
    const blink = reduced ? 0.6 : Math.pow(Math.max(0, Math.sin(t * 2.6)), 8)
    ;(w.antenna.material as THREE.MeshBasicMaterial).color.setRGB(1, 0.3, 0.3).multiplyScalar(0.4 + blink * 3 + (since < 2.5 ? 3 : 0))
    w.rings.forEach((r, i) => {
      const mat = r.material as THREE.ShaderMaterial
      let k = -1
      let maxR = 0.9
      if (since < 3.2) {
        k = (since - i * 0.45) / 2.2
        maxR = 4.2
      } else if (!reduced && v.kind === 'contact') {
        k = ((t * 0.45 + i / 3) % 1) * 1.0
        maxR = 1.1
      }
      if (k < 0 || k > 1) {
        r.visible = false
        return
      }
      r.visible = true
      r.scale.setScalar(0.08 + k * maxR)
      mat.uniforms.uA.value = (1 - k) ** 1.5 * (since < 3.2 ? 1.2 : 0.45)
    })
    updateHands()
    if (!reduced) {
      w.cloudRing.rotation.y += d * 0.012
      w.stars.rotation.y += d * 0.004
    }
  })

  // fly-over intro dims nothing; when inside a building others dim slightly
  return (
    <group ref={root}>
      <primitive object={w.sky} />
      <primitive object={w.stars} />
      <primitive object={w.statics} />
      <primitive object={w.cloudRing} />
      <primitive object={w.fireflies} />
      <primitive object={w.groups.tower} {...handlers('tower')} />
      <primitive object={w.groups.studio} {...handlers('studio')} />
      <primitive object={w.groups.library} {...handlers('library')} />
      <primitive object={w.groups.amphi} {...handlers('amphi')} />
      <primitive object={w.groups.monument} {...handlers('monument')} />
      <Walkers reduced={reduced} />
      <Exhibits view={view} go={go} mobile={mobile} lights={w.lights} />
    </group>
  )
}
