// WebGL failure handling for V8's two canvases (the live mark and the hero stage). A creation
// error is caught by chrome/GLBoundary.jsx; a lost context is reported through this hook so the
// same boundary can show its static fallback (and try a fresh context later).
import { useCallback, useRef } from 'react'
import type { RootState } from '@react-three/fiber'

/**
 * `onCreated` for a Canvas: calls `onLost` once if the browser drops the WebGL context.
 * R3F itself loses the context on purpose when a canvas unmounts (`forceContextLoss`, to free
 * it); that arrives after the canvas has left the document and is not a failure, so a detached
 * canvas never reports.
 */
export function useContextLoss(onLost?: () => void) {
  const ref = useRef(onLost)
  ref.current = onLost
  return useCallback((state: RootState) => {
    const el = state.gl.domElement
    const lost = (e: Event) => {
      if (!el.isConnected) return
      el.removeEventListener('webglcontextlost', lost)
      // (let the browser keep the context restorable; the boundary remounts a fresh canvas anyway)
      e.preventDefault()
      ref.current?.()
    }
    el.addEventListener('webglcontextlost', lost)
  }, [])
}
