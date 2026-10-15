import type { ComponentType } from 'react'

/**
 * Each design lives in src/designs/<slug>/ and provides:
 *   meta.ts   — default export DesignMeta
 *   index.tsx — default export component rendering its own <Routes> for
 *               the pages listed in DESIGN_PAGES (paths relative to /lab/d/<slug>/)
 * Designs are discovered automatically; nothing here needs editing.
 */
export interface DesignMeta {
  slug: string
  order: number
  name: string
  tagline: string
  /** Primary medium / technique, e.g. "Three.js hologram shader". */
  medium: string
  /** Accent colour used by the gallery + HUD. */
  accent: string
  description: string
}

export const DESIGN_PAGES = [
  { path: '', label: 'Home' },
  { path: 'work', label: 'Work' },
  { path: 'team', label: 'Team' },
  { path: 'journal', label: 'Journal' },
  { path: 'contact', label: 'Contact' },
] as const

const metas = import.meta.glob<{ default: DesignMeta }>('./*/meta.ts', { eager: true })
const modules = import.meta.glob<{ default: ComponentType }>('./*/index.tsx')

export interface DesignEntry extends DesignMeta {
  load: () => Promise<{ default: ComponentType }>
}

export const designs: DesignEntry[] = Object.entries(metas)
  .map(([path, m]) => {
    const dir = path.replace('/meta.ts', '')
    const load = modules[`${dir}/index.tsx`] as DesignEntry['load'] | undefined
    return load ? { ...m.default, load } : null
  })
  .filter((d): d is DesignEntry => d !== null)
  .sort((a, b) => a.order - b.order)

/** Where the lab lives inside the DVM preview app. */
export const LAB_BASE = '/lab'

export const designBase = (slug: string) => `${LAB_BASE}/d/${slug}`
