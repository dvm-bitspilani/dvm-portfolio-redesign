import * as THREE from 'three'
import type { Item } from './layout'

/** Texels per cell in the atlas (desktop): 1x1 portraits are 128px, a 3x2 cover 384x256. */
const CELL_DESKTOP = 128
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

export class Atlas {
  pages: Page[] = []
  slots: Slot[] = []
  /** 0..1 load progress per item (eased by the engine). */
  loaded: Float32Array
  loadedAt: Float64Array
  private queue: number[] = []
  private inflight = 0
  private disposed = false
  private items: Item[]
  private onLoad: (i: number) => void
  private remaining: number
  fontsReady: Promise<unknown>

  constructor(items: Item[], maxAniso: number, onLoad: (i: number) => void, compact = false) {
    // Phones get a smaller atlas (~60 MB of GPU memory instead of ~110 MB).
    const CELL = compact ? 96 : CELL_DESKTOP
    const MAX_SIDE = CELL * 4
    this.items = items
    this.onLoad = onLoad
    this.loaded = new Float32Array(items.length)
    this.loadedAt = new Float64Array(items.length)
    this.remaining = items.length

    // Shelf-pack slot rectangles, tallest first.
    const sizes = items.map((it) => {
      let w = it.w * CELL, h = it.h * CELL
      const s = Math.min(1, MAX_SIDE / Math.max(w, h))
      w = Math.round(w * s)
      h = Math.round(h * s)
      return { w, h }
    })
    const order = items.map((_, i) => i).sort((a, b) => sizes[b].h - sizes[a].h || sizes[b].w - sizes[a].w)
    // Pass 1: shelf-pack positions; pass 2: allocate canvases (the last page is trimmed to fit).
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
      placed[i] = { page, x: x + PAD, y: y + PAD, w, h }
      x += fw
      shelf = Math.max(shelf, fh)
      used[page] = Math.max(used[page], y + fh)
    }
    used.forEach((u, pi) => {
      const height = pi === used.length - 1 ? Math.min(PAGE, Math.ceil(u / 128) * 128) : PAGE
      const canvas = document.createElement('canvas')
      canvas.width = PAGE
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#1b1c20'
      ctx.fillRect(0, 0, PAGE, height)
      const tex = new THREE.CanvasTexture(canvas)
      tex.colorSpace = THREE.NoColorSpace
      tex.generateMipmaps = true
      tex.minFilter = THREE.LinearMipmapLinearFilter
      tex.magFilter = THREE.LinearFilter
      tex.anisotropy = Math.min(8, maxAniso)
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

    // Typeset tiles need the fonts.
    this.fontsReady = Promise.all([
      document.fonts.load('600 48px "Manrope Variable"'),
      document.fonts.load('400 24px "IBM Plex Mono"'),
    ]).catch(() => undefined)
    void this.fontsReady.then(() => {
      if (this.disposed) return
      items.forEach((it, i) => {
        if (it.text) this.drawText(i)
      })
    })
  }

  get textures() {
    return this.pages.map((p) => p.tex)
  }

  /** Queue every image, nearest to `dist` first. Call again to re-prioritise. */
  prioritise(dist: (i: number) => number) {
    const pending = this.items
      .map((_, i) => i)
      .filter((i) => this.items[i].img && this.loaded[i] === 0 && !this.started.has(i))
    pending.sort((a, b) => dist(a) - dist(b))
    this.queue = pending
    this.pump()
  }

  private started = new Set<number>()

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
          // Missing image: keep the placeholder but mark as resolved.
          if (!this.disposed) this.finish(i)
        })
        .finally(() => {
          this.inflight--
          this.pump()
        })
    }
  }

  private finish(i: number) {
    this.loadedAt[i] = performance.now()
    this.loaded[i] = 1
    this.remaining--
    this.onLoad(i)
  }

  private drawImage(i: number, img: HTMLImageElement) {
    const s = this.slots[i]
    const p = this.pages[s.page]
    const ctx = p.ctx
    const it = this.items[i]
    const iw = img.naturalWidth, ih = img.naturalHeight
    const ta = s.px.w / s.px.h, ia = iw / ih
    // Cover crop with a vertical anchor (screens crop from the top).
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
      // Mockups are transparent renders: sit them on a lit graphite plate.
      const g = ctx.createRadialGradient(s.px.x + s.px.w / 2, s.px.y + s.px.h * 0.45, 10, s.px.x + s.px.w / 2, s.px.y + s.px.h / 2, s.px.w * 0.7)
      g.addColorStop(0, '#2a2c33')
      g.addColorStop(1, '#17181c')
      ctx.fillStyle = g
      ctx.fillRect(s.px.x - PAD, s.px.y - PAD, s.px.w + PAD * 2, s.px.h + PAD * 2)
      // contain instead of cover, with a margin
      const m = 0.08
      const cw = s.px.w * (1 - m * 2), ch = s.px.h * (1 - m * 2)
      const k = Math.min(cw / iw, ch / ih)
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
    const ctx = p.ctx
    const t = it.text!
    const { x, y, w, h } = s.px
    const accent = t.tone === 'accent'
    ctx.fillStyle = accent ? '#4d7cff' : '#202227'
    ctx.fillRect(x - PAD, y - PAD, w + PAD * 2, h + PAD * 2)
    const u = h / 256 // scale: 1 = a 256px-tall slot
    ctx.fillStyle = accent ? '#ffffff' : '#e9eaee'
    ctx.textBaseline = 'alphabetic'
    ctx.font = `600 ${Math.round(46 * u)}px "Manrope Variable", system-ui, sans-serif`
    ctx.letterSpacing = `${-1 * u}px`
    const words = t.title.split(' ')
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
    const lh = 50 * u
    lines.forEach((l, k) => ctx.fillText(l, x + 22 * u, y + (accent ? 64 : 80) * u + k * lh))
    ctx.letterSpacing = '0px'
    ctx.font = `400 ${Math.round(19 * u)}px "IBM Plex Mono", ui-monospace, monospace`
    ctx.fillStyle = accent ? 'rgba(255,255,255,0.85)' : '#8a8f99'
    ctx.fillText(t.sub, x + 22 * u, y + h - 24 * u)
    if (!accent) {
      // Honest about why the tile is typeset: the archive has no image for it.
      ctx.font = `400 ${Math.round(15 * u)}px "IBM Plex Mono", ui-monospace, monospace`
      ctx.fillStyle = '#5d626c'
      ctx.textAlign = 'right'
      ctx.fillText('no image on record', x + w - 18 * u, y + 30 * u)
      ctx.textAlign = 'left'
      ctx.strokeStyle = '#34363d'
      ctx.lineWidth = 2 * u
      ctx.strokeRect(x + 1 * u, y + 1 * u, w - 2 * u, h - 2 * u)
    }
    if (accent) {
      // An envelope-ish corner mark: arrow out of the tile.
      ctx.strokeStyle = '#ffffff'
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
    p.dirty = true
    this.finish(i)
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

  /** After everything is uploaded, release the CPU-side canvases. */
  releaseCanvases() {
    for (const p of this.pages) {
      if (p.dirty) return false
    }
    for (const p of this.pages) {
      p.canvas.width = p.canvas.height = 1
    }
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
