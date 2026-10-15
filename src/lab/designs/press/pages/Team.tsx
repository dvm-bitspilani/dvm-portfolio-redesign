import { useMemo, useState } from 'react'
import { team, verticals, type Member } from '../../../data'
import PageHead from '../components/PageHead'
import FloatingPlate from '../components/FloatingPlate'
import { memberLink } from '../lib/content'

const BATCHES = [...new Set(team.map((m) => m.batch))].sort((a, b) => a - b)

export default function Team() {
  const [batch, setBatch] = useState<number | null>(null)
  const [hot, setHot] = useState<Member | null>(null)
  const desks = useMemo(
    () =>
      verticals.map((v) => ({
        ...v,
        members: team.filter((m) => m.vertical === v.id && (batch === null || m.batch === batch)).sort((a, b) => Number(!!b.designation) - Number(!!a.designation) || a.batch - b.batch),
      })),
    [batch],
  )
  const shown = desks.reduce((s, d) => s + d.members.length, 0)

  return (
    <main className="pr-page pr-team">
      <div className="pr-wrap">
        <PageHead
          letter="B"
          section="The masthead"
          title="Team"
          dek={`${team.length} names on record across five teams, batches ${BATCHES[0]} to ${BATCHES[BATCHES.length - 1]}. Heavier names held a position of responsibility. Point at anyone to pull their portrait from the morgue.`}
          aside={
            <div className="pr-filter" role="group" aria-label="Filter by batch">
              <button type="button" aria-pressed={batch === null} onClick={() => setBatch(null)}>
                All <sup>{team.length}</sup>
              </button>
              {BATCHES.map((b) => (
                <button key={b} type="button" aria-pressed={batch === b} onClick={() => setBatch(b)}>
                  {b} <sup>{team.filter((m) => m.batch === b).length}</sup>
                </button>
              ))}
            </div>
          }
        />
        <p className="pr-team-count" aria-live="polite">
          Showing {shown} of {team.length}.
        </p>
        <div className="pr-wall" onPointerLeave={() => setHot(null)}>
          {desks.map((d) =>
            d.members.length ? (
              <section key={d.id} className="pr-wall-desk" aria-labelledby={`pr-desk-${d.id}`}>
                <header className="pr-wall-head">
                  <h2 id={`pr-desk-${d.id}`}>{d.name}</h2>
                  <p>{d.description}</p>
                  <span className="pr-wall-n">{d.members.length}</span>
                </header>
                <p className="pr-names">
                  {d.members.map((m) => {
                    const url = memberLink(m)
                    const props = {
                      className: `pr-name ${m.designation ? 'is-por' : ''} ${hot?.slug === m.slug ? 'is-hot' : ''}`,
                      onPointerEnter: () => setHot(m),
                      onFocus: () => setHot(m),
                      onBlur: () => setHot(null),
                      title: m.designation ?? `${d.label}, batch of ${m.batch}`,
                    }
                    return (
                      <span key={m.slug} className="pr-name-wrap">
                        {url ? (
                          <a href={url} target="_blank" rel="noreferrer" {...props}>
                            {m.name}
                          </a>
                        ) : (
                          <span tabIndex={0} {...props}>
                            {m.name}
                          </span>
                        )}
                        <span className="pr-slash" aria-hidden="true">
                          {' / '}
                        </span>
                      </span>
                    )
                  })}
                </p>
              </section>
            ) : null,
          )}
        </div>
      </div>
      <FloatingPlate
        src={hot?.photo ?? null}
        algo="floyd"
        tone="red"
        width={260}
        height={300}
        focusY={0.3}
        caption={
          hot && (
            <>
              <strong>{hot.name}</strong>
              <br />
              {hot.designation ?? `${verticals.find((v) => v.id === hot.vertical)?.label}, batch of ${hot.batch}`}
            </>
          )
        }
      />
    </main>
  )
}
