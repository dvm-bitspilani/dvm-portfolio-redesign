/**
 * Studio environments seen in the mercury's reflections, plus the cyclorama
 * colours for `background="studio"`. All env values are linear HDR radiance.
 */

export type Vec3 = [number, number, number]

export interface MercuryEnv {
  top: Vec3     // overhead soft box
  key: Vec3     // tall strip, front-left
  rim: Vec3     // strip, right-back
  fill: Vec3    // soft strip, front-right
  card: Vec3    // low accent card, back-left (brand colour, reflections only)
  panel: Vec3   // big graded panel behind the viewer
  haze: Vec3    // horizon haze
  glass: Vec3   // glass transmission tint
  xray: Vec3    // x-ray line tint
  bgTop: Vec3   // studio cyclorama, display sRGB 0..1
  bgBottom: Vec3
  bgGlow: Vec3
}

export const ENVS = {
  /** Cool cyan/teal soft boxes matching the redesign's #45e6ff accent. */
  teal: {
    top: [2.15, 2.34, 2.45],
    key: [2.3, 2.52, 2.62],
    rim: [0.62, 2.1, 2.45],
    fill: [0.72, 0.9, 0.96],
    card: [0.08, 0.62, 0.8],
    panel: [0.36, 0.48, 0.54],
    haze: [0.03, 0.058, 0.068],
    glass: [0.86, 0.98, 1.02],
    xray: [0.5, 0.9, 1.0],
    bgTop: [0.043, 0.071, 0.125],
    bgBottom: [0.016, 0.018, 0.024],
    bgGlow: [0.0, 0.085, 0.105],
  },
  /** The lab's original neutral studio with its low violet card. */
  neutral: {
    top: [2.4, 2.38, 2.34],
    key: [2.6, 2.55, 2.45],
    rim: [1.7, 1.8, 2.05],
    fill: [0.9, 0.9, 0.9],
    card: [0.135, 0.045, 0.38],
    panel: [0.55, 0.56, 0.6],
    haze: [0.05, 0.05, 0.056],
    glass: [0.9, 0.93, 0.98],
    xray: [0.78, 0.84, 1.0],
    bgTop: [0.05, 0.05, 0.058],
    bgBottom: [0.012, 0.012, 0.014],
    bgGlow: [0.05, 0.05, 0.062],
  },
} satisfies Record<string, MercuryEnv>

export type MercuryEnvName = keyof typeof ENVS

/** '#45e6ff' | '#4ef' | 'rgb(…)' → linear-ish 0..1 triple (sRGB^2.2). */
export function parseColor(input: string): Vec3 | null {
  const s = input.trim()
  let r: number, g: number, b: number
  const hex = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].split('').map((c) => c + c).join('') : hex[1]
    r = parseInt(h.slice(0, 2), 16); g = parseInt(h.slice(2, 4), 16); b = parseInt(h.slice(4, 6), 16)
  } else {
    const m = s.match(/^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/i)
    if (!m) return null
    r = +m[1]; g = +m[2]; b = +m[3]
  }
  return [(r / 255) ** 2.2, (g / 255) ** 2.2, (b / 255) ** 2.2]
}

/** Resolve env + optional accent tint into the uniform set. */
export function resolveEnv(name: MercuryEnvName | MercuryEnv, tint?: string): MercuryEnv {
  const base: MercuryEnv = typeof name === 'string' ? (ENVS[name] ?? ENVS.teal) : name
  if (!tint) return base
  const c = parseColor(tint)
  if (!c) return base
  const lum = Math.max(1e-3, 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2])
  const n: Vec3 = [c[0] / lum, c[1] / lum, c[2] / lum] // equal-luminance hue
  const scale = (v: Vec3, k: number): Vec3 => [v[0] * k, v[1] * k, v[2] * k]
  const mixv = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
  return {
    ...base,
    card: scale(n, 0.42),
    rim: mixv(base.rim, scale(n, 1.75), 0.8),
    xray: mixv([1, 1, 1], scale(n, 0.85), 0.55),
    glass: mixv([1, 1, 1], scale(n, 0.9), 0.12),
    bgGlow: scale(c, 0.12),
  }
}
