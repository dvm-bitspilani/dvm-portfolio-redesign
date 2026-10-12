# `<ArchiveWall />` — the Archive page

The ARCHIVE concept from the lab, ported for the redesign: one infinite pan / zoom WebGL2 wall holding every
DVM record (41 projects + their screens and mockups, 26 artworks, 9 essays, 192 members, the contact tile),
tiled around the DVM mark at 0, 0 and repeating forever (a torus). Drag, fling, pinch, scroll or use the
arrow keys; the glass barrels and splits RGB while it moves and settles flat when it stops. Tabs re-pack the
same wall into rings around the origin; any tile zooms to fit beside a dossier.

Demo: `http://localhost:5200/kit/archive` (the full page with a navbar replica; "Kit presets" switches mounts).

```tsx
import { ArchiveWall } from '@/immersive/kit/archive' // src/immersive/kit/archive

// The redesign's /archive route: fills a fixed full-screen parent, leaves room for the Navbar.
<div style={{ position: 'fixed', inset: 0 }}>
  <ArchiveWall insetTop={88} routing />
</div>
```

## Props

| prop | default | |
|---|---|---|
| `items` | all of `src/immersive/data` | `ArchiveItem[]`. `buildArchiveItems({ screens, members, artworks, essays, contact })` builds subsets; any custom array works (`id`, `kind`, `category`, `title` required; `image`, `aspect`, `size`, `rank`, `featured`, `tags`, `parent`, `pin`, `href` optional). Keep the array identity stable (memoise) — a new array re-packs the wall. |
| `filters` | `['all','work','films','art','journal','team']` | Tabs, in order. Built-ins: `all work films screens art journal team contact`, verticals `frontend backend app design video`, fests `apogee bosm oasis`. Any other string matches `category` or `tags`; or pass `{ id, label, test(item) }`. |
| `initialFilter` | `'all'` | Also the filter that is omitted from the URL. |
| `onFilterChange(id)` | | |
| `onOpen(item \| null)` | | Fires on open / close. The centre opens as `{ id: 'about' }`. |
| `detail` | `'builtin'` | `'none'` = zoom-to-fit only (use `onOpen` to show your own UI). Esc, clicking the empty floor or "Return to 0, 0" closes. |
| `centerpiece` | `'logo'` | `'logo'` (SDF mark + contours + outlined DVM letters), `'none'`, or any React node, rendered at 640×512 css px and **scaled** (not resized) onto the origin block; `pointer-events: none`. |
| `theme` | teal | `{ accent, bg, panel, ink, muted }`. Applies live (typeset tiles only re-tint until the atlas has finished loading). |
| `background` | `'standalone'` | `'transparent'` composites (premultiplied) over the page: gutters, floor and the centre show the host's texture / grid. |
| `texture` | `true` | The redesign's `bg_3.png` revealed around the cursor and the origin; `false` or a URL. |
| `quality` | `'auto'` | `'low'` = DPR 1, 80 px/cell atlas, reduced lens; `'high'` = DPR 2, 128 px/cell. `auto` picks low-ish on coarse pointers. Creation-time (remounts the engine). |
| `interactive` | `true` | `false` = a living backdrop: no input, no hover, keys ignored. |
| `routing` | `false` | `true` or `{ filterParam: 'f', itemParam: 'item', history: 'push' }`. Syncs `?f=work&item=apogee-24-website`; uses react-router when inside a Router (`navigate` with the same pathname), `history` + `popstate` otherwise. Opening/closing an item pushes (Back closes the dossier); filter changes replace. Never touches the path, so mount it at any route. |
| `insetTop` / `insets` | `0` | Css px reserved for host chrome. Tabs, panel, list and framing respect them; with `insetTop` a soft scrim keeps the navbar legible. The HUD sits bottom-right, clear of the variant switcher (bottom-left). |
| `title` | `'Archive'` | Page title chip; `false` hides. |
| `showTabs` `showHud` `showMinimap` `showList` | `true` | |
| `intro` | `true` | Close-up pull-back on mount (skipped with reduced motion). |
| `keyboard` | `'auto'` | Arrows / `+` `-` / `0` / `L` / Esc act when focus is inside the wall, or the page has no focus and the wall was last clicked (or covers ≥ 70% of the viewport at mount). `'global'` / `false`. |
| `wheel` | `'zoom'` | `'ctrl'` for walls inside scrolling pages: plain wheel scrolls the page and a hint asks for Ctrl/⌘. |

Ref (`ArchiveWallHandle`): `setFilter(id)`, `open(id)` (`'about'` = centre), `close()`, `home()`, `zoomBy(f)`, `toggleList(open?)`.

## Embedding

- **As the Archive page** (recommended): fixed full-screen parent, `insetTop` = navbar height, `routing`.
- **Inside a CSS-module section**: give the section a height (`position: relative; height: 100vh`), pass `wheel="ctrl"`. The wall fills its parent and follows it with a ResizeObserver (narrow layout below 760 px of *its own* width, not the viewport).
- **As a fixed background**: `interactive={false} showTabs={false} showHud={false} title={false} intro={false} quality="low"`, optionally `background="transparent"`.

## Performance (M-series Mac, headless Chrome, 1440×900)

- One instanced draw for all tiles (×copies when zoomed far out) + background + lens post: 3 draw calls per frame.
- 60 fps while dragging / flinging with the lens on; the loop **stops** when nothing moves (0 draw calls idle with the origin off-screen); the contour drift alone renders at ~15 fps.
- Images stream into ≤ 8 shelf-packed 2048² atlas pages, nearest-first, max 6 decodes in flight, one page upload per 160 ms; the texels-per-cell shrink automatically to fit. CPU canvases are released once everything is uploaded.
- Paused when off-screen (IntersectionObserver) or the tab is hidden; DPR capped at 2 (1.5 on touch, 1 on `low`).
- `prefers-reduced-motion`: no intro, no lens, no drift or sweep, instant flights and re-packs.

## Cleanup

Unmount disposes the renderer (+ `forceContextLoss`), all textures (atlas pages, hi-res focus image, centre /
glyph / texture), geometries, materials and the render target, and removes every listener and observer.
No global CSS: everything is under `.imm-archive-root` (`archive.css`), plus one `@font-face`
(`imm-archive-stretch`, the local Stretch Pro fallback) and the JetBrains Mono fontsource import.

## Limitations

- WebGL2 required; without it the List (index) view is shown instead.
- Up to `maxTextureSize` items (≥ 4096); very large custom sets get smaller atlas cells.
- Typeset (no-image) tiles keep their colours if the theme changes after loading finished.
- A DOM `centerpiece` is scaled with CSS, so keep it vector / resolution-independent.
