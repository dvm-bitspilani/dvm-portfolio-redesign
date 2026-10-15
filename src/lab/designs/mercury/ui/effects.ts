import { useSyncExternalStore } from 'react'

/**
 * "Pause effects" switch shared by every canvas in the design. Defaults to
 * paused when the OS asks for reduced motion; the choice persists per session.
 */
const KEY = 'mercury-effects-paused'
const listeners = new Set<() => void>()

function initial(): boolean {
  if (typeof window === 'undefined') return false
  const stored = sessionStorage.getItem(KEY)
  if (stored !== null) return stored === '1'
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

let paused = initial()

export function setEffectsPaused(v: boolean) {
  paused = v
  sessionStorage.setItem(KEY, v ? '1' : '0')
  listeners.forEach((l) => l())
}

export function subscribePause(l: () => void) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

export const getEffectsPaused = () => paused

export function useEffectsPaused() {
  return useSyncExternalStore(subscribePause, getEffectsPaused, getEffectsPaused)
}
