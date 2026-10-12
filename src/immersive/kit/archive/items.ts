// Default content of the wall (everything in src/immersive/data) and the built-in filters.
import { artworks, blogs, projects, site, team, verticals } from '../../data'
import type { Project } from '../../data'
import { DIMS } from './engine/dims'
import type { ArchiveFilterDef, ArchiveFilterInput, ArchiveItem } from './types'

const aspectOf = (src?: string) => {
  const d = src ? DIMS[src] : undefined
  return d ? d[0] / d[1] : undefined
}
const vLabel = (id: string) => verticals.find((v) => v.id === id)?.label ?? id

export interface BuildArchiveItemsOptions {
  /** Desktop + mobile screenshots and device mockups of each project. Default true. */
  screens?: boolean
  /** Team portraits. Default true. */
  members?: boolean
  artworks?: boolean
  essays?: boolean
  /** The "Write to DVM" tile pinned beside the origin. Default true. */
  contact?: boolean
}

/** Every DVM record as wall tiles. Pass options to leave groups out, or map/filter the result. */
export function buildArchiveItems(opts: BuildArchiveItemsOptions = {}): ArchiveItem[] {
  const { screens = true, members = true, artworks: withArt = true, essays = true, contact = true } = opts
  const out: ArchiveItem[] = []
  const projectRank = (p: Project) => (p.year ?? 2018) * 10 + (p.featured ? 5 : 0) + (p.kind === 'video' ? 0 : 2)

  for (const p of projects) {
    const film = p.kind === 'video'
    const when = [p.fest === 'Campus' ? 'Campus' : p.fest, p.year].filter(Boolean).join(' ')
    const kindWord = film ? 'Film' : p.kind[0].toUpperCase() + p.kind.slice(1)
    const line = `${kindWord}, ${when}`
    const category = film ? 'films' : 'work'
    const tags = [...p.verticals, p.fest.toLowerCase()]
    const rank = projectRank(p)
    const big = p.featured && !!p.cover
    out.push({
      id: p.slug,
      kind: film ? 'film' : 'project',
      category,
      title: p.title,
      line,
      image: p.cover,
      aspect: aspectOf(p.cover),
      size: big ? [5, 3] : [3, 2],
      rank,
      featured: p.featured,
      tags,
      href: p.links.live ?? p.links.playStore ?? p.links.youtube,
      text: p.cover ? undefined : { title: p.title, sub: line, tone: 'ink' },
      project: p,
    })
    if (!screens) continue
    if (p.mockup) {
      const a = aspectOf(p.mockup) ?? 16 / 9
      out.push({
        id: `${p.slug}.mockup`, kind: 'mockup', category, title: p.title, line: `Mockup of the ${p.kind}, ${when}`,
        image: p.mockup, aspect: a, size: a > 1.2 ? [3, 2] : [2, 2], rank: rank - 1, tags, parent: p.slug, project: p,
      })
    }
    p.gallery?.forEach((g, i) => {
      const d = DIMS[g]
      if (!d || d[0] < 400) return
      const a = d[0] / d[1]
      out.push({
        id: `${p.slug}.screen-${i + 1}`, kind: 'screen', category, title: p.title, line: `Desktop screen, ${when}`,
        image: g, aspect: a, size: a > 1.3 ? [3, 2] : a > 0.8 ? [2, 2] : [2, 3], cropY: 0, rank: rank - 2, tags, parent: p.slug, project: p,
      })
    })
    p.mobileGallery?.forEach((g, i) => {
      const d = DIMS[g]
      if (!d || d[0] < 250) return
      const a = d[0] / d[1]
      out.push({
        id: `${p.slug}.mobile-${i + 1}`, kind: 'mobile', category, title: p.title, line: `Mobile screen, ${when}`,
        image: g, aspect: a, size: [1, a > 0.42 ? 2 : 3], cropY: 0, rank: rank - 3, tags, parent: p.slug, project: p,
      })
    })
  }

  if (withArt)
    artworks.forEach((a, i) => {
      const r = aspectOf(a.image) ?? 4 / 3
      const big = i % 5 === 0
      const size: [number, number] =
        r >= 1.25 ? (big ? [4, 3] : [3, 2]) : r > 0.8 ? (big ? [3, 3] : [2, 2]) : big ? [3, 4] : [2, 3]
      out.push({
        id: a.slug, kind: 'artwork', category: 'art', title: a.title, line: `Artwork by ${a.artist}, ${a.year}`,
        image: a.image, aspect: r, size, rank: new Date(a.date).getTime() / 1e10, href: a.links.artwork, artwork: a,
      })
    })

  if (essays)
    for (const b of blogs)
      out.push({
        id: b.slug, kind: 'essay', category: 'journal', title: b.shortTitle ?? b.title,
        line: `Essay by ${b.authors.join(' & ')}, ${b.date}`, image: b.cover, aspect: aspectOf(b.cover), size: [3, 2],
        rank: new Date(b.isoDate).getTime() / 1e10 + 0.01, href: b.url, tags: b.tags.map((t) => t.toLowerCase()), blog: b,
      })

  if (members)
    for (const m of team) {
      const por = !!m.isPorHolder
      out.push({
        id: m.slug, kind: 'member', category: 'team', title: m.name,
        line: m.designation ?? `${vLabel(m.vertical)} team, joined ${m.batch}`,
        image: m.photo, aspect: 1, size: por ? [2, 2] : [1, 1], cropY: 0.35,
        rank: m.batch * 10 + (por ? 5 : 0), tags: [m.vertical], member: m,
      })
    }

  if (contact)
    out.push({
      id: 'contact', kind: 'contact', category: 'contact', title: 'Write to DVM', line: site.contact.email,
      size: [4, 2], pin: { x: 6, y: -7 }, href: `mailto:${site.contact.email}`,
      text: { title: 'Write to DVM', sub: site.contact.email, tone: 'accent' },
    })

  return out
}

/** Built-in tabs. Any other id falls back to `category === id || tags.includes(id)`. */
export const BUILTIN_FILTERS: Record<string, ArchiveFilterDef> = {
  all: { id: 'all', label: 'Everything', test: () => true },
  work: { id: 'work', label: 'Work', test: (i) => i.category === 'work' },
  films: { id: 'films', label: 'Films', test: (i) => i.category === 'films' },
  screens: { id: 'screens', label: 'Screens', test: (i) => i.kind === 'screen' || i.kind === 'mobile' || i.kind === 'mockup' },
  art: { id: 'art', label: 'Art', test: (i) => i.category === 'art' },
  journal: { id: 'journal', label: 'Journal', test: (i) => i.category === 'journal' },
  team: { id: 'team', label: 'Team', test: (i) => i.category === 'team' },
  contact: { id: 'contact', label: 'Contact', test: (i) => i.kind === 'contact' },
  apogee: { id: 'apogee', label: 'APOGEE' },
  bosm: { id: 'bosm', label: 'BOSM' },
  oasis: { id: 'oasis', label: 'Oasis' },
  ...Object.fromEntries(verticals.map((v) => [v.id, { id: v.id, label: v.label }])),
}

export const DEFAULT_FILTERS: string[] = ['all', 'work', 'films', 'art', 'journal', 'team']

export function resolveFilter(f: ArchiveFilterInput): Required<ArchiveFilterDef> {
  const def = typeof f === 'string' ? BUILTIN_FILTERS[f] ?? { id: f, label: f[0].toUpperCase() + f.slice(1) } : f
  const id = def.id
  return {
    id,
    label: def.label,
    test: def.test ?? BUILTIN_FILTERS[id]?.test ?? ((i: ArchiveItem) => i.category === id || !!i.tags?.includes(id)),
  }
}

let defaults: ArchiveItem[] | null = null
/** Memoised default items (stable identity across mounts). */
export function defaultArchiveItems() {
  return (defaults ??= buildArchiveItems())
}
