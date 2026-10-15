import { useEffect, useState, type FormEvent } from 'react'
import { site, socials } from '../../../data'
import { regions } from '../engine/director'
import { shapes, showFormation, useDirector } from '../engine/formations'

export default function Contact() {
  const d = useDirector()
  const [writing, setWriting] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    d.parallax = 0.6
    d.alpha = 1
  }, [d])

  useEffect(() => {
    if (writing) return showFormation(d, shapes.envelope, { region: regions.right, fill: 0.8, sway: 0.25 }, { kick: 0.7, pin: true })
    return showFormation(d, shapes.ring, { region: regions.right, fill: 1.05, tilt: 1.22, spinSpeed: 0.35 }, { kick: 0.6, pin: true })
  }, [d, writing])

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const name = String(f.get('name') ?? '').trim()
    const email = String(f.get('email') ?? '').trim()
    const message = String(f.get('message') ?? '').trim()
    const body = `${message}\n\n${name}${email ? ` <${email}>` : ''}`
    d.explode(4)
    setWriting(false)
    setSent(true)
    window.location.href = `mailto:${site.contact.email}?subject=${encodeURIComponent(`Hello DVM, from ${name || 'a visitor'}`)}&body=${encodeURIComponent(body)}`
  }

  return (
    <div className="sw-page sw-contact">
      <header className="sw-pagehead">
        <h1 className="sw-display sw-display--page">Write to DVM</h1>
        <p className="sw-lede">Fest tech, sponsorships, collaborations, or a question about joining: write to the department directly.</p>
        <a className="sw-email" href={`mailto:${site.contact.email}`}>
          {site.contact.email}
        </a>
        <ul className="sw-socials">
          {socials.map((s) => (
            <li key={s.id}>
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </header>

      <form
        className="sw-form"
        onSubmit={submit}
        onFocus={() => setWriting(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setWriting(false)
        }}
      >
        <label>
          <span>Name</span>
          <input name="name" autoComplete="name" required />
        </label>
        <label>
          <span>Email</span>
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          <span>Message</span>
          <textarea name="message" rows={4} required />
        </label>
        <button type="submit" className="sw-btn sw-btn--solid">
          Open in your mail app
        </button>
        <p className="sw-formnote" aria-live="polite">
          {sent ? 'Your mail app should have opened with the message filled in.' : `This drafts an email to ${site.contact.email}; nothing is sent from this page.`}
        </p>
      </form>
    </div>
  )
}
