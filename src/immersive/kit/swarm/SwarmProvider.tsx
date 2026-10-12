import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
} from 'react'
import { SwarmField, targetSig, type SwarmFieldProps } from './SwarmField'
import { SwarmHandle } from './controller'
import type { SwarmController, SwarmShowOptions, SwarmTarget } from './types'
import styles from './swarm.module.css'

type SectionData = () => { target: SwarmTarget; options?: SwarmShowOptions }

/** One IntersectionObserver for every SwarmSection: the section crossing the viewport's middle wins. */
class SectionRegistry {
  private map = new Map<Element, SectionData>()
  private active: Element | null = null
  private io: IntersectionObserver | null = null
  private controller: SwarmController
  constructor(controller: SwarmController) {
    this.controller = controller
  }
  private observer() {
    if (!this.io)
      this.io = new IntersectionObserver(
        (entries) => {
          let hit: Element | null = null
          for (const e of entries) if (e.isIntersecting) hit = e.target
          if (hit && hit !== this.active) {
            this.active = hit
            this.apply(hit)
          }
        },
        { rootMargin: '-49% 0px -50% 0px' },
      )
    return this.io
  }
  private apply(el: Element) {
    const get = this.map.get(el)
    if (!get) return
    const { target, options } = get()
    void this.controller.setTarget(target, options)
  }
  add(el: Element, data: SectionData) {
    this.map.set(el, data)
    this.observer().observe(el)
    return () => {
      this.map.delete(el)
      this.io?.unobserve(el)
      if (this.active === el) this.active = null
    }
  }
  /** Re-apply if this section is the active one (its target changed). */
  refresh(el: Element | null) {
    if (el && el === this.active) this.apply(el)
  }
  dispose() {
    this.io?.disconnect()
    this.io = null
    this.map.clear()
  }
}

interface Ctx {
  controller: SwarmHandle
  sections: SectionRegistry
}
const SwarmContext = createContext<Ctx | null>(null)

export interface SwarmProviderProps extends Omit<SwarmFieldProps, 'ref' | 'controller'> {
  children?: ReactNode
  /** Stacking order of the fixed canvas layer (put your content above it). Default 0. */
  zIndex?: number
}

/**
 * One full-page swarm shared by everything below it. Mount it above your
 * <Routes> and the canvas (and its particles) survive route changes; pages
 * talk to it through useSwarm / useSwarmSection / useSwarmHover.
 */
export function SwarmProvider({ children, zIndex = 0, className, style, ...field }: SwarmProviderProps) {
  const [controller] = useState(() => new SwarmHandle())
  const [sections] = useState(() => new SectionRegistry(controller))
  useEffect(() => () => sections.dispose(), [sections])
  const ctx = useMemo(() => ({ controller, sections }), [controller, sections])
  return (
    <SwarmContext.Provider value={ctx}>
      <SwarmField {...field} controller={controller} className={[styles.fixed, className].filter(Boolean).join(' ')} style={{ zIndex, ...style }} />
      {children}
    </SwarmContext.Provider>
  )
}

/** The nearest SwarmProvider's controller (null outside one). */
export function useSwarm(): SwarmController | null {
  return useContext(SwarmContext)?.controller ?? null
}

/**
 * Attach to a section: when it crosses the middle of the viewport the shared
 * swarm re-forms into `target`. Returns a ref callback.
 */
export function useSwarmSection<T extends Element = HTMLElement>(target: SwarmTarget, options?: SwarmShowOptions) {
  const ctx = useContext(SwarmContext)
  const [el, setEl] = useState<T | null>(null)
  const data = useRef({ target, options })
  useLayoutEffect(() => {
    data.current = { target, options }
  })
  useEffect(() => {
    if (!ctx || !el) return
    return ctx.sections.add(el, () => data.current)
  }, [ctx, el])
  const sig = targetSig(target)
  useEffect(() => {
    ctx?.sections.refresh(el)
  }, [ctx, el, sig])
  return setEl as (node: T | null) => void
}

export interface SwarmSectionProps extends SwarmShowOptions, HTMLAttributes<HTMLElement> {
  target: SwarmTarget
  as?: 'section' | 'div' | 'article' | 'header' | 'footer' | 'main' | 'aside'
}

/** `<section>` that re-targets the shared swarm when it scrolls into the middle of the viewport. */
export function SwarmSection({ target, as = 'section', placement, fill, spin, tilt, sway, morphDuration, kick, burst, children, ...rest }: SwarmSectionProps) {
  const ref = useSwarmSection(target, { placement, fill, spin, tilt, sway, morphDuration, kick, burst })
  return createElement(as, { ...rest, ref }, children)
}

type ControllerSource = SwarmController | RefObject<SwarmController | null> | null | undefined

function isRef(c: ControllerSource): c is RefObject<SwarmController | null> {
  return !!c && 'current' in c
}

export interface SwarmHoverOptions extends SwarmShowOptions {
  /** Hover intent delay before morphing, ms. Default 70. */
  delay?: number
  /** Delay before returning to the base formation after leaving, ms. Default 350. */
  leaveDelay?: number
  /** Controller to drive (a SwarmField ref). Defaults to the nearest SwarmProvider. */
  controller?: ControllerSource
}

/**
 * Hover-to-form: `const bind = useSwarmHover(); <a {...bind({ image: cover })}>`.
 * Pointer enter / focus shows the item's formation over the base one; leaving
 * (after `leaveDelay`, cancelled by entering another item) returns to the base.
 */
export function useSwarmHover(options: SwarmHoverOptions = {}) {
  const ctx = useContext(SwarmContext)
  const opts = useRef(options)
  const fallback = ctx?.controller ?? null
  useLayoutEffect(() => {
    opts.current = options
  })
  const timer = useRef(0)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  useEffect(
    () => () => {
      // Leaving the page / list: drop any preview.
      const c = opts.current.controller
      ;(isRef(c) ? c.current : c ?? fallback)?.clearOverride()
    },
    [fallback],
  )

  return useCallback(
    (target: SwarmTarget, itemOptions?: SwarmShowOptions) => {
      const get = () => {
        const c = opts.current.controller
        return (isRef(c) ? c.current : c) ?? fallback
      }
      const enter = (immediate: boolean) => {
        window.clearTimeout(timer.current)
        const { delay = 70, leaveDelay: _l, controller: _c, ...show } = opts.current
        timer.current = window.setTimeout(() => void get()?.override(target, { kick: 0.75, ...show, ...itemOptions }), immediate ? 0 : delay)
      }
      const leave = () => {
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => get()?.clearOverride(), opts.current.leaveDelay ?? 350)
      }
      return {
        onPointerEnter: () => enter(false),
        onPointerLeave: leave,
        onFocus: () => enter(true),
        onBlur: leave,
      }
    },
    [fallback],
  )
}
