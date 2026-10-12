import type { ReactNode } from 'react'

/** One clickable line hanging under a stop on the strip. */
export interface FoldTimelineEntry {
  /** Stable id (defaults to the label). */
  id?: string
  /** Text of the line, e.g. "APOGEE '24 Website". */
  label: string
  /** Small tag after the label, e.g. "Website", "Essay", "Theme". */
  kind?: string
  /** Rendered as a link when present. */
  href?: string
  /** Open in a new tab (defaults to true for absolute http(s) urls). */
  external?: boolean
  /** Anything the integrator wants back in `onSelect` (e.g. the project record). */
  data?: unknown
}

/** One foil-stamped stop on the strip (a year, a fest edition, a milestone). */
export interface FoldTimelineStop {
  /** Sort / identity key. Usually the year. */
  year: number | string
  /** What gets foil-stamped on the paper. Defaults to String(year). Keep it short (≤ 7 chars reads best). */
  label?: string
  /** Optional one-line note printed under the list (e.g. a fest theme). */
  note?: string
  entries: FoldTimelineEntry[]
}

export type FoldTimelineTone = 'copper' | 'teal'
export type FoldTimelineQuality = 'auto' | 'low' | 'high'
export type FoldTimelineLayout = 'auto' | 'horizontal' | 'vertical'

export interface FoldTimelineProps {
  /** Stops along the strip. Defaults to DVM's archive (projects + blogs grouped by year). */
  items?: FoldTimelineStop[]
  /** 'copper' = warm foil on black paper (original ORIGAMI); 'teal' = silver/teal foil in the redesign palette. */
  tone?: FoldTimelineTone
  /** Begin as the folded DVM mark and unfold on scroll (true), or begin with the strip already flat. */
  startFolded?: boolean
  /** Play the fold-in animation the first time the folded mark scrolls into view. Default true. */
  foldOnEnter?: boolean
  /** Scroll length per stop, in viewport heights (self mode). Default 0.9. */
  height?: number
  /** Scroll length of the unfold, in viewport heights (self mode, startFolded). Default 1.6. */
  unfoldLength?: number
  /**
   * 'self' (default): renders its own section, pins it with ScrollTrigger and maps its scroll to progress.
   * 'external': fills its parent; drive it with the `progress` prop or the ref's `setProgress`.
   */
  scrollMode?: 'self' | 'external'
  /** 0..1 progress when scrollMode is 'external'. */
  progress?: number
  /** ScrollTrigger scroller (selector or element) for self mode. Defaults to the window. */
  scroller?: string | Element | null
  /** Pin with ScrollTrigger (default) or CSS sticky (use 'sticky' when an ancestor is transformed). */
  pin?: 'scrolltrigger' | 'sticky'
  /** 'auto' picks vertical on narrow containers / reduced motion / no WebGL2. */
  layout?: FoldTimelineLayout
  /** Container width under which 'auto' switches to the vertical strip. Default 760. */
  verticalBelow?: number
  /** 'standalone' draws the dark lit wall; 'transparent' lets the page show through (shadow still cast). */
  background?: 'standalone' | 'transparent'
  quality?: FoldTimelineQuality
  /** Cursor glint, crease lift and tilt. Default true. */
  interactive?: boolean
  /** Grab-and-throw the folded mark (lazy-loads @react-three/rapier). Default false. */
  physics?: boolean
  /** Max entries listed under a stop before a "more" toggle. Default 7. */
  maxEntries?: number
  /** Called when an entry is clicked (links still navigate unless you preventDefault on the event). */
  onSelect?: (entry: FoldTimelineEntry, stop: FoldTimelineStop, event: React.MouseEvent) => void
  /** Called when the stop under the camera changes. */
  onActiveChange?: (index: number, stop: FoldTimelineStop) => void
  /** Overlay shown next to the folded mark that fades out as the strip unfolds (e.g. a section heading). */
  intro?: ReactNode
  /** Heading for the vertical fallback (and the accessible name of the section). */
  title?: string
  className?: string
  style?: React.CSSProperties
  id?: string
}

export interface FoldTimelineHandle {
  setProgress(p: number): void
  getProgress(): number
  /** Scrolls the page (self mode) or jumps progress (external mode) to the given stop. */
  scrollToStop(index: number): void
  /** Recompute ScrollTrigger positions (call after content above the timeline changes height). */
  refresh(): void
}
