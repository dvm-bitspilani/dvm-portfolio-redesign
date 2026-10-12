import { Canvas2DRenderer } from './canvasRenderer'
import { GLRenderer } from './glRenderer'
import { bakeAtlas, getMatcher, measureAdvance, type Matcher } from './glyphs'
import { Grid } from './grid'
import { loadFont } from './theme'
import type { AsciiRenderer, FrameParams, Layout } from './types'

export type RendererKind = 'webgl' | '2d'

export interface CellMetrics {
  /** art (shape-matched) grid font size in css px */
  art: number
  /** text grid font size in css px; omit for art-only surfaces */
  main?: number
  /** inset of the text grid as a fraction of width/height */
  insetX?: number
  insetY?: number
}

export interface Scene {
  /** fill `s.art` / `s.main` and update `s.fp` */
  draw(s: Surface, dt: number): void
  /** keep the RAF loop running? (static scenes redraw only on invalidate) */
  animating(s: Surface): boolean
  metrics(cssW: number, cssH: number): CellMetrics
  resized?(s: Surface): void
}

export const defaultFrame = (): FrameParams => ({
  time: 0,
  dt: 0,
  fx: 0,
  curvature: 0,
  scanlines: 0,
  grille: 0,
  vignette: 0,
  noise: 0,
  bloom: 0,
  persistence: 0,
  tube: false,
  glitch: 0,
  powerX: 1,
  powerY: 1,
  blinkOn: true,
  ink: [0.27, 0.9, 1],
  hot: [0.9, 1, 1],
  bg: null,
})

/**
 * Owns one canvas inside a host element: renderer (WebGL CRT or flat 2D), glyph atlases,
 * the two cell grids, sizing (ResizeObserver), and a RAF loop that pauses off-screen
 * (IntersectionObserver) and in hidden tabs.
 */
export class Surface {
  readonly host: HTMLElement
  canvas: HTMLCanvasElement
  renderer: AsciiRenderer
  kind: RendererKind
  readonly art = new Grid()
  main: Grid | null = null
  layout: Layout = { ox: 0, oy: 0, cw: 8, ch: 16, fcw: 4, fch: 8 }
  fp: FrameParams = defaultFrame()
  matcher: Matcher | null = null
  dpr = 1
  cssW = 1
  cssH = 1
  time = 0
  family: string
  readonly reduced: boolean
  ready = false
  paused = false
  /** css px rect of the canvas, refreshed on resize/scroll-insensitive reads */
  private scene: Scene
  private canvasClass: string
  private raf = 0
  private last = 0
  private inView = true
  private disposed = false
  private bakedKey = ''
  private ro: ResizeObserver
  private io: IntersectionObserver
  private onVis = () => this.request()
  private onLost = (e: Event) => {
    e.preventDefault()
    // too many WebGL contexts on the page (or GPU reset): fall back to the flat renderer
    if (!this.disposed && this.kind === 'webgl') queueMicrotask(() => this.setKind('2d'))
  }

  constructor(host: HTMLElement, scene: Scene, opts: { family: string; kind: RendererKind; canvasClass: string }) {
    this.host = host
    this.scene = scene
    this.family = opts.family
    this.canvasClass = opts.canvasClass
    this.reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
    const made = this.makeRenderer(opts.kind)
    this.canvas = made.canvas
    this.renderer = made.renderer
    this.kind = made.renderer.kind
    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(host)
    this.io = new IntersectionObserver(
      (es) => {
        const e = es[es.length - 1]
        this.inView = e.isIntersecting
        if (this.inView) this.request()
      },
      { rootMargin: '120px' },
    )
    this.io.observe(host)
    document.addEventListener('visibilitychange', this.onVis)
    void this.init()
  }

  private makeRenderer(kind: RendererKind): { canvas: HTMLCanvasElement; renderer: AsciiRenderer } {
    const canvas = document.createElement('canvas')
    canvas.className = this.canvasClass
    canvas.setAttribute('aria-hidden', 'true')
    this.host.prepend(canvas)
    if (kind === 'webgl') {
      try {
        const renderer = new GLRenderer(canvas)
        canvas.addEventListener('webglcontextlost', this.onLost)
        return { canvas, renderer }
      } catch {
        canvas.remove()
        return this.makeRenderer('2d')
      }
    }
    return { canvas, renderer: new Canvas2DRenderer(canvas) }
  }

  /** Swap between the CRT (WebGL) and flat (2D) renderers; recreates the canvas. */
  setKind(kind: RendererKind) {
    if (this.disposed || kind === this.kind) return
    this.canvas.removeEventListener('webglcontextlost', this.onLost)
    this.renderer.dispose()
    this.canvas.remove()
    const made = this.makeRenderer(kind)
    this.canvas = made.canvas
    this.renderer = made.renderer
    this.kind = made.renderer.kind
    this.bakedKey = ''
    this.resize()
  }

  setFamily(family: string) {
    if (family === this.family) return
    this.family = family
    this.ready = false
    void this.init()
  }

  private async init() {
    const fam = this.family
    await loadFont(fam)
    if (this.disposed || fam !== this.family) return
    this.matcher = getMatcher(fam)
    this.ready = true
    this.bakedKey = ''
    this.resize()
  }

  resize() {
    if (!this.ready || this.disposed) return
    const rect = this.host.getBoundingClientRect()
    const W = Math.max(8, rect.width)
    const H = Math.max(8, rect.height)
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    this.cssW = W
    this.cssH = H
    this.dpr = dpr
    const m = this.scene.metrics(W, H)
    const fam = this.family
    const artPx = Math.max(4, Math.round(m.art * dpr))
    const fcw = Math.max(2, Math.round(measureAdvance(fam, artPx)))
    const fch = Math.max(4, Math.round(artPx * 1.02))
    const Wd = Math.round(W * dpr)
    const Hd = Math.round(H * dpr)
    let key = `${fam}|${this.kind}|${artPx}`
    if (m.main) {
      const mainPx = Math.max(6, Math.round(m.main * dpr))
      const cw = Math.max(4, Math.round(measureAdvance(fam, mainPx)))
      const ch = Math.max(8, Math.round(mainPx * 1.04))
      const insetX = Math.round(Wd * (m.insetX ?? 0.03))
      const insetY = Math.round(Hd * (m.insetY ?? 0.04))
      const cols = Math.max(10, Math.floor((Wd - insetX * 2) / cw))
      const rows = Math.max(6, Math.floor((Hd - insetY * 2) / ch))
      if (!this.main) this.main = new Grid()
      this.main.resize(cols, rows)
      this.layout = { ox: Math.round((Wd - cols * cw) / 2), oy: Math.round((Hd - rows * ch) / 2), cw, ch, fcw, fch }
      this.art.resize(Math.ceil((cols * cw) / fcw), Math.ceil((rows * ch) / fch))
      key += `|${mainPx}`
      if (this.bakedKey !== key) {
        const t = this.kind === '2d'
        this.renderer.setAtlases({ main: bakeAtlas(fam, mainPx, cw, ch, t), art: bakeAtlas(fam, artPx, fcw, fch, t) })
      }
    } else {
      this.main = null
      const cols = Math.max(1, Math.floor(Wd / fcw))
      const rows = Math.max(1, Math.floor(Hd / fch))
      this.art.resize(cols, rows)
      this.layout = { ox: Math.round((Wd - cols * fcw) / 2), oy: Math.round((Hd - rows * fch) / 2), cw: fcw, ch: fch, fcw, fch }
      if (this.bakedKey !== key) {
        const a = bakeAtlas(fam, artPx, fcw, fch, this.kind === '2d')
        this.renderer.setAtlases({ main: a, art: a })
      }
    }
    this.bakedKey = key
    this.renderer.setSize(W, H, dpr)
    this.scene.resized?.(this)
    this.renderNow(0)
    this.request()
  }

  /** Text-grid cell → art-grid cell. */
  toArtX(x: number) {
    return Math.floor((x * this.layout.cw) / this.layout.fcw)
  }
  toArtY(y: number) {
    return Math.floor((y * this.layout.ch) / this.layout.fch)
  }

  /**
   * Client coords → fractional art-cell coords, undoing the tube curvature so the
   * pointer lands on the glyph under it. Also returns whether it is inside the canvas.
   */
  pointerToArt(clientX: number, clientY: number, out: { x: number; y: number; inside: boolean }) {
    const rect = this.canvas.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top
    const k = this.fp.curvature
    const px = (x / rect.width) * 2 - 1
    const py = (1 - y / rect.height) * 2 - 1
    const qx = px * (1 + py * py * k * 0.85)
    const qy = py * (1 + qx * qx * k)
    const sx = (qx * 0.5 + 0.5) * rect.width * this.dpr
    const sy = (1 - (qy * 0.5 + 0.5)) * rect.height * this.dpr
    out.x = (sx - this.layout.ox) / this.layout.fcw
    out.y = (sy - this.layout.oy) / this.layout.fch
    out.inside = x >= 0 && y >= 0 && x < rect.width && y < rect.height
    return out
  }

  /** Main-grid cell under the pointer (fractional). */
  pointerToMain(clientX: number, clientY: number, out: { x: number; y: number; inside: boolean }) {
    this.pointerToArt(clientX, clientY, out)
    out.x = (out.x * this.layout.fcw) / this.layout.cw
    out.y = (out.y * this.layout.fch) / this.layout.ch
    return out
  }

  private shouldRun() {
    return this.ready && !this.disposed && this.inView && !document.hidden && !this.paused && this.scene.animating(this)
  }

  private loop = (now: number) => {
    this.raf = 0
    if (this.disposed) return
    const dt = Math.min(0.1, Math.max(0, (now - this.last) / 1000))
    this.last = now
    this.renderNow(dt)
    if (this.shouldRun()) this.raf = requestAnimationFrame(this.loop)
  }

  /** Schedule a frame (keeps looping while the scene animates and the canvas is visible). */
  request() {
    if (this.raf || this.disposed || !this.ready || !this.inView || document.hidden) return
    this.last = performance.now()
    this.raf = requestAnimationFrame(this.loop)
  }

  private renderNow(dt: number) {
    if (!this.ready || this.disposed) return
    this.time += dt
    this.fp.dt = dt
    this.scene.draw(this, dt)
    this.renderer.render(this.main, this.art, this.layout, this.fp)
  }

  dispose() {
    this.disposed = true
    if (this.raf) cancelAnimationFrame(this.raf)
    this.raf = 0
    this.ro.disconnect()
    this.io.disconnect()
    document.removeEventListener('visibilitychange', this.onVis)
    this.canvas.removeEventListener('webglcontextlost', this.onLost)
    this.renderer.dispose()
    this.canvas.remove()
  }
}
