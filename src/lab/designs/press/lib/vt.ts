import { useCallback } from 'react'
import { flushSync } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { designBase } from '../../registry'

export const BASE = designBase('press')
export const href = (p = '') => (p ? `${BASE}/${p}` : BASE)

type VTDoc = Document & {
  startViewTransition?: (cb: () => void) => { finished: Promise<void>; ready: Promise<void> }
}

const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Navigate with the View Transitions API. The clicked element (or its
 * [data-vt-source] child) is named `press-title` in the old snapshot and the
 * destination page's [data-vt-title] carries the same name in the new one, so
 * the nav word / index row morphs into the page headline. Falls back to a plain
 * navigation where the API is missing or motion is reduced.
 */
export function useVTNavigate() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  return useCallback(
    (to: string, source?: HTMLElement | null) => {
      if (to.replace(/\/$/, '') === pathname.replace(/\/$/, '')) {
        window.scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' })
        return
      }
      const doc = document as VTDoc
      if (!doc.startViewTransition || reduced()) {
        navigate(to)
        window.scrollTo(0, 0)
        return
      }
      const titles = Array.from(document.querySelectorAll<HTMLElement>('.press-root [data-vt-title]'))
      titles.forEach((t) => (t.style.viewTransitionName = 'none'))
      if (source) source.style.viewTransitionName = 'press-title'
      const root = document.documentElement
      root.classList.add('press-vt')
      try {
        const t = doc.startViewTransition(() => {
          flushSync(() => navigate(to))
          if (source) source.style.viewTransitionName = ''
          // elements React reused across the route change must get their name back
          titles.forEach((el) => (el.style.viewTransitionName = ''))
          window.scrollTo(0, 0)
        })
        t.finished.finally(() => {
          root.classList.remove('press-vt')
        })
      } catch {
        root.classList.remove('press-vt')
        navigate(to)
      }
    },
    [navigate, pathname],
  )
}
