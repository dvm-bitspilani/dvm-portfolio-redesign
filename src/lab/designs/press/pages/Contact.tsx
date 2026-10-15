import { useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { site, socials } from '../../../data'
import PageHead from '../components/PageHead'

type Field = 'name' | 'email' | 'phone' | 'message'
const FIELDS: { id: Field; label: string; type: string; multiline?: boolean; required?: boolean; auto?: string }[] = [
  { id: 'name', label: site.contact.formFields[0], type: 'text', required: true, auto: 'name' },
  { id: 'email', label: site.contact.formFields[1], type: 'email', required: true, auto: 'email' },
  { id: 'phone', label: site.contact.formFields[2], type: 'tel', auto: 'tel' },
  { id: 'message', label: site.contact.formFields[3], type: 'text', multiline: true, required: true },
]

/** Deterministic per-character jitter so each struck letter keeps its wobble. */
function strike(i: number, c: number) {
  const h = Math.sin(i * 12.9898 + c * 78.233) * 43758.5453
  const f = h - Math.floor(h)
  const g = (Math.sin(i * 4.1 + c * 1.7) * 9301.17) % 1
  return {
    '--jx': `${((f - 0.5) * 1.2).toFixed(2)}px`,
    '--jy': `${((g - 0.5) * 1.6).toFixed(2)}px`,
    '--jr': `${((f - 0.5) * 3).toFixed(2)}deg`,
    '--ink': (0.72 + f * 0.28).toFixed(2),
  } as CSSProperties
}

function TypeField({ f, value, onChange, error }: { f: (typeof FIELDS)[number]; value: string; onChange: (v: string) => void; error?: string }) {
  const mirror = useRef<HTMLDivElement>(null)
  const sync = (el: HTMLInputElement | HTMLTextAreaElement) => {
    if (mirror.current) {
      mirror.current.scrollLeft = el.scrollLeft
      mirror.current.scrollTop = el.scrollTop
    }
  }
  const chars = [...value]
  const common = {
    id: `pr-f-${f.id}`,
    name: f.id,
    value,
    required: f.required,
    autoComplete: f.auto,
    spellCheck: false,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `pr-e-${f.id}` : undefined,
    onScroll: (e: { currentTarget: HTMLInputElement | HTMLTextAreaElement }) => sync(e.currentTarget),
    onSelect: (e: { currentTarget: HTMLInputElement | HTMLTextAreaElement }) => sync(e.currentTarget),
  }
  return (
    <div className={`pr-tw-field ${f.multiline ? 'is-multi' : ''} ${error ? 'is-err' : ''}`}>
      <label htmlFor={common.id}>
        {f.label}
        {f.required ? '' : ' (optional)'}
      </label>
      <div className="pr-tw-line">
        <div ref={mirror} className="pr-tw-mirror" aria-hidden="true">
          {chars.map((c, i) => (
            <span key={i} className={i === chars.length - 1 ? 'is-new' : undefined} style={strike(i, c.charCodeAt(0))}>
              {c === '\n' ? '\n' : c}
            </span>
          ))}
          {f.multiline && '​'}
        </div>
        {f.multiline ? (
          <textarea {...common} rows={6} onChange={(e) => (onChange(e.target.value), sync(e.target))} />
        ) : (
          <input {...common} type={f.type} onChange={(e) => (onChange(e.target.value), sync(e.target))} />
        )}
      </div>
      {error && (
        <p id={`pr-e-${f.id}`} className="pr-tw-err">
          {error}
        </p>
      )}
    </div>
  )
}

export default function Contact() {
  const [v, setV] = useState<Record<Field, string>>({ name: '', email: '', phone: '', message: '' })
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
  const [sent, setSent] = useState(false)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const err: Partial<Record<Field, string>> = {}
    if (!v.name.trim()) err.name = 'Type your name so we know who wrote in.'
    if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) err.email = 'Type an email address we can reply to, like you@example.com.'
    if (!v.message.trim()) err.message = 'The message is blank. Type what you would like to say.'
    setErrors(err)
    if (Object.keys(err).length) {
      document.getElementById(`pr-f-${Object.keys(err)[0]}`)?.focus()
      return
    }
    const body = `${v.message}\n\n${v.name}\n${v.email}${v.phone ? `\n${v.phone}` : ''}`
    window.location.href = `mailto:${site.contact.email}?subject=${encodeURIComponent(`Letter from ${v.name}`)}&body=${encodeURIComponent(body)}`
    setSent(true)
  }

  return (
    <main className="pr-page pr-contact">
      <div className="pr-wrap">
        <PageHead letter="D" section="Letters to the editor" title="Contact" dek="Write to the department. The letter is typed here and sent from your own mail app to the DVM inbox." />
        <div className="pr-contact-grid">
          <form className={`pr-tw ${sent ? 'is-sent' : ''}`} onSubmit={submit} noValidate>
            <div className="pr-tw-head">
              <span>To: {site.contact.email}</span>
              <span>Re: a letter to DVM</span>
            </div>
            {FIELDS.map((f) => (
              <TypeField key={f.id} f={f} value={v[f.id]} error={errors[f.id]} onChange={(x) => setV((o) => ({ ...o, [f.id]: x }))} />
            ))}
            <div className="pr-tw-foot">
              <button type="submit" className="pr-tw-send">
                Send the letter
              </button>
              <p className="pr-tw-note" aria-live="polite">
                {sent ? 'Your mail app should now be open with the letter filled in. Press send there to deliver it.' : 'Opens your mail app with everything you typed.'}
              </p>
            </div>
            <div className="pr-stamp" aria-hidden="true">
              Filed
            </div>
          </form>
          <aside className="pr-contact-side">
            <h2>Write directly</h2>
            <p>
              <a className="pr-contact-mail" href={`mailto:${site.contact.email}`}>
                {site.contact.email}
              </a>
            </p>
            <h2>Elsewhere</h2>
            <ul>
              {socials.map((s) => (
                <li key={s.id}>
                  <a href={s.url} target="_blank" rel="noreferrer">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
            <p className="pr-cap">
              <em>Set in JetBrains Mono.</em> Every key strikes a little off true, the way a typebar does.
            </p>
          </aside>
        </div>
      </div>
    </main>
  )
}
