import { useEffect, useMemo, useRef, useState } from 'react'
import { team, verticals, type Member, type VerticalId } from '../../../data'
import { regions } from '../engine/director'
import { shapes, showFormation, useDirector } from '../engine/formations'

const primaryLink = (m: Member) => m.socials.linkedin ?? m.socials.github ?? m.socials.behance ?? m.socials.dribbble ?? m.socials.instagram ?? m.socials.twitter

export default function Team() {
  const d = useDirector()
  const [section, setSection] = useState<VerticalId | 'all'>('all')
  const [member, setMember] = useState<Member | null>(null)
  const timer = useRef(0)
  const refs = useRef<Partial<Record<VerticalId | 'all', HTMLElement | null>>>({})

  const groups = useMemo(
    () =>
      verticals.map((v) => {
        const people = team.filter((m) => m.vertical === v.id)
        const years = [...new Set(people.map((m) => m.batch))].sort((a, b) => b - a)
        return { v, people, years: years.map((y) => ({ y, people: people.filter((m) => m.batch === y) })) }
      }),
    [],
  )

  // Which vertical is in the middle of the viewport → its head-count is the idle formation.
  useEffect(() => {
    d.parallax = 0.25
    d.alpha = 1
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setSection((e.target as HTMLElement).dataset.v as VerticalId | 'all')
      },
      { rootMargin: '-30% 0px -60% 0px' },
    )
    for (const el of Object.values(refs.current)) if (el) io.observe(el)
    return () => {
      io.disconnect()
      window.clearTimeout(timer.current)
    }
  }, [d])

  useEffect(() => {
    if (member) {
      return showFormation(d, shapes.portrait(member.photo), { region: regions.right, fill: 0.92, sway: 0.18 }, { kick: 0.8 })
    }
    const n = section === 'all' ? team.length : team.filter((m) => m.vertical === section).length
    return showFormation(d, shapes.word(String(n), 700), { region: regions.right, fill: 0.62, sway: 0.35 }, { kick: 0.6, pin: true })
  }, [d, member, section])

  const hover = (m: Member | null, delay: number) => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setMember(m), delay)
  }

  const vName = (id: VerticalId) => verticals.find((v) => v.id === id)?.label

  return (
    <div className="sw-page sw-team">
      <header className="sw-pagehead" data-v="all" ref={(el) => void (refs.current.all = el)}>
        <h1 className="sw-display sw-display--page">Team</h1>
        <p className="sw-lede">
          {team.length} people have been DVM since the 2017 batch, across five teams. Point at a name and the swarm draws their face.
        </p>
      </header>

      {groups.map(({ v, people, years }) => (
        <section key={v.id} className="sw-vertical" data-v={v.id} ref={(el) => void (refs.current[v.id] = el)} aria-labelledby={`sw-v-${v.id}`}>
          <div className="sw-vertical__head">
            <h2 id={`sw-v-${v.id}`} className="sw-h2">
              {v.name}
            </h2>
            <p className="sw-body">{v.description}</p>
            <p className="sw-count">{people.length} members</p>
          </div>
          <div className="sw-roster" onPointerLeave={() => hover(null, 300)}>
            {years.map(({ y, people: ps }) => (
              <div className="sw-roster__year" key={y}>
                <h3>{y}</h3>
                <ul>
                  {ps.map((m) => {
                    const href = primaryLink(m)
                    const props = {
                      onPointerEnter: () => hover(m, 60),
                      onFocus: () => hover(m, 0),
                      onBlur: () => hover(null, 200),
                      className: member?.slug === m.slug ? 'is-active' : undefined,
                    }
                    return (
                      <li key={m.slug}>
                        {href ? (
                          <a href={href} target="_blank" rel="noreferrer" {...props}>
                            {m.name}
                          </a>
                        ) : (
                          <span tabIndex={0} {...props}>
                            {m.name}
                          </span>
                        )}
                        {m.designation && <small>{m.designation}</small>}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ))}

      <aside className="sw-caption" aria-live="polite">
        {member ? (
          <>
            <strong>{member.name}</strong>
            <span>
              {vName(member.vertical)}, {member.batch} batch{member.designation ? `. ${member.designation}` : ''}
            </span>
          </>
        ) : (
          <span>
            {section === 'all' ? `${team.length} members on record` : `${team.filter((m) => m.vertical === section).length} in ${vName(section)}`}
          </span>
        )}
      </aside>
    </div>
  )
}
