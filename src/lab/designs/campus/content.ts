import { artworks, blogs, projects, team, verticals } from '../../data'
import type { Fest, Member, Project, VerticalId } from '../../data'
import { designBase } from '../registry'

export const BASE = designBase('campus')

export type BuildingId = 'studio' | 'amphi' | 'library' | 'tower' | 'monument'
export type ViewKind = 'home' | 'work' | 'project' | 'team' | 'journal' | 'contact'

export interface View {
  kind: ViewKind
  /** project slug for `project`, member slug for `team`, `b:slug`/`a:slug` for journal. */
  focus?: string
}

export const VIEW_BUILDING: Record<ViewKind, BuildingId | null> = {
  home: null,
  work: 'studio',
  project: 'studio',
  team: 'amphi',
  journal: 'library',
  contact: 'tower',
}

export const BUILDINGS: { id: BuildingId; route: string; name: string; sub: string }[] = [
  { id: 'studio', route: 'work', name: 'The Studio', sub: `Work, ${projects.length} projects` },
  { id: 'amphi', route: 'team', name: 'The Amphitheatre', sub: `Team, ${team.length} people` },
  { id: 'library', route: 'journal', name: 'The Library', sub: `Journal, ${blogs.length + artworks.length} pieces` },
  { id: 'tower', route: 'contact', name: 'The Clock Tower', sub: 'Contact, send a signal' },
  { id: 'monument', route: '', name: 'We are DVM', sub: 'About the department' },
]

/** Fest tints used for poster placeholders and list markers. */
export const FEST_COLOR: Record<Fest, string> = {
  APOGEE: '#6f8bff',
  Oasis: '#ff7aa8',
  BOSM: '#ff8a4c',
  Campus: '#ffb547',
}

export const VERTICAL_ORDER: VerticalId[] = ['frontend', 'backend', 'app', 'design', 'video']
export const VERTICAL_COLOR: Record<VerticalId, string> = {
  frontend: '#5ec8ff',
  backend: '#7fe8a2',
  app: '#ff8fb8',
  design: '#ffc35c',
  video: '#b69bff',
}
export const verticalById = Object.fromEntries(verticals.map((v) => [v.id, v])) as Record<VerticalId, (typeof verticals)[number]>

/** Projects in exhibition order: newest first (undated last). */
export const exhibitProjects: Project[] = [...projects].sort((a, b) => (b.year ?? 0) - (a.year ?? 0))

export const FEST_ORDER: Fest[] = ['APOGEE', 'Oasis', 'BOSM', 'Campus']
export const projectsByFest = FEST_ORDER.map((f) => ({ fest: f, items: exhibitProjects.filter((p) => p.fest === f) })).filter(
  (g) => g.items.length > 0,
)

/** Members in seating order: by vertical (wedge), newest batch nearest the stage within a wedge is handled by layout. */
export const seatedMembers: Member[] = VERTICAL_ORDER.flatMap((v) =>
  team.filter((m) => m.vertical === v).sort((a, b) => b.batch - a.batch || a.name.localeCompare(b.name)),
)

/** Journal exhibits: blogs on the shelf first, then artworks on the walls. */
export const journalItems = [
  ...blogs.map((b) => ({ key: `b:${b.slug}`, kind: 'blog' as const, image: b.cover, title: b.title, blog: b })),
  ...artworks.map((a) => ({ key: `a:${a.slug}`, kind: 'art' as const, image: a.image, title: a.title, art: a })),
]

export const kindLabel: Record<Project['kind'], string> = {
  website: 'Website',
  app: 'App',
  portal: 'Portal',
  video: 'Film',
}

export function istTime(d = new Date()) {
  const utc = d.getTime() + d.getTimezoneOffset() * 60000
  return new Date(utc + 5.5 * 3600000)
}

export function formatIst(d = new Date()) {
  const t = istTime(d)
  let h = t.getHours()
  const m = t.getMinutes()
  const ampm = h >= 12 ? 'pm' : 'am'
  h = h % 12 || 12
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`
}
