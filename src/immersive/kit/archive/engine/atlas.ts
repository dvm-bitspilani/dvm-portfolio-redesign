import * as THREE from 'three'
import type { WallItem } from '../model'
import { FONT_DISPLAY, FONT_MONO, loadCanvasFonts } from './textures'

const PAGE = 2048
const PAD = 4

export interface Slot {
  page: number
  /** uv rect (u0, v0, u1, v1) of the inner (unpadded) area, v measured from the top. */
  uv: [number, number, number, number]
  px: { x: number; y: number; w: number; h: number }
}

interface Page {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  tex: THREE.CanvasTexture
  dirty: boolean
  last: number
}

export interface AtlasTheme {
  accent: string
  accentInk: string
  plate: string
  ink: string
  muted: string
}

/**
 * Every tile's image lives in a slot of a few 2048² canvas pages (shelf-packed),
 * streamed in nearest-first and uploaded at most one page per 160 ms.
 */
export class Atlas {
  pages: Page[] = []
  slots: Slot[] = []
  loaded: Float32Array
  loadedAt: Float64Array
  readonly cell: number
  private queue: number[] = []
  private started = new Set<number>()
  private inflight = 0
  private disposed = false
  private remaining: number
  private items: WallItem[]
  private onLoad: (i: number) => void
  private theme: AtlasTheme
  fontsReady: Promise<void>

  constructor(items: WallItem[], opts: { maxAniso: number; cell: number; maxPages: number; theme: AtlasTheme }, onLoad: (i: number) => void) {
    this.items = items
    this.onLoad = onLoad
    this.theme = opts.theme
    this.loaded = new Float32Array(items.length)
    this.loadedAt = new Float64Array(items.length)
    this.remaining = items.length

    // Shrink texels-per-cell until the estimated packing fits the sampler budget.
    let cell = opts.cell
    const sizesFor = (c: number) =>
      items.map((it) => {
        let w = it.w * c, h = it.h * c
        const s = Math.min(1, (c * 4) / Math.max(w, h))
        w = Math.max(8, Math.round(w * s))
        h = Math.max(8, Math.round(h * s))
        return { w, h }
      })
    let sizes = sizesFor(cell)
    const est = (sz: { w: number; h: number }[]) => sz.reduce((s, z) => s + (z.w + PAD * 2) * (z.h + PAD * 2), 0) / (PAGE * PAGE * 0.86)
    while (est(sizes) > opts.maxPages && cell > 40) {
      cell = Math.floor(cell * 0.9)
      sizes = sizesFor(cell)
    }
    this.cell = cell

    const order = items.map((_, i) => i).sort((a, b) => sizes[b].h - sizes[a].h || sizes[b].w - sizes[a].w)
    let page = 0, x = 0, y = 0, shelf = 0
    const used: number[] = [0]
    const placed: { page: number; x: number; y: number; w: number; h: number }[] = []
    for (const i of order) {
      const { w, h } = sizes[i]
      const fw = w + PAD * 2, fh = h + PAD * 2
      if (x + fw > PAGE) {
        x = 0
        y += shelf
        shelf = 0
      }
      if (y + fh > PAGE) {
        page++
        x = y = shelf = 0
        used.push(0)
      }
      placed[i] = { page: Math.min(page, opts.maxPages - 1), x: x + PAD, y: y + PAD, w, h }
      x += fw
      shelf = Math.max(shelf, fh)
      used[page] = Math.max(used[page], y + fh)
    }
    if (used.length > opts.maxPages) console.warn('[archive] too many tiles for the atlas; some will overlap')
    used.slice(0, opts.maxPages).forEach((u, pi, arr) => {
      const height = pi === arr.length - 1 ? Math.min(PAGE, Math.max(128, Math.ceil(u / 128) * 128)) : PAGE
      const canvas = document.createElement('canvas')
      canvas.width = PAGE
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = this.theme.plate
      ctx.fillRect(0, 0, PAGE, height)
      const tex = new THREE.CanvasTexture(canvas)
      tex.colorSpace = THREE.NoColorSpace
      tex.generateMipmaps = true
      tex.minFilter = THREE.LinearMipmapLinearFilter
      tex.magFilter = THREE.LinearFilter
      tex.anisotropy = Math.min(8, opts.maxAniso)
      tex.flipY = false
      this.pages.push({ canvas, ctx, tex, dirty: true, last: 0 })
    })
    placed.forEach((p, i) => {
      const ph = this.pages[p.page].canvas.height
      this.slots[i] = {
        page: p.page,
        px: { x: p.x, y: p.y, w: p.w, h: p.h },
        uv: [(p.x + 0.5) / PAGE, (p.y + 0.5) / ph, (p.x + p.w - 0.5) / PAGE, (p.y + p.h - 0.5) / ph],
      }
    })

    this.fontsReady = loadCanvasFonts()
    void this.fontsReady.then(() => {
      if (this.disposed) return
      items.forEach((it, i) => {
        if (it.text && !it.img) this.drawText(i)
      })
    })
  }

  get textures() {
    return this.pages.map((p) => p.tex)
  }

  /** Queue every image, nearest to `dist` first. Call again to re-prioritise. */
  prioritise(dist: (i: number) => number) {
    const pending: number[] = []
    for (let i = 0; i < this.items.length; i++) if (this.items[i].img && this.loaded[i] === 0 && !this.started.has(i)) pending.push(i)
    pending.sort((a, b) => dist(a) - dist(b))
    this.queue = pending
    this.pump()
  }

  private pump() {
    while (!this.disposed && this.inflight < 6 && this.queue.length) {
      const i = this.queue.shift()!
      if (this.started.has(i)) continue
      this.started.add(i)
      this.inflight++
      const img = new Image()
      img.decoding = 'async'
      img.src = this.items[i].img!
      img
        .decode()
        .then(() => {
          if (!this.disposed) this.drawImage(i, img)
        })
        .catch(() => {
          // Missing image: fall back to a typeset tile.
          if (this.disposed) return
          const it = this.items[i]
          it.text ??= { title: it.item.title, sub: it.item.line ?? '', tone: 'ink' }
          this.drawText(i)
        })
        .finally(() => {
          this.inflight--
          this.pump()
        })
    }
  }

  private finish(i: number) {
    this.loadedAt[i] = performance.now()
    if (!this.loaded[i]) this.remaining--
    this.loaded[i] = 1
    this.onLoad(i)
  }

  private drawImage(i: number, img: HTMLImageElement) {
    const s = this.slots[i]
    const p = this.pages[s.page]
    const ctx = p.ctx
    const it = this.items[i]
    const iw = img.naturalWidth, ih = img.naturalHeight
    const ta = s.px.w / s.px.h, ia = iw / ih
    let sx = 0, sy = 0, sw = iw, sh = ih
    if (ia > ta) {
      sw = ih * ta
      sx = (iw - sw) / 2
    } else {
      sh = iw / ta
      sy = (ih - sh) * it.cropY
    }
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    if (it.kind === 'mockup') {
      // Mockups are transparent renders: sit them on a lit navy plate.
      const g = ctx.createRadialGradient(s.px.x + s.px.w / 2, s.px.y + s.px.h * 0.45, 10, s.px.x + s.px.w / 2, s.px.y + s.px.h / 2, s.px.w * 0.7)
      g.addColorStop(0, '#16263a')
      g.addColorStop(1, '#0a111d')
      ctx.fillStyle = g
      ctx.fillRect(s.px.x - PAD, s.px.y - PAD, s.px.w + PAD * 2, s.px.h + PAD * 2)
      const m = 0.08
      const k = Math.min((s.px.w * (1 - m * 2)) / iw, (s.px.h * (1 - m * 2)) / ih)
      const dw = iw * k, dh = ih * k
      ctx.drawImage(img, s.px.x + (s.px.w - dw) / 2, s.px.y + (s.px.h - dh) / 2, dw, dh)
    } else {
      // Draw into the padded area so mip levels bleed the image's own edge colour.
      const kx = s.px.w / sw, ky = s.px.h / sh
      ctx.drawImage(img, sx - PAD / kx, sy - PAD / ky, sw + (PAD * 2) / kx, sh + (PAD * 2) / ky,
        s.px.x - PAD, s.px.y - PAD, s.px.w + PAD * 2, s.px.h + PAD * 2)
    }
    p.dirty = true
    this.finish(i)
  }

  private drawText(i: number) {
    const it = this.items[i]
    const s = this.slots[i]
    const p = this.pages[s.page]
    if (!it.text || p.canvas.width <= 1) return
    const ctx = p.ctx
    const t = it.text
    const { x, y, w, h } = s.px
    const th = this.theme
    const accent = t.tone === 'accent'
    ctx.save()
    ctx.fillStyle = accent ? th.accent : th.plate
    ctx.fillRect(x - PAD, y - PAD, w + PAD * 2, h + PAD * 2)
    const u = Math.min(h, w * 0.75) / 256 // 1 = a 256px-tall slot
    const left = x + 22 * u
    ctx.fillStyle = accent ? th.accentInk : th.ink
    ctx.textBaseline = 'alphabetic'
    // Wide display face: shrink until the longest word fits.
    let fs = 30 * u
    ctx.font = `400 ${fs}px ${FONT_DISPLAY}`
    const words = t.title.toUpperCase().split(/\s+/)
    const maxWord = Math.max(...words.map((wd) => ctx.measureText(wd).width))
    if (maxWord > w - 44 * u) {
      fs *= (w - 44 * u) / maxWord
      ctx.font = `400 ${fs}px ${FONT_DISPLAY}`
    }
    const lines: string[] = []
    let cur = ''
    for (const wd of words) {
      const test = cur ? `${cur} ${wd}` : wd
      if (ctx.measureText(test).width > w - 44 * u && cur) {
        lines.push(cur)
        cur = wd
      } else cur = test
    }
    lines.push(cur)
    const lh = fs * 1.25
    lines.slice(0, 4).forEach((l, k) => ctx.fillText(l, left, y + 40 * u + fs + k * lh))
    ctx.font = `400 ${Math.round(17 * u)}px ${FONT_MONO}`
    ctx.fillStyle = accent ? th.accentInk : th.muted
    ctx.fillText(t.sub, left, y + h - 24 * u)
    if (!accent) {
      // Honest about why the tile is typeset: the archive has no image for it.
      ctx.font = `400 ${Math.round(13 * u)}px ${FONT_MONO}`
      ctx.globalAlpha = 0.7
      ctx.textAlign = 'right'
      ctx.fillText('no image on record', x + w - 18 * u, y + 28 * u)
      ctx.globalAlpha = 1
      ctx.textAlign = 'left'
      ctx.strokeStyle = 'rgba(207,232,255,0.16)'
      ctx.lineWidth = 2 * u
      ctx.strokeRect(x + u, y + u, w - 2 * u, h - 2 * u)
    } else {
      // Arrow out of the tile.
      ctx.strokeStyle = th.accentInk
      ctx.lineWidth = 3 * u
      const ax = x + w - 34 * u, ay = y + 30 * u
      ctx.beginPath()
      ctx.moveTo(ax - 14 * u, ay + 14 * u)
      ctx.lineTo(ax + 6 * u, ay - 6 * u)
      ctx.moveTo(ax - 8 * u, ay - 6 * u)
      ctx.lineTo(ax + 6 * u, ay - 6 * u)
      ctx.lineTo(ax + 6 * u, ay + 8 * u)
      ctx.stroke()
    }
    ctx.restore()
    p.dirty = true
    this.finish(i)
  }

  /** Re-tint typeset tiles (theme change). Only possible while the CPU canvases are alive. */
  setTheme(theme: AtlasTheme) {
    this.theme = theme
    this.items.forEach((it, i) => {
      if (it.text && !it.img) this.drawText(i)
    })
  }

  /** Upload at most one dirty page per call, each page at most every 160ms. */
  upload(now: number) {
    for (const p of this.pages) {
      if (p.dirty && now - p.last > 160) {
        p.dirty = false
        p.last = now
        p.tex.needsUpdate = true
        return true
      }
    }
    return false
  }

  get done() {
    return this.remaining <= 0
  }

  get loadedCount() {
    return this.items.length - this.remaining
  }

  /** After everything is uploaded, release the CPU-side canvases (~16 MB each). */
  releaseCanvases() {
    for (const p of this.pages) if (p.dirty) return false
    for (const p of this.pages) p.canvas.width = p.canvas.height = 1
    return true
  }

  dispose() {
    this.disposed = true
    this.queue = []
    for (const p of this.pages) {
      p.tex.dispose()
      p.canvas.width = p.canvas.height = 1
    }
  }
}
