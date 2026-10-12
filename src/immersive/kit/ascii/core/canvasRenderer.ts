import type { Atlas } from './glyphs'
import { F_BLINK, F_HOT, F_INV, type Grid } from './grid'
import { rgbCss, type RGB } from './theme'
import type { AsciiRenderer, AtlasSet, FrameParams, Layout } from './types'

function hash(a: number, b: number) {
  const h = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453
  return h - Math.floor(h)
}

/**
 * Flat "terminal print" renderer on a 2D canvas: tinted glyph atlases blitted per cell.
 * No WebGL context (so any number can live on a page), no CRT post — just crisp type.
 */
export class Canvas2DRenderer implements AsciiRenderer {
  readonly kind = '2d' as const
  private ctx: CanvasRenderingContext2D
  private atlases: AtlasSet | null = null
  private tints = new Map<string, HTMLCanvasElement>()
  private w = 1
  private h = 1

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!
  }

  setAtlases(a: AtlasSet) {
    this.atlases = a
    this.tints.clear()
  }

  setSize(cssW: number, cssH: number, dpr: number) {
    this.w = Math.max(1, Math.round(cssW * dpr))
    this.h = Math.max(1, Math.round(cssH * dpr))
    if (this.canvas.width !== this.w) this.canvas.width = this.w
    if (this.canvas.height !== this.h) this.canvas.height = this.h
  }

  private tint(atlas: Atlas, which: string, c: RGB): HTMLCanvasElement {
    const key = `${which}|${c[0]},${c[1]},${c[2]}`
    let t = this.tints.get(key)
    if (!t) {
      if (this.tints.size > 12) this.tints.clear()
      t = document.createElement('canvas')
      t.width = atlas.canvas.width
      t.height = atlas.canvas.height
      const x = t.getContext('2d')!
      x.drawImage(atlas.canvas, 0, 0)
      x.globalCompositeOperation = 'source-in'
      x.fillStyle = rgbCss(c)
      x.fillRect(0, 0, t.width, t.height)
      this.tints.set(key, t)
    }
    return t
  }

  private drawGrid(g: Grid, atlas: Atlas, which: string, ox: number, oy: number, cw: number, ch: number, fp: FrameParams) {
    const ctx = this.ctx
    const ink = this.tint(atlas, which + 'i', fp.ink)
    const hot = this.tint(atlas, which + 'h', fp.hot)
    const inv = fp.bg ? this.tint(atlas, which + 'b', fp.bg) : atlas.canvas
    const cols = atlas.cols
    const tt = Math.floor(fp.time * 24)
    const inkCss = rgbCss(fp.ink)
    for (let y = 0; y < g.rows; y++) {
      let dx = ox
      if (fp.glitch > 0.001 && hash(y, tt) < fp.glitch * 0.45) dx += (hash(y + 7, tt) - 0.5) * 0.09 * fp.glitch * this.w
      const py = oy + y * ch
      for (let x = 0; x < g.cols; x++) {
        const i = y * g.cols + x
        const gl = g.glyph[i]
        const f = g.flags[i]
        if (!gl && !(f & F_INV)) continue
        const a = g.bright[i] / 255
        const px = dx + x * cw
        const sx = (gl % cols) * cw
        const sy = Math.floor(gl / cols) * ch
        const blinkOff = f & F_BLINK && !fp.blinkOn
        if (f & F_INV) {
          if (blinkOff) continue
          ctx.globalAlpha = a
          ctx.fillStyle = inkCss
          ctx.fillRect(px, py, cw, ch)
          if (gl) {
            ctx.globalAlpha = 1
            if (!fp.bg) ctx.globalCompositeOperation = 'destination-out'
            ctx.drawImage(inv, sx, sy, cw, ch, px, py, cw, ch)
            ctx.globalCompositeOperation = 'source-over'
          }
          continue
        }
        if (blinkOff) continue
        ctx.globalAlpha = a
        ctx.drawImage(ink, sx, sy, cw, ch, px, py, cw, ch)
        let h = Math.max(0, a - 0.8) * 1.6
        if (f & F_HOT) h = Math.max(h, 0.55 * a)
        if (h > 0.02) {
          ctx.globalAlpha = Math.min(1, h)
          ctx.drawImage(hot, sx, sy, cw, ch, px, py, cw, ch)
        }
      }
    }
  }

  render(main: Grid | null, art: Grid, layout: Layout, fp: FrameParams) {
    const ctx = this.ctx
    const a = this.atlases
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
    if (fp.bg) {
      ctx.fillStyle = rgbCss(fp.bg)
      ctx.fillRect(0, 0, this.w, this.h)
    } else ctx.clearRect(0, 0, this.w, this.h)
    if (!a) return
    const px = Math.max(0.0005, fp.powerX)
    const py = Math.max(0.0005, fp.powerY)
    if (px < 1 || py < 1) ctx.setTransform(px, 0, 0, py, (this.w / 2) * (1 - px), (this.h / 2) * (1 - py))
    this.drawGrid(art, a.art, 'a', layout.ox, layout.oy, layout.fcw, layout.fch, fp)
    if (main) this.drawGrid(main, a.main, 'm', layout.ox, layout.oy, layout.cw, layout.ch, fp)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = 1
  }

  dispose() {
    this.tints.clear()
    this.atlases = null
    this.canvas.width = 1
    this.canvas.height = 1
  }
}
