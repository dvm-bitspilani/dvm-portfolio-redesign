// The DVM network: every record in src/immersive/data as a node, every real relation as an edge.
//   core (the mercury mark) ── fests ── projects ── verticals ── members
//                          ── journal ── blogs ── authors (members)
//                          ── gallery ── artworks ── artists (members)
//                          ── about / contact / archive
//   years (2017–2025) only take part in the legacy spiral: item ── year, year ── next year.
import { artworks, blogs, fests, projects, team, verticals } from '../../../immersive/data'
import type { Artwork, Blog, FestInfo, Member, Project, Vertical, VerticalId } from '../../../immersive/data'

export type NodeKind = 'core' | 'hub' | 'fest' | 'vertical' | 'project' | 'member' | 'blog' | 'art' | 'year'
export type EdgeKind = 'hub' | 'fest' | 'built' | 'member' | 'journal' | 'author' | 'gallery' | 'artist' | 'year' | 'time'
export type HubKey = 'about' | 'contact' | 'archive' | 'journal' | 'gallery'

/** Shapes understood by the node shader. */
export const SHAPE = { disc: 0, ring: 1, diamond: 2, square: 3, triangle: 4 } as const

export interface GNode {
  i: number
  id: string
  kind: NodeKind
  label: string
  /** One-line context shown under the label on hover and in search. */
  sub: string
  /** World radius. */
  r: number
  color: [number, number, number]
  shape: number
  /** Depth for parallax (world units, + = toward the camera). */
  z: number
  /** Orbit parent in the constellation layout (-1 = anchored). */
  parent: number
  orbitR: number
  angle0: number
  omega: number
  year?: number
  hub?: HubKey
  project?: Project
  member?: Member
  blog?: Blog
  art?: Artwork
  fest?: FestInfo
  vertical?: Vertical
  search: string
}

export interface GEdge {
  a: number
  b: number
  kind: EdgeKind
  /** Spring rest length (0 = display only). */
  len: number
  k: number
  alpha: number
  /** Pulse speed (0 = no light travelling along it). */
  pulse: number
  phase: number
}

export interface Graph {
  nodes: GNode[]
  edges: GEdge[]
  byId: Map<string, GNode>
  /** Edge indices per node. */
  edgesOf: number[][]
  years: GNode[]
  core: GNode
}

const hex = (h: string): [number, number, number] => {
  const n = parseInt(h.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

export const COLORS = {
  pale: hex('#cfe8ff'),
  teal: hex('#45e6ff'),
  cyan: hex('#5fd4e6'),
  member: hex('#3f9fbd'),
  memberPor: hex('#7fdcf0'),
  video: hex('#8fd0ff'),
  blog: hex('#e4f3ff'),
  art: hex('#9fc8ff'),
  copper: hex('#e0a46a'),
}

/** Anchor positions (world units, y down) of the big hubs in the constellation layout. */
export const ANCHORS: Record<string, [number, number]> = {
  core: [0, 0],
  'fest:APOGEE': [570, -175],
  'fest:Oasis': [570, 220],
  'fest:Campus': [310, -450],
  'fest:BOSM': [310, 470],
  'vertical:backend': [-330, -525],
  'vertical:app': [-640, -268],
  'vertical:video': [-760, 10],
  'vertical:frontend': [-640, 290],
  'vertical:design': [-330, 545],
  journal: [40, -505],
  gallery: [40, 530],
  about: [-210, 0],
  archive: [170, -140],
  contact: [170, 140],
}

const VERT_ORDER: VerticalId[] = ['frontend', 'backend', 'app', 'design', 'video']
const LATEST_BATCH = Math.max(...team.map((m) => m.batch))
const memberRing = (batch: number) => 40 + (LATEST_BATCH - batch) * 12

const KIND_LABEL: Record<string, string> = { website: 'Website', app: 'App', portal: 'Portal', video: 'Film' }
const festLabel = (f: string) => (f === 'Campus' ? 'Campus' : f)

/** A tiny deterministic PRNG so the layout (and the screenshots) are stable. */
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function buildGraph(): Graph {
  const rand = rng(6)
  const nodes: GNode[] = []
  const edges: GEdge[] = []
  const byId = new Map<string, GNode>()

  const add = (n: Omit<GNode, 'i' | 'parent' | 'orbitR' | 'angle0' | 'omega' | 'z' | 'search'> & Partial<GNode>) => {
    const node: GNode = {
      parent: -1,
      orbitR: 0,
      angle0: 0,
      omega: 0,
      z: 0,
      search: '',
      ...n,
      i: nodes.length,
    }
    node.search = `${node.label} ${node.sub}`.toLowerCase()
    nodes.push(node)
    byId.set(node.id, node)
    return node
  }
  const link = (a: GNode, b: GNode, kind: EdgeKind, opts: Partial<GEdge> = {}) => {
    edges.push({ a: a.i, b: b.i, kind, len: 0, k: 0, alpha: 0.3, pulse: 0, phase: rand(), ...opts })
  }

  // ---- core + hubs
  const core = add({ id: 'core', kind: 'core', label: 'DVM', sub: 'Department of Visual Media, BITS Pilani', r: 64, color: COLORS.pale, shape: SHAPE.disc })
  const hubs: Record<HubKey, GNode> = {
    about: add({ id: 'about', kind: 'hub', hub: 'about', label: 'About DVM', sub: 'Who we are and what we do', r: 9, color: COLORS.cyan, shape: SHAPE.ring }),
    archive: add({ id: 'archive', kind: 'hub', hub: 'archive', label: 'Archive', sub: 'Every node as a tile', r: 9, color: COLORS.cyan, shape: SHAPE.ring }),
    contact: add({ id: 'contact', kind: 'hub', hub: 'contact', label: 'Contact', sub: 'Write to the department', r: 9, color: COLORS.cyan, shape: SHAPE.ring }),
    journal: add({ id: 'journal', kind: 'hub', hub: 'journal', label: 'Blogs', sub: `${blogs.length} posts by members`, r: 12, color: COLORS.blog, shape: SHAPE.ring }),
    gallery: add({ id: 'gallery', kind: 'hub', hub: 'gallery', label: 'Artwork', sub: `${artworks.length} pieces by members`, r: 12, color: COLORS.art, shape: SHAPE.ring }),
  }
  for (const h of Object.values(hubs)) link(core, h, 'hub', { alpha: h.hub === 'journal' || h.hub === 'gallery' ? 0.42 : 0.3, pulse: 0.16 + rand() * 0.08 })

  // ---- fests
  const festNodes = new Map<string, GNode>()
  const festList: FestInfo[] = [...fests, { id: 'Campus', name: 'Campus', blurb: 'Portals and sites DVM built for life on campus, outside the three fests.' }]
  for (const f of festList) {
    const count = projects.filter((p) => p.fest === f.id).length
    const n = add({ id: `fest:${f.id}`, kind: 'fest', fest: f, label: festLabel(f.name), sub: `Fest, ${count} projects`, r: f.id === 'Campus' ? 12 : 16, color: COLORS.pale, shape: SHAPE.ring })
    festNodes.set(f.id, n)
    link(core, n, 'hub', { alpha: 0.5, pulse: 0.2 + rand() * 0.1 })
  }

  // ---- verticals
  const vertNodes = new Map<VerticalId, GNode>()
  for (const id of VERT_ORDER) {
    const v = verticals.find((x) => x.id === id)!
    const count = team.filter((m) => m.vertical === id).length
    const n = add({ id: `vertical:${id}`, kind: 'vertical', vertical: v, label: v.name, sub: `Team, ${count} members`, r: 13, color: COLORS.teal, shape: SHAPE.diamond })
    vertNodes.set(id, n)
    link(core, n, 'hub', { alpha: 0.5, pulse: 0.2 + rand() * 0.1 })
  }

  // ---- projects (orbit their fest: films on the outer ring, sites/apps/portals inside)
  const projByFest = new Map<string, Project[]>()
  for (const p of projects) projByFest.set(p.fest, [...(projByFest.get(p.fest) || []), p])
  for (const [fid, list] of projByFest) {
    const fn = festNodes.get(fid)!
    const rings = [list.filter((p) => p.kind !== 'video'), list.filter((p) => p.kind === 'video')]
    rings.forEach((ring, ri) => {
      const phase = rand() * Math.PI * 2
      ring
        .slice()
        .sort((a, b) => (b.year || 0) - (a.year || 0))
        .forEach((p, k) => {
          const isVideo = p.kind === 'video'
          const n = add({
            id: `project:${p.slug}`,
            kind: 'project',
            project: p,
            label: p.title,
            sub: `${KIND_LABEL[p.kind]}${p.year ? `, ${p.year}` : ''}, ${festLabel(p.fest)}`,
            r: p.featured ? 8 : isVideo ? 5.6 : 6.6,
            color: isVideo ? COLORS.video : COLORS.cyan,
            shape: isVideo ? SHAPE.triangle : SHAPE.disc,
            year: p.year,
            parent: fn.i,
            orbitR: ri === 0 ? (ring.length > 6 ? 92 : 70) : 150,
            angle0: phase + (k / ring.length) * Math.PI * 2,
            omega: ri === 0 ? 0.03 : -0.018,
            z: (rand() - 0.5) * 50,
          })
          link(fn, n, 'fest', { alpha: 0.36, pulse: isVideo ? 0 : 0.12 + rand() * 0.1 })
          for (const v of p.verticals) link(n, vertNodes.get(v)!, 'built', { alpha: 0.075, k: 0.0015, len: 0 })
        })
    })
  }

  // ---- members (orbit their vertical in batch rings: newest inside)
  const memberNodes = new Map<string, GNode>()
  for (const vid of VERT_ORDER) {
    const vn = vertNodes.get(vid)!
    const members = team.filter((m) => m.vertical === vid)
    const batches = [...new Set(members.map((m) => m.batch))].sort((a, b) => b - a)
    for (const b of batches) {
      const ring = members.filter((m) => m.batch === b).sort((x, y) => x.name.localeCompare(y.name))
      const phase = rand() * Math.PI * 2
      const ri = LATEST_BATCH - b
      ring.forEach((m, k) => {
        const n = add({
          id: `member:${m.slug}`,
          kind: 'member',
          member: m,
          label: m.name,
          sub: `${vn.vertical!.label}, batch of ${m.batch}${m.designation ? `, ${m.designation}` : ''}`,
          r: m.designation ? 4.2 : 3.3,
          color: m.designation ? COLORS.memberPor : COLORS.member,
          shape: SHAPE.disc,
          year: m.batch,
          parent: vn.i,
          orbitR: memberRing(b),
          angle0: phase + (k / ring.length) * Math.PI * 2,
          omega: (ri % 2 ? -1 : 1) * (0.05 / (1 + ri * 0.35)),
          z: (rand() - 0.5) * 90,
        })
        memberNodes.set(m.name.toLowerCase(), n)
        link(vn, n, 'member', { alpha: 0.12 })
      })
    }
  }

  // ---- blogs ↔ authors
  blogs.forEach((b, k) => {
    const n = add({
      id: `blog:${b.slug}`,
      kind: 'blog',
      blog: b,
      label: b.shortTitle || b.title,
      sub: `Blog post by ${b.authors.join(' and ')}, ${b.isoDate.slice(0, 4)}`,
      r: 5.4,
      color: COLORS.blog,
      shape: SHAPE.square,
      year: Number(b.isoDate.slice(0, 4)),
      parent: hubs.journal.i,
      orbitR: 66,
      angle0: (k / blogs.length) * Math.PI * 2,
      omega: 0.035,
      z: (rand() - 0.5) * 40,
    })
    link(hubs.journal, n, 'journal', { alpha: 0.4, pulse: 0.1 + rand() * 0.1 })
    for (const a of b.authors) {
      const m = memberNodes.get(a.toLowerCase())
      if (m) link(n, m, 'author', { alpha: 0.26, k: 0.002 })
    }
  })

  // ---- artworks ↔ artists
  artworks.forEach((a, k) => {
    const inner = k < 10
    const n = add({
      id: `art:${a.slug}`,
      kind: 'art',
      art: a,
      label: a.title,
      sub: `Artwork by ${a.artist}${a.platform ? ` on ${a.platform}` : ''}`,
      r: 5,
      color: COLORS.art,
      shape: SHAPE.square,
      year: a.year,
      parent: hubs.gallery.i,
      orbitR: inner ? 64 : 112,
      angle0: inner ? (k / 10) * Math.PI * 2 : ((k - 10) / (artworks.length - 10)) * Math.PI * 2 + 0.2,
      omega: inner ? -0.03 : 0.02,
      z: (rand() - 0.5) * 40,
    })
    link(hubs.gallery, n, 'gallery', { alpha: 0.32 })
    const m = memberNodes.get(a.artist.toLowerCase())
    if (m) link(n, m, 'artist', { alpha: 0.13, k: 0.002 })
  })

  // ---- years (legacy spiral). Every dated node links to its year; years chain in order.
  const allYears = [...new Set(nodes.filter((n) => n.year).map((n) => n.year!))].sort((a, b) => a - b)
  const years: GNode[] = []
  for (const y of allYears) {
    const items = nodes.filter((n) => n.year === y)
    const counts = {
      projects: items.filter((n) => n.kind === 'project').length,
      members: items.filter((n) => n.kind === 'member').length,
    }
    const bits = [counts.projects && `${counts.projects} project${counts.projects > 1 ? 's' : ''}`, counts.members && `${counts.members} joined`].filter(Boolean)
    const yn = add({ id: `year:${y}`, kind: 'year', label: String(y), sub: bits.join(', ') || 'Year', r: 11, color: COLORS.copper, shape: SHAPE.ring, year: y })
    years.push(yn)
    for (const it of items) link(yn, it, 'year', { alpha: it.kind === 'member' ? 0.1 : 0.3 })
  }
  for (let k = 1; k < years.length; k++) link(years[k - 1], years[k], 'time', { alpha: 0.9, pulse: 0.25, phase: k * 0.13 })

  const edgesOf: number[][] = nodes.map(() => [])
  edges.forEach((e, k) => {
    edgesOf[e.a].push(k)
    edgesOf[e.b].push(k)
  })

  return { nodes, edges, byId, edgesOf, years, core }
}

/** Where a node lives in the variant (path relative to the variant root). */
export function routeFor(n: GNode): string {
  switch (n.kind) {
    case 'core':
      return '/'
    case 'hub':
      return { about: '/about', contact: '/contactus', archive: '/archive', journal: '/blog', gallery: '/artwork' }[n.hub!]
    case 'fest':
      return `/projects?n=${encodeURIComponent(n.id)}`
    case 'project':
      return `/projects/${n.project!.slug}`
    case 'vertical':
    case 'member':
      return `/team?n=${encodeURIComponent(n.id)}`
    case 'blog':
      return `/blog?n=${encodeURIComponent(n.id)}`
    case 'art':
      return `/artwork?n=${encodeURIComponent(n.id)}`
    case 'year':
      return `/legacy?n=${encodeURIComponent(n.id)}`
  }
}

export const KIND_NAMES: Record<NodeKind, string> = {
  core: 'Department',
  hub: 'Section',
  fest: 'Fest',
  vertical: 'Team',
  project: 'Project',
  member: 'Member',
  blog: 'Blog post',
  art: 'Artwork',
  year: 'Year',
}
