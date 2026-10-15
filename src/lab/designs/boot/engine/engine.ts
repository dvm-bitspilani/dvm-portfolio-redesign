import { asciiBeginFrame } from './asciiImage'
import { Boot } from './boot'
import { CellSampler } from './cells'
import { bakeAtlas, FONT_FAMILY, Matcher, measureAdvance } from './glyphs'
import { B_BRIGHT, B_DIM, B_MID, B_NORM, F_BLINK, F_INV, Grid, type Seg } from './grid'
import { Matrix } from './matrix'
import { CRTRenderer, type Theme } from './renderer'
import { Shell } from './shell'

export type RouteId = 'home' | 'work' | 'project' | 'team' | 'journal' | 'contact'
export interface RouteParams {
  slug?: string
  vertical?: string
  section?: string
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface KeyEv {
  key: string
  ctrl: boolean
  alt: boolean
  shift: boolean
}

export interface PointerInfo {
  type: 'down' | 'move' | 'up'
  /** main grid cell */
  cx: number
  cy: number
  /** css px relative to canvas */
  x: number
  y: number
  dx: number
  dy: number
}

export interface App {
  readonly id: RouteId
  enter?(e: Engine, p: RouteParams): void
  draw(e: Engine, r: Rect, dt: number): void
  /** Return true when the key was consumed. */
  key?(e: Engine, k: KeyEv): boolean
  /** Printable text; return true when consumed (otherwise it goes to the prompt). */
  textInput?(e: Engine, ch: string): boolean
  wheel?(e: Engine, dy: number): void
  /** Return true to capture a drag. */
  pointer?(e: Engine, p: PointerInfo): boolean
  chips?(e: Engine): string[]
  /** Shell cwd shown in the prompt. */
  cwd?(e: Engine): string
  /** Hide the prompt line (composer owns input). */
  hidePrompt?: boolean
  /** Called when the POST finishes. */
  onBoot?(e: Engine): void
}

export type ThemeName = 'green' | 'amber' | 'ice'
const hex = (h: string): [number, number, number] => {
  const n = parseInt(h.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}
export const THEMES: Record<ThemeName, Theme & { css: string }> = {
  green: { ink: hex('#7CFF6B'), hot: hex('#E9FFE4'), css: '#7CFF6B' },
  amber: { ink: hex('#FFB21E'), hot: hex('#FFF0CF'), css: '#FFB21E' },
  ice: { ink: hex('#8FE3FF'), hot: hex('#F2FCFF'), css: '#8FE3FF' },
}

export const ROUTE_PATH: Record<Exclude<RouteId, 'project'>, string> = {
  home: '',
  work: 'work',
  team: 'team',
  journal: 'journal',
  contact: 'contact',
}
const TABS: { id: RouteId; label: string; path: string }[] = [
  { id: 'home', label: 'home', path: '' },
  { id: 'work', label: 'work', path: 'work' },
  { id: 'team', label: 'team', path: 'team' },
  { id: 'journal', label: 'journal', path: 'journal' },
  { id: 'contact', label: 'contact', path: 'contact' },
]

export interface EngineHost {
  navigate: (path: string) => void
  announce: (msg: string) => void
  onState: (s: { theme: ThemeName; crt: boolean; booting: boolean; power: boolean }) => void
}

type AppFactory = (id: RouteId) => App

export class Engine {
  readonly canvas: HTMLCanvasElement
  readonly input: HTMLTextAreaElement
  readonly host: EngineHost
  readonly r: CRTRenderer
  readonly main = new Grid()
  readonly fine = new Grid()
  readonly matcher = new Matcher()
  readonly sampler = new CellSampler()
  readonly shell: Shell
  readonly reduced: boolean
  readonly coarse: boolean

  // layout (device px unless noted)
  dpr = 1
  cssW = 1
  cssH = 1
  cw = 8
  ch = 16
  fcw = 4
  fch = 8
  ox = 0
  oy = 0
  /** raster px per fine cell used for image + logo conversion */
  imgSX = 3
  imgSY = 6
  narrow = false

  time = 0
  theme: ThemeName = 'green'
  crt = true
  private fx = 1
  curvature = 0.032
  glitch = 0
  lumos = 0
  lumosTarget = 0
  booting: Boot | null = null
  /** set by the home app: spin the logo */
  kickLogo?: (v: number) => void
  matrix: Matrix | null = null
  private power: { state: 'on' | 'off' | 'offing' | 'oning'; t: number } = { state: 'on', t: 0 }
  private toast: { text: string; until: number } | null = null

  prompt = { buf: '', cur: 0 }
  private histIdx = -1

  route: RouteId = 'home'
  params: RouteParams = {}
  app: App
  private apps = new Map<RouteId, App>()
  private makeApp: AppFactory

  private links: (() => void)[] = []
  hover = 0
  ptr = { x: -1, y: -1, cx: -1, cy: -1, inside: false, down: false, moved: false, sx: 0, sy: 0, captured: false, lx: 0, ly: 0 }

  private raf = 0
  private last = 0
  private disposed = false
  private ready = false
  private fontPx = 0
  private ro: ResizeObserver
  private cleanup: (() => void)[] = []

  constructor(canvas: HTMLCanvasElement, input: HTMLTextAreaElement, host: EngineHost, makeApp: AppFactory) {
    this.canvas = canvas
    this.input = input
    this.host = host
    this.makeApp = makeApp
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    this.coarse = window.matchMedia('(pointer: coarse)').matches
    this.r = new CRTRenderer(canvas)
    this.shell = new Shell(this)
    this.app = this.getApp('home')
    const saved = sessionStorage.getItem('dvm-boot-theme') as ThemeName | null
    if (saved && THEMES[saved]) this.theme = saved
    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(canvas)
    this.bind()
  }

  /* ---------------- lifecycle ---------------- */

  async init(route: RouteId, params: RouteParams) {
    try {
      await document.fonts.load(`20px ${FONT_FAMILY}`)
    } catch {
      /* fall back to whatever resolves */
    }
    if (this.disposed) return
    this.ready = true
    this.resize()
    this.setRoute(route, params, true)
    const booted = sessionStorage.getItem('dvm-boot-booted') === '1'
    if (!booted) this.boot()
    else this.shell.motd()
    this.emitState()
    this.start()
  }

  boot() {
    this.booting = new Boot(this)
    this.power = { state: this.reduced ? 'on' : 'oning', t: 0 }
    this.emitState()
  }

  finishBoot() {
    this.booting = null
    sessionStorage.setItem('dvm-boot-booted', '1')
    this.shell.motd()
    for (const a of this.apps.values()) a.onBoot?.(this)
    this.glitch = this.reduced ? 0 : 0.5
    this.emitState()
    this.host.announce('DVM terminal ready. Type help, or use the links.')
  }

  powerOff() {
    if (this.reduced) this.power = { state: 'off', t: 0 }
    else this.power = { state: 'offing', t: 0 }
    this.emitState()
  }

  private start() {
    if (this.raf || this.disposed) return
    this.last = performance.now()
    const loop = (now: number) => {
      this.raf = 0
      if (this.disposed) return
      const dt = Math.min(0.1, (now - this.last) / 1000)
      this.last = now
      this.frame(dt)
      if (!document.hidden) this.raf = requestAnimationFrame(loop)
    }
    this.raf = requestAnimationFrame(loop)
  }

  private stop() {
    if (this.raf) cancelAnimationFrame(this.raf)
    this.raf = 0
  }

  dispose() {
    this.disposed = true
    this.stop()
    this.ro.disconnect()
    for (const c of this.cleanup) c()
    this.r.dispose()
  }

  /* ---------------- layout ---------------- */

  resize() {
    if (!this.ready || this.disposed) return
    const rect = this.canvas.getBoundingClientRect()
    const W = Math.max(50, rect.width)
    const H = Math.max(50, rect.height)
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    this.cssW = W
    this.cssH = H
    this.dpr = dpr
    this.narrow = W < 720
    const fs = Math.round(Math.max(14, Math.min(23, Math.min(H / 38, W / (this.narrow ? 46 : 70)))))
    const adv = measureAdvance(fs * dpr)
    this.cw = Math.max(4, Math.round(adv))
    this.ch = Math.max(8, Math.round(fs * dpr * 1.04))
    const ffs = fs * 0.56
    const fadv = measureAdvance(ffs * dpr)
    this.fcw = Math.max(2, Math.round(fadv))
    this.fch = Math.max(4, Math.round(ffs * dpr * 1.02))
    this.imgSY = 7
    this.imgSX = Math.max(2, Math.round((7 * this.fcw) / this.fch))
    const Wd = Math.round(W * dpr)
    const Hd = Math.round(H * dpr)
    const insetX = Math.round(Wd * (this.narrow ? 0.03 : 0.032))
    const insetY = Math.round(Hd * (this.narrow ? 0.025 : 0.04))
    const cols = Math.max(20, Math.floor((Wd - insetX * 2) / this.cw))
    const rows = Math.max(10, Math.floor((Hd - insetY * 2) / this.ch))
    this.ox = Math.round((Wd - cols * this.cw) / 2)
    this.oy = Math.round((Hd - rows * this.ch) / 2)
    this.main.resize(cols, rows)
    this.fine.resize(Math.ceil((cols * this.cw) / this.fcw), Math.ceil((rows * this.ch) / this.fch))
    if (this.fontPx !== fs * dpr) {
      this.fontPx = fs * dpr
      this.r.setAtlases(bakeAtlas(fs * dpr, this.cw, this.ch), bakeAtlas(ffs * dpr, this.fcw, this.fch))
    }
    this.r.setSize(W, H, dpr)
    this.frame(0)
  }

  toFineX(x: number) {
    return Math.floor((x * this.cw) / this.fcw)
  }
  toFineY(y: number) {
    return Math.floor((y * this.ch) / this.fch)
  }

  /* ---------------- routing ---------------- */

  getApp(id: RouteId): App {
    let a = this.apps.get(id)
    if (!a) {
      a = this.makeApp(id)
      this.apps.set(id, a)
    }
    return a
  }

  setRoute(id: RouteId, params: RouteParams, initial = false) {
    const changed = id !== this.route || JSON.stringify(params) !== JSON.stringify(this.params)
    this.route = id
    this.params = params
    this.app = this.getApp(id)
    this.app.enter?.(this, params)
    if (changed && !initial && !this.reduced) this.glitch = Math.max(this.glitch, 0.55)
  }

  go(path: string) {
    this.host.navigate(path)
  }

  /* ---------------- links ---------------- */

  link(fn: () => void): number {
    this.links.push(fn)
    return this.links.length
  }

  segLink(s: Seg): number {
    if (s.cmd) {
      const c = s.cmd
      return this.link(() => this.exec(c))
    }
    if (s.href) {
      const h = s.href
      return this.link(() => window.open(h, '_blank', 'noopener'))
    }
    if (s.to !== undefined) {
      const t = s.to
      return this.link(() => this.go(t))
    }
    return 0
  }

  /* ---------------- shell glue ---------------- */

  exec(line: string, echo = true) {
    this.shell.run(line, echo)
    this.prompt = { buf: '', cur: 0 }
    this.histIdx = -1
  }

  setTheme(t: ThemeName) {
    this.theme = t
    sessionStorage.setItem('dvm-boot-theme', t)
    this.flash(`theme: ${t}`)
    this.emitState()
  }

  setCrt(on: boolean) {
    this.crt = on
    this.flash(on ? 'crt: on' : 'crt: off (flat, sharp text)')
    this.emitState()
  }

  flash(text: string, secs = 2.4) {
    this.toast = { text, until: this.time + secs }
  }

  private emitState() {
    this.host.onState({ theme: this.theme, crt: this.crt, booting: !!this.booting, power: this.power.state !== 'off' && this.power.state !== 'offing' })
  }

  /* ---------------- frame ---------------- */

  private frame(dt: number) {
    if (!this.ready) return
    this.time += dt
    const main = this.main
    const fine = this.fine
    main.clear()
    fine.clear()
    this.links.length = 0
    asciiBeginFrame()
    this.shell.tick(dt)

    // animations
    const ease = 1 - Math.exp(-dt * 6)
    this.fx += ((this.crt ? 1 : 0) - this.fx) * (this.reduced ? 1 : ease)
    this.lumos += (this.lumosTarget - this.lumos) * (this.reduced ? 1 : 1 - Math.exp(-dt * 3))
    this.glitch = Math.max(0, this.glitch - dt * 1.6)
    let powerY = 1
    let powerX = 1
    const P = this.power
    P.t += dt
    if (P.state === 'oning') {
      const t = P.t / 0.55
      powerX = Math.min(1, t * 3)
      powerY = Math.max(0.004, Math.min(1, (t - 0.3) / 0.7) ** 2)
      if (t >= 1) this.power = { state: 'on', t: 0 }
    } else if (P.state === 'offing') {
      const t = P.t / 0.5
      powerY = Math.max(0.004, 1 - t * 1.6) ** 2
      powerX = t < 0.6 ? 1 : Math.max(0, 1 - (t - 0.6) / 0.4)
      if (t >= 1) {
        this.power = { state: 'off', t: 0 }
        this.emitState()
      }
    } else if (P.state === 'off') {
      powerX = 0
      powerY = 0
    }

    if (P.state === 'off') {
      // nothing on the tube but a faint standby message
      const msg = 'press any key to power on'
      main.text(Math.floor((main.cols - msg.length) / 2), Math.floor(main.rows / 2), msg, { b: 70 })
      powerX = 1
      powerY = 1
    } else if (this.booting) {
      this.booting.draw(dt)
    } else {
      this.drawChrome()
      this.app.draw(this, this.appRect(), dt)
      if (this.matrix) {
        if (!this.matrix.draw(dt)) this.matrix = null
      }
    }

    // hover link resolution
    const p = this.ptr
    this.hover = 0
    if (p.inside && p.cx >= 0 && p.cy >= 0 && p.cx < main.cols && p.cy < main.rows) this.hover = main.link[p.cy * main.cols + p.cx]
    const cursor = this.hover ? 'pointer' : this.ptr.captured ? 'grabbing' : this.canvas.dataset.grab === '1' ? 'grab' : 'default'
    if (this.canvas.style.cursor !== cursor) this.canvas.style.cursor = cursor

    const th = THEMES[this.theme]
    const t = this.reduced ? 0 : this.time
    this.r.render(main, fine, { ox: this.ox, oy: this.oy, cw: this.cw, ch: this.ch, fcw: this.fcw, fch: this.fch }, this.hover, {
      time: t,
      dt,
      fx: this.fx,
      curvature: this.curvature * this.fx,
      glitch: this.glitch,
      powerX,
      powerY,
      blinkOn: this.reduced ? true : Math.floor(this.time * 1.9) % 2 === 0,
      persistence: this.reduced ? 0 : 0.05 * this.fx,
      bloom: 0.55 + 0.45 * this.fx,
      lumos: this.lumos,
      theme: th,
    })
  }

  /** Main content rectangle for apps (between header and footer). */
  appRect(): Rect {
    const chipRows = this.chipLayout().rows
    const top = 2
    const bottom = this.main.rows - (this.app.hidePrompt ? 1 : 3) - chipRows
    return { x: 2, y: top, w: this.main.cols - 4, h: Math.max(3, bottom - top - 1) }
  }

  private chipCache: { key: string; rows: number; pos: { x: number; y: number; cmd: string }[] } = { key: '', rows: 1, pos: [] }

  private chipLayout() {
    const chips = this.app.chips?.(this) ?? this.shell.defaultChips()
    const key = chips.join('|') + this.main.cols
    if (this.chipCache.key === key) return this.chipCache
    const pos: { x: number; y: number; cmd: string }[] = []
    const maxW = this.main.cols - 4
    let x = 0
    let y = 0
    for (const c of chips) {
      const w = c.length + 4
      if (x + w > maxW && x > 0) {
        x = 0
        y++
      }
      pos.push({ x, y, cmd: c })
      x += w + 1
    }
    this.chipCache = { key, rows: Math.min(3, y + 1), pos: pos.filter((p) => p.y < 3) }
    return this.chipCache
  }

  private drawChrome() {
    const g = this.main
    const W = g.cols
    const H = g.rows
    // header bar (inverse)
    g.fill(0, 0, W, 1, ' ', { b: 120, f: F_INV })
    let x = g.text(1, 0, ' DVM://BOOT ', { b: 235, f: F_INV })
    x += 1
    const tabs = this.narrow ? TABS.filter((t) => t.id !== 'home') : TABS
    for (const t of tabs) {
      const active = this.route === t.id || (t.id === 'work' && this.route === 'project')
      const link = this.link(() => this.go(t.path))
      const label = ` ${t.label} `
      if (active) x = g.text(x, 0, label, { b: B_BRIGHT, link })
      else x = g.text(x, 0, label, { b: 120, f: F_INV, link })
      x += this.narrow ? 0 : 1
    }
    if (!this.narrow) {
      const d = new Date()
      const clock = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
      const right = `tty1  guest  ${clock} `
      const themeLink = this.link(() => this.exec(`theme ${this.nextTheme()}`))
      const tx = W - right.length - this.theme.length - 4
      g.text(tx, 0, ` ${this.theme} `, { b: B_BRIGHT, f: F_INV, link: themeLink })
      g.textR(W, 0, right, { b: 120, f: F_INV })
    }

    // footer
    const cl = this.chipLayout()
    const promptY = H - 1
    const chipsY = H - (this.app.hidePrompt ? 1 : 3) - cl.rows + 1
    const ruleY = chipsY - 1
    g.hline(0, ruleY, W, '─', { b: 60 })
    if (this.toast && this.time < this.toast.until) g.textR(W - 2, ruleY, ` ${this.toast.text} `, { b: B_BRIGHT })
    else if (this.app.id === 'home') g.textR(W - 2, ruleY, ' tab completes   ↑↓ history ', { b: 80 })
    for (const c of cl.pos) {
      const link = this.link(() => this.exec(c.cmd))
      const y = chipsY + c.y
      const cx = 2 + c.x
      g.put(cx, y, '[', { b: B_DIM, link })
      g.text(cx + 1, y, ` ${c.cmd} `, { b: B_NORM, link })
      g.put(cx + c.cmd.length + 3, y, ']', { b: B_DIM, link })
    }
    if (!this.app.hidePrompt) this.drawPrompt(promptY)
  }

  private nextTheme(): ThemeName {
    return this.theme === 'green' ? 'amber' : this.theme === 'amber' ? 'ice' : 'green'
  }

  cwd() {
    return this.app.cwd?.(this) ?? '~'
  }

  private drawPrompt(y: number) {
    const g = this.main
    let x = 2
    x = g.text(x, y, 'guest@dvm', { b: B_BRIGHT })
    x = g.text(x, y, ':', { b: B_DIM })
    x = g.text(x, y, this.cwd(), { b: B_NORM })
    x = g.text(x, y, '$ ', { b: B_DIM })
    const avail = g.cols - x - 2
    const buf = this.prompt.buf
    const start = Math.max(0, this.prompt.cur - avail + 1)
    const vis = buf.slice(start, start + avail)
    g.text(x, y, vis, { b: B_BRIGHT })
    const cx = x + this.prompt.cur - start
    const under = buf[this.prompt.cur] ?? ' '
    g.put(cx, y, under, { b: B_BRIGHT, f: F_INV | F_BLINK })
    // ghost suggestion (first completion) when the line is not empty
    if (buf && this.prompt.cur === buf.length) {
      const ghost = this.shell.ghost(buf)
      if (ghost) g.text(cx + 1, y, ghost.slice(1), { b: 70 }, avail - (cx - x) - 1)
      if (ghost) g.put(cx, y, ghost[0], { b: B_BRIGHT, f: F_INV | F_BLINK })
    }
  }

  /* ---------------- input ---------------- */

  private bind() {
    const c = this.canvas
    const inp = this.input
    const on = <E extends Event>(el: EventTarget, ev: string, fn: (e: E) => void, opts?: AddEventListenerOptions) => {
      el.addEventListener(ev, fn as EventListener, opts)
      this.cleanup.push(() => el.removeEventListener(ev, fn as EventListener, opts))
    }
    on<PointerEvent>(c, 'pointerdown', (e) => this.onPointer(e, 'down'))
    on<PointerEvent>(c, 'pointermove', (e) => this.onPointer(e, 'move'))
    on<PointerEvent>(c, 'pointerup', (e) => this.onPointer(e, 'up'))
    on<PointerEvent>(c, 'pointercancel', (e) => this.onPointer(e, 'up'))
    on(c, 'pointerleave', () => {
      this.ptr.inside = false
    })
    on<WheelEvent>(c, 'wheel', (e) => this.onWheel(e), { passive: false })
    on<KeyboardEvent>(inp, 'keydown', (e) => this.onKeyDown(e))
    on<InputEvent>(inp, 'input', (e) => this.onInput(e))
    on(document, 'visibilitychange', () => {
      if (document.hidden) this.stop()
      else this.start()
    })
    on<KeyboardEvent>(window, 'keydown', (e) => {
      // type anywhere: route stray keystrokes to the terminal when nothing else has focus
      const a = document.activeElement
      if (a === inp || this.coarse) return
      if (a && a !== document.body && (a as HTMLElement).closest('a,button,input,textarea,select')) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key.length === 1 || ['Enter', 'Backspace', 'ArrowUp', 'ArrowDown', 'Tab', 'Escape'].includes(e.key)) {
        inp.focus({ preventScroll: true })
        if (e.key.length !== 1) this.onKeyDown(e)
      }
    })
    this.resetInput()
  }

  private resetInput() {
    this.input.value = ' '
    this.input.setSelectionRange(1, 1)
  }

  focusInput() {
    this.input.focus({ preventScroll: true })
  }

  private kick(): boolean {
    // returns true when the event was used to dismiss a modal state
    if (this.power.state === 'off') {
      this.boot()
      return true
    }
    if (this.power.state === 'offing') return true
    if (this.booting) {
      this.booting.skip()
      return true
    }
    if (this.matrix) {
      this.matrix = null
      return true
    }
    return false
  }

  private onKeyDown(e: KeyboardEvent) {
    if (e.metaKey) return
    if (e.key === 'Unidentified' || e.key === 'Process' || e.keyCode === 229) return
    const k: KeyEv = { key: e.key, ctrl: e.ctrlKey, alt: e.altKey, shift: e.shiftKey }
    if (this.kick()) {
      e.preventDefault()
      return
    }
    if (this.app.key?.(this, k)) {
      e.preventDefault()
      return
    }
    // empty prompt: let Tab move focus to the page links (keyboard access)
    if (e.key === 'Tab' && !this.prompt.buf) return
    if (this.app.hidePrompt) return
    const P = this.prompt
    const hist = this.shell.history
    let handled = true
    if (e.ctrlKey && e.key.toLowerCase() === 'c') {
      this.shell.print([{ t: `guest@dvm:${this.cwd()}$ ${P.buf}^C`, b: B_DIM }])
      this.prompt = { buf: '', cur: 0 }
    } else if (e.ctrlKey && e.key.toLowerCase() === 'l') {
      this.exec('clear', false)
    } else if (e.ctrlKey && e.key.toLowerCase() === 'u') {
      this.prompt = { buf: P.buf.slice(P.cur), cur: 0 }
    } else if (e.ctrlKey && e.key.toLowerCase() === 'a') {
      P.cur = 0
    } else if (e.ctrlKey && e.key.toLowerCase() === 'e') {
      P.cur = P.buf.length
    } else if (e.ctrlKey) {
      handled = false
    } else
      switch (e.key) {
        case 'Enter':
          this.exec(P.buf)
          break
        case 'Backspace':
          if (P.cur > 0) {
            P.buf = P.buf.slice(0, P.cur - 1) + P.buf.slice(P.cur)
            P.cur--
          }
          break
        case 'Delete':
          P.buf = P.buf.slice(0, P.cur) + P.buf.slice(P.cur + 1)
          break
        case 'ArrowLeft':
          P.cur = Math.max(0, P.cur - 1)
          break
        case 'ArrowRight':
          if (P.cur === P.buf.length) {
            const gh = this.shell.ghost(P.buf)
            if (gh) {
              P.buf += gh
              P.cur = P.buf.length
            }
          } else P.cur = Math.min(P.buf.length, P.cur + 1)
          break
        case 'Home':
          P.cur = 0
          break
        case 'End':
          P.cur = P.buf.length
          break
        case 'ArrowUp':
          if (hist.length) {
            this.histIdx = this.histIdx < 0 ? hist.length - 1 : Math.max(0, this.histIdx - 1)
            this.prompt = { buf: hist[this.histIdx], cur: hist[this.histIdx].length }
          }
          break
        case 'ArrowDown':
          if (this.histIdx >= 0) {
            this.histIdx++
            if (this.histIdx >= hist.length) {
              this.histIdx = -1
              this.prompt = { buf: '', cur: 0 }
            } else this.prompt = { buf: hist[this.histIdx], cur: hist[this.histIdx].length }
          }
          break
        case 'Tab': {
          const r = this.shell.complete(P.buf.slice(0, P.cur))
          if (r) {
            P.buf = r + P.buf.slice(P.cur)
            P.cur = r.length
          }
          break
        }
        case 'Escape':
          this.prompt = { buf: '', cur: 0 }
          break
        case 'PageUp':
          this.app.wheel?.(this, -10)
          break
        case 'PageDown':
          this.app.wheel?.(this, 10)
          break
        default:
          handled = false
      }
    if (handled) e.preventDefault()
  }

  private onInput(e: InputEvent) {
    const t = e.inputType
    const data = e.data ?? ''
    this.resetInput()
    if (this.kick()) return
    if (t === 'deleteContentBackward') {
      if (this.app.key?.(this, { key: 'Backspace', ctrl: false, alt: false, shift: false })) return
      const P = this.prompt
      if (P.cur > 0) {
        P.buf = P.buf.slice(0, P.cur - 1) + P.buf.slice(P.cur)
        P.cur--
      }
      return
    }
    if (t === 'insertLineBreak' || t === 'insertParagraph') {
      if (this.app.key?.(this, { key: 'Enter', ctrl: false, alt: false, shift: false })) return
      this.exec(this.prompt.buf)
      return
    }
    if (!data) return
    for (const ch of data) {
      if (ch === '\n') {
        this.exec(this.prompt.buf)
        continue
      }
      if (this.app.textInput?.(this, ch)) continue
      if (this.app.hidePrompt) continue
      const P = this.prompt
      P.buf = P.buf.slice(0, P.cur) + ch + P.buf.slice(P.cur)
      P.cur++
      this.histIdx = -1
    }
  }

  private mapPointer(e: PointerEvent | WheelEvent) {
    const rect = this.canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const k = this.curvature * this.fx
    const px = (x / rect.width) * 2 - 1
    const py = (1 - y / rect.height) * 2 - 1
    const qx = px * (1 + py * py * k * 0.85)
    const qy = py * (1 + qx * qx * k)
    const sx = (qx * 0.5 + 0.5) * rect.width * this.dpr
    const sy = (1 - (qy * 0.5 + 0.5)) * rect.height * this.dpr
    const p = this.ptr
    p.x = x
    p.y = y
    p.cx = Math.floor((sx - this.ox) / this.cw)
    p.cy = Math.floor((sy - this.oy) / this.ch)
    p.inside = true
  }

  /** Pointer position in main-cell units (fractional), for apps. */
  ptrCellF(): [number, number] {
    const rect = this.canvas.getBoundingClientRect()
    const k = this.curvature * this.fx
    const px = (this.ptr.x / rect.width) * 2 - 1
    const py = (1 - this.ptr.y / rect.height) * 2 - 1
    const qx = px * (1 + py * py * k * 0.85)
    const qy = py * (1 + qx * qx * k)
    const sx = (qx * 0.5 + 0.5) * rect.width * this.dpr
    const sy = (1 - (qy * 0.5 + 0.5)) * rect.height * this.dpr
    return [(sx - this.ox) / this.cw, (sy - this.oy) / this.ch]
  }

  private onPointer(e: PointerEvent, type: 'down' | 'move' | 'up') {
    const p = this.ptr
    this.mapPointer(e)
    const dx = p.x - p.lx
    const dy = p.y - p.ly
    p.lx = p.x
    p.ly = p.y
    const info: PointerInfo = { type, cx: p.cx, cy: p.cy, x: p.x, y: p.y, dx, dy }
    if (type === 'down') {
      if (e.button !== 0 && e.pointerType === 'mouse') return
      this.focusInput()
      if (this.kick()) {
        e.preventDefault()
        return
      }
      p.down = true
      p.moved = false
      p.sx = p.x
      p.sy = p.y
      p.captured = !!this.app.pointer?.(this, info)
      if (p.captured) this.canvas.setPointerCapture(e.pointerId)
      e.preventDefault()
    } else if (type === 'move') {
      if (p.down && Math.hypot(p.x - p.sx, p.y - p.sy) > 5) p.moved = true
      this.app.pointer?.(this, info)
    } else {
      if (!p.down) return
      p.down = false
      if (p.captured) {
        this.app.pointer?.(this, info)
        p.captured = false
        try {
          this.canvas.releasePointerCapture(e.pointerId)
        } catch {
          /* ignore */
        }
      }
      if (!p.moved) {
        const id = p.cx >= 0 && p.cy >= 0 && p.cx < this.main.cols && p.cy < this.main.rows ? this.main.link[p.cy * this.main.cols + p.cx] : 0
        const fn = id ? this.links[id - 1] : undefined
        if (fn) fn()
      }
      if (e.pointerType !== 'mouse') p.inside = false
    }
  }

  private wheelAcc = 0
  private onWheel(e: WheelEvent) {
    e.preventDefault()
    if (this.booting || this.matrix) return
    this.wheelAcc += e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY
    const step = 28
    while (Math.abs(this.wheelAcc) >= step) {
      const d = Math.sign(this.wheelAcc)
      this.app.wheel?.(this, d)
      this.wheelAcc -= d * step
    }
  }
}

export { B_BRIGHT, B_DIM, B_MID, B_NORM }
