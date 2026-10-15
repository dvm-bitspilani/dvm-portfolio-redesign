import * as THREE from 'three'
import { useEffect, useMemo, useState, type RefObject } from 'react'

export const CYAN = new THREE.Color('#5ef2ff')
export const VIOLET = new THREE.Color('#7a5cff')
export const ICE = new THREE.Color('#d8fbff')

/** Mutable signal shared by a scene's controller and its materials (no React state per frame). */
export interface Signal {
  time: number
  power: number
  glitch: number
  build: number
  scatter: number
  scanY: number
  scanOn: number
  band: number
}

export const makeSignal = (): Signal => ({
  time: 0,
  power: 1,
  glitch: 0,
  build: 1,
  scatter: 0,
  scanY: -10,
  scanOn: 0,
  band: 0.11,
})

/** useMemo + dispose on unmount for GPU resources created imperatively. */
export function useDisposable<T extends { dispose: () => void }>(factory: () => T, deps: unknown[]): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo(factory, deps)
  useEffect(() => () => value.dispose(), [value])
  return value
}

export function useReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false,
  )
  useEffect(() => {
    const q = window.matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => setReduced(q.matches)
    q.addEventListener('change', on)
    return () => q.removeEventListener('change', on)
  }, [])
  return reduced
}

/** True while the element is (near) on screen and the tab is visible. */
export function useActive(ref: RefObject<HTMLElement | null>) {
  const [active, setActive] = useState(true)
  useEffect(() => {
    let inView = true
    const sync = () => setActive(inView && !document.hidden)
    const el = ref.current
    const io = new IntersectionObserver(([e]) => {
      inView = e.isIntersecting
      sync()
    }, { rootMargin: '80px' })
    if (el) io.observe(el)
    document.addEventListener('visibilitychange', sync)
    sync()
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', sync)
    }
  }, [ref])
  return active
}

export function useIsNarrow(px = 760) {
  const [narrow, setNarrow] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < px : false))
  useEffect(() => {
    const on = () => setNarrow(window.innerWidth < px)
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [px])
  return narrow
}

/** Load a texture imperatively (not via the shared useLoader cache) so we can dispose it. */
export function loadTexture(url: string, onLoad?: (t: THREE.Texture) => void) {
  const tex = new THREE.TextureLoader().load(url, (t) => {
    t.needsUpdate = true
    onLoad?.(t)
  })
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  tex.generateMipmaps = true
  tex.minFilter = THREE.LinearMipmapLinearFilter
  return tex
}

/** Canvas texture fallback for items without imagery: big title text on black. */
export function titleTexture(title: string, sub: string) {
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 640
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, c.width, c.height)
  ctx.strokeStyle = 'rgba(255,255,255,.25)'
  for (let i = 0; i < 24; i++) {
    ctx.beginPath()
    ctx.moveTo(0, i * 28)
    ctx.lineTo(c.width, i * 28)
    ctx.stroke()
  }
  ctx.fillStyle = '#fff'
  ctx.font = '300 92px "Unbounded Variable", sans-serif'
  ctx.textBaseline = 'middle'
  ctx.fillText(title, 64, 300, c.width - 128)
  ctx.font = '400 34px "JetBrains Mono Variable", monospace'
  ctx.fillStyle = 'rgba(255,255,255,.7)'
  ctx.fillText(sub, 66, 400, c.width - 128)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** Ease helpers. */
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3)
export const easeInCubic = (t: number) => Math.pow(Math.min(Math.max(t, 0), 1), 3)
