import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * The original redesign (and the variants that copy its pages) ship element-level global CSS:
 * `* { margin:0; padding:0; box-sizing:border-box; overflow-x:hidden }`, `html, body { … }`,
 * `footer { position:absolute }` … Those rules are loaded with the app and would also hit the hub
 * (`/`) and the concept lab (`/lab`), which were designed without them.
 *
 * This build step leaves every such rule exactly as it is (same specificity, same order) but
 * makes it inert while `<html data-iso>` is set; the hub and lab hosts set that attribute while
 * they are mounted. Class-based rules are untouched, and files under src/hub, src/lab and
 * src/immersive (the kit, which has no global CSS) are skipped. No source file of the original is edited.
 */
const ISO = ':not([data-iso])'
const GLOBAL_START = /^(\*|html\b|body\b|:root\b|[a-z][a-z0-9-]*)/i

function scopeSelector(sel) {
  const s = sel.trim()
  const m = s.match(GLOBAL_START)
  if (!m) return s
  const head = m[1].toLowerCase()
  if (head === 'html' || head === ':root') return s.replace(m[1], `${m[1]}:where(${ISO})`)
  if (s === '*') return `:where(html${ISO}), :where(html${ISO}) *`
  return `:where(html${ISO}) ${s}`
}

const isolateGlobals = {
  postcssPlugin: 'dvm-isolate-globals',
  Once(root, { result }) {
    const file = (result.opts.from || '').split('?')[0].replace(/\\/g, '/')
    if (!file.includes('/src/') || /\/src\/(hub|lab|immersive)\//.test(file)) return
    root.walkRules((rule) => {
      const parent = rule.parent
      if (parent && parent.type === 'atrule' && /keyframes$/i.test(parent.name)) return
      rule.selectors = rule.selectors.map(scopeSelector)
    })
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  css: { postcss: { plugins: [isolateGlobals] } },
  build: {
    // Every route (variants, kit demos, the 9 lab designs) is its own lazy chunk. The big ones are
    // expected: @react-three/rapier (~2.3 MB, its physics WASM is inlined; only the lab's Fold design
    // loads it), three (~0.7 MB) and the entry (~0.8 MB: React, GSAP, the original redesign, the hub).
    chunkSizeWarningLimit: 2500,
  },
})
