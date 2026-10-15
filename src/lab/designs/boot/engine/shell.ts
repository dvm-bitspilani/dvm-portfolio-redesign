import { artworks, blogs, fests, projects, site, socials, stats, team, verticals } from '../../../data'
import type { Engine, ThemeName } from './engine'
import { THEMES } from './engine'
import { figlet } from './figlet'
import { B_BRIGHT, B_DIM, B_MID, B_NORM, F_HOT, padR, type Line } from './grid'
import { Matrix } from './matrix'

export interface ScrollLine {
  segs: Line
  /** truncate instead of wrapping (tables, banners) */
  nowrap?: boolean
}

type Cell = '' | 'X' | 'O'
const WINS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]

export class XO {
  board: Cell[] = Array(9).fill('')
  turn: 'X' | 'O' = 'X'
  over: '' | 'X' | 'O' | 'draw' = ''
  winLine: number[] | null = null
  cpuAt = -1

  static winner(b: Cell[]): { w: 'X' | 'O'; line: number[] } | null {
    for (const l of WINS) if (b[l[0]] && b[l[0]] === b[l[1]] && b[l[1]] === b[l[2]]) return { w: b[l[0]] as 'X' | 'O', line: l }
    return null
  }

  private minimax(b: Cell[], player: 'X' | 'O'): number {
    const w = XO.winner(b)
    if (w) return w.w === 'O' ? 1 : -1
    if (b.every((c) => c)) return 0
    let best = player === 'O' ? -2 : 2
    for (let i = 0; i < 9; i++) {
      if (b[i]) continue
      b[i] = player
      const s = this.minimax(b, player === 'O' ? 'X' : 'O')
      b[i] = ''
      best = player === 'O' ? Math.max(best, s) : Math.min(best, s)
    }
    return best
  }

  cpuMove(): number {
    const free = this.board.map((c, i) => (c ? -1 : i)).filter((i) => i >= 0)
    if (!free.length) return -1
    // mostly perfect, sometimes human: 22% random move keeps it winnable
    if (Math.random() < 0.22) return free[(Math.random() * free.length) | 0]
    let best = -2
    let pick = free[0]
    for (const i of free) {
      this.board[i] = 'O'
      const s = this.minimax(this.board, 'X')
      this.board[i] = ''
      if (s > best) {
        best = s
        pick = i
      }
    }
    return pick
  }

  place(i: number, who: 'X' | 'O') {
    if (this.over || this.board[i]) return false
    this.board[i] = who
    const w = XO.winner(this.board)
    if (w) {
      this.over = w.w
      this.winLine = w.line
    } else if (this.board.every((c) => c)) this.over = 'draw'
    this.turn = who === 'X' ? 'O' : 'X'
    return true
  }
}

interface Cmd {
  name: string
  args?: string
  help: string
  /** shown in help */
  list?: boolean
  run: (args: string[], raw: string) => void
  complete?: () => string[]
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

function lev(a: string, b: string) {
  const m = a.length
  const n = b.length
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)])
  for (let j = 1; j <= n; j++) d[0][j] = j
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[m][n]
}

const VERT_ALIASES: Record<string, string> = {
  frontend: 'frontend',
  front: 'frontend',
  fe: 'frontend',
  backend: 'backend',
  back: 'backend',
  be: 'backend',
  app: 'app',
  appdev: 'app',
  apps: 'app',
  design: 'design',
  video: 'video',
  all: '',
}

export class Shell {
  private e: Engine
  lines: ScrollLine[] = []
  version = 0
  history: string[] = []
  xo: XO | null = null
  xoScore = { you: 0, cpu: 0, draw: 0 }
  private queue: { at: number; fn: () => void }[] = []
  private clock = 0
  private printed = false
  private navigated = false
  private lastTab = ''
  private cmds: Cmd[]

  constructor(e: Engine) {
    this.e = e
    this.cmds = this.buildCommands()
  }

  /* ---------------- output ---------------- */

  print(segs: Line | string, nowrap = false) {
    this.lines.push({ segs: typeof segs === 'string' ? [{ t: segs }] : segs, nowrap })
    if (this.lines.length > 800) this.lines.splice(0, this.lines.length - 800)
    this.version++
    this.printed = true
  }

  private blank() {
    this.print('')
  }

  later(delay: number, fn: () => void) {
    this.queue.push({ at: this.clock + delay, fn })
  }

  tick(dt: number) {
    this.clock += dt
    if (!this.queue.length) return
    const due = this.queue.filter((q) => q.at <= this.clock)
    if (!due.length) return
    this.queue = this.queue.filter((q) => q.at > this.clock)
    for (const q of due) q.fn()
  }

  private nav(path: string) {
    this.navigated = true
    this.e.go(path)
  }

  banner(word: string, b = B_BRIGHT) {
    for (const r of figlet(word)) this.print([{ t: r, b }], true)
  }

  motd() {
    if (this.lines.length) return
    this.banner('DVM')
    this.print([{ t: site.fullName, b: B_BRIGHT }, { t: ', ' + site.institution, b: B_MID }])
    this.blank()
    this.print([{ t: "We build the websites, apps, teasers and trailers behind BITS Pilani's three fests: ", b: B_NORM }, ...this.festLinks(), { t: '.', b: B_NORM }])
    this.blank()
    const s = (label: string) => stats.find((x) => x.label.startsWith(label))
    const row = (k: string, v: string, b = B_BRIGHT): Line => [{ t: padR(k, 12), b: B_DIM }, { t: v, b }]
    this.print(row('users', `${s('users')?.display} on our apps and websites`), true)
    this.print(row('archive', `${projects.length} projects, ${team.length} members, ${blogs.length} posts, ${artworks.length} artworks`), true)
    this.print(row('teams', verticals.map((v) => v.label.toLowerCase()).join('  ')), true)
    this.blank()
    this.print([
      { t: 'Type ', b: B_MID },
      { t: 'help', b: B_BRIGHT, cmd: 'help' },
      { t: ' or tap a command below. Drag the mark to spin it.', b: B_MID },
    ])
    this.blank()
  }

  private festLinks(): Line {
    const out: Line = []
    fests.forEach((f, i) => {
      if (i) out.push({ t: i === fests.length - 1 ? ' and ' : ', ', b: B_NORM })
      out.push({ t: f.name, b: B_BRIGHT, cmd: `ls ${f.id.toLowerCase()}` })
    })
    return out
  }

  defaultChips(): string[] {
    return ['help', 'ls projects', 'open apogee-25-website', 'team design', 'cat journal', 'neofetch', 'xo', 'lumos', 'sudo apogee', 'matrix', `theme ${this.e.theme === 'amber' ? 'ice' : this.e.theme === 'ice' ? 'green' : 'amber'}`]
  }

  /* ---------------- run ---------------- */

  run(raw: string, echo = true) {
    const line = raw.trim()
    if (echo) this.print([{ t: `guest@dvm:${this.e.cwd()}$ `, b: B_DIM }, { t: raw, b: B_BRIGHT }])
    if (!line) return
    if (this.history[this.history.length - 1] !== line) this.history.push(line)
    this.printed = false
    this.navigated = false
    const words = line.split(/\s+/)
    const name = words[0].toLowerCase()
    const args = words.slice(1)
    const cmd = this.cmds.find((c) => c.name === name)
    if (cmd) cmd.run(args, line)
    else this.notFound(name)
    this.e.host.announce(this.lastPlain())
    // printing commands bring you home so you can see the output
    if (this.printed && !this.navigated && this.e.route !== 'home') this.e.go('')
  }

  private lastPlain() {
    const tail = this.lines.slice(-3)
    return tail.map((l) => l.segs.map((s) => s.t).join('')).join(' ')
  }

  private notFound(name: string) {
    const names = this.cmds.map((c) => c.name)
    const near = names.map((n) => [n, lev(name, n)] as const).sort((a, b) => a[1] - b[1])[0]
    const out: Line = [{ t: `dvmsh: command not found: ${name}`, b: B_NORM }]
    if (near && near[1] <= 2) out.push({ t: '  did you mean ', b: B_DIM }, { t: near[0], b: B_BRIGHT, cmd: near[0] }, { t: '?', b: B_DIM })
    else out.push({ t: '  try ', b: B_DIM }, { t: 'help', b: B_BRIGHT, cmd: 'help' })
    this.print(out)
  }

  /* ---------------- completion ---------------- */

  private candidates(prefix: string): { base: string; opts: string[]; cur: string } {
    const parts = prefix.split(/\s+/)
    if (parts.length <= 1) {
      const cur = parts[0] ?? ''
      return { base: '', opts: this.cmds.map((c) => c.name).filter((n) => n.startsWith(cur.toLowerCase())), cur }
    }
    const cmd = this.cmds.find((c) => c.name === parts[0].toLowerCase())
    const cur = parts[parts.length - 1]
    const base = prefix.slice(0, prefix.length - cur.length)
    const all = cmd?.complete?.() ?? []
    return { base, opts: all.filter((o) => o.startsWith(cur.toLowerCase())), cur }
  }

  /** Remaining characters of the best completion (for the inline ghost). */
  ghost(buf: string): string {
    if (!buf || buf.endsWith(' ') && buf.trim().split(/\s+/).length > 1) return ''
    const { opts, cur } = this.candidates(buf)
    if (!opts.length || !cur) return ''
    const o = opts[0]
    return o.length > cur.length ? o.slice(cur.length) : ''
  }

  complete(prefix: string): string | null {
    const { base, opts, cur } = this.candidates(prefix)
    if (!opts.length) return null
    if (opts.length === 1) return base + opts[0] + ' '
    let common = opts[0]
    for (const o of opts) while (!o.startsWith(common)) common = common.slice(0, -1)
    if (common.length > cur.length) return base + common
    if (this.lastTab === prefix || opts.length <= 24) {
      this.print([{ t: `guest@dvm:${this.e.cwd()}$ `, b: B_DIM }, { t: prefix, b: B_BRIGHT }])
      const segs: Line = []
      for (const o of opts.slice(0, 40)) segs.push({ t: o, b: B_NORM, cmd: base + o }, { t: '  ' })
      this.print(segs)
    }
    this.lastTab = prefix
    return null
  }

  /* ---------------- commands ---------------- */

  private buildCommands(): Cmd[] {
    const e = this.e
    const slugs = () => projects.map((p) => p.slug)
    const dirs = ['projects', 'work', 'team', 'journal', 'artworks', 'contact']
    const C: Cmd[] = [
      { name: 'help', help: 'list commands', list: true, run: () => this.help() },
      { name: 'ls', args: '[dir]', help: 'list projects, team, journal, artworks', list: true, run: (a) => this.ls(a[0]), complete: () => [...dirs, ...fests.map((f) => f.id.toLowerCase()), 'campus'] },
      { name: 'open', args: '<project>', help: 'open a project (tab completes)', list: true, run: (a) => this.open(a.join(' ')), complete: slugs },
      { name: 'cd', args: '<dir>', help: 'go to work, team, journal or contact', run: (a) => this.cd(a[0]), complete: () => dirs },
      { name: 'team', args: '[vertical]', help: 'live process list of members', list: true, run: (a) => this.team(a[0]), complete: () => verticals.map((v) => v.id) },
      { name: 'cat', args: '<file>', help: 'cat journal | about | contact', list: true, run: (a) => this.cat(a[0]), complete: () => ['journal', 'about', 'contact'] },
      { name: 'artworks', help: 'jump to the artworks', list: true, run: () => this.nav('journal?s=artworks') },
      { name: 'contact', help: 'compose a message to DVM', list: true, run: () => this.nav('contact') },
      { name: 'whoami', help: 'who are you', list: true, run: () => this.whoami() },
      { name: 'neofetch', help: 'system information', list: true, run: () => this.neofetch() },
      { name: 'xo', help: 'tic-tac-toe vs the CPU', list: true, run: () => this.startXO() },
      { name: 'lumos', help: 'light your wand', list: true, run: () => this.lumos(true) },
      { name: 'nox', help: 'put it out', run: () => this.lumos(false) },
      { name: 'sudo', args: '<fest>', help: 'try `sudo apogee`', list: true, run: (a) => this.sudo(a), complete: () => ['apogee', 'bosm', 'oasis'] },
      { name: 'matrix', help: 'there is no spoon', list: true, run: () => (e.matrix = new Matrix(e)) },
      { name: 'theme', args: 'amber|green|ice', help: 'phosphor colour', list: true, run: (a) => this.theme(a[0]), complete: () => Object.keys(THEMES) },
      { name: 'crt', args: 'on|off', help: 'curvature and scanlines', list: true, run: (a) => this.crt(a[0]), complete: () => ['on', 'off'] },
      { name: 'clear', help: 'clear the screen', list: true, run: () => this.clear() },
      { name: 'history', help: 'command history', run: () => this.history.forEach((h, i) => this.print([{ t: `${String(i + 1).padStart(4)}  `, b: B_DIM }, { t: h, cmd: h }])) },
      { name: 'reboot', help: 'run the POST again', list: true, run: () => this.reboot() },
      { name: 'exit', help: 'switch the monitor off', list: true, run: () => this.exit() },
      { name: 'date', help: 'print the date', run: () => this.print(new Date().toString()) },
      { name: 'echo', help: 'print text', run: (_a, raw) => this.print(raw.replace(/^echo\s?/, '')) },
      { name: 'pwd', help: 'print working directory', run: () => this.print('/home/guest' + e.cwd().replace(/^~/, '')) },
      { name: 'uname', help: 'system name', run: () => this.print('DVM dvmsh 26.10 bits-pilani visual_media GNU/Fest') },
      { name: 'man', args: '<page>', help: 'manual pages', run: (a) => this.man(a[0]), complete: () => ['dvm', 'journal'] },
    ]
    return C
  }

  private help() {
    this.print([{ t: 'dvmsh 26.10: commands are clickable', b: B_BRIGHT }])
    this.blank()
    for (const c of this.cmds.filter((x) => x.list)) {
      const usage = c.args ? `${c.name} ${c.args}` : c.name
      this.print([{ t: '  ' }, { t: padR(usage, 26), b: B_BRIGHT, cmd: c.args?.startsWith('<') ? undefined : c.name }, { t: c.help, b: B_MID }], true)
    }
    this.blank()
    this.print([{ t: 'tab completes, ↑↓ walks history, ^L clears, ^C cancels.', b: B_DIM }])
  }

  private ls(dir?: string) {
    const d = (dir ?? '').toLowerCase().replace(/\/$/, '')
    if (!d) {
      const segs: Line = []
      for (const x of ['projects', 'team', 'journal', 'artworks']) segs.push({ t: x + '/', b: B_BRIGHT, cmd: `ls ${x}` }, { t: '   ' })
      segs.push({ t: 'contact', b: B_NORM, cmd: 'contact' })
      this.print(segs)
      return
    }
    if (d === 'projects' || d === 'work' || ['apogee', 'bosm', 'oasis', 'campus'].includes(d)) {
      const groups = ['APOGEE', 'Oasis', 'BOSM', 'Campus'].filter((f) => d === 'projects' || d === 'work' || f.toLowerCase() === d)
      for (const f of groups) {
        const list = projects.filter((p) => p.fest === f)
        this.print([{ t: `/work/${f.toLowerCase()}`, b: B_BRIGHT }, { t: `  ${list.length} entries`, b: B_DIM }])
        for (const p of list)
          this.print(
            [
              { t: '  ' },
              { t: padR(p.slug, 31), b: B_NORM, cmd: `open ${p.slug}` },
              { t: padR(p.kind, 9), b: B_DIM },
              { t: padR(String(p.year ?? ''), 6), b: B_DIM },
              { t: p.title, b: B_MID },
            ],
            true,
          )
      }
      this.print([{ t: 'click a name or type ', b: B_DIM }, { t: 'open <name>', b: B_NORM }, { t: '. full browser: ', b: B_DIM }, { t: 'cd work', b: B_BRIGHT, cmd: 'cd work' }])
      return
    }
    if (d === 'team') {
      for (const v of verticals) {
        const n = team.filter((m) => m.vertical === v.id).length
        this.print([{ t: '  ' }, { t: padR(v.id + '/', 12), b: B_BRIGHT, cmd: `team ${v.id}` }, { t: padR(`${n} members`, 13), b: B_NORM }, { t: v.name, b: B_DIM }], true)
      }
      return
    }
    if (d === 'journal') {
      for (const b of blogs) this.print([{ t: '  ' }, { t: padR(b.isoDate, 12), b: B_DIM }, { t: b.title, b: B_NORM, href: b.url }], true)
      this.print([{ t: 'read them in the pager: ', b: B_DIM }, { t: 'cat journal', b: B_BRIGHT, cmd: 'cat journal' }])
      return
    }
    if (d === 'artworks') {
      for (const a of artworks) this.print([{ t: '  ' }, { t: padR(String(a.year), 6), b: B_DIM }, { t: padR(a.title, 40), b: B_NORM, to: 'journal?s=artworks' }, { t: a.artist, b: B_MID }], true)
      return
    }
    this.print(`ls: cannot access '${dir}': No such file or directory`)
  }

  private open(q: string) {
    if (!q) {
      this.print([{ t: 'usage: open <project>   e.g. ', b: B_DIM }, { t: 'open apogee-25-website', b: B_BRIGHT, cmd: 'open apogee-25-website' }])
      return
    }
    const nq = norm(q)
    if (['work', 'projects', 'team', 'journal', 'contact'].includes(nq)) return this.cd(nq)
    const exact = projects.find((p) => p.slug === q.toLowerCase())
    if (exact) return this.nav(`work/${exact.slug}`)
    const hits = projects.filter((p) => norm(p.slug).includes(nq) || norm(p.title).includes(nq))
    if (hits.length === 1) return this.nav(`work/${hits[0].slug}`)
    if (hits.length > 1) {
      this.print([{ t: `open: ${hits.length} projects match '${q}':`, b: B_NORM }])
      for (const p of hits.slice(0, 14)) this.print([{ t: '  ' }, { t: p.slug, b: B_BRIGHT, cmd: `open ${p.slug}` }, { t: `  ${p.title}`, b: B_DIM }], true)
      return
    }
    const near = projects
      .map((p) => [p.slug, lev(nq, norm(p.slug))] as const)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 3)
    const segs: Line = [{ t: `open: no such project: ${q}. closest: `, b: B_NORM }]
    near.forEach(([s], i) => segs.push({ t: s, b: B_BRIGHT, cmd: `open ${s}` }, { t: i < 2 ? ', ' : '' }))
    this.print(segs)
  }

  private cd(d?: string) {
    const x = (d ?? '~').toLowerCase().replace(/\/$/, '')
    const map: Record<string, string> = { '~': '', '/': '', '..': '', home: '', work: 'work', projects: 'work', team: 'team', journal: 'journal', artworks: 'journal?s=artworks', contact: 'contact' }
    if (x in map) this.nav(map[x])
    else this.print(`cd: no such directory: ${d}`)
  }

  private team(v?: string) {
    if (!v) return this.nav('team')
    const id = VERT_ALIASES[v.toLowerCase()]
    if (id === undefined) {
      this.print([{ t: `team: unknown vertical '${v}'. one of: `, b: B_NORM }, ...verticals.flatMap((x) => [{ t: x.id, b: B_BRIGHT, cmd: `team ${x.id}` }, { t: ' ' }])])
      return
    }
    this.nav(id ? `team?v=${id}` : 'team')
  }

  private cat(f?: string) {
    const x = (f ?? '').toLowerCase()
    if (x === 'journal' || x === 'blogs') return this.nav('journal')
    if (x === 'about' || x === 'readme' || x === 'readme.md') {
      this.print([{ t: site.headline, b: B_BRIGHT }])
      for (const p of site.about) this.print([{ t: p, b: B_NORM }])
      return
    }
    if (x === 'contact') {
      this.print([{ t: padR('mail', 12), b: B_DIM }, { t: site.contact.email, b: B_BRIGHT, href: `mailto:${site.contact.email}` }])
      for (const s of socials) this.print([{ t: padR(s.label.toLowerCase(), 12), b: B_DIM }, { t: s.url.replace(/^https?:\/\/(www\.)?/, ''), b: B_NORM, href: s.url }], true)
      return
    }
    if (!x) this.print('usage: cat journal | about | contact')
    else this.print(`cat: ${f}: No such file or directory`)
  }

  private whoami() {
    this.print([{ t: 'guest', b: B_BRIGHT }])
    this.print([{ t: 'a visitor on tty1, reading the archive of the ', b: B_MID }, { t: site.fullName, b: B_NORM }, { t: '.', b: B_MID }])
    this.print([{ t: site.headline + '.', b: B_NORM }])
  }

  private neofetch() {
    const batches = [...new Set(team.map((m) => m.batch).filter(Boolean))].sort()
    const builds = projects.filter((p) => p.kind !== 'video').length
    const rows: [string, string][] = [
      ['OS', 'dvmsh 26.10 on BITS Pilani'],
      ['Host', site.fullName],
      ['Uptime', `${batches.length} batches (${batches[0]}–${batches[batches.length - 1]})`],
      ['Packages', `${projects.length} (${builds} builds, ${projects.length - builds} videos)`],
      ['Shell', 'dvmsh, the one you are typing into'],
      ['Teams', verticals.map((v) => v.label).join(', ')],
      ['Fests', fests.map((f) => f.name).join(', ')],
      ['Members', String(team.length)],
      ['Users', '5000+'],
      ['Motto', site.taglines.redesignHero],
    ]
    const banner = figlet('DVM')
    this.print([{ t: padR(banner[0], 30), b: B_BRIGHT }, { t: 'guest@dvm', b: B_BRIGHT }], true)
    for (let i = 0; i < Math.max(banner.length, rows.length + 1); i++) {
      const left = banner[i + 1] ?? ''
      const r = i === 0 ? null : rows[i - 1]
      const segs: Line = [{ t: padR(left, 30), b: B_BRIGHT }]
      if (i === 0) segs.push({ t: '─────────', b: B_DIM })
      else if (r) segs.push({ t: padR(r[0], 10), b: B_BRIGHT }, { t: r[1], b: B_NORM })
      this.print(segs, true)
    }
    const bar: Line = [{ t: ' '.repeat(30) }]
    for (const b of [60, 110, 160, 200, 235, 255]) bar.push({ t: '███', b })
    this.print(bar, true)
  }

  startXO() {
    this.xo = new XO()
    this.print([{ t: 'xo: you are X. click a square or press 1-9. esc quits.', b: B_NORM }])
    if (this.e.route !== 'home') this.nav('')
  }

  playXO(i: number) {
    const g = this.xo
    if (!g || g.over || g.turn !== 'X' || g.board[i]) return
    g.place(i, 'X')
    if (!g.over) {
      g.cpuAt = this.clock + 0.45
      this.later(0.45, () => {
        if (this.xo !== g || g.over) return
        g.place(g.cpuMove(), 'O')
        g.cpuAt = -1
        if (g.over) this.endXO()
      })
    } else this.endXO()
  }

  private endXO() {
    const g = this.xo
    if (!g) return
    if (g.over === 'X') {
      this.xoScore.you++
      this.print([{ t: 'xo: you win. the CPU has been reported to the Ministry of Magic.', b: B_BRIGHT }])
    } else if (g.over === 'O') {
      this.xoScore.cpu++
      this.print([{ t: 'xo: the CPU wins. mischief managed.', b: B_NORM }])
    } else {
      this.xoScore.draw++
      this.print([{ t: 'xo: draw.', b: B_NORM }])
    }
    const s = this.xoScore
    this.print([{ t: `score  you ${s.you}  cpu ${s.cpu}  draw ${s.draw}   `, b: B_DIM }, { t: 'play again', b: B_BRIGHT, cmd: 'xo' }])
  }

  quitXO() {
    if (!this.xo) return
    this.xo = null
    this.print([{ t: 'xo: quit.', b: B_DIM }])
  }

  private lumos(on: boolean) {
    this.e.lumosTarget = on ? 1 : 0
    if (on) {
      this.print([{ t: 'Lumos.', b: B_BRIGHT, f: F_HOT }])
      this.print([{ t: site.taglines.mischief + '.', b: B_BRIGHT }])
      this.print([{ t: 'your cursor is the wand now. move it over the mark. ', b: B_DIM }, { t: 'nox', b: B_BRIGHT, cmd: 'nox' }, { t: ' to put it out.', b: B_DIM }])
    } else {
      this.print([{ t: 'Nox. Mischief managed.', b: B_NORM }])
    }
  }

  private sudo(a: string[]) {
    const target = (a[0] ?? '').toLowerCase()
    if (!target) {
      this.print('usage: sudo <fest>')
      return
    }
    if (target === 'rm' || target === 'su') {
      this.print('guest is not in the sudoers file. This incident will be reported.')
      return
    }
    const fest = fests.find((f) => f.id.toLowerCase() === target)
    if (!fest) {
      this.print(`sudo: ${a[0]}: command not found`)
      return
    }
    this.print([{ t: '[sudo] password for guest: ', b: B_NORM }, { t: '********', b: B_DIM }])
    const e = this.e
    this.later(0.7, () => this.print('Sorry, try again.'))
    this.later(0.9, () => this.print([{ t: '[sudo] password for guest: ', b: B_NORM }, { t: '************', b: B_DIM }]))
    this.later(1.6, () => {
      this.print([{ t: `access granted. escalating to ${fest.name}.`, b: B_BRIGHT }])
      if (!e.reduced) e.glitch = 1
      this.e.kickLogo?.(14)
    })
    this.later(1.9, () => {
      this.banner(fest.id === 'Oasis' ? 'OASIS' : fest.id)
      const first = fest.blurb.split(/(?<=\.)\s/)[0]
      this.print([{ t: first, b: B_NORM }])
      this.blank()
      const list = projects.filter((p) => p.fest === fest.id)
      this.print([{ t: `${list.length} ${fest.name} builds in /work:`, b: B_MID }])
      for (const p of list.slice(0, 12))
        this.print([{ t: '  ' }, { t: padR(p.slug, 31), b: B_BRIGHT, cmd: `open ${p.slug}` }, { t: padR(String(p.year ?? ''), 6), b: B_DIM }, { t: p.theme ?? p.kind, b: B_MID }], true)
      if (fest.website) this.print([{ t: '  live: ', b: B_DIM }, { t: fest.website, b: B_NORM, href: fest.website }])
    })
  }

  private theme(t?: string) {
    if (t && t in THEMES) {
      this.e.setTheme(t as ThemeName)
      this.print([{ t: `phosphor set to ${t}.`, b: B_NORM }])
      return
    }
    const segs: Line = [{ t: `theme: ${this.e.theme}. options: `, b: B_NORM }]
    for (const k of Object.keys(THEMES)) segs.push({ t: k, b: B_BRIGHT, cmd: `theme ${k}` }, { t: '  ' })
    this.print(segs)
  }

  private crt(v?: string) {
    const on = v ? v === 'on' : !this.e.crt
    this.e.setCrt(on)
    this.print(on ? 'crt: curvature, scanlines and glow on.' : 'crt: off. flat glass, sharp text. `crt on` to bring it back.')
  }

  clear() {
    this.lines = []
    this.version++
    this.xo = null
  }

  private reboot() {
    this.clear()
    this.e.lumosTarget = 0
    this.navigated = true
    this.e.boot()
  }

  private exit() {
    this.print('logout')
    this.print('Connection to dvm closed.')
    this.navigated = true
    this.later(0.35, () => {
      this.clear()
      this.e.powerOff()
    })
  }

  private man(p?: string) {
    if (!p) return this.print('What manual page do you want?')
    if (['dvm', 'journal', 'dvm-journal'].includes(p.toLowerCase())) return this.nav('journal')
    this.print([{ t: `No manual entry for ${p}. try `, b: B_NORM }, { t: 'man dvm', b: B_BRIGHT, cmd: 'man dvm' }])
  }
}
