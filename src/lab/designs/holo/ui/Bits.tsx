import type { ReactNode } from 'react'
import type { SocialLink } from '../../../data'
import { site } from '../../../data'
import { Scramble } from './Scramble'

/**
 * Image shown as a hologram (cyan duotone, scanlines, split channels) that materialises
 * into true colour behind a scan wipe on hover/focus of its closest link.
 */
export function HoloImage({ src, alt, label, ratio = '16 / 10' }: { src?: string; alt: string; label?: string; ratio?: string }) {
  return (
    <span className={`holo-img${ratio === 'auto' ? ' is-flow' : ''}`} style={ratio === 'auto' ? undefined : { aspectRatio: ratio }}>
      {src ? (
        <>
          <img className="holo-img__ghost" src={src} alt={alt} loading="lazy" decoding="async" />
          <img className="holo-img__true" src={src} alt="" aria-hidden="true" loading="lazy" decoding="async" />
        </>
      ) : (
        <span className="holo-img__empty" aria-hidden="true">
          {label}
        </span>
      )}
      <span className="holo-img__scan" aria-hidden="true" />
      <span className="holo-img__corners" aria-hidden="true" />
    </span>
  )
}

export function PageHead({ title, children, index }: { title: string; children?: ReactNode; index?: string }) {
  return (
    <header className="holo-pagehead">
      {index && (
        <p className="holo-pagehead__index" aria-hidden="true">
          {index}
        </p>
      )}
      <Scramble as="h1" text={title} className="holo-pagehead__title" />
      {children && <div className="holo-pagehead__body">{children}</div>}
    </header>
  )
}

export function Footer({ socials }: { socials: SocialLink[] }) {
  return (
    <footer className="holo-footer">
      <Scramble as="p" text={site.taglines.mischief} className="holo-footer__oath" />
      <div className="holo-footer__row">
        <ul aria-label="DVM elsewhere">
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
        <p>{site.taglines.footer}</p>
      </div>
    </footer>
  )
}
