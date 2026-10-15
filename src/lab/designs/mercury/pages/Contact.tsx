import { useRef, useState, type FormEvent } from 'react'
import { site, socials } from '../../../data'
import ContactDroplet, { type DropletApi } from '../ui/ContactDroplet'

export default function Contact() {
  const api = useRef<DropletApi | null>(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' })
  const [status, setStatus] = useState<string | null>(null)

  const total = form.name.length + form.email.length + form.phone.length + form.message.length
  const update = (k: keyof typeof form) => (e: { target: { value: string } }) => {
    const next = { ...form, [k]: e.target.value }
    setForm(next)
    api.current?.type(next.name.length + next.email.length + next.phone.length + next.message.length)
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!form.message.trim()) {
      setStatus('Add a message first. The mercury needs something to carry.')
      return
    }
    const body = `${form.message}\n\n${form.name}${form.email ? `\n${form.email}` : ''}${form.phone ? `\n${form.phone}` : ''}`
    const href = `mailto:${site.contact.email}?subject=${encodeURIComponent(`Hello from ${form.name || 'a visitor'}`)}&body=${encodeURIComponent(body)}`
    api.current?.burst()
    setStatus(`Your mail app should open with the message addressed to ${site.contact.email}. Nothing is sent until you press send there.`)
    window.location.href = href
  }

  return (
    <main id="merc-main" className="merc-page merc-contact">
      <div className="merc-contact__grid">
        <div className="merc-contact__form-col">
          <header className="merc-page__head merc-page__head--tight">
            <h1 className="merc-display merc-display--page">
              <span data-line>Write</span>
              <span data-line>to us</span>
            </h1>
            <p className="merc-page__intro">
              Sponsors, fest teams, students who want in. Every letter you type adds a drop to the pool.
            </p>
          </header>
          <form className="merc-form" onSubmit={submit} noValidate>
            <label>
              <span>Name</span>
              <input name="name" autoComplete="name" value={form.name} onChange={update('name')} />
            </label>
            <label>
              <span>Email</span>
              <input name="email" type="email" autoComplete="email" value={form.email} onChange={update('email')} />
            </label>
            <label>
              <span>Phone number</span>
              <input name="phone" type="tel" autoComplete="tel" value={form.phone} onChange={update('phone')} />
            </label>
            <label className="merc-form__wide">
              <span>Message</span>
              <textarea name="message" rows={5} value={form.message} onChange={update('message')} />
            </label>
            <div className="merc-form__foot">
              <button type="submit" className="merc-button">
                <span className="merc-play__bead" aria-hidden="true" />
                Compose email
              </button>
              <span className="merc-form__count">{total} characters in the pool</span>
            </div>
            {status && (
              <p className="merc-form__status" role="status">
                {status}
              </p>
            )}
          </form>
          <ul className="merc-contact__social">
            {socials.map((s) => (
              <li key={s.id}>
                <a href={s.url} target="_blank" rel="noreferrer">
                  {s.label}
                </a>
              </li>
            ))}
            <li>
              <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>
            </li>
          </ul>
        </div>
        <div className="merc-contact__pool">
          <ContactDroplet api={api} />
        </div>
      </div>
    </main>
  )
}
