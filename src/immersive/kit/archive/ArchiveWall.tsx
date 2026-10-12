import {
  createContext, forwardRef, useCallback, useContext, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState,
  type CSSProperties, type MutableRefObject, type ReactNode,
} from 'react'
import { useInRouterContext, useLocation, useNavigate } from 'react-router-dom'
import '@fontsource-variable/jetbrains-mono'
import './archive.css'
import bg3 from '../../../assests/bg_3.png'
import { DEFAULT_FILTERS, defaultArchiveItems } from './items'
import { DEFAULT_THEME } from './theme'
import { ABOUT_ID, MARK_TARGET, WallModel, fmtNum, type WallItem } from './model'
import { WallEngine, type EngineTheme, type FrameInfo } from './engine/WallEngine'
import Detail from './ui/Detail'
import IndexList, { type ItemLinkProps } from './ui/IndexList'
import Minimap, { type MinimapHandle } from './ui/Minimap'
import type { ArchiveItem, ArchiveRouting, ArchiveTheme, ArchiveWallHandle, ArchiveWallProps } from './types'


const ABOUT_ITEM: ArchiveItem = { id: ABOUT_ID, kind: 'note', category: 'about', title: 'About DVM', line: 'The department, its five teams and its numbers' }
/** Base size of a DOM centrepiece; it is scaled (not resized) as the wall zooms. */
const SLOT_PX = 64

// ---------------------------------------------------------------- URL sync

interface Bridge {
  search: () => string
  write: (search: string, replace: boolean) => void
}

function RouterBridge({ bridge, onSearch }: { bridge: MutableRefObject<Bridge | null>; onSearch: (s: string) => void }) {
  const loc = useLocation()
  const navigate = useNavigate()
  useLayoutEffect(() => {
    bridge.current = {
      search: () => loc.search,
      write: (search, replace) => navigate({ pathname: loc.pathname, search, hash: loc.hash }, { replace, preventScrollReset: true }),
    }
  })
  useEffect(() => onSearch(loc.search), [loc.search, onSearch])
  return null
}

function WindowBridge({ bridge, onSearch }: { bridge: MutableRefObject<Bridge | null>; onSearch: (s: string) => void }) {
  useLayoutEffect(() => {
    bridge.current = {
      search: () => window.location.search,
      write: (search, replace) => {
        const url = `${window.location.pathname}${search}${window.location.hash}`
        if (replace) history.replaceState(history.state, '', url)
        else history.pushState(history.state, '', url)
      },
    }
  })
  useEffect(() => {
    const on = () => onSearch(window.location.search)
    window.addEventListener('popstate', on)
    return () => window.removeEventListener('popstate', on)
  }, [onSearch])
  return null
}

// ---------------------------------------------------------------- links

interface LinkApi {
  href: (id: string) => string | null
  open: (id: string) => void
  hover: (index: number | null) => void
}
const LinkCtx = createContext<LinkApi>({ href: () => null, open: () => {}, hover: () => {} })

/** A wall item as a real link (`?item=` when routing) or a button. */
function ItemLink({ item, className, children, onDone, onFocus, onBlur, current, title }: ItemLinkProps) {
  const api = useContext(LinkCtx)
  const href = api.href(item.id)
  const cls = `imm-archive-link${className ? ` ${className}` : ''}`
  const go = () => {
    api.open(item.id)
    onDone?.()
  }
  if (href)
    return (
      <a
        href={href}
        className={cls}
        title={title}
        aria-current={current ? 'true' : undefined}
        onFocus={onFocus}
        onBlur={onBlur}
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
          e.preventDefault()
          go()
        }}
      >
        {children}
      </a>
    )
  return (
    <button type="button" className={cls} title={title} aria-current={current ? 'true' : undefined} onFocus={onFocus} onBlur={onBlur} onClick={go}>
      {children}
    </button>
  )
}

// ---------------------------------------------------------------- component

function usePrefs() {
  return useMemo(() => {
    if (typeof window === 'undefined') return { reduced: false, coarse: false }
    return {
      reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      coarse: window.matchMedia('(pointer: coarse)').matches,
    }
  }, [])
}

/**
 * The DVM archive as one infinite pan / zoom wall (WebGL2). Fills its parent.
 * See README.md for the API, embedding notes and cleanup behaviour.
 */
export const ArchiveWall = forwardRef<ArchiveWallHandle, ArchiveWallProps>(function ArchiveWall(props, ref) {
  const {
    items, filters = DEFAULT_FILTERS, initialFilter, onFilterChange, onOpen, detail = 'builtin', centerpiece = 'logo',
    theme, background = 'standalone', texture = true, quality = 'auto', interactive = true, routing = false,
    insetTop, insets, title = 'Archive', showTabs = true, showHud = true, showMinimap = true, showList = true,
    intro = true, keyboard = 'auto', wheel = 'zoom', className, style,
  } = props

  const prefs = usePrefs()
  const inRouter = useInRouterContext()
  const srcItems = items ?? defaultArchiveItems()
  const model = useMemo(() => new WallModel(srcItems), [srcItems])
  const filterKey = filters.map((f) => (typeof f === 'string' ? f : f.id)).join('|')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tabs = useMemo(() => filters.map((f) => model.filter(f)), [model, filterKey])
  const th: ArchiveTheme = { ...DEFAULT_THEME, ...theme }
  const themeKey = `${th.accent}|${th.bg}|${th.panel}|${th.ink}|${th.muted}`
  const slotMode: 'logo' | 'slot' | 'none' =
    centerpiece === 'logo' ? 'logo' : centerpiece === 'none' || centerpiece === null || centerpiece === undefined || centerpiece === false ? 'none' : 'slot'
  const textureUrl = texture === false ? null : typeof texture === 'string' ? texture : bg3

  const pad = {
    top: insetTop ?? insets?.top ?? 0,
    right: insets?.right ?? 0,
    bottom: insets?.bottom ?? 0,
    left: insets?.left ?? 0,
  }

  const routeCfg: Required<ArchiveRouting> | null = routing
    ? { filterParam: 'f', itemParam: 'item', history: 'push', ...(routing === true ? {} : routing) }
    : null
  const defaultFilter = initialFilter ?? 'all'

  const readUrl = useCallback(
    (search: string) => {
      if (!routeCfg) return null
      const q = new URLSearchParams(search)
      return { f: q.get(routeCfg.filterParam) || defaultFilter, item: q.get(routeCfg.itemParam) || null }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [routeCfg?.filterParam, routeCfg?.itemParam, defaultFilter, !!routeCfg],
  )

  // ---------------------------------------------------------------- state
  const [filter, setFilterState] = useState<string>(() => (typeof window !== 'undefined' && readUrl(window.location.search)?.f) || defaultFilter)
  const [openId, setOpenId] = useState<string | null>(() => (typeof window !== 'undefined' && readUrl(window.location.search)?.item) || null)
  const [hovered, setHovered] = useState<number | null>(null)
  const [listOpen, setListOpen] = useState(false)
  const [hinted, setHinted] = useState(false)
  const [wheelHint, setWheelHint] = useState(false)
  const [loadDone, setLoadDone] = useState(false)
  const [glFailed, setGlFailed] = useState(false)
  const [narrow, setNarrow] = useState(false)
  const [engineGen, setEngineGen] = useState(0)

  const rootRef = useRef<HTMLDivElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<WallEngine | null>(null)
  const coordRef = useRef<HTMLSpanElement>(null)
  const zoomRef = useRef<HTMLSpanElement>(null)
  const loadRef = useRef<HTMLSpanElement>(null)
  const loadBarRef = useRef<HTMLSpanElement>(null)
  const captionRef = useRef<HTMLDivElement>(null)
  const centreRef = useRef<HTMLDivElement>(null)
  const minimapRef = useRef<MinimapHandle>(null)
  const bridge = useRef<Bridge | null>(null)
  const engaged = useRef(false)
  const savedCam = useRef<{ x: number; y: number; z: number; filter: string } | null>(null)
  const prevState = useRef<{ filter: string; target: number | null } | null>(null)
  const lastText = useRef({ c: '', z: '', l: '' })
  const cb = useRef({ onOpen, onFilterChange })
  cb.current = { onOpen, onFilterChange }

  const target: number | null = useMemo(() => {
    if (!openId) return null
    if (openId === ABOUT_ID) return MARK_TARGET
    return model.byId.get(openId)?.index ?? null
  }, [openId, model])

  // ---------------------------------------------------------------- actions
  const open = useCallback((id: string) => {
    setHinted(true)
    setListOpen(false)
    setOpenId(id)
  }, [])
  const close = useCallback(() => setOpenId(null), [])
  const setFilter = useCallback((id: string) => {
    setOpenId(null)
    setFilterState(id)
  }, [])

  // URL -> state
  const onSearch = useCallback(
    (search: string) => {
      const r = readUrl(search)
      if (!r) return
      setFilterState((f) => (f === r.f ? f : r.f))
      setOpenId((o) => (o === r.item ? o : r.item))
    },
    [readUrl],
  )

  // state -> URL
  const lastWritten = useRef<{ f: string; item: string | null } | null>(null)
  useEffect(() => {
    if (!routeCfg || !bridge.current) return
    const b = bridge.current
    const q = new URLSearchParams(b.search())
    const cur = { f: q.get(routeCfg.filterParam) || defaultFilter, item: q.get(routeCfg.itemParam) || null }
    if (cur.f === filter && cur.item === openId) {
      lastWritten.current = cur
      return
    }
    if (filter === defaultFilter) q.delete(routeCfg.filterParam)
    else q.set(routeCfg.filterParam, filter)
    if (openId) q.set(routeCfg.itemParam, openId)
    else q.delete(routeCfg.itemParam)
    const s = q.toString()
    const itemChanged = cur.item !== openId
    b.write(s ? `?${s}` : '', routeCfg.history === 'replace' || !itemChanged)
    lastWritten.current = { f: filter, item: openId }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, openId, !!routeCfg, defaultFilter])

  const hrefFor = useCallback(
    (id: string) => {
      if (!routeCfg || typeof window === 'undefined') return null
      const q = new URLSearchParams(bridge.current?.search() ?? window.location.search)
      if (filter !== defaultFilter) q.set(routeCfg.filterParam, filter)
      q.set(routeCfg.itemParam, id)
      return `${window.location.pathname}?${q.toString()}`
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [!!routeCfg, filter, defaultFilter, routeCfg?.filterParam, routeCfg?.itemParam],
  )

  // ---------------------------------------------------------------- frame -> DOM (no React renders per frame)
  const onFrame = useCallback((f: FrameInfo) => {
    const c = `${fmtNum(f.x)}, ${fmtNum(f.y)}`
    const z = `${f.zoom.toFixed(2)}×`
    if (c !== lastText.current.c && coordRef.current) coordRef.current.textContent = lastText.current.c = c
    if (z !== lastText.current.z && zoomRef.current) zoomRef.current.textContent = lastText.current.z = z
    const l = f.loaded < f.total ? `${f.loaded} of ${f.total} loaded` : ''
    if (l !== lastText.current.l) {
      lastText.current.l = l
      if (loadRef.current) loadRef.current.textContent = l
      if (loadBarRef.current) loadBarRef.current.style.transform = `scaleX(${f.loaded / f.total})`
      if (!l) setLoadDone(true)
    }
    const root = rootRef.current
    const cap = captionRef.current
    if (cap && root) {
      if (f.hoverRect) {
        const r = f.hoverRect
        const cw = cap.offsetWidth || 260, chh = cap.offsetHeight || 56
        const vw = root.clientWidth, vh = root.clientHeight
        let x = r.x
        let y = r.y + r.h + 10
        if (y + chh > vh - 12) y = r.y - chh - 10
        x = Math.max(12, Math.min(vw - cw - 12, x))
        y = Math.max(12, Math.min(vh - chh - 12, y))
        cap.style.transform = `translate3d(${x}px, ${y}px, 0)`
        cap.dataset.show = '1'
      } else cap.dataset.show = '0'
    }
    const slot = centreRef.current
    if (slot) slot.style.transform = `translate3d(${f.centre.x}px, ${f.centre.y}px, 0) scale(${f.centre.w / (10 * SLOT_PX)})`
    minimapRef.current?.draw(f)
  }, [])

  // ---------------------------------------------------------------- keyboard gating
  const keyboardActive = useCallback(() => {
    if (keyboard === false) return false
    if (keyboard === 'global') return true
    const root = rootRef.current
    if (!root) return false
    const ae = document.activeElement
    if (ae && ae !== document.body && root.contains(ae)) return true
    return (!ae || ae === document.body) && engaged.current
  }, [keyboard])
  const kbRef = useRef(keyboardActive)
  kbRef.current = keyboardActive

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const vw = window.innerWidth, vh = window.innerHeight
    const r = root.getBoundingClientRect()
    engaged.current = (r.width * r.height) / Math.max(1, vw * vh) > 0.7
    const onDown = (e: PointerEvent) => {
      engaged.current = root.contains(e.target as Node)
    }
    document.addEventListener('pointerdown', onDown, true)
    return () => document.removeEventListener('pointerdown', onDown, true)
  }, [])

  // ---------------------------------------------------------------- engine lifecycle
  const engineTheme = (t: ArchiveTheme): EngineTheme => ({ bg: t.bg, accent: t.accent, ink: t.ink, muted: t.muted, plate: t.panel, accentInk: '#031417' })
  const live = useRef({ select: (_t: number) => {}, hover: (_t: number | null) => {} })

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let engine: WallEngine
    try {
      engine = new WallEngine(
        host,
        model,
        {
          hover: (t) => live.current.hover(t),
          select: (t) => live.current.select(t),
          frame: onFrame,
          interact: () => setHinted(true),
        },
        {
          reduced: prefs.reduced,
          mobile: prefs.coarse || host.clientWidth < 760,
          quality,
          intro,
          opaque: background !== 'transparent',
          centerpiece: slotMode,
          texture: textureUrl,
          wheel,
          interactive,
          theme: engineTheme(th),
          keyboardActive: () => kbRef.current(),
          onWheelHint: () => setWheelHint(true),
        },
      )
    } catch (err) {
      console.warn('[archive] WebGL2 unavailable, showing the index instead.', err)
      setGlFailed(true)
      return
    }
    engineRef.current = engine
    prevState.current = null
    setEngineGen((g) => g + 1)
    return () => {
      engine.dispose()
      engineRef.current = null
    }
    // Creation-time options: model, quality, intro. Everything else is applied live below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, quality])

  useEffect(() => engineRef.current?.setInteractive(interactive), [interactive, engineGen])
  useEffect(() => engineRef.current?.setWheelMode(wheel), [wheel, engineGen])
  useEffect(() => engineRef.current?.setBackground(background !== 'transparent'), [background, engineGen])
  useEffect(() => engineRef.current?.setCenterpiece(slotMode), [slotMode, engineGen])
  useEffect(() => engineRef.current?.setTexture(textureUrl), [textureUrl, engineGen])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => engineRef.current?.setTheme(engineTheme(th)), [themeKey, engineGen])

  useEffect(() => {
    if (!wheelHint) return
    const t = window.setTimeout(() => setWheelHint(false), 1600)
    return () => window.clearTimeout(t)
  }, [wheelHint])

  // ---------------------------------------------------------------- size class
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const ro = new ResizeObserver(() => setNarrow(root.clientWidth < 760))
    ro.observe(root)
    return () => ro.disconnect()
  }, [])

  /** Css px covered by UI around the focused tile. */
  const panelInset = useCallback(() => {
    const root = rootRef.current
    const W = root?.clientWidth ?? window.innerWidth, H = root?.clientHeight ?? window.innerHeight
    const top = pad.top + (showTabs ? (W < 760 ? 100 : 64) : 12)
    if (detail !== 'builtin') return { top, right: pad.right, bottom: pad.bottom, left: pad.left }
    if (W < 760) return { top, right: pad.right, bottom: Math.round(H * 0.58) + pad.bottom, left: pad.left }
    return { top, right: Math.min(480, Math.round(W * 0.4)) + 36 + pad.right, bottom: pad.bottom, left: pad.left }
  }, [pad.top, pad.right, pad.bottom, pad.left, detail, showTabs])

  // ---------------------------------------------------------------- state -> wall
  useEffect(() => {
    const e = engineRef.current
    if (!e) return
    const prev = prevState.current
    prevState.current = { filter, target }
    const first = prev === null
    const filterChanged = !first && prev.filter !== filter
    e.setFilter(filter, !first)
    let timer = 0
    if (target !== null) {
      if (e.focused === null) savedCam.current = { x: e.x, y: e.y, z: e.z, filter }
      if (first && intro && !prefs.reduced) timer = window.setTimeout(() => engineRef.current?.focus(target, panelInset()), 900)
      else e.focus(target, panelInset())
    } else {
      const wasOpen = e.focused !== null
      e.focus(null)
      if (first) {
        if (filter !== 'all') e.home(e.homeZoomFor(filter))
      } else if (filterChanged) {
        e.home(e.homeZoomFor(filter))
        savedCam.current = null
      } else if (wasOpen) {
        const s = savedCam.current
        if (s && s.filter === filter) e.flyTo(s.x, s.y, s.z, prefs.reduced ? 1 : 1000)
        savedCam.current = null
      }
    }
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, target, engineGen])

  // Keep the open tile framed beside its panel when the wall changes size.
  useEffect(() => {
    const root = rootRef.current
    if (target === null || !root) return
    let t = 0
    let first = true
    const ro = new ResizeObserver(() => {
      if (first) {
        first = false
        return
      }
      window.clearTimeout(t)
      t = window.setTimeout(() => engineRef.current?.focus(target, panelInset()), 180)
    })
    ro.observe(root)
    return () => {
      window.clearTimeout(t)
      ro.disconnect()
    }
  }, [target, panelInset])

  // ---------------------------------------------------------------- callbacks out
  const firstOpen = useRef(true)
  useEffect(() => {
    if (firstOpen.current) {
      firstOpen.current = false
      if (target === null) return
    }
    cb.current.onOpen?.(target === null ? null : target === MARK_TARGET ? ABOUT_ITEM : model.items[target].item)
  }, [target, model])
  const firstFilter = useRef(true)
  useEffect(() => {
    if (firstFilter.current) {
      firstFilter.current = false
      return
    }
    cb.current.onFilterChange?.(filter)
  }, [filter])

  // ---------------------------------------------------------------- engine events
  useEffect(() => {
    live.current.select = (t: number) => {
      setHinted(true)
      if (t === -1) {
        if (openId) close()
        return
      }
      if (t === MARK_TARGET) open(ABOUT_ID)
      else if (model.items[t]) open(model.items[t].id)
    }
    live.current.hover = (t) => setHovered(t)
  }, [open, close, openId, model])

  // Esc closes the list / the dossier; L toggles the list.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!kbRef.current() && !rootRef.current?.contains(document.activeElement)) return
      const t = e.target as HTMLElement | null
      if (t?.closest?.('input, textarea, select, [contenteditable]')) return
      if (e.key === 'Escape') {
        if (listOpen && !glFailed) setListOpen(false)
        else if (openId) close()
      } else if ((e.key === 'l' || e.key === 'L') && !e.metaKey && !e.ctrlKey && !e.altKey && showList && !glFailed) {
        setListOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [listOpen, openId, close, glFailed, showList])

  useImperativeHandle(
    ref,
    () => ({
      setFilter,
      open,
      close,
      home: () => (openId ? close() : engineRef.current?.home(engineRef.current.homeZoomFor(filter))),
      zoomBy: (f: number) => engineRef.current?.zoomBy(f),
      toggleList: (o?: boolean) => setListOpen((cur) => o ?? !cur),
    }),
    [setFilter, open, close, openId, filter],
  )

  // ---------------------------------------------------------------- render
  const linkApi = useMemo<LinkApi>(
    () => ({ href: hrefFor, open, hover: (i) => engineRef.current?.setExternalHover(i, i !== null) }),
    [hrefFor, open],
  )
  const counts = useMemo(() => {
    const primary = model.items.filter((i) => i.primary)
    return Object.fromEntries(tabs.map((t) => [t.id, t.id === 'all' ? primary.length : primary.filter((i) => t.test(i.item)).length]))
  }, [model, tabs])

  const addrFilter = model.layout(filter).count <= 2 ? 'all' : filter
  const hoverItem: WallItem | null = hovered !== null && hovered >= 0 ? model.items[hovered] ?? null : null
  const detailOpen = target !== null
  const showPanel = detailOpen && detail === 'builtin'
  const listVisible = listOpen || glFailed
  const primaryItems = useMemo(() => model.items.filter((i) => i.primary), [model])

  const rootStyle = {
    ...style,
    '--a-accent': th.accent,
    '--a-bg': th.bg,
    '--a-panel': th.panel,
    '--a-ink': th.ink,
    '--a-muted': th.muted,
    '--a-top': `${pad.top}px`,
    '--a-right': `${pad.right}px`,
    '--a-bottom': `${pad.bottom}px`,
    '--a-left': `${pad.left}px`,
  } as CSSProperties

  const cls = [
    'imm-archive-root',
    background !== 'transparent' && 'is-standalone',
    narrow && 'is-narrow',
    showPanel && 'has-detail',
    listVisible && 'has-list',
    className,
  ].filter(Boolean).join(' ')

  return (
    <LinkCtx.Provider value={linkApi}>
      {routeCfg && (inRouter ? <RouterBridge bridge={bridge} onSearch={onSearch} /> : <WindowBridge bridge={bridge} onSearch={onSearch} />)}
      <div className={cls} ref={rootRef} style={rootStyle}>
        <div className="imm-archive-stage" ref={hostRef} />
        {pad.top > 0 && <div className="imm-archive-scrim" style={{ height: pad.top + 48 }} aria-hidden="true" />}

        {slotMode === 'slot' && (
          <div className="imm-archive-centre" ref={centreRef} style={{ width: 10 * SLOT_PX, height: 8 * SLOT_PX }}>
            {centerpiece as ReactNode}
          </div>
        )}

        {(showTabs || title !== false) && (
          <header className="imm-archive-top">
            {title !== false && (
              <h2 className="imm-archive-title">
                {title}
                <small>{counts.all ?? primaryItems.length} records on one wall</small>
              </h2>
            )}
            {showTabs && (
              <nav className="imm-archive-tabs" aria-label="Filter the wall">
                {tabs.map((t) => (
                  <button key={t.id} type="button" className="imm-archive-tab" aria-pressed={filter === t.id} onClick={() => setFilter(t.id)}>
                    {narrow && t.id === 'all' ? 'All' : t.label}
                    {!narrow && <sup>{counts[t.id]}</sup>}
                  </button>
                ))}
                {showList && (
                  <button type="button" className="imm-archive-listbtn" onClick={() => setListOpen((o) => !o)} aria-expanded={listVisible} disabled={glFailed}>
                    <span aria-hidden="true" className="imm-archive-listbtn__icon" />
                    {listVisible ? 'Wall' : 'List'}
                  </button>
                )}
              </nav>
            )}
          </header>
        )}

        {interactive && !glFailed && (
          <p className={`imm-archive-hint${wheelHint ? ' is-flash' : hinted || detailOpen ? ' is-gone' : ''}`} aria-hidden="true">
            {wheelHint
              ? 'Hold Ctrl (or ⌘) and scroll to zoom the wall.'
              : prefs.coarse
                ? 'Drag to move, pinch to zoom, tap anything to open it.'
                : 'Drag to move, scroll to zoom, click anything to open it.'}
          </p>
        )}

        <div className="imm-archive-caption" ref={captionRef} data-show="0" aria-hidden="true">
          {hovered === MARK_TARGET ? (
            <>
              <span className="imm-archive-caption__title">About DVM</span>
              <span className="imm-archive-caption__meta">
                <span>The department, its five teams and its numbers</span>
                <span className="imm-archive-caption__addr">0, 0</span>
              </span>
            </>
          ) : hoverItem ? (
            <>
              <span className="imm-archive-caption__title">{hoverItem.item.title}</span>
              <span className="imm-archive-caption__meta">
                <span>{hoverItem.item.line}</span>
                <span className="imm-archive-caption__addr">{model.addressOf(hoverItem.index, addrFilter)}</span>
              </span>
            </>
          ) : null}
        </div>

        {showHud && !glFailed && (
          <aside className="imm-archive-hud" aria-label="Position on the wall">
            {showMinimap && !narrow && <Minimap ref={minimapRef} engine={engineRef} model={model} filter={filter} accent={th.accent} ink={th.ink} />}
            <div className="imm-archive-hud__row">
              <span className="imm-archive-hud__coord" title="Camera position in cells (y up)">
                <span ref={coordRef}>0, 0</span>
              </span>
              <span className="imm-archive-hud__zoom" ref={zoomRef}>
                1.00×
              </span>
            </div>
            <div className="imm-archive-hud__row imm-archive-hud__btns">
              <button type="button" onClick={() => engineRef.current?.zoomBy(1 / 1.4)} aria-label="Zoom out">
                −
              </button>
              <button type="button" onClick={() => engineRef.current?.zoomBy(1.4)} aria-label="Zoom in">
                +
              </button>
              <button
                type="button"
                className="imm-archive-hud__origin"
                onClick={() => (openId ? close() : engineRef.current?.home(engineRef.current.homeZoomFor(filter)))}
              >
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <circle cx="8" cy="8" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M8 0v4M8 12v4M0 8h4M12 8h4" stroke="currentColor" strokeWidth="1.3" />
                </svg>
                Return to 0, 0
              </button>
            </div>
            <div className={`imm-archive-hud__load${loadDone ? ' is-done' : ''}`}>
              <span className="imm-archive-hud__bar">
                <span ref={loadBarRef} />
              </span>
              <span ref={loadRef} />
            </div>
          </aside>
        )}

        {showPanel && (
          <Detail
            key={openId ?? ''}
            target={target!}
            model={model}
            filter={filter}
            onClose={close}
            onOpen={open}
            onFilter={setFilter}
            Link={ItemLink}
          />
        )}

        {listVisible && (
          <IndexList
            model={model}
            filters={tabs}
            filter={filter}
            glFailed={glFailed}
            onClose={() => setListOpen(false)}
            Link={ItemLink}
            insetTop={pad.top}
          />
        )}

        {/* Accessible fallback: every record on the wall as a plain link. Focusing one highlights its tile. */}
        {!listVisible && (
          <nav className="imm-archive-sr" aria-label="Everything on the wall">
            <ul>
              <li>
                <ItemLink
                  item={{ index: MARK_TARGET, id: ABOUT_ID, item: ABOUT_ITEM, kind: 'note', code: 9, w: 1, h: 1, cropY: 0.5, rank: 0, primary: true }}
                  onFocus={() => linkApi.hover(MARK_TARGET)}
                  onBlur={() => engineRef.current?.setExternalHover(null, false)}
                >
                  About DVM, the mark at 0, 0
                </ItemLink>
              </li>
              {primaryItems.map((it) => (
                <li key={it.id}>
                  <ItemLink item={it} onFocus={() => linkApi.hover(it.index)} onBlur={() => engineRef.current?.setExternalHover(null, false)}>
                    {it.item.title}
                    {it.item.line ? `, ${it.item.line}` : ''}
                  </ItemLink>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </LinkCtx.Provider>
  )
})

export default ArchiveWall
