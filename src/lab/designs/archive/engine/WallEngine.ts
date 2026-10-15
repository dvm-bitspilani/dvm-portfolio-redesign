import * as THREE from 'three'
import { Atlas } from './atlas'
import { CENTRE, ITEMS, KIND_CODE, LAYOUTS, PERIOD, type Filter } from './layout'
import { bgFrag, fullscreenVert, MAX_PAGES, postFrag, tileFrag, tileVert } from './shaders'
import { createCentreTexture, createGlyphStrip, markPolygons, MARK } from './textures'

export const MARK_TARGET = -2
const N = ITEMS.length

export interface FrameInfo {
  x: number
  y: number
  zoom: number
  moving: boolean
  /** Screen rect (css px) of the hovered thing, or null. */
  hoverRect: { x: number; y: number; w: number; h: number } | null
  loaded: number
  total: number
}

export interface EngineEvents {
  hover(target: number | null): void
  select(target: number): void
  frame(info: FrameInfo): void
  interact(): void
}

export interface EngineOptions {
  reduced: boolean
  mobile: boolean
}

const ZMIN = 14
const ZMAX = 300
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t))
const wrapD = (d: number, p: number) => d - p * Math.round(d / p)

interface Flight {
  x0: number; y0: number; z0: number
  x1: number; y1: number; z1: number
  t0: number; dur: number; dip: number
}

export class WallEngine {
  readonly canvas: HTMLCanvasElement
  readonly defaultZoom: number
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private postScene = new THREE.Scene()
  private cam = new THREE.Camera()
  private rt: THREE.WebGLRenderTarget
  private atlas: Atlas
  private dataTex: THREE.DataTexture
  private data: Float32Array
  private geo: THREE.InstancedBufferGeometry
  private mats: THREE.ShaderMaterial[] = []
  private textures: THREE.Texture[] = []
  private shared: Record<string, THREE.IUniform>
  private wallMat: THREE.ShaderMaterial
  private liftMat: THREE.ShaderMaterial
  private focusMat: THREE.ShaderMaterial
  private bgMat: THREE.ShaderMaterial
  private postMat: THREE.ShaderMaterial
  private liftMesh: THREE.Mesh
  private focusMesh: THREE.Mesh
  private container: HTMLElement
  private ev: EngineEvents
  private opts: EngineOptions

  // camera
  x = 0
  y = 0
  z: number
  private vx = 0
  private vy = 0
  private zt: number
  private zAnchor: { sx: number; sy: number; wx: number; wy: number } | null = null
  private flight: Flight | null = null
  private prev = { x: 0, y: 0, z: 1 }
  private motion = { vx: 0, vy: 0, vz: 0, k: 0 }
  private W = 1
  private H = 1
  private dpr = 1

  // items
  private cur = new Float32Array(N * 4)
  private from = new Float32Array(N * 4)
  private to = new Float32Array(N * 4)
  private t0 = new Float32Array(N)
  private dur = new Float32Array(N)
  private dimCur = new Float32Array(N)
  private dimFrom = new Float32Array(N)
  private dimTo = new Float32Array(N)
  private scaleCur = new Float32Array(N).fill(1)
  private scaleFrom = new Float32Array(N).fill(1)
  private scaleTo = new Float32Array(N).fill(1)
  private hoverAmt = new Float32Array(N)
  private reveal = new Float32Array(N)
  private revealAt = new Float32Array(N)
  private readyAt = new Float64Array(N)
  private animating = false
  filter: Filter = 'all'

  // interaction
  hovered: number | null = null
  private hoverExternal: number | null = null
  focused: number | null = null
  private focusAmt = 0
  private markHover = 0
  private pointer = { x: -1, y: -1, inside: false }
  private drag: { id: number; sx: number; sy: number; lx: number; ly: number; t: number; moved: boolean; samples: { x: number; y: number; t: number }[] } | null = null
  private pinch: { d: number; z: number } | null = null
  private touches = new Map<number, { x: number; y: number }>()
  private keys = new Set<string>()
  private lastWheelX = 0
  private hi: { tex: THREE.Texture | null; item: number; ready: number } = { tex: null, item: -1, ready: 0 }

  private raf = 0
  private last = performance.now()
  private start = performance.now()
  private needsRender = true
  private disposed = false
  private loadedCount = 0
  private releasedCanvases = false
  private releaseAt = 0
  private lastPrioritise = 0
  private ro: ResizeObserver

  constructor(container: HTMLElement, events: EngineEvents, opts: EngineOptions) {
    this.container = container
    this.ev = events
    this.opts = opts
    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' })
    if (!this.renderer.capabilities.isWebGL2) throw new Error('WebGL2 required')
    this.canvas = this.renderer.domElement
    this.canvas.className = 'ar-canvas'
    this.canvas.setAttribute('aria-hidden', 'true')
    container.appendChild(this.canvas)
    this.renderer.setClearColor(0x16171a, 1)

    const w0 = container.clientWidth || window.innerWidth
    const h0 = container.clientHeight || window.innerHeight
    // Frame the 10 x 8 centre block with a ring of tiles around it.
    this.defaultZoom = clamp(Math.min(w0 / (w0 < 760 ? 11 : 17), h0 / 10.5), 30, 96)
    this.z = this.zt = this.defaultZoom

    this.rt = new THREE.WebGLRenderTarget(4, 4, { depthBuffer: false, stencilBuffer: false })
    this.rt.texture.generateMipmaps = false
    this.rt.texture.minFilter = THREE.LinearFilter

    // ---- data texture (N x 4 RGBA32F)
    this.data = new Float32Array(N * 4 * 4)
    this.dataTex = new THREE.DataTexture(this.data, N, 4, THREE.RGBAFormat, THREE.FloatType)
    this.dataTex.minFilter = this.dataTex.magFilter = THREE.NearestFilter
    this.dataTex.needsUpdate = true

    // ---- atlas
    this.atlas = new Atlas(ITEMS, this.renderer.capabilities.getMaxAnisotropy(), () => {
      this.loadedCount++
      this.needsRender = true
    }, opts.mobile)
    if (this.atlas.pages.length > MAX_PAGES) console.warn('[archive] atlas pages exceed shader samplers')

    // ---- layout start state
    const L = LAYOUTS.all
    this.cur.set(L.rects)
    this.to.set(L.rects)
    this.from.set(L.rects)
    for (let i = 0; i < N; i++) {
      const cx = L.rects[i * 4] + L.rects[i * 4 + 2] / 2
      const cy = L.rects[i * 4 + 1] + L.rects[i * 4 + 3] / 2
      this.revealAt[i] = opts.reduced ? -1 : 0.25 + Math.hypot(cx / 1.4, cy) * 0.045 + Math.random() * 0.12
    }

    // ---- textures for the background
    const poly = markPolygons()
    const glyphs = createGlyphStrip()
    const centre = createCentreTexture()
    this.textures.push(glyphs.tex, centre)
    // Fonts may arrive after first paint: redraw the type textures once they do.
    void this.atlas.fontsReady.then(() => {
      if (this.disposed) return
      const c2 = createCentreTexture()
      const g2 = createGlyphStrip()
      this.bgMat.uniforms.uCentre.value = c2
      this.bgMat.uniforms.uGlyphs.value = g2.tex
      centre.dispose()
      glyphs.tex.dispose()
      this.textures.push(c2, g2.tex)
      this.needsRender = true
    })

    this.shared = {
      uCam: { value: new THREE.Vector2() },
      uZoom: { value: this.z },
      uView: { value: new THREE.Vector2(1, 1) },
      uPeriod: { value: new THREE.Vector2(PERIOD.w, PERIOD.h) },
      uTime: { value: 0 },
    }

    const tri = new THREE.BufferGeometry()
    tri.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3))

    this.bgMat = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: fullscreenVert,
      fragmentShader: bgFrag,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        ...this.shared,
        uDpr: { value: 1 },
        uPoly: { value: poly.points },
        uPolyN: { value: new THREE.Vector2(poly.counts[0], poly.counts[1]) },
        uCentre: { value: centre },
        uGlyphs: { value: glyphs.tex },
        uGlyphAspect: { value: glyphs.aspect },
        uCentreRect: { value: new THREE.Vector4(CENTRE.x, CENTRE.y, CENTRE.w, CENTRE.h) },
        uMarkHover: { value: 0 },
        uMarkDim: { value: 0 },
        uMotion: { value: opts.reduced ? 0 : 1 },
      },
    })
    const bg = new THREE.Mesh(tri, this.bgMat)
    bg.frustumCulled = false
    bg.renderOrder = 0
    this.scene.add(bg)

    // ---- tiles
    this.geo = new THREE.InstancedBufferGeometry()
    const plane = new THREE.PlaneGeometry(1, 1)
    this.geo.index = plane.index
    this.geo.setAttribute('position', plane.getAttribute('position'))
    this.geo.instanceCount = N
    const pageUniforms: Record<string, THREE.IUniform> = {}
    const pages = this.atlas.textures
    for (let i = 0; i < MAX_PAGES; i++) pageUniforms[`uP${i}`] = { value: pages[Math.min(i, pages.length - 1)] }
    const mk = (mode: number, pad: number) =>
      new THREE.ShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: tileVert,
        fragmentShader: tileFrag,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          ...this.shared,
          ...pageUniforms,
          uData: { value: this.dataTex },
          uN: { value: N },
          uCopies: { value: 1 },
          uOnly: { value: -1 },
          uAnchor: { value: new THREE.Vector2() },
          uPadPx: { value: pad },
          uGap: { value: 0.07 },
          uMode: { value: mode },
          uHi: { value: null },
          uHiReady: { value: 0 },
          uHiCrop: { value: new THREE.Vector4(0, 0, 1, 1) },
        },
      })
    this.wallMat = mk(0, 0)
    this.liftMat = mk(1, 26)
    this.focusMat = mk(2, 40)
    this.mats.push(this.wallMat, this.liftMat, this.focusMat, this.bgMat)
    const wall = new THREE.Mesh(this.geo, this.wallMat)
    wall.frustumCulled = false
    wall.renderOrder = 1
    this.scene.add(wall)
    const single = new THREE.InstancedBufferGeometry()
    single.index = plane.index
    single.setAttribute('position', plane.getAttribute('position'))
    single.instanceCount = 1
    this.liftMesh = new THREE.Mesh(single, this.liftMat)
    this.liftMesh.frustumCulled = false
    this.liftMesh.renderOrder = 2
    this.focusMesh = new THREE.Mesh(single, this.focusMat)
    this.focusMesh.frustumCulled = false
    this.focusMesh.renderOrder = 3
    this.scene.add(this.liftMesh, this.focusMesh)

    // ---- post
    this.postMat = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: fullscreenVert,
      fragmentShader: postFrag,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tScene: { value: this.rt.texture },
        uVel: { value: new THREE.Vector2() },
        uK: { value: 0 },
        uZoomVel: { value: 0 },
        uAspect: { value: 1 },
      },
    })
    this.mats.push(this.postMat)
    const post = new THREE.Mesh(tri, this.postMat)
    post.frustumCulled = false
    this.postScene.add(post)

    // ---- intro: start close on the mark, pull back to reveal the wall.
    if (!opts.reduced) {
      this.z = this.zt = this.defaultZoom * 3.4
      this.y = MARK.cy
      this.flyTo(0, 0, this.defaultZoom, 2600, 0, 450)
    }

    this.resize()
    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(container)
    this.bind()
    this.atlas.prioritise((i) => this.distTo(i))
    document.addEventListener('visibilitychange', this.onVis)
    this.raf = requestAnimationFrame(this.tick)
  }

  // ------------------------------------------------------------ public api

  setFilter(f: Filter, animate = true) {
    if (f === this.filter) return
    this.filter = f
    const L = LAYOUTS[f]
    const now = this.time()
    const instant = !animate || this.opts.reduced
    for (let i = 0; i < N; i++) {
      for (let k = 0; k < 4; k++) this.from[i * 4 + k] = this.cur[i * 4 + k]
      // Travel the short way round the torus.
      const fx = this.cur[i * 4], fy = this.cur[i * 4 + 1]
      const tx = fx + wrapD(L.rects[i * 4] - fx, PERIOD.w)
      const ty = fy + wrapD(L.rects[i * 4 + 1] - fy, PERIOD.h)
      this.to[i * 4] = tx
      this.to[i * 4 + 1] = ty
      this.to[i * 4 + 2] = L.rects[i * 4 + 2]
      this.to[i * 4 + 3] = L.rects[i * 4 + 3]
      this.dimFrom[i] = this.dimCur[i]
      this.scaleFrom[i] = this.scaleCur[i]
      const m = L.match[i]
      this.dimTo[i] = m ? 0 : 1
      this.scaleTo[i] = m ? 1 : f === 'contact' ? 0.9 : 0.58
      const cx = L.rects[i * 4] + L.rects[i * 4 + 2] / 2, cy = L.rects[i * 4 + 1] + L.rects[i * 4 + 3] / 2
      const dist = Math.hypot(cx / 1.4, cy)
      this.t0[i] = instant ? now - 10 : now + (m ? dist * 0.022 : 0.05 + Math.random() * 0.25)
      this.dur[i] = instant ? 0.001 : m ? 1.05 : 0.8
    }
    this.animating = true
    this.needsRender = true
    this.reprioritiseSoon()
  }

  /** Frame a tile (or the mark) beside a panel. `inset` = css px covered by UI on the right / bottom. */
  focus(target: number | null, inset: { right: number; bottom: number; top?: number } = { right: 0, bottom: 0 }) {
    this.focused = target
    this.needsRender = true
    if (target === null) {
      this.setHiRes(-1)
      return
    }
    const top = inset.top ?? 0
    const availW = this.W - inset.right, availH = this.H - inset.bottom - top
    let cx: number, cy: number, w: number, h: number
    if (target === MARK_TARGET) {
      w = 5.6
      h = 5.6
      cx = this.nearX(MARK.cx)
      cy = this.nearY(MARK.cy + 0.6)
    } else {
      const r = this.to.subarray(target * 4, target * 4 + 4)
      w = r[2]
      h = r[3]
      cx = this.nearX(r[0] + w / 2)
      cy = this.nearY(r[1] + h / 2)
      this.setHiRes(target)
    }
    const margin = this.opts.mobile ? 0.86 : 0.74
    const z = clamp(Math.min((availW * margin) / w, (availH * margin) / h), ZMIN, w * h <= 1 ? 300 : this.opts.mobile ? 340 : 420)
    // Centre in the visible area: shift camera so the tile sits in the middle of availW/availH.
    const x = cx + inset.right / 2 / z
    const y = cy + (inset.bottom - top) / 2 / z
    this.flyTo(x, y, z, this.opts.reduced ? 1 : 1100)
  }

  flyTo(x: number, y: number, z: number, dur = 1000, dipOverride?: number, delay = 0) {
    const dist = Math.hypot((x - this.x) * this.z, (y - this.y) * this.z)
    const dip = dipOverride ?? clamp(dist / Math.max(this.W, 1) - 0.6, 0, 1.4)
    this.flight = { x0: this.x, y0: this.y, z0: this.z, x1: x, y1: y, z1: clamp(z, ZMIN, 420), t0: this.time() + delay / 1000, dur: Math.max(0.001, dur / 1000), dip }
    this.vx = this.vy = 0
    this.zAnchor = null
    this.needsRender = true
  }

  home(zoomFactor = 1) {
    this.flyTo(0, 0, this.defaultZoom * zoomFactor, this.opts.reduced ? 1 : 1300)
  }

  /** Fly to the nearest copy of a world point (minimap). */
  flyToWorld(wx: number, wy: number, dur = 800) {
    this.flyTo(this.nearX(wx), this.nearY(wy), this.z, this.opts.reduced ? 1 : dur, 0)
  }

  zoomBy(f: number) {
    this.flight = null
    this.zAnchor = { sx: this.W / 2, sy: this.H / 2, wx: this.x, wy: this.y }
    this.zt = clamp(this.zt * f, ZMIN, ZMAX)
    this.needsRender = true
  }

  /** Keyboard focus on a DOM index link highlights the tile and brings it into view. */
  setExternalHover(i: number | null, bringIntoView = true) {
    this.hoverExternal = i
    this.ev.hover(i ?? this.hovered)
    if (i !== null && bringIntoView) {
      const r = this.to.subarray(i * 4, i * 4 + 4)
      const cx = this.nearX(r[0] + r[2] / 2), cy = this.nearY(r[1] + r[3] / 2)
      const sx = (cx - this.x) * this.z, sy = (cy - this.y) * this.z
      if (Math.abs(sx) > this.W * 0.35 || Math.abs(sy) > this.H * 0.35) this.flyTo(cx, cy, Math.max(this.z, this.defaultZoom), 700)
    }
    this.needsRender = true
  }

  /** Current layout rects (for the minimap). */
  get rects() {
    return this.cur
  }
  get dims() {
    return this.dimCur
  }
  get viewport() {
    return { w: this.W, h: this.H }
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    this.ro.disconnect()
    this.unbind()
    document.removeEventListener('visibilitychange', this.onVis)
    this.atlas.dispose()
    this.hi.tex?.dispose()
    for (const t of this.textures) t.dispose()
    this.dataTex.dispose()
    this.rt.dispose()
    this.geo.dispose()
    this.liftMesh.geometry.dispose()
    this.scene.traverse((o) => {
      if ((o as THREE.Mesh).geometry) (o as THREE.Mesh).geometry.dispose()
    })
    this.postScene.traverse((o) => {
      if ((o as THREE.Mesh).geometry) (o as THREE.Mesh).geometry.dispose()
    })
    for (const m of this.mats) m.dispose()
    this.renderer.dispose()
    this.renderer.forceContextLoss()
    this.canvas.remove()
  }

  // ------------------------------------------------------------ helpers

  private time() {
    return (performance.now() - this.start) / 1000
  }
  private nearX(x: number) {
    return this.x + wrapD(x - this.x, PERIOD.w)
  }
  private nearY(y: number) {
    return this.y + wrapD(y - this.y, PERIOD.h)
  }
  private distTo(i: number) {
    const r = this.to
    const dx = wrapD(r[i * 4] + r[i * 4 + 2] / 2 - this.x, PERIOD.w)
    const dy = wrapD(r[i * 4 + 1] + r[i * 4 + 3] / 2 - this.y, PERIOD.h)
    // Things matching the filter first.
    return Math.hypot(dx, dy) + (LAYOUTS[this.filter].match[i] ? 0 : 40)
  }
  private reprioritiseSoon() {
    this.lastPrioritise = 0
  }

  private setHiRes(i: number) {
    if (this.hi.item === i) return
    this.hi.tex?.dispose()
    this.hi = { tex: null, item: i, ready: 0 }
    this.focusMat.uniforms.uHi.value = null
    const src = i >= 0 ? ITEMS[i].img : undefined
    if (!src || ITEMS[i].kind === 'mockup') return
    const img = new Image()
    img.decoding = 'async'
    img.src = src
    img
      .decode()
      .then(() => {
        if (this.disposed || this.hi.item !== i) return
        const t = new THREE.Texture(img)
        t.colorSpace = THREE.NoColorSpace
        t.minFilter = THREE.LinearMipmapLinearFilter
        t.anisotropy = 4
        t.needsUpdate = true
        this.hi.tex = t
        // cover crop to the tile aspect
        const it = ITEMS[i]
        const ta = it.w / it.h, ia = img.naturalWidth / img.naturalHeight
        const crop = new THREE.Vector4(0, 0, 1, 1)
        if (ia > ta) {
          const s = ta / ia
          crop.set((1 - s) / 2, 0, (1 + s) / 2, 1)
        } else {
          const s = ia / ta
          const y0 = (1 - s) * it.cropY
          crop.set(0, y0, 1, y0 + s)
        }
        // Texture rows are flipped (flipY default true) -> v measured from the bottom.
        crop.set(crop.x, 1 - crop.y, crop.z, 1 - crop.w)
        this.focusMat.uniforms.uHi.value = t
        this.focusMat.uniforms.uHiCrop.value = crop
        this.needsRender = true
      })
      .catch(() => undefined)
  }

  private screenToWorld(sx: number, sy: number) {
    return { x: this.x + (sx - this.W / 2) / this.z, y: this.y + (sy - this.H / 2) / this.z }
  }

  /** Item under a screen point, MARK_TARGET for the centre block, or null. */
  hitTest(sx: number, sy: number): number | null {
    const w = this.screenToWorld(sx, sy)
    let hit: number | null = null
    for (let i = 0; i < N; i++) {
      const s = this.scaleCur[i] * (1 + 0.07 * this.hoverAmt[i])
      const hw = (this.cur[i * 4 + 2] * s) / 2, hh = (this.cur[i * 4 + 3] * s) / 2
      const dx = wrapD(w.x - (this.cur[i * 4] + this.cur[i * 4 + 2] / 2), PERIOD.w)
      const dy = wrapD(w.y - (this.cur[i * 4 + 1] + this.cur[i * 4 + 3] / 2), PERIOD.h)
      if (Math.abs(dx) <= hw && Math.abs(dy) <= hh) {
        if (hit === null || this.hoverAmt[i] > this.hoverAmt[hit]) hit = i
      }
    }
    if (hit !== null) return hit
    const lx = wrapD(w.x, PERIOD.w), ly = wrapD(w.y, PERIOD.h)
    if (lx >= CENTRE.x && lx < CENTRE.x + CENTRE.w && ly >= CENTRE.y && ly < CENTRE.y + CENTRE.h) return MARK_TARGET
    return null
  }

  private rectOnScreen(i: number) {
    let cx: number, cy: number, w: number, h: number
    if (i === MARK_TARGET) {
      const a = this.pointer.inside ? this.pointerWorld() : { x: this.x, y: this.y }
      w = CENTRE.w - 0.6
      h = CENTRE.h - 0.6
      cx = a.x + wrapD(CENTRE.x + CENTRE.w / 2 - a.x, PERIOD.w)
      cy = a.y + wrapD(CENTRE.y + CENTRE.h / 2 - a.y, PERIOD.h)
    } else {
      const s = this.scaleCur[i] * (1 + 0.07 * this.hoverAmt[i])
      const a = this.pointer.inside ? this.pointerWorld() : { x: this.x, y: this.y }
      w = (this.cur[i * 4 + 2] - 0.07) * s
      h = (this.cur[i * 4 + 3] - 0.07) * s
      cx = a.x + wrapD(this.cur[i * 4] + this.cur[i * 4 + 2] / 2 - a.x, PERIOD.w)
      cy = a.y + wrapD(this.cur[i * 4 + 1] + this.cur[i * 4 + 3] / 2 - a.y, PERIOD.h)
    }
    return {
      x: (cx - w / 2 - this.x) * this.z + this.W / 2,
      y: (cy - h / 2 - this.y) * this.z + this.H / 2,
      w: w * this.z,
      h: h * this.z,
    }
  }

  private pointerWorld() {
    return this.screenToWorld(this.pointer.x, this.pointer.y)
  }

  // ------------------------------------------------------------ input

  private bind() {
    const c = this.canvas
    c.addEventListener('pointerdown', this.onDown)
    c.addEventListener('pointermove', this.onMove)
    c.addEventListener('pointerup', this.onUp)
    c.addEventListener('pointercancel', this.onUp)
    c.addEventListener('pointerleave', this.onLeave)
    c.addEventListener('wheel', this.onWheel, { passive: false })
    window.addEventListener('keydown', this.onKey)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('blur', this.onBlur)
  }
  private unbind() {
    const c = this.canvas
    c.removeEventListener('pointerdown', this.onDown)
    c.removeEventListener('pointermove', this.onMove)
    c.removeEventListener('pointerup', this.onUp)
    c.removeEventListener('pointercancel', this.onUp)
    c.removeEventListener('pointerleave', this.onLeave)
    c.removeEventListener('wheel', this.onWheel)
    window.removeEventListener('keydown', this.onKey)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('blur', this.onBlur)
  }

  private local(e: { clientX: number; clientY: number }) {
    const r = this.canvas.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  private onDown = (e: PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    const p = this.local(e)
    this.touches.set(e.pointerId, p)
    this.canvas.setPointerCapture(e.pointerId)
    this.flight = null
    this.zAnchor = null
    this.zt = this.z
    if (this.touches.size === 2) {
      const [a, b] = [...this.touches.values()]
      this.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: this.z }
      this.drag = null
      return
    }
    this.vx = this.vy = 0
    this.setHover(null)
    this.drag = { id: e.pointerId, sx: p.x, sy: p.y, lx: p.x, ly: p.y, t: performance.now(), moved: false, samples: [{ x: p.x, y: p.y, t: performance.now() }] }
    this.ev.interact()
  }

  private onMove = (e: PointerEvent) => {
    const p = this.local(e)
    this.pointer.x = p.x
    this.pointer.y = p.y
    this.pointer.inside = true
    if (this.touches.has(e.pointerId)) this.touches.set(e.pointerId, p)
    if (this.pinch && this.touches.size >= 2) {
      const [a, b] = [...this.touches.values()]
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2
      const before = this.screenToWorld(mx, my)
      this.z = this.zt = clamp((this.pinch.z * d) / Math.max(1, this.pinch.d), ZMIN, ZMAX)
      this.x = before.x - (mx - this.W / 2) / this.z
      this.y = before.y - (my - this.H / 2) / this.z
      this.needsRender = true
      return
    }
    const dr = this.drag
    if (dr && dr.id === e.pointerId) {
      const dx = p.x - dr.lx, dy = p.y - dr.ly
      if (!dr.moved && Math.hypot(p.x - dr.sx, p.y - dr.sy) > 5) {
        dr.moved = true
        this.canvas.classList.add('is-dragging')
      }
      if (dr.moved) {
        this.x -= dx / this.z
        this.y -= dy / this.z
        this.needsRender = true
      }
      dr.lx = p.x
      dr.ly = p.y
      const now = performance.now()
      dr.samples.push({ x: p.x, y: p.y, t: now })
      while (dr.samples.length > 2 && now - dr.samples[0].t > 90) dr.samples.shift()
      return
    }
    if (e.pointerType === 'mouse') this.updateHover()
  }

  private onUp = (e: PointerEvent) => {
    this.touches.delete(e.pointerId)
    if (this.canvas.hasPointerCapture(e.pointerId)) this.canvas.releasePointerCapture(e.pointerId)
    if (this.pinch) {
      if (this.touches.size < 2) this.pinch = null
      return
    }
    const dr = this.drag
    if (!dr || dr.id !== e.pointerId) return
    this.drag = null
    this.canvas.classList.remove('is-dragging')
    if (dr.moved) {
      const s = dr.samples
      const a = s[0], b = s[s.length - 1]
      const dt = Math.max(16, b.t - a.t)
      if (performance.now() - b.t < 80 && !this.opts.reduced) {
        // px/ms -> cells/s
        this.vx = (-(b.x - a.x) / dt) * 1000 / this.z
        this.vy = (-(b.y - a.y) / dt) * 1000 / this.z
      }
      this.reprioritiseSoon()
    } else {
      const p = this.local(e)
      const hit = this.hitTest(p.x, p.y)
      if (hit !== null) this.ev.select(hit)
    }
  }

  private onLeave = () => {
    this.pointer.inside = false
    if (!this.drag) this.setHover(null)
  }

  private onWheel = (e: WheelEvent) => {
    e.preventDefault()
    this.flight = null
    this.ev.interact()
    const p = this.local(e)
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? this.H : 1
    const dx = e.deltaX * unit, dy = e.deltaY * unit
    const now = performance.now()
    if (Math.abs(dx) > 0.5) this.lastWheelX = now
    const trackpadPan = !e.ctrlKey && (now - this.lastWheelX < 400 || e.shiftKey)
    if (trackpadPan) {
      this.x += (e.shiftKey && !dx ? dy : dx) / this.z
      if (!e.shiftKey) this.y += dy / this.z
      this.zAnchor = null
      this.needsRender = true
      return
    }
    const k = e.ctrlKey ? 0.012 : 0.0022
    const f = Math.exp(-clamp(dy, -120, 120) * k)
    const base = this.zAnchor ? this.zt : this.z
    this.zt = clamp(base * f, ZMIN, ZMAX)
    const w = this.screenToWorld(p.x, p.y)
    this.zAnchor = { sx: p.x, sy: p.y, wx: w.x, wy: w.y }
    this.needsRender = true
  }

  private onKey = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null
    if (t && t.closest('input, textarea, select, [contenteditable], .ar-panel, .ar-index')) return
    if (e.metaKey || e.ctrlKey || e.altKey) return
    const k = e.key
    if (k.startsWith('Arrow')) {
      e.preventDefault()
      this.keys.add(k)
      this.flight = null
      this.ev.interact()
    } else if (k === '+' || k === '=') {
      this.zoomBy(1.35)
    } else if (k === '-' || k === '_') {
      this.zoomBy(1 / 1.35)
    } else if (k === '0') {
      this.home()
    }
  }
  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key)
  }
  private onBlur = () => {
    this.keys.clear()
  }
  private onVis = () => {
    if (document.hidden) cancelAnimationFrame(this.raf)
    else {
      this.last = performance.now()
      this.needsRender = true
      this.raf = requestAnimationFrame(this.tick)
    }
  }

  private updateHover() {
    if (!this.pointer.inside || this.drag || this.flight) return
    const hit = this.hitTest(this.pointer.x, this.pointer.y)
    this.setHover(hit)
  }

  private setHover(h: number | null) {
    if (h === this.hovered) return
    this.hovered = h
    this.canvas.style.cursor = h !== null ? 'pointer' : ''
    // Keyboard focus on an index link wins over the mouse.
    if (this.hoverExternal === null) this.ev.hover(h)
    this.needsRender = true
  }

  private resize() {
    const w = this.container.clientWidth || 1, h = this.container.clientHeight || 1
    this.W = w
    this.H = h
    this.dpr = Math.min(window.devicePixelRatio || 1, this.opts.mobile ? 1.5 : 2)
    this.renderer.setPixelRatio(this.dpr)
    this.renderer.setSize(w, h, false)
    this.canvas.style.width = w + 'px'
    this.canvas.style.height = h + 'px'
    this.rt.setSize(Math.round(w * this.dpr), Math.round(h * this.dpr))
    ;(this.shared.uView.value as THREE.Vector2).set(w, h)
    this.bgMat.uniforms.uDpr.value = this.dpr
    this.postMat.uniforms.uAspect.value = w / h
    this.needsRender = true
  }

  // ------------------------------------------------------------ frame

  private tick = () => {
    this.raf = requestAnimationFrame(this.tick)
    const nowMs = performance.now()
    const dt = Math.min(0.05, (nowMs - this.last) / 1000)
    this.last = nowMs
    const t = this.time()

    // --- camera
    let moving = false
    const f = this.flight
    if (f) {
      const p = clamp((t - f.t0) / f.dur, 0, 1)
      if (t >= f.t0) {
        const e = this.opts.reduced ? 1 : easeInOut(p)
        this.x = f.x0 + (f.x1 - f.x0) * e
        this.y = f.y0 + (f.y1 - f.y0) * e
        const lz = Math.log(f.z0) + (Math.log(f.z1) - Math.log(f.z0)) * e - f.dip * Math.sin(Math.PI * e)
        this.z = this.zt = Math.exp(lz)
      }
      moving = true
      if (p >= 1) {
        this.flight = null
        this.reprioritiseSoon()
      }
    } else {
      // keyboard
      if (this.keys.size) {
        const acc = 2600 / this.z
        if (this.keys.has('ArrowLeft')) this.vx -= acc * dt
        if (this.keys.has('ArrowRight')) this.vx += acc * dt
        if (this.keys.has('ArrowUp')) this.vy -= acc * dt
        if (this.keys.has('ArrowDown')) this.vy += acc * dt
        const max = 1700 / this.z
        const sp = Math.hypot(this.vx, this.vy)
        if (sp > max) {
          this.vx *= max / sp
          this.vy *= max / sp
        }
      }
      if (!this.drag && (this.vx || this.vy)) {
        this.x += this.vx * dt
        this.y += this.vy * dt
        const fr = Math.exp(-dt * (this.keys.size ? 2 : 3.2))
        this.vx *= fr
        this.vy *= fr
        if (Math.hypot(this.vx, this.vy) * this.z < 4) {
          this.vx = this.vy = 0
          this.reprioritiseSoon()
        }
        moving = true
      }
      if (Math.abs(this.zt - this.z) > 0.01) {
        this.z += (this.zt - this.z) * (1 - Math.exp(-dt * 14))
        if (Math.abs(this.zt - this.z) < 0.02) this.z = this.zt
        if (this.zAnchor) {
          this.x = this.zAnchor.wx - (this.zAnchor.sx - this.W / 2) / this.z
          this.y = this.zAnchor.wy - (this.zAnchor.sy - this.H / 2) / this.z
        }
        moving = true
      } else this.zAnchor = null
    }
    // Keep coordinates bounded (the wall is periodic, so this is invisible).
    if (Math.abs(this.x) > PERIOD.w * 50 || Math.abs(this.y) > PERIOD.h * 50) {
      const ox = PERIOD.w * Math.round(this.x / PERIOD.w), oy = PERIOD.h * Math.round(this.y / PERIOD.h)
      this.x -= ox
      this.y -= oy
      this.prev.x -= ox
      this.prev.y -= oy
    }

    // --- lens motion: screen-space velocity of the camera, smoothed
    const sdt = Math.max(dt, 1 / 240)
    const pvx = ((this.x - this.prev.x) * this.z) / sdt / 60 // px per 60fps-frame
    const pvy = ((this.y - this.prev.y) * this.z) / sdt / 60
    const pvz = Math.log(this.z / this.prev.z) / sdt / 60
    this.prev.x = this.x
    this.prev.y = this.y
    this.prev.z = this.z
    const sm = 1 - Math.exp(-dt * 12)
    const M = this.motion
    M.vx += (pvx - M.vx) * sm
    M.vy += (pvy - M.vy) * sm
    M.vz += (pvz - M.vz) * sm
    const speed = Math.hypot(M.vx, M.vy) + Math.abs(M.vz) * 900
    const lensScale = this.opts.reduced ? 0 : this.opts.mobile ? 0.4 : 1
    const kTarget = (1 - Math.exp(-speed / 30)) * lensScale
    M.k += (kTarget - M.k) * (1 - Math.exp(-dt * 10))
    const lensActive = M.k > 0.002 || Math.abs(M.vz) > 0.0005
    if (lensActive) moving = true
    if (!lensActive) M.k = 0

    // --- item animation
    let anyAnim = false
    if (this.animating) {
      let pending = false
      for (let i = 0; i < N; i++) {
        const p = clamp((t - this.t0[i]) / this.dur[i], 0, 1)
        if (p < 1) pending = true
        const e = easeInOut(p)
        for (let k = 0; k < 4; k++) this.cur[i * 4 + k] = this.from[i * 4 + k] + (this.to[i * 4 + k] - this.from[i * 4 + k]) * e
        const e2 = easeOutExpo(p)
        this.dimCur[i] = this.dimFrom[i] + (this.dimTo[i] - this.dimFrom[i]) * e2
        this.scaleCur[i] = this.scaleFrom[i] + (this.scaleTo[i] - this.scaleFrom[i]) * e
        // dip in scale while travelling: tiles "lift off" the wall
        const travel = Math.abs(this.to[i * 4] - this.from[i * 4]) + Math.abs(this.to[i * 4 + 1] - this.from[i * 4 + 1])
        if (travel > 0.01) this.scaleCur[i] *= 1 - 0.18 * Math.sin(Math.PI * p)
      }
      if (!pending) {
        this.animating = false
        // Normalise positions back into the period.
        for (let i = 0; i < N; i++) {
          this.cur[i * 4] = LAYOUTS[this.filter].rects[i * 4]
          this.cur[i * 4 + 1] = LAYOUTS[this.filter].rects[i * 4 + 1]
          this.to[i * 4] = this.cur[i * 4]
          this.to[i * 4 + 1] = this.cur[i * 4 + 1]
        }
      }
      anyAnim = true
    }

    // hover easing
    const hoverTarget = this.hoverExternal ?? (typeof this.hovered === 'number' && this.hovered >= 0 ? this.hovered : -1)
    const hk = 1 - Math.exp(-dt * (this.opts.reduced ? 60 : 14))
    let liftItem = -1, liftAmt = 0
    for (let i = 0; i < N; i++) {
      const target = i === hoverTarget && this.focused === null ? 1 : 0
      const h = this.hoverAmt[i]
      if (h !== target) {
        const nh = Math.abs(target - h) < 0.002 ? target : h + (target - h) * hk
        this.hoverAmt[i] = nh
        anyAnim = true
      }
      if (this.hoverAmt[i] > liftAmt) {
        liftAmt = this.hoverAmt[i]
        liftItem = i
      }
    }
    const mh = this.hovered === MARK_TARGET && this.focused === null ? 1 : this.focused === MARK_TARGET ? 1 : 0
    if (Math.abs(this.markHover - mh) > 0.002) {
      this.markHover += (mh - this.markHover) * hk
      anyAnim = true
    } else this.markHover = mh
    const fTarget = this.focused !== null ? 1 : 0
    if (Math.abs(this.focusAmt - fTarget) > 0.002) {
      this.focusAmt += (fTarget - this.focusAmt) * (1 - Math.exp(-dt * 6))
      anyAnim = true
    } else this.focusAmt = fTarget
    if (this.hi.tex && this.hi.ready < 1) {
      this.hi.ready = Math.min(1, this.hi.ready + dt * 3)
      anyAnim = true
    }

    // reveal + load fades
    const now = performance.now()
    for (let i = 0; i < N; i++) {
      if (this.reveal[i] < 1) {
        const rv = this.revealAt[i] < 0 ? 1 : clamp((t - this.revealAt[i]) / 0.5, 0, 1)
        this.reveal[i] = rv
        anyAnim = true
      }
    }

    // --- streaming: re-sort the load queue now and then
    if (!this.atlas.done && (moving ? nowMs - this.lastPrioritise > 700 : this.lastPrioritise === 0)) {
      this.lastPrioritise = nowMs
      this.atlas.prioritise((i) => this.distTo(i))
    }
    if (this.atlas.upload(nowMs)) this.needsRender = true
    if (!this.releasedCanvases && this.atlas.done) {
      if (!this.releaseAt) this.releaseAt = nowMs + 600
      else if (nowMs > this.releaseAt && this.atlas.releaseCanvases()) this.releasedCanvases = true
    }

    // --- write per-item data
    const D = this.data
    const R1 = N * 4, R2 = N * 8, R3 = N * 12
    let loadAnim = false
    for (let i = 0; i < N; i++) {
      const o = i * 4
      D[o] = this.cur[o]
      D[o + 1] = this.cur[o + 1]
      D[o + 2] = this.cur[o + 2]
      D[o + 3] = this.cur[o + 3]
      const s = this.atlas.slots[i]
      D[R1 + o] = s.uv[0]
      D[R1 + o + 1] = s.uv[1]
      D[R1 + o + 2] = s.uv[2]
      D[R1 + o + 3] = s.uv[3]
      let la = 0
      // An image only fades in once its atlas page has been re-uploaded after it was drawn.
      if (this.atlas.loaded[i] && !this.readyAt[i] && this.atlas.pages[s.page].last >= this.atlas.loadedAt[i]) this.readyAt[i] = now
      if (this.readyAt[i]) {
        la = this.opts.reduced ? 1 : clamp((now - this.readyAt[i]) / 520, 0, 1)
        if (la < 1) loadAnim = true
        la = la * la * (3 - 2 * la)
      }
      D[R2 + o] = s.page
      D[R2 + o + 1] = la
      D[R2 + o + 2] = KIND_CODE[ITEMS[i].kind]
      D[R2 + o + 3] = this.dimCur[i]
      D[R3 + o] = this.scaleCur[i]
      D[R3 + o + 1] = this.hoverAmt[i]
      D[R3 + o + 2] = this.focused !== null && this.focused !== i ? this.focusAmt : 0
      D[R3 + o + 3] = this.reveal[i]
    }
    if (loadAnim) anyAnim = true
    this.dataTex.needsUpdate = true

    // Placeholder sweep is animated: keep rendering while anything is still loading.
    const placeholders = !this.atlas.done && !this.opts.reduced
    // Contours drift slowly when the origin is on screen.
    const ox = wrapD(-this.x, PERIOD.w) * this.z, oy = wrapD(-this.y, PERIOD.h) * this.z
    const originVisible = !this.opts.reduced && Math.abs(ox) < this.W / 2 + 6 * this.z && Math.abs(oy) < this.H / 2 + 5 * this.z

    if (!(this.needsRender || moving || anyAnim || placeholders || originVisible)) return
    this.needsRender = false

    // --- uniforms
    const U = this.shared
    ;(U.uCam.value as THREE.Vector2).set(this.x, this.y)
    U.uZoom.value = this.z
    U.uTime.value = t
    const halfW = this.W / 2 / this.z + 5.5, halfH = this.H / 2 / this.z + 5.5
    const copies = halfW > PERIOD.w / 2 || halfH > PERIOD.h / 2 ? 3 : 1
    this.wallMat.uniforms.uCopies.value = copies
    this.geo.instanceCount = N * copies * copies
    this.bgMat.uniforms.uMarkHover.value = this.markHover
    this.bgMat.uniforms.uMarkDim.value = this.focused !== null && this.focused !== MARK_TARGET ? this.focusAmt : 0

    const pw = this.pointer.inside ? this.pointerWorld() : { x: this.x, y: this.y }
    this.liftMesh.visible = liftItem >= 0 && liftAmt > 0.01 && liftItem !== this.focused
    if (this.liftMesh.visible) {
      this.liftMat.uniforms.uOnly.value = liftItem
      ;(this.liftMat.uniforms.uAnchor.value as THREE.Vector2).set(this.hoverExternal !== null ? this.x : pw.x, this.hoverExternal !== null ? this.y : pw.y)
    }
    this.focusMesh.visible = this.focused !== null && this.focused >= 0
    if (this.focusMesh.visible) {
      this.focusMat.uniforms.uOnly.value = this.focused
      ;(this.focusMat.uniforms.uAnchor.value as THREE.Vector2).set(this.x, this.y)
      this.focusMat.uniforms.uHiReady.value = this.hi.tex ? this.hi.ready : 0
    }

    const pu = this.postMat.uniforms
    const vl = Math.hypot(M.vx, M.vy)
    const maxSmear = 0.017
    const sc = vl > 0 ? Math.min(vl / this.W * 0.9, maxSmear) / vl : 0
    ;(pu.uVel.value as THREE.Vector2).set(M.vx * sc * lensScale, -M.vy * sc * lensScale * (this.W / this.H))
    pu.uK.value = M.k
    pu.uZoomVel.value = clamp(M.vz * 1.6, -0.06, 0.06) * lensScale

    this.renderer.setRenderTarget(this.rt)
    this.renderer.render(this.scene, this.cam)
    this.renderer.setRenderTarget(null)
    this.renderer.render(this.postScene, this.cam)

    // --- report
    if (moving && this.pointer.inside && !this.drag) this.updateHover()
    const hr = this.hoverExternal ?? this.hovered
    this.ev.frame({
      x: this.x,
      y: -this.y,
      zoom: this.z / this.defaultZoom,
      moving,
      hoverRect: hr !== null && this.focused === null ? this.rectOnScreen(hr) : null,
      loaded: this.loadedCount,
      total: N,
    })
  }
}
