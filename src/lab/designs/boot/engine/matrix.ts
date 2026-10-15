import type { Engine } from './engine'
import { gi } from './glyphs'
import { B_BRIGHT, F_HOT, F_INV } from './grid'

const CHARS = Array.from('0123456789ABCDEFGHJKLMNPQRSTUVWXYZ$+-*/=%"#&_(),.;:?!|<>[]{}^~').map(gi)
const LINES = ['Wake up, guest...', 'The Matrix has you...', 'Follow the white rabbit.', 'Knock, knock.']

export class Matrix {
  private e: Engine
  private t = 0
  private drops: Float32Array = new Float32Array(0)
  private speed: Float32Array = new Float32Array(0)
  private len: Float32Array = new Float32Array(0)
  private seed: Uint8Array = new Uint8Array(0)
  readonly duration = 11

  constructor(e: Engine) {
    this.e = e
  }

  private init(cols: number, rows: number) {
    this.drops = new Float32Array(cols)
    this.speed = new Float32Array(cols)
    this.len = new Float32Array(cols)
    this.seed = new Uint8Array(cols * rows)
    for (let i = 0; i < cols; i++) {
      this.drops[i] = -Math.random() * rows * 1.5
      this.speed[i] = 8 + Math.random() * 26
      this.len[i] = 6 + Math.random() * 22
    }
    for (let i = 0; i < this.seed.length; i++) this.seed[i] = CHARS[(Math.random() * CHARS.length) | 0]
  }

  /** Returns false once finished. */
  draw(dt: number): boolean {
    const e = this.e
    this.t += dt
    if (this.t > this.duration) return false
    const f = e.fine
    const cols = f.cols
    const rows = f.rows
    if (this.drops.length !== cols) this.init(cols, rows)
    // wipe what the app drew in both grids
    e.main.clear()
    f.clear()
    const fade = Math.min(1, this.t / 0.6) * Math.min(1, (this.duration - this.t) / 0.8)
    for (let i = 0; i < cols; i++) {
      this.drops[i] += this.speed[i] * dt
      const head = this.drops[i]
      if (head - this.len[i] > rows) {
        this.drops[i] = -Math.random() * 20
        this.speed[i] = 8 + Math.random() * 26
      }
      const L = this.len[i]
      for (let k = 0; k < L; k++) {
        const y = Math.floor(head) - k
        if (y < 0 || y >= rows) continue
        // occasionally mutate a glyph
        const si = y * cols + i
        if (Math.random() < 0.02) this.seed[si] = CHARS[(Math.random() * CHARS.length) | 0]
        const b = k === 0 ? 255 : Math.max(40, 220 * (1 - k / L))
        f.set(i, y, this.seed[si], b * fade, k === 0 ? F_HOT : 0)
      }
    }
    // the message, typed in the centre
    const g = e.main
    const cps = 18
    let budget = Math.max(0, (this.t - 0.8) * cps)
    const y0 = Math.floor(g.rows / 2) - 2
    for (let i = 0; i < LINES.length; i++) {
      const line = LINES[i]
      if (budget <= 0) break
      const n = Math.min(line.length, Math.floor(budget))
      budget -= line.length + 8
      const x = Math.floor((g.cols - line.length) / 2)
      g.fill(x - 2, y0 + i, line.length + 4, 1, ' ', { b: 0, f: F_INV })
      for (let k = 0; k < n; k++) if (line[k] !== ' ') g.put(x + k, y0 + i, line[k], { b: B_BRIGHT })
    }
    return true
  }
}
