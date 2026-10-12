/** What the swarm forms. */
export type SwarmTarget =
  | 'logo'
  | 'cloud'
  | 'galaxy'
  | 'ring'
  /** Text, `\n` for line breaks. Font defaults to the redesign's Stretch Pro. */
  | { text: string; font?: string; weight?: number | string; tracking?: number }
  /**
   * Image sampled by luminance (bright = dense). `portrait` = soft oval vignette for faces.
   * `invert: 'auto'` (default) samples the dark detail of mostly-white images instead.
   */
  | { image: string; fit?: 'contain' | 'cover' | 'portrait'; invert?: boolean | 'auto'; contrast?: number }
  /** Your own point cloud (xyz triplets, or xyzw with brightness when `stride: 4`). Normalised automatically. */
  | { points: Float32Array; stride?: 3 | 4; key?: string }

/** Rectangle in fractions of the canvas (0..1, y down). */
export interface SwarmRegion {
  x0: number
  y0: number
  x1: number
  y1: number
}

/**
 * Where the shape sits inside the canvas. Presets collapse to a top band on
 * narrow canvases (< 760px wide) so text can sit below.
 */
export type SwarmPlacement =
  | 'full'
  | 'center'
  | 'left'
  | 'right'
  | SwarmRegion
  | ((width: number, height: number) => SwarmRegion)

export type SwarmPaletteName = 'teal' | 'violet'
/** Four stops, slow → fast: [rest, moving, fast, white-hot]. */
export type SwarmPalette = SwarmPaletteName | [string, string, string, string]

export type SwarmQuality = 'auto' | 'low' | 'high'

/** Per-formation options (also accepted as SwarmField props for the default). */
export interface SwarmShowOptions {
  placement?: SwarmPlacement
  /** Fraction of the placement rect to fill (preset-specific default ≈ 0.9). */
  fill?: number
  /** Continuous spin about Y, rad/s. */
  spin?: number
  /** Tilt about X, rad (galaxy/ring default ≈ 1.1). */
  tilt?: number
  /** Slow sway amplitude about Y, rad. */
  sway?: number
  /** Seconds for the staggered morph from the previous formation. */
  morphDuration?: number
  /** Turbulence jolt on change, 0..1 (default 0.55). */
  kick?: number
  /** Outward burst velocity on change (default 0). */
  burst?: number
}

/** Imperative handle (via `ref` on SwarmField, or `useSwarm()` under a SwarmProvider). */
export interface SwarmController {
  /** Set the base formation. Resolves when the shape is built and on stage (or superseded). */
  setTarget(target: SwarmTarget, options?: SwarmShowOptions): Promise<void>
  /** Temporarily show a formation over the base one (hover previews). */
  override(target: SwarmTarget, options?: SwarmShowOptions): Promise<void>
  /** Drop the override and return to the base formation. */
  clearOverride(options?: SwarmShowOptions): void
  /** Build targets ahead of time so later switches are instant. */
  preload(targets: SwarmTarget[]): Promise<void>
  /**
   * Scroll-scrub between two formations, t 0..1 (e.g. from a GSAP ScrollTrigger's progress).
   * Targets must already be built (call preload first); otherwise this builds them and is a no-op until ready.
   */
  scrub(a: SwarmTarget, b: SwarmTarget, t: number, options?: SwarmShowOptions, optionsB?: SwarmShowOptions): void
  /** Throw particles outward from the formation's centre. */
  explode(strength?: number): void
  /** Engine stats for debugging / perf HUDs. */
  stats(): SwarmStats
}

export interface SwarmStats {
  particles: number
  fps: number
  dpr: number
  running: boolean
  gl: boolean
}
