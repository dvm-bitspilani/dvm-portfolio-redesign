import { site, socials } from '../../../data'
import type { App, Engine, KeyEv, Rect } from '../engine/engine'
import { B_BRIGHT, B_DIM, B_MID, B_NORM, F_BLINK, F_INV, F_UL, padR, wrapLine } from '../engine/grid'

interface Field {
  key: 'name' | 'email' | 'phone' | 'message'
  label: string
  max: number
  optional?: boolean
}
const FIELDS: Field[] = [
  { key: 'name', label: 'From', max: 60 },
  { key: 'email', label: 'Reply-To', max: 80 },
  { key: 'phone', label: 'Phone', max: 20, optional: true },
  { key: 'message', label: 'Message', max: 2000 },
]

export class ContactApp implements App {
  readonly id = 'contact' as const
  readonly hidePrompt = true
  private v = { name: '', email: '', phone: '', message: '' }
  private focus = 0
  private status: { text: string; err: boolean } = { text: 'Tab moves between fields. ^X sends, Esc leaves.', err: false }

  cwd() {
    return '~/contact'
  }

  chips() {
    return ['cd ~', 'cat contact', 'cd work', 'cd team']
  }

  private get field() {
    return FIELDS[this.focus]
  }

  textInput(_e: Engine, ch: string) {
    const f = this.field
    if (ch === '\n' && f.key !== 'message') {
      this.focus = Math.min(FIELDS.length - 1, this.focus + 1)
      return true
    }
    if (this.v[f.key].length < f.max) this.v[f.key] += ch
    return true
  }

  key(e: Engine, k: KeyEv) {
    const f = this.field
    if (k.ctrl && k.key.toLowerCase() === 'x') {
      this.send()
      return true
    }
    if ((k.ctrl && k.key.toLowerCase() === 'c') || k.key === 'Escape') {
      e.flash('draft kept')
      e.go('')
      return true
    }
    switch (k.key) {
      case 'Tab':
        this.focus = (this.focus + (k.shift ? FIELDS.length - 1 : 1)) % FIELDS.length
        return true
      case 'ArrowDown':
        if (f.key === 'message') return true
        this.focus = Math.min(FIELDS.length - 1, this.focus + 1)
        return true
      case 'ArrowUp':
        if (f.key === 'message' && this.v.message) return true
        this.focus = Math.max(0, this.focus - 1)
        return true
      case 'Enter':
        if (f.key === 'message') this.v.message += '\n'
        else this.focus++
        return true
      case 'Backspace':
        this.v[f.key] = this.v[f.key].slice(0, -1)
        return true
    }
    return false
  }

  private send() {
    const { name, email, message, phone } = this.v
    if (!name.trim()) return this.fail(0, 'Add your name in From so we know who wrote.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return this.fail(1, 'Reply-To needs an email with an @ and a domain, like you@pilani.bits-pilani.ac.in.')
    if (!message.trim()) return this.fail(3, 'The message is empty. Write a line or two first.')
    const body = `${message}\n\n— ${name}${phone ? `\n${phone}` : ''}\n${email}`
    const url = `mailto:${site.contact.email}?subject=${encodeURIComponent(`Hello from ${name}`)}&body=${encodeURIComponent(body)}`
    window.location.href = url
    this.status = { text: `Handed to your mail client. If nothing opened, write to ${site.contact.email}.`, err: false }
  }

  private fail(i: number, msg: string) {
    this.focus = i
    this.status = { text: msg, err: true }
  }

  draw(e: Engine, r: Rect) {
    const g = e.main
    const side = e.narrow ? 0 : Math.min(34, Math.floor(r.w * 0.28))
    const W = r.w - (side ? side + 2 : 0)
    const H = r.h
    g.box(r.x, r.y, W, H, { b: B_DIM }, 'compose: new message', true)
    g.textR(r.x + W - 2, r.y, ' dvm-mail 26.10 ', { b: B_DIM })
    const ix = r.x + 2
    const iw = W - 4
    let y = r.y + 2
    const lab = 11
    g.text(ix, y, padR('To', lab), { b: B_DIM })
    g.text(ix + lab, y, site.contact.email, { b: B_BRIGHT })
    y += 1
    for (let i = 0; i < 3; i++) {
      const f = FIELDS[i]
      const on = this.focus === i
      const link = e.link(() => (this.focus = i))
      g.text(ix, y, padR(f.label, lab), { b: on ? B_BRIGHT : B_DIM, link })
      const val = this.v[f.key]
      const w = Math.min(iw - lab, f.max + 2)
      g.fill(ix + lab, y, w, 1, ' ', { b: 60, f: F_UL, link })
      g.text(ix + lab, y, val.slice(-w + 1), { b: B_BRIGHT, f: F_UL, link })
      if (on) g.put(ix + lab + Math.min(val.length, w - 1), y, ' ', { b: B_BRIGHT, f: F_INV | F_BLINK })
      if (f.optional && !val && !on) g.text(ix + lab, y, 'optional', { b: 70, f: F_UL, link })
      y += 1
    }
    g.text(ix, y, padR('Subject', lab), { b: B_DIM })
    g.text(ix + lab, y, `Hello from ${this.v.name || '…'}`, { b: B_NORM })
    y += 2
    // message separator
    g.put(r.x, y, '╠', { b: B_DIM })
    g.hline(r.x + 1, y, W - 2, '═', { b: B_DIM })
    g.put(r.x + W - 1, y, '╣', { b: B_DIM })
    const mOn = this.focus === 3
    const mlink = e.link(() => (this.focus = 3))
    g.text(r.x + 3, y, ' Message Text ', { b: mOn ? B_BRIGHT : B_MID, link: mlink })
    y += 1
    const msgTop = y
    const msgH = r.y + H - 3 - msgTop
    const rows: string[] = []
    for (const para of this.v.message.split('\n')) {
      const wr = wrapLine([{ t: para }], iw)
      for (const row of wr) rows.push(row.map((c) => c.ch).join(''))
    }
    const start = Math.max(0, rows.length - msgH)
    g.fill(ix, msgTop, iw, msgH, ' ', { b: 0, link: mlink })
    for (let j = 0; j < msgH; j++) {
      const s = rows[start + j]
      if (s === undefined) break
      g.text(ix, msgTop + j, s, { b: B_BRIGHT, link: mlink })
    }
    if (!this.v.message && !mOn) g.text(ix, msgTop, 'Tell us about a project, a fest, or just say hi.', { b: 80, link: mlink })
    if (mOn) {
      const last = rows.length ? rows[rows.length - 1] : ''
      const cy = msgTop + Math.min(msgH - 1, Math.max(0, rows.length - 1 - start))
      g.put(ix + Math.min(iw - 1, last.length), cy, ' ', { b: B_BRIGHT, f: F_INV | F_BLINK })
    }
    // status + keys (pine style)
    const sy = r.y + H - 2
    g.text(ix, sy, this.status.text, { b: this.status.err ? B_BRIGHT : B_MID, f: this.status.err ? F_INV : 0 }, iw)
    const ky = r.y + H - 1
    let x = r.x + 2
    const keyBtn = (k: string, label: string, fn: () => void) => {
      const link = e.link(fn)
      x = g.text(x, ky, k, { b: B_BRIGHT, f: F_INV, link })
      x = g.text(x, ky, ` ${label} `, { b: B_NORM, link }) + 1
    }
    keyBtn('^X', 'Send', () => this.send())
    keyBtn('^C', 'Cancel', () => e.go(''))
    if (!e.narrow) keyBtn('Tab', 'Next field', () => (this.focus = (this.focus + 1) % FIELDS.length))

    if (side) {
      const sx = r.x + W + 2
      g.box(sx, r.y, side, H, { b: B_DIM }, 'elsewhere', true)
      let yy = r.y + 2
      const put = (t: string, b: number, link = 0) => {
        for (const row of wrapLine([{ t }], side - 4)) g.text(sx + 2, yy++, row.map((c) => c.ch).join(''), { b, link })
      }
      put('mail', B_DIM)
      put(site.contact.email, B_BRIGHT, e.link(() => (window.location.href = `mailto:${site.contact.email}`)))
      yy++
      for (const s of socials) {
        put(s.label.toLowerCase(), B_DIM)
        put(s.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''), B_NORM, e.link(() => window.open(s.url, '_blank', 'noopener')))
        yy++
      }
      yy++
      for (const p of site.about.slice(0, 1)) put(p, B_MID)
    }
  }
}
