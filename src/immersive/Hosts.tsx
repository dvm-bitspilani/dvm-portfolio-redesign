import { lazy, Suspense, useMemo, type ComponentType } from 'react'
import { useParams, Navigate } from 'react-router-dom'

/**
 * Immersive branch plumbing.
 *  /kit/<name>      → src/immersive/kit/<name>/demo.tsx   (component sandboxes)
 *  /v/<id>/*        → src/variants/<id>/index.(jsx|tsx)   (full-site variants)
 * Both are discovered automatically; nothing here needs editing. The hub (/), the original
 * (/original/*) and the lab (/lab/*) are routed in src/main.jsx; the switcher is src/hub/Switcher.tsx.
 */

type Mod = { default: ComponentType }
const kitDemos = import.meta.glob<Mod>('./kit/*/demo.tsx')
const variantMods = import.meta.glob<Mod>('../variants/*/index.{jsx,tsx}')
const variantMetas = import.meta.glob<{ default: VariantMeta }>('../variants/*/meta.ts', { eager: true })

export interface VariantMeta {
  id: string
  order: number
  name: string
  summary: string
}

export const kitNames = Object.keys(kitDemos).map((p) => p.split('/')[2]).sort()
export const variants: VariantMeta[] = Object.values(variantMetas)
  .map((m) => m.default)
  .sort((a, b) => a.order - b.order)

/** A variant can be opened once its index module exists (a meta.ts alone = still being built). */
export const variantReady = (id: string) =>
  Boolean(variantMods[`../variants/${id}/index.tsx`] ?? variantMods[`../variants/${id}/index.jsx`])

const cache = new Map<string, ComponentType>()
function lazyFrom(key: string, loader?: () => Promise<Mod>) {
  if (!loader) return null
  if (!cache.has(key)) cache.set(key, lazy(loader))
  return cache.get(key)!
}

const fallback = <div style={{ position: 'fixed', inset: 0, background: '#000' }} />

export function KitHost() {
  const { name = '' } = useParams()
  const Demo = useMemo(() => lazyFrom(`kit:${name}`, kitDemos[`./kit/${name}/demo.tsx`]), [name])
  if (!Demo) return <Navigate to="/" replace />
  return (
    <Suspense fallback={fallback}>
      <Demo />
    </Suspense>
  )
}

export function VariantHost() {
  const { id = '' } = useParams()
  const Variant = useMemo(() => {
    const loader = variantMods[`../variants/${id}/index.tsx`] ?? variantMods[`../variants/${id}/index.jsx`]
    return lazyFrom(`variant:${id}`, loader)
  }, [id])
  if (!Variant) return <Navigate to="/" replace />
  return (
    <Suspense fallback={fallback}>
      <Variant key={id} />
    </Suspense>
  )
}
