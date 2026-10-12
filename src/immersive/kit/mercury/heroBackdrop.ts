/**
 * Paints the redesign hero's own layers (black, bg_3 texture through its radial
 * mask, the 30px vertical grid, the giant outlined DVM letters, the teal colour
 * wash) into a canvas, so <MercuryLogo backdrop={{ source: canvas, element: hero }} />
 * refracts what is really behind the mark. Redraw + `refreshBackdrop()` when the
 * mask moves (or pass `live: true`). Cheap: ~1–2 ms at the default 0.5 scale.
 */

export interface HeroBackdropLayers {
  /** Box size in CSS px (the hero element). */
  width: number
  height: number
  /** Pixel density of the painted canvas relative to CSS px. Default 0.5 (glass is frosted anyway). */
  scale?: number
  background?: string
  /** bg_3.png, drawn background-size: cover. */
  texture?: CanvasImageSource | null
  /** Radial reveal mask centre/radius in CSS px. Default: (0.6w, 0.2h), r = 0.4w (the hero's initial mask). */
  mask?: { x: number; y: number; r: number }
  textureOpacity?: number
  /** Vertical grid line spacing in CSS px (false to skip). Default 30. */
  grid?: number | false
  gridAlpha?: number
  /** Outlined DVM letters image (src/assests/image.png): full width, max 50% height, vertically centred. */
  letters?: CanvasImageSource | null
  /** The hero's teal `mix-blend-mode: color` wash. Default true. */
  colorWash?: boolean
}

const dims = (s: CanvasImageSource): [number, number] => {
  const o = s as { naturalWidth?: number; naturalHeight?: number; videoWidth?: number; videoHeight?: number; width?: number | { baseVal: { value: number } }; height?: number | { baseVal: { value: number } } }
  const w = o.naturalWidth || o.videoWidth || (typeof o.width === 'number' ? o.width : o.width?.baseVal.value) || 1
  const h = o.naturalHeight || o.videoHeight || (typeof o.height === 'number' ? o.height : o.height?.baseVal.value) || 1
  return [w, h]
}

export function paintHeroBackdrop(canvas: HTMLCanvasElement, L: HeroBackdropLayers) {
  const { width: W, height: H } = L
  const s = L.scale ?? 0.5
  const cw = Math.max(2, Math.round(W * s)), ch = Math.max(2, Math.round(H * s))
  if (canvas.width !== cw) canvas.width = cw
  if (canvas.height !== ch) canvas.height = ch
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  ctx.setTransform(s, 0, 0, s, 0, 0)
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
  ctx.clearRect(0, 0, W, H)

  // texture through the radial mask, then the black base underneath
  if (L.texture) {
    const [iw, ih] = dims(L.texture)
    const k = Math.max(W / iw, H / ih)
    ctx.globalAlpha = L.textureOpacity ?? 1
    ctx.drawImage(L.texture, (W - iw * k) / 2, (H - ih * k) / 2, iw * k, ih * k)
    ctx.globalAlpha = 1
    const m = L.mask ?? { x: W * 0.6, y: H * 0.2, r: W * 0.4 }
    const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, Math.max(1, m.r))
    g.addColorStop(0, '#000')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.globalCompositeOperation = 'destination-in'
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  }
  ctx.globalCompositeOperation = 'destination-over'
  ctx.fillStyle = L.background ?? '#000'
  ctx.fillRect(0, 0, W, H)
  ctx.globalCompositeOperation = 'source-over'

  const grid = L.grid ?? 30
  if (grid) {
    ctx.fillStyle = `rgba(255,255,255,${L.gridAlpha ?? 0.12})`
    for (let x = 0; x < W; x += grid) ctx.fillRect(x, 0, 1, H)
  }

  if (L.letters) {
    const [iw, ih] = dims(L.letters)
    const dw = W
    let dh = (W * ih) / iw
    const maxH = H * 0.5
    if (dh > maxH) dh = maxH // object-fit: cover crops the sides
    const k = Math.max(dw / iw, dh / ih)
    const sw = dw / k, sh = dh / k
    ctx.drawImage(L.letters, (iw - sw) / 2, (ih - sh) / 2, sw, sh, 0, (H - dh) / 2, dw, dh)
  }

  if (L.colorWash !== false) {
    const x = W * 0.4, y = -H * 0.1, w = W * 0.4, h = H * 0.6
    const cx = x + w * 0.2, cy = y + h * 0.4
    const r = Math.hypot(Math.max(cx - x, x + w - cx), Math.max(cy - y, y + h - cy))
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
    g.addColorStop(0, 'rgba(180,250,255,0.9)')
    g.addColorStop(0.35, 'rgba(60,210,230,0.75)')
    g.addColorStop(0.6, 'rgba(20,90,100,0.35)')
    g.addColorStop(0.85, 'rgba(0,0,0,0)')
    ctx.globalCompositeOperation = 'color'
    ctx.fillStyle = g
    ctx.fillRect(x, y, w, h)
    ctx.globalCompositeOperation = 'source-over'
  }
  return canvas
}
