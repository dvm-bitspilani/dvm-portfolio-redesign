import * as THREE from 'three'
import { useEffect, useState } from 'react'

const cache = new Map<string, { tex: THREE.Texture; loaded: boolean; subs: Set<() => void> }>()
const loader = new THREE.TextureLoader()

function entry(url: string) {
  let e = cache.get(url)
  if (!e) {
    const subs = new Set<() => void>()
    const rec = { tex: null as unknown as THREE.Texture, loaded: false, subs }
    rec.tex = loader.load(
      url,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace
        t.anisotropy = 4
        t.needsUpdate = true
        rec.loaded = true
        subs.forEach((s) => s())
      },
      undefined,
      () => {
        /* missing image: keep the placeholder colour */
      },
    )
    rec.tex.colorSpace = THREE.SRGBColorSpace
    e = rec
    cache.set(url, e)
  }
  return e
}

/** Lazily-loaded shared texture. Returns null until `enabled`, then the texture (+ loaded flag). */
export function useTex(url: string | undefined, enabled: boolean): { tex: THREE.Texture | null; aspect: number } {
  const [, force] = useState(0)
  const e = url && enabled ? entry(url) : null
  useEffect(() => {
    if (!e || e.loaded) return
    const s = () => force((n) => n + 1)
    e.subs.add(s)
    return () => {
      e.subs.delete(s)
    }
  }, [e])
  if (!e || !e.loaded) return { tex: null, aspect: 0 }
  const img = e.tex.image as { width: number; height: number } | undefined
  return { tex: e.tex, aspect: img && img.height ? img.width / img.height : 0 }
}

export function disposeTextures() {
  cache.forEach((e) => e.tex.dispose())
  cache.clear()
}
