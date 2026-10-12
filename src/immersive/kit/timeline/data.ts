import { blogs, projects, team, type Project, type Blog } from '../../data'
import type { FoldTimelineEntry, FoldTimelineStop } from './types'

const KIND: Record<string, string> = { website: 'Website', app: 'App', portal: 'Portal', video: 'Film' }

/* The redesign's project pages live at /projects/<pk of src/projects.json>. Match by name. */
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
const redesignProjects = import.meta.glob<{ pk: number; fields: { name: string } }[]>('/src/projects.json', {
  eager: true,
  import: 'default',
})
const pkByName = new Map<string, number>()
for (const list of Object.values(redesignProjects)) for (const p of list) pkByName.set(norm(p.fields.name), p.pk)

/** Route of a project on the redesign (`/projects/:pk`), or its live / YouTube link when it has no page there. */
export function redesignProjectHref(p: Project): string | undefined {
  const pk = pkByName.get(norm(p.title))
  if (pk != null) return `/projects/${pk}`
  return p.links.live ?? p.links.youtube ?? p.links.playStore
}

export interface ArchiveOptions {
  includeBlogs?: boolean
  projectHref?: (p: Project) => string | undefined
  blogHref?: (b: Blog) => string | undefined
}

/** DVM's archive, year by year: every dated project and blog post (oldest first). */
export function buildArchiveStops(opts: ArchiveOptions = {}): FoldTimelineStop[] {
  const { includeBlogs = true, projectHref = redesignProjectHref, blogHref = (b) => b.url } = opts
  const byYear = new Map<number, FoldTimelineEntry[]>()
  const push = (y: number, e: FoldTimelineEntry) => {
    const list = byYear.get(y) ?? []
    list.push(e)
    byYear.set(y, list)
  }
  for (const p of projects) {
    if (!p.year) continue
    push(p.year, { id: p.slug, label: p.title, kind: KIND[p.kind] ?? p.kind, href: projectHref(p), data: p })
  }
  if (includeBlogs)
    for (const b of blogs)
      push(Number(b.isoDate.slice(0, 4)), {
        id: b.slug,
        label: b.shortTitle ?? b.title,
        kind: 'Essay',
        href: blogHref(b),
        external: true,
        data: b,
      })
  // websites and apps first, then films, then essays
  const rank: Record<string, number> = { Website: 0, App: 1, Portal: 2, Film: 3, Essay: 4 }
  return [...byYear.keys()]
    .sort((a, b) => a - b)
    .map((year) => ({
      year,
      entries: byYear.get(year)!.sort((a, b) => (rank[a.kind ?? ''] ?? 9) - (rank[b.kind ?? ''] ?? 9)),
    }))
}

/**
 * A second, history-flavoured set of stops derived from the same data: fest themes,
 * firsts (first app, first portal, first essay), and who joined the team each year.
 * Shows how custom milestones read on the strip.
 */
export function buildMilestoneStops(): FoldTimelineStop[] {
  const byYear = new Map<number, { entries: FoldTimelineEntry[]; note?: string }>()
  const at = (y: number) => {
    if (!byYear.has(y)) byYear.set(y, { entries: [] })
    return byYear.get(y)!
  }
  const seen = new Set<string>()
  const dated = projects.filter((p) => p.year).sort((a, b) => a.year! - b.year!)
  for (const p of dated) {
    if (p.theme) at(p.year!).entries.push({ id: `theme-${p.slug}`, label: `“${p.theme}”`, kind: `${p.fest} theme`, href: redesignProjectHref(p), data: p })
    const firstKey = `first-${p.kind}`
    if (!seen.has(firstKey) && p.kind !== 'website') {
      seen.add(firstKey)
      const what = p.kind === 'app' ? 'First fest app' : p.kind === 'portal' ? 'First campus portal' : 'First fest film on record'
      at(p.year!).entries.push({ id: firstKey, label: `${what}: ${p.title}`, kind: 'First', href: redesignProjectHref(p), data: p })
    }
  }
  const firstBlog = [...blogs].sort((a, b) => a.isoDate.localeCompare(b.isoDate))[0]
  if (firstBlog)
    at(Number(firstBlog.isoDate.slice(0, 4))).entries.push({
      id: 'first-essay',
      label: `First essay: ${firstBlog.shortTitle ?? firstBlog.title}`,
      kind: 'First',
      href: firstBlog.url,
      external: true,
      data: firstBlog,
    })
  const batches = new Map<number, number>()
  for (const m of team) batches.set(m.batch, (batches.get(m.batch) ?? 0) + 1)
  for (const [y, n] of batches) {
    const s = at(y)
    s.entries.push({ id: `batch-${y}`, label: `${n} ${n === 1 ? 'member' : 'members'} joined`, kind: 'Team', href: '/team' })
  }
  const counts = new Map<number, number>()
  for (const p of dated) counts.set(p.year!, (counts.get(p.year!) ?? 0) + 1)
  for (const [y, n] of counts) at(y).note = `${n} ${n === 1 ? 'piece' : 'pieces'} shipped`
  return [...byYear.keys()]
    .sort((a, b) => a - b)
    .map((year) => ({ year, entries: byYear.get(year)!.entries, note: byYear.get(year)!.note }))
}

export const stopLabel = (s: FoldTimelineStop) => s.label ?? String(s.year)
export const entryKey = (e: FoldTimelineEntry, i: number) => e.id ?? `${e.label}-${i}`
export const isExternal = (e: FoldTimelineEntry) => e.external ?? (!!e.href && /^https?:\/\//.test(e.href))
