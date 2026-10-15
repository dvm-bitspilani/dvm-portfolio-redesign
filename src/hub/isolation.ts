import { useLayoutEffect } from 'react'

/**
 * Marks <html data-iso="…"> while the calling host is mounted. vite.config.js makes the original
 * redesign's element-level CSS (`* {…}`, `html, body {…}`, `footer {…}`) inert while the attribute
 * is present, so the hub and the lab render on a clean page.
 */
export function useIsolation(name: 'hub' | 'lab') {
  useLayoutEffect(() => {
    const html = document.documentElement
    html.setAttribute('data-iso', name)
    return () => {
      if (html.getAttribute('data-iso') === name) html.removeAttribute('data-iso')
    }
  }, [name])
}
