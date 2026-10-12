import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import bg3 from '../../../assests/bg_3.png'
import hamBtn from '../../../assests/hamBtn.png'
import { site, socials, verticals, projects, blogs } from '../../data'
import FoldTimeline from './FoldTimeline'
import { buildArchiveStops, buildMilestoneStops } from './data'
import type { FoldTimelineHandle, FoldTimelineLayout, FoldTimelineTone } from './types'
import '@fontsource-variable/jetbrains-mono'
import s from './demo.module.css'

type Opt<T extends string> = { value: T; label: string }

function Seg<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: Opt<T>[]; onChange: (v: T) => void }) {
  return (
    <div className={s.seg} role="group" aria-label={label}>
      <span>{label}</span>
      <div>
        {options.map((o) => (
          <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function TimelineDemo() {
  const [tone, setTone] = useState<FoldTimelineTone>('copper')
  const [start, setStart] = useState<'folded' | 'flat'>('folded')
  const [set, setSet] = useState<'archive' | 'milestones'>('archive')
  const [layout, setLayout] = useState<FoldTimelineLayout>('auto')
  const [bg, setBg] = useState<'standalone' | 'transparent'>('standalone')
  const [physics, setPhysics] = useState<'off' | 'on'>('off')
  const [open, setOpen] = useState(() => window.innerWidth >= 760)
  const [now, setNow] = useState<string>('')
  const [picked, setPicked] = useState<string>('')
  const tl = useRef<FoldTimelineHandle>(null)

  const archive = useMemo(() => buildArchiveStops(), [])
  const milestones = useMemo(() => buildMilestoneStops(), [])
  const items = set === 'archive' ? archive : milestones

  useEffect(() => {
    const b = document.body.style
    const prev = { margin: b.margin, background: b.background }
    b.margin = '0'
    b.background = '#050506'
    return () => {
      b.margin = prev.margin
      b.background = prev.background
    }
  }, [])

  const datedProjects = projects.filter((p) => p.year).length

  return (
    <div className={s.page}>
      <header className={s.nav}>
        <Link to="/" className={s.brand}>
          DVM
        </Link>
        <img src={hamBtn} alt="" className={s.ham} />
      </header>

      <section className={s.hero}>
        <div className={s.grid} aria-hidden />
        <div className={s.texture} style={{ backgroundImage: `url(${bg3})` }} aria-hidden />
        <div className={s.giant} aria-hidden>
          DVM
        </div>
        <div className={s.dept}>
          <div>DEPARTMENT OF</div>
          <div className={s.deptBig}>VISUAL MEDIA</div>
        </div>
        <p className={s.heroLede}>{site.about[0]}</p>
        <div className={s.slogan}>
          <div>CODE.</div>
          <div>DESIGN.</div>
          <div>ANIMATE.</div>
        </div>
      </section>

      <section className={s.about}>
        <div className={s.grid} aria-hidden />
        <h2 className={s.aboutTitle}>
          <span>ABOUT US</span>
          <span aria-hidden>ABOUT US</span>
        </h2>
        <div className={s.aboutCopy}>
          {site.about.slice(1).map((p) => (
            <p key={p}>{p}</p>
          ))}
          <p className={s.aboutCount}>
            {datedProjects} dated projects and {blogs.length} essays sit on the strip below.
          </p>
        </div>
      </section>

      <FoldTimeline
        ref={tl}
        items={items}
        tone={tone}
        startFolded={start === 'folded'}
        layout={layout}
        background={bg}
        physics={physics === 'on'}
        title="The archive, year by year"
        intro={
          <div className={s.intro} data-tone={tone}>
            <h2>Archive</h2>
            <p>
              One paper strip folds into the DVM mark. Scroll and it opens into everything we have shipped, one year at a
              time.
            </p>
          </div>
        }
        onActiveChange={(_, stop) => setNow(stop.label ?? String(stop.year))}
        onSelect={(entry, stop, e) => {
          // keep the sandbox on screen: report internal links instead of leaving
          if (entry.href?.startsWith('/')) e.preventDefault()
          setPicked(`“${entry.label}” (${stop.label ?? stop.year})${entry.href ? `, links to ${entry.href}` : ''}`)
        }}
      />

      <section className={s.teams}>
        <div className={s.grid} aria-hidden />
        <h2 className={s.teamsTitle}>Five teams</h2>
        <ol className={s.teamList}>
          {verticals.map((v) => (
            <li key={v.id}>
              <h3>{v.name}</h3>
              <p>{v.description}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className={s.footer} role="contentinfo">
        <p className={s.oath}>{site.taglines.mischief}</p>
        <ul>
          {socials.map((x) => (
            <li key={x.id}>
              <a href={x.url} target="_blank" rel="noreferrer">
                {x.label}
              </a>
            </li>
          ))}
        </ul>
      </div>

      <aside className={s.panel} data-open={open || undefined} aria-label="Timeline options">
        <button type="button" className={s.panelToggle} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? 'Hide options' : 'Timeline options'}
        </button>
        {open && (
          <div className={s.panelBody}>
            <Seg label="Tone" value={tone} onChange={setTone} options={[{ value: 'copper', label: 'Copper' }, { value: 'teal', label: 'Teal' }]} />
            <Seg label="Start" value={start} onChange={setStart} options={[{ value: 'folded', label: 'Folded' }, { value: 'flat', label: 'Flat' }]} />
            <Seg label="Stops" value={set} onChange={setSet} options={[{ value: 'archive', label: 'Archive' }, { value: 'milestones', label: 'Milestones' }]} />
            <Seg
              label="Layout"
              value={layout}
              onChange={setLayout}
              options={[
                { value: 'auto', label: 'Auto' },
                { value: 'horizontal', label: 'Strip' },
                { value: 'vertical', label: 'Vertical' },
              ]}
            />
            <Seg label="Wall" value={bg} onChange={setBg} options={[{ value: 'standalone', label: 'Lit wall' }, { value: 'transparent', label: 'Transparent' }]} />
            <Seg label="Physics" value={physics} onChange={setPhysics} options={[{ value: 'off', label: 'Off' }, { value: 'on', label: 'Grab & throw' }]} />
            <div className={s.jump}>
              <span>Jump to</span>
              <div>
                {items.map((st, i) => (
                  <button key={`${st.year}-${i}`} type="button" onClick={() => tl.current?.scrollToStop(i)} aria-current={now === String(st.label ?? st.year) || undefined}>
                    {st.label ?? st.year}
                  </button>
                ))}
              </div>
            </div>
            {picked && <p className={s.picked}>Selected: {picked}</p>}
          </div>
        )}
      </aside>
    </div>
  )
}
