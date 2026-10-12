import type { CSSProperties, ReactNode } from 'react'
import type { Artwork, Blog, Member, Project } from '../../data'

/** Built-in tile kinds. Custom strings are allowed and render like `note`. */
export type ArchiveKind =
  | 'project'
  | 'film'
  | 'mockup'
  | 'screen'
  | 'mobile'
  | 'artwork'
  | 'essay'
  | 'member'
  | 'contact'
  | 'note'

/** One tile on the wall. Only `id`, `kind`, `category` and `title` are required. */
export interface ArchiveItem {
  /** Unique, URL-safe id. Used for `?item=` and `open(id)`. */
  id: string
  kind: ArchiveKind | (string & {})
  /** Filter group: 'work' | 'films' | 'art' | 'journal' | 'team' | 'contact' | anything custom. */
  category: string
  title: string
  /** One-line caption under the title (hover label, list rows). */
  line?: string
  /** Public image URL. Without one the tile is typeset. */
  image?: string
  /** Image width / height, when known (sizes the tile before the image loads). */
  aspect?: number
  /** Footprint in cells [w, h]. Default: derived from kind + aspect. */
  size?: [number, number]
  /** Bigger = nearer the origin in filtered layouts. */
  rank?: number
  /** Featured items are packed right around the origin on the default wall. */
  featured?: boolean
  /** Vertical crop anchor: 0 = keep the top (screens), 0.5 = centre. */
  cropY?: number
  /** Extra filter keys, e.g. verticals ('frontend') or fests ('apogee'). */
  tags?: string[]
  /** Primary outbound link (shown in the generic detail panel). */
  href?: string
  /** Id of the item this tile belongs to (a project's screens point at the project). */
  parent?: string
  /** Fixed top-left cell (origin-centred, y grows downward). Pinned on every layout. */
  pin?: { x: number; y: number }
  /** Typeset tile copy, used when there is no image. */
  text?: { title?: string; sub?: string; tone?: 'ink' | 'accent' }
  /** Source records for the built-in dossier. */
  project?: Project
  member?: Member
  artwork?: Artwork
  blog?: Blog
}

export interface ArchiveFilterDef {
  id: string
  label: string
  /** Default: `item.category === id || item.tags?.includes(id)`. */
  test?: (item: ArchiveItem) => boolean
}

/** A built-in filter id ('all', 'work', 'films', 'screens', 'art', 'journal', 'team', 'contact', verticals, fests) or a definition. */
export type ArchiveFilterInput = string | ArchiveFilterDef

export interface ArchiveTheme {
  /** Keylines, coordinates, hover ring, contact tile. */
  accent: string
  /** Wall floor (standalone background). */
  bg: string
  /** Panels, list, caption. */
  panel: string
  /** Primary text and the mark. */
  ink: string
  /** Secondary text. */
  muted: string
}

export interface ArchiveRouting {
  /** Search param for the filter. Default 'f'. */
  filterParam?: string
  /** Search param for the open item. Default 'item'. */
  itemParam?: string
  /** History entry per change. Default 'push' for items, filters always replace when an item closes. */
  history?: 'push' | 'replace'
}

export interface ArchiveInsets {
  top?: number
  right?: number
  bottom?: number
  left?: number
}

export interface ArchiveWallProps {
  /** Tiles. Default: everything in src/immersive/data (projects, films, screens, artworks, essays, members, contact). */
  items?: ArchiveItem[]
  /** Tabs to show, in order. Default ['all', 'work', 'films', 'art', 'journal', 'team']. */
  filters?: ArchiveFilterInput[]
  initialFilter?: string
  onFilterChange?: (filterId: string) => void
  /** Called whenever a tile (or the centre, as id 'about') is opened; `null` when closed. */
  onOpen?: (item: ArchiveItem | null) => void
  /** 'builtin' = dossier panel; 'none' = only zoom-to-fit + onOpen. Default 'builtin'. */
  detail?: 'builtin' | 'none'
  /** What sits at 0, 0. 'logo' (default) draws the DVM mark in the shader; a node is tracked to the origin block. */
  centerpiece?: 'logo' | 'none' | ReactNode
  theme?: Partial<ArchiveTheme>
  /** 'standalone' paints the wall floor; 'transparent' lets the page show through the gutters. Default 'standalone'. */
  background?: 'standalone' | 'transparent'
  /** Teal texture revealed around the cursor and the origin. `true` = the redesign's bg_3, a string = custom URL. Default true. */
  texture?: boolean | string
  quality?: 'auto' | 'low' | 'high'
  /** false = static, non-interactive wall (no input, no hover). Default true. */
  interactive?: boolean
  /** Sync the filter / open item to URL search params (`?f=work&item=apogee-24-website`). Default false. */
  routing?: boolean | ArchiveRouting
  /** Space reserved for a fixed navbar above the wall's own UI. */
  insetTop?: number
  /** Space reserved on each side for page chrome (insetTop wins for top). */
  insets?: ArchiveInsets
  /** Page title shown in the tab bar. Default 'Archive'; false hides it. */
  title?: string | false
  showTabs?: boolean
  showHud?: boolean
  showMinimap?: boolean
  /** List toggle (index view). Default true. */
  showList?: boolean
  /** Close-up pull-back intro on mount. Default true (skipped for reduced motion). */
  intro?: boolean
  /** Arrow keys / +/- / 0 / L / Esc. 'auto' = when the wall has focus or was last clicked. Default 'auto'. */
  keyboard?: 'auto' | 'global' | false
  /** 'zoom' = wheel zooms; 'ctrl' = only ctrl/cmd + wheel zooms (for walls embedded in scrolling pages). */
  wheel?: 'zoom' | 'ctrl'
  className?: string
  style?: CSSProperties
}

export interface ArchiveWallHandle {
  setFilter(id: string): void
  /** Open an item by id ('about' opens the centre). */
  open(id: string): void
  close(): void
  /** Fly back to 0, 0. */
  home(): void
  zoomBy(factor: number): void
  toggleList(open?: boolean): void
}
