import * as THREE from 'three'
import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { designBase } from '../../registry'
import {
  CHAMBER_Z,
  GATE_POS,
  PORTALS,
  PORTAL_BOUNDS,
  RINGS,
  TEAM_ORIGIN,
  TEAM_RAIL,
  WORLD_RAIL,
  W,
  portalById,
  toLocal,
  worldItems,
} from '../layout'
import { api, live, store, targetKey, type Space, type Target, type WorldId } from '../store'

interface Pose {
  p: THREE.Vector3
  l: THREE.Vector3
}
type Region = 'front' | 'corridor' | 'team' | WorldId

interface Rail {
  kind: 'home' | 'world' | 'team'
  world?: WorldId
  len: number
  stations?: number[]
  pose(u: number, p: THREE.Vector3, l: THREE.Vector3): void
}

const WORLD_IDS: WorldId[] = ['code', 'design', 'film']
const tmpL = new THREE.Vector3()
const lp = new THREE.Vector3()
const lc = new THREE.Vector3()
const isWorld = (r: string): r is WorldId => (WORLD_IDS as string[]).includes(r)
const T_CROSS = 0.3

/* ------------------------------------------------------------------ rails */

function fovFor(aspect: number) {
  return aspect < 1 ? 52 : 40
}

function buildHome(aspect: number): Rail {
  const tanV = Math.tan(THREE.MathUtils.degToRad(fovFor(aspect) / 2))
  const frontD = Math.max(13.6 / 2 / tanV, 8.4 / 2 / (tanV * aspect))
  const ringD = Math.max(9, 5 / (tanV * aspect))
  const chamberD = aspect < 0.9 ? Math.max(9.5, 2.9 / (tanV * aspect)) : Math.max(13, 8.8 / (tanV * aspect))
  const P = [
    new THREE.Vector3(GATE_POS.x, GATE_POS.y - 0.9, frontD),
    new THREE.Vector3(0.05, 0, 5),
    new THREE.Vector3(0, 0, -3.6),
    new THREE.Vector3(0, 0.25, RINGS[0].z + ringD),
    new THREE.Vector3(0, 0.25, RINGS[1].z + ringD),
    new THREE.Vector3(0, 0.25, RINGS[2].z + ringD),
    new THREE.Vector3(0, -0.6, CHAMBER_Z + chamberD),
  ]
  const L = [
    new THREE.Vector3(GATE_POS.x, GATE_POS.y - 0.75, 0),
    new THREE.Vector3(0, 0, -6),
    new THREE.Vector3(0, 0.2, -16),
    new THREE.Vector3(0, 0.45, RINGS[0].z),
    new THREE.Vector3(0, 0.45, RINGS[1].z),
    new THREE.Vector3(0, 0.45, RINGS[2].z),
    new THREE.Vector3(0, -1.25, CHAMBER_Z),
  ]
  const cp = new THREE.CatmullRomCurve3(P, false, 'centripetal')
  const cl = new THREE.CatmullRomCurve3(L, false, 'centripetal')
  const n = P.length - 1
  return {
    kind: 'home',
    len: cp.getLength(),
    stations: [0, 3 / n, 4 / n, 5 / n, 1],
    pose(u, p, l) {
      cp.getPoint(THREE.MathUtils.clamp(u, 0, 1), p)
      cl.getPoint(THREE.MathUtils.clamp(u, 0, 1), l)
      if (aspect < 0.9 && u > 5 / n) {
        // narrow screens: drift toward the selected portal
        const k = THREE.MathUtils.smoothstep(u, 5 / n, 1)
        const sp = portalById(store.get().selected)
        p.x += sp.x * 0.92 * k
        p.z += (sp.z - CHAMBER_Z) * k
        l.x += sp.x * k
      }
    },
  }
}

function buildWorld(id: WorldId): Rail {
  const r = WORLD_RAIL[id]
  return {
    kind: 'world',
    world: id,
    len: Math.abs(r.end - r.start),
    pose(u, p, l) {
      const z = THREE.MathUtils.lerp(r.start, r.end, THREE.MathUtils.clamp(u, 0, 1))
      W(id, 0, 0, z, p)
      W(id, 0, -0.15, z - 10, l)
    },
  }
}

function buildTeam(): Rail {
  return {
    kind: 'team',
    len: Math.abs(TEAM_RAIL.end - TEAM_RAIL.start),
    pose(u, p, l) {
      const z = THREE.MathUtils.lerp(TEAM_RAIL.start, TEAM_RAIL.end, THREE.MathUtils.clamp(u, 0, 1))
      p.set(TEAM_ORIGIN.x, TEAM_ORIGIN.y, TEAM_ORIGIN.z + z)
      l.set(TEAM_ORIGIN.x, TEAM_ORIGIN.y, TEAM_ORIGIN.z + z - 10)
    },
  }
}

function worldU(id: WorldId, localZ: number) {
  const r = WORLD_RAIL[id]
  return THREE.MathUtils.clamp((localZ - r.start) / (r.end - r.start), 0, 1)
}

/** Camera pose that frames a world item with room for its detail panel. */
export function detailPose(world: WorldId, slug: string, aspect: number): (Pose & { anchor: THREE.Vector3 }) | null {
  const pl = worldItems(world).find((x) => x.item.slug === slug)
  if (!pl) return null
  const tanV = Math.tan(THREE.MathUtils.degToRad(fovFor(aspect) / 2))
  const n = new THREE.Vector3(0, 0, 1).applyQuaternion(pl.quat)
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(pl.quat)
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(pl.quat)
  const w = world === 'design' ? 3 : pl.w
  const h = pl.h
  const c = pl.pos.clone()
  let p: THREE.Vector3
  let l: THREE.Vector3
  let anchor: THREE.Vector3
  if (aspect < 0.9) {
    const d = Math.max((h * 2.8) / 2 / tanV, (w * 1.2) / 2 / (tanV * aspect))
    l = c.clone().addScaledVector(up, -h * 0.75)
    p = l.clone().addScaledVector(n, d)
    anchor = c.clone().addScaledVector(up, -h / 2 - 0.15)
  } else {
    const d = Math.max((h * 2.1) / 2 / tanV, (w * 2.6) / 2 / (tanV * aspect))
    l = c.clone().addScaledVector(right, w * 0.62)
    p = l.clone().addScaledVector(n, d)
    anchor = c.clone().addScaledVector(right, w / 2 + 0.3).addScaledVector(up, h * 0.12)
  }
  return { p: W(world, p.x, p.y, p.z), l: W(world, l.x, l.y, l.z), anchor: W(world, anchor.x, anchor.y, anchor.z) }
}

function contactPose(aspect: number): Pose {
  const tanV = Math.tan(THREE.MathUtils.degToRad(fovFor(aspect) / 2))
  const d = Math.max(28, 8 / 2 / (tanV * aspect))
  return {
    p: new THREE.Vector3(GATE_POS.x, -1.3, d),
    l: new THREE.Vector3(GATE_POS.x, -1.3 - d * 0.0963, 0),
  }
}

/* -------------------------------------------------------------- flight */

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

interface Flight {
  cp: THREE.CatmullRomCurve3
  cl: THREE.CatmullRomCurve3
  t: number
  dur: number
  done: () => void
}

/* ------------------------------------------------------------------- rig */

export function CameraRig() {
  const { camera, size, gl } = useThree()
  const cam = camera as THREE.PerspectiveCamera

  const r = useRef({
    mode: 'rail' as 'rail' | 'flight' | 'pose',
    rail: null as Rail | null,
    u: 0,
    uTarget: 0,
    pose: null as Pose | null,
    flight: null as Flight | null,
    space: 'outside' as Space,
    prev: new THREE.Vector3(),
    p: new THREE.Vector3(),
    l: new THREE.Vector3(),
    curL: new THREE.Vector3(0, 0, -1),
    push: 0,
    lastInput: 0,
    par: new THREE.Vector2(),
    homeRail: buildHome(1.6),
    aspect: 1.6,
    key: '',
    frontZ: 20,
    started: false,
    startedAt: 0,
    fogCol: new THREE.Color('#050d11'),
    tmpA: new THREE.Vector3(),
    tmpB: new THREE.Vector3(),
  })

  /* --------------------------------------------------------- helpers */
  const region = (): Region => {
    const s = r.current.space
    if (s !== 'outside') return s
    if (cam.position.y > 14) return 'team'
    return cam.position.z > 1.2 ? 'front' : 'corridor'
  }

  const setSpace = (s: Space) => {
    if (r.current.space === s) return
    r.current.space = s
    store.set({ space: s, hoverItem: null, hoverPortal: null })
  }

  const nearestHomeU = (pos: THREE.Vector3) => {
    const rail = r.current.homeRail
    let best = 0
    let bd = Infinity
    const p = r.current.tmpA
    const l = r.current.tmpB
    for (const u of rail.stations!) {
      rail.pose(u, p, l)
      const d = Math.abs(p.z - pos.z) + Math.abs(p.x - pos.x) * 0.5
      if (d < bd) {
        bd = d
        best = u
      }
    }
    return best
  }

  /** Resolve where a target puts the camera (+ rail to continue on). */
  const resolve = (t: Target) => {
    const reg = region()
    const out = { p: new THREE.Vector3(), l: new THREE.Vector3(), rail: null as Rail | null, u: 0, pose: null as Pose | null, reg: 'front' as Region }
    if (t.kind === 'home') {
      const rail = r.current.homeRail
      let u = 0
      if (isWorld(reg)) u = 1
      else if (reg === 'front') u = 0
      else u = nearestHomeU(cam.position)
      if (r.current.rail?.kind === 'home' && reg !== 'team') u = r.current.uTarget
      rail.pose(u, out.p, out.l)
      out.rail = rail
      out.u = u
      out.reg = u < 0.3 && out.p.z > 1.2 ? 'front' : 'corridor'
    } else if (t.kind === 'contact') {
      const pose = contactPose(r.current.aspect)
      out.p.copy(pose.p)
      out.l.copy(pose.l)
      out.pose = pose
      out.reg = 'front'
    } else if (t.kind === 'team') {
      const rail = buildTeam()
      const u = reg === 'team' && r.current.rail?.kind === 'team' ? r.current.uTarget : 0
      rail.pose(u, out.p, out.l)
      out.rail = rail
      out.u = u
      out.reg = 'team'
    } else {
      const rail = buildWorld(t.world)
      out.reg = t.world
      out.rail = rail
      const dp = t.focus ? detailPose(t.world, t.focus, r.current.aspect) : null
      if (dp) {
        out.p.copy(dp.p)
        out.l.copy(dp.l)
        out.pose = { p: dp.p, l: dp.l }
        const pl = worldItems(t.world).find((x) => x.item.slug === t.focus)!
        out.u = worldU(t.world, pl.pos.z + 3)
      } else {
        let u = 0
        if (reg === t.world) u = worldU(t.world, toLocal(t.world, cam.position, r.current.tmpA).z)
        rail.pose(u, out.p, out.l)
        out.u = u
      }
    }
    return out
  }

  /** Waypoints from the camera's current place to a destination, threading the doorways. */
  const route = (dest: { p: THREE.Vector3; l: THREE.Vector3; reg: Region }) => {
    const wps: Pose[] = [{ p: cam.position.clone(), l: r.current.curL.clone() }]
    let reg = region()
    const add = (p: THREE.Vector3, l: THREE.Vector3) => wps.push({ p, l })
    if (isWorld(reg) && dest.reg !== reg) {
      const z = Math.min(toLocal(reg, cam.position, r.current.tmpA).z, -2)
      add(W(reg, 0, 0, z), W(reg, 0, 0, z - 12))
      add(W(reg, 0, 0, -1.2), W(reg, 0, 0, -12))
      add(W(reg, 0, 0, 3.8), W(reg, 0, 0, -8))
      add(new THREE.Vector3(0, 0, CHAMBER_Z + 12), new THREE.Vector3(0, -0.6, CHAMBER_Z))
      reg = 'corridor'
    }
    if (reg === 'team' && dest.reg !== 'team') {
      const z = cam.position.z
      add(new THREE.Vector3(0, TEAM_ORIGIN.y - 6, z + 6), new THREE.Vector3(0, TEAM_ORIGIN.y - 14, z - 14))
      add(new THREE.Vector3(0, 8, Math.min(z + 8, -6)), new THREE.Vector3(0, 0, Math.min(z - 10, -16)))
      reg = 'corridor'
    }
    if (reg === 'front' && dest.reg !== 'front') {
      add(new THREE.Vector3(0.02, 0, 3.2), new THREE.Vector3(0, 0, -8))
      add(new THREE.Vector3(0, 0, -3.2), new THREE.Vector3(0, 0.1, -14))
      reg = 'corridor'
    }
    if (reg === 'corridor' && dest.reg === 'front') {
      add(new THREE.Vector3(0, 0, -3.2), new THREE.Vector3(0, 0, -16))
      add(new THREE.Vector3(0, 0, 3.2), new THREE.Vector3(0, 0, -10))
    }
    if (dest.reg === 'team' && reg !== 'team') {
      const tz = TEAM_ORIGIN.z + TEAM_RAIL.start
      add(new THREE.Vector3(0, 0.5, tz + 4), new THREE.Vector3(0, 6, tz - 10))
      add(new THREE.Vector3(0, TEAM_ORIGIN.y - 12, tz + 8), new THREE.Vector3(0, TEAM_ORIGIN.y - 2, tz - 8))
    }
    if (isWorld(dest.reg) && reg !== dest.reg) {
      const pd = portalById(dest.reg)
      add(new THREE.Vector3(pd.x * 0.35, 0, CHAMBER_Z + 11), W(dest.reg, 0, 0, 0))
      add(W(dest.reg, 0, 0, 3.8), W(dest.reg, 0, 0, -10))
      add(W(dest.reg, 0, 0, -1.4), W(dest.reg, 0, 0, -12))
      const dl = toLocal(dest.reg, dest.p, r.current.tmpA)
      if (dl.z < -6) add(W(dest.reg, 0, 0, dl.z + 5), W(dest.reg, 0, 0, dl.z - 6))
    }
    add(dest.p.clone(), dest.l.clone())
    // drop points that sit on top of each other (Catmull-Rom kinks)
    const clean: Pose[] = [wps[0]]
    for (let i = 1; i < wps.length; i++) {
      const last = clean[clean.length - 1]
      if (wps[i].p.distanceTo(last.p) > 0.9 || i === wps.length - 1) clean.push(wps[i])
    }
    if (clean.length >= 3 && clean[clean.length - 1].p.distanceTo(clean[clean.length - 2].p) < 0.9) clean.splice(clean.length - 2, 1)
    return clean
  }

  const goto = (t: Target, instant = false) => {
    const R = r.current
    const dest = resolve(t)
    const finish = () => {
      R.flight = null
      if (dest.pose) {
        R.mode = 'pose'
        R.pose = { p: dest.p.clone(), l: dest.l.clone() }
        R.rail = dest.rail
        R.u = R.uTarget = dest.u
      } else {
        R.mode = 'rail'
        R.rail = dest.rail
        R.u = R.uTarget = dest.u
      }
      store.set({ flying: false })
    }
    const reduced = store.get().reduced
    if (instant || reduced) {
      cam.position.copy(dest.p)
      R.curL.copy(dest.l)
      cam.lookAt(dest.l)
      R.prev.copy(dest.p)
      setSpace(isWorld(dest.reg) ? dest.reg : 'outside')
      if (!instant) store.set({ cut: store.get().cut + 1 })
      finish()
      return
    }
    const wps = route(dest)
    if (wps.length < 2 || wps[0].p.distanceTo(wps[wps.length - 1].p) < 0.05) {
      finish()
      return
    }
    const cp = new THREE.CatmullRomCurve3(
      wps.map((w) => w.p),
      false,
      'centripetal',
    )
    const cl = new THREE.CatmullRomCurve3(
      wps.map((w) => w.l),
      false,
      'centripetal',
    )
    const len = cp.getLength()
    R.flight = { cp, cl, t: 0, dur: THREE.MathUtils.clamp(0.7 + len / 30, 1.0, 3.4), done: finish }
    R.mode = 'flight'
    store.set({ flying: true, hoverPortal: null, hoverItem: null })
  }

  /* ---------------------------------------------------------- input */
  const scroll = (dy: number) => {
    const R = r.current
    const s = store.get()
    if (s.flying || R.mode === 'flight') return
    R.lastInput = performance.now()
    const base = designBase('portal')
    if (s.target.kind === 'contact') {
      if (dy > 40) api.navigate(base)
      return
    }
    if (R.mode === 'pose' || !R.rail) return
    const rail = R.rail
    if (s.reduced) {
      // discrete steps (cuts) instead of continuous travel
      R.push += dy
      if (Math.abs(R.push) < 90) return
      const dir = Math.sign(R.push)
      R.push = 0
      if (rail.kind === 'home') {
        const i = s.station + dir
        if (i > 4) return enterSelected()
        if (i < 0) return
        R.uTarget = R.u = rail.stations![i]
      } else {
        const next = R.uTarget + dir * (9 / rail.len)
        if (next < 0) return api.navigate(base)
        R.uTarget = R.u = THREE.MathUtils.clamp(next, 0, 1)
      }
      store.set({ cut: s.cut + 1 })
      return
    }
    const du = (dy * 0.03) / rail.len
    const next = R.uTarget + du
    if (next > 1) {
      R.uTarget = 1
      if (rail.kind === 'home' && R.u > 0.985) {
        R.push += next - 1
        if (R.push > 0.05) {
          R.push = 0
          enterSelected()
        }
      }
    } else if (next < 0) {
      R.uTarget = 0
      if (rail.kind !== 'home' && R.u < 0.02) {
        R.push += -next
        if (R.push > 0.04) {
          R.push = 0
          api.navigate(base)
        }
      }
    } else {
      R.uTarget = next
      R.push = 0
    }
  }

  const enterSelected = () => {
    const p = portalById(store.get().selected)
    api.navigate(`${designBase('portal')}/${p.route}`)
  }

  const goStation = (i: number) => {
    const R = r.current
    const s = store.get()
    if (s.target.kind !== 'home') {
      api.navigate(designBase('portal'))
      return
    }
    if (!R.rail || R.rail.kind !== 'home' || s.flying) return
    const st = R.rail.stations!
    const k = THREE.MathUtils.clamp(i, 0, st.length - 1)
    R.uTarget = st[k]
    if (s.reduced) {
      R.u = R.uTarget
      store.set({ cut: s.cut + 1 })
    }
  }

  useEffect(() => {
    live.camera = cam
    return () => {
      live.camera = null
    }
  }, [cam])

  useEffect(() => {
    api.scrollBy = scroll
    api.goStation = goStation
  })

  useEffect(() => {
    const el = gl.domElement.parentElement?.parentElement ?? gl.domElement
    const root = el.closest('.pt-root') ?? el
    const onWheel = (e: WheelEvent) => {
      const t = e.target as HTMLElement
      if (t.closest?.('.pt-scroll')) return
      e.preventDefault()
      const k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 600 : 1
      scroll(THREE.MathUtils.clamp(e.deltaY * k, -240, 240))
    }
    let ty = 0
    let tx = 0
    let t0 = 0
    const onTouchStart = (e: TouchEvent) => {
      ty = e.touches[0].clientY
      tx = e.touches[0].clientX
      t0 = tx
    }
    const onTouchMove = (e: TouchEvent) => {
      const t = e.target as HTMLElement
      if (t.closest?.('.pt-scroll')) return
      const y = e.touches[0].clientY
      const x = e.touches[0].clientX
      if (Math.abs(y - ty) > 2) scroll((ty - y) * 2.6)
      ty = y
      tx = x
      if (e.cancelable) e.preventDefault()
    }
    const onTouchEnd = () => {
      const dx = tx - t0
      const s = store.get()
      if (Math.abs(dx) > 60 && s.target.kind === 'home' && s.station === 4) {
        const ids = PORTALS.map((p) => p.id)
        const i = ids.indexOf(s.selected)
        const j = THREE.MathUtils.clamp(i + (dx < 0 ? 1 : -1), 0, 2)
        store.set({ selected: ids[j] })
      }
    }
    const onMove = (e: PointerEvent) => {
      live.pointerX = (e.clientX / window.innerWidth) * 2 - 1
      live.pointerY = -(e.clientY / window.innerHeight) * 2 + 1
    }
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      const s = store.get()
      const base = designBase('portal')
      const home = s.target.kind === 'home'
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && t.tagName !== 'BUTTON' && t.tagName !== 'A')) {
        e.preventDefault()
        if (home && !s.reduced) {
          if (s.station >= 4) enterSelected()
          else goStation(s.station + 1)
        } else scroll(s.reduced ? 100 : 240)
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault()
        if (home && !s.reduced) goStation(s.station - 1)
        else scroll(s.reduced ? -100 : -240)
      } else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && home && s.station === 4) {
        const ids = PORTALS.map((p) => p.id)
        const i = ids.indexOf(s.selected)
        store.set({ selected: ids[THREE.MathUtils.clamp(i + (e.key === 'ArrowRight' ? 1 : -1), 0, 2)] })
      } else if (e.key === 'Enter' && home && s.station === 4 && t.tagName !== 'A' && t.tagName !== 'BUTTON') {
        enterSelected()
      } else if (e.key === 'Escape') {
        if (s.target.kind === 'world' && s.target.focus) api.navigate(s.target.world === 'design' ? `${base}/journal` : `${base}/work${s.target.world === 'film' ? '?world=film' : ''}`)
        else if (s.target.kind !== 'home') api.navigate(base)
      }
    }
    root.addEventListener('wheel', onWheel as EventListener, { passive: false })
    root.addEventListener('touchstart', onTouchStart as EventListener, { passive: true })
    root.addEventListener('touchmove', onTouchMove as EventListener, { passive: false })
    root.addEventListener('touchend', onTouchEnd as EventListener)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('keydown', onKey)
    return () => {
      root.removeEventListener('wheel', onWheel as EventListener)
      root.removeEventListener('touchstart', onTouchStart as EventListener)
      root.removeEventListener('touchmove', onTouchMove as EventListener)
      root.removeEventListener('touchend', onTouchEnd as EventListener)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('keydown', onKey)
    }
  }, [gl])

  /* ---------------------------------------------------- aspect/rails */
  useEffect(() => {
    const R = r.current
    const aspect = size.width / Math.max(1, size.height)
    R.aspect = aspect
    cam.fov = fovFor(aspect)
    cam.near = 0.08
    cam.far = 260
    cam.updateProjectionMatrix()
    R.homeRail = buildHome(aspect)
    R.homeRail.pose(0, R.tmpA, R.tmpB)
    R.frontZ = R.tmpA.z
    if (R.rail?.kind === 'home') R.rail = R.homeRail
    const t = store.get().target
    if (R.mode === 'pose' && R.started) {
      const res = resolve(t)
      if (res.pose) R.pose = { p: res.p.clone(), l: res.l.clone() }
    }
  }, [size.width, size.height])

  /* --------------------------------------------------- target follow */
  useEffect(() => {
    const onChange = () => {
      const t = store.get().target
      const k = targetKey(t)
      if (k === r.current.key) return
      r.current.key = k
      if (!r.current.started || performance.now() - r.current.startedAt < 350) {
        const first = !r.current.started
        r.current.started = true
        if (first) r.current.startedAt = performance.now()
        // deep links start in place; the home route gets an arrival glide
        goto(t, true)
        if (first && t.kind === 'home' && !store.get().reduced) {
          const R = r.current
          R.homeRail.pose(0, R.p, R.l)
          cam.position.set(R.p.x, R.p.y + 1.2, R.p.z + 16)
          R.curL.copy(R.l)
          R.flight = {
            cp: new THREE.CatmullRomCurve3([cam.position.clone(), R.p.clone()]),
            cl: new THREE.CatmullRomCurve3([R.l.clone().add(new THREE.Vector3(0, 0.6, 0)), R.l.clone()]),
            t: 0,
            dur: 3.2,
            done: () => {
              R.flight = null
              R.mode = 'rail'
              store.set({ flying: false })
            },
          }
          R.mode = 'flight'
          R.prev.copy(cam.position)
          store.set({ flying: true })
        }
        return
      }
      goto(t)
    }
    onChange()
    return store.subscribe(onChange)
  }, [])

  /* ------------------------------------------------------------ frame */
  useFrame((state, rawDt) => {
    const R = r.current
    const dt = Math.min(rawDt, 1 / 20)
    const s = store.get()

    if (R.mode === 'flight' && R.flight) {
      const f = R.flight
      f.t += dt / f.dur
      const e = ease(Math.min(f.t, 1))
      f.cp.getPointAt(e, R.p)
      f.cl.getPointAt(e, R.l)
      cam.position.copy(R.p)
      R.curL.lerp(R.l, 1 - Math.exp(-dt * 14))
      if (f.t >= 1) {
        R.curL.copy(R.l)
        f.done()
      }
    } else {
      // idle snap to the nearest home station so copy settles in its frame
      if (R.rail?.kind === 'home' && R.mode === 'rail' && performance.now() - R.lastInput > 650 && !s.reduced) {
        let best = R.uTarget
        let bd = 0.045
        for (const st of R.rail.stations!) {
          const d = Math.abs(st - R.uTarget)
          if (d < bd) {
            bd = d
            best = st
          }
        }
        R.uTarget = best
      }
      if (R.mode === 'pose' && R.pose) {
        R.p.copy(R.pose.p)
        R.l.copy(R.pose.l)
      } else if (R.rail) {
        R.u += (R.uTarget - R.u) * (1 - Math.exp(-dt * (s.reduced ? 60 : 3.2)))
        if (Math.abs(R.uTarget - R.u) < 1e-5) R.u = R.uTarget
        R.rail.pose(R.u, R.p, R.l)
      }
      // pointer parallax (subtle sway around the axis)
      const k = s.reduced ? 0 : 1
      R.par.x += (live.pointerX * k - R.par.x) * (1 - Math.exp(-dt * 3))
      R.par.y += (live.pointerY * k - R.par.y) * (1 - Math.exp(-dt * 3))
      const amp = R.mode === 'pose' ? 0.12 : 0.38
      cam.position.copy(R.p)
      cam.position.x += R.par.x * amp
      cam.position.y += R.par.y * amp * 0.6
      // breathing
      if (!s.reduced) cam.position.y += Math.sin(state.clock.elapsedTime * 0.6) * 0.04
      R.curL.lerp(R.l, 1 - Math.exp(-dt * 10))
    }
    tmpL.copy(R.curL)
    if (tmpL.distanceToSquared(cam.position) < 1e-4) tmpL.z -= 1
    cam.lookAt(tmpL)
    cam.updateMatrixWorld()

    /* --- doorway crossing → which stencil space we are in */
    {
      if (R.space === 'outside') {
        for (const pd of PORTALS) {
          toLocal(pd.id, R.prev, lp)
          toLocal(pd.id, cam.position, lc)
          if (lp.z >= T_CROSS && lc.z < T_CROSS) {
            const t = (lp.z - T_CROSS) / (lp.z - lc.z)
            const x = lp.x + (lc.x - lp.x) * t
            const y = lp.y + (lc.y - lp.y) * t
            if (Math.abs(x) < PORTAL_BOUNDS.x * 1.1 && y < PORTAL_BOUNDS.top * 1.1 && y > PORTAL_BOUNDS.bottom * 1.1) {
              setSpace(pd.id)
              break
            }
          }
        }
      } else {
        const id = R.space
        toLocal(id, R.prev, lp)
        toLocal(id, cam.position, lc)
        if (lp.z < T_CROSS && lc.z >= T_CROSS) setSpace('outside')
      }
    }

    /* --- velocity → warp, streaks */
    const v = live.vel
    if (rawDt > 0) v.copy(cam.position).sub(R.prev).divideScalar(Math.max(rawDt, 1 / 240))
    R.prev.copy(cam.position)
    const sp = v.length()
    live.speed += (sp - live.speed) * (1 - Math.exp(-dt * 8))

    /* --- fog per space */
    const fog = state.scene.fog as THREE.FogExp2 | null
    if (fog) {
      const tgt = R.space === 'code' ? FOG.code : R.space === 'design' ? FOG.design : R.space === 'film' ? FOG.film : FOG.outside
      R.fogCol.lerp(tgt.c, 1 - Math.exp(-dt * 6))
      fog.color.copy(R.fogCol)
      fog.density += (tgt.d - fog.density) * (1 - Math.exp(-dt * 6))
    }

    /* --- UI bookkeeping (cheap; store ignores no-ops) */
    const reg = region()
    const patch: Partial<ReturnType<typeof store.get>> = { region: reg }
    if (R.rail?.kind === 'home' && R.mode === 'rail') {
      const st = R.rail.stations!
      let bi = 0
      for (let i = 0; i < st.length; i++) if (Math.abs(st[i] - R.u) < Math.abs(st[bi] - R.u)) bi = i
      patch.station = bi
    }
    if (isWorld(R.space)) {
      const lz = toLocal(R.space, cam.position, lp).z
      const items = worldItems(R.space)
      let bi = 0
      for (let i = 0; i < items.length; i++) if (Math.abs(items[i].pos.z - (lz - 6)) < Math.abs(items[bi].pos.z - (lz - 6))) bi = i
      patch.itemIndex = bi
    }
    store.set(patch)
    if (cam.position.y > 6 && !s.wanted.team) store.want('team')

    if (live.gaugeEl) {
      let depth: number
      if (isWorld(R.space)) depth = R.frontZ - CHAMBER_Z - toLocal(R.space, cam.position, lp).z
      else depth = R.frontZ - cam.position.z
      const txt = reg === 'team' ? `${cam.position.y.toFixed(1)}` : `${Math.max(0, depth).toFixed(1)}`
      if (live.gaugeEl.textContent !== txt) live.gaugeEl.textContent = txt
      if (live.gaugeLabelEl) {
        const lab = reg === 'team' ? 'altitude, m' : 'depth, m'
        if (live.gaugeLabelEl.textContent !== lab) live.gaugeLabelEl.textContent = lab
      }
    }
  }, -2)

  return null
}

const FOG = {
  outside: { c: new THREE.Color('#050d11'), d: 0.02 },
  code: { c: new THREE.Color('#031314'), d: 0.022 },
  design: { c: new THREE.Color('#0c040b'), d: 0.02 },
  film: { c: new THREE.Color('#0b0603'), d: 0.022 },
}
