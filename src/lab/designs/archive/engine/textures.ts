import * as THREE from 'three'
import { LOGO_ASPECT, LOGO_PATHS } from '../../../shared/logo'
import { CENTRE } from './layout'

/** Mark geometry in cells (origin-centred, y down). */
export const MARK = { cx: 0, cy: -0.85, h: 4.1 }

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

/** Monospace glyph strip for live coordinate labels: "0123456789-, " */
export const GLYPHS = '0123456789−, '
export function createGlyphStrip() {
  const gw = 48, gh = 80
  const c = document.createElement('canvas')
  c.width = gw * GLYPHS.length
  c.height = gh
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.font = '500 64px "IBM Plex Mono", ui-monospace, monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (let i = 0; i < GLYPHS.length; i++) ctx.fillText(GLYPHS[i], gw * i + gw / 2, gh / 2 + 3)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.NoColorSpace
  tex.flipY = false
  tex.generateMipmaps = true
  tex.minFilter = THREE.LinearMipmapLinearFilter
  return { tex, aspect: gw / gh }
}

/**
 * Static type + map furniture of the centre block (10 x 8 cells):
 * a graticule frame with cell ticks, the name of the department and one line of copy.
 * The mark itself and the live coordinate label are drawn by the shader.
 */
export function createCentreTexture() {
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
  ctx.strokeStyle = 'rgba(233,234,238,0.22)'
  ctx.lineWidth = 2
  ctx.strokeRect(inset, inset, W - inset * 2, H - inset * 2)
  ctx.strokeStyle = 'rgba(233,234,238,0.35)'
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

  // Name + one line.
  ctx.fillStyle = '#e9eaee'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.font = '640 74px "Manrope Variable", system-ui, sans-serif'
  ctx.letterSpacing = '-2px'
  ctx.fillText('Department of Visual Media', X(0), Y(2.3))
  ctx.letterSpacing = '0px'
  ctx.font = '400 27px "IBM Plex Mono", ui-monospace, monospace'
  ctx.fillStyle = 'rgba(233,234,238,0.58)'
  ctx.fillText('Websites, apps, films and art for BOSM, Oasis and APOGEE.', X(0), Y(2.95))
  ctx.fillText('BITS Pilani', X(0), Y(3.35))

  // Corner legend (bottom-right): scale bar of one cell.
  ctx.textAlign = 'right'
  ctx.font = '400 22px "IBM Plex Mono", ui-monospace, monospace'
  ctx.fillStyle = 'rgba(233,234,238,0.42)'
  ctx.strokeStyle = 'rgba(233,234,238,0.42)'
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

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.NoColorSpace
  tex.flipY = false
  tex.generateMipmaps = true
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.anisotropy = 4
  return tex
}

export const MARK_ASPECT = LOGO_ASPECT
