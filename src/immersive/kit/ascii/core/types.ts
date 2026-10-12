import type { Atlas } from './glyphs'
import type { Grid } from './grid'
import type { RGB } from './theme'

/** Device-pixel layout of the two cell grids inside the canvas. */
export interface Layout {
  ox: number
  oy: number
  /** text grid cell (device px) */
  cw: number
  ch: number
  /** art grid cell (device px) */
  fcw: number
  fch: number
}

export interface FrameParams {
  time: number
  dt: number
  /** overall CRT amount 0..1 (chromatic fringe, glass reflection) */
  fx: number
  curvature: number
  scanlines: number
  grille: number
  vignette: number
  /** glass grain, flicker and the rolling refresh band */
  noise: number
  bloom: number
  /** phosphor afterglow half-life in seconds (0 = off) */
  persistence: number
  /** rounded tube mask */
  tube: boolean
  glitch: number
  powerX: number
  powerY: number
  blinkOn: boolean
  ink: RGB
  hot: RGB
  /** null = transparent canvas (glyphs composite over whatever is behind) */
  bg: RGB | null
}

export interface AtlasSet {
  /** text grid atlas (may be the same as art) */
  main: Atlas
  art: Atlas
}

export interface AsciiRenderer {
  readonly kind: 'webgl' | '2d'
  setAtlases(a: AtlasSet): void
  setSize(cssW: number, cssH: number, dpr: number): void
  /** `main` may be null when only the art grid is used. */
  render(main: Grid | null, art: Grid, layout: Layout, fp: FrameParams): void
  dispose(): void
}
