import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode, type RefObject } from 'react'
import * as THREE from 'three'
import '@fontsource-variable/jetbrains-mono'
import { projects, site, team } from '../../data'
import {
  SwarmField,
  SwarmProvider,
  SwarmSection,
  useSwarm,
  useSwarmHover,
  type SwarmController,
  type SwarmQuality,
  type SwarmTarget,
} from './index'
import texture from '../../../assests/bg_3.png'
import s from './demo.module.css'

type View = 'page' | 'embed'

export default function SwarmDemo() {
  const [view, setView] = useState<View>(() => (new URLSearchParams(location.search).get('view') === 'embed' ? 'embed' : 'page'))
  useEffect(() => {
    const url = new URL(location.href)
    if (view === 'embed') url.searchParams.set('view', 'embed')
    else url.searchParams.delete('view')
    history.replaceState(history.state, '', url)
    window.scrollTo(0, 0)
  }, [view])

  return (
    <div className={s.root}>
      <header className={s.bar}>
        <span className={s.mark}>DVM</span>
        <nav className={s.switch} aria-label="Demo view">
          <button type="button" aria-pressed={view === 'page'} onClick={() => setView('page')}>
            Full page
          </button>
          <button type="button" aria-pressed={view === 'embed'} onClick={() => setView('embed')}>
            Embedded
          </button>
        </nav>
      </header>
      {view === 'page' ? <PageView onEmbed={() => setView('embed')} /> : <EmbedView />}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Full page: one fixed canvas, sections re-target it, a hover index  */
/* ------------------------------------------------------------------ */

const work = projects.filter((p) => p.cover && p.kind !== 'video').slice(0, 9)
const closingRegion = (w: number) => (w < 760 ? { x0: 0.06, y0: 0.08, x1: 0.94, y1: 0.42 } : { x0: 0.14, y0: 0.08, x1: 0.86, y1: 0.6 })

function PageView({ onEmbed }: { onEmbed: () => void }) {
  return (
    <SwarmProvider placement="right">
      <div className={s.grid} aria-hidden="true" />
      <main className={s.page}>
        <SwarmSection target="logo" placement="right" className={`${s.band} ${s.hero}`}>
          <div className={s.outline} aria-hidden="true">
            DVM
          </div>
          <div className={s.col}>
            <h1 className={s.display}>Department of Visual Media</h1>
            <p className={s.lede}>
              Two hundred thousand points of light holding the shape of whatever the page is about: the mark, a word, a fest site. Move through them to scatter
              them. Press and hold on empty space to pull everything into a well.
            </p>
            <Code>{`<SwarmProvider>
  <SwarmSection target="logo" placement="right">
    …hero copy…
  </SwarmSection>
</SwarmProvider>`}</Code>
          </div>
        </SwarmSection>

        <SwarmSection target="galaxy" placement="left" className={`${s.band} ${s.flip}`}>
          <div className={s.col}>
            <h2 className={s.h2}>One canvas behind the whole page</h2>
            <p>
              The swarm lives in a fixed layer under ordinary markup. Each section names a formation, and whichever section crosses the middle of the screen
              wins. Particles leave one by one, so the change reads as a migration rather than a cut. Links, text selection and focus above it keep working.
            </p>
            <Code>{`<SwarmSection target="galaxy" placement="left">

// or on any element you already have
const ref = useSwarmSection('galaxy', { placement: 'left' })`}</Code>
          </div>
        </SwarmSection>

        <SwarmSection target={{ text: 'BOSM\nOASIS\nAPOGEE' }} placement="right" className={s.band}>
          <div className={s.col}>
            <h2 className={s.h2}>Words, in the house face</h2>
            <p>{site.about[0]}</p>
            <Code>{`<SwarmSection
  target={{ text: 'BOSM\\nOASIS\\nAPOGEE' }}
  placement="right"
/>`}</Code>
          </div>
        </SwarmSection>

        <SwarmSection target="cloud" placement="full" morphDuration={2.2} className={`${s.band} ${s.interlude}`}>
          <p className={s.statement}>{site.about[2]}</p>
          <Code>{`<SwarmSection target="cloud" placement="full" morphDuration={2.2} />`}</Code>
        </SwarmSection>

        <WorkIndex />

        <SwarmSection target={{ text: 'WE ARE\nDVM' }} placement={closingRegion} className={`${s.band} ${s.closing}`}>
          <div className={s.closingCol}>
            <Code>{`// placement can be a rect (0..1 of the canvas) or a function of its size
placement={(w) => w < 760 ? top : { x0: .14, y0: .08, x1: .86, y1: .6 }}`}</Code>
            <p>
              Every prop, live: <button type="button" className={s.link} onClick={onEmbed}>open the embedded playground</button>. Or write to{' '}
              <a className={s.link} href={`mailto:${site.contact.email}`}>
                {site.contact.email}
              </a>
              .
            </p>
          </div>
        </SwarmSection>
      </main>
      <Stats />
    </SwarmProvider>
  )
}

function WorkIndex() {
  const bind = useSwarmHover({ placement: 'right', fill: 0.94 })
  const [active, setActive] = useState<string | null>(null)
  return (
    <SwarmSection target="ring" placement="right" className={`${s.band} ${s.work}`}>
      <div className={s.col}>
        <h2 className={s.h2}>Point at a project</h2>
        <p>Hover a title and the swarm re-forms into its cover, sampled by brightness. Leave the list and it settles back into the ring.</p>
        <ol className={s.index} onPointerLeave={() => setActive(null)}>
          {work.map((p) => {
            const h = bind({ image: p.cover! })
            return (
              <li key={p.slug}>
                <button
                  type="button"
                  className={active === p.slug ? s.on : undefined}
                  {...h}
                  onPointerEnter={() => {
                    h.onPointerEnter()
                    setActive(p.slug)
                  }}
                  onFocus={() => {
                    h.onFocus()
                    setActive(p.slug)
                  }}
                >
                  <span className={s.year}>{p.year}</span>
                  <span className={s.title}>{p.title}</span>
                  <span className={s.fest}>{p.fest}</span>
                </button>
              </li>
            )
          })}
        </ol>
        <Code>{`const bind = useSwarmHover({ placement: 'right' })

<li {...bind({ image: project.cover })}>…</li>`}</Code>
      </div>
    </SwarmSection>
  )
}

/* ------------------------------------------------------------------ */
/* Embedded: a SwarmField in a box, every prop as a control            */
/* ------------------------------------------------------------------ */

type Kind = 'logo' | 'cloud' | 'galaxy' | 'ring' | 'text' | 'image' | 'portrait' | 'points'
const KINDS: Kind[] = ['logo', 'text', 'image', 'portrait', 'cloud', 'galaxy', 'ring', 'points']
const images = projects.filter((p) => p.cover && p.kind !== 'video').map((p) => p.cover!)
const faces = team.filter((m) => m.photo).map((m) => m.photo!)

function knot() {
  const g = new THREE.TorusKnotGeometry(1, 0.28, 900, 40, 2, 3)
  const a = (g.getAttribute('position').array as Float32Array).slice()
  g.dispose()
  return a
}

function EmbedView() {
  const ctl = useRef<SwarmController>(null)
  const stage = useRef<HTMLDivElement>(null)
  const knotPts = useMemo(knot, [])
  const [kind, setKind] = useState<Kind>('logo')
  const [text, setText] = useState('DVM')
  const [draft, setDraft] = useState('DVM')
  const [img, setImg] = useState(0)
  const [face, setFace] = useState(0)
  const [placement, setPlacement] = useState<'full' | 'center' | 'left' | 'right'>('center')
  const [palette, setPalette] = useState<'teal' | 'violet'>('teal')
  const [transparent, setTransparent] = useState(true)
  const [bloom, setBloom] = useState(true)
  const [interactive, setInteractive] = useState(true)
  const [hold, setHold] = useState(true)
  const [quality, setQuality] = useState<SwarmQuality>('auto')
  const [morph, setMorph] = useState(1.4)

  const target: SwarmTarget = useMemo(() => {
    switch (kind) {
      case 'text':
        return { text }
      case 'image':
        return { image: images[img % images.length], fit: 'contain' }
      case 'portrait':
        return { image: faces[face % faces.length], fit: 'portrait' }
      case 'points':
        return { points: knotPts, key: 'torus-knot' }
      default:
        return kind
    }
  }, [kind, text, img, face, knotPts])

  // The redesign's texture is revealed through a radial mask that follows the cursor.
  useEffect(() => {
    const el = stage.current
    if (!el) return
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      el.style.setProperty('--mx', `${e.clientX - r.left}px`)
      el.style.setProperty('--my', `${e.clientY - r.top}px`)
    }
    el.addEventListener('pointermove', move)
    return () => el.removeEventListener('pointermove', move)
  }, [])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setText(draft.trim() || 'DVM')
    setKind('text')
  }

  const targetCode =
    kind === 'text'
      ? `{{ text: ${JSON.stringify(text)} }}`
      : kind === 'image'
        ? `{{ image: '${images[img % images.length]}' }}`
        : kind === 'portrait'
          ? `{{ image: '${faces[face % faces.length]}', fit: 'portrait' }}`
          : kind === 'points'
            ? `{{ points: torusKnot /* Float32Array xyz */ }}`
            : `"${kind}"`
  const code = [
    `<section style={{ position: 'relative' }}>`,
    `  <SwarmField`,
    `    ref={swarm}`,
    `    target=${targetCode}`,
    `    placement="${placement}"`,
    palette !== 'teal' && `    palette="${palette}"`,
    transparent && `    background="transparent"`,
    !bloom && `    bloom={false}`,
    !interactive && `    interactive={false}`,
    !hold && `    holdToAttract={false}`,
    quality !== 'auto' && `    quality="${quality}"`,
    morph !== 1.4 && `    morphDuration={${morph}}`,
    `  />`,
    `</section>`,
  ]
    .filter(Boolean)
    .join('\n')

  return (
    <main className={s.embed}>
      <div className={s.embedGrid}>
        <div ref={stage} className={`${s.stage} ${transparent ? '' : s.stageSolid}`}>
          {transparent && <div className={s.texture} style={{ backgroundImage: `url(${texture})` }} aria-hidden="true" />}
          <div className={s.stageLines} aria-hidden="true" />
          <SwarmField
            ref={ctl}
            target={target}
            placement={placement}
            palette={palette}
            background={transparent ? 'transparent' : '#050506'}
            bloom={bloom}
            interactive={interactive}
            holdToAttract={hold}
            quality={quality}
            morphDuration={morph}
          />
          <span className={s.stageNote}>{hold && interactive ? 'Press and hold inside the box' : 'Interaction off'}</span>
          <Stats source={ctl} className={s.stageStats} />
        </div>

        <aside className={s.controls} aria-label="Swarm props">
          <h1 className={s.embedTitle}>Embedded field</h1>
          <p className={s.embedLede}>
            The same engine in a positioned box, transparent over the redesign&rsquo;s texture and grid. Each control is a prop; the snippet follows along.
            The cursor only disturbs the swarm while it is over the box.
          </p>
          <Group label="target">
            {KINDS.map((k) => (
              <Chip key={k} on={kind === k} onClick={() => {
                if (k === kind && k === 'image') setImg((i) => i + 1)
                else if (k === kind && k === 'portrait') setFace((i) => i + 1)
                setKind(k)
              }}>
                {k}
              </Chip>
            ))}
          </Group>
          {kind === 'image' && <p className={s.hint}>Press image again for the next cover.</p>}
          {kind === 'portrait' && <p className={s.hint}>Press portrait again for the next member.</p>}
          <form className={s.textForm} onSubmit={submit}>
            <label htmlFor="swarm-text">Text</label>
            <input id="swarm-text" value={draft} maxLength={24} onChange={(e) => setDraft(e.target.value)} />
            <button type="submit">Form it</button>
          </form>
          <Group label="placement">
            {(['full', 'center', 'left', 'right'] as const).map((p) => (
              <Chip key={p} on={placement === p} onClick={() => setPlacement(p)}>
                {p}
              </Chip>
            ))}
          </Group>
          <Group label="palette">
            {(['teal', 'violet'] as const).map((p) => (
              <Chip key={p} on={palette === p} onClick={() => setPalette(p)}>
                {p}
              </Chip>
            ))}
          </Group>
          <Group label="background">
            <Chip on={transparent} onClick={() => setTransparent(true)}>
              transparent
            </Chip>
            <Chip on={!transparent} onClick={() => setTransparent(false)}>
              #050506
            </Chip>
          </Group>
          <Group label="quality">
            {(['low', 'auto', 'high'] as SwarmQuality[]).map((q) => (
              <Chip key={q} on={quality === q} onClick={() => setQuality(q)}>
                {q}
              </Chip>
            ))}
          </Group>
          <Group label="switches">
            <Chip on={bloom} onClick={() => setBloom((v) => !v)}>
              bloom
            </Chip>
            <Chip on={interactive} onClick={() => setInteractive((v) => !v)}>
              interactive
            </Chip>
            <Chip on={hold} onClick={() => setHold((v) => !v)}>
              holdToAttract
            </Chip>
          </Group>
          <label className={s.slider}>
            <span>
              morphDuration <output>{morph.toFixed(1)}s</output>
            </span>
            <input type="range" min={0.3} max={3.5} step={0.1} value={morph} onChange={(e) => setMorph(+e.target.value)} />
          </label>
          <button type="button" className={s.burst} onClick={() => ctl.current?.explode(3)}>
            Explode
          </button>
          <Code>{code}</Code>
        </aside>
      </div>
    </main>
  )
}

/* ------------------------------------------------------------------ */

function Code({ children }: { children: string }) {
  return (
    <pre className={s.code}>
      <code>{children}</code>
    </pre>
  )
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <fieldset className={s.group}>
      <legend>{label}</legend>
      <div>{children}</div>
    </fieldset>
  )
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={s.chip} aria-pressed={on} onClick={onClick}>
      {children}
    </button>
  )
}

/** Particle count + fps, polled twice a second (not per frame). */
function Stats({ source, className }: { source?: RefObject<SwarmController | null>; className?: string }) {
  const ctx = useSwarm()
  const [line, setLine] = useState('')
  useEffect(() => {
    const id = window.setInterval(() => {
      const c = source ? source.current : ctx
      if (!c) return
      const st = c.stats()
      setLine(st.gl ? `${st.particles.toLocaleString('en-US')} particles, ${st.running ? `${st.fps} fps` : 'paused'}, dpr ${st.dpr}` : 'WebGL unavailable')
    }, 500)
    return () => window.clearInterval(id)
  }, [ctx, source])
  return (
    <p className={className ?? s.stats} aria-live="off">
      {line}
    </p>
  )
}

