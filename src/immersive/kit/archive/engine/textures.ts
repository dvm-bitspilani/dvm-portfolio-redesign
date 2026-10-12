import * as THREE from 'three'
import { LOGO_PATHS } from '../../../shared/logo'
import { CENTRE, MARK } from '../model'

export const FONT_DISPLAY = '"Stretch Pro", "imm-archive-stretch", "Orbitron", system-ui, sans-serif'
export const FONT_LABEL = '"Orbitron", system-ui, sans-serif'
export const FONT_MONO = '"JetBrains Mono Variable", "JetBrains Mono", ui-monospace, monospace'

/** Wait (briefly) for the faces drawn into canvases. Never rejects. */
export function loadCanvasFonts() {
  if (typeof document === 'undefined' || !document.fonts) return Promise.resolve()
  const want = [`400 64px ${FONT_DISPLAY}`, `500 32px ${FONT_LABEL}`, `500 32px ${FONT_MONO}`, `400 32px ${FONT_MONO}`]
  const all = Promise.all(want.map((f) => document.fonts.load(f).catch(() => undefined)))
  return Promise.race([all, new Promise((r) => setTimeout(r, 2500))]).then(() => undefined)
}

/**
 * The logo is two straight-edged polygons: parse the SVG path data into vertices in cells
 * so the shader can evaluate an exact signed distance (crisp at any zoom).
 */
export function markPolygons(): { points: THREE.Vector2[]; counts: [number, number] } {
  const polys: [number, number][][] = LOGO_PATHS.map((d) => {
    const tok = d.match(/[MmLlHhVvZz]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g) ?? []
    const pts: [number, number][] = []
    let x = 0, y = 0, i = 0, cmd = ''
    const num = () => parseFloat(tok[i++])
    while (i < tok.length) {
      if (/[A-Za-z]/.test(tok[i])) cmd = tok[i++]
      if (cmd === 'z' || cmd === 'Z') break
      if (cmd === 'M' || cmd === 'L') { x = num(); y = num() }
      else if (cmd === 'm' || cmd === 'l') { x += num(); y += num() }
      else if (cmd === 'H') x = num()
      else if (cmd === 'h') x += num()
      else if (cmd === 'V') y = num()
      else if (cmd === 'v') y += num()
      pts.push([x, y])
    }
    const [fx, fy] = pts[0], [lx, ly] = pts[pts.length - 1]
    if (Math.hypot(fx - lx, fy - ly) < 0.01) pts.pop()
    return pts
  })
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const p of polys) for (const [x, y] of p) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y)
  }
  const h = maxY - minY, cx = (minX + maxX) / 2, cy = (minY + maxY) / 2
  const points = polys.flat().map(([x, y]) => new THREE.Vector2(((x - cx) / h) * MARK.h + MARK.cx, ((y - cy) / h) * MARK.h + MARK.cy))
  while (points.length < 32) points.push(new THREE.Vector2())
  return { points, counts: [polys[0].length, polys[1].length] }
}

function canvasTexture(c: HTMLCanvasElement, aniso = 1) {
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.NoColorSpace
  tex.flipY = false
  tex.generateMipmaps = true
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.anisotropy = aniso
  return tex
}

/** Monospace glyph strip for live coordinate labels: "0123456789−, " */
export const GLYPHS = '0123456789−, '
export function createGlyphStrip() {
  const gw = 48, gh = 80
  const c = document.createElement('canvas')
  c.width = gw * GLYPHS.length
  c.height = gh
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.font = `500 60px ${FONT_MONO}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (let i = 0; i < GLYPHS.length; i++) ctx.fillText(GLYPHS[i], gw * i + gw / 2, gh / 2 + 3)
  return { tex: canvasTexture(c), aspect: gw / gh }
}

/**
 * Static furniture of the centre block (10 x 8 cells), white on transparent (tinted in the shader):
 * a graticule frame, giant outlined DVM letters behind the mark, the department's name and a scale bar.
 * The mark itself and the live coordinate label are drawn by the shader.
 */
export function createCentreTexture(opts: { letters: boolean; copy: boolean }) {
  const ppc = 150 // px per cell
  const W = CENTRE.w * ppc, H = CENTRE.h * ppc
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  const X = (x: number) => (x - CENTRE.x) * ppc
  const Y = (y: number) => (y - CENTRE.y) * ppc

  // Frame inset by 0.3 cells with ticks on every cell line.
  const inset = 0.3 * ppc
  ctx.strokeStyle = 'rgba(255,255,255,0.2)'
  ctx.lineWidth = 2
  ctx.strokeRect(inset, inset, W - inset * 2, H - inset * 2)
  ctx.strokeStyle = 'rgba(255,255,255,0.34)'
  for (let x = CENTRE.x + 1; x < CENTRE.x + CENTRE.w; x++) {
    const len = x === 0 ? 34 : 14
    ctx.beginPath()
    ctx.moveTo(X(x), inset)
    ctx.lineTo(X(x), inset + len)
    ctx.moveTo(X(x), H - inset)
    ctx.lineTo(X(x), H - inset - len)
    ctx.stroke()
  }
  for (let y = CENTRE.y + 1; y < CENTRE.y + CENTRE.h; y++) {
    const len = y === 0 ? 34 : 14
    ctx.beginPath()
    ctx.moveTo(inset, Y(y))
    ctx.lineTo(inset + len, Y(y))
    ctx.moveTo(W - inset, Y(y))
    ctx.lineTo(W - inset - len, Y(y))
    ctx.stroke()
  }

  // Giant outlined DVM, the redesign's signature, fitted to the frame behind the mark.
  if (opts.letters) {
    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    let size = 3.2 * ppc
    ctx.font = `400 ${size}px ${FONT_DISPLAY}`
    const maxW = (CENTRE.w - 1.1) * ppc
    const mw = ctx.measureText('DVM').width
    if (mw > maxW) {
      size *= maxW / mw
      ctx.font = `400 ${size}px ${FONT_DISPLAY}`
    }
    ctx.lineWidth = 2.5
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.strokeText('DVM', X(0), Y(MARK.cy + 0.1))
    ctx.restore()
  }

  if (opts.copy) {
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.font = `400 ${0.3 * ppc}px ${FONT_DISPLAY}`
    ctx.letterSpacing = '4px'
    ctx.fillText('DEPARTMENT OF VISUAL MEDIA', X(0), Y(2.25))
    ctx.letterSpacing = '0px'
    ctx.font = `400 ${0.17 * ppc}px ${FONT_MONO}`
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.fillText('Websites, apps, films and art for BOSM, Oasis and APOGEE.', X(0), Y(2.85))
    ctx.fillText('BITS Pilani', X(0), Y(3.2))
  }

  // Corner legend: scale bar of one cell.
  ctx.textAlign = 'right'
  ctx.font = `400 ${0.14 * ppc}px ${FONT_MONO}`
  ctx.fillStyle = 'rgba(255,255,255,0.42)'
  ctx.strokeStyle = 'rgba(255,255,255,0.42)'
  ctx.lineWidth = 2
  const bx = W - inset - 0.35 * ppc, by = inset + 0.55 * ppc
  ctx.beginPath()
  ctx.moveTo(bx - ppc, by)
  ctx.lineTo(bx, by)
  ctx.moveTo(bx - ppc, by - 8)
  ctx.lineTo(bx - ppc, by + 8)
  ctx.moveTo(bx, by - 8)
  ctx.lineTo(bx, by + 8)
  ctx.stroke()
  ctx.fillText('1 cell', bx, by + 34)

  return canvasTexture(c, 4)
}
