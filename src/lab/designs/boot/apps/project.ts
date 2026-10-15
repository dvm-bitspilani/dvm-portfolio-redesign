import { fests, type Project } from '../../../data'
import { text, type Block } from '../engine/doc'
import type { Engine, RouteParams } from '../engine/engine'
import { B_BRIGHT, B_DIM, B_MID, B_NORM, padR, type Line } from '../engine/grid'
import { Pager } from './pager'
import { coverOf, festDir, ORDERED } from './util'

export class ProjectApp extends Pager {
  readonly id = 'project' as const
  private p: Project | null = null

  enter(_e: Engine, params: RouteParams) {
    const p = ORDERED.find((x) => x.slug === params.slug) ?? null
    if (p !== this.p) this.scroll = 0
    this.p = p
  }

  cwd() {
    return this.p ? `~/work/${festDir(this.p)}/${this.p.slug}` : '~/work'
  }

  chips() {
    const i = this.p ? ORDERED.indexOf(this.p) : -1
    const prev = ORDERED[(i - 1 + ORDERED.length) % ORDERED.length]
    const next = ORDERED[(i + 1) % ORDERED.length]
    return ['cd work', `open ${prev.slug}`, `open ${next.slug}`, 'ls projects', 'cd ~']
  }

  protected back(e: Engine) {
    e.go('work')
  }

  protected docKey() {
    return this.p?.slug ?? '-'
  }

  protected heading(): [string, string, string] {
    const name = this.p ? `${this.p.slug.toUpperCase()}(1)` : 'NOT-FOUND(1)'
    return [name, 'README.md', name]
  }

  protected statusName() {
    return 'README.md'
  }

  protected blocks(e: Engine, width: number): Block[] {
    const p = this.p
    if (!p) return [text([{ t: 'cat: README.md: No such project. ', b: B_NORM }, { t: 'ls projects', b: B_BRIGHT, cmd: 'ls projects' }])]
    const B: Block[] = []
    const tw = Math.min(width, 78)
    const h = (t: string) => {
      B.push({ kind: 'gap' })
      B.push(text([{ t: t.toUpperCase(), b: B_BRIGHT }]))
    }
    const para = (t: string, b = B_NORM) => B.push(text([{ t, b }], 7, 84))
    // cover
    const coverH = Math.round((width * e.cw * 0.5) / e.ch)
    B.push({ kind: 'img', url: coverOf(p), w: width, h: Math.max(8, Math.min(e.narrow ? 12 : 26, coverH)), opts: { focusY: 0.2 } })
    B.push({ kind: 'gap' })
    B.push(text([{ t: p.title, b: B_BRIGHT }]))
    B.push(text([{ t: '═'.repeat(Math.min(tw, [...p.title].length)), b: B_DIM }]))
    if (p.subtitle) B.push(text([{ t: p.subtitle, b: B_MID }]))
    h('name')
    para(`${p.slug} - ${p.summary ?? p.title}`)
    h('synopsis')
    const row = (k: string, v: Line) => B.push(text([{ t: '       ' }, { t: padR(k, 10), b: B_DIM }, ...v]))
    row('fest', [{ t: p.fest, b: B_NORM }])
    if (p.year) row('year', [{ t: `${p.year}${p.date ? `  (${p.date})` : ''}`, b: B_NORM }])
    row('kind', [{ t: p.kind, b: B_NORM }])
    if (p.theme) row('theme', [{ t: p.theme, b: B_BRIGHT }])
    row('teams', p.verticals.flatMap((v) => [{ t: v, b: B_NORM, cmd: `team ${v}` }, { t: '  ' }]))
    if (p.tags.length) row('tags', [{ t: p.tags.join(', '), b: B_MID }])
    if (p.description) {
      h('description')
      for (const s of p.description.split(/(?<=\.)\s+(?=[A-Z])/)) para(s)
    }
    const fest = fests.find((f) => f.id === p.fest)
    const ctx = p.festContext ?? fest?.blurb
    if (ctx) {
      h(`about ${p.fest}`)
      para(ctx, B_MID)
    }
    const gal = [...(p.gallery ?? []), ...(p.mobileGallery ?? [])]
    if (gal.length) {
      h('screens')
      const w = e.narrow ? width : Math.floor((width - 7) / 2)
      gal.slice(0, 6).forEach((src, i) => {
        const mobile = (p.mobileGallery ?? []).includes(src)
        B.push({ kind: 'img', url: src, x: 7, w: mobile ? Math.min(w, 26) : w, h: e.narrow ? 10 : 16, opts: { focusY: 0 } })
        B.push(text([{ t: '       ' }, { t: `fig.${i + 1}  ${src.split('/').pop()}`, b: B_DIM }]))
        B.push({ kind: 'gap' })
      })
    }
    h('see also')
    const links: Line = [{ t: '       ' }]
    if (p.links.live) links.push({ t: '[ live site ]', b: B_BRIGHT, href: p.links.live }, { t: '  ' })
    if (p.links.playStore) links.push({ t: '[ play store ]', b: B_BRIGHT, href: p.links.playStore }, { t: '  ' })
    if (p.links.youtube || p.youtubeId) links.push({ t: '[ youtube ]', b: B_BRIGHT, href: p.links.youtube ?? `https://www.youtube.com/watch?v=${p.youtubeId}` }, { t: '  ' })
    links.push({ t: '[ back to /work ]', b: B_NORM, to: 'work' })
    B.push(text(links))
    const i = ORDERED.indexOf(p)
    const prev = ORDERED[(i - 1 + ORDERED.length) % ORDERED.length]
    const next = ORDERED[(i + 1) % ORDERED.length]
    B.push({ kind: 'gap' })
    B.push(text([{ t: '       prev  ', b: B_DIM }, { t: prev.slug, b: B_NORM, to: `work/${prev.slug}` }]))
    B.push(text([{ t: '       next  ', b: B_DIM }, { t: next.slug, b: B_NORM, to: `work/${next.slug}` }]))
    B.push({ kind: 'gap', n: 2 })
    return B
  }
}
