import '@fontsource/vt323'
import '@fontsource-variable/jetbrains-mono'
import '@fontsource/ibm-plex-mono'

export type RGB = [number, number, number]

/** Phosphor presets. `teal` matches the redesign (#45e6ff); the rest are the lab's tubes. */
export type PaletteName = 'teal' | 'green' | 'amber' | 'ice' | 'pale'

export interface Palette {
  /** main phosphor colour */
  ink: string
  /** white-hot core used for the brightest cells */
  hot: string
}

export const PALETTES: Record<PaletteName, Palette> = {
  teal: { ink: '#45e6ff', hot: '#e6fdff' },
  green: { ink: '#7cff6b', hot: '#e9ffe4' },
  amber: { ink: '#ffb21e', hot: '#fff0cf' },
  ice: { ink: '#8fe3ff', hot: '#f2fcff' },
  pale: { ink: '#cfe8ff', hot: '#ffffff' },
}

export function hexToRgb(hex: string): RGB {
  let h = hex.trim().replace('#', '')
  if (h.length === 3) h = h.replace(/./g, (c) => c + c)
  const n = parseInt(h.slice(0, 6), 16)
  if (!Number.isFinite(n)) return [1, 1, 1]
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

export interface ResolvedTheme {
  ink: RGB
  hot: RGB
  inkCss: string
  hotCss: string
}

/** palette preset, optionally overridden by a custom ink / hot colour */
export function resolveTheme(palette: PaletteName = 'teal', color?: string, hot?: string): ResolvedTheme {
  const p = PALETTES[palette] ?? PALETTES.teal
  const inkCss = color ?? p.ink
  const ink = hexToRgb(inkCss)
  let hotRgb: RGB
  let hotCss: string
  if (hot) {
    hotCss = hot
    hotRgb = hexToRgb(hot)
  } else if (color) {
    hotRgb = [ink[0] + (1 - ink[0]) * 0.85, ink[1] + (1 - ink[1]) * 0.85, ink[2] + (1 - ink[2]) * 0.85]
    hotCss = rgbCss(hotRgb)
  } else {
    hotCss = p.hot
    hotRgb = hexToRgb(p.hot)
  }
  return { ink, hot: hotRgb, inkCss, hotCss }
}

export function rgbCss(c: RGB) {
  return `rgb(${Math.round(c[0] * 255)}, ${Math.round(c[1] * 255)}, ${Math.round(c[2] * 255)})`
}

/** Bundled terminal faces. Any other string is used as a CSS font-family name. */
export type FontName = 'vt323' | 'jetbrains' | 'plex'
export const FONTS: Record<FontName, string> = {
  vt323: 'VT323',
  jetbrains: 'JetBrains Mono Variable',
  plex: 'IBM Plex Mono',
}

export function fontFamily(f: FontName | (string & {}) = 'vt323'): string {
  return (FONTS as Record<string, string>)[f] ?? f
}

const loaded = new Map<string, Promise<void>>()
/** Resolve once the face is usable on canvas (never rejects; times out after 2.5s). */
export function loadFont(family: string): Promise<void> {
  let p = loaded.get(family)
  if (!p) {
    p = Promise.race([
      document.fonts.load(`20px "${family}"`).then(
        () => undefined,
        () => undefined,
      ),
      new Promise<void>((r) => setTimeout(r, 2500)),
    ])
    loaded.set(family, p)
  }
  return p
}
