import * as THREE from 'three'
import { GPUComputationRenderer, type Variable } from 'three/examples/jsm/misc/GPUComputationRenderer.js'
import { BlendFunction, BloomEffect, Effect, EffectComposer, EffectPass, RenderPass } from 'postprocessing'
import { positionShader, renderFragment, renderVertex, velocityShader } from './shaders'
import {
  TargetLibrary,
  cloudShape,
  galaxyShape,
  imageShape,
  logoShape,
  pointsShape,
  ringShape,
  textShape,
  type ShapeMaker,
  type Target,
} from './targets'
import type { SwarmPalette, SwarmPlacement, SwarmRegion, SwarmShowOptions, SwarmStats, SwarmTarget } from '../types'

export const CAMERA = { fov: 35, dist: 6 }
const HALF_H = CAMERA.dist * Math.tan(THREE.MathUtils.degToRad(CAMERA.fov / 2))
const NARROW = 760
const NOHOLD =
  'a, button, input, textarea, select, label, summary, [role="button"], [contenteditable], [data-swarm-nohold], p, h1, h2, h3, h4, h5, h6, li, dt, dd, blockquote, pre, code'

export const PALETTES: Record<'teal' | 'violet', [string, string, string, string]> = {
  teal: ['#127a92', '#45e6ff', '#cfe8ff', '#ffffff'],
  violet: ['#3a12c2', '#8b5cff', '#d6c6ff', '#ffffff'],
}

export interface EngineInit {
  /** Simulation texture side; particles = N². */
  N: number
  mobile: boolean
  reduced: boolean
  dprCap: number
}

export interface EngineSettings {
  palette: SwarmPalette
  background: string
  bloom: boolean
  interactive: boolean
  holdToAttract: boolean
  parallax: number
  brightness: number
  paused: boolean
  defaults: SwarmShowOptions
}

interface Spec {
  target: Target
  placement: SwarmPlacement
  fill: number
  spinSpeed: number
  sway: number
  tilt: number
  spin: number
  /** cached region evaluation */
  rv: number
  ox: number
  oy: number
  scale: number
}

interface Request {
  input: SwarmTarget
  opts: SwarmShowOptions
}

/* ---------- target resolution ---------- */

const pointKeys = new WeakMap<Float32Array, string>()
let pointSeq = 0

interface Resolved {
  key: string
  make: ShapeMaker
  defaults: SwarmShowOptions
}

function resolve(input: SwarmTarget, coverAspect: number): Resolved {
  if (input === 'logo') return { key: 'logo', make: logoShape, defaults: { fill: 0.86, sway: 0.5 } }
  if (input === 'galaxy') return { key: 'galaxy', make: galaxyShape, defaults: { fill: 0.92, tilt: 1.12, spin: 0.1 } }
  if (input === 'ring') return { key: 'ring', make: ringShape, defaults: { fill: 0.84, tilt: 1.18, spin: 0.14 } }
  if (input === 'cloud') return { key: 'cloud', make: cloudShape, defaults: { fill: 1.0, spin: 0.05, sway: 0.1 } }
  if ('text' in input) {
    const { text, font, weight, tracking } = input
    return {
      key: `text:${font ?? ''}:${weight ?? ''}:${tracking ?? ''}:${text}`,
      make: (n) => textShape(text, n, { font, weight, tracking }),
      defaults: { fill: 0.9, sway: 0.16 },
    }
  }
  if ('image' in input) {
    const { image, fit = 'contain', invert, contrast } = input
    const ca = fit === 'cover' ? Math.round(coverAspect * 10) / 10 : 0
    return {
      key: `img:${fit}:${ca}:${invert ?? 'auto'}:${contrast ?? ''}:${image}`,
      make: (n) => imageShape(image, n, { fit, coverAspect: ca, invert, contrast }),
      defaults: { fill: fit === 'cover' ? 1 : 0.94, sway: 0.06 },
    }
  }
  const { points, stride = 3 } = input
  let key = input.key
  if (!key) {
    key = pointKeys.get(points)
    if (!key) pointKeys.set(points, (key = `pts:${++pointSeq}`))
  }
  return { key, make: (n) => pointsShape(points, n, stride), defaults: { fill: 0.9 } }
}

export function regionFor(p: SwarmPlacement, w: number, h: number): SwarmRegion {
  if (typeof p === 'function') return p(w, h)
  if (typeof p === 'object') return p
  const narrow = w < NARROW
  switch (p) {
    case 'full':
      return { x0: 0.03, y0: 0.06, x1: 0.97, y1: 0.94 }
    case 'center':
      return narrow ? { x0: 0.05, y0: 0.1, x1: 0.95, y1: 0.6 } : { x0: 0.16, y0: 0.1, x1: 0.84, y1: 0.9 }
    case 'left':
      return narrow ? { x0: 0.06, y0: 0.06, x1: 0.94, y1: 0.44 } : { x0: 0.04, y0: 0.12, x1: 0.5, y1: 0.88 }
    case 'right':
    default:
      return narrow ? { x0: 0.06, y0: 0.06, x1: 0.94, y1: 0.44 } : { x0: 0.5, y0: 0.12, x1: 0.96, y1: 0.88 }
  }
}

/* ---------- final pass: alpha from brightness so transparent canvases composite as light ---------- */

class AlphaFromLight extends Effect {
  constructor() {
    super(
      'SwarmAlphaFromLight',
      /* glsl */ `
      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        float m = max(max(inputColor.r, inputColor.g), inputColor.b);
        outputColor = vec4(inputColor.rgb, clamp(max(inputColor.a, pow(clamp(m, 0.0, 1.0), 0.4545)), 0.0, 1.0));
      }`,
      { blendFunction: BlendFunction.SRC },
    )
  }
}

/* ---------- engine ---------- */

export class SwarmEngine {
  readonly init: EngineInit
  readonly lib: TargetLibrary
  readonly glOk: boolean
  private settings: EngineSettings
  private container: HTMLElement
  private ring: HTMLElement | null
  private renderer!: THREE.WebGLRenderer
  private composer!: EffectComposer
  private effectPass: EffectPass | null = null
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, 0.1, 60)
  private gpu!: GPUComputationRenderer
  private velVar!: Variable
  private posVar!: Variable
  private material!: THREE.ShaderMaterial
  private geometry!: THREE.BufferGeometry
  private blank!: THREE.DataTexture
  private bgColor = new THREE.Color()

  // stage
  private a: Spec | null = null
  private b: Spec | null = null
  private mix = 1
  private morphing = false
  private morphDur = 1.4
  private kick = 0
  private burst = 0
  private burstOrigin = new THREE.Vector3()
  private base: Request | null = null
  private over: Request | null = null
  private displayToken = 0
  private resolveDisplayed: (() => void) | null = null

  // size / loop
  private width = 1
  private height = 1
  private dpr = 1
  private sizeVersion = 0
  private raf = 0
  private last = 0
  private time = 0
  private fps = 60
  private onScreen = true
  private docVisible = !document.hidden
  private settleUntil = 0
  private disposed = false
  private rect = { left: 0, top: 0, width: 1, height: 1 }
  private rectDirty = true

  // pointer
  private pointer = { x: 0, y: 0, cx: -100, cy: -100, inside: false, down: false }
  private ringPos = { x: -100, y: -100, o: -1, h: -1 }
  private k = {
    ray: new THREE.Raycaster(),
    plane: new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
    hit: new THREE.Vector3(),
    cursor: new THREE.Vector3(99, 99, 0),
    prev: new THREE.Vector3(99, 99, 0),
    vel: new THREE.Vector3(),
    raw: new THREE.Vector3(),
    ndc: new THREE.Vector2(),
    on: 0,
    hold: 0,
    parallax: 0,
    alpha: 0,
    first: true,
  }

  private ro: ResizeObserver
  private io: IntersectionObserver
  private cleanups: (() => void)[] = []

  constructor(container: HTMLElement, init: EngineInit, settings: EngineSettings, ring: HTMLElement | null) {
    this.container = container
    this.init = init
    this.settings = settings
    this.ring = ring
    this.lib = new TargetLibrary(init.N)
    this.lib.inUse = () => {
      const s = new Set<string>()
      if (this.a) s.add(this.a.target.key)
      if (this.b) s.add(this.b.target.key)
      return s
    }
    this.glOk = this.setupGL()
    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(container)
    this.io = new IntersectionObserver((e) => {
      this.onScreen = e[e.length - 1].isIntersecting
      this.rectDirty = true
      this.wake()
    })
    this.io.observe(container)
    this.bindEvents()
    this.resize()
    this.applySettings()
  }

  /* ---------- setup ---------- */

  private setupGL(): boolean {
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance', stencil: false, depth: false })
    } catch (e) {
      console.warn('[swarm] WebGL unavailable', e)
      return false
    }
    this.renderer = renderer
    renderer.toneMapping = THREE.NoToneMapping
    const canvas = renderer.domElement
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block'
    canvas.setAttribute('aria-hidden', 'true')
    const lost = (e: Event) => {
      e.preventDefault()
      this.stop()
    }
    canvas.addEventListener('webglcontextlost', lost)
    this.cleanups.push(() => canvas.removeEventListener('webglcontextlost', lost))
    this.container.appendChild(canvas)

    const N = this.init.N
    const gpu = new GPUComputationRenderer(N, N, renderer)
    if (!renderer.extensions.has('EXT_color_buffer_float')) gpu.setDataType(THREE.HalfFloatType)
    const pos0 = gpu.createTexture()
    ;(pos0.image.data as Float32Array).set(this.lib.initialPositions())
    const vel0 = gpu.createTexture()
    const velVar = gpu.addVariable('textureVelocity', velocityShader, vel0)
    const posVar = gpu.addVariable('texturePosition', positionShader, pos0)
    gpu.setVariableDependencies(velVar, [velVar, posVar])
    gpu.setVariableDependencies(posVar, [velVar, posVar])
    const blank = new THREE.DataTexture(new Float32Array(4), 1, 1, THREE.RGBAFormat, THREE.FloatType)
    blank.needsUpdate = true
    this.blank = blank
    Object.assign(velVar.material.uniforms, {
      uTime: { value: 0 },
      uDt: { value: 0 },
      uSnap: { value: 0 },
      uSnapTex: { value: blank },
      uTexA: { value: pos0 },
      uTexB: { value: pos0 },
      uXA: { value: new THREE.Vector4(0, 0, 0, 1) },
      uXB: { value: new THREE.Vector4(0, 0, 0, 1) },
      uRA: { value: new THREE.Vector2() },
      uRB: { value: new THREE.Vector2() },
      uMix: { value: 0 },
      uStiff: { value: 0 },
      uDamp: { value: 5.2 },
      uNoise: { value: this.init.reduced ? 0 : 0.09 },
      uNoiseFreq: { value: 0.9 },
      uKick: { value: 0 },
      uBurst: { value: 0 },
      uBurstOrigin: { value: new THREE.Vector3() },
      uCursor: { value: new THREE.Vector3(99, 99, 0) },
      uCursorVel: { value: new THREE.Vector3() },
      uCursorOn: { value: 0 },
      uCursorRadius: { value: 0.5 },
      uHold: { value: 0 },
      uMaxSpeed: { value: 9 },
    })
    Object.assign(posVar.material.uniforms, {
      uTime: { value: 0 },
      uDt: { value: 0 },
      uSnap: { value: 0 },
      uSnapTex: { value: blank },
    })
    const err = gpu.init()
    if (err) {
      console.warn('[swarm] GPGPU unavailable:', err)
      gpu.dispose()
      blank.dispose()
      renderer.dispose()
      canvas.remove()
      return false
    }
    // The initial textures are copied into render targets by init(); free the CPU copies' GPU side.
    pos0.dispose()
    vel0.dispose()
    velVar.material.uniforms.uTexA.value = blank
    velVar.material.uniforms.uTexB.value = blank
    this.gpu = gpu
    this.velVar = velVar
    this.posVar = posVar

    const count = N * N
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    const ref = new Float32Array(count * 2)
    for (let i = 0; i < count; i++) {
      ref[i * 2] = ((i % N) + 0.5) / N
      ref[i * 2 + 1] = (Math.floor(i / N) + 0.5) / N
    }
    geometry.setAttribute('aRef', new THREE.BufferAttribute(ref, 2))
    // Density compensation: fewer particles → larger, brighter points.
    const density = Math.sqrt(200704 / count)
    const material = new THREE.ShaderMaterial({
      vertexShader: renderVertex,
      fragmentShader: renderFragment,
      uniforms: {
        uPos: { value: null },
        uVel: { value: null },
        uSize: { value: Math.min(0.016, 0.0058 * density) },
        uScale: { value: 1000 },
        uFocus: { value: CAMERA.dist },
        uAperture: { value: this.init.mobile ? 0.012 : 0.024 },
        uAlpha: { value: 0 },
        uHeat: { value: 0.3 },
        uTime: { value: 0 },
        uC0: { value: new THREE.Color() },
        uC1: { value: new THREE.Color() },
        uC2: { value: new THREE.Color() },
        uC3: { value: new THREE.Color() },
      },
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneFactor,
    })
    this.material = material
    this.geometry = geometry
    const points = new THREE.Points(geometry, material)
    points.frustumCulled = false
    this.scene.add(points)
    this.camera.position.set(0, 0, CAMERA.dist)

    this.composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType, multisampling: 0 })
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    return true
  }

  private buildEffects() {
    if (!this.glOk) return
    if (this.effectPass) {
      this.composer.removePass(this.effectPass)
      this.effectPass.dispose()
    }
    const effects: Effect[] = []
    if (this.settings.bloom)
      effects.push(
        new BloomEffect({
          mipmapBlur: true,
          intensity: this.init.mobile ? 0.7 : 0.95,
          luminanceThreshold: 0.16,
          luminanceSmoothing: 0.35,
          radius: 0.72,
        }),
      )
    effects.push(new AlphaFromLight())
    this.effectPass = new EffectPass(this.camera, ...effects)
    this.composer.addPass(this.effectPass)
  }

  private bindEvents() {
    const p = this.pointer
    const markRect = () => {
      this.rectDirty = true
    }
    const move = (e: PointerEvent) => {
      p.cx = e.clientX
      p.cy = e.clientY
      this.updateInside()
      if (p.inside) this.wake()
    }
    const down = (e: PointerEvent) => {
      move(e)
      if (e.pointerType === 'touch' || e.button !== 0) return
      if (!p.inside || !this.settings.interactive || !this.settings.holdToAttract || this.init.reduced) return
      const t = e.target as Element | null
      if (t?.closest?.(NOHOLD)) return
      p.down = true
      this.ring?.setAttribute('data-holding', '')
    }
    const mousedown = (e: MouseEvent) => {
      // Stop text selection while the black hole is held.
      if (p.down) e.preventDefault()
    }
    const up = (e: PointerEvent) => {
      p.down = false
      this.ring?.removeAttribute('data-holding')
      if (e.pointerType === 'touch') p.inside = false
    }
    const leave = () => {
      p.inside = false
      p.down = false
      this.ring?.removeAttribute('data-holding')
    }
    const vis = () => {
      this.docVisible = !document.hidden
      this.wake()
    }
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerdown', down)
    window.addEventListener('mousedown', mousedown)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    window.addEventListener('blur', leave)
    window.addEventListener('scroll', markRect, { passive: true, capture: true })
    document.documentElement.addEventListener('mouseleave', leave)
    document.addEventListener('visibilitychange', vis)
    this.cleanups.push(() => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('mousedown', mousedown)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      window.removeEventListener('blur', leave)
      window.removeEventListener('scroll', markRect, { capture: true })
      document.documentElement.removeEventListener('mouseleave', leave)
      document.removeEventListener('visibilitychange', vis)
    })
  }

  private updateRect() {
    if (!this.rectDirty) return
    const r = this.container.getBoundingClientRect()
    this.rect.left = r.left
    this.rect.top = r.top
    this.rect.width = Math.max(1, r.width)
    this.rect.height = Math.max(1, r.height)
    this.rectDirty = false
  }

  private updateInside() {
    this.updateRect()
    const p = this.pointer, r = this.rect
    const lx = p.cx - r.left, ly = p.cy - r.top
    p.inside = lx >= 0 && ly >= 0 && lx <= r.width && ly <= r.height
    p.x = (lx / r.width) * 2 - 1
    p.y = -(ly / r.height) * 2 + 1
  }

  /* ---------- public ---------- */

  update(settings: EngineSettings) {
    const prev = this.settings
    this.settings = settings
    if (prev.bloom !== settings.bloom) this.buildEffects()
    this.applyColors()
    this.settle()
  }

  private applySettings() {
    this.buildEffects()
    this.applyColors()
  }

  private applyColors() {
    if (!this.glOk) return
    const pal = this.settings.palette
    const stops = typeof pal === 'string' ? PALETTES[pal] ?? PALETTES.teal : pal
    const u = this.material.uniforms
    u.uC0.value.set(stops[0])
    u.uC1.value.set(stops[1])
    u.uC2.value.set(stops[2])
    u.uC3.value.set(stops[3])
    if (this.settings.background === 'transparent') this.renderer.setClearColor(0x000000, 0)
    else {
      this.bgColor.set(this.settings.background)
      this.renderer.setClearColor(this.bgColor, 1)
    }
  }

  show(input: SwarmTarget, opts: SwarmShowOptions = {}, layer: 'base' | 'override'): Promise<void> {
    const req: Request = { input, opts }
    if (layer === 'base') {
      this.base = req
      if (this.over) return this.build(req).then(() => undefined)
    } else this.over = req
    return this.display(req)
  }

  clearOverride(opts: SwarmShowOptions = {}) {
    if (!this.over) return
    this.over = null
    if (this.base) void this.display({ input: this.base.input, opts: { ...this.base.opts, ...opts } })
  }

  preload(inputs: SwarmTarget[]) {
    return Promise.all(inputs.map((i) => this.build({ input: i, opts: {} }).catch(() => undefined))).then(() => undefined)
  }

  scrub(a: SwarmTarget, b: SwarmTarget, t: number, oa: SwarmShowOptions = {}, ob: SwarmShowOptions = oa) {
    const ra = resolve(a, this.coverAspect(oa)), rb = resolve(b, this.coverAspect(ob))
    const ta = this.lib.peek(ra.key), tb = this.lib.peek(rb.key)
    if (!ta || !tb) {
      void this.preload([a, b])
      return
    }
    this.displayToken++
    const sa = this.a?.target === ta && this.a.placement === (oa.placement ?? this.a.placement) ? this.a : this.makeSpec(ta, ra, oa)
    const sb = this.b?.target === tb && this.b.placement === (ob.placement ?? this.b.placement) ? this.b : sa.target === tb ? sa : this.makeSpec(tb, rb, ob)
    this.a = sa
    this.b = sb
    this.mix = Math.min(1, Math.max(0, t))
    this.morphing = false
    this.settle()
  }

  explode(strength = 2.5) {
    if (this.init.reduced) return
    this.burst = strength
    const s = this.b
    this.burstOrigin.set(s ? s.ox : 0, s ? s.oy : 0, 0)
    this.wake()
  }

  stats(): SwarmStats {
    return { particles: this.lib.count, fps: Math.round(this.fps), dpr: this.dpr, running: this.raf !== 0, gl: this.glOk }
  }

  /* ---------- staging ---------- */

  private coverAspect(opts: SwarmShowOptions) {
    const r = regionFor(opts.placement ?? this.settings.defaults.placement ?? 'center', this.width, this.height)
    return ((r.x1 - r.x0) * this.width) / Math.max(1, (r.y1 - r.y0) * this.height)
  }

  private build(req: Request) {
    const r = resolve(req.input, this.coverAspect(req.opts))
    return this.lib.get(r.key, r.make).then((t) => ({ t, r }))
  }

  private display(req: Request): Promise<void> {
    const token = ++this.displayToken
    this.resolveDisplayed?.()
    this.resolveDisplayed = null
    return new Promise<void>((done) => {
      this.resolveDisplayed = done
      this.build(req)
        .then(({ t, r }) => {
          if (this.disposed || token !== this.displayToken) return
          this.stage(this.makeSpec(t, r, req.opts), req.opts)
        })
        .catch((e) => {
          if (!this.disposed) console.warn('[swarm] target failed', e)
        })
        .finally(() => {
          if (this.resolveDisplayed === done) this.resolveDisplayed = null
          done()
        })
    })
  }

  private makeSpec(t: Target, r: Resolved, opts: SwarmShowOptions): Spec {
    const d = this.settings.defaults
    const pick = <K extends keyof SwarmShowOptions>(k: K) => opts[k] ?? r.defaults[k] ?? d[k]
    return {
      target: t,
      placement: opts.placement ?? d.placement ?? 'center',
      fill: (pick('fill') as number | undefined) ?? 0.9,
      spinSpeed: (pick('spin') as number | undefined) ?? 0,
      sway: (pick('sway') as number | undefined) ?? 0,
      tilt: (pick('tilt') as number | undefined) ?? 0,
      spin: 0,
      rv: -1,
      ox: 0,
      oy: 0,
      scale: 1,
    }
  }

  private stage(spec: Spec, opts: SwarmShowOptions) {
    const cur = this.morphing && this.mix < 0.5 ? this.a : this.b
    const same = cur && cur.target === spec.target
    if (same && cur) spec.spin = cur.spin
    const reduced = this.init.reduced
    if (!cur || reduced) {
      this.a = this.b = spec
      this.mix = 1
      this.morphing = false
    } else {
      this.a = cur
      this.b = spec
      this.mix = 0
      this.morphing = true
      this.morphDur = Math.max(0.05, opts.morphDuration ?? this.settings.defaults.morphDuration ?? 1.4)
    }
    if (!same && !reduced) {
      this.kick = Math.max(this.kick, opts.kick ?? this.settings.defaults.kick ?? 0.55)
      const burst = opts.burst ?? this.settings.defaults.burst ?? 0
      if (burst > 0) {
        this.burst = burst
        this.burstOrigin.set(cur ? cur.ox : 0, cur ? cur.oy : 0, 0)
      }
    }
    this.settle()
  }

  private evaluate(spec: Spec, outX: THREE.Vector4, outR: THREE.Vector2) {
    if (spec.rv !== this.sizeVersion) {
      const r = regionFor(spec.placement, this.width, this.height)
      const aspect = this.width / this.height
      const halfW = HALF_H * aspect
      const wx0 = (r.x0 * 2 - 1) * halfW
      const wx1 = (r.x1 * 2 - 1) * halfW
      const wy0 = (1 - r.y0 * 2) * HALF_H
      const wy1 = (1 - r.y1 * 2) * HALF_H
      spec.scale = Math.min(wy0 - wy1, (wx1 - wx0) / spec.target.aspect) * spec.fill
      spec.ox = (wx0 + wx1) / 2
      spec.oy = (wy0 + wy1) / 2
      spec.rv = this.sizeVersion
    }
    outX.set(spec.ox, spec.oy, 0, spec.scale)
    const reduced = this.init.reduced
    const sway = spec.sway && !reduced ? Math.sin(this.time * 0.32) * spec.sway : 0
    outR.set((reduced ? 0 : spec.spin) + sway, spec.tilt)
  }

  /* ---------- loop ---------- */

  private resize() {
    if (this.disposed) return
    const w = Math.max(1, this.container.clientWidth)
    const h = Math.max(1, this.container.clientHeight)
    this.width = w
    this.height = h
    this.rectDirty = true
    this.sizeVersion++
    this.dpr = Math.min(window.devicePixelRatio || 1, this.init.dprCap, 2)
    if (this.glOk) {
      this.renderer.setPixelRatio(this.dpr)
      this.renderer.setSize(w, h, false)
      this.composer.setSize(w, h, false)
      this.camera.aspect = w / h
      this.camera.updateProjectionMatrix()
    }
    this.settle()
  }

  /** Keep running for a while (reduced motion parks the loop once the swarm settles). */
  private settle() {
    this.settleUntil = performance.now() + 2600
    this.wake()
  }

  private shouldRun() {
    if (this.disposed || !this.glOk || !this.docVisible || !this.onScreen || this.settings.paused) return false
    if (this.init.reduced && performance.now() > this.settleUntil) return false
    return true
  }

  private wake() {
    if (this.raf || !this.shouldRun()) return
    this.last = performance.now()
    this.raf = requestAnimationFrame(this.frame)
  }

  private stop() {
    if (this.raf) cancelAnimationFrame(this.raf)
    this.raf = 0
  }

  private frame = (now: number) => {
    this.raf = 0
    if (!this.shouldRun()) return
    this.raf = requestAnimationFrame(this.frame)
    const raw = Math.max(0, (now - this.last) / 1000)
    this.last = now
    if (raw > 0) this.fps += (1 / raw - this.fps) * 0.05
    const dt = Math.min(raw, 1 / 30)
    this.step(dt)
  }

  private step(dt: number) {
    const k = this.k
    const s = this.settings
    const reduced = this.init.reduced
    this.time += dt
    const vu = this.velVar.material.uniforms
    const pu = this.posVar.material.uniforms
    const ru = this.material.uniforms

    // Formation
    if (this.morphing) {
      this.mix += dt / this.morphDur
      if (this.mix >= 1) {
        this.mix = 1
        this.morphing = false
        this.a = this.b
      }
    }
    const a = this.a, b = this.b
    if (a && b) {
      a.spin += a.spinSpeed * dt
      if (b !== a) b.spin += b.spinSpeed * dt
      this.evaluate(a, vu.uXA.value, vu.uRA.value)
      this.evaluate(b, vu.uXB.value, vu.uRB.value)
      vu.uTexA.value = a.target.tex
      vu.uTexB.value = b.target.tex
      vu.uMix.value = this.mix
      vu.uStiff.value = reduced ? 70 : 30
      vu.uDamp.value = reduced ? 16 : 5.2
    } else {
      vu.uStiff.value = 0
    }
    this.kick = this.kick < 0.002 ? 0 : this.kick * Math.exp(-dt * 1.5)
    vu.uKick.value = this.kick
    vu.uBurst.value = this.burst
    vu.uBurstOrigin.value.copy(this.burstOrigin)
    this.burst = 0
    vu.uSnap.value = pu.uSnap.value = 0

    // Cursor → world on the z = 0 plane.
    const p = this.pointer
    if (this.rectDirty && p.inside) this.updateInside()
    k.ndc.set(p.x, p.y)
    k.ray.setFromCamera(k.ndc, this.camera)
    if (k.ray.ray.intersectPlane(k.plane, k.hit)) {
      if (k.first) {
        k.prev.copy(k.hit)
        k.first = false
      }
      k.cursor.copy(k.hit)
      k.raw.subVectors(k.cursor, k.prev).divideScalar(Math.max(dt, 1e-3))
      k.prev.copy(k.cursor)
      k.vel.lerp(k.raw, 0.25)
      if (k.vel.length() > 8) k.vel.setLength(8)
    }
    const live = s.interactive && !reduced
    const wantOn = p.inside && live ? 1 : 0
    k.on += (wantOn - k.on) * (1 - Math.exp(-dt * 5))
    const held = p.down && live && s.holdToAttract
    k.hold += ((held ? 1 : 0) - k.hold) * (1 - Math.exp(-dt * (held ? 3 : 6)))
    vu.uCursor.value.copy(k.cursor)
    vu.uCursorVel.value.copy(k.vel)
    vu.uCursorOn.value = k.on
    vu.uHold.value = k.hold
    vu.uCursorRadius.value = this.init.mobile ? 0.75 : 0.62

    vu.uTime.value = pu.uTime.value = this.time
    vu.uDt.value = pu.uDt.value = dt
    this.gpu.compute()

    // Camera parallax
    k.parallax += ((reduced || !s.interactive ? 0 : s.parallax) - k.parallax) * (1 - Math.exp(-dt * 3))
    const cam = this.camera
    const px = p.inside ? p.x : 0, py = p.inside ? p.y : 0
    const tx = px * 0.38 * k.parallax
    const ty = py * 0.2 * k.parallax
    cam.position.x += (tx - cam.position.x) * (1 - Math.exp(-dt * 2.5))
    cam.position.y += (ty - cam.position.y) * (1 - Math.exp(-dt * 2.5))
    cam.position.z = CAMERA.dist
    cam.lookAt(0, 0, 0)

    const density = Math.sqrt(200704 / this.lib.count)
    k.alpha += (s.brightness - k.alpha) * (1 - Math.exp(-dt * 3))
    ru.uPos.value = this.gpu.getCurrentRenderTarget(this.posVar).texture
    ru.uVel.value = this.gpu.getCurrentRenderTarget(this.velVar).texture
    ru.uScale.value = (this.height * this.dpr * 0.5) / Math.tan(THREE.MathUtils.degToRad(CAMERA.fov / 2))
    ru.uTime.value = this.time
    ru.uAlpha.value = k.alpha * Math.min(1.1, 0.5 * density)

    this.composer.render(dt)
    this.updateRing(live)
  }

  private updateRing(live: boolean) {
    const el = this.ring
    if (!el) return
    const p = this.pointer, r = this.ringPos
    const o = live && p.inside && !this.init.mobile ? 1 : 0
    r.x += (p.cx - r.x) * 0.3
    r.y += (p.cy - r.y) * 0.3
    if (o !== r.o) {
      el.style.opacity = String(o)
      r.o = o
    }
    if (o) el.style.transform = `translate3d(${r.x.toFixed(1)}px, ${r.y.toFixed(1)}px, 0)`
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    this.stop()
    this.resolveDisplayed?.()
    this.ro.disconnect()
    this.io.disconnect()
    for (const c of this.cleanups) c()
    this.cleanups = []
    this.lib.dispose()
    this.a = this.b = null
    if (!this.glOk) return
    this.effectPass?.dispose()
    this.composer.dispose()
    this.geometry.dispose()
    this.material.dispose()
    this.gpu.dispose()
    this.blank.dispose()
    const canvas = this.renderer.domElement
    this.renderer.dispose()
    this.renderer.forceContextLoss()
    canvas.remove()
  }
}
