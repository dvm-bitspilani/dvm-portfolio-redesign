import { useMemo, useRef, useState } from 'react'
import { team, verticals, type Member, type VerticalId } from '../../../data'
import LiquidLens, { useLens } from '../ui/LiquidLens'
import Footer from '../ui/Footer'

const label = (id: VerticalId) => verticals.find((v) => v.id === id)?.label ?? id
const batches = [...new Set(team.map((m) => m.batch))].sort((a, b) => b - a)

const SOCIAL_ORDER = ['linkedin', 'github', 'dribbble', 'behance', 'instagram', 'twitter'] as const
const SOCIAL_LABEL: Record<(typeof SOCIAL_ORDER)[number], string> = {
  linkedin: 'LinkedIn',
  github: 'GitHub',
  dribbble: 'Dribbble',
  behance: 'Behance',
  instagram: 'Instagram',
  twitter: 'X',
}

function Card({ m, lens }: { m: Member; lens: ReturnType<typeof useLens> }) {
  const social = SOCIAL_ORDER.find((k) => m.socials[k])
  const imgEl = useRef<HTMLImageElement>(null)
  return (
    <li className="merc-card">
      <div
        className="merc-card__photo"
        {...lens.bind(() => ({ src: m.photo, mode: 'loupe', el: imgEl.current }))}
      >
        <img ref={imgEl} src={m.photo} alt="" loading="lazy" decoding="async" />
      </div>
      <h3 className="merc-card__name">{m.name}</h3>
      <p className="merc-card__role">{m.designation ?? `${label(m.vertical)} team`}</p>
      {social && (
        <a className="merc-card__link" href={m.socials[social]} target="_blank" rel="noreferrer" aria-label={`${m.name} on ${SOCIAL_LABEL[social]}`}>
          {SOCIAL_LABEL[social]}
        </a>
      )}
    </li>
  )
}

export default function Team() {
  const [v, setV] = useState<VerticalId | 'all'>('all')
  const lens = useLens()
  const grouped = useMemo(
    () =>
      batches
        .map((b) => ({
          batch: b,
          members: team
            .filter((m) => m.batch === b && (v === 'all' || m.vertical === v))
            .sort((a, c) => Number(!!c.isPorHolder) - Number(!!a.isPorHolder) || a.name.localeCompare(c.name)),
        }))
        .filter((g) => g.members.length),
    [v],
  )
  const total = grouped.reduce((n, g) => n + g.members.length, 0)

  return (
    <main id="merc-main" className="merc-page merc-team">
      <LiquidLens controller={lens} size={280} radius={0.5} />
      <header className="merc-page__head">
        <h1 className="merc-display merc-display--page">
          <span data-line>Team</span>
        </h1>
        <p className="merc-page__intro">
          {team.length} people across {batches.length} batches, from {batches[batches.length - 1]} to {batches[0]}. Hold the
          mercury over a face to bring it back into colour.
        </p>
      </header>

      <div className="merc-filter" role="group" aria-label="Filter by team">
        <button type="button" aria-pressed={v === 'all'} onClick={() => setV('all')}>
          Everyone
        </button>
        {verticals.map((x) => (
          <button key={x.id} type="button" aria-pressed={v === x.id} onClick={() => setV(x.id)}>
            {x.label}
          </button>
        ))}
        <span className="merc-filter__count" aria-live="polite">
          {total} people
        </span>
      </div>
      {v !== 'all' && <p className="merc-team__desc">{verticals.find((x) => x.id === v)?.description}</p>}

      {grouped.map((g) => (
        <section key={g.batch} className="merc-batch" aria-labelledby={`b-${g.batch}`}>
          <h2 id={`b-${g.batch}`} className="merc-batch__label">
            <span className="merc-chrome">{g.batch}</span>
            <small>batch, {g.members.length}</small>
          </h2>
          <ul className="merc-cards">
            {g.members.map((m) => (
              <Card key={m.slug} m={m} lens={lens} />
            ))}
          </ul>
        </section>
      ))}
      <Footer />
    </main>
  )
}
