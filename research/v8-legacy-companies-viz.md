# V8 · Hologram — /legacy Companies as a sector map (one round, one engineer)

Spec for one Opus engineer. Everything lives in `src/variants/v8/legacy/page/` (+ one lede string in `pages/LegacyPage.jsx`). No new packages, no installs, no downloads. Don't run vercel, don't commit; the user deploys after review. Back up `src/variants/v8/legacy/page/` and `pages/LegacyPage.jsx` to `/tmp/v8-backup-companies-<stamp>/` before the first edit.

Another engineer is rebuilding the **home** Legacy section right now (`legacy/*` outside `page/`, `home/*`, research/v8-legacy-nn.md) and runs a dev server on **port 5293**. Don't touch those files; start your own server (`npx vite --port 5297`).

Screenshots: `node /tmp/v8cdp/cdp.mjs <url> <out.png> <waitMs> [jsExpr]` (env `VW VH DPR WHEEL HOVER`, see its header). Save to `/tmp/v8cdp/F6/`; delete `/tmp/v8cdp/prof-*` you create and kill any Chrome you started. What is being replaced: `/tmp/v8cdp/TB/b2-list.png`, `b2-open.png`, `b2-tier1.png`, `b4-m-companies.png`.

---

## 0. What the user said, and what this round does

Verbatim, about the Companies section's filter / sort / show bar: **"remove this and find a creative way to depict info in the companies page as well. it shouldn't be searchable, but info should be visible in a understandable creative way."** "As well" = like the home, which is becoming a neural network (teams → alumni → 20 tier-1 logos).

Today (`b2-list.png`): a search box, SORT and SHOW chips, then 121 identical 56 px rows in three columns. It is a table. It answers "is X here?" (search) — which the user does not want — and nothing else at a glance: no shape, no grouping, no sense of where DVM people go.

This round replaces the controls **and** the list with one picture: a **sector map**. The 121 companies are grouped into **9 sectors** (Big Tech, AI & Data, Banks & Trading, …), each sector a region on the hologram floor with a mono caption and its own numbers (companies · alumni · full-time/intern bar). Inside a sector every company is a **star**: its logo disc, sized by how many alumni went there (Amazon's 72 px against a 36 px one-alum startup), ringed by its full-time / intern split (solid arc = full-time, dotted arc = intern), named underneath, and joined to its neighbours by a faint **trace** — a constellation line that snakes through the sector. Hover / focus / tap a star → the people who were there, in the card we already have (`PersonRow` list + site link). Nothing is searchable, nothing is filtered: all 121 are always on the floor.

At a glance it answers the three questions: **which are the big names** (size + the dimmed real logos), **which sectors** (nine captioned regions, the bar in each caption), **interns vs full-time** (the ring on every star, the bar on every sector). Everything else about the page stays: head, counters, jump row, Alumni directory, Year by year.

Kept and reused: `alumniData.js` (untouched), `LegacyCircle` (`rest="tinted"`), `PersonRow` / `Glyph` / `Photo` / `LinkedIn` from `page/PersonCard.jsx` (`Chips` stays — `Alumni.jsx` uses it), `roleOf`, the `People` block of `Companies.jsx` (rows + `Site ↗`), `useMedia` / `useReducedMotion` (`lib/hooks`), the tokens in `v8.module.css`.

---

## 1. Sectors — `legacy/page/sectors.js` (new, data only)

One table, every one of the 121 company ids in `COMPANIES` assigned exactly once (verified against `alumni.json` on 2026-11-09: 0 missing, 0 duplicates, 0 unknown). A company id that is not in the table goes to `software` with one `console.warn` in dev, so a research re-run can never blank the map.

```js
// /legacy · Companies: the nine sectors of the sector map (research/v8-legacy-companies-viz.md §1).
// Order = the order the map places them (alumni desc, ties by companies desc). Every id in
// COMPANIES must appear once; an unmapped id lands in "software" (dev-warned).
export const SECTORS = [
  { id: "bigtech",    label: "Big Tech",                 ids: ["amazon","microsoft","google","google-deepmind","meta","oracle","salesforce","uber","walmart","cisco","indeed","mercari","nielsen","media-net","samsung-r-and-d-institute-india"] },
  { id: "ai",         label: "AI & Data",                ids: ["simplismart","unifyapps","eightfold-ai","enkrypt-ai","entelligence-ai","leena-ai","skit-ai","spanda-ai","dodge-ai","interface-ai","iterate-ai","amikus-ai","carscan-ai","cardboard","zenon","generalmind","fibr","sundial","anaconda","elucidata","smartqna","windfall-research","expert-systems-inc"] },
  { id: "finance",    label: "Banks & Trading",          ids: ["goldman-sachs","jpmorgan-chase","credit-suisse","ubs","barclays","american-express","wells-fargo","capital-one","societe-generale","axis-bank","d-e-shaw","alphagrep","graviton-research-capital","worldquant","wex"] },
  { id: "software",   label: "Software & Startups",      ids: ["confluent","postman","launchdarkly","harness","cyberhaven","houseware","reflexis-systems","pepper-content","petasense","detrace","evermorrow-labs","flint","ripplica","radalis","virtuelly","yap-network","cenizas-labs","pixelup-labs","gleebo"] },
  { id: "fintech",    label: "Fintech & Web3",           ids: ["stripe","razorpay","cred","navi","slice","jupiter","simpl","rupeek","upstox","hubblemoney","vegapay","eddy-finance","pyor","polygon-labs","hashlock"] },
  { id: "consumer",   label: "Consumer & Commerce",      ids: ["meesho","nykaa","licious","ola","sharechat","schmooze","firstclub","newton-school","flippy","wander","weswap-mobility"] },
  { id: "hardware",   label: "Hardware, Auto & Energy",  ids: ["amd","texas-instruments","samsung-semiconductor","tenstorrent","ericsson","honda-motorcycle-and-scooter-india","jaguar-land-rover","amplus-solar","hexa-climate","pixxel","mesh-ergonomics"] },
  { id: "research",   label: "Research, Health & Public",ids: ["max-planck-institute-for-biology-tubingen","mila-quebec-ai-institute","bisag-n","c-dac","prashanu-hospital","masth-ultrahive-healthcare","medsupervision"] },
  { id: "consulting", label: "Consulting",               ids: ["bcg","pwc","deloitte","jarvis-technology-and-strategy-consulting","crc-ib"] },
];
```

Also export, computed once from `COMPANIES` (so the numbers are the data's, not the table's):

```js
/** @typedef {{ id, label, companies: Company[], count: number, alumni: number, fullTime: number, intern: number, now: number }} SectorGroup */
export const SECTOR_GROUPS: readonly SectorGroup[]   // SECTORS order; companies in COMPANIES order (ever desc, fullTime desc, name)
export const SECTOR_OF: ReadonlyMap<string, string>   // company id → sector id
```

`alumni` = Σ `c.ever.length`, `fullTime` = Σ `c.fullTime`, `intern` = Σ `c.intern`, `now` = Σ `c.latest.length`. (A person at two companies counts in both — say so in the legend's title: "a person at two companies counts at both".)

Expected numbers (acceptance A1):

| sector | companies | alumni | full-time | intern | now | stars with n ≥ 2 |
|---|---|---|---|---|---|---|
| Big Tech | 15 | 29 | 15 | 14 | 17 | Amazon 6 · Cisco 3 · Microsoft 3 · Samsung R&D 3 · Nielsen 2 · Oracle 2 · Walmart 2 |
| AI & Data | 23 | 29 | 19 | 10 | 16 | Simplismart 5 · UnifyApps 3 |
| Banks & Trading | 15 | 20 | 12 | 8 | 13 | Credit Suisse 3 · Goldman Sachs 2 · JPMorgan Chase 2 · UBS 2 |
| Software & Startups | 19 | 20 | 11 | 9 | 12 | DeTrace 2 |
| Fintech & Web3 | 15 | 17 | 12 | 5 | 9 | Navi 2 · Stripe 2 |
| Consumer & Commerce | 11 | 12 | 5 | 7 | 5 | Schmooze 2 |
| Hardware, Auto & Energy | 11 | 11 | 7 | 4 | 7 | — |
| Research, Health & Public | 7 | 7 | 0 | 7 | 5 | — |
| Consulting | 5 | 5 | 4 | 1 | 3 | — |

Σ companies = 121, Σ alumni = 150 (people × companies).

---

## 2. Layout — `legacy/page/mapLayout.js` (pure, deterministic, ~90 lines)

Three nested things: **panel columns** (sectors balanced into columns), the **lattice** inside each panel (stars on cells), and the **trace** (the polyline through the stars).

### 2.1 Panel columns

`panelCols` = 3 at ≥ 1100 px, 2 at 760–1099, 1 below (`useMedia`, same breakpoints as today). Panels go to columns **greedily by estimated height**, in `SECTORS` order: each sector lands in the currently shortest column (ties → lowest index). Estimated height = `HEAD (64) + rows × ROW_H + PAD (28)`, rows = `ceil(count / latticeCols)`. CSS: `.map { display: grid; grid-template-columns: repeat(var(--cols), minmax(0, 1fr)); column-gap: var(--col-gap); align-items: start }`, each column a `<div class="mapCol">` stacking its panels with `row-gap: var(--col-gap)`.

At 1440 (wrap 1312, 3 columns of 421 px, lattice 4 cols): rows are Big Tech 4 · AI 6 · Banks 4 · Software 5 · Fintech 4 · Consumer 3 · Hardware 3 · Research 2 · Consulting 2 → columns `[Big Tech, Software, Research]`, `[AI, Consumer, Consulting]`, `[Banks, Fintech, Hardware]` = 11 rows each. Balanced to the row; the section is ≈ 1400 px tall (today's three-column list is ≈ 2300).

### 2.2 Lattice (inside one panel)

Measured width `W` of the panel's lattice box (`ResizeObserver` on the panel; initial render uses the breakpoint's nominal width so there is no flash):

```
MIN_CELL = 96
cols   = clamp(3, floor(W / MIN_CELL), 6)        // 1440 → 4 (389 px box); 390 phone → 3 (334 px box); 760 two-up → 3
cellW  = W / cols
ROW_H  = 100                                      // 72 px disc + 2-line label fits
rows   = ceil(n / cols)
i-th company (COMPANIES order within the sector): r = floor(i / cols), c = i % cols
cx     = (c + 0.5) * cellW + jx(id)               // disc centre
cy     = r * ROW_H + 40 + jy(id)                  // disc centre row: 40 px from the row's top
jx(id) = ((hash(id) % 17) - 8)                    // −8 … +8 px
jy(id) = (((hash(id) >> 5) % 13) - 6)             // −6 … +6 px
hash   = s => [...s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7)
lattice height = rows * ROW_H
```

The jitter is what turns a grid into a star field; it is per id, so it never changes between renders or widths. The whole cell is the button's hit area (`cellW × ROW_H`), so the jitter never costs a tap target.

Disc diameter by alumni: `d(n) = min(72, 36 + 8 × (n − 1))` → 1: 36 · 2: 44 · 3: 52 · 5: 68 · 6: 72. Ring radius `d/2 + 4`.

### 2.3 Trace (one polyline per sector)

Through disc centres in **serpentine** order: row 0 left → right, row 1 right → left, … (so segments stay short and the line snakes; the DOM order stays reading order). `<svg class="trace" aria-hidden width=W height=rows*ROW_H>` absolutely behind the stars, `<polyline fill=none stroke=var(--teal) stroke-width=1 stroke-linejoin=round pathLength=1>`. Segments are drawn centre to centre; the discs sit on top and hide the part under them (the disc has `background: var(--bg-2)`, opaque — check `LegacyCircle.module.css` `.circle`: yes).

---

## 3. Visual spec (tokens from `v8.module.css`; px at 1440 × 900, DPR 1)

### 3.1 Legend row (replaces the controls row; `ui.meta`, mono, `--ink-3`)

One line under the section lede, hairline below (`border-bottom: 1px solid var(--line)`, padding-bottom `--s-3`, margin-bottom `--s-6`):

```
121 COMPANIES · 9 SECTORS                              DISC SIZE  ALUMNI   RING  ● FULL-TIME  ◌ INTERN
```

Right part: a 12 px sample disc trio? No — keep it type: `DISC SIZE · ALUMNI`, then the two glyphs we have (`Glyph` full-time = filled dot, intern = ring) with the words. `title` on the row: "A person at two companies counts at both." Below 760 the two halves stack (two lines).

### 3.2 Sector panel

```
┌ corner ticks ───────────────────────────────┐
│ BIG TECH                     15 CO · 29 ALUMNI
│ ▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮░░░░░░░░░░░░░░ ●15 ◌14          ← split bar
│                                                │
│   ( amazon 72 )  (ms 52)  (cisco 52)  (sam 52) │
│    Amazon        Microsoft  Cisco     Samsung  │
│                                       R&D      │
│   …                                            │
└────────────────────────────────────────────────┘
```

- Box: `position: relative; padding: 14px 16px 14px` (lattice box = panel width − 32), `border: 1px solid var(--line)`, `border-radius: var(--radius)`, background `rgba(10, 12, 14, 0.35)` (a shade over the floor, so the region reads as a region). **Corner ticks**: two pseudo-elements, each a 10 × 10 box at two opposite corners with `border-top/left` (resp. `border-bottom/right`) `1px solid rgba(69, 230, 255, 0.55)` — the HUD bracket the hologram chrome uses elsewhere (match `ui.frame` if it already has one; else draw them as described).
- Caption row (`HEAD` 64 px incl. bar): left `h3.mapSector` — `ui.meta` mono, uppercase, `--ink` (not `--ink-3`: it is the map's primary text), letter-spacing `--ls-meta`. Right: `15 CO · 29 ALUMNI` `ui.meta`, `--ink-3`, tabular.
- Split bar (under the caption, 6 px tall, full lattice width): full-time share as a solid `var(--teal)` fill (`box-shadow: 0 0 8px rgba(69,230,255,.25)`), intern share as `repeating-linear-gradient(90deg, rgba(69,230,255,.55) 0 3px, transparent 3px 6px)` (dotted = intern, echoing the ring), the rest of the track `var(--line)`. Right of the bar: `●15 ◌14` with the glyphs, `ui.meta` `--ink-2`. The bar is `role="img" aria-label="15 full-time, 14 intern"`.
- Panel widths: ≥ 1100 three columns (≈ 421 px) · 760–1099 two · < 760 one (358 px at 390).

### 3.3 Star (one company)

Markup, per company, inside `ul.lattice > li.star` (absolute at `left: cx − cellW/2, top: r × ROW_H`, `width: cellW, height: ROW_H`):

```jsx
<li className={s.star} style={{ left, top, width, height, "--d": `${d}px`, "--jx": `${jx}px`, "--jy": `${jy}px` }}>
  <button type="button" className={s.starBtn} aria-expanded={open} aria-controls={open ? pid : undefined}
          aria-label={`${c.name}: ${plural(c.ever.length, "alum", "alumni")}, ${c.fullTime} full-time, ${c.intern} intern`}
          onPointerEnter/Leave onClick onFocus onBlur onKeyDown(Escape)>
    <span className={s.disc}>                       {/* d × d, translated by the jitter */}
      <Ring d={d} fullTime={c.fullTime} intern={c.intern} />   {/* svg, aria-hidden */}
      <LegacyCircle logo={c.logo} name={c.name} size={d} rest="tinted" lit={open} />
      {c.ever.length > 1 && <span className={s.n}>{c.ever.length}</span>}
    </span>
    <span className={s.starName} title={c.fullName ?? c.name}>{c.name}</span>
  </button>
  {open && <People c={c} id={pid} … />}              {/* §4 */}
</li>
```

- `.disc`: centred horizontally in the cell, `top: 40px − d/2`, `transform: translate(var(--jx), var(--jy))`. The label does **not** take the jitter in x (it stays centred in the cell so labels never collide); it takes `--jy` only.
- **Ring** (`Ring.jsx` or inline): `<svg width=d+10 height=d+10>` centred on the disc; `r = d/2 + 4`; circumference `C`. Full-time arc: `<circle stroke=var(--teal) stroke-width=1.5 stroke-dasharray="${C·ft/n} ${C}" transform=rotate(-90)>`; intern arc: a second circle with `stroke-dasharray="2 3"` (dotted) clipped to the remaining share via `pathLength` + `stroke-dashoffset` (simplest: draw the dotted full ring first, then the solid arc on top; the dotted ring shows wherever the solid arc is not). Rest opacity `.55`, hover/open `1`. Pure full-time company = solid ring; pure intern = dotted ring; mixed = both. Research's 7 stars are all dotted — that is the point.
- **Count tag** `.n` (n ≥ 2): `ui.meta` 10 px mono `--ink`, in an 18 px pill `background: var(--bg-2); border: 1px solid var(--line-2)`, at the disc's lower-right (`right: −2px; bottom: −2px`), tabular.
- **Name** `.starName`: `font: var(--t-small) var(--f-sans)` at `0.8125rem`, `--ink-2`, centre, `max-width: cellW − 8`, 2-line clamp (`-webkit-line-clamp: 2`), `margin-top: 6px` from the disc's bottom edge (`top: 40 + d/2 + 6`), hover/open → `--ink`.
- `LegacyCircle rest="tinted"`: the dimmed real logos (home-fan recipe) so Amazon, Goldman and Stripe are recognisable before any hover; monograms for the 31 without a file.
- `.starBtn`: fills the cell, `background: none; border: 0; padding: 0; cursor: pointer; text-align: center`; `:focus-visible` ring `outline: 2px solid var(--teal); outline-offset: −2px; border-radius: var(--radius)`.

### 3.4 Trace

`stroke: var(--teal); stroke-opacity: .16` at rest. Sector hovered or holding the open star: `.42`, 200 ms. Below 760 the same (no hover there; the pinned sector brightens).

### 3.5 Focus / dimming

On `(hover: hover)` and ≥ 760: while a star is hovered or open, the other **sectors'** panels go `opacity: .62` (200 ms) — the active sector stands in the light. Reduced motion keeps the opacity change (it is a state, not motion) but without the transition.

---

## 4. The people card (hover / focus / tap)

Reuse `People` from `Companies.jsx` as is (the `PersonRow` list with role · unit · year · now, then `Site ↗`), wrapped in a card:

```
┌─────────────────────────────────────┐
│ [disc 40, lit]  Amazon               │  name: ui.strong; under it ui.meta:
│                 6 ALUMNI · ●4 ◌2 · 5 NOW · BIG TECH
│ ─────────────────────────────────── │
│ PersonRow × n (today's recipe)       │
│ AMAZON ↗                             │
└─────────────────────────────────────┘
```

- `div.card` `role="region" aria-label="Alumni at Amazon"` (keep the id → `aria-controls`), width **340 px**, `background: rgba(10, 12, 14, 0.94)`, `border: 1px solid var(--line-2)`, `border-radius: var(--radius)`, `box-shadow: 0 24px 60px rgba(0,0,0,.6), 0 0 0 1px rgba(69,230,255,.06)`, `backdrop-filter: blur(12px)`, padding `--s-4`; list `max-height: min(56vh, 480px); overflow: auto`.
- **Position ≥ 760**: `position: fixed`, computed from the disc's `getBoundingClientRect()` at open (and on scroll/resize while open): x = disc right + 14 if `x + 340 ≤ innerWidth − 16`, else disc left − 14 − 340; y = disc top − 12, clamped to `[16, innerHeight − cardH − 16]`. Render it in a portal to `document.body` **but keep it in the `li` for DOM order?** — no: keep it **in the `li` right after the button** (no portal) so Tab flows button → card → next star, and position it `fixed` from there (fixed ignores the parent; the panel has no `transform`, so this works — don't put `will-change`/`transform` on `.panel`/`.mapCol`).
- **Position < 760**: a bottom sheet — `fixed; left: 0; right: 0; bottom: 0; max-height: 72vh; border-radius: 8px 8px 0 0`, slides up 240 ms (`translateY(16px)` → 0, fade), a scrim `rgba(0,0,0,.5)` behind it that closes on tap, a `× Close` button (`ui.meta`, 44 px tap target) at the card's top-right. Body scroll is **not** locked (simpler, no scrollbar jump).
- **States**: `hover` (pointer enters the button → opens after **120 ms**; pointer leaves button and card → closes after **260 ms**; entering the card cancels the close), `pinned` (click / Enter / Space toggles; a pinned card ignores pointer-leave; click outside, Escape, or opening another star unpins), `focus` (keyboard focus on the button opens, like hover; blur to outside the li closes unless pinned). Exactly one card open at a time (one `open` id in state: `{ id, pinned }`).
- Escape inside the card returns focus to the star's button.
- Motion: fade + 6 px rise, 160 ms `--ease-out`; reduced motion: instant.

---

## 5. Motion (entrance)

`IntersectionObserver` on `.map` (once, `threshold: 0.12`) sets `data-in`. Under `data-in` and **not** reduced motion:
- panels: `opacity 0 → 1, translateY(16px) → 0`, 500 ms `--ease-out`, `transition-delay: calc(var(--i) * 70ms)` (`--i` = panel index in `SECTORS` order, 0–8);
- traces: `stroke-dasharray: 1; stroke-dashoffset: 1 → 0` (with `pathLength=1`), 900 ms ease-out, delay `180ms + var(--i) * 70ms`;
- discs: `transform: scale(.82) → 1` on `.disc`, 400 ms, delay `calc(120ms + var(--i) * 70ms + var(--k) * 12ms)` (`--k` = index within the sector, capped 24).
Reduced motion: everything is simply there (`@media (prefers-reduced-motion: reduce)` zeroes every transition in this file; also skip the observer). Hover transitions (ring, name, trace, dimming) 200 ms; none under reduced motion.

---

## 6. Accessibility

- Headings: h2 Companies → **h3 per sector** (`id` for `aria-labelledby` on the panel `<section>`). The page outline becomes h1 Legacy · h2 Companies · h3 × 9 · h2 Alumni · h3 2017…2023 · h2 Year by year.
- The lattice is `<ul aria-label="Companies in Big Tech">`; each star a `<li>` with one `<button aria-expanded aria-controls aria-label="Amazon: 6 alumni, 4 full-time, 2 intern">`. The trace SVG, ring SVG, count tag and LegacyCircle are `aria-hidden`. The split bar is `role="img"` with its label; the caption's numbers are plain text.
- Keyboard: Tab goes sector by sector, star by star in reading order (count desc); focus opens the card; Enter/Space pins; Escape closes and keeps focus on the button; inside the card Tab reaches the LinkedIn links and the site link in order.
- Reading order == DOM order == visual order (reading order, not the serpentine).
- Touch: the whole cell is the target (≥ 96 × 100); a tap pins (no hover state on touch; `pointerType === "touch"` skips the hover timers).
- Contrast: names `--ink-2` on the floor ≥ 7:1; captions `--ink`; `--ink-3` only for secondary counts (same as today's meta).

---

## 7. Files

| file | action |
|---|---|
| `legacy/page/sectors.js` | **new** — §1 table + `SECTOR_GROUPS`, `SECTOR_OF` |
| `legacy/page/mapLayout.js` | **new** — §2 pure functions: `balanceColumns(groups, panelCols, latticeColsOf)`, `lattice(n, W)` → `{ cols, cellW, rows, height, cells: [{ cx, cy, r, c, jx, jy, d }] }`, `serpentine(cells, cols)` → points, `discSize(n)`, `hash(id)` |
| `legacy/page/Companies.jsx` | **rewrite** — the map: legend row, columns of `SectorPanel`, `Star`, `Ring`, `PeopleCard` (keeps today's `People`). Delete `SORTS`, `SHOWS`, the search input, `Chips` usage, `clear`, the empty state, `coGrid` columns |
| `legacy/page/legacyPage.module.css` | remove `.coControls .coSearch .coResult .coGrid .coCol .coItem .coRow(+::before, :focus-visible, :hover) .coOpen .coName .coCount .coSplit .zero` and their media-query copies; keep `.coPeople .coList .coSite .legend .glyph .gJob .person …` (the card uses them; `.coPeople` padding-left → 0 inside the card); add the `.map*`, `.panel*`, `.lattice`, `.star*`, `.disc`, `.ring`, `.n`, `.trace`, `.card*`, `.sheet*`, `.scrim` rules. Expect the file to end ≈ 750–800 lines |
| `legacy/page/PersonCard.jsx`, `format.js`, `Alumni.jsx`, `Readout.jsx` | **unchanged** |
| `pages/LegacyPage.jsx` | **one string**: the Companies lede → **"Every company a DVM alum has worked at, by sector — a disc per company, sized by how many of us went there. Hover one to see who."** Jump row label "Companies" stays. Nothing else |
| `legacy/*` outside `page/`, `home/*` | **not touched** (the other engineer's) |

No change to `alumniData.js`; the map reads `COMPANIES`, `companyPeople`, `STATS.companies` only.

---

## 8. Work items and acceptance (all shots to `/tmp/v8cdp/F6/`, your own dev port)

**A1 · Sectors data.** `sectors.js`. Eval in the browser: `import('/src/variants/v8/legacy/page/sectors.js').then(m => m.SECTOR_GROUPS.map(g => [g.label, g.count, g.alumni, g.fullTime, g.intern, g.now]))` equals §1's table row for row; `SECTOR_OF.size === 121`; no `console.warn`.

**A2 · Layout.** `mapLayout.js` with a 10-line self-check in a comment or a `node` one-off (not committed): `lattice(15, 389)` → `cols 4, rows 4, height 400`; `lattice(23, 334)` → `cols 3, rows 8`; `discSize(6) === 72`, `discSize(1) === 36`; `balanceColumns(SECTOR_GROUPS, 3, () => 4)` → the three columns of §2.1, each 11 rows; same input twice → identical output (deterministic); jitter of `"amazon"` identical across calls.

**A3 · The map at 1440 × 900.** `c1-map.png` (`WHEEL` so the Companies h2 is at y ≈ 80): the legend row, three panel columns, nine captions with numbers and split bars, discs visibly sized (Amazon 72 vs 36), dimmed real logos, dotted / solid rings, traces faint behind the stars, no label collisions, no star crossing a panel edge. `c1-full.png` at `VH=1800` showing all nine panels, columns balanced within one row of each other. Eval: `document.querySelectorAll('li[class*=star]').length === 121`, `[...document.querySelectorAll('h3')].slice(0, 9)` = the nine labels in §1 order, `document.documentElement.scrollWidth === innerWidth`.

**A4 · Hover.** `c2-hover.png` with `HOVER` on the Amazon disc: disc lit (full-colour logo), ring at full opacity, Big Tech's trace brighter, the other eight panels dimmed, the card right of the disc with the header line `6 ALUMNI · ●4 ◌2 · 5 NOW · BIG TECH` and six `PersonRow`s (4 filled, 2 hollow glyphs, five "now" tags) then `AMAZON ↗`. `c2-leave.png`: after moving the pointer to empty floor and waiting 400 ms, no card.

**A5 · Keyboard.** `c3-kb.png`: eval that focuses the first star (`document.querySelector('li[class*=star] button').focus()`) → card open on focus, teal focus ring on the cell; then dispatch `Enter` (pinned), move the pointer elsewhere → card stays; dispatch `Escape` → card closes, `document.activeElement` is the button. Headings eval (§6 outline). Lint clean (`npm run lint` if present, else `npx eslint src/variants/v8/legacy/page`).

**A6 · Phone 390 × 844.** `m1-map.png`: one panel column, 3 lattice columns, legend on two lines, captions and bars intact, names on ≤ 2 lines. `m2-sheet.png`: eval-click Amazon → bottom sheet with the six rows and the `× Close` button, scrim behind; `m3-closed.png` after clicking the scrim. No horizontal scroll.

**A7 · Reduced motion + no JS surprises.** `r1-reduced.png` with `Emulation.setEmulatedMedia` `prefers-reduced-motion: reduce` (add to the cdp call via `jsExpr` if the tool lacks it: the page must look identical at 0 ms wait vs 3 s wait). Console clean on `/v/v8/legacy` across all shots. Delete `/tmp/v8cdp/prof-*`, kill your Chrome.

**A8 · Rest of the page unchanged.** `c4-head.png` (head, counters, jump row) and `c5-alumni.png` (Alumni controls + first batch) pixel-equivalent to `/tmp/v8cdp/TB/b1-head.png` and `b3-list.png` apart from scroll position.

---

## 9. Open calls I made (say if you disagree, don't silently change)

- **Sectors over tiers.** Tier 1 is a home-page notion (the 20 names the home shows); the /legacy map does not mark it — size and real logos carry prominence. No "T1" badge.
- **Serpentine trace** rather than a hub-and-spoke or an MST: it is deterministic, O(n), never crosses itself, and reads as a constellation. If it looks like a snake rather than stars, drop the stroke to `.12` before dropping the idea.
- **Panel columns balanced by rows**, not a treemap: a treemap of 1-alum companies is 104 equal boxes; captions and lattices read better.
- **Card in the li, positioned fixed** (not a portal) for tab order. If a stacking-context ancestor breaks `fixed`, fall back to a portal **and** manage focus manually (focus the card's first row on Enter, return on Escape).
- Research/Health/Public's seven are all interns, which the all-dotted rings show at a glance — that is a real finding, not a bug.
