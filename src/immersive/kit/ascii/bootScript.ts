import { artworks, batches, blogs, fests, projects, site, team, verticals } from '../../data'
import { B_BRIGHT, B_MID, B_NORM } from './core/grid'

/**
 * The POST script, built from the real DVM content. Each step is revealed at `t`
 * (seconds, before the speed multiplier) and animates for `dur`.
 */
export interface BootLineOut {
  text: string
  b?: number
}
export interface BootStep {
  t: number
  dur: number
  render: (p: number, narrow: boolean) => BootLineOut
}

/** Author your own: plain strings appear one per beat; functions animate over `dur`. */
export type BootLine = string | { text: string | ((p: number, narrow: boolean) => string); dur?: number; gap?: number; bright?: boolean }

const builds = projects.filter((p) => p.kind !== 'video').length
const videos = projects.length - builds
const festCount = (f: string) => projects.filter((p) => p.fest === f).length
const asc = [...batches].sort((a, b) => a - b)
const since = (id: string) => {
  const m = fests.find((f) => f.id === id)?.blurb.match(/since[^0-9]*(\d{4})/i)
  return m ? m[1] : ''
}

function dots(label: string, width: number, p: number) {
  const n = Math.max(2, width - label.length)
  return label + ' ' + '.'.repeat(Math.floor((n - 1) * Math.min(1, p)))
}
const ok = (p: number) => (p >= 1 ? ' OK' : '')

export function defaultScript(): BootStep[] {
  const s: BootStep[] = []
  let t = 0.1
  const add = (dur: number, render: BootStep['render'], gap = 0.05) => {
    s.push({ t, dur, render })
    t += dur + gap
  }
  const line = (text: string, b = B_NORM) => () => ({ text, b })
  const W = (n: boolean) => (n ? 30 : 64)
  add(0, line('DVM BIOS v26.10, visual media terminal', B_BRIGHT))
  add(0, line(`Copyright (C) 2017-2026 ${site.fullName}, ${site.institution}`, B_MID))
  add(0, line(''), 0.1)
  add(0, (_p, n) => ({ text: n ? `CPU  : ${verticals.length} teams` : `Main Processor : ${verticals.length} teams (${verticals.map((v) => v.label).join(', ')})` }))
  add(0.45, (p, n) => {
    const v = Math.floor(team.length * Math.min(1, p * 1.1))
    return { text: `${n ? 'MEM  : ' : 'Memory Testing : '}${String(v).padStart(3, ' ')} members${ok(p)}`, b: B_BRIGHT }
  })
  add(0.25, (p, n) => {
    const k = Math.ceil(asc.length * p)
    return { text: (n ? 'BAT  : ' : 'Batches        : ') + (n ? `${asc[0]}-${asc[Math.max(0, k - 1)]}` : asc.slice(0, k).join(' ')) }
  })
  add(0, line(''), 0.06)
  add(0.15, (p) => ({ text: 'Detecting fests' + '.'.repeat(Math.floor(p * 3)) }))
  const slots: [string, string, string, string][] = [
    ['Primary Master  ', 'BOSM  ', `open sports meet${since('BOSM') ? `, since ${since('BOSM')}` : ''}`, 'BOSM'],
    ['Primary Slave   ', 'Oasis ', '96 hours of culture', 'Oasis'],
    ['Secondary Master', 'APOGEE', 'technical extravaganza', 'APOGEE'],
    ['Secondary Slave ', 'Campus', 'portals & tools', 'Campus'],
  ]
  for (const [slot, name, desc, id] of slots)
    add(0.2, (p, n) => {
      const c = festCount(id)
      const label = n ? `  ${name}` : `  ${slot} : ${name} ${desc}`
      return { text: dots(label, W(n), p) + (p >= 1 ? ` ${c} builds OK` : '') }
    })
  add(0, line(''), 0.06)
  add(0.22, (p, n) => ({ text: dots(n ? `/work ${projects.length}` : `Mounting /work     ${projects.length} projects (${builds} builds, ${videos} videos)`, W(n), p) + ok(p) }))
  add(0.2, (p, n) => ({ text: dots(n ? `/journal ${blogs.length + artworks.length}` : `Mounting /journal  ${blogs.length} posts, ${artworks.length} artworks`, W(n), p) + ok(p) }))
  add(0.2, (p, n) => ({ text: dots(n ? 'users 5000+' : 'Load average       5000+ users on our apps and websites', W(n), p) + ok(p) }))
  add(0, line(''), 0.08)
  add(0.18, (p) => ({ text: 'Starting dvm.sh' + '.'.repeat(Math.floor(p * 3)) }))
  add(0, line(site.taglines.mischief + '.', B_BRIGHT), 0.35)
  return s
}

/** Convert user lines into timed steps. */
export function customScript(lines: BootLine[]): BootStep[] {
  const s: BootStep[] = []
  let t = 0.1
  for (const l of lines) {
    if (typeof l === 'string') {
      s.push({ t, dur: 0, render: () => ({ text: l }) })
      t += 0.09
      continue
    }
    const dur = l.dur ?? 0
    const txt = l.text
    const b = l.bright ? B_BRIGHT : B_NORM
    s.push({ t, dur, render: (p, n) => ({ text: typeof txt === 'function' ? txt(p, n) : txt, b }) })
    t += dur + (l.gap ?? 0.06)
  }
  return s
}

export function scriptEnd(steps: BootStep[]) {
  const last = steps[steps.length - 1]
  return last ? last.t + last.dur : 0
}

/** Serial-number style footer id. */
export function bootId() {
  return `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-DVM-BITS-PILANI`
}
