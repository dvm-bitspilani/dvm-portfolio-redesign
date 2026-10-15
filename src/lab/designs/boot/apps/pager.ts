import { drawRows, layoutDoc, type Block, type Laid } from '../engine/doc'
import type { App, Engine, KeyEv, Rect, RouteId } from '../engine/engine'
import { B_BRIGHT, B_DIM, B_MID, F_INV } from '../engine/grid'
import { clamp } from './util'

/** A `less`-style pager over a rich document. */
export abstract class Pager implements App {
  abstract readonly id: RouteId
  protected scroll = 0
  protected laid: Laid = { rows: [], anchors: new Map() }
  private key_ = ''
  private pendingAnchor: string | null = null
  private pageH = 10

  /** Document blocks for a given content width. */
  protected abstract blocks(e: Engine, width: number): Block[]
  protected abstract docKey(): string
  /** left / centre / right header strings */
  protected abstract heading(): [string, string, string]
  protected abstract statusName(): string
  protected back(e: Engine) {
    e.go('')
  }

  jump(anchor: string) {
    this.pendingAnchor = anchor
  }

  key(e: Engine, k: KeyEv) {
    const empty = !e.prompt.buf
    const max = Math.max(0, this.laid.rows.length - this.pageH)
    switch (k.key) {
      case 'ArrowDown':
        this.scroll = Math.min(max, this.scroll + 1)
        return true
      case 'ArrowUp':
        this.scroll = Math.max(0, this.scroll - 1)
        return true
      case 'PageDown':
        this.scroll = Math.min(max, this.scroll + this.pageH - 2)
        return true
      case 'PageUp':
        this.scroll = Math.max(0, this.scroll - this.pageH + 2)
        return true
      case ' ':
        if (!empty) return false
        this.scroll = Math.min(max, this.scroll + this.pageH - 2)
        return true
      case 'Home':
        if (!empty) return false
        this.scroll = 0
        return true
      case 'End':
        if (!empty) return false
        this.scroll = max
        return true
      case 'Escape':
        if (!empty) return false
        this.back(e)
        return true
    }
    return false
  }

  textInput(e: Engine, ch: string) {
    // space pages down like less, when you're not typing a command
    if (ch === ' ' && !e.prompt.buf) {
      this.scroll = Math.min(Math.max(0, this.laid.rows.length - this.pageH), this.scroll + this.pageH - 2)
      return true
    }
    return false
  }

  wheel(_e: Engine, dy: number) {
    this.scroll = clamp(this.scroll + dy * 2, 0, Math.max(0, this.laid.rows.length - this.pageH))
  }

  draw(e: Engine, r: Rect) {
    const g = e.main
    const [l, c, rt] = this.heading()
    g.text(r.x, r.y, l, { b: B_BRIGHT })
    if (!e.narrow) g.text(r.x + Math.floor((r.w - c.length) / 2), r.y, c, { b: B_MID })
    g.textR(r.x + r.w, r.y, rt, { b: B_BRIGHT })
    const body: Rect = { x: r.x, y: r.y + 2, w: r.w, h: r.h - 3 }
    const cw = Math.min(body.w, 100)
    const key = `${this.docKey()}|${cw}|${e.cw}|${e.narrow}`
    if (key !== this.key_) {
      this.key_ = key
      this.laid = layoutDoc(this.blocks(e, cw), cw)
    }
    this.pageH = body.h
    if (this.pendingAnchor) {
      const a = this.laid.anchors.get(this.pendingAnchor)
      if (a !== undefined) this.scroll = a
      this.pendingAnchor = null
    }
    const total = this.laid.rows.length
    this.scroll = clamp(this.scroll, 0, Math.max(0, total - body.h))
    const ox = body.x + Math.max(0, Math.floor((body.w - cw) / 2))
    drawRows(e, this.laid.rows, { x: ox, y: body.y, w: cw, h: body.h }, this.scroll)
    // less status line
    const y = r.y + r.h - 1
    const end = this.scroll + body.h >= total
    const pct = total ? Math.round((Math.min(total, this.scroll + body.h) / total) * 100) : 100
    const status = ` ${this.statusName()} line ${this.scroll + 1}/${total} ${end ? '(END)' : `${pct}%`} `
    g.text(r.x, y, status, { b: B_MID, f: F_INV })
    if (!e.narrow) g.textR(r.x + r.w, y, 'space/pgdn ↓  ↑ scroll  esc back', { b: B_DIM })
    // scrollbar
    if (total > body.h) {
      const th = Math.max(1, Math.round((body.h * body.h) / total))
      const maxS = total - body.h
      const ty = body.y + Math.round(((body.h - th) * this.scroll) / maxS)
      g.vline(r.x + r.w - 1, body.y, body.h, '│', { b: 40 })
      g.vline(r.x + r.w - 1, ty, th, '█', { b: 110 })
    }
  }
}
