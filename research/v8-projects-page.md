# V8 — /projects and /projects/:id redesign ("The print room")

Build spec for the Opus engineer. Design lead: ideas and spec only; nothing under `src/` was edited.
Before screenshots: `/tmp/v8cdp/PROJ/before/` (list at 1440 / 1024 / 390, detail for a site `5`, a film `48`, a
project with no image `47`).

User feedback this answers: "I do not like the Projects page at all … It's too plain", "show a proper detail of
the project". The home page's Selected-work cards (cover in the open, title, mono meta) are liked — they stay the
unit. No horizontal scroll-jacking anywhere in this spec.

---

## 1. What data actually exists (measured, do not spec beyond this)

Two sources describe the same projects:

- `src/projects.json` via `components/Project/projectsData` (`baseProjects`, 40 rows, ids = pk). Fields: name,
  categories, date, websiteLink, heroImage, mockup, gallery, text1, text2, youtubeId.
- `src/immersive/data/projects.ts` (`projects`, 41 records). **Every base row has a record** (matched by title);
  the one extra is `apogee-25-website` (no pk). The record is the richer and cleaner one — use it for all content.

Record fields and how many of the 41 carry them:

| field | n | note |
|---|---|---|
| title, fest, kind, verticals, tags, links | 41 | fest ∈ APOGEE / Oasis / BOSM / Campus; kind ∈ website 13, app 4, portal 2, video 22 |
| year | 40 | 2018–2025, no 2023. `50-years-of-oasis` has none |
| date ("March 2021") | 23 | absent on most films |
| summary, description | 18 | the 17 builds that have copy + `apogee-25-website`. **No film has any text. `aic-19-website` has none** |
| festContext | 13 | generic fest blurb; the same text lives in `fests[]` (site.ts) for APOGEE / BOSM / Oasis |
| theme | 4 | 2025 Revved-Up Rhapsody, 2024 A Celestial Epiphany, 2022 The Encrypted Dimension, 2021 Digitized Renaissance |
| subtitle | 2 | `aic-19-website` "Apogee Innovation Challenge 19", `bits-premier-league-2021` |
| cover | 37 | missing: `apogee-24-app`, `apogee-22-curtain-raiser`, `apogee-22-n2o-teaser`, `apogee-22-lost-stories-teaser` |
| mockup | 18 | opaque collage renders, 1200 px wide, aspect varies (16:9, 4:3, 1:1) — not transparent device cut-outs |
| gallery (`page-1`) | 15 | one full-page desktop screenshot each, mostly 960 px wide, 569–5128 px tall |
| mobileGallery (`mobile-1`) | 12 | one full-page phone screenshot each, ~385 px wide, 830–12291 px tall |
| youtubeId | 19 | the three Apogee '22 films have **no id, no cover, no link** — nothing to show or play |
| links | live 17, youtube 19, playStore 1, none 5 | none: the 3 Apogee '22 films, `armageddon-19-website`, `aic-19-website` |
| featured | 4 | `apogee-25-website`, `apogee-24-app`, `apogee-24-curtain-raiser`, `apogee-24-theme-release` |
| tech | 0 | **never populated. No stack section.** |

Does not exist anywhere: per-project credits / people, tech stack, role notes per project, client, duration,
more than one screenshot per form factor. Do not invent any of it. What does exist for "who": the teams involved
(`verticals`) and each team's verbatim description (`verticals[]` in site.ts) plus the roster on `/team?v=<id>`.

Three unusable images — add them to a skip list, never render them:
`/assets/projects/apogee-22-website/page-1.jpg` (201 × 1280), `/assets/projects/apogee-22-website/mobile-1.jpg`
(67 × 1280), `/assets/projects/apogee-22-app/page-1.jpg` (275 × 1280).

Weight: the record images under `public/assets/projects` total 11 MB (covers 36–200 KB, pages 46–705 KB). The
base assets under `src/assests/img/project-imgs` total 63 MB (single PNGs up to 6.4 MB) and the current pages
load them (`thumbOf` → `p.heroImage`). **The new pages must never request a base asset**; the record set is a
superset of what the base has.

Film covers are 960 × 540 or 480 × 360 (letterboxed 4:3): always show them in a 16:9 frame with
`object-fit: cover` so the bars crop away.

---

## 2. Critique of the current pages

List (`list-1440.png`, `list-390-full.png`):
- A heading, a lede that restates it, five text tabs, then 41 identical 3-up cards. No hierarchy: a fest
  website and a 20-second teaser get the same box. Nothing on the page is V8 except the fonts.
- The tabs are a detached text row; they do not show counts and there is no sign of what changed after a click.
- No structure in 41 items: no years, no fests, no seasons, though the data is naturally seasonal.
- Placeholder for a missing cover is a lone grey initial ("A") — reads as a broken card in the first row.
- Phone: one card per row → 13 952 px of scroll, 22 of the rows are near-identical film stills.
- Heavy: cards pull the base PNGs (up to 4.3 MB for one cover).

Detail (`detail5-1440-full.png`, `detail48-video-1440-full.png`, `detail47-noimg-1440-full.png`):
- Cover, four 96 px thumbnails, title, one meta line, two paragraphs, a button. It is a blog post template.
- The first paragraph is the generic fest blurb (text_1), so every APOGEE page opens with the same 500
  characters; the project's own description is second.
- The full-page screenshots — the best material there is — are squeezed into a 16:9 crop behind a thumbnail.
- No way onward: no next / previous, no related work, no route back to the filter you came from.
- Film pages are an iframe and a title, then empty page. Three films render an empty grey frame.
- Fest, year, type, theme, teams exist in the data and are not shown as facts.

---

## 3. Directions considered

**A. The print room (chosen).** The catalogue is the department's film, unspooled down the page: a projection
gate in the hero showing the featured reel, then the work laid out season by season along a vertical film rail,
builds as large frames and films as small ones. Team tabs become the console bar that stays with you. The detail
page is a dossier: the project in the gate, a fact ledger, the real copy, the full-page screenshots in windows
that pan, the teams, the rest of that season, and next / previous.
Why: it uses the cards the user liked, gives hierarchy from real attributes (kind, year, fest), is mostly CSS,
and reuses the reel / gate / sprocket language of Selected work so the page reads as the same film.

**B. Projection booth index.** A two-pane page: a dense mono index of all 41 titles on the left, one large
sticky projected still on the right that changes with the hovered row. Striking on desktop, but it is a list at
heart (the thing the user called plain), hover-dependent, and collapses to a plain list on phones.

**C. Light table.** A bento / masonry wall of mixed-size stills with filters. Visually dense, but size would be
arbitrary (no data to rank by), the 22 films swamp it, and it duplicates `/archive`'s wall.

---

## 4. Shared groundwork (lib)

All in `src/variants/v8/lib/catalog.js` (extend; keep existing exports working for other importers).

```js
// one entry per record, in catalogue order
export const catalog = [...]        // Entry[]
export const catalogById            // Map: pk string AND slug -> Entry  (so /projects/5 and /projects/apogee-21-website both resolve)
export const TEAMS = [              // tab order; id = record vertical id
  { id: "design", label: "Design" }, { id: "frontend", label: "Frontend" }, { id: "backend", label: "Backend" },
  { id: "video", label: "Video" }, { id: "app", label: "AppDev" } ]
```

`Entry`:
- `r` the record; `id` = pk string when the base list has the title, else `r.slug`; `href` = `P('/projects/' + id)`.
- `kind` label: Website / App / Portal / Film. `isFilm` = `r.kind === "video"`.
- `cover` = `r.cover ?? null` (never a base asset, never `img.youtube.com` — every film with an id has a local
  cover).
- `page` = `r.gallery?.[0]`, `mobile` = `r.mobileGallery?.[0]`, both dropped if in the skip list (§1).
- `mockup` = `r.mockup ?? null`.
- `out` = `{ url, label }` or null: `links.live` → label = hostname without `www.` (e.g. `bits-apogee.org`,
  `tinyurl.com`); `links.playStore` → `Google Play`; `links.youtube` → `YouTube`. (Hostname, not "Visit site":
  several old fest links now serve the current year's site.)
- `season` = `r.year ? `${r.fest} ${r.year}` : r.fest` (Campus → `Campus 2021`).
- `i` = index in `catalog`.

Catalogue order: year descending (no year last); inside a year builds first (website, app, portal) then films;
inside those, source order of `projects.ts`.

`catalogCount` stays = 41 (now `catalog.length`).

`lib/projects.js › projectHref(p)`: return the internal route for every record (`catalogById` by slug), so
`apogee-25-website` gets a page instead of linking out. This changes one card on the home strip from "↗" to an
in-site link — intended. Move `pickWork()` from `home/Work.jsx` into `lib/projects.js` and export it
(`featuredReel()`), so the hero gate below shows the same five as the home strip; `Work.jsx` imports it.

Route: unchanged (`projects/:name`). `ProjectPage` resolves `catalogById.get(name)`.

New files: `pages/projects.module.css` (everything below; leave `pages.module.css`'s `.cardGrid/.cardItem`
alone — Blog/Artwork may use them — and delete the `.detail … .detailAction` block once unused),
`pages/projects/Gate.jsx`, `Card.jsx`, `Screens.jsx`, `Lightbox.jsx`, `Leader.jsx`.

### 4.1 Shared pieces

**Ticks** (hologram corner brackets on a frame). One pseudo-element, no images:

```css
.ticks::before {
  content: ""; position: absolute; inset: 8px; z-index: 2; pointer-events: none;
  --t: 12px; --c: var(--teal);
  background:
    linear-gradient(var(--c), var(--c)) 0 0 / var(--t) 1px, linear-gradient(var(--c), var(--c)) 0 0 / 1px var(--t),
    linear-gradient(var(--c), var(--c)) 100% 0 / var(--t) 1px, linear-gradient(var(--c), var(--c)) 100% 0 / 1px var(--t),
    linear-gradient(var(--c), var(--c)) 0 100% / var(--t) 1px, linear-gradient(var(--c), var(--c)) 0 100% / 1px var(--t),
    linear-gradient(var(--c), var(--c)) 100% 100% / var(--t) 1px, linear-gradient(var(--c), var(--c)) 100% 100% / 1px var(--t);
  background-repeat: no-repeat;
  opacity: 0; transform: scale(1.03); transition: opacity 180ms ease, transform 320ms var(--ease-out);
}
```
Cards: shown on hover / focus-visible (`opacity: .9; transform: none`). Gates (hero, detail): always on.

**Sweep** (the light passing over a still, once per hover):
```css
.sweep::after {
  content: ""; position: absolute; left: 0; right: 0; top: 0; height: 45%; z-index: 1; pointer-events: none;
  background: linear-gradient(to bottom, transparent, rgba(69,230,255,.10) 70%, rgba(207,240,255,.28) 98%, transparent);
  mix-blend-mode: screen; transform: translateY(-110%);
}
.card:hover .sweep::after, .card:focus-visible .sweep::after { animation: sweep 700ms var(--ease-out) 1; }
@keyframes sweep { to { transform: translateY(330%); } }
```

**Leader** (`Leader.jsx`, replaces the lone initial for the 4 projects without a cover). An inline SVG film
leader filling the frame: `--bg-3` fill, a centred circle r = 28 % of height and a second at 20 %, a full-width
and full-height hairline crosshair, all `stroke: var(--line-2)`; a 1 px teal radius line from the centre that
rotates 360° in 4 s linear infinite (static at 12 o'clock under reduced motion). The project title sits under
the circle in `--t-h3` `--ink-2`, centred, max 2 lines. `aria-hidden` (the card already has the title).

**Rail** (sprockets): reuse the SVG data URI from `home/strip.module.css › .rail` verbatim (copy the
`background-image`; do not import the home module's class, its opacity is driven by `--strip-on`).

---

## 5. List page — `/projects`

Order on the page: hero (title + gate) → console bar (sticky) → catalogue by year → nothing else (no closing
band; the last group ends the page with the standard `--section` bottom padding).

### 5.1 Hero

`<header className={ui.pageHead} data-light="74% 40% 34vw">` — the room's pool sits behind the gate.
Padding: `var(--s-8) var(--gutter) var(--s-7)` (override; the default `--s-9` top leaves the gate too low).
Inner 12-col grid, `column-gap: var(--col-gap)`, `align-items: stretch`.

**Left, columns 1–5**, a flex column, `justify-content: space-between`:
- top: `<h1 className={ui.h1} data-reveal="head">Projects</h1>` then one mono line (`ui.meta`, margin-top
  `--s-5`), computed from `catalog`: `13 websites · 4 apps · 2 portals · 22 films · 2018–2025`. No lede.
- bottom (aligned to the gate's bottom edge): the caption of the frame in the gate — `aria-live="off"`:
  - counter, `ui.meta`, teal number: `01 / 05`
  - title, `font: var(--t-sub) var(--f-display)`, one line, ellipsis
  - meta, `ui.cardMeta`: `APOGEE 2025 · WEBSITE`
  - summary when the record has one: `ui.cardLine` (2-line clamp), max-width 30rem. Films have none; the block
    keeps a fixed `min-height` of 2 lines so the caption never jumps.
  The caption cross-fades (opacity 0 → 1, 240 ms) on change.

**Right, columns 6–12: the gate** (`Gate.jsx`).
- Items: `featuredReel()` (5; today: Apogee '25 Website, APOGEE '24 Curtain Raiser, APOGEE '24 Theme Release,
  then the two newest covered non-featured records).
- Box: `position: relative; padding: 26px 0` with a `.rail` (26 px tall, `background-size: auto 26px`) on the top
  and bottom edges, masked to fade out over the outer 12 % on each side. Between them the frame:
  `ui.frame` + `.ticks` (always on), `aspect-ratio: 16 / 9`, `border-color: var(--line-2)`,
  `box-shadow: 0 0 0 1px rgba(69,230,255,.10), 0 48px 120px -48px rgba(69,230,255,.28)`.
- The frame is one `<Link>` to the current item (`aria-label` = title). All five `<img>` are stacked
  (`position: absolute; inset: 0`), the first `loading="eager" fetchpriority="high"`, the rest `loading="lazy"`;
  only the current has `opacity: 1`.
- Scanlines over the still: `::after`, `inset: 0`,
  `background: repeating-linear-gradient(to bottom, rgba(5,5,6,.0) 0 2px, rgba(5,5,6,.22) 2px 3px)`,
  `mix-blend-mode: multiply; opacity: .5`. Films get `ui.play` centred.
- Advance: every 6 s. Outgoing still `opacity 1 → 0, transform: translateX(-4%)`, incoming
  `translateX(4%) → 0, opacity 0 → 1`, 520 ms `var(--ease-out)`; both rails' `background-position-x` moves −64 px
  in the same 520 ms (the film advancing two perforations). Pauses while the gate or the pips are hovered or
  contain focus, and while `document.hidden`.
- Pips under the bottom rail, right-aligned, `gap: 6px`: five `<button>`s, each a 28 × 2 px bar inside a
  28 × 24 px hit area, `background: var(--line-2)`; the current one holds a teal fill that grows
  `scaleX(0 → 1)` linearly over the 6 s (the timer made visible). `aria-label="Show {title}"`,
  `aria-current="true"` on the current. Clicking selects and restarts the timer.
- Reduced motion: no auto-advance, no slide (instant swap), pips still work, current pip solid teal.

Reveal: `useReveal(headRef, { start: "top 95%" })`; `data-reveal` on the mono line, the gate box and the
caption block.

Height check at 1440 × 900: gate = 7 columns ≈ 755 px wide → 425 + 52 rails; hero ≈ 64 + 477 + 24 pips + 48 ≈
615 px, so the console bar and the first year head are above the fold.

### 5.2 Console bar (the team tabs, made structural)

`<div className={p.console}>` directly after the header, **sticky**: `top: var(--nav-h); z-index: 5`.
- Full-bleed strip, inner `max-width: var(--max)` with the page gutter. Height 56 px.
  `background: rgba(5,5,6,.78); backdrop-filter: blur(10px); border-block: 1px solid var(--line)`.
  While stuck, the top hairline is teal at 35 % (`box-shadow: inset 0 1px 0 rgba(69,230,255,.35)` — same line as
  the route panel). Detect "stuck" with a 1 px sentinel + IntersectionObserver → `data-stuck`.
- Left: the tabs. `role="tablist" aria-label="Filter by team"`, `ui.tabs`, gap `--s-6`. Tabs:
  `All 41 · Design 17 · Frontend 15 · Backend 17 · Video 22 · AppDev 4` (counts computed). Each is
  `<button role="tab" className={ui.tab}>` with the label and the count in a `<span>`:
  `font: var(--t-meta) var(--f-mono); color: var(--ink-3); margin-left: 6px; vertical-align: 0.35em`; the
  selected tab's count is `var(--teal)`.
  Replace the per-tab border with one sliding indicator: `.tab { border-bottom-color: transparent !important }`
  and an absolutely positioned `<span className={p.ind}>` (height 2 px, teal, bottom −1 px so it sits on the
  bar's hairline, `box-shadow: 0 0 12px rgba(69,230,255,.6)`), `transform: translateX(x) ` + `width` measured
  from the selected tab (`offsetLeft / offsetWidth`, re-measured on resize and after fonts load),
  `transition: transform 280ms var(--ease-out), width 280ms var(--ease-out)`.
- Right (≥ 1100 px only): year jumps, `ui.meta` links, gap `--s-4`: `2025 2024 2022 2021 2020 2019 2018`. A
  year with no project under the current filter is `opacity: .35; pointer-events: none; aria-disabled; tabIndex -1`.
  The year whose group holds the viewport's 40 % line is `color: var(--teal)` (one IntersectionObserver on the
  groups, `rootMargin: "-40% 0px -60% 0px"`). Click: smooth-scroll to the group (instant under reduced motion)
  and focus its heading, no hash — same pattern as `AlumniPage › jump`.
- State lives in the URL: `?team=design|frontend|backend|video|app` via `useSearchParams`, `{ replace: true }`;
  absent / invalid = All. (Back from a detail page restores the filter.)
- On tab change, if the bar is stuck, `window.scrollTo({ top: catalogueTop - navH, behavior: "auto" })` so the
  new result starts at its top.
- Tabs keyboard: roving tabindex (selected tab 0, others −1); ← / → move and select, Home / End jump;
  `aria-controls` → the catalogue, which is `role="tabpanel" aria-labelledby={selected tab id}`.
- Filter rule: `tab === all || r.verticals.includes(tab)`.

### 5.3 Catalogue

`<section className={p.catalogue} id="v8-projects-catalogue">`, padding `var(--s-8) var(--gutter) var(--section)`,
inner `ui.wrap`, `position: relative`. `key={tab}` on the inner list so a filter change remounts it and the
entry animation (below) replays.

**Film rail (≥ 1100 px).** A vertical sprocket strip down the left edge of the wrap for the whole catalogue:
`position: absolute; left: 0; top: 0; bottom: 0; width: 20px`; the `.rail` SVG rotated — use
`background-size: 20px auto; background-repeat: repeat-y` with a 90°-rotated copy of the data URI (swap the
`width`/`height` and the path's x/y; pitch 17 px), `opacity: .7`, masked to fade over its top and bottom 80 px.
Inside it a **playhead**: `position: sticky; top: 50vh; width: 20px; height: 2px; background: var(--teal);
box-shadow: 0 0 14px 2px rgba(69,230,255,.55)` — pure CSS, it rides the rail as the page scrolls.

**Year group** — `<section className={p.year} aria-labelledby="y-2021">`, a 12-col grid,
`scroll-margin-top: calc(var(--nav-h) + 56px + var(--s-5))`, `padding-block: var(--s-7)`,
`border-top: 1px solid var(--line)` (not on the first).
- Head, columns 1–2 (padding-left 36 px to clear the rail), `position: sticky;
  top: calc(var(--nav-h) + 56px + var(--s-6)); align-self: start`:
  - `<h2 id="y-2021" tabIndex={-1}>` the year: `font: var(--t-num) var(--f-display)`, tabular lining figures.
    The undated group's heading is `Undated` in `--t-h3`.
  - fest themes of that year, when any record of the year has `theme` (deduped): `ui.meta`, `--ink-2`, one per
    line, in typographic quotes: `“Digitized Renaissance”`.
  - count for the current filter: `ui.meta`: `7 projects` / `1 project`.
- Body, columns 3–12: a 6-column grid, `gap: var(--s-7) var(--col-gap)`.
  - **Builds** (website / app / portal): `grid-column: span 3` (two per row), frame 16:10.
  - **Lead**: when the group's build count is odd, its first build spans all 6 as a horizontal card: frame in
    columns 1–4 (16:10), copy in 5–6 vertically centred: title in `--t-sub`, meta, summary (`ui.cardLine`,
    4-line clamp), teams line. (2025 → the one site; 2021 and 2019 → lead + pairs; even years → pairs only.)
  - **Films**: `grid-column: span 2` (three per row), frame 16:9, `ui.play`. They follow the builds; when a
    group has both, a `ui.meta` divider row spans all 6 before the films: `Films · 8` with a hairline running
    to the right edge (`display: flex; gap: var(--s-4)` + `::after { flex: 1; height: 1px; background: var(--line) }`).
- Empty groups under a filter are not rendered.

**Card** (`Card.jsx`, one component, `variant = "build" | "lead" | "film"`): `<Link to={href}
state={{ from: location.search }} className={`${ui.card} ${p.card}`}>`
- frame: `ui.frame` + `.ticks` + `.sweep`; `<img src={cover} alt="" loading="lazy" decoding="async">` (the first
  group's first two images `loading="eager"`). No cover → `<Leader>`.
- Rest: `img { filter: saturate(.85) brightness(.9) }`. Hover / focus-visible: `filter: none`, existing
  `scale(1.02)`, frame `border-color: rgba(69,230,255,.45)` and
  `box-shadow: 0 24px 60px -30px rgba(69,230,255,.35)`, ticks in, sweep once. Transitions 240 ms.
- title: `ui.cardTitle` with a trailing arrow `<span aria-hidden>→</span>` at `opacity: 0;
  transform: translateX(-6px)` → `opacity: 1; transform: none` on hover, teal.
- meta: `ui.cardMeta`: `{season} · {kind}` → `APOGEE 2021 · WEBSITE`. Films: `OASIS 2019` only (the play glyph
  and the "Films" divider already say film).
- teams (build and lead only): a second `ui.cardMeta` row, margin-top `--s-2`, labels from `TEAMS` joined by
  ` · `: `FRONTEND · BACKEND · DESIGN`. When a team tab is selected, that team's label is `color: var(--teal)`.
  This is what makes the tabs and the cards one system.
- Film titles: `font: var(--t-strong) var(--f-display)`, 2-line clamp, margin-top `--s-3`.

Entry animation (on mount and on every filter change), per card:
```css
.card { animation: develop 420ms var(--ease-out) both; animation-delay: calc(min(var(--i), 10) * 28ms); }
@keyframes develop { from { opacity: 0; transform: translateY(10px); filter: brightness(1.6) saturate(0); } }
```
`--i` = the card's index inside its year group. Groups below the fold: no scroll-triggered reveal (41 cards
with GSAP triggers is waste) — the CSS animation plays at mount only; that is enough.

### 5.4 Copy on the list page (all of it)

`Projects` · the computed counts line · tab labels with counts · year numerals · theme names · `N projects` ·
`Films · N` · card titles and meta. No lede, no hints.

---

## 6. Detail page — `/projects/:name`

One `<article>`; sections in this order, each omitted when its data is absent. Two head variants: **build**
(website / app / portal) and **film**.

### 6.0 Crumb bar
`ui.wrap`, `display: flex; justify-content: space-between; align-items: center`, padding-top `--s-6`, margin-bottom
`--s-6`.
- left: `<Link className={ui.link}>← Projects</Link>` to `P("/projects") + (location.state?.from ?? "")`.
- right: `ui.meta` `07 / 41` (i + 1, zero-padded, of `catalog.length`), then two 40 × 40 px icon links `←` `→`
  to the previous / next entry in `catalog` (wrapping), `aria-label="Previous project: {title}"` /
  `"Next project: {title}"`, border `1px solid var(--line-2)`, radius `--radius`, hover border + arrow teal.

### 6.1 Head — build
12-col grid, `align-items: start`, `data-light="72% 36% 36vw"` on the article.
- **Left, columns 1–5:**
  - kicker `ui.meta`: `APOGEE 2021 · WEBSITE` (season · kind).
  - `<h1>` title: `font: var(--t-h2) var(--f-display)` (not `--t-h1`: titles run to 29 characters),
    `max-width: 14ch`, `text-wrap: balance`, margin-top `--s-3`. Keeps the shell's focus-on-navigation behaviour
    (it is still the page's `h1`).
  - subtitle (2 records): `ui.lede`, margin-top `--s-3`.
  - **Ledger** `<dl>`, margin-top `--s-7`, rows of `grid-template-columns: 7rem minmax(0, 1fr)`,
    `padding: var(--s-3) 0; border-top: 1px solid var(--line)` (last row also `border-bottom`). `dt` = `ui.meta`;
    `dd` = `font: var(--t-strong) var(--f-sans); margin: 0`. Rows, each only if it has a value:
    | dt | dd |
    |---|---|
    | Fest | `r.fest` |
    | Released | `r.date ?? r.year` |
    | Type | kind label |
    | Theme | `“{r.theme}”` |
    | Teams | team labels, each a `ui.link`-coloured inline link (no caps: plain `--t-strong`, underline on hover) to `P("/team") + "?v=" + id`, separated by `, ` |
  - CTA, margin-top `--s-6`: `<a className={`${ui.btn} ${ui.btnPrimary}`} target="_blank" rel="noreferrer noopener">`
    `{out.label} ↗` (e.g. `bits-apogee.org ↗`, `Google Play ↗`). No `out` → no button.
- **Right, columns 6–12: the gate.** `ui.frame` + `.ticks` (always on), `aspect-ratio: 16 / 10`,
  `border-color: var(--line-2)`, the same teal under-glow as the hero gate, `img` `object-position: top center`,
  `loading="eager" fetchpriority="high"`, `alt="{title}"`. No cover → `<Leader>`. Sticky while the left column
  is taller: `position: sticky; top: calc(var(--nav-h) + var(--s-5))`.

### 6.2 Head — film
- The player first, columns 2–11 (centred, `max-width: 1120px`), inside the gate with rails: `padding: 26px 0`,
  `.rail` top and bottom exactly as the list hero. Frame 16:9, `.ticks` on.
  - **Facade, not an iframe**: the local cover (`object-fit: cover`), scanlines, and a centred play button —
    `<button>` 72 × 72 px, circle, `border: 1px solid rgba(242,245,247,.85)`, `background: rgba(5,5,6,.35)`,
    `backdrop-filter: blur(4px)`, a 16 px triangle; hover: border and triangle teal, `scale(1.06)`.
    `aria-label="Play {title}"`. On click replace the facade with
    `<iframe src="https://www.youtube-nocookie.com/embed/{id}?autoplay=1&rel=0" allow="accelerometer; autoplay;
    encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={title}>` and focus it.
  - No `youtubeId` (3 films): `<Leader>` in the frame, no button, and under the frame one `ui.meta` line:
    `Not online`.
- Under it, a 12-col row, margin-top `--s-7`: kicker + `h1` (as above) in columns 1–6; the ledger in 8–12 (Fest,
  Released, Type = Film, Teams = Video) with the CTA `YouTube ↗` under it.

### 6.3 The project (builds with `description`)
`ui.sec`-style block, `border-top: 1px solid var(--line)`, `padding-top: var(--s-8); margin-top: var(--s-8)`.
12-col grid.
- columns 1–7: `<h2 className={ui.meta}>The project</h2>` (a mono label, not a display heading), then the
  description in `ui.prose` with `max-width: 40rem`. Split rule (deterministic, no rewriting): if longer than
  520 characters, break into two `<p>` at the sentence end (`. ` followed by a capital) nearest the midpoint.
- columns 9–12, the fest aside (when `r.fest !== "Campus"`): `ui.panel`, `h3` = fest name in `--t-h3`, the fest
  blurb from `fests[]` (not `festContext`, so wording is identical everywhere) in `ui.small` `--ink-2`,
  6-line clamp, then `ui.link` `{hostname} ↗` to `fest.website`.
- A record with no description (AIC '19, all films): the whole section is omitted — no placeholder text.

### 6.4 Screens (builds with `mockup`, `page` or `mobile`)
Label `<h2 className={ui.meta}>Screens</h2>`. `Screens.jsx`.

1. **Spread** (if `mockup`): full wrap width, `ui.frame` with `aspect-ratio: 16 / 9`, `object-fit: cover`,
   `loading="lazy"`. (Mockups are opaque collages of mixed aspect; the 16:9 crop suits all 18.)
2. **Windows**, margin-top `--col-gap`, a 12-col grid, `align-items: start`:
   - Desktop window (if `page`): columns 1–8 when a phone window exists, else columns 3–10.
   - Phone window (if `mobile`): columns 10–12 (`max-width: 300px; justify-self: end`) when a desktop window
     exists, else centred `width: 300px`.
   - A window is a `<button type="button" data-cursor="lock">` (opens the lightbox;
     `aria-label="Open the full desktop page"` / `"…phone page"`):
     - bar: 30 px, `background: var(--bg-2)`, `border-bottom: 1px solid var(--line)`, padding-inline `--s-3`,
       three 6 px dots (`--line-2`) left, `ui.meta` label right: `Desktop` / `Phone`.
     - viewport: `overflow: hidden`, desktop `aspect-ratio: 16 / 10`, phone `aspect-ratio: 9 / 18`; the image is
       `width: 100%; height: auto; display: block`, top-aligned, `loading="lazy" decoding="async"`.
     - **Pan**: on `load`, measure `travel = img.clientHeight - viewport.clientHeight`. If `travel > 24`, set
       `--travel: {travel}px` and `--dur: {clamp(travel / 140, 2, 22)}s`. Hover or focus-visible:
       `transform: translateY(calc(-1 * var(--travel)))` with `transition: transform var(--dur) linear`;
       leave: back to 0 over 600 ms `var(--ease-out)`. A 48 px bottom fade (`linear-gradient(to top,
       var(--bg), transparent)`) shows only when `travel > 24` and hides while panning.
     - frame hover: border `rgba(69,230,255,.45)`, ticks in.
3. Phones / coarse pointers / reduced motion: no pan; the fade stays as the "there is more" cue; tap opens the
   lightbox.

**Lightbox** (`Lightbox.jsx`): a native `<dialog>` opened with `showModal()`.
`width: 100vw; height: 100dvh; max-width: none; max-height: none; margin: 0; padding: 0; border: 0;
background: rgba(5,5,6,.94)`; `::backdrop { background: transparent }`. Inside: a scroller
(`overflow-y: auto; height: 100%; overscroll-behavior: contain; padding: var(--s-8) var(--gutter)`) with the
image centred at `width: min(100%, 960px)` (desktop) / `min(100%, 390px)` (phone), `height: auto`, 1 px
`--line-2` border. Fixed top-right close button (`ui.btn`, label `Close`, `autoFocus`). Esc and a click on the
backdrop area close it; focus returns to the window button (native). While open set
`document.documentElement.style.overflow = "hidden"`, restore on close. One dialog instance, `src` swapped.

### 6.5 Teams
Label `<h2 className={ui.meta}>Built by</h2>`. One row per `r.verticals` entry, in `TEAMS` order, each a
`<Link to={P("/team") + "?v=" + id}>` laid out as a 12-col grid with `border-top: 1px solid var(--line)`,
`padding: var(--s-5) 0`:
- columns 1–3: team `name` from `verticals[]` (`Front-End Team`) in `--t-h3`.
- columns 4–10: its verbatim `description`, `ui.small`, `--ink-2`, `max-width: 44rem`.
- columns 11–12, right-aligned: `ui.meta` `{n} on the roster →` (n = `team.filter(m => m.vertical === id).length`).
Hover / focus: name and arrow teal, a 2 px teal bar grows from the left edge of the top border
(`scaleX(0 → 1)`, 320 ms). This is the only "who" the data supports; there are no per-project credits — do not
label it "Credits".
`apogee-25-website`'s teams are marked "inferred" in the data source; show them like the others.

### 6.6 Same season
Entries with the same `fest` and `year`, excluding this one, catalogue order, max 6. If none (e.g. Campus has
two, Apogee '25 has none): the section is omitted.
Label `<h2 className={ui.meta}>Also from {season}</h2>`. A grid of the list page's **film-size** card
(`variant="film"` sizing for every kind: frame 16:9, strong title, meta = kind), 4 per row at ≥ 1100, 3 at
760–1099, 2 on phones; films keep `ui.play`.

### 6.7 Next / previous
Full-bleed band, `border-top: 1px solid var(--line)`, two halves (`grid-template-columns: 1fr 1fr`), each a
`<Link>`, `min-height: 220px`, `padding: var(--s-7) var(--gutter)`, `position: relative; overflow: hidden`:
- background: the neighbour's cover, `position: absolute; inset: 0; object-fit: cover; opacity: .16;
  filter: saturate(.6)`, `loading="lazy"`; hover / focus: `opacity: .38; filter: none; transform: scale(1.03)`
  (600 ms). No cover → nothing behind.
- content (above): `ui.meta` `Previous` / `Next`; title in `--t-sub`; `ui.cardMeta` season · kind. The next half
  is right-aligned. A 1 px `--line` divider between halves.
Order = `catalog`, wrapping at both ends.

### 6.8 Not found
Keep the current block (`We couldn't find that project.` + `All projects →`).

### 6.9 Copy on the detail page (all of it)
`← Projects`, counter, kicker, title, subtitle, ledger keys (Fest, Released, Type, Theme, Teams), CTA label,
`The project`, the fest name + blurb + host, `Screens`, `Desktop`, `Phone`, `Built by`, `{n} on the roster →`,
`Also from {season}`, `Previous`, `Next`, `Not online`, `Close`. Nothing else.

---

## 7. Responsive

| | ≥ 1100 (1440 reference) | 760–1099 (1024) | ≤ 759 (390) |
|---|---|---|---|
| List hero | h1 + caption cols 1–5, gate cols 6–12 | same split 5 / 7; summary in the caption hidden | stacked: h1, counts line (wraps to 2 lines), gate full width (rails 18 px), caption under it, pips left-aligned |
| Console | tabs left, year jumps right | tabs only | tabs only, horizontally scrollable (existing `ui.tabs` mask), bar height 52; indicator still slides; selected tab `scrollIntoView({ inline: "center" })` |
| Rail + playhead | shown | hidden | hidden |
| Year head | sticky in cols 1–2 | a row above the body: year, themes, count on one baseline (`display: flex; gap: var(--s-5); align-items: baseline`), not sticky | same row; themes wrap under |
| Year body | cols 3–12, 6-col grid | full width, 6-col grid | full width |
| Builds | 2 per row; lead = frame 4 + copy 2 | 2 per row; lead = frame 3.5 + copy 2.5 (`grid-template-columns: 7fr 5fr`) | 1 per row; no lead variant (plain build card, summary hidden) |
| Films | 3 per row | 3 per row | 2 per row, gap `--s-4`, title `--t-small` 600, 2-line clamp |
| Detail head (build) | text cols 1–5, gate 6–12 sticky | text 1–6, gate 7–12, not sticky | stacked: crumb, **gate first**, kicker, h1, ledger, CTA full width |
| Detail head (film) | player cols 2–11 | player full width | player full bleed to the gutters, rails 18 px; h1 then ledger stacked |
| The project | copy 1–7, fest aside 9–12 | copy 1–7, aside 8–12 | stacked, aside after copy |
| Screens | spread; desktop 1–8 + phone 10–12 | same | spread; desktop window full width; phone window `width: 62%` centred under it |
| Teams rows | 3 / 7 / 2 columns | name 1–4, description 5–12, roster link under the description | stacked: name, description, link |
| Same season | 4 per row | 3 | 2 |
| Next / previous | two halves | two halves | stacked, `min-height: 140px`, both left-aligned |

Expected phone length of the list: about 9 000 px (from 13 952) because films go two-up.
At 390 the gate is 350 px wide → 197 px tall; hero stays inside one screen with the console bar visible below.
No element may cause horizontal overflow at 390 (`document.documentElement.scrollWidth === 390`).

---

## 8. Keyboard, focus, screen readers

- Tab order follows the visual order: gate link → pips → tabs (one stop, arrows inside) → year jumps → cards.
- Tabs: proper `tablist` / `tab` / `tabpanel` with roving tabindex (§5.2).
- Every card, window and row is a single focusable element; the variant's focus ring (2 px teal, offset 3 px)
  must be visible on all of them — no `overflow: hidden` ancestor may clip it (give grids `padding: 4px;
  margin: -4px` if needed).
- Focus triggers the same visuals as hover everywhere (`:focus-visible` beside every `:hover`), including the
  screenshot pan.
- Detail page shortcuts: `←` / `→` go to the previous / next project when no dialog is open, the event target is
  not an input, button, iframe or inside `[role="tablist"]`, and no modifier key is held.
- Gate auto-advance pauses on focus within; the caption is `aria-live="off"`; each pip has an accessible name.
- Lightbox: native dialog focus trap, Esc closes, focus returns to the opener.
- Decorative layers (`Leader`, rails, ticks, scanlines, playhead, background stills in next / previous) are
  `aria-hidden` or pseudo-elements. Card images keep `alt=""` (the title is the link text); the detail gate
  image has `alt={title}`.
- Headings: list `h1` Projects, `h2` per year; detail `h1` title, `h2` for each section label, `h3` fest name.

## 9. Reduced motion

`@media (prefers-reduced-motion: reduce)` and the `useReducedMotion()` hook:
- Gate: no auto-advance, instant swap, no rail shift, current pip solid.
- Cards: no `develop` animation, no sweep, no image scale; ticks and colour still change (opacity only, 0 ms).
- Indicator moves without transition. Year jumps scroll instantly.
- Leader's radius line static. Playhead stays (it is scroll position, not animation).
- Screenshot windows do not pan. Next / previous stills do not scale.
- `useReveal` already no-ops.

## 10. Performance

- No image processing is available: use the record files as they are. Never reference a base asset
  (`src/assests/**`) or `img.youtube.com` from these two pages.
- List: only the gate's first still and the first two cards are eager; everything else `loading="lazy"
  decoding="async"`. All frames have a CSS `aspect-ratio`, so lazy images cause no layout shift.
- Detail: gate image eager + `fetchpriority="high"`; spread, windows, same-season and next / previous lazy. The
  full-page screenshots (up to 756 KB, 12 291 px tall) load only when the Screens section nears the viewport
  (native lazy) and are reused by the lightbox (same URL, no second request).
- YouTube is never loaded until the play button is pressed (facade). No iframe on the list page.
- No new dependencies. GSAP only through the existing `useReveal` in the two heads; everything else is CSS
  transitions / keyframes, IntersectionObserver (stuck sentinel, year highlight) and one `setInterval`-free
  timer in the gate (drive it from the pip's `animationend`, so the timer and the visible fill cannot drift).
- Animate only `transform`, `opacity`, `filter`; `will-change: transform` only on the panning screenshot while
  hovered. The `filter` on resting card images is static (no per-frame cost).
- `backdrop-filter` only on the 56 px console bar and the 72 px play button.
- Do not import `home/Spotlight` or any WebGL on these pages.

## 11. Acceptance checks

Data
1. `/v/v8/projects` shows 41 cards under All; tab counts read 41 / 17 / 15 / 17 / 22 / 4 and each tab shows
   exactly that many cards.
2. Groups appear in the order 2025, 2024, 2022, 2021, 2020, 2019, 2018, Undated; no empty group is rendered
   under any tab (AppDev shows 2024, 2022, 2019 only).
3. `/projects/5`, `/projects/apogee-21-website` and `/projects/apogee-25-website` all resolve; every card on the
   list and on the home strip links inside the variant.
4. Network panel on both pages: zero requests under `/src/assests/` and zero to `img.youtube.com`; no request to
   `youtube` domains until play is pressed.
5. The three skip-listed images are never requested. `/projects/41` (Apogee '22 Website) shows the spread and no
   windows; `/projects/40` shows the spread only.
6. `/projects/47` (APOGEE'24 App) and `/projects/42` show the leader, not a grey initial; `/projects/42` shows
   `Not online` and no button; `/projects/9` (AIC '19) has no "The project" section and no CTA.
7. The first paragraph on `/projects/5` is the project's own description; the fest blurb is in the aside.
8. No text on either page that is not listed in §5.4 / §6.9.

Design
9. 1440 × 900: the gate, the console bar and the first year numeral are visible without scrolling.
10. Scrolling the list: the console bar sticks under the navbar with the teal top line; the current year in the
    jump list is teal; the playhead rides the rail at mid-viewport.
11. Selecting a team: the indicator slides, cards re-enter with the develop animation, that team's label is teal
    on every build card, the URL carries `?team=…`, and Back from a detail page returns to the same filter.
12. Card hover and keyboard focus look the same: ticks, sweep, full colour, teal border, arrow.
13. Detail (site): hovering a window pans the screenshot to its end and returns on leave; clicking opens the
    lightbox, Esc closes and focus is back on the window.
14. Detail (film): play swaps the facade for the player with sound-on autoplay; rails sit above and below.
15. Next / previous wrap around the catalogue; `←` / `→` keys do the same.

Responsive / a11y / motion
16. 390 × 844: no horizontal scroll on either page; films are two-up; list height under 10 000 px; the detail
    page opens with the gate, then the title.
17. 1024 × 768: year heads are rows above their grids; no sticky year column; nothing overlaps.
18. Keyboard only: every link and control reachable, ring always visible, tabs operate with arrows.
19. `REDUCED=1`: no auto-advance, no entry animation, no pan, no sweep; all content present.
20. No console errors; `oxlint` clean.

Screenshots to take after the build (same tool, `FULL=1`): list at 1440 / 1024 / 390, list with
`?team=video`, `/projects/5`, `/projects/48`, `/projects/47`, `/projects/38` (longest copy) at 1440 and 390 →
`/tmp/v8cdp/PROJ/after/`.

## 12. Open points for the user

- The updated design screenshot did not arrive; this spec was written without it.
- There are no per-project credits, stack or role notes in any data source. "Built by" shows the teams and
  their standing descriptions only. If names per project exist somewhere, the Teams rows are where they go.
- Three Apogee '22 films have no video id or still; they are shown as leader frames marked `Not online`. Say if
  they should be hidden instead (counts would become 38 / 19 films).
- Apogee '25 Website gets an in-site page (it linked straight out before).
