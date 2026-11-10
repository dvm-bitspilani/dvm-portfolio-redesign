# V8 /alumni — round 3: critique and build spec

Design lead's brief for the engineer. Scope: `src/variants/v8/pages/AlumniPage.jsx`, `src/variants/v8/legacy/page/*`, one small addition to `chrome/Cursor.jsx` + `chrome/cursor.module.css`. `legacy/alumniData.js`, `legacy/LegacyCircle.jsx` and everything the home page uses stay untouched.

Before screenshots (this round): `/tmp/v8cdp/ALUM3/before/` — `full-1440.png` (+ `s1440-0…4.png` slices), `full-1024.png`, `full-390.png`, `hover-microsoft-1440.png`, `pinned-simplismart-1440.png`, `stray-cursor-ring-1440.png`, `hover-person-1440.png`, `sheet-amazon-390.png`, `people-390.png`, `people-1024.png`, `companies-1024.png`. User's annotated shot: `/tmp/v8cdp/REF/alumni-page-confusing.png`. Pill reference: `/tmp/v8cdp/REF/original-legacy-people.png`.

The rule for this round: **if a mark needs a legend, the mark goes; the fact is written as a word or a number, or not shown.** Visual richness stays (the swarm mark, the framed wall, the sector panels, the glow, the count-up). What goes is encoding and prose.

---

## 1. Answers to the user's three questions

1. **The bar in each sector panel** (solid teal + dotted + "●15 ○14"): full-time vs intern counts for the sector, on a scale shared across sectors. Nobody came to this page to compare intern ratios by sector. Removed.
2. **Half-dotted vs full rings round the discs**: the solid arc was the full-time share of that company's alumni, the dotted remainder the intern share. A 1.5 px arc round a 40–76 px disc cannot be read as a proportion, and it looks like a loading state. Removed.
3. **The small extra circle beside the hovered Microsoft disc**: not data at all. It is the site's custom cursor — a 24 px ring with a 4 px dot (`chrome/Cursor.jsx`). In a field of ringed discs it reads as one more tiny company. Reproduced in `stray-cursor-ring-1440.png` (the ring sits inside the card at 686, 411). Fixed in §3.9.

---

## 2. Critique

### 2.1 Encodings that need a legend (all removed)

| # | Where | Mark | What it meant | Verdict |
|---|---|---|---|---|
| 1 | Wall plates, map discs | solid / dotted ring | full-time vs intern share | Unreadable, looks like a spinner. The same statistic is repeated six times on the page (rows 1, 2, 5, 6, 9 and the "61 / 26" counter). |
| 2 | Sector panel | two-tone bar + "●15 ○14" | sector full-time / intern, shared scale | A chart inside a caption. Also sums people twice when they worked at two companies (the legend admits it in a `title` tooltip). |
| 3 | Map discs | diameter 40–76 px | number of alumni | Double-encoded with the number badge; makes the grid ragged and logos inconsistent in size. |
| 4 | Map discs | ±8 px jitter | nothing | Decoration that makes the grid look misaligned rather than organic. |
| 5 | Map | thin line snaking through every disc | nothing (reading order) | Lines between logos say "these are connected". They are not. |
| 6 | Map names | bold white vs grey | tier-1 vs the rest | A hidden hierarchy; looks like inconsistent styling. |
| 7 | Cards, people rows | filled dot / hollow ring glyph | full-time / intern | Needs the legend every time. A word does it. |
| 8 | Cards | "3 ALUMNI · ●1 ○2 · 1 NOW", teal "NOW" tag | split, and who is still there | Three codes in one meta line. |
| 9 | Batch rails | "16 of 22 with a public role" + bar + "●16 ○0" | data coverage, split | Exposes research bookkeeping to visitors. |
| 10 | Team heads | "FRONTEND 16 / 29" | with a role / total | Unlabelled fraction. |
| 11 | People rows | 5 px teal dot on a dashed line left of each photo | "hangs on the team's thread" | Reads as a status light (online?). |
| 12 | People rows | 12 px grey "ghost" discs after the role, "+1" | previous companies | Illegible at 12 px; meaning only in a tooltip. |
| 13 | People rows | bare year after the company | year of the latest step | Year of what? Joined, left, graduated? |
| 14 | People legend | "Aa NAME ONLY · NO PUBLIC ROLE YET", "DISC · LATEST COMPANY" | — | A legend explaining a legend. |
| 15 | Readout | "87 with a public role", "61 / 26 full-time / intern, now" | coverage, split | Jargon in 56 px numerals. |

### 2.2 Filler text (all removed)

- Hero kicker "DVM · after BITS" and the lede "Where DVM's alumni work now: 164 people from the 2017–2023 batches, at 121 companies — Amazon, Google, Microsoft and Goldman Sachs among them." The counters and the wall directly below say exactly this.
- Wall: "The names you know", "20 of 121 companies · select one to find it on the map".
- Jump row "Companies ↓ People ↓": a table of contents for two sections, the first of which starts one scroll below.
- Kickers "01 Where they work", "02 Who they are" (they restate the h2).
- Companies lede (the legend in sentence form) and the legend row "121 companies · 9 sectors / Disc size · alumni / Full-time / Intern".
- People lede and legend row.
- Closing band: "Before they left" / "Every one of them shipped something here first."
- Card: sector label above the company name, "MICROSOFT ↗".
- "· 5 now" on plates; "1 alum" under single-person companies.

### 2.3 Noise, hierarchy, consistency

- Three accent treatments compete in every panel: teal bar, teal rings, teal trace. The logos — the actual content — are the dimmest thing in the map.
- The hover card (340 px) lands on top of the neighbouring sector and hides a third of it (`hover-microsoft-1440.png`: AI & Data is covered). The card's leader line threads between discs with gaps — more lines.
- Three different company behaviours: a wall plate scrolls you away to the map on click; a map disc opens a card; a company name in a person row scrolls you to the map. Hover on a plate only tints things elsewhere on the page that are off-screen.
- Hover and pinned look identical; nothing tells you a card is pinned.
- Readout's "164" label is clipped by the Hub button at 1440 (`s1440-0.png`, left).
- Names in the data are inconsistently cased ("HARSHIT SARAF", "NAGASIVA SAITEJA…") and shout from the list.

### 2.4 People section legibility

- A row is four type styles and five glyphs in 56 px of height: name + 11 px LinkedIn icon, 16 px disc + bold company + dot + mono year, grey role + ghost discs. Company names truncate at ~12 characters ("Samsung Sem…", "JPMorgan Cha…", "Jarvis Consulti…") and roles at ~22 ("Software Development En…").
- The 16 px company disc is too small to recognise a logo; it is a grey smudge.
- The name-only people under each cell are fine as an idea (they are alumni; we know nothing more) but need no legend if the list above them is simply "people with a company line".
- The sticky team header works; keep it.

### 2.5 How the sections connect

The linking exists (kin.js) but is invisible because both ends are rarely on screen together, and it is asymmetric: a card lists everyone who was ever at a company, the list below only lights people whose *latest* job is there. Click "Chirag Wadhwa" in Microsoft's card and you land on a row that says Confluent with no mention of Microsoft.

### 2.6 Phone (390)

- 15,431 px tall. The first Companies content appears after ~1,900 px of hero, of which the lede, legend and section intro are ~600.
- The legend wraps to two lines and the bars + rings are even less readable at 44–64 px discs.
- The sheet is good and stays, minus glyphs, "now" tags and the footer link.
- Site-wide, not this page: the transparent nav lets headings scroll under the logo (`pinned-simplismart-1440.png`, top-left). Flag to whoever owns the chrome.

---

## 3. The refined design

### 3.1 What stays (user-approved), what changes

Stays: tier-1 wall at the top; every company grouped in nine sector panels; everyone by batch × team; hover/tap a company to see its people; person ↔ company linking; no inputs; the swarm mark, panel frames, count-up, reveal motion.

Changes, in one paragraph: **one disc, one behaviour, one people language.** Every company disc on the page (wall and map) is the same clean circle with the logo, a name, and — only when more than one person worked there — the plain line "3 alumni". Hover or focus any disc and its people **branch out of it as pills on teal connector lines**, the same language the home page's Alumni section is getting; click pins the branch. An intern is marked with the word "Intern". On touch, the same people open in the existing bottom sheet. Nothing else is encoded.

### 3.2 Page structure (top to bottom)

```
<main>
  header.head      h1 "Alumni" (+ swarm mark, ≥760) · Readout (3 counters) · BigNames wall (20 plates)
  section#v8-alumni-companies   h2 "Companies" · sector map (9 panels)
  section#v8-alumni-people      h2 "People" · team heads (sticky, ≥1280) · 7 batch groups
  section.close    three links
  <Branch />       one fixed overlay layer for the open company's pills (new)
</main>
```

### 3.3 Exact copy (this is all the text on the page besides names, roles and nav)

| Place | Text |
|---|---|
| h1 | `Alumni` |
| Readout keys | `Alumni` (164) · `Companies` (121) · `Batches` (7) — values from `STATS.people`, `STATS.companies`, `BATCHES.length` |
| Under a disc | company name; then `{n} alumni` only when n ≥ 2 |
| h2 | `Companies` / `People` |
| Sector panel head | sector label left, company count right as a bare number (`15`) |
| Team heads | `Frontend` `Design` `Backend` `AppDev` `Video` (labels from `TEAMS`, no numbers) |
| Batch head | the year only (`2018`) |
| Intern tag | `Intern` |
| Earlier line (people rows) | `Earlier: Microsoft, Zenon` |
| Branch overflow pill | `+{n} more` |
| Sheet | company name, `{n} alumni` (n ≥ 2), `Close` |
| Closing links | `The work` (button) · `DVM, year by year →` · `The team now →` |

Delete: both kickers, all three ledes, both legend rows, wall head, jump row (and `SECTIONS`, `jump`, `named` in AlumniPage), closing kicker and headline. No `title` tooltips that explain interactions. Screen-reader labels may be fuller (given per component below).

### 3.4 Hero

- `headIntro`: h1 only (keep `LegacySwarm` right of it at ≥ 760). Remove kicker and lede; `headIntro` min-height: 220 px at ≥ 760 so the mark keeps its room; auto below.
- **Readout moves up**, directly under the h1 (it is now the lede), wall after it. Three counters, same styling and count-up as now. Grid: 3 equal columns at every width (drop the 2 × 2 phone layout); phone numerals scale to `clamp(2rem, 11vw, 3.5rem)`. Add `padding-left` so the first counter's key clears the Hub button: none needed once the row sits higher; verify in the 1440 shot that nothing is under the Hub pill.
- sr labels: `164 alumni`, `121 companies`, `7 batches, 2017 to 2023`.
- **Wall** (`BigNames`): keep the frame and corner brackets; remove `.namesHead`. Padding `16px 16px 8px`. Grid: 10 columns ≥ 900 px, 5 columns 560–899, 4 columns < 560. `ul` aria-label `Best-known companies`. Plates use the shared disc (§3.6) at 56 px (48 px < 760).

### 3.5 Companies map

Keep `placePanels` / `balanceColumns` (3 panel columns ≥ 1100, 2 at 760–1099, 1 below) and the panel box with its brackets. Inside a panel:

- Head: one row, 20 px tall — `h3` label (`ui.meta`, colour `--ink`) left, count (`ui.meta`, `--ink-3`) right. `h3` aria: `Big Tech, 15 companies`. Then the field, 16 px below. **No bar row.**
- Field: a strict grid. No jitter, no trace, uniform 48 px discs. Delete `jitter`, `serpentine`, `discSize`, the right-hanging `shift` for the last row (last row is left-aligned), the `<svg class="trace">`.
- `mapLayout.js` constants: `ROW_H = 108`, `DISC_Y = 30` (disc centre from row top), `HEAD = 44` (13 pad + 20 head + 16 gap − rounding; must equal the real head so the masonry stays exact — measure and adjust), `PAD = 28` unchanged, `MIN_CELL = 96`, `NARROW_CELL = 76` unchanged. `lattice()` returns `{ cols, cellW, rows, height, cells: [{ id, r, c }] }`.
- Resulting grids: 1440 → panel 421, field 389, 4 per row (cell 97); 1024 → 2 panels of ~454, field ~422, 4 per row; 390 → field ~328, 4 per row (cell 82).
- Company order inside a sector: unchanged (alumni desc), so the companies with a count line fill the first row(s).
- Cell anatomy (centred column): disc 48 px at top 6; name at top 60, `0.8125rem/1.25`, `--ink-2`, max 2 lines (keep the `data-long` shrink); count line `{n} alumni` directly under the name, `ui.meta` at `0.625rem`, `--ink-3`, only when n ≥ 2. Delete the `.n` badge, the `data-t1` bold rule.
- Remove `Companies`' legend block, `KeyDiscs`, `KeyRing`, `MAX_ALUMNI`.

### 3.6 The company disc: one component, four states

New `legacy/page/CompanyDisc.jsx`, used by `Plate` (wall, `size` 56/48) and `Star` (map, 48):

```jsx
<button type="button" className={s.co} data-co-key={key} data-open={open||undefined} data-pinned={pinned||undefined}
        aria-expanded={open} aria-label={`${name}, ${n} ${n === 1 ? "alum" : "alumni"}`} …handlers>
  <span className={s.coDisc} data-branch-anchor={key} style={{ "--d": `${size}px` }}>
    <LegacyCircle logo={logo} name={name} size={size} rest="tinted" lit={open || kin} />
  </span>
  <span className={s.coName}>{name}</span>
  {n >= 2 && <span className={`${ui.meta} ${s.coCount}`}>{n} alumni</span>}
</button>
```

`key` = `wall:{tier1 id}` or `map:{company id}` (the same company can appear in both places; the key says which disc the branch grows from). Delete `Ring` and `Glyph` from `PersonCard.jsx` and every `.ring*`, `.glyph`, `.gJob`, `.bar*`, `.split*`, `.n`, `.trace`, `.key*`, `.mapLegend`, `.loomLegend`, `.namesHead`, `.jump*`, `.kicker*` rule that is left unused.

States (identical on wall and map; all transitions 160 ms `var(--ease-out)`):

| State | Disc | Name | Others |
|---|---|---|---|
| Rest | LegacyCircle "tinted", its own 1 px `--line-2` border, keep the lifted plate gradient | `--ink-2` (wall: `--ink`, 0.875rem/600 as now) | — |
| Hover / focus-visible / open | logo full colour (`lit`), border `--teal`, `box-shadow: 0 0 18px rgba(69,230,255,.22)` | `--ink` | every other disc on the page `opacity: .38` |
| Pinned | open look + `outline: 1.5px solid var(--teal); outline-offset: 4px` on `.coDisc` (a full, solid circle — the only ring left on the page, and it means "selected") | `--ink` | same dim |
| Kin (this company is open from its *other* disc, or a person row at this company is hovered) | open look, no outline, no branch | `--ink` | not dimmed |

Dimming is driven by one attribute on `main`: `data-co-open` (set while any company is open). CSS: `[data-co-open] .co:not([data-open]):not([data-kin]) { opacity: .38 }`. The button keeps `focus-visible` as the 2 px teal outline on the whole cell, as now.

### 3.7 People from a company: the Branch (pointer devices)

One store, one layer.

**Store** — extend `kin.js` (or new `openCompany.js` beside it), module-level like the rest:

```js
/** @typedef {{ key: string, ids: string[], name: string, pinned: boolean }} Open */
export const getOpen, setOpen(open | null), onOpen(fn)   // useSyncExternalStore-compatible
```

`setOpen` also calls `setKinBase(open?.ids ?? null)`. `Companies.jsx`'s local `open` state, timers and `ctl` move into a hook `useCompanyCtl()` (same logic, same delays `OPEN_DELAY 120`, `CLOSE_DELAY 260`) that both `Plate` and `Star` call; `requestStar(id)` now resolves to key `map:{id}`.

**Layer** — new `legacy/page/Branch.jsx`, rendered once at the end of `<main>` by AlumniPage, only when `useMedia("(hover: hover) and (pointer: fine) and (min-width: 760px)")`; otherwise the sheet (§3.8) is used. It subscribes to the store; when open it finds `document.querySelector('[data-branch-anchor="KEY"]')` and renders:

```html
<div class="branch" data-branch role="region" aria-label="Alumni at Microsoft" data-side="right|left" data-cursor="dot">
  <svg class="branchLines" aria-hidden="true"> <path/> × n </svg>
  <ul class="pills"> <li><button class="pill" data-slug>…</button></li> × n </ul>
</div>
```

People: `companyPeople(ids)` for a map disc, `t.people` for a wall plate (already merged for Google / Samsung). Order as given. If more than 8, show the first 7 and a last, non-interactive pill `+{n} more`.

**Pill**: `height: 30px; padding: 0 12px 0 4px; gap: 8px; border-radius: 15px; border: 1px solid rgba(255,255,255,.22); background: rgba(10,12,14,.92); backdrop-filter: blur(6px); font: 500 0.8125rem/1 var(--f-sans); color: var(--ink); white-space: nowrap; max-width: 280px;` Contents: photo 22 × 22 circle (`object-fit: cover; object-position: 50% 20%`; initial fallback as `Photo` does), the name (ellipsis past the max width), then for `kind === "intern"` the tag (§3.10). Hover / focus: `border-color: var(--teal); background: rgba(69,230,255,.08)`. Click: `requestPerson(slug)` (scrolls to them in People, pulses them — existing behaviour). aria-label: `{name}, {batch} {team}{, intern}. Show in People`.

**Geometry** (viewport coordinates; the layer is `position: fixed; inset: 0; pointer-events: none; z-index` just below the nav; pills and the hit bridge are `pointer-events: auto`). Let `a` = the anchor's rect, `cx, cy` its centre, `r = a.width / 2`, `n` pills, `PH = 30`, `PG = 6`, `H = n·PH + (n−1)·PG`.

1. Side: right if `a.right + 48 + 280 ≤ vw − 16`, else left.
2. Column top: `top = clamp(cy − H/2, 84, vh − 16 − H)`. Pill i's centre line: `y_i = top + i·(PH+PG) + PH/2`.
3. Pill edge: right side, pills are left-aligned at `px = a.right + 48`; left side, right-aligned at `px = a.left − 48`.
4. Connector i (the reference's elbow): elbow point `E = (a.right + 22, y_i)` (left: `a.left − 22`). Start `S` = the point on the disc's edge towards E: `S = C + (r + 2)·unit(E − C)`. Path: `M S L E H px`. `stroke: var(--teal); stroke-width: 1; fill: none; opacity: .85; stroke-linejoin: round`. No dots, no arrowheads.
5. Hit bridge: an invisible `pointer-events: auto` rect from the disc's edge to `px`, spanning `top … top + H`, so the pointer can travel from disc to pills without closing an unpinned branch. Entering the bridge or a pill cancels the close timer (as `cardEnter` does today).
6. Recompute on scroll and resize in one rAF (reuse the existing `place()` structure). If the anchor leaves the viewport (`a.bottom < 84 || a.top > vh`) the layer hides (`data-away`) but the company stays open, so its people stay lit in People.

**Behaviour** (same as today's card, restated so nothing is guessed):

- Pointer enters a disc: open after 120 ms unless something is pinned. Leaves disc/bridge/pills: close after 260 ms unless pinned.
- Click a disc: pin it (replaces any other pin). Click the pinned disc again, press Escape, or press anywhere outside the disc and the branch: close. A pinned company ignores hovers on other discs (they still get their hover look? No — while something is pinned, other discs show hover on the *name colour only* and do not undim; this keeps the pinned state unambiguous).
- Keyboard: focus opens (unpinned), Enter/Space pins, Tab moves from the disc into its pills (render the layer's `<ul>` contents in DOM order right after the anchor's button via `aria-owns={branchId}` on the button's `<li>`, or move focus programmatically on Tab from a pinned disc; either is acceptable, pills must be reachable and Escape returns focus to the disc).
- `requestStar(id)` (from a person row): scroll the map disc to the viewport centre (existing 650 ms wait), then pin `map:{id}`.

**Motion**: connectors draw with `pathLength=1; stroke-dasharray: 1; stroke-dashoffset: 1 → 0`, 220 ms `--ease-out`, staggered 30 ms per pill; each pill fades in and slides 6 px from the disc's side over 180 ms, starting 90 ms after its line. Close: whole layer fades 120 ms. Switching between discs while unpinned: no close animation, the new branch draws immediately. `prefers-reduced-motion`: no draw, no slide, opacity only (80 ms).

**Coherence with the home page**: the pill and connector recipe above is meant to be the same one the home Alumni section uses (white-bordered pill on near-black, 1 px teal elbow line from the disc). Put the two rules (`.pill`, `.branchLines path`) in a shared file, `legacy/branch.module.css`, and tell the home engineer; if their version lands first, import theirs and only keep the photo and the Intern tag as this page's additions.

### 3.8 Touch and < 760 px: the sheet

Keep `PeopleCard`'s sheet branch (portal, scrim, Close, focus handling) for `!(hover: hover and pointer: fine) || width < 760`. Tap a disc → sheet. Simplify its content:

- Head: disc 40, company name (`ui.strong`), `{n} alumni` under it when n ≥ 2, `× Close` right. No sector label, no split, no "now".
- Rows: the whole row is one button (→ `requestPerson`, closing the sheet first): photo 32 × 42, name, `{batch} · {team}` (meta), role (small, one line, ellipsis), and the Intern tag at the row's right edge when `kind === "intern"`. No LinkedIn icon, no "↓", no year, no "now" tag, no footer link.
- Delete the desktop card (`.card` fixed variant, `.leader`, its placement effect) — the Branch replaces it.

### 3.9 The stray circle: cursor "dot" mode

In `chrome/Cursor.jsx` `resolve()`, before the `const hit = t.closest(TARGET)` line:

```js
if (t.closest('[data-cursor="dot"]')) { setLock(null); setState("dot"); return; }
```

In `cursor.module.css`: `.cursor[data-state="dot"] .shape { opacity: 0; }` and `.cursor[data-state="dot"] .dot::before { background: var(--teal); }` (match the existing dot rule's selector shape). Add `data-cursor="dot"` to the wall (`.names`), the map (`.map`) and the Branch layer. Inside those regions the pointer is the 4 px dot only; the disc's own hover state is the affordance. Document the new intent in the header comment of Cursor.jsx. Nothing else on the site changes.

### 3.10 The Intern tag (the only status mark on the page)

`.tag`: `display: inline-block; padding: 1px 5px 0; border: 1px solid var(--line-2); border-radius: 3px; font: 500 0.5625rem/1.5 var(--f-mono); letter-spacing: .08em; text-transform: uppercase; color: var(--ink-2); white-space: nowrap; flex: none;` Text `Intern`. Neutral, not teal. Shown where a person's relation to the company in question is an internship: pills and sheet rows use `CompanyPerson.kind`; People rows use `latest.kind`. Full-time is the unmarked default. No screen-reader extras needed; it is text.

### 3.11 People

Keep `roster.js` (drop `MAX_WITH_ROLE`), the loom at ≥ 1280 (5 lanes), team blocks below (2 columns 760–1279, 1 column < 760), the sticky team heads, the per-batch reveal, `requestPerson` pulse.

- Remove `Legend`, the rail's count / bar / split, numbers in `ThreadHeads` and `cellHead`.
- **Batch head**: the year (existing `.railYear`) on a 1 px `--line` rule. Nothing right of it.
- **Lanes**: `border-left: 1px solid var(--line)` (solid, not dashed teal); delete `.bead::before` (the dot).
- **Person row** (`Bead`), grid `32px 1fr`, gap 12, `padding: 6px`, rows 10 px apart:
  1. Name — `600 0.9375rem/1.25`, `--ink`; if `linkedin`, the name is the link with the icon at 13 px, `--ink-3`, teal on hover. Display through `personName()` (below). One line, ellipsis.
  2. Company chip — a button: `LegacyCircle` 20 px (tinted) + company name `500 0.8125rem`, `--ink-2`; then the Intern tag if `latest.kind === "intern"`. The name may wrap to a second line instead of truncating (`min-width: 0; overflow-wrap: anywhere`), the tag stays on the first line's baseline at the right of the name. Hover/focus on the chip: name `--ink`, underline 1 px `--line-2`, disc lit. Click: `requestStar(latest.companyId)`. aria-label: `{company}, show in Companies`.
  3. Role — `ui.small` at `0.8125rem`, `--ink-3`, up to 2 lines (`line-clamp: 2`), no `title`.
  4. Only when `previousCompanies(p).length`: `Earlier: A, B, C` — `0.75rem/1.35`, `--ink-3`, one line with ellipsis, up to 3 names then `+n`. Plain text. Hidden below 760 px.
  No year, no glyph, no ghost discs.
- **Name-only people** (`quiet`): unchanged placement (under the rows, after a 1 px `--line` rule — solid, replace the dotted one), `0.8125rem`, `--ink-3`, link to LinkedIn when present. Through `personName()` too.
- **Linking attributes**: every row and quiet name of a person with history carries `data-cos="{all company ids in history, space-separated}"`; kin applies with `[data-cos~="id"]` instead of `[data-co="id"]`, so everyone a company's branch lists is lit below, not only those there now. Hovering a row still calls `setKinHover(latest.companyId)`.
- **Lit row** (`data-kin`) and **found row** (`data-found`): keep the existing floor tint; add `box-shadow: inset 2px 0 0 var(--teal)` so a lit row is findable at a glance in a 164-person list.
- `format.js`: add `personName(name)` — if the name has no lowercase letter and is longer than 3 characters, title-case it (`"HARSHIT SARAF"` → `"Harshit Saraf"`); otherwise return as is. Use everywhere a person's name is printed on this page.

### 3.12 Closing band

One row under a 1 px `--line` rule, `padding-block: var(--s-7)`: the three links, left-aligned, gap `--s-5`, wrapping on phones. `aria-label="More"` on the section; no heading.

### 3.13 Layouts

| | 1440 × 900 | 1024 × 768 | 390 × 844 |
|---|---|---|---|
| Hero | h1 left, swarm right; counters row (3 cols); wall 10 × 2, discs 56 | same; wall 10 × 2 (cell ~90, names wrap to 2 lines) | h1; counters 3 cols; wall 4 × 5, discs 48; no swarm |
| Hero height target | ≤ 760 px (Companies h2 visible at the fold) | ≤ 800 | ≤ 1,150 (was ~1,500) |
| Map | 3 panel columns, 4 discs per row, 48 px | 2 panel columns, 4 per row | 1 column, 4 per row |
| People from a company | Branch | Branch with a mouse; sheet on touch | sheet |
| People | loom, 5 lanes (~243 px) | per batch, team blocks 2-up, team label above each block (label only) | 1-up; name-only people run on, dot-separated (existing) |
| Section spacing | `--section` as now; h2 → content `--s-6` (was lede + legend) | same | same |

---

## 4. Files

| File | Change |
|---|---|
| `pages/AlumniPage.jsx` | Hero reorder and copy removal (§3.3–3.4); h2-only section heads; closing links; mount `<Branch />`; set `data-co-open` on `main` from the store. |
| `legacy/page/CompanyDisc.jsx` | New (§3.6). |
| `legacy/page/Branch.jsx`, `legacy/branch.module.css` | New (§3.7). |
| `legacy/page/kin.js` | Open-company store (`getOpen/setOpen/onOpen`), `useCompanyCtl` hook (or in its own file). |
| `legacy/page/BigNames.jsx` | Plates → `CompanyDisc`; no head; same hover/pin behaviour as the map (no more scroll-to-map on click). |
| `legacy/page/Companies.jsx` | Panels without bar/legend/trace; `Star` → `CompanyDisc`; desktop card removed; sheet simplified. |
| `legacy/page/mapLayout.js` | Strict grid; constants (§3.5); delete jitter / serpentine / discSize. Update the self-check comment. |
| `legacy/page/Alumni.jsx`, `roster.js` | §3.11. |
| `legacy/page/PersonCard.jsx` | Delete `Ring`, `Glyph`; `PersonRow` becomes the sheet row (§3.8); add `Tag`. |
| `legacy/page/Readout.jsx` | Three counters. |
| `legacy/page/format.js` | `personName`. |
| `legacy/page/legacyPage.module.css` | Remove dead rules; add `.co*`, `.tag`, row styles, dimming. |
| `chrome/Cursor.jsx`, `chrome/cursor.module.css` | `dot` intent (§3.9). |

Do not change `alumniData.js` exports or `LegacyCircle` (the home page depends on both).

---

## 5. Acceptance checks

Screenshots into `/tmp/v8cdp/ALUM3/after/` with `/tmp/v8cdp/ALUMPAGE/tools/shot.mjs` at 1440 × 900, 1024 × 768, 390 × 844 (MOBILE=1), full page plus the states below.

1. **No legend anywhere.** The rendered page contains none of: "full-time", "Full-time /", "dotted", "disc", "Disc size", "public role", "sectors", "select one", "Hover or tap", "The names you know", "after BITS", "Where they work", "Who they are", "Before they left", " now" as a tag. (`document.querySelector('main').innerText` check; "Full-time" may still appear as a person's literal role text from the data.)
2. **No dotted or partial strokes.** `main` has no element with `stroke-dasharray` other than the Branch's draw animation, no `border-style: dashed|dotted`. Source grep: `Ring`, `Glyph`, `serpentine`, `jitter`, `barFt`, `barIn`, `KeyRing`, `KeyDiscs`, `ghosts` return nothing under `legacy/page/`.
3. **Uniform discs.** All 121 map discs measure 48 × 48; all 20 wall discs 56 × 56 (48 on phone); disc centres in a panel share exact x per column and y per row (±0.5 px).
4. **Count line** appears only for companies with ≥ 2 alumni and reads `{n} alumni`; hovering such a company shows exactly n pills (or 7 + "+k more").
5. **Hover Microsoft (1440)**: three pills branch to the right on teal elbow lines; "Chirag Wadhwa" and "Chirag Singhal" carry `Intern`, "Anant Verma" does not; no neighbouring sector is covered by a panel; every other disc is at .38 opacity; no cursor ring is visible anywhere inside the wall, map or branch (only the 4 px dot).
6. **Right-edge disc** (e.g. UBS, WorldQuant): the branch opens to the left, fully inside the viewport. **Bottom-of-viewport disc**: the pill column is clamped ≥ 16 px above the bottom edge and ≥ 84 px below the top.
7. **Pinned vs hover** are distinguishable in a still screenshot (outer solid circle on the pinned disc). Click outside, Escape and a second click each close it; Escape returns focus to the disc.
8. **Wall and map behave identically**: hover Amazon on the wall → 6 pills from the wall disc, and Amazon's disc in the map is lit (kin) without a branch.
9. **Pill → person**: clicking a pill scrolls People to that person, pulses the row, and the row (even if their current company is another) is lit with the teal inset bar; their `Earlier:` line names the company the pill came from when it is not their current one.
10. **Person → company**: clicking a row's company chip scrolls to the map disc, pins it, branch opens.
11. **People rows**: no company name is cut with an ellipsis at 1440 (they wrap); no all-caps person names; no dots left of photos; team heads and batch heads contain no digits other than the year.
12. **Phone**: tap a disc → sheet with head (name, count), rows, Close; no glyph dots, no "NOW" tags, no footer link. Page height at 390 ≤ 13,800 px. No horizontal scroll at any width.
13. **Keyboard**: every disc is reachable; focus opens the branch; pills are reachable and activate with Enter; focus rings visible.
14. **Reduced motion**: branch appears without draw/slide; counters render final values.
15. Console: no errors or new warnings; `oxlint` clean; the home page's Alumni section renders exactly as before (it shares `LegacyCircle` and `alumniData`).
