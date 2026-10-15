import { lazy, Suspense, useMemo, type ComponentType } from 'react'
import { Route, Routes, useParams, Navigate } from 'react-router-dom'
import { designs, LAB_BASE } from './designs/registry'
import Gallery from './gallery/Gallery'
import DesignHUD from './shared/DesignHUD'
import { useIsolation } from '../hub/isolation'
import './lab.css'

/**
 * The DVM Hero Lab (copied from ../dvm-hero-lab), mounted at /lab:
 *   /lab               → the gallery of the nine concepts
 *   /lab/d/<slug>/*    → a design, with the lab HUD on top
 * While mounted, <html data-iso="lab"> switches on the lab's own reset (lab.css) and switches
 * off the original redesign's element-level CSS (see vite.config.js).
 */
const lazyCache = new Map<string, ComponentType>()

function DesignHost() {
  const { slug = '' } = useParams()
  const entry = designs.find((d) => d.slug === slug)
  const Design = useMemo(() => {
    if (!entry) return null
    if (!lazyCache.has(entry.slug)) lazyCache.set(entry.slug, lazy(entry.load))
    return lazyCache.get(entry.slug)!
  }, [entry])

  if (!entry || !Design) return <Navigate to={LAB_BASE} replace />
  return (
    <>
      <Suspense fallback={<div className="lab-loading">loading {entry.name}…</div>}>
        <Design key={entry.slug} />
      </Suspense>
      <DesignHUD current={entry} />
    </>
  )
}

export default function LabHost() {
  useIsolation('lab')
  return (
    <div className="lab-host">
      <Routes>
        <Route index element={<Gallery />} />
        <Route path="d/:slug/*" element={<DesignHost />} />
        <Route path="*" element={<Navigate to={LAB_BASE} replace />} />
      </Routes>
    </div>
  )
}
