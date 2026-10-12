import { lazy, Suspense, useMemo, useState, useEffect, type ComponentType } from 'react'
import { Link, useLocation, useParams, Navigate } from 'react-router-dom'

/**
 * Immersive branch plumbing.
 *  /kit/<name>      → src/immersive/kit/<name>/demo.tsx   (component sandboxes)
 *  /v/<id>/*        → src/variants/<id>/index.(jsx|tsx)   (full-site variants)
 *  everything else  → the original redesign App
 * Both are discovered automatically; nothing here needs editing.
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

const kitNames = Object.keys(kitDemos).map((p) => p.split('/')[2]).sort()
export const variants: VariantMeta[] = Object.values(variantMetas)
  .map((m) => m.default)
  .sort((a, b) => a.order - b.order)

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

/** Floating switcher between the original and the variants (press V to hide). */
export function VariantSwitcher() {
  const { pathname } = useLocation()
  const [hidden, setHidden] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, [contenteditable]')) return
      if (e.key === 'v' || e.key === 'V') setHidden((h) => !h)
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [])
  if (hidden) return null
  const current = pathname.startsWith('/v/') ? pathname.split('/')[2] : pathname.startsWith('/kit/') ? 'kit' : 'original'
  const item = (to: string, label: string, active: boolean) => (
    <Link key={to} to={to} style={{ ...s.item, ...(active ? s.active : null) }} onClick={() => setOpen(false)}>
      {label}
    </Link>
  )
  return (
    <div style={s.wrap}>
      {item('/', 'Original', current === 'original')}
      {variants.map((v) => item(`/v/${v.id}`, v.name, current === v.id))}
      {kitNames.length > 0 && (
        <button style={s.item} onClick={() => setOpen((o) => !o)}>
          Kit ▾
        </button>
      )}
      {open && <div style={s.menu}>{kitNames.map((k) => item(`/kit/${k}`, k, pathname === `/kit/${k}`))}</div>}
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  wrap: {
    position: 'fixed', left: 16, bottom: 16, zIndex: 100000, display: 'flex', gap: 2, padding: 4,
    borderRadius: 999, background: 'rgba(8,14,16,.78)', border: '1px solid rgba(120,220,235,.18)',
    backdropFilter: 'blur(12px)', font: '500 11px/1 ui-monospace, monospace', letterSpacing: '.06em',
  },
  item: { all: 'unset', cursor: 'pointer', padding: '8px 12px', borderRadius: 999, color: '#bfe9ef', whiteSpace: 'nowrap' },
  active: { background: '#5fd4e6', color: '#031417' },
  menu: {
    position: 'absolute', left: 0, bottom: 'calc(100% + 6px)', display: 'flex', flexDirection: 'column', padding: 4,
    borderRadius: 12, background: 'rgba(8,14,16,.92)', border: '1px solid rgba(120,220,235,.18)',
  },
}
