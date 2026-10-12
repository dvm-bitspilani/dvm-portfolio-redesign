import {
  Suspense,
  forwardRef,
  lazy,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import '@fontsource/instrument-serif/400.css'
import '@fontsource-variable/inter-tight'
import { buildArchiveStops, entryKey, stopLabel } from './data'
import EntryLink from './EntryLink'
import { makePhases, stopProgress, type Phases } from './lib/phases'
import { TONES } from './lib/tones'
import type { Runtime } from './scene/runtime'
import VerticalStrip from './VerticalStrip'
import type { FoldTimelineHandle, FoldTimelineProps, FoldTimelineStop } from './types'
import css from './FoldTimeline.module.css'

gsap.registerPlugin(ScrollTrigger)

// three / r3f / postprocessing live in their own chunk; the vertical fallback never loads them
const TimelineCanvas = lazy(() => import('./scene/TimelineCanvas'))

function useMedia(query: string) {
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const m = window.matchMedia(query)
    const on = () => setMatch(m.matches)
    on()
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [query])
  return match
}

let webgl2: boolean | null = null
function hasWebGL2() {
  if (webgl2 === null) {
    try {
      webgl2 = !!document.createElement('canvas').getContext('webgl2')
    } catch {
      webgl2 = false
    }
  }
  return webgl2
}

const resolveScroller = (s: FoldTimelineProps['scroller']): Element | Window => {
  if (!s) return window
  if (typeof s === 'string') return document.querySelector(s) ?? window
  return s
}

function Caption({
  stop,
  index,
  maxEntries,
  onSelect,
  register,
  onFocusStop,
}: {
  stop: FoldTimelineStop
  index: number
  maxEntries: number
  onSelect?: FoldTimelineProps['onSelect']
  register: (i: number, el: HTMLElement | null) => void
  onFocusStop: (i: number) => void
}) {
  const [open, setOpen] = useState(false)
  const label = stopLabel(stop)
  const extra = stop.entries.length - maxEntries
  const shown = open || extra <= 0 ? stop.entries : stop.entries.slice(0, maxEntries)
  return (
    <li className={css.cap} ref={(el) => register(index, el)} onFocus={() => onFocusStop(index)}>
      <h3 className={css.sr}>{label}</h3>
      <ul className={`${css.capList} ${open ? css.capOpen : ''}`}>
        {shown.map((e, i) => (
          <li key={entryKey(e, i)}>
            <EntryLink entry={e} stop={stop} onSelect={onSelect} className={css.capLink} />
            {e.kind && <small>{e.kind}</small>}
          </li>
        ))}
        {extra > 0 && (
          <li className={css.capMore}>
            <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
              {open ? `Show fewer from ${label}` : `${extra} more from ${label}`}
            </button>
          </li>
        )}
      </ul>
      {stop.note && <p className={css.capNote}>{stop.note}</p>}
    </li>
  )
}

/* ------------------------------------------------------------------ horizontal stage */

interface StageProps extends Required<Pick<FoldTimelineProps, 'startFolded' | 'foldOnEnter' | 'height' | 'unfoldLength' | 'scrollMode' | 'pin' | 'background' | 'interactive' | 'physics' | 'maxEntries'>> {
  stops: FoldTimelineStop[]
  tone: NonNullable<FoldTimelineProps['tone']>
  quality: 'low' | 'high'
  progress?: number
  scroller: FoldTimelineProps['scroller']
  onSelect?: FoldTimelineProps['onSelect']
  onActiveChange?: FoldTimelineProps['onActiveChange']
  intro?: React.ReactNode
  title?: string
  reduced: boolean
  coarse: boolean
  handle: React.RefObject<FoldTimelineHandle | null>
}

function HorizontalStage(p: StageProps) {
  const { stops, startFolded, height, unfoldLength, scrollMode, pin } = p
  const tone = TONES[p.tone]
  const phases: Phases = useMemo(
    () => makePhases(stops.length, startFolded, height, unfoldLength),
    [stops.length, startFolded, height, unfoldLength],
  )
  const track = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const stRef = useRef<ScrollTrigger | null>(null)
  const [stageEl, setStageEl] = useState<HTMLDivElement | null>(null)
  const stageRef = useCallback((el: HTMLDivElement | null) => {
    stage.current = el
    if (el) setStageEl(el)
  }, [])
  const [active, setActive] = useState(false)

  const rt = useRef<Runtime>(null as unknown as Runtime)
  if (!rt.current) {
    rt.current = {
      target: 0,
      progress: 0,
      phases,
      startFolded,
      foldOnEnter: p.foldOnEnter,
      reduced: p.reduced,
      coarse: p.coarse,
      interactive: p.interactive,
      physics: p.physics,
      markRight: !!p.intro,
      captions: [],
      captionLayer: null,
      intro: null,
      hint: null,
      touched: false,
      introDone: false,
      activeIndex: -2,
      onActive: null,
      home: [],
      bridge: null,
      frame: { halfW: 0, halfH: 0 },
      cam: { a: 0, b: 0, x: 0, markX: 0, markY: 0 },
    }
  }
  const r = rt.current
  r.phases = phases
  r.startFolded = startFolded
  r.foldOnEnter = p.foldOnEnter
  r.reduced = p.reduced
  r.coarse = p.coarse
  r.interactive = p.interactive
  r.physics = p.physics
  r.markRight = !!p.intro
  r.captions.length = stops.length
  r.onActive = p.onActiveChange ? (i: number) => p.onActiveChange?.(i, stops[i]) : null

  // external progress
  useEffect(() => {
    if (scrollMode === 'external' && typeof p.progress === 'number') r.target = Math.min(1, Math.max(0, p.progress))
  }, [scrollMode, p.progress, r])

  // self mode: ScrollTrigger maps the section's scroll to progress, and pins the stage
  useLayoutEffect(() => {
    if (scrollMode !== 'self' || !track.current || !stage.current) return
    const scrollerEl = resolveScroller(p.scroller)
    const vh = () => (scrollerEl instanceof Element ? scrollerEl.clientHeight : window.innerHeight)
    const usePin = pin === 'scrolltrigger'
    const st = ScrollTrigger.create({
      trigger: track.current,
      scroller: p.scroller ?? undefined,
      start: 'top top',
      end: usePin ? () => `+=${Math.round(phases.total * vh())}` : 'bottom bottom',
      pin: usePin ? stage.current : false,
      pinSpacing: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => void (r.target = self.progress),
      onRefresh: (self) => void (r.target = self.progress),
    })
    stRef.current = st
    r.target = st.progress
    if (r.reduced) r.progress = r.target
    const raf = requestAnimationFrame(() => ScrollTrigger.refresh())
    let alive = true
    document.fonts?.ready.then(() => alive && ScrollTrigger.refresh())
    return () => {
      alive = false
      cancelAnimationFrame(raf)
      st.kill()
      stRef.current = null
    }
  }, [scrollMode, pin, p.scroller, phases, r])

  // only render while on screen and the tab is visible
  useEffect(() => {
    const el = stage.current
    if (!el) return
    let visible = false
    const sync = () => setActive(visible && !document.hidden)
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      sync()
    })
    io.observe(el)
    document.addEventListener('visibilitychange', sync)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', sync)
    }
  }, [])

  const scrollToStop = useCallback(
    (i: number) => {
      const idx = Math.max(0, Math.min(stops.length - 1, i))
      const target = stopProgress(phases, idx)
      const st = stRef.current
      if (scrollMode === 'self' && st) {
        const top = st.start + target * (st.end - st.start)
        const s = resolveScroller(p.scroller)
        s.scrollTo({ top, behavior: r.reduced ? 'auto' : 'smooth' })
      } else {
        r.target = target
      }
    },
    [stops.length, phases, scrollMode, p.scroller, r],
  )

  useImperativeHandle(
    p.handle,
    () => ({
      setProgress: (v: number) => void (r.target = Math.min(1, Math.max(0, v))),
      getProgress: () => r.progress,
      scrollToStop,
      refresh: () => ScrollTrigger.refresh(),
    }),
    [r, scrollToStop],
  )

  const register = useCallback((i: number, el: HTMLElement | null) => void (r.captions[i] = el), [r])
  const onFocusStop = useCallback(
    (i: number) => {
      if (r.activeIndex !== i) scrollToStop(i)
    },
    [r, scrollToStop],
  )

  const printStops = useMemo(() => stops.map((s) => ({ label: stopLabel(s), count: s.entries.length })), [stops])
  const transparent = p.background === 'transparent'

  return (
    <section
      ref={track}
      className={`${css.track} ${scrollMode === 'external' ? css.trackExternal : ''} ${pin === 'sticky' && scrollMode === 'self' ? css.trackSticky : ''}`}
      style={pin === 'sticky' && scrollMode === 'self' ? { height: `${(phases.total + 1) * 100}vh` } : undefined}
      aria-label={p.title ?? 'Timeline'}
    >
      <div
        ref={stageRef}
        className={`${css.stage} ${transparent ? css.stageTransparent : ''}`}
        // focus can scroll an overflow:hidden box; keep the stage still
        onScroll={(e) => {
          e.currentTarget.scrollTop = 0
          e.currentTarget.scrollLeft = 0
        }}
      >
        {stageEl && (
          <Suspense fallback={null}>
            <TimelineCanvas
              key={`${transparent}`}
              rt={rt}
              tone={tone}
              stops={printStops}
              quality={p.quality}
              transparent={transparent}
              active={active}
              physics={p.physics && !p.reduced && !p.coarse}
              eventSource={stageEl}
            />
          </Suspense>
        )}
        {p.intro && (
          <div className={css.intro} ref={(el) => void (r.intro = el)}>
            {p.intro}
          </div>
        )}
        {p.physics && !p.coarse && !p.reduced && (
          <p className={css.hint} ref={(el) => void (r.hint = el)}>
            Grab the paper and throw it. It folds itself back.
          </p>
        )}
        <ol className={css.captions} ref={(el) => void (r.captionLayer = el)} aria-label={p.title ?? 'Timeline'}>
          {stops.map((s, i) => (
            <Caption
              key={`${s.year}-${i}`}
              stop={s}
              index={i}
              maxEntries={p.maxEntries}
              onSelect={p.onSelect}
              register={register}
              onFocusStop={onFocusStop}
            />
          ))}
        </ol>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ public component */

/**
 * The ORIGAMI timeline: the DVM mark as one folded paper strip that unfolds into a
 * long, lit, foil-stamped timeline as you scroll. Falls back to a vertical paper
 * strip on narrow containers, reduced motion, or without WebGL2.
 */
const FoldTimeline = forwardRef<FoldTimelineHandle, FoldTimelineProps>(function FoldTimeline(props, ref) {
  const {
    items,
    tone = 'copper',
    startFolded = true,
    foldOnEnter = true,
    height = 0.9,
    unfoldLength = 1.6,
    scrollMode = 'self',
    progress,
    scroller,
    pin = 'scrolltrigger',
    layout = 'auto',
    verticalBelow = 760,
    background = 'standalone',
    quality = 'auto',
    interactive = true,
    physics = false,
    maxEntries = 7,
    onSelect,
    onActiveChange,
    intro,
    title,
    className,
    style,
    id,
  } = props
  const stops = useMemo(() => (items && items.length ? items : buildArchiveStops()), [items])
  const reduced = useMedia('(prefers-reduced-motion: reduce)')
  const coarse = useMedia('(hover: none), (pointer: coarse)')
  const root = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(() => (typeof window === 'undefined' ? 1440 : window.innerWidth))
  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    setWidth(el.clientWidth || window.innerWidth)
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const vertical = layout === 'vertical' || (layout === 'auto' && (reduced || !hasWebGL2() || width < verticalBelow))
  const q: 'low' | 'high' =
    quality === 'auto' ? (coarse || (navigator.hardwareConcurrency ?? 8) <= 4 ? 'low' : 'high') : quality

  const handle = useRef<FoldTimelineHandle | null>(null)
  const vScroll = useRef<(i: number) => void>(() => {})
  useImperativeHandle(
    ref,
    () => ({
      setProgress: (v) => handle.current?.setProgress(v),
      getProgress: () => handle.current?.getProgress() ?? 0,
      scrollToStop: (i) => (handle.current ? handle.current.scrollToStop(i) : vScroll.current(i)),
      refresh: () => ScrollTrigger.refresh(),
    }),
    [],
  )
  useEffect(() => {
    if (vertical) handle.current = null
  }, [vertical])

  return (
    <div
      ref={root}
      id={id}
      className={`${css.root} ${scrollMode === 'external' && !vertical ? css.rootFill : ''} ${className ?? ''}`}
      style={style}
      data-tone={tone}
    >
      {vertical ? (
        <VerticalStrip
          stops={stops}
          tone={tone}
          title={title}
          intro={intro}
          reduced={reduced}
          maxEntries={Infinity}
          onSelect={onSelect}
          onActiveChange={onActiveChange}
          scrollRef={vScroll}
        />
      ) : (
        <HorizontalStage
          stops={stops}
          tone={tone}
          startFolded={startFolded}
          foldOnEnter={foldOnEnter}
          height={height}
          unfoldLength={unfoldLength}
          scrollMode={scrollMode}
          progress={progress}
          scroller={scroller}
          pin={pin}
          background={background}
          quality={q}
          interactive={interactive}
          physics={physics}
          maxEntries={maxEntries}
          onSelect={onSelect}
          onActiveChange={onActiveChange}
          intro={intro}
          title={title}
          reduced={reduced}
          coarse={coarse}
          handle={handle}
        />
      )}
    </div>
  )
})

export default FoldTimeline
