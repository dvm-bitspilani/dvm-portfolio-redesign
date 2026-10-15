import { blogs, projects } from '../../../data'

export interface TimelineItem {
  label: string
  kind: string
  /** internal route (relative to the design base) or external url */
  to: string
  external?: boolean
}

export interface TimelineYear {
  year: number
  items: TimelineItem[]
  /** position along the strip, 0..1 */
  u: number
}

const KIND: Record<string, string> = { website: 'Website', app: 'App', portal: 'Portal', video: 'Film' }

/** DVM's archive, year by year, from src/data (projects + blog posts). */
export function buildTimeline(): TimelineYear[] {
  const byYear = new Map<number, TimelineItem[]>()
  for (const p of projects) {
    if (!p.year) continue
    const list = byYear.get(p.year) ?? []
    list.push({ label: p.title, kind: KIND[p.kind] ?? p.kind, to: `work/${p.slug}` })
    byYear.set(p.year, list)
  }
  for (const b of blogs) {
    const y = Number(b.isoDate.slice(0, 4))
    const list = byYear.get(y) ?? []
    list.push({ label: b.shortTitle ?? b.title, kind: 'Essay', to: b.url, external: true })
    byYear.set(y, list)
  }
  const years = [...byYear.keys()].sort((a, b) => a - b)
  const u0 = 0.075
  const u1 = 0.93
  return years.map((year, i) => ({
    year,
    items: byYear.get(year)!,
    u: u0 + ((u1 - u0) * i) / Math.max(1, years.length - 1),
  }))
}
