import { Link } from 'react-router-dom'
import { site, socials } from '../../../data'
import { BASE } from './Nav'

export default function Footer() {
  return (
    <footer className="merc-foot">
      <p className="merc-foot__oath">{site.taglines.mischief}.</p>
      <div className="merc-foot__cols">
        <div>
          <Link to={`${BASE}/contact`} className="merc-foot__cta">
            Write to us
          </Link>
          <a href={`mailto:${site.contact.email}`} className="merc-foot__mail">
            {site.contact.email}
          </a>
        </div>
        <ul className="merc-foot__social">
          {socials.map((s) => (
            <li key={s.id}>
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
      <p className="merc-foot__made">{site.taglines.footer}, BITS Pilani</p>
    </footer>
  )
}
