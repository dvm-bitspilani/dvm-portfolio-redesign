import * as THREE from 'three'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { TEAM_ORIGIN, VERTICAL_COLOR, VERTICAL_ORDER, teamStars } from '../layout'
import { store, usePortal } from '../store'
import { RO, stencilTest } from './stencil'

const COLS = 16
const ROWS = 12
const CELL = 128

/**
 * TEAM: 192 members as a constellation hanging above the corridor.
 * Five arms = five verticals; depth = joining batch (newest nearest).
 */
export function TeamSky() {
  const wanted = usePortal((s) => s.wanted.team)
  const group = useRef<THREE.Group>(null)

  const parts = useMemo(() => {
    const n = teamStars.length
    const geo = new THREE.PlaneGeometry(1, 1)
    const canvas = document.createElement('canvas')
    canvas.width = COLS * CELL
    canvas.height = ROWS * CELL
    const atlas = new THREE.CanvasTexture(canvas)
    atlas.colorSpace = THREE.SRGBColorSpace
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uAtlas: { value: atlas },
        uFilter: { value: -1 },
        uHover: { value: -1 },
        uTime: { value: 0 },
      },
      vertexShader: /* glsl */ `
        attribute vec2 aCell; attribute vec3 aCol; attribute float aIdx; attribute float aV; attribute float aLoaded;
        uniform float uFilter; uniform float uHover; uniform float uTime;
        varying vec2 vUv; varying vec2 vCell; varying vec3 vCol; varying float vDim; varying float vLoaded; varying float vHot; varying float vD;
        void main(){
          vUv = uv; vCell = aCell; vCol = aCol; vLoaded = aLoaded;
          float hot = abs(aIdx - uHover) < 0.5 ? 1.0 : 0.0;
          vHot = hot;
          vDim = (uFilter < -0.5 || abs(aV - uFilter) < 0.5) ? 1.0 : 0.16;
          float s = 1.0 + hot * 0.7 + (vDim > 0.5 && uFilter > -0.5 ? 0.15 : 0.0);
          vec4 mv = modelViewMatrix * instanceMatrix * vec4(position * s, 1.0);
          vD = -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uAtlas;
        varying vec2 vUv; varying vec2 vCell; varying vec3 vCol; varying float vDim; varying float vLoaded; varying float vHot; varying float vD;
        void main(){
          vec2 c = vUv - 0.5;
          float r = length(c);
          if (r > 0.5) discard;
          vec2 auv = (vCell + vUv) / vec2(${COLS.toFixed(1)}, ${ROWS.toFixed(1)});
          auv.y = 1.0 - ((vCell.y + 1.0 - vUv.y) / ${ROWS.toFixed(1)});
          vec3 photo = texture2D(uAtlas, auv).rgb;
          float lum = dot(photo, vec3(0.299, 0.587, 0.114));
          photo = mix(vec3(lum) * vCol * 1.2, photo, 0.55 + vHot * 0.45);
          vec3 glow = vCol * (0.6 + 1.4 * exp(-r * 9.0));
          vec3 col = mix(glow, photo, vLoaded);
          float rim = smoothstep(0.41, 0.45, r);
          col = mix(col, vCol * (1.6 + vHot * 1.6), rim);
          float fog = smoothstep(80.0, 18.0, vD);
          gl_FragColor = vec4(col * vDim * fog, 1.0);
        }`,
      toneMapped: false,
    })
    const mesh = new THREE.InstancedMesh(geo, mat, n)
    const cell = new Float32Array(n * 2)
    const col = new Float32Array(n * 3)
    const idx = new Float32Array(n)
    const vv = new Float32Array(n)
    const loaded = new Float32Array(n)
    const m = new THREE.Matrix4()
    const c = new THREE.Color()
    teamStars.forEach((s, i) => {
      m.compose(s.pos, new THREE.Quaternion(), new THREE.Vector3(0.5, 0.5, 0.5))
      mesh.setMatrixAt(i, m)
      cell[i * 2] = i % COLS
      cell[i * 2 + 1] = Math.floor(i / COLS)
      c.set(VERTICAL_COLOR[s.m.vertical])
      col.set([c.r, c.g, c.b], i * 3)
      idx[i] = i
      vv[i] = VERTICAL_ORDER.indexOf(s.m.vertical)
    })
    geo.setAttribute('aCell', new THREE.InstancedBufferAttribute(cell, 2))
    geo.setAttribute('aCol', new THREE.InstancedBufferAttribute(col, 3))
    geo.setAttribute('aIdx', new THREE.InstancedBufferAttribute(idx, 1))
    geo.setAttribute('aV', new THREE.InstancedBufferAttribute(vv, 1))
    const loadedAttr = new THREE.InstancedBufferAttribute(loaded, 1)
    geo.setAttribute('aLoaded', loadedAttr)
    mesh.computeBoundingSphere()

    // constellation lines: each arm threads its members from newest to oldest
    const seg: number[] = []
    const segCol: number[] = []
    for (const v of VERTICAL_ORDER) {
      const arm = teamStars.filter((s) => s.m.vertical === v).sort((a, b) => b.pos.z - a.pos.z)
      c.set(VERTICAL_COLOR[v])
      for (let i = 1; i < arm.length; i++) {
        const a = arm[i - 1].pos
        const b = arm[i].pos
        if (a.distanceTo(b) > 9) continue
        seg.push(a.x, a.y, a.z, b.x, b.y, b.z)
        segCol.push(c.r, c.g, c.b, c.r, c.g, c.b)
      }
    }
    const lineGeo = new THREE.BufferGeometry()
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3))
    lineGeo.setAttribute('color', new THREE.Float32BufferAttribute(segCol, 3))
    const lineMat = stencilTest(
      new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
      0,
    )
    // far stars
    const sc = 1600
    const sp = new Float32Array(sc * 3)
    for (let i = 0; i < sc; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(40 + Math.random() * 50)
      sp.set([v.x, v.y, v.z - 20], i * 3)
    }
    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3))
    const starMat = stencilTest(
      new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, color: new THREE.Color('#bfe9e4'), transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }),
      0,
    )
    return { geo, mat, mesh, atlas, canvas, loadedAttr, lineGeo, lineMat, starGeo, starMat }
  }, [])

  // progressively paint member photos into the atlas
  useEffect(() => {
    if (!wanted) return
    let cancelled = false
    const ctx = parts.canvas.getContext('2d')!
    let pending = 0
    let dirty = false
    const flush = () => {
      if (!dirty) return
      parts.atlas.needsUpdate = true
      parts.loadedAttr.needsUpdate = true
      dirty = false
    }
    const timer = window.setInterval(flush, 250)
    teamStars.forEach((s, i) => {
      const img = new Image()
      img.decoding = 'async'
      pending++
      img.onload = () => {
        if (cancelled) return
        const x = (i % COLS) * CELL
        const y = Math.floor(i / COLS) * CELL
        const k = Math.max(CELL / img.width, CELL / img.height)
        const w = img.width * k
        const h = img.height * k
        ctx.save()
        ctx.beginPath()
        ctx.rect(x, y, CELL, CELL)
        ctx.clip()
        ctx.drawImage(img, x + (CELL - w) / 2, y + (CELL - h) * 0.3, w, h)
        ctx.restore()
        ;(parts.loadedAttr.array as Float32Array)[i] = 1
        dirty = true
        if (--pending === 0) flush()
      }
      img.onerror = () => {
        pending--
      }
      img.src = s.m.photo
    })
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [wanted, parts])

  useEffect(
    () => () => {
      const p = parts
      p.geo.dispose()
      p.mat.dispose()
      p.mesh.dispose()
      p.atlas.dispose()
      p.lineGeo.dispose()
      p.lineMat.dispose()
      p.starGeo.dispose()
      p.starMat.dispose()
    },
    [parts],
  )

  useFrame(({ camera }) => {
    const s = store.get()
    if (group.current) group.current.visible = camera.position.y > 8 && s.space === 'outside'
    const f = s.teamFilter
    parts.mat.uniforms.uFilter.value = f ? VERTICAL_ORDER.indexOf(f) : -1
    const h = s.teamHover ?? s.teamPinned
    parts.mat.uniforms.uHover.value = h ?? -1
  })

  const active = () => {
    const s = store.get()
    return s.region === 'team' && !s.flying
  }
  const move = (e: ThreeEvent<PointerEvent>) => {
    if (!active() || e.instanceId === undefined) return
    e.stopPropagation()
    if (store.get().teamHover !== e.instanceId) store.set({ teamHover: e.instanceId })
    document.body.style.cursor = 'pointer'
  }
  const out = () => {
    if (store.get().teamHover !== null) store.set({ teamHover: null })
    document.body.style.cursor = ''
  }
  const click = (e: ThreeEvent<MouseEvent>) => {
    if (!active() || e.instanceId === undefined) return
    e.stopPropagation()
    store.set({ teamPinned: store.get().teamPinned === e.instanceId ? null : e.instanceId })
  }

  return (
    <group ref={group} position={TEAM_ORIGIN} visible={false}>
      <primitive object={parts.mesh} onPointerMove={move} onPointerOut={out} onClick={click} />
      <lineSegments geometry={parts.lineGeo} material={parts.lineMat} renderOrder={RO.outside} />
      <points geometry={parts.starGeo} material={parts.starMat} renderOrder={RO.outside} />
    </group>
  )
}
