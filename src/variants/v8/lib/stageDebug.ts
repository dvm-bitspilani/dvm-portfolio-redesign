// Opt-in diagnostics for the home hero's projector stage: `?debug=stage` in the URL turns on a
// small fixed readout (chrome/holo/StageDebug.tsx) and console logs of every state transition.
// Without the flag nothing here renders or logs; the writers only touch a plain object.
//
// The flag is read once per page load and then sticks for the session, so the readout survives
// in-app navigation (which drops the query) back to the home page.

export interface StageDebugState {
  /** The hero's boot phase (wait / boot / live). */
  phase: string
  revealed: boolean
  /** The canvas is allowed to draw (hero near the viewport, tab visible). */
  active: boolean
  /** GLBoundary shows the CSS projector instead of the canvas. */
  fallback: boolean
  /** It has stopped retrying (the CSS projector stays). */
  final: boolean
  /** The last error the boundary caught (or the context loss). */
  error: string
  contextLost: boolean
  /** Which mount of the canvas this is (0 = first). */
  attempt: number
  /** Drawing-buffer size of the stage canvas (device px) and its CSS size. */
  canvasW: number
  canvasH: number
  cssW: number
  cssH: number
  /** Frames the stage canvas has drawn since it mounted. */
  frames: number
  /** Optional parts that degraded (studio env, reflective floor, MSAA composer). */
  degraded: string[]
}

let enabled: boolean | null = null

/** True when the page was opened with `?debug=stage` (sticky for the session). */
export function stageDebugOn(): boolean {
  if (enabled === null) {
    try {
      enabled = new URLSearchParams(window.location.search).get('debug') === 'stage'
    } catch {
      enabled = false
    }
  }
  return enabled
}

export const stageDebug: StageDebugState = {
  phase: 'wait',
  revealed: false,
  active: true,
  fallback: false,
  final: false,
  error: '',
  contextLost: false,
  attempt: 0,
  canvasW: 0,
  canvasH: 0,
  cssW: 0,
  cssH: 0,
  frames: 0,
  degraded: [],
}

type Discrete = Omit<StageDebugState, 'canvasW' | 'canvasH' | 'cssW' | 'cssH' | 'frames' | 'degraded'>

/** Set discrete fields; each change is logged (only with the flag on). */
export function stageNote(patch: Partial<Discrete>) {
  if (!stageDebugOn()) return
  const d = stageDebug as unknown as Record<string, unknown>
  for (const [k, v] of Object.entries(patch)) {
    if (d[k] === v) continue
    console.info(`[v8 stage] ${k}: ${JSON.stringify(d[k])} → ${JSON.stringify(v)}`)
    d[k] = v
  }
}

/** One optional part fell back to its cheaper form (logged once). */
export function stageDegraded(part: string, error?: unknown) {
  if (!stageDebugOn() || stageDebug.degraded.includes(part)) return
  stageDebug.degraded.push(part)
  console.warn(`[v8 stage] degraded: ${part}`, error ?? '')
}

/** A message for the readout from whatever was thrown. */
export function errorText(error: unknown): string {
  if (!error) return ''
  if (error instanceof Error) return `${error.name}: ${error.message}`
  return String(error)
}
