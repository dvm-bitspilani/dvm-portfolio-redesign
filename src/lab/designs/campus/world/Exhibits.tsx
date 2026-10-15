import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { BASE, FEST_COLOR, VERTICAL_COLOR, exhibitProjects, journalItems, seatedMembers, type View } from '../content'
import { anchors, campus } from '../store'
import { Atlas } from './atlas'
import { journalSlots, posterSlots, seats, wedgeAnchors, type Slot } from './layout'
import { makeExhibitMaterial, makeWorldMaterial, PAL } from './materials'
import { personGeometry } from './campusGeo'
import type { GlowLight } from './builder'

const noRaycast = () => {}

function slotMatrix(s: Slot) {
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(s.tilt ?? 0, Math.atan2(s.n.x, s.n.z), 0, 'YXZ'))
  return new THREE.Matrix4().compose(s.p, q, new THREE.Vector3(s.w, s.h, 1))
}

/** A wall of framed images backed by one atlas = one draw call. */
function useGallery(items: { url?: string; aspect: number; label: string; tint: string }[], slots: Slot[], bright: number) {
  const g = useMemo(() => {
    const atlas = new Atlas(items, 256, 8)
    const geo = new THREE.PlaneGeometry(1, 1)
    geo.setAttribute('aRect', new THREE.InstancedBufferAttribute(atlas.rects, 4))
    const hi = new THREE.InstancedBufferAttribute(new Float32Array(items.length), 1)
    hi.setUsage(THREE.DynamicDrawUsage)
    geo.setAttribute('aHi', hi)
    const mat = makeExhibitMaterial(atlas.texture, bright)
    const im = new THREE.InstancedMesh(geo, mat, items.length)
    slots.forEach((s, i) => im.setMatrixAt(i, slotMatrix(s)))
    im.computeBoundingSphere()
    return { atlas, geo, mat, im, hi }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(
    () => () => {
      g.atlas.dispose()
      g.geo.dispose()
      g.mat.dispose()
    },
    [g],
  )
  return g
}

export function Exhibits({ view, go, mobile }: { view: View; go: (to: string) => void; mobile: boolean; lights: GlowLight[] }) {
  const { gl } = useThree()
  const viewRef = useRef(view)
  useEffect(() => {
    viewRef.current = view
  }, [view])
  const cursor = (on: boolean) => (gl.domElement.style.cursor = on ? 'pointer' : '')

  /* ---------- studio screens ---------- */
  const posters = useGallery(
    exhibitProjects.map((p) => ({ url: p.cover ?? p.mockup, aspect: 1.6, label: p.title, tint: FEST_COLOR[p.fest] })),
    posterSlots,
    1.05,
  )
  /* ---------- library: books + paintings ---------- */
  const journal = useGallery(
    journalItems.map((j, i) => ({ url: j.image, aspect: i < 9 ? 0.73 : 1.17, label: j.title, tint: j.kind === 'blog' ? '#8f72ff' : '#ff9a62' })),
    journalSlots,
    0.95,
  )

  /* ---------- amphitheatre audience ---------- */
  const audience = useMemo(() => {
    const geo = personGeometry()
    const mat = makeWorldMaterial({ emit: 0.42 })
    const im = new THREE.InstancedMesh(geo, mat, seatedMembers.length)
    const base: THREE.Color[] = []
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const up = new THREE.Vector3(0, 1, 0)
    seatedMembers.forEach((mem, i) => {
      const s = seats[i]
      q.setFromAxisAngle(up, s.yaw)
      m.compose(s.p, q, new THREE.Vector3(1, 0.92, 1))
      im.setMatrixAt(i, m)
      const c = new THREE.Color(VERTICAL_COLOR[mem.vertical])
      base.push(c)
      im.setColorAt(i, c)
    })
    im.computeBoundingSphere()
    return { geo, mat, im, base, scaleTarget: new Float32Array(seatedMembers.length).fill(1), scale: new Float32Array(seatedMembers.length).fill(1) }
  }, [])
  useEffect(() => () => (audience.geo.dispose(), audience.mat.dispose()), [audience])

  // load images lazily: after the intro, or immediately when deep-linked inside
  useEffect(() => {
    const inStudio = view.kind === 'work' || view.kind === 'project'
    const inLib = view.kind === 'journal'
    if (inStudio) posters.atlas.load()
    if (inLib) journal.atlas.load()
    const id = window.setTimeout(() => {
      posters.atlas.load()
      journal.atlas.load()
    }, 5200)
    return () => window.clearTimeout(id)
  }, [view.kind, posters, journal])

  // raycast only when you're inside that building
  const studioActive = view.kind === 'work' || view.kind === 'project'
  const libActive = view.kind === 'journal'
  const amphiActive = view.kind === 'team'
  useEffect(() => {
    posters.im.raycast = studioActive ? THREE.InstancedMesh.prototype.raycast : noRaycast
    journal.im.raycast = libActive ? THREE.InstancedMesh.prototype.raycast : noRaycast
    audience.im.raycast = amphiActive && !mobile ? THREE.InstancedMesh.prototype.raycast : noRaycast
  }, [studioActive, libActive, amphiActive, mobile, posters, journal, audience])

  const setCaption = (s: { p: THREE.Vector3; h: number }, key: string) => {
    anchors.set('caption', { x: s.p.x, y: s.p.y + s.h / 2 + 0.03, z: s.p.z })
    campus.set({ hoverItem: key })
  }
  const clearCaption = (prefix: string) => {
    const h = campus.get().hoverItem
    if (h && h.startsWith(prefix)) campus.set({ hoverItem: null })
    cursor(false)
  }

  const tmpC = useMemo(() => new THREE.Color(), [])
  const cur = useMemo(() => new THREE.Color(), [])
  const tmpM = useMemo(() => new THREE.Matrix4(), [])
  const tmpP = useMemo(() => new THREE.Vector3(), [])
  const tmpQ = useMemo(() => new THREE.Quaternion(), [])
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), [])
  const lamp = useMemo(() => new THREE.Color(PAL.lamp).multiplyScalar(1.6), [])

  useFrame((_, dt) => {
    posters.atlas.flush()
    journal.atlas.flush()
    const st = campus.get()
    const v = viewRef.current
    // hover / focus highlight on the walls
    const focusP = v.kind === 'project' ? v.focus : null
    const hoverP = st.hoverItem?.startsWith('p:') ? st.hoverItem.slice(2) : null
    let changed = false
    exhibitProjects.forEach((p, i) => {
      const val = p.slug === focusP ? 1 : p.slug === hoverP ? 0.7 : 0
      if (posters.hi.array[i] !== val) {
        ;(posters.hi.array as Float32Array)[i] = val
        changed = true
      }
    })
    if (changed) posters.hi.needsUpdate = true
    posters.mat.uniforms.uDim.value += ((focusP ? 0.55 : 0) - posters.mat.uniforms.uDim.value) * Math.min(1, dt * 4)

    const focusJ = v.kind === 'journal' ? v.focus : null
    const hoverJ = st.hoverItem && /^[ab]:/.test(st.hoverItem) ? st.hoverItem : null
    changed = false
    journalItems.forEach((j, i) => {
      const val = j.key === focusJ ? 1 : j.key === hoverJ ? 0.7 : 0
      if (journal.hi.array[i] !== val) {
        ;(journal.hi.array as Float32Array)[i] = val
        changed = true
      }
    })
    if (changed) journal.hi.needsUpdate = true
    journal.mat.uniforms.uDim.value += ((focusJ ? 0.5 : 0) - journal.mat.uniforms.uDim.value) * Math.min(1, dt * 4)

    // audience: filter dims other teams, hovered/selected member stands up and glows
    const focusM = v.kind === 'team' ? v.focus : null
    const hoverM = st.hoverItem?.startsWith('m:') ? st.hoverItem.slice(2) : null
    const filt = v.kind === 'team' ? st.teamFilter : null
    let colorsChanged = false
    let mats = false
    seatedMembers.forEach((m, i) => {
      const sel = m.slug === focusM || m.slug === hoverM
      tmpC.copy(audience.base[i])
      if (sel) tmpC.copy(lamp)
      else if (filt && m.vertical !== filt) tmpC.multiplyScalar(0.18)
      else if (focusM) tmpC.multiplyScalar(0.55)
      audience.im.getColorAt(i, cur)
      if (Math.abs(cur.r - tmpC.r) + Math.abs(cur.g - tmpC.g) + Math.abs(cur.b - tmpC.b) > 0.002) {
        audience.im.setColorAt(i, tmpC)
        colorsChanged = true
      }
      const target = sel ? 1.55 : 1
      const sc = audience.scale[i]
      if (Math.abs(sc - target) > 0.003) {
        audience.scale[i] = sc + (target - sc) * Math.min(1, dt * 10)
        const s = seats[i]
        tmpQ.setFromAxisAngle(up, s.yaw)
        tmpP.set(audience.scale[i], audience.scale[i] * 0.92, audience.scale[i])
        tmpM.compose(s.p, tmpQ, tmpP)
        audience.im.setMatrixAt(i, tmpM)
        mats = true
      }
    })
    if (colorsChanged && audience.im.instanceColor) audience.im.instanceColor.needsUpdate = true
    if (mats) audience.im.instanceMatrix.needsUpdate = true
  })

  // wedge label anchors for the team view
  useEffect(() => {
    for (const w of wedgeAnchors) anchors.set(`wedge:${w.v}`, w.p)
  }, [])

  return (
    <>
      <primitive
        object={posters.im}
        onPointerMove={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation()
          const i = e.instanceId
          if (i == null) return
          const key = `p:${exhibitProjects[i].slug}`
          if (campus.get().hoverItem !== key) setCaption(posterSlots[i], key)
          cursor(true)
        }}
        onPointerOut={() => clearCaption('p:')}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation()
          if (e.delta > 6 || e.instanceId == null) return
          go(`${BASE}/work/${exhibitProjects[e.instanceId].slug}`)
        }}
      />
      <primitive
        object={journal.im}
        onPointerMove={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation()
          const i = e.instanceId
          if (i == null) return
          const key = journalItems[i].key
          if (campus.get().hoverItem !== key) setCaption(journalSlots[i], key)
          cursor(true)
        }}
        onPointerOut={() => clearCaption(campus.get().hoverItem?.startsWith('b:') ? 'b:' : 'a:')}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation()
          if (e.delta > 6 || e.instanceId == null) return
          go(`${BASE}/journal?item=${encodeURIComponent(journalItems[e.instanceId].key)}`)
        }}
      />
      <primitive
        object={audience.im}
        onPointerMove={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation()
          const i = e.instanceId
          if (i == null) return
          const key = `m:${seatedMembers[i].slug}`
          if (campus.get().hoverItem !== key) {
            const s = seats[i]
            anchors.set('caption', { x: s.p.x, y: s.p.y + 0.26, z: s.p.z })
            campus.set({ hoverItem: key })
          }
          cursor(true)
        }}
        onPointerOut={() => clearCaption('m:')}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation()
          if (e.delta > 6 || e.instanceId == null) return
          go(`${BASE}/team?m=${seatedMembers[e.instanceId].slug}`)
        }}
      />
    </>
  )
}
