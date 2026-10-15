import { variants, variantReady, kitNames } from '../immersive/Hosts'
import { designs, designBase, DESIGN_PAGES } from '../lab/designs/registry'
import posterKeys from './posters.json'

/**
 * Everything the hub (and the switcher) lists. Variants, lab designs and kit sandboxes are
 * discovered from their registries, so new ones appear without touching this file; the texts
 * below only override the long meta summaries with one line for the ones we already know.
 */
export interface QuickLink {
  label: string
  to: string
}

export interface Entry {
  key: string
  /** Short code shown before the name, e.g. "V2". */
  code?: string
  name: string
  line: string
  to: string
  links: QuickLink[]
  poster?: string
  ready: boolean
  /** Lab designs: their accent colour and medium. */
  accent?: string
  medium?: string
}

const posters = new Set<string>(posterKeys as string[])
export const posterFor = (key: string) => (posters.has(key) ? `/hub/${key}.jpg` : undefined)

const firstSentence = (s: string) => {
  const m = s.match(/^.*?[.!?](\s|$)/)
  return (m ? m[0] : s).trim()
}

/** "V2 · Reframed" → { code: "V2", name: "Reframed" } */
export function splitName(full: string) {
  const [code, ...rest] = full.split(' · ')
  return rest.length ? { code, name: rest.join(' · ') } : { code: undefined, name: full }
}

const VARIANT_LINES: Record<string, string> = {
  v1: 'The original hero kept as it was, with the live mercury mark in place of the paper logo and an ASCII boot.',
  v2: 'A mercury lake hero and one live mark that turns to glass, then x-ray, then docks in the navbar on every page.',
  v3: 'One scroll story in which the mark changes medium: ASCII, mercury, particles, paper, then the archive wall.',
}

const VARIANT_LINKS: Record<string, [string, string][]> = {
  v1: [['About', 'about'], ['Team', 'team'], ['Archive', 'archive']],
  v2: [['Legacy', 'legacy'], ['Projects', 'projects'], ['Team', 'team'], ['Archive', 'archive'], ['Contact', 'contactus']],
  v3: [['Projects', 'projects'], ['Team', 'team'], ['Archive', 'archive']],
}
const DEFAULT_LINKS: [string, string][] = [['Projects', 'projects'], ['Team', 'team'], ['Legacy', 'legacy'], ['Archive', 'archive']]

export const original: Entry = {
  key: 'original',
  name: 'Original',
  line: 'The redesign as it is deployed today: paper logo, swipe page transitions and the poster menu.',
  to: '/original',
  links: [
    { label: 'About', to: '/original#about' },
    { label: 'Projects', to: '/original/projects' },
    { label: 'Team', to: '/original/team' },
    { label: 'Blog', to: '/original/blog' },
    { label: 'Artwork', to: '/original/artwork' },
  ],
  poster: posterFor('original'),
  ready: true,
}

export const variantEntries: Entry[] = variants.map((v) => {
  const { code, name } = splitName(v.name)
  const base = `/v/${v.id}`
  return {
    key: v.id,
    code,
    name,
    line: VARIANT_LINES[v.id] ?? firstSentence(v.summary),
    to: base,
    links: (VARIANT_LINKS[v.id] ?? DEFAULT_LINKS).map(([label, p]) => ({ label, to: `${base}/${p}` })),
    poster: posterFor(v.id),
    ready: variantReady(v.id),
  }
})

/** The chosen direction. */
export const FEATURED = 'v2'
/** Variants that belong to the first round (the redesign itself); the rest are new directions. */
const FIRST_ROUND = new Set(['v1', 'v2', 'v3'])
export const redesignEntries = variantEntries.filter((e) => FIRST_ROUND.has(e.key))
export const directionEntries = variantEntries.filter((e) => !FIRST_ROUND.has(e.key))

export const labEntries: Entry[] = designs.map((d) => ({
  key: `lab-${d.slug}`,
  name: d.name,
  line: d.tagline,
  medium: d.medium,
  accent: d.accent,
  to: designBase(d.slug),
  links: DESIGN_PAGES.filter((p) => p.path !== '').map((p) => ({ label: p.label, to: `${designBase(d.slug)}/${p.path}` })),
  poster: posterFor(`lab-${d.slug}`),
  ready: true,
}))

const KIT: Record<string, { name: string; component: string; line: string }> = {
  mercury: { name: 'Mercury', component: 'MercuryLogo', line: 'The DVM mark as raymarched liquid chrome. Pull droplets out with the cursor, click to drop a bead.' },
  ascii: { name: 'ASCII', component: 'AsciiLogo, AsciiBoot', line: 'The mark rendered in shape-matched ASCII on a CRT, with the boot sequence.' },
  timeline: { name: 'Origami timeline', component: 'FoldTimeline', line: 'A paper strip that unfolds into the year-by-year timeline as you scroll.' },
  swarm: { name: 'Swarm', component: 'SwarmField', line: 'GPGPU particles that morph between the logo, text and images, with a cursor black hole.' },
  archive: { name: 'Archive wall', component: 'ArchiveWall', line: 'Every project, blog and artwork on one infinite wall you pan and zoom.' },
}

export const kitEntries: Entry[] = kitNames.map((k) => ({
  key: `kit-${k}`,
  name: KIT[k]?.name ?? k,
  medium: KIT[k]?.component,
  line: KIT[k]?.line ?? 'Component sandbox.',
  to: `/kit/${k}`,
  links: [],
  poster: posterFor(`kit-${k}`),
  ready: true,
}))
