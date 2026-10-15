// The DVM mark as plain polygons for SVG engraving.
// Same source as LOGO_PATHS in src/shared/logo.ts, read from the raw SVG so this
// zero-WebGL design does not pull three.js into its bundle.
import logoSvg from '../../../shared/dvm-logo.svg?raw'

export const MARK_PATHS: string[] = Array.from(logoSvg.matchAll(/\sd="([^"]+)"/g), (m) => m[1].replace(/\s+/g, ''))

type Pt = [number, number]

function parse(d: string): Pt[] {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? []
  const pts: Pt[] = []
  let x = 0,
    y = 0,
    cmd = ''
  let i = 0
  const num = () => parseFloat(tokens[i++])
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) cmd = tokens[i++]
    switch (cmd) {
      case 'M':
      case 'L':
        x = num()
        y = num()
        break
      case 'm':
      case 'l':
        x += num()
        y += num()
        break
      case 'H':
        x = num()
        break
      case 'h':
        x += num()
        break
      case 'V':
        y = num()
        break
      case 'v':
        y += num()
        break
      case 'z':
      case 'Z':
        continue
      default:
        i++
        continue
    }
    pts.push([x, y])
  }
  // drop a closing point that duplicates the first
  const a = pts[0],
    b = pts[pts.length - 1]
  if (pts.length > 2 && Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.5) pts.pop()
  return pts
}

export const MARK_POLYS = MARK_PATHS.map(parse)

/** Each polygon edge as an engraving stroke: [x1, y1, x2, y2]. */
export const MARK_SEGMENTS = MARK_POLYS.map((poly) => poly.map((p, i) => [p[0], p[1], poly[(i + 1) % poly.length][0], poly[(i + 1) % poly.length][1]] as const))

export const MARK_BOX = { x: -470.31, y: -227.2, w: 250.53, h: 326.78 }
/** Horizontal cut that separates the M (top of the inner ribbon) from the V (its point). */
export const MARK_CUT = -66
