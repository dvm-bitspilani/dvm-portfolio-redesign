import { useEffect, useRef, useState, type FormEvent, type RefObject } from 'react'
import { fests, site, socials } from '../../../data'
import { useReducedMotion } from '../scene/common'
import { Footer, PageHead } from '../ui/Bits'

type Stage = 'idle' | 'encoding' | 'uplink' | 'sent'

/** Oscilloscope that idles as a carrier wave and spikes with every keystroke. */
function Scope({ energy, reduced }: { energy: RefObject<number>; reduced: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const ctx = c.getContext('2d')!
    let raf = 0
    let t = 0
    let running = !document.hidden
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2)
      c.width = c.clientWidth * dpr
      c.height = c.clientHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const draw = () => {
      const w = c.clientWidth
      const h = c.clientHeight
      t += 0.016
      energy.current = Math.max(0, energy.current * 0.94)
      const e = energy.current
      ctx.clearRect(0, 0, w, h)
      // grid
      ctx.strokeStyle = 'rgba(94,242,255,0.08)'
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let x = 0; x <= w; x += w / 16) {
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
      }
      for (let y = 0; y <= h; y += h / 6) {
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
      }
      ctx.stroke()
      // traces
      const trace = (phase: number, color: string, amp: number, width: number) => {
        ctx.strokeStyle = color
        ctx.lineWidth = width
        ctx.beginPath()
        for (let x = 0; x <= w; x += 2) {
          const u = x / w
          const env = Math.sin(u * Math.PI)
          const y =
            h / 2 +
            Math.sin(u * 18 + t * 3 + phase) * (6 + amp * 26) * env +
            Math.sin(u * 61 - t * 7 + phase) * amp * 18 * env * Math.sin(t * 13 + u * 9) +
            (Math.random() - 0.5) * amp * 10
          if (x === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
      ctx.shadowColor = '#5ef2ff'
      ctx.shadowBlur = 10
      trace(1.7, 'rgba(138,108,255,0.55)', e * 0.7, 1)
      trace(0, '#5ef2ff', e, 1.5)
      ctx.shadowBlur = 0
      if (running && !reduced) raf = requestAnimationFrame(draw)
    }
    const vis = () => {
      running = !document.hidden
      cancelAnimationFrame(raf)
      if (running) raf = requestAnimationFrame(draw)
    }
    draw()
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', vis)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', vis)
    }
  }, [energy, reduced])
  return <canvas ref={ref} className="holo-scope" aria-hidden="true" />
}

export default function Contact() {
  const reduced = useReducedMotion()
  const energy = useRef(0)
  const [stage, setStage] = useState<Stage>('idle')
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' })

  const bump = () => {
    energy.current = Math.min(1.4, energy.current + 0.35)
  }
  const field = (k: keyof typeof form) => ({
    value: form[k],
    onChange: (e: { target: { value: string } }) => {
      setForm((f) => ({ ...f, [k]: e.target.value }))
      bump()
    },
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError('Add your name, email and a message, then transmit again.')
      return
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      setError('That email address looks incomplete. Check it and transmit again.')
      return
    }
    setError(null)
    energy.current = 2
    setStage('encoding')
    const body = `${form.message}\n\n${form.name}${form.phone ? `\n${form.phone}` : ''}\n${form.email}`
    const href = `mailto:${site.contact.email}?subject=${encodeURIComponent(`Message from ${form.name}`)}&body=${encodeURIComponent(body)}`
    window.setTimeout(() => setStage('uplink'), reduced ? 0 : 700)
    window.setTimeout(() => {
      setStage('sent')
      window.location.href = href
    }, reduced ? 0 : 1500)
  }

  const STATUS: Record<Stage, string> = {
    idle: 'Channel open. Your message goes to the DVM inbox.',
    encoding: 'Encoding your message',
    uplink: 'Handing off to your mail app',
    sent: `Your mail app should now have a draft addressed to ${site.contact.email}.`,
  }

  return (
    <main className="holo-page holo-contact">
      <PageHead title="Contact" index="Transmission console">
        <p>Sponsoring a fest, hiring from the team, or want to build with us? Write in and a coordinator will reply.</p>
      </PageHead>

      <div className="holo-console">
        <form className="holo-console__form" onSubmit={submit} noValidate>
          <Scope energy={energy} reduced={reduced} />
          <div className="holo-console__fields">
            <label className="is-wide">
              <span>Name</span>
              <input name="name" autoComplete="name" {...field('name')} />
            </label>
            <label>
              <span>Email</span>
              <input name="email" type="email" autoComplete="email" {...field('email')} />
            </label>
            <label>
              <span>Phone number</span>
              <input name="phone" type="tel" autoComplete="tel" {...field('phone')} />
            </label>
            <label className="is-wide">
              <span>Message</span>
              <textarea name="message" rows={5} {...field('message')} />
            </label>
          </div>
          <div className="holo-console__foot">
            <p className={`holo-console__status is-${stage}${error ? ' is-error' : ''}`} role="status" aria-live="polite">
              {error ?? STATUS[stage]}
            </p>
            <button type="submit" className="holo-btn is-solid" disabled={stage === 'encoding' || stage === 'uplink'}>
              {stage === 'idle' || stage === 'sent' ? 'Transmit' : 'Transmitting'}
            </button>
          </div>
        </form>

        <aside className="holo-console__side" aria-label="Other channels">
          <h2>Direct line</h2>
          <a className="holo-console__mail" href={`mailto:${site.contact.email}`}>
            {site.contact.email}
          </a>
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
          <h2>The fests we build for</h2>
          <ul>
            {fests.map((f) => (
              <li key={f.id}>
                <a href={f.website} target="_blank" rel="noreferrer">
                  {f.name}
                </a>
              </li>
            ))}
          </ul>
        </aside>
      </div>
      <Footer socials={socials} />
    </main>
  )
}
