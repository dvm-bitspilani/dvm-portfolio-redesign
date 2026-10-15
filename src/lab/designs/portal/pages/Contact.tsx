import { useState, type FormEvent } from 'react'
import { site, socials } from '../../../data'
import { usePortal } from '../store'
import { useTarget } from './shared'

export default function Contact() {
  useTarget({ kind: 'contact' })
  const flying = usePortal((s) => s.flying)
  const [sent, setSent] = useState(false)

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const name = String(f.get('name') ?? '')
    const from = String(f.get('email') ?? '')
    const msg = String(f.get('message') ?? '')
    const body = `${msg}\n\n${name}${from ? ` <${from}>` : ''}`
    window.location.href = `mailto:${site.contact.email}?subject=${encodeURIComponent(`Hello DVM, from ${name || 'a visitor'}`)}&body=${encodeURIComponent(body)}`
    setSent(true)
  }

  return (
    <section className={`pt-contact${flying ? '' : ' is-in'}`} aria-labelledby="pt-contact-title">
      <h1 id="pt-contact-title" className="pt-sr">
        Contact DVM
      </h1>
      <a className="pt-contact-mail" href={`mailto:${site.contact.email}`}>
        {site.contact.email}
      </a>
      <form className="pt-form" onSubmit={submit}>
        <label>
          <span>Name</span>
          <input name="name" autoComplete="name" required />
        </label>
        <label>
          <span>Email</span>
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label className="pt-form-wide">
          <span>Message</span>
          <textarea name="message" rows={2} required />
        </label>
        <button type="submit" className="pt-btn pt-btn-hot">
          {sent ? 'Opened in your mail app' : 'Send the message'}
        </button>
      </form>
      <ul className="pt-socials" aria-label="DVM elsewhere">
        {socials.map((s) => (
          <li key={s.id}>
            <a href={s.url} target="_blank" rel="noreferrer">
              {s.label}
            </a>
          </li>
        ))}
      </ul>
      <p className="pt-mischief">{site.taglines.mischief}</p>
    </section>
  )
}
