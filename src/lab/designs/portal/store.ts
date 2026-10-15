import { useSyncExternalStore } from 'react'
import { Vector3 } from 'three'
import type { VerticalId } from '../../data'

export type WorldId = 'code' | 'design' | 'film'
/** Which stencil space the camera is physically in. */
export type Space = 'outside' | WorldId

export type Target =
  | { kind: 'home' }
  | { kind: 'world'; world: WorldId; focus?: string }
  | { kind: 'team' }
  | { kind: 'contact' }

export interface PortalState {
  target: Target
  space: Space
  /** Coarse region of the camera, for UI. */
  region: 'front' | 'corridor' | 'team' | WorldId
  flying: boolean
  hoverPortal: WorldId | null
  selected: WorldId
  /** Home station index nearest to the camera (0..4). */
  station: number
  /** Index of the world item nearest to the camera. */
  itemIndex: number
  hoverItem: string | null
  teamFilter: VerticalId | null
  teamHover: number | null
  teamPinned: number | null
  reduced: boolean
  mobile: boolean
  /** Which worlds should load their textures. */
  wanted: Record<WorldId | 'team', boolean>
  /** Bumped to trigger a DOM "cut" flash (reduced motion). */
  cut: number
}

let state: PortalState = {
  target: { kind: 'home' },
  space: 'outside',
  region: 'front',
  flying: false,
  hoverPortal: null,
  selected: 'design',
  station: 0,
  itemIndex: 0,
  hoverItem: null,
  teamFilter: null,
  teamHover: null,
  teamPinned: null,
  reduced: false,
  mobile: false,
  wanted: { code: false, design: false, film: false, team: false },
  cut: 0,
}

const listeners = new Set<() => void>()

export const store = {
  get: () => state,
  set(partial: Partial<PortalState>) {
    let changed = false
    for (const k in partial) {
      const key = k as keyof PortalState
      if (state[key] !== partial[key]) {
        changed = true
        break
      }
    }
    if (!changed) return
    state = { ...state, ...partial }
    listeners.forEach((l) => l())
  },
  want(id: WorldId | 'team') {
    if (state.wanted[id]) return
    store.set({ wanted: { ...state.wanted, [id]: true } })
  },
  subscribe(l: () => void) {
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  },
}

export function usePortal<T>(sel: (s: PortalState) => T): T {
  return useSyncExternalStore(store.subscribe, () => sel(state), () => sel(state))
}

/** Mutable per-frame values shared between the rig and DOM (never triggers React). */
export const live = {
  speed: 0,
  vel: new Vector3(),
  depth: 0,
  pointerX: 0,
  pointerY: 0,
  camera: null as import('three').PerspectiveCamera | null,
  gaugeEl: null as HTMLElement | null,
  gaugeLabelEl: null as HTMLElement | null,
}

/** Imperative hooks set by the camera rig / router. */
export const api = {
  goStation: (_i: number) => {},
  scrollBy: (_dy: number) => {},
  navigate: (_to: string) => {},
}

export function targetKey(t: Target) {
  return t.kind === 'world' ? `world:${t.world}:${t.focus ?? ''}` : t.kind
}
