import { useSyncExternalStore } from 'react'
import type { VerticalId } from '../../data'
import type { BuildingId } from './content'

/**
 * Tiny module-level store shared by the DOM overlay and the R3F scene
 * (lives outside React context so canvas-side code can read it per frame).
 */
export interface CampusState {
  hoverBuilding: BuildingId | null
  /** `p:slug`, `m:slug`, `b:slug`, `a:slug` */
  hoverItem: string | null
  introDone: boolean
  listOpen: boolean
  aboutOpen: boolean
  teamFilter: VerticalId | null
  /** performance.now() of the last radio transmission (contact form). */
  transmitAt: number
  /** Desktop side panel width in px (0 when closed) / mobile sheet height. */
  panelW: number
  panelH: number
}

let state: CampusState = {
  hoverBuilding: null,
  hoverItem: null,
  introDone: false,
  listOpen: false,
  aboutOpen: false,
  teamFilter: null,
  transmitAt: -1e9,
  panelW: 0,
  panelH: 0,
}
const listeners = new Set<() => void>()

export const campus = {
  get: () => state,
  set(patch: Partial<CampusState>) {
    let changed = false
    for (const k in patch) {
      const key = k as keyof CampusState
      if (state[key] !== patch[key]) {
        changed = true
        break
      }
    }
    if (!changed) return
    state = { ...state, ...patch }
    listeners.forEach((l) => l())
  },
  subscribe(l: () => void) {
    listeners.add(l)
    return () => listeners.delete(l)
  },
  reset() {
    state = { ...state, hoverBuilding: null, hoverItem: null, introDone: false, listOpen: false, aboutOpen: false, teamFilter: null, panelW: 0, panelH: 0 }
  },
}

export function useCampus<T>(sel: (s: CampusState) => T): T {
  return useSyncExternalStore(campus.subscribe, () => sel(state), () => sel(state))
}

/** Screen-space sign anchors: DOM elements registered by id, positioned by the scene each frame. */
export const signEls = new Map<string, HTMLElement>()
export const registerSign = (id: string) => (el: HTMLElement | null) => {
  if (el) signEls.set(id, el)
  else signEls.delete(id)
}

/** World-space anchors for signs (static ones from the layout, plus a moving `caption`). */
export const anchors = new Map<string, { x: number; y: number; z: number }>()
