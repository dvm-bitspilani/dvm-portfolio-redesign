// The year-by-year timeline content for V8, in one place so the team can extend it.
//
// Every stop is derived from the real records in src/immersive/data (projects, blogs, team,
// artworks); nothing here is written by hand except the field names. To add or correct a year,
// add to / edit the `OVERRIDES` map below: anything you put there is merged over the derived stop
// (entries are appended), so a hand-written note, headline or image wins.
//
// Each stop degrades gracefully: a year with no theme shows no theme line, no image shows no
// still, no intake shows no "joined" entry, and so on. A year with nothing shipped and no fest
// edition (e.g. a year that only has an intake) is not a stop of its own: its counts are folded
// into the next kept year's dossier as notes ("1 joined in 2017"), so no record is lost.
import { artworks, blogs, projects, team, type Fest, type Project } from '../../../immersive/data'
import { redesignProjectHref } from '../../../immersive/kit/timeline'
import type { FoldTimelineEntry, FoldTimelineStop } from '../../../immersive/kit/timeline'

export interface YearEdition {
  fest: Fest
  /** Fest theme, when a project of that edition records one. */
  theme?: string
}

export interface YearShipped {
  title: string
  kind: 'Website' | 'App' | 'Portal' | 'Film' | 'Essay'
  /** In-site route ("/projects/3") or an external link. */
  href?: string
  external?: boolean
}

export interface YearStop {
  year: number
  /** What is foil-stamped on the paper (≤ 7 characters reads best). Defaults to the year. */
  label?: string
  /** One short line printed under the year, e.g. a "first". */
  headline?: string
  /** Fest editions touched that year, with their themes where recorded. */
  editions: YearEdition[]
  /** Everything that shipped, websites first, then apps, portals, films, essays. */
  shipped: YearShipped[]
  /** Members whose batch is this year. */
  intake?: number
  /** Artworks published this year. */
  artworks?: number
  /** A still for the year: the first project of the year with a cover. */
  image?: { src: string; title: string }
  /** Counts folded in from earlier years that are not stops of their own. */
  folded?: { year: number; intake?: number; artworks?: number }[]
}

/** "1 joined in 2017", "3 artworks in 2016": one line per folded year. */
export function foldedNotes(s: YearStop) {
  const out: { year: number; joined?: string; art?: string }[] = []
  for (const f of s.folded ?? []) {
    out.push({
      year: f.year,
      joined: f.intake ? `${f.intake} joined in ${f.year}` : undefined,
      art: f.artworks ? `${f.artworks} ${f.artworks === 1 ? 'artwork' : 'artworks'} in ${f.year}` : undefined,
    })
  }
  return out
}

const KIND: Record<Project['kind'], YearShipped['kind']> = { website: 'Website', app: 'App', portal: 'Portal', video: 'Film' }
const RANK: Record<YearShipped['kind'], number> = { Website: 0, App: 1, Portal: 2, Film: 3, Essay: 4 }
const FEST_ORDER: Fest[] = ['APOGEE', 'BOSM', 'Oasis', 'Campus']

function thumb(p: Project) {
  if (p.cover) return p.cover
  if (p.youtubeId) return `https://img.youtube.com/vi/${p.youtubeId}/hqdefault.jpg`
  return undefined
}

function deriveYears(): YearStop[] {
  const byYear = new Map<number, YearStop>()
  const at = (y: number) => {
    let s = byYear.get(y)
    if (!s) {
      s = { year: y, editions: [], shipped: [] }
      byYear.set(y, s)
    }
    return s
  }

  const dated = projects.filter((p): p is Project & { year: number } => typeof p.year === 'number').sort((a, b) => a.year - b.year)
  for (const p of dated) {
    const s = at(p.year)
    const href = redesignProjectHref(p)
    s.shipped.push({ title: p.title, kind: KIND[p.kind], href, external: !!href && /^https?:\/\//.test(href) })
    let ed = s.editions.find((e) => e.fest === p.fest)
    if (!ed) {
      ed = { fest: p.fest }
      s.editions.push(ed)
    }
    if (p.theme && !ed.theme) ed.theme = p.theme
    if (!s.image) {
      const src = thumb(p)
      if (src) s.image = { src, title: p.title }
    }
  }

  // firsts, in the order they happened
  const seen = new Set<string>()
  for (const p of dated) {
    const key = `first-${p.kind}`
    if (seen.has(key) || p.kind === 'website') continue
    seen.add(key)
    const s = at(p.year)
    if (s.headline) continue
    s.headline = p.kind === 'app' ? `First fest app on record: ${p.title}` : p.kind === 'portal' ? `First campus portal: ${p.title}` : `First fest film on record: ${p.title}`
  }

  for (const b of [...blogs].sort((a, c) => a.isoDate.localeCompare(c.isoDate))) {
    const y = Number(b.isoDate.slice(0, 4))
    if (!y) continue
    at(y).shipped.push({ title: b.shortTitle ?? b.title, kind: 'Essay', href: b.url, external: true })
  }

  for (const m of team) {
    const s = at(m.batch)
    s.intake = (s.intake ?? 0) + 1
  }
  for (const a of artworks) {
    if (!a.year) continue
    const s = at(a.year)
    s.artworks = (s.artworks ?? 0) + 1
  }

  for (const s of byYear.values()) {
    s.shipped.sort((a, b) => RANK[a.kind] - RANK[b.kind])
    s.editions.sort((a, b) => FEST_ORDER.indexOf(a.fest) - FEST_ORDER.indexOf(b.fest))
  }
  return [...byYear.values()].sort((a, b) => a.year - b.year)
}

/** A hand-written addition to one year (the year itself is the key, never a field). */
export type YearOverride = Omit<Partial<YearStop>, 'year'>

/**
 * Hand-written additions, keyed by year. Merged over the derived stop; `shipped` and `editions`
 * are appended, everything else replaces. A year with no records of its own becomes a stop when
 * its override gives it something shipped or a fest edition. Example:
 *   2019: { headline: 'The year the app went to both stores', image: { src: '/assets/…', title: '…' } }
 */
export const OVERRIDES: Readonly<Record<number, YearOverride>> = {}

function mergeOverrides(derived: YearStop[]): YearStop[] {
  const byYear = new Map(derived.map((s) => [s.year, s]))
  for (const [key, o] of Object.entries(OVERRIDES)) {
    const year = Number(key)
    const s = byYear.get(year) ?? { year, editions: [], shipped: [] }
    byYear.set(year, { ...s, ...o, year, shipped: [...s.shipped, ...(o.shipped ?? [])], editions: [...s.editions, ...(o.editions ?? [])] })
  }
  return [...byYear.values()].sort((a, b) => a.year - b.year)
}

const MERGED = mergeOverrides(deriveYears())

/** Keep a year only if something shipped or a fest edition is recorded; fold the rest forward. */
function foldQuietYears(all: YearStop[]): YearStop[] {
  const kept: YearStop[] = []
  let carry: NonNullable<YearStop['folded']> = []
  for (const s of all) {
    const quiet = s.shipped.length === 0 && s.editions.length === 0
    if (quiet) {
      if (s.intake || s.artworks) carry.push({ year: s.year, intake: s.intake, artworks: s.artworks })
      continue
    }
    kept.push(carry.length ? { ...s, folded: [...(s.folded ?? []), ...carry] } : s)
    carry = []
  }
  // quiet years after the last kept one: fold them back into it
  if (carry.length && kept.length) {
    const last = kept[kept.length - 1]
    kept[kept.length - 1] = { ...last, folded: [...(last.folded ?? []), ...carry] }
  }
  return kept
}

/** Every kept year, oldest first (the /legacy and /about strips read in this order). */
export const YEARS: readonly YearStop[] = foldQuietYears(MERGED)

/**
 * The same years, most recent first: the home page's year-by-year stage opens on the latest year,
 * so a reader who skips ahead still sees it. Index i here is stop i of that stage's timeline.
 */
export const YEARS_LATEST_FIRST: readonly YearStop[] = [...YEARS].reverse()

/** Human summary of a year's output: "2 websites, 1 app, 3 films". */
export function shippedSummary(s: YearStop) {
  const counts = new Map<YearShipped['kind'], number>()
  for (const x of s.shipped) counts.set(x.kind, (counts.get(x.kind) ?? 0) + 1)
  const plural: Record<YearShipped['kind'], [string, string]> = {
    Website: ['website', 'websites'],
    App: ['app', 'apps'],
    Portal: ['portal', 'portals'],
    Film: ['film', 'films'],
    Essay: ['essay', 'essays'],
  }
  return [...counts.entries()].map(([k, n]) => `${n} ${plural[k][n === 1 ? 0 : 1]}`).join(', ')
}

/**
 * The same years as FoldTimeline stops. `scope` rewrites in-site hrefs so the kit's links stay
 * inside the variant (e.g. "/projects/3" → "/v/v8/projects/3").
 */
export function toFoldStops(years: readonly YearStop[], scope: (href: string) => string = (h) => h): FoldTimelineStop[] {
  return years.map((s) => {
    const entries: FoldTimelineEntry[] = []
    for (const e of s.editions) if (e.theme) entries.push({ id: `${s.year}-${e.fest}-theme`, label: `“${e.theme}”`, kind: `${e.fest} theme` })
    for (const x of s.shipped) {
      const href = x.href && !x.external ? scope(x.href) : x.href
      entries.push({ id: `${s.year}-${x.kind}-${x.title}`, label: x.title, kind: x.kind, href, external: x.external })
    }
    if (s.intake) entries.push({ id: `${s.year}-intake`, label: `${s.intake} ${s.intake === 1 ? 'member' : 'members'} joined`, kind: 'Team', href: scope('/team') })
    if (s.artworks) entries.push({ id: `${s.year}-art`, label: `${s.artworks} ${s.artworks === 1 ? 'artwork' : 'artworks'} published`, kind: 'Art', href: scope('/artwork') })
    for (const f of foldedNotes(s)) {
      if (f.joined) entries.push({ id: `${s.year}-intake-${f.year}`, label: f.joined, kind: 'Team', href: scope('/team') })
      if (f.art) entries.push({ id: `${s.year}-art-${f.year}`, label: f.art, kind: 'Art', href: scope('/artwork') })
    }
    const note = [s.headline, s.shipped.length ? `${shippedSummary(s)} shipped` : undefined].filter(Boolean).join(' · ')
    return { year: s.year, label: s.label, note: note || undefined, entries }
  })
}
