// V8's small, side-effect-free math helpers (one copy for the chrome, the hero and the stage).

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
export const clamp01 = (v: number) => clamp(v, 0, 1)
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Where `t` sits in [a, b], clamped to 0..1 (`a < b`). */
export const sub = (t: number, a: number, b: number) => clamp01((t - a) / (b - a))
/** `sub` for pixel ranges that may collapse (the span is at least 1). */
export const seg = (y: number, a: number, b: number) => clamp01((y - a) / Math.max(1, b - a))

/** Sine-out: starts at the input's own speed, settles with zero velocity. */
export const sineOut = (t: number) => Math.sin((Math.PI / 2) * t)
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp01(t), 3)
export const easeInOutSine = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * clamp01(t))

/** Frame-rate independent exponential approach (like THREE.MathUtils.damp) with its own rate
 *  (per s) on the way up and on the way down. */
export const dampUpDown = (v: number, target: number, up: number, down: number, dt: number) =>
  lerp(v, target, 1 - Math.exp(-(target > v ? up : down) * dt))

/** Smoothstep: where `x` sits in [a, b], eased in and out (0 below `a`, 1 above `b`). */
export const smooth = (a: number, b: number, x: number) => {
  const t = sub(x, a, b)
  return t * t * (3 - 2 * t)
}
