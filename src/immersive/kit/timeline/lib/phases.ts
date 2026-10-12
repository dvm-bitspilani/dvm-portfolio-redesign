export const smooth = (a: number, b: number, x: number) => {
  if (b <= a) return x >= b ? 1 : 0
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x))

/**
 * How the 0..1 progress of the section is spent. All lengths are in viewport heights.
 *   hold   – the folded mark sits still
 *   unfold – creases open, camera pulls back to see the whole strip
 *   zoom   – camera moves in to the first stop
 *   pan    – stop by stop along the strip (each stop holds, then glides to the next)
 *   tail   – rest on the last stop
 */
export interface Phases {
  total: number
  unfold: [number, number]
  zoom: [number, number]
  pan: [number, number]
  count: number
}

export function makePhases(count: number, startFolded: boolean, perStop: number, unfoldLength: number): Phases {
  const hold = startFolded ? 0.15 : 0.1
  const unfold = startFolded ? unfoldLength : 0
  const zoom = startFolded ? 0.7 : 0.75
  const pan = Math.max(1, count - 1) * perStop
  const tail = Math.max(0.35, perStop * 0.55)
  const total = hold + unfold + zoom + pan + tail
  const f = (x: number) => x / total
  return {
    total,
    unfold: [f(hold), f(hold + unfold)],
    zoom: [f(hold + unfold), f(hold + unfold + zoom)],
    pan: [f(hold + unfold + zoom), f(hold + unfold + zoom + pan)],
    count,
  }
}

/** Progress at which stop `i` is centred. */
export function stopProgress(ph: Phases, i: number) {
  if (ph.count <= 1) return ph.pan[0]
  return ph.pan[0] + ((ph.pan[1] - ph.pan[0]) * i) / (ph.count - 1)
}

/**
 * Pan position in "stop index" space: holds on each stop, then eases to the next.
 * Returns a float in [0, count-1].
 */
export function panIndex(ph: Phases, p: number) {
  const n = ph.count
  if (n <= 1) return 0
  const t = clamp01((p - ph.pan[0]) / Math.max(1e-6, ph.pan[1] - ph.pan[0])) * (n - 1)
  const i = Math.min(n - 2, Math.floor(t))
  return i + smooth(0.22, 0.78, t - i)
}

/** Where stops sit along the strip (0..1 of its length). */
export function stopU(i: number, n: number) {
  const u0 = 0.085
  const u1 = 0.925
  return n <= 1 ? 0.5 : u0 + ((u1 - u0) * i) / (n - 1)
}
