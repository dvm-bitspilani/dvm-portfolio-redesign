import { lazy, Suspense, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { socials, team, verticals, type Member, type Socials, type VerticalId } from '../../../data'
import { useActive, useReducedMotion } from '../scene/common'
import { Footer, PageHead } from '../ui/Bits'

const Projection = lazy(() => import('../scene/Projection'))

const SOCIAL_LABEL: Record<keyof Socials, string> = {
  github: 'GitHub',
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
  twitter: 'Twitter',
  dribbble: 'Dribbble',
  behance: 'Behance',
  facebook: 'Facebook',
}

const vName = (id: VerticalId) => verticals.find((v) => v.id === id)?.label ?? id

export default function Team() {
  const [params, setParams] = useSearchParams()
  const v = (params.get('v') as VerticalId | null) ?? null
  const vertical = verticals.find((x) => x.id === v) ?? null
  const reduced = useReducedMotion()
  const bayRef = useRef<HTMLDivElement>(null)
  const live = useActive(bayRef)

  const filtered = useMemo(() => team.filter((m) => !vertical || m.vertical === vertical.id), [vertical])
  const batches = useMemo(() => {
    const map = new Map<number, Member[]>()
    for (const m of filtered) {
      if (!map.has(m.batch)) map.set(m.batch, [])
      map.get(m.batch)!.push(m)
    }
    return [...map.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([batch, ms]) => [batch, ms.sort((a, b) => Number(!!b.designation) - Number(!!a.designation))] as const)
  }, [filtered])

  const initial = batches[0]?.[1][0] ?? team[0]
  const [picked, setPicked] = useState<Member | null>(null)
  const current = picked && filtered.includes(picked) ? picked : initial

  return (
    <main className="holo-page holo-team">
      <PageHead title="Team" index={`${team.length} members on record, batches ${Math.min(...team.map((m) => m.batch))} to ${Math.max(...team.map((m) => m.batch))}`}>
        <p>{vertical ? vertical.description : 'We work in 5 teams to ensure that everyone has a hassle free and memorable experience during the fests. Point at anyone on the roster to put them on the projector.'}</p>
      </PageHead>

      <div className="holo-team__filters" role="group" aria-label="Filter by team">
        <button type="button" aria-pressed={!vertical} onClick={() => setParams({})}>
          Everyone<sup>{team.length}</sup>
        </button>
        {verticals.map((x) => (
          <button key={x.id} type="button" aria-pressed={vertical?.id === x.id} onClick={() => setParams({ v: x.id })}>
            {x.label}
            <sup>{team.filter((m) => m.vertical === x.id).length}</sup>
          </button>
        ))}
      </div>

      <div className="holo-team__grid">
        <div className="holo-roster">
          {batches.map(([batch, ms]) => (
            <section key={batch} className="holo-roster__batch" aria-labelledby={`holo-b-${batch}`}>
              <h2 id={`holo-b-${batch}`}>
                Batch of {batch}
                <span>{ms.length}</span>
              </h2>
              <ul>
                {ms.map((m) => (
                  <li key={m.slug}>
                    <button
                      type="button"
                      className={`holo-crew${current.slug === m.slug ? ' is-on' : ''}`}
                      onPointerEnter={() => setPicked(m)}
                      onFocus={() => setPicked(m)}
                      onClick={() => {
                        setPicked(m)
                        if (window.innerWidth < 900) bayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      }}
                    >
                      <img src={m.photo} alt="" loading="lazy" decoding="async" />
                      <span className="holo-crew__name">{m.name}</span>
                      <span className="holo-crew__role">{m.designation ?? vName(m.vertical)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <aside className="holo-bay" aria-label="Selected member">
          <div className="holo-bay__screen" ref={bayRef}>
            <Suspense fallback={<div className="holo-stage__boot">Warming the projector</div>}>
              <Projection
                src={current.photo}
                fallbackTitle={current.name}
                aspect={1}
                reduced={reduced}
                frameloop={live ? 'always' : 'never'}
                container={bayRef}
              />
            </Suspense>
          </div>
          <div className="holo-bay__id" aria-live="polite">
            <p className="holo-bay__tag">
              {vName(current.vertical)}, batch of {current.batch}
            </p>
            <h2 className="holo-bay__name">{current.name}</h2>
            {current.designation && <p className="holo-bay__role">{current.designation}</p>}
            <ul className="holo-bay__links">
              {(Object.keys(current.socials) as (keyof Socials)[]).map((k) => (
                <li key={k}>
                  <a href={current.socials[k]} target="_blank" rel="noreferrer">
                    {SOCIAL_LABEL[k]}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
      <Footer socials={socials} />
    </main>
  )
}
