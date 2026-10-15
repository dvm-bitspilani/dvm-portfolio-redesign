import { useEffect } from 'react'
import { store, targetKey, type Target } from '../store'

/** Route → place in the space. The camera rig flies there. */
export function useTarget(t: Target) {
  const key = targetKey(t)
  useEffect(() => {
    store.set({ target: t, hoverItem: null })
  }, [key])
}

export const fmtKind = (k: string) => (k === 'portal' ? 'Portal' : k === 'app' ? 'App' : k === 'video' ? 'Film' : 'Website')
