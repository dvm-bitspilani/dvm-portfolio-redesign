import { projects, verticals, type Project } from '../../../data'

export function coverOf(p: Project): string {
  return p.cover ?? p.mockup ?? p.gallery?.[0] ?? (p.youtubeId ? `https://i.ytimg.com/vi/${p.youtubeId}/hqdefault.jpg` : '')
}

export const FEST_ORDER = ['APOGEE', 'Oasis', 'BOSM', 'Campus'] as const

export function festDir(p: Project) {
  return p.fest.toLowerCase()
}

export const KIND_TAG: Record<Project['kind'], string> = {
  website: 'web',
  app: 'app',
  portal: 'portal',
  video: 'video',
}

/** Projects in browser order: by fest, then year desc. */
export const ORDERED: Project[] = FEST_ORDER.flatMap((f) => projects.filter((p) => p.fest === f).sort((a, b) => (b.year ?? 0) - (a.year ?? 0)))

export function vertLabel(id: string) {
  return verticals.find((v) => v.id === id)?.label ?? id
}

export function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v))
}
