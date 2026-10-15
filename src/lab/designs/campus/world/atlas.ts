import * as THREE from 'three'

export interface AtlasItem {
  url?: string
  /** width / height of the frame the image is cropped to */
  aspect: number
  label: string
  tint: string
}

/**
 * Packs many cover images into one CanvasTexture (one draw call for every
 * exhibit). Cells are drawn as tinted placeholders with the title first, then
 * replaced by the image as it decodes.
 */
export class Atlas {
  readonly texture: THREE.CanvasTexture
  readonly rects: Float32Array
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private items: AtlasItem[]
  private boxes: { x: number; y: number; w: number; h: number }[] = []
  private disposed = false
  private loading = false
  dirty = false

  constructor(items: AtlasItem[], cell = 256, cols = 8) {
    this.items = items
    const rows = Math.ceil(items.length / cols)
    this.canvas = document.createElement('canvas')
    this.canvas.width = cols * cell
    this.canvas.height = rows * cell
    this.ctx = this.canvas.getContext('2d')!
    this.rects = new Float32Array(items.length * 4)
    const W = this.canvas.width
    const H = this.canvas.height
    const pad = 6
    items.forEach((it, i) => {
      const cx = (i % cols) * cell
      const cy = Math.floor(i / cols) * cell
      let w = cell - pad * 2
      let h = w / it.aspect
      if (h > cell - pad * 2) {
        h = cell - pad * 2
        w = h * it.aspect
      }
      const x = cx + (cell - w) / 2
      const y = cy + (cell - h) / 2
      this.boxes.push({ x, y, w, h })
      // texture flipY: uv v=0 is the canvas bottom
      this.rects.set([x / W, 1 - (y + h) / H, w / W, h / H], i * 4)
    })
    this.texture = new THREE.CanvasTexture(this.canvas)
    this.texture.colorSpace = THREE.SRGBColorSpace
    this.texture.anisotropy = 4
    this.texture.minFilter = THREE.LinearMipmapLinearFilter
    this.drawPlaceholders()
  }

  private drawPlaceholders() {
    const { ctx } = this
    ctx.fillStyle = '#0b0b18'
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    this.items.forEach((it, i) => {
      const b = this.boxes[i]
      const g = ctx.createLinearGradient(b.x, b.y, b.x + b.w, b.y + b.h)
      g.addColorStop(0, it.tint)
      g.addColorStop(1, '#151233')
      ctx.fillStyle = g
      ctx.fillRect(b.x - 3, b.y - 3, b.w + 6, b.h + 6)
      ctx.fillStyle = 'rgba(255,248,235,0.92)'
      ctx.font = `600 ${Math.round(b.h * 0.13)}px "Fraunces Variable", Georgia, serif`
      ctx.textBaseline = 'top'
      wrap(ctx, it.label, b.x + b.w * 0.08, b.y + b.h * 0.1, b.w * 0.84, b.h * 0.16)
    })
    this.dirty = true
  }

  /** Begin loading images (idempotent). */
  load() {
    if (this.loading || this.disposed) return
    this.loading = true
    void document.fonts?.ready.then(() => {
      if (!this.disposed) this.drawPlaceholders()
      this.items.forEach((it, i) => {
        if (!it.url) return
        const img = new Image()
        img.decoding = 'async'
        img.src = it.url
        img
          .decode()
          .then(() => {
            if (this.disposed) return
            const b = this.boxes[i]
            const ia = img.naturalWidth / img.naturalHeight
            let sw = img.naturalWidth, sh = img.naturalHeight, sx = 0, sy = 0
            if (ia > it.aspect) {
              sw = sh * it.aspect
              sx = (img.naturalWidth - sw) / 2
            } else {
              sh = sw / it.aspect
              sy = Math.min((img.naturalHeight - sh) / 2, img.naturalHeight * 0.08)
            }
            // bleed the edges so mipmaps don't pick up the neighbour
            this.ctx.drawImage(img, sx, sy, sw, sh, b.x - 3, b.y - 3, b.w + 6, b.h + 6)
            this.ctx.drawImage(img, sx, sy, sw, sh, b.x, b.y, b.w, b.h)
            this.dirty = true
          })
          .catch(() => {})
      })
    })
  }

  /** Call once per frame. */
  flush() {
    if (this.dirty) {
      this.texture.needsUpdate = true
      this.dirty = false
    }
  }

  dispose() {
    this.disposed = true
    this.texture.dispose()
    this.canvas.width = this.canvas.height = 1
  }
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) {
  const words = text.split(/\s+/)
  let line = ''
  let yy = y
  for (const w of words) {
    const t = line ? `${line} ${w}` : w
    if (ctx.measureText(t).width > maxW && line) {
      ctx.fillText(line, x, yy)
      line = w
      yy += lh
    } else line = t
  }
  if (line) ctx.fillText(line, x, yy)
}
