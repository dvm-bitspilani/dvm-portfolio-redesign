import type { App, Engine, KeyEv, PointerInfo, Rect } from '../engine/engine'
import { gi } from '../engine/glyphs'
import { B_BRIGHT, B_DIM, B_MID, B_NORM, F_HOT, F_INV, wrapLine, type LaidChar } from '../engine/grid'
import { LogoRaster } from '../engine/logo3d'

const SCRAMBLE = Array.from('#%&$@*+=<>/\\|?!;:').map(gi)

function hash(i: number) {
  const h = Math.sin(i * 127.1 + 311.7) * 43758.5453
  return h - Math.floor(h)
}

export class HomeApp implements App {
  readonly id = 'home' as const
  private logo: LogoRaster | null = null
  private yaw = -0.5
  private pitch = 0.1
  private yawVel = 0
  private pitchVel = 0
  private auto = 0
  private dragging = false
  private introT = 0
  private acc = 1
  private cells = { cols: 0, rows: 0, glyph: new Uint8Array(0), tone: new Uint8Array(0) }
  private lit = 0
  private scrollUp = 0
  private lastVersion = -1
  private wrapCache: { key: string; rows: LaidChar[][] } = { key: '', rows: [] }
  private logoRect: Rect = { x: 0, y: 0, w: 0, h: 0 }
  private kick = 0
  private needs = true

  onBoot() {
    this.introT = 0
  }

  cwd() {
    return '~'
  }

  chips(e: Engine) {
    if (e.shell.xo) return ['xo', 'clear', 'help', 'ls projects', 'cat journal']
    return e.shell.defaultChips()
  }

  key(e: Engine, k: KeyEv) {
    if (k.key === 'Escape' && e.shell.xo) {
      e.shell.quitXO()
      return true
    }
    return false
  }

  textInput(e: Engine, ch: string) {
    if (e.shell.xo && !e.prompt.buf && /[1-9]/.test(ch)) {
      e.shell.playXO(Number(ch) - 1)
      return true
    }
    return false
  }

  wheel(_e: Engine, dy: number) {
    this.scrollUp = Math.max(0, this.scrollUp - dy * 3)
  }

  pointer(e: Engine, p: PointerInfo) {
    const r = this.logoRect
    const inLogo = p.cx >= r.x && p.cx < r.x + r.w && p.cy >= r.y && p.cy < r.y + r.h
    if (p.type === 'down') {
      if (!inLogo) return false
      this.dragging = true
      this.yawVel = 0
      this.pitchVel = 0
      return true
    }
    if (p.type === 'move' && inLogo) this.needs = true
    if (p.type === 'move' && this.dragging) {
      const k = 0.0105 * (e.coarse ? 1.4 : 1)
      this.yaw += p.dx * k
      this.pitch = Math.max(-0.75, Math.min(0.75, this.pitch + p.dy * k * 0.6))
      this.yawVel = this.yawVel * 0.5 + p.dx * k * 60 * 0.5
      this.pitchVel = this.pitchVel * 0.5 + p.dy * k * 36 * 0.5
      return true
    }
    if (p.type === 'up' && this.dragging) {
      this.dragging = false
      return true
    }
    return false
  }

  draw(e: Engine, r: Rect, dt: number) {
    if (!e.kickLogo) e.kickLogo = (v) => (this.kick = v)
    this.introT += dt
    const narrow = e.narrow
    let shellR: Rect
    if (narrow) {
      const lh = Math.max(8, Math.floor(r.h * 0.44))
      this.logoRect = { x: r.x, y: r.y, w: r.w, h: lh }
      shellR = { x: r.x, y: r.y + lh + 1, w: r.w, h: r.h - lh - 1 }
    } else {
      const lw = Math.min(76, Math.max(46, Math.floor(r.w * 0.47)))
      this.logoRect = { x: r.x + lw + 2, y: r.y, w: r.w - lw - 2, h: r.h }
      shellR = { x: r.x, y: r.y, w: lw, h: r.h }
    }
    this.drawLogo(e, dt)
    this.drawShell(e, shellR)
  }

  /* ---------------- logo ---------------- */

  private drawLogo(e: Engine, dt: number) {
    const r = this.logoRect
    const fx0 = e.toFineX(r.x)
    const fy0 = e.toFineY(r.y)
    const fcols = e.toFineX(r.x + r.w) - fx0
    const frows = e.toFineY(r.y + r.h - 1) - fy0
    if (fcols < 4 || frows < 4) return
    if (!this.logo) this.logo = new LogoRaster()
    const L = this.logo
    const sx = e.imgSX
    const sy = e.imgSY
    L.resize(fcols * sx, frows * sy, e.fch / sy / (e.fcw / sx))
    if (this.cells.cols !== fcols || this.cells.rows !== frows) {
      this.cells = { cols: fcols, rows: frows, glyph: new Uint8Array(fcols * frows), tone: new Uint8Array(fcols * frows) }
      this.acc = 1
      this.needs = true
    }

    // pointer → canvas cursor + light
    const [pcx, pcy] = e.ptrCellF()
    const inside = e.ptr.inside && pcx >= r.x && pcx < r.x + r.w && pcy >= r.y && pcy < r.y + r.h
    e.canvas.dataset.grab = inside ? '1' : '0'

    // motion
    if (!this.dragging) {
      this.yaw += this.yawVel * dt
      this.pitch += this.pitchVel * dt
      const damp = Math.exp(-dt * 2.4)
      this.yawVel *= damp
      this.pitchVel *= damp
      const idle = Math.abs(this.yawVel) < 0.25
      const targetAuto = e.reduced ? 0 : idle ? 0.32 : 0
      this.auto += (targetAuto - this.auto) * (1 - Math.exp(-dt * 1.2))
      this.yaw += this.auto * dt
      if (this.kick > 0) {
        this.yawVel += this.kick
        this.kick = 0
      }
      const restPitch = 0.1 + (e.reduced ? 0 : 0.07 * Math.sin(e.time * 0.45))
      if (Math.abs(this.pitchVel) < 0.3) this.pitch += (restPitch - this.pitch) * (1 - Math.exp(-dt * 1.5))
      this.pitch = Math.max(-0.8, Math.min(0.8, this.pitch))
    }

    const intro = e.reduced ? 1 : Math.min(1, this.introT / 1.7)
    this.acc += dt
    const hz = e.reduced ? 1000 : 1 / 30
    if (this.acc >= hz || this.dragging || this.needs) {
      this.acc = 0
      this.needs = false
      const lumos = e.lumos
      const lx = ((pcx * e.cw) / e.fcw - fx0) * sx
      const ly = ((pcy * e.ch) / e.fch - fy0) * sy
      const li = e.ptr.inside ? (inside ? 0.9 : 0.35) + lumos * 3.2 : 0
      L.render({
        yaw: this.yaw,
        pitch: this.pitch,
        roll: 0,
        lx,
        ly,
        li,
        key: 1 - lumos * 0.82,
        gain: 1.08 + (e.reduced ? 0 : 0.04 * Math.sin(e.time * 2.1)),
        sweep: intro < 1 ? 1.15 - intro * 1.3 : -1,
      })
      // cursor proximity: raise density inside a soft radius
      if (e.ptr.inside) this.boost(L, lx, ly, (inside ? 0.55 : 0.25) + lumos * 0.4, L.h * 0.22)
      const cells = this.cells
      e.sampler.load(L.lum, L.w, L.h)
      let lit = 0
      e.sampler.run(
        fcols,
        frows,
        sx,
        sy,
        e.matcher,
        (x, y, g, t) => {
          const k = y * fcols + x
          cells.glyph[k] = g
          cells.tone[k] = t
          if (g) lit++
        },
        { edge: 2.4, contrast: 1.5, gain: 0.95, flat: 0.1 },
      )
      this.lit = lit
    }

    // blit with intro decode
    const f = e.fine
    const cells = this.cells
    const tq = Math.floor(e.time * 20)
    for (let y = 0; y < frows; y++) {
      for (let x = 0; x < fcols; x++) {
        const k = y * fcols + x
        const g = cells.glyph[k]
        if (!g) continue
        const tone = cells.tone[k]
        let b = 70 + tone * 0.78
        let flags = tone > 215 ? F_HOT : 0
        let glyph = g
        if (intro < 1) {
          const th = hash(k)
          if (intro * 1.25 < th) continue
          if (intro * 1.25 < th + 0.22) {
            glyph = SCRAMBLE[(k * 7 + tq) % SCRAMBLE.length]
            b = 230
            flags = F_HOT
          }
        }
        f.set(fx0 + x, fy0 + y, glyph, Math.min(255, b), flags)
      }
    }

    // probe field around the cursor in empty space
    if (inside && !e.reduced) {
      const pfx = (pcx * e.cw) / e.fcw
      const pfy = (pcy * e.ch) / e.fch
      const R = 9
      for (let y = Math.floor(pfy - R); y <= pfy + R; y++)
        for (let x = Math.floor(pfx - R * 2); x <= pfx + R * 2; x++) {
          if (x < fx0 || y < fy0 || x >= fx0 + fcols || y >= fy0 + frows) continue
          if (cells.glyph[(y - fy0) * fcols + (x - fx0)]) continue
          if ((x + y * 3) % 4 !== 0 || y % 2) continue
          const d = Math.hypot((x - pfx) / 2, y - pfy) / R
          if (d > 1) continue
          f.set(x, y, gi(d < 0.45 ? ':' : '.'), 140 * (1 - d))
        }
    }

    // caption
    const g = e.main
    const deg = (a: number) => String(Math.round((((a * 180) / Math.PI) % 360) + 360) % 360).padStart(3, '0')
    const cap = `fig.1 dvm.mark  yaw ${deg(this.yaw)}°  pitch ${deg(this.pitch)}°  ${String(this.lit).padStart(4, ' ')} glyphs`
    const hint = e.coarse ? 'drag to spin' : inside ? 'drag to spin' : 'move here'
    const y = r.y + r.h - 1
    if (r.w > cap.length + hint.length + 4) {
      g.text(r.x + 1, y, cap, { b: 85 })
      g.textR(r.x + r.w - 1, y, `[ ${hint} ]`, { b: inside ? B_NORM : 85 })
    } else g.text(r.x + 1, y, hint, { b: 85 })
    if (e.lumos > 0.05) g.text(r.x + 1, r.y, 'lumos', { b: B_BRIGHT, f: F_HOT })
  }

  private boost(L: LogoRaster, lx: number, ly: number, amount: number, radius: number) {
    const w = L.w
    const h = L.h
    const ax = L.aspect
    const rx = radius * ax
    const x0 = Math.max(0, Math.floor(lx - rx))
    const x1 = Math.min(w - 1, Math.ceil(lx + rx))
    const y0 = Math.max(0, Math.floor(ly - radius))
    const y1 = Math.min(h - 1, Math.ceil(ly + radius))
    const lum = L.lum
    const inv = 1 / (radius * radius)
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const i = y * w + x
        if (lum[i] <= 0) continue
        const dx = (x - lx) / ax
        const dy = y - ly
        const d2 = (dx * dx + dy * dy) * inv
        if (d2 >= 1) continue
        lum[i] *= 1 + amount * (1 - d2) * (1 - d2)
      }
  }

  /* ---------------- shell ---------------- */

  private drawShell(e: Engine, r: Rect) {
    const sh = e.shell
    const g = e.main
    let area = r
    if (sh.xo) {
      const bh = 13
      area = { x: r.x, y: r.y, w: r.w, h: Math.max(3, r.h - bh - 1) }
      this.drawXO(e, { x: r.x, y: r.y + r.h - bh, w: r.w, h: bh })
    }
    if (sh.version !== this.lastVersion) {
      this.lastVersion = sh.version
      this.scrollUp = 0
    }
    const key = `${sh.version}|${area.w}`
    if (this.wrapCache.key !== key) {
      const rows: LaidChar[][] = []
      for (const l of sh.lines) {
        if (l.nowrap) {
          const chars: LaidChar[] = []
          for (const s of l.segs) for (const ch of s.t) chars.push({ ch, seg: s })
          rows.push(chars.slice(0, area.w))
        } else rows.push(...wrapLine(l.segs, area.w))
      }
      this.wrapCache = { key, rows }
    }
    const rows = this.wrapCache.rows
    const maxUp = Math.max(0, rows.length - area.h)
    this.scrollUp = Math.min(this.scrollUp, maxUp)
    const start = Math.max(0, rows.length - area.h - this.scrollUp)
    g.clip(area.x, area.y, area.x + area.w, area.y + area.h)
    for (let j = 0; j < area.h; j++) {
      const row = rows[start + j]
      if (!row) break
      let x = area.x
      for (const c of row) {
        const s = c.seg
        const link = s.cmd || s.href || s.to !== undefined ? e.segLink(s) : 0
        g.put(x, area.y + j, c.ch, { b: s.b ?? B_NORM, f: s.f, link })
        x++
      }
    }
    g.noClip()
    // scroll indicator
    if (maxUp > 0) {
      const x = area.x + area.w
      g.vline(x, area.y, area.h, '│', { b: 40 })
      const th = Math.max(1, Math.round((area.h * area.h) / rows.length))
      const ty = area.y + Math.round(((area.h - th) * (maxUp - this.scrollUp)) / maxUp)
      g.vline(x, ty, th, '█', { b: 110 })
      if (this.scrollUp > 0) g.textR(area.x + area.w, area.y + area.h - 1, ` ${this.scrollUp} lines below `, { b: B_DIM, f: F_INV })
    }
  }

  private drawXO(e: Engine, r: Rect) {
    const sh = e.shell
    const xo = sh.xo!
    const g = e.main
    const ox = r.x
    const oy = r.y
    const X = ['  \\ /  ', '   X   ', '  / \\  ']
    const O = ['  .-.  ', ' (   ) ', "  '-'  "]
    const st = { b: B_DIM }
    // grid lines
    for (let j = 0; j <= 3; j++) {
      const y = oy + j * 4
      for (let i = 0; i < 25; i++) {
        const isJ = i % 8 === 0
        let ch = '─'
        if (isJ) ch = j === 0 ? (i === 0 ? '┌' : i === 24 ? '┐' : '┬') : j === 3 ? (i === 0 ? '└' : i === 24 ? '┘' : '┴') : i === 0 ? '├' : i === 24 ? '┤' : '┼'
        g.put(ox + i, y, ch, st)
      }
    }
    for (let j = 0; j < 3; j++)
      for (let k = 0; k < 3; k++) for (let i = 0; i <= 3; i++) g.put(ox + i * 8, oy + j * 4 + 1 + k, '│', st)
    for (let c = 0; c < 9; c++) {
      const cx = ox + (c % 3) * 8 + 1
      const cy = oy + Math.floor(c / 3) * 4 + 1
      const v = xo.board[c]
      const win = xo.winLine?.includes(c)
      const link = !v && !xo.over ? e.link(() => sh.playXO(c)) : 0
      const art = v === 'X' ? X : v === 'O' ? O : null
      for (let k = 0; k < 3; k++) {
        if (art) g.text(cx, cy + k, art[k], { b: win ? 255 : xo.over ? B_MID : B_BRIGHT, f: win ? F_HOT : 0, link })
        else g.text(cx, cy + k, k === 1 ? `   ${c + 1}   ` : '       ', { b: 70, link })
      }
    }
    // status
    const sx = ox + 28
    if (r.w > 44) {
      let msg = 'your move (X)'
      if (xo.over === 'X') msg = 'you win'
      else if (xo.over === 'O') msg = 'cpu wins'
      else if (xo.over === 'draw') msg = 'draw'
      else if (xo.turn === 'O') msg = 'cpu thinking' + '.'.repeat(1 + (Math.floor(e.time * 4) % 3))
      g.text(sx, oy + 1, 'XO', { b: B_BRIGHT })
      g.text(sx, oy + 3, msg, { b: B_NORM })
      const s = sh.xoScore
      g.text(sx, oy + 5, `you  ${s.you}`, { b: B_MID })
      g.text(sx, oy + 6, `cpu  ${s.cpu}`, { b: B_MID })
      g.text(sx, oy + 7, `draw ${s.draw}`, { b: B_MID })
      const again = e.link(() => e.exec('xo'))
      const quit = e.link(() => sh.quitXO())
      g.text(sx, oy + 9, '[ new game ]', { b: B_NORM, link: again })
      g.text(sx, oy + 10, '[ quit esc ]', { b: B_DIM, link: quit })
    }
  }
}
