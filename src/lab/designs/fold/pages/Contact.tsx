import { useEffect, useRef, useState, type FormEvent } from 'react'
import gsap from 'gsap'
import { site, socials } from '../../../data'
import { usePrefersReducedMotion } from '../components/hooks'

type Phase = 'writing' | 'folding' | 'flown'
interface Note {
  name: string
  email: string
  phone: string
  message: string
}

export default function Contact() {
  const reduced = usePrefersReducedMotion()
  const [phase, setPhase] = useState<Phase>('writing')
  const [note, setNote] = useState<Note>({ name: '', email: '', phone: '', message: '' })
  const plane = useRef<HTMLDivElement>(null)
  const sheet = useRef<HTMLFormElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    if (!form.checkValidity()) {
      form.reportValidity()
      return
    }
    const r = form.getBoundingClientRect()
    setSize({ w: r.width, h: r.height })
    setPhase(reduced ? 'flown' : 'folding')
  }

  // fold the sheet into a paper plane and throw it
  useEffect(() => {
    if (phase !== 'folding' || !plane.current) return
    const root = plane.current
    const q = (s: string) => root.querySelector<HTMLElement>(s)!
    const fl = q('.plane__flap--l')
    const fr = q('.plane__flap--r')
    const hl = q('.plane__half--l')
    const hr = q('.plane__half--r')
    const bases = root.querySelectorAll<HTMLElement>('.plane__base')
    const tl = gsap.timeline({ onComplete: () => setPhase('flown') })
    tl.set(root, { '--s': 1, '--rz': '-1.2deg', '--rx': '0deg', '--px': '0px', '--py': '0px', '--pz': '0px' })
    tl.to(root, { '--s': 0.78, duration: 0.5, ease: 'power2.inOut' }, 0)
    tl.add(() => bases.forEach((b) => b.classList.add('is-cut')), 0.45)
    tl.to(fl, { '--a': '-180deg', duration: 0.7, ease: 'power2.inOut' }, 0.45)
    tl.to(fr, { '--a': '180deg', duration: 0.7, ease: 'power2.inOut' }, 0.62)
    tl.to(hr, { '--h': '-180deg', duration: 0.75, ease: 'power3.inOut' }, 1.35)
    // open into a dart
    tl.to(hl, { '--h': '-40deg', duration: 0.7, ease: 'power2.out' }, 2.15)
    tl.to(hr, { '--h': '-140deg', duration: 0.7, ease: 'power2.out' }, 2.15)
    tl.to(root, { '--rz': '78deg', '--rx': '-48deg', '--s': 0.62, duration: 0.8, ease: 'power2.inOut' }, 2.1)
    // throw
    tl.to(root, { '--px': '-40px', '--py': '30px', duration: 0.35, ease: 'power2.in' }, 2.95)
    tl.to(root, { '--px': '75vw', '--py': '-70vh', '--pz': '-500px', '--rz': '70deg', '--s': 0.25, duration: 1.15, ease: 'power2.in' }, 3.3)
    tl.to(root, { opacity: 0, duration: 0.3 }, 4.15)
    return () => {
      tl.kill()
    }
  }, [phase])

  const mailto = `mailto:${site.contact.email}?subject=${encodeURIComponent(`A note from ${note.name || 'a visitor'}`)}&body=${encodeURIComponent(
    `${note.message}\n\n${note.name}\n${note.email}${note.phone ? `\n${note.phone}` : ''}`,
  )}`

  const field = (k: keyof Note) => ({
    value: note[k],
    onChange: (e: { target: { value: string } }) => setNote((n) => ({ ...n, [k]: e.target.value })),
  })

  return (
    <main id="fold-main" className="fold-page fold-contact">
      <div className="fold-contact__copy">
        <h1 className="fold-h1">Write to us</h1>
        <p className="fold-page__lede">
          Sponsoring a fest, building something with us, or just curious how the APOGEE app handles a prof show queue? Fill in the sheet,
          then fold it and send it.
        </p>
        <dl className="fold-contact__dl">
          <dt>Email</dt>
          <dd>
            <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>
          </dd>
          <dt>Elsewhere</dt>
          <dd>
            {socials.map((s, i) => (
              <span key={s.id}>
                <a href={s.url} target="_blank" rel="noreferrer">
                  {s.label}
                </a>
                {i < socials.length - 1 ? ', ' : ''}
              </span>
            ))}
          </dd>
        </dl>
      </div>

      <div className="fold-desk">
        {phase === 'writing' && (
          <form ref={sheet} className="sheet" onSubmit={submit} noValidate={false}>
            <p className="sheet__to">To the Department of Visual Media</p>
            <label>
              <span>Your name</span>
              <input name="name" required autoComplete="name" {...field('name')} />
            </label>
            <label>
              <span>Email</span>
              <input name="email" type="email" required autoComplete="email" {...field('email')} />
            </label>
            <label>
              <span>Phone number (optional)</span>
              <input name="phone" type="tel" autoComplete="tel" {...field('phone')} />
            </label>
            <label className="sheet__msg">
              <span>Message</span>
              <textarea name="message" required rows={6} {...field('message')} />
            </label>
            <button type="submit" className="fold-btn fold-btn--foil sheet__send">
              Fold it and send
            </button>
          </form>
        )}

        {phase === 'folding' && (
          <div className="plane-stage" style={{ width: size.w, height: size.h }} aria-hidden>
            <div
              ref={plane}
              className="plane"
              style={{ ['--a' as string]: '0deg', ['--s' as string]: 1, ['--rz' as string]: '-1.2deg', ['--rx' as string]: '0deg', ['--px' as string]: '0px', ['--py' as string]: '0px', ['--pz' as string]: '0px', ['--w' as string]: `${size.w / 2}px`, ['--hh' as string]: `${size.h}px` }}
            >
              <div className="plane__half plane__half--l" style={{ ['--h' as string]: '0deg' }}>
                <div className="plane__base plane__base--l" />
                <div className="plane__under plane__under--l" />
                <div className="plane__flap plane__flap--l" style={{ ['--a' as string]: '0deg' }} />
              </div>
              <div className="plane__half plane__half--r" style={{ ['--h' as string]: '0deg' }}>
                <div className="plane__base plane__base--r" />
                <div className="plane__under plane__under--r" />
                <div className="plane__flap plane__flap--r" style={{ ['--a' as string]: '0deg' }} />
              </div>
            </div>
          </div>
        )}

        {phase === 'flown' && (
          <div className="sheet sheet--done" role="status">
            <p className="sheet__to">Folded and thrown</p>
            <h2 className="fold-h2">Thanks, {note.name.split(' ')[0] || 'friend'}.</h2>
            <p>
              This prototype has no mail server, so the last step happens in your email app. Your note is already written out and
              addressed to {site.contact.email}.
            </p>
            <a className="fold-btn fold-btn--foil" href={mailto}>
              Open it in your email app
            </a>
            <button
              type="button"
              className="fold-btn"
              onClick={() => {
                setNote({ name: '', email: '', phone: '', message: '' })
                setPhase('writing')
              }}
            >
              Write another note
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
