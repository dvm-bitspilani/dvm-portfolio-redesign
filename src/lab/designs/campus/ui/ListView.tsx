import { useEffect, useRef } from 'react'
import { artworks, blogs, site, socials, team } from '../../../data'
import { BASE, FEST_COLOR, VERTICAL_COLOR, VERTICAL_ORDER, kindLabel, projectsByFest, verticalById } from '../content'
import { campus } from '../store'

/** The whole campus as a printed directory: the accessible, readable twin of the world. */
export function ListView({ go }: { go: (to: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.focus()
  }, [])
  const nav = (to: string) => (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey) return
    e.preventDefault()
    campus.set({ listOpen: false })
    go(to)
  }
  return (
    <div className="cmp-list" ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="cmp-list-h">
      <div className="cmp-list__inner">
        <header className="cmp-list__head">
          <h1 id="cmp-list-h">Campus directory</h1>
          <p>
            Everything in the world, as a list. {site.about[0]}
          </p>
        </header>

        <section className="cmp-list__sec" aria-labelledby="ls-work">
          <h2 id="ls-work">
            <a href={`${BASE}/work`} onClick={nav(`${BASE}/work`)}>
              The Studio
            </a>
            <small>Work</small>
          </h2>
          <div className="cmp-list__cols">
            {projectsByFest.map((g) => (
              <div key={g.fest}>
                <h3>
                  <i style={{ background: FEST_COLOR[g.fest] }} />
                  {g.fest === 'Campus' ? 'Around campus' : g.fest}
                </h3>
                <ul>
                  {g.items.map((p) => (
                    <li key={p.slug}>
                      <a href={`${BASE}/work/${p.slug}`} onClick={nav(`${BASE}/work/${p.slug}`)}>
                        {p.title}
                      </a>
                      <small>
                        {kindLabel[p.kind]}
                        {p.year ? `, ${p.year}` : ''}
                      </small>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="cmp-list__sec" aria-labelledby="ls-team">
          <h2 id="ls-team">
            <a href={`${BASE}/team`} onClick={nav(`${BASE}/team`)}>
              The Amphitheatre
            </a>
            <small>Team</small>
          </h2>
          <div className="cmp-list__cols">
            {VERTICAL_ORDER.map((v) => (
              <div key={v}>
                <h3>
                  <i style={{ background: VERTICAL_COLOR[v] }} />
                  {verticalById[v].name}
                </h3>
                <ul>
                  {team
                    .filter((m) => m.vertical === v)
                    .sort((a, b) => b.batch - a.batch || a.name.localeCompare(b.name))
                    .map((m) => (
                      <li key={m.slug}>
                        <a href={`${BASE}/team?m=${m.slug}`} onClick={nav(`${BASE}/team?m=${m.slug}`)}>
                          {m.name}
                        </a>
                        <small>{m.designation ?? m.batch}</small>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="cmp-list__sec" aria-labelledby="ls-journal">
          <h2 id="ls-journal">
            <a href={`${BASE}/journal`} onClick={nav(`${BASE}/journal`)}>
              The Library
            </a>
            <small>Journal</small>
          </h2>
          <div className="cmp-list__cols">
            <div>
              <h3>On the shelf</h3>
              <ul>
                {blogs.map((b) => (
                  <li key={b.slug}>
                    <a href={b.url} target="_blank" rel="noreferrer">
                      {b.title}
                    </a>
                    <small>
                      {b.authors.join(' & ')}, {b.date}
                    </small>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3>On the walls</h3>
              <ul>
                {artworks.map((a) => (
                  <li key={a.slug}>
                    <a href={`${BASE}/journal?item=a:${a.slug}`} onClick={nav(`${BASE}/journal?item=${encodeURIComponent(`a:${a.slug}`)}`)}>
                      {a.title}
                    </a>
                    <small>
                      {a.artist}, {a.year}
                    </small>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="cmp-list__sec" aria-labelledby="ls-contact">
          <h2 id="ls-contact">
            <a href={`${BASE}/contact`} onClick={nav(`${BASE}/contact`)}>
              The Clock Tower
            </a>
            <small>Contact</small>
          </h2>
          <p className="cmp-list__contact">
            Write to <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>, or find us on{' '}
            {socials.map((s, i) => (
              <span key={s.id}>
                <a href={s.url} target="_blank" rel="noreferrer">
                  {s.label}
                </a>
                {i < socials.length - 2 ? ', ' : i === socials.length - 2 ? ' and ' : '.'}
              </span>
            ))}
          </p>
        </section>
      </div>
    </div>
  )
}
