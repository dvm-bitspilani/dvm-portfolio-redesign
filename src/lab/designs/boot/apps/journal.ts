import { artworks, blogs } from '../../../data'
import { text, type Block } from '../engine/doc'
import type { Engine, RouteParams } from '../engine/engine'
import { B_BRIGHT, B_DIM, B_MID, B_NORM, type Line } from '../engine/grid'
import { Pager } from './pager'

const IND = 7

export class JournalApp extends Pager {
  readonly id = 'journal' as const

  enter(_e: Engine, p: RouteParams) {
    if (p.section) this.jump(p.section)
  }

  cwd() {
    return '~/journal'
  }

  chips() {
    return ['cd ~', 'ls journal', 'ls artworks', 'cd work', 'team', 'contact']
  }

  protected docKey() {
    return 'journal'
  }

  protected heading(): [string, string, string] {
    return ['DVM-JOURNAL(7)', 'DVM Manual', 'DVM-JOURNAL(7)']
  }

  protected statusName() {
    return 'Manual page dvm-journal(7)'
  }

  protected blocks(e: Engine, width: number): Block[] {
    const B: Block[] = []
    const h = (t: string) => {
      B.push({ kind: 'gap' })
      B.push(text([{ t, b: B_BRIGHT }]))
    }
    const p = (l: Line | string, max = 86) => B.push(text(l, IND, max))
    h('NAME')
    p([{ t: 'journal - posts and artworks from the Department of Visual Media', b: B_NORM }])
    h('SYNOPSIS')
    p([{ t: 'cat journal', b: B_BRIGHT, cmd: 'cat journal' }, { t: ' | less', b: B_MID }])
    p([{ t: 'ls artworks', b: B_BRIGHT, cmd: 'ls artworks' }])
    h('DESCRIPTION')
    p([
      { t: `${blogs.length} posts written by members, on how the fest apps and sites were designed and built, and ${artworks.length} artworks by members. Posts open on `, b: B_NORM },
      { t: 'Medium', b: B_NORM },
      { t: ' or the BITS ACM blog. Jump to ', b: B_NORM },
      { t: 'POSTS', b: B_BRIGHT, to: 'journal?s=posts' },
      { t: ' or ', b: B_NORM },
      { t: 'ARTWORKS', b: B_BRIGHT, to: 'journal?s=artworks' },
      { t: '.', b: B_NORM },
    ])

    B.push({ kind: 'anchor', id: 'posts' })
    h('POSTS')
    const thumbW = e.narrow ? 0 : 24
    const sorted = [...blogs].sort((a, b) => b.isoDate.localeCompare(a.isoDate))
    for (const b of sorted) {
      B.push({ kind: 'gap' })
      const side: Line[] = [
        [{ t: b.title, b: B_BRIGHT }],
        [{ t: `${b.authors.join(', ')}, ${b.date}, ${b.readMinutes} min, ${b.platform}`, b: B_DIM }],
        [{ t: '' }],
        [{ t: b.excerpt, b: B_MID }],
        [{ t: '' }],
        [{ t: `[ read on ${b.platform} ]`, b: B_NORM, href: b.url }],
      ]
      if (thumbW) B.push({ kind: 'img', url: b.cover, x: IND, w: thumbW, h: 8, side })
      else for (const l of side) p(l)
    }

    B.push({ kind: 'anchor', id: 'artworks' })
    h('ARTWORKS')
    p([{ t: 'Each piece printed in glyphs. Open it to see the original.', b: B_DIM }])
    const artW = e.narrow ? width - IND : Math.min(46, Math.floor((width - IND) * 0.5))
    for (const a of artworks) {
      B.push({ kind: 'gap' })
      const side: Line[] = [
        [{ t: a.title, b: B_BRIGHT }],
        [{ t: `${a.artist}, ${a.year}${a.platform ? `, ${a.platform}` : ''}`, b: B_DIM }],
        [{ t: '' }],
      ]
      if (a.description) side.push([{ t: a.description, b: B_MID }], [{ t: '' }])
      const links: Line = []
      if (a.links.artwork) links.push({ t: '[ view artwork ]', b: B_NORM, href: a.links.artwork }, { t: '  ' })
      if (a.links.portfolio) links.push({ t: '[ portfolio ]', b: B_DIM, href: a.links.portfolio })
      if (links.length) side.push(links)
      if (e.narrow) {
        B.push({ kind: 'img', url: a.image, x: IND, w: artW, h: 12 })
        for (const l of side) p(l)
      } else B.push({ kind: 'img', url: a.image, x: IND, w: artW, h: 15, side })
    }
    h('SEE ALSO')
    p([
      { t: 'work', b: B_BRIGHT, to: 'work' },
      { t: '(1), ', b: B_DIM },
      { t: 'team', b: B_BRIGHT, to: 'team' },
      { t: '(1), ', b: B_DIM },
      { t: 'contact', b: B_BRIGHT, to: 'contact' },
      { t: '(1)', b: B_DIM },
    ])
    B.push({ kind: 'gap' })
    B.push(text([{ t: 'DVM 26.10' + ' '.repeat(Math.max(2, width - 9 - 14)) + 'DVM-JOURNAL(7)', b: B_DIM }]))
    B.push({ kind: 'gap', n: 2 })
    return B
  }
}
