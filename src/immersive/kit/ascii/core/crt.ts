import { hexToRgb, type ResolvedTheme } from './theme'
import type { FrameParams } from './types'

/** Individual CRT knobs (0 disables each). `crt={true}` uses the defaults below. */
export interface CrtOptions {
  /** barrel distortion, ~0.02–0.06 */
  curvature?: number
  /** scanline strength 0..1 */
  scanlines?: number
  /** bloom / glow strength 0..1.5 */
  bloom?: number
  /** phosphor afterglow half-life, seconds (0.03–0.15) */
  afterglow?: number
  /** RGB aperture grille 0..1 */
  grille?: number
  /** tube vignette 0..1 */
  vignette?: number
  /** grain, flicker and rolling refresh band 0..1 */
  noise?: number
}

export const CRT_DEFAULTS: Required<CrtOptions> = {
  curvature: 0.032,
  scanlines: 1,
  bloom: 1,
  afterglow: 0.05,
  grille: 1,
  vignette: 1,
  noise: 1,
}

export function resolveCrt(crt: boolean | CrtOptions | undefined): Required<CrtOptions> | null {
  if (!crt) return null
  return crt === true ? CRT_DEFAULTS : { ...CRT_DEFAULTS, ...crt }
}

/** Write theme + CRT settings into the frame params. */
export function applyLook(fp: FrameParams, theme: ResolvedTheme, crt: Required<CrtOptions> | null, bg: string | null, reduced: boolean) {
  fp.ink = theme.ink
  fp.hot = theme.hot
  fp.bg = bg ? hexToRgb(bg) : null
  if (crt) {
    fp.fx = 1
    fp.curvature = crt.curvature
    fp.scanlines = crt.scanlines
    fp.bloom = crt.bloom
    fp.persistence = reduced ? 0 : crt.afterglow
    fp.grille = crt.grille
    fp.vignette = crt.vignette
    fp.noise = reduced ? 0 : crt.noise
    fp.tube = crt.curvature > 0
  } else {
    fp.fx = 0
    fp.curvature = 0
    fp.scanlines = 0
    fp.bloom = 0
    fp.persistence = 0
    fp.grille = 0
    fp.vignette = 0
    fp.noise = 0
    fp.tube = false
  }
}
