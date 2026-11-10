# V8 · Hologram — /legacy Alumni as a loom (batches × teams), one round, one engineer

Spec for one Opus engineer. Everything lives in `src/variants/v8/legacy/page/` (+ one lede string in `pages/LegacyPage.jsx`). No new packages, no installs, no downloads. Don't run vercel, don't commit; the user deploys after review. Back up `src/variants/v8/legacy/page/` and `pages/LegacyPage.jsx` to `/tmp/v8-backup-alumni-<stamp>/` before the first edit.

Screenshots: `node /tmp/v8cdp/cdp.mjs <url> <out.png> <waitMs> [jsExpr]` (env `VW VH DPR HOVER`, see its header); start your own server (`npx vite --port 5298 --strictPort`); save to `/tmp/v8cdp/F7/` (the "before" shots are already there: `companies-full.png`, `m-companies.png`; the old Alumni list is `/tmp/v8cdp/TB/b3-list.png`, `b4-m-alumni.png`). Delete `/tmp/v8cdp/prof-*` you create and kill any Chrome you started.

---

## 0. What the user said, and what this round does

About the Alumni search box: **"Remove it."** About the same page's Companies controls, earlier: **"remove this and find a creative way to depict info … it shouldn't be searchable, but info should be visible in a understandable creative way."** Also standing: "refine means tune, never strip"; the 72-node force cloud was rejected as mess; the constellation / network idea is liked when it is clean.

Today (`TB/b3-list.png`): a search box, three chip rows, then 164 identical cards in a 3-column ruled table under sticky year heads. It is 7,469 px tall at 1440 × 900 (the Companies map above it is 1,854) and 18,634 px on a 390 phone. Search is the only way to find anyone; nothing is visible at a glance — not which team went where, not that the 2018 cohort is all full-time and the 2023 cohort all interns.

This round removes **every input** (search, Role / Batch / Team chips, Clear, the empty state) and replaces the card table with one picture: a **loom**. Seven horizontal **rails** (the batches, 2017 → 2023, each a hairline with the year, its counts and a full-time / intern bar — the same bar the sector panels use) crossed by five vertical **threads** (the teams, in `TEAM_ORDER`, captioned once at the top and sticky). Where a rail meets a thread sits that cohort's team: every alum with a published role as a **bead** — photo, name (the LinkedIn link), the disc of their latest company (the same `LegacyCircle` disc that is a star on the map above), role, full-time / intern glyph, year — and under them, quieter, the names of the rest of that team-year. All 164 are on the loom; the 87 with a published role are the beads. A reader finds a person the way they think of them — "2019, AppDev" — two axes, no typing.

The loom talks to the map: hover or focus a bead and their company's star lights on the Companies map above, and so do the other beads at that company; hover a star on the map and its people light on the loom. Two sections, one picture: *where* (the map) and *who* (the loom).

Height at 1440: ≈ 2,500 px (from 7,469). On a phone ≈ 8,000 (from 18,634).

### 0.1 The two directions considered

**A · Cohort panels (people as stars).** One panel per batch, exactly the sector panel's kit: photo discs on a jittered lattice over a serpentine trace, the name + company + role as a three-line label under each disc, a people bar in the caption. Pro: the same component family as the map, visually identical. Con: a photo disc with three lines of text under it needs a ≈ 120 × 150 cell, so 2021's twenty people wrap to three rows anyway; there is no team axis, so finding a person is scanning a cloud of faces; and ≈ 3,400 px tall. It would also make the page two near-identical maps in a row.

**B · The loom (batches × teams) — chosen.** Rows are the cohorts, columns are the teams, cells hold the people as compact beads. Pro: the two axes are the two facts everyone knows about an alum (year, team), so it replaces search honestly; the row bars and the column captions carry the "at a glance" facts (interns rising, AppDev the biggest team, Video with the most unpublished); it is the shortest layout by far; the matrix reads as a chart, not a cloud; and the beads wear the map's discs, which gives the hover link to the map. Con: at < 1280 px the five lanes do not fit, so there is a second layout (team blocks) — specified below.

---

## 1. Data — `legacy/page/roster.js` (new, pure, ~60 lines)

Reads `PEOPLE`, `BATCHES`, `TEAMS`, `previousCompanies` from `alumniData.js` (untouched). Exports:

```js
/**
 * @typedef {{ team: { id: string, label: string }, beads: Person[], quiet: Person[] }} Cell
 *   beads: latest !== null (PEOPLE order: name); quiet: latest === null (PEOPLE order)
 * @typedef {{ batch: number, total: number, withRole: number, fullTime: number, intern: number, cells: Cell[] }} Rail
 *   cells in TEAM_ORDER, one per team, present even when empty; fullTime / intern = kinds of the beads' latest steps
 * @typedef {{ team: { id, label }, total: number, withRole: number }} Thread
 */
export const RAILS: readonly Rail[]        // BATCHES asc
export const THREADS: readonly Thread[]    // TEAM_ORDER
export const MAX_WITH_ROLE: number         // max Rail.withRole — one scale for every rail's bar (= 20)
export const KIN_OF: ReadonlyMap<string, string[]>   // company id → slugs of people whose latest step is there (for the loom's own kin)
```

Expected numbers (acceptance A1; computed 2026-11-09 from `alumni.json` + `immersive/data/team`):

| rail | total | with role | ● full-time | ◌ intern | beads per thread (Frontend · Design · Backend · AppDev · Video) | quiet per thread |
|---|---|---|---|---|---|---|
| 2017 | 1 | 1 | 1 | 0 | 0 · 1 · 0 · 0 · 0 | 0 · 0 · 0 · 0 · 0 |
| 2018 | 22 | 16 | 16 | 0 | 3 · 4 · 5 · 2 · 2 | 2 · 0 · 0 · 2 · 2 |
| 2019 | 24 | 17 | 15 | 2 | 4 · 3 · 3 · 4 · 3 | 2 · 1 · 2 · 0 · 2 |
| 2020 | 26 | 19 | 14 | 5 | 3 · 3 · 5 · 4 · 4 | 1 · 1 · 0 · 2 · 3 |
| 2021 | 29 | 20 | 12 | 8 | 3 · 2 · 4 · 7 · 4 | 1 · 2 · 1 · 1 · 4 |
| 2022 | 31 | 10 | 3 | 7 | 2 · 2 · 1 · 2 · 3 | 3 · 3 · 4 · 6 · 5 |
| 2023 | 31 | 4 | 0 | 4 | 1 · 0 · 1 · 2 · 0 | 4 · 4 · 4 · 7 · 8 |

Threads: Frontend 16 / 29 · Design 15 / 26 · Backend 19 / 30 · AppDev 21 / 39 · Video 16 / 40 (with role / total). Σ beads 87, Σ quiet 77, `MAX_WITH_ROLE` 20. 80 of the 87 beads have a LinkedIn URL; 149 of 164 overall. Every bead has a photo path (the `Photo` fallback still applies on load error).

---

## 2. Kin — `legacy/page/kin.js` (new, ~20 lines) and the map's half

One module-level store so the two sections light each other without a context or a parent re-render:

```js
// /legacy: the company in the light across both sections (hovered / focused bead, or the map's open star).
let kin = null;
const subs = new Set();
export const setKin = (id) => { if (id === kin) return; kin = id; for (const f of subs) f(kin); };
export const onKin = (f) => (subs.add(f), () => subs.delete(f));
export const getKin = () => kin;
```

Both consumers apply it **imperatively** (no React state, no re-render of 121 stars or 87 beads):

- **Companies.jsx** — one `useEffect`: `onKin(id => { clear data-kin on mapRef's [data-kin]; if (id) mapRef.querySelector('[data-star="${CSS.escape(id)}"]')?.setAttribute('data-kin', '') })`. And the reverse: an effect on `open` calls `setKin(open?.id ?? null)` (and `setKin(null)` on unmount). CSS (add next to `.star[data-open]`): `.star[data-kin] .ring { opacity: 1; filter: drop-shadow(0 0 6px rgba(69,230,255,.55)) }`, `.star[data-kin] .starName { color: var(--ink) }`, `.star[data-kin] .disc > span:not(.n) { box-shadow: 0 0 22px rgba(69,230,255,.18) }` — the open look without the card, the dimming or the trace change. No other change to Companies.
- **Alumni.jsx** — the same pattern on the loom root: `[data-co="${id}"]` beads get `data-kin`. A bead sets kin on `pointerenter` (not touch) and `focusin`, clears it on `pointerleave` / `focusout` (to outside the bead). Hover timers: none (it is a highlight, not a card).

---

## 3. Layout

Breakpoints: **≥ 1280 the loom** (five lanes); **760–1279 team blocks** in two columns; **< 760 one column**. (The map uses 1100 / 760; the loom's lanes need ≥ 214 px each, which 1100 cannot give — the `useMedia` queries are `(min-width: 1280px)` and `(min-width: 760px)`.)

### 3.1 The loom (≥ 1280) — widths at 1440 × 900 (wrap 1312)

```
LEGEND ROW   164 ALUMNI · 87 WITH A PUBLISHED ROLE · 7 BATCHES · 5 TEAMS           ● FULL-TIME  ◌ INTERN  ·  DISC · LATEST COMPANY  ·  NAME ONLY · NO PUBLISHED ROLE
──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── hairline
FRONTEND 16/29      DESIGN 15/26        BACKEND 19/30       APPDEV 21/39        VIDEO 16/40          ← thread captions, sticky
2018 ────────────────────────────────────────────────────── 16 OF 22 PUBLISHED  ▮▮▮▮▮▮▮▮▮▮▮▮░░░░ ●16 ◌0   ← rail
┆ [ph] Akshit Patel  ┆ [ph] Anant Verma  ┆ [ph] Abhinav T.   ┆ [ph] Akshat Gupta ┆ [ph] Akshath K.      ← beads (one per person)
┆  ◯ Samsung Semi… ● 2022  …
┆ Mukul Gupta        ┆                   ┆                   ┆ Prarabdh Garg     ┆ …                    ← quiet names
2019 ──────────────────────────────────────────────────────  …
```

- Container `.loom`: `display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); column-gap: var(--col-gap)` (lanes 243 px at 1440, 214 at 1280, 285 at ≥ 1648). Children in DOM order = reading order: the five `.threadHead`s, then per rail: one `.rail` (`grid-column: 1 / -1`) and five `.cell`s.
- **Thread captions** `.threadHead`: `position: sticky; top: var(--nav-h); z-index: 3; padding: 10px 0 10px 14px; border-bottom: 1px solid var(--line)`; text `ui.meta` — the label in `--ink` (`.mapSector`'s weight), then `16 / 29` in `--ink-3` tabular, 8 px apart. A floor like today's `.aGroupHeadIn::before` (`rgba(5,5,6,.9)` + `blur(10px)`, `inset: 0 -12px`, reaching `-var(--nav-h)` up when stuck; `@container scroll-state(stuck: top)` with the `@supports not` fallback — move the rule, don't rewrite it). Each caption's left edge carries the thread's start: `border-left: 1px dashed rgba(69, 230, 255, .28)` on the caption (the thread is brighter where it is named).
- **Rail** `.rail`: `display: flex; align-items: baseline; gap: var(--s-4); margin-top: var(--s-6); padding: 0 0 var(--s-3); border-bottom: 1px solid var(--line-2)`. First rail `margin-top: var(--s-5)`. Left: `h3.railYear` — `font: var(--t-sub) var(--f-display)`, tabular, `--ink` (today's `.aGroupYear`, kept). Right (`margin-left: auto`, `display: flex; align-items: center; gap: var(--s-3)`): `16 OF 22 PUBLISHED` (`ui.meta`, `--ink-3`), the **bar** — reuse `.bar / .barFt / .barIn` exactly (6 px, `--line` track), width **160 px**, `role="img" aria-label="16 full-time, 0 intern"`, scale `withRole / MAX_WITH_ROLE` (2021 fills it; 2017 is 5 % = 8 px, let it be) — then `●16 ◌0` (`.splitNums`, kept). The rail's `aria-labelledby` is the year.
- **Cell** `.cell` (one per team, present even when empty): `position: relative; padding: 10px 8px 14px 14px; border-left: 1px dashed rgba(69, 230, 255, .14)` — the thread. `min-height: 56px` so an empty cell (2017 × 4) still draws its thread for the row's height (grid rows stretch; `align-items: stretch`). Inside: `ul.beads` then `ul.quiet` (either may be empty → not rendered).
- Row heights (≈, 56 px beads + 24 px quiet names): 2017 56 · 2018 280 · 2019 272 · 2020 296 · 2021 416 · 2022 288 · 2023 280 ⇒ ≈ 1,890 + rails 7 × 52 + caption 44 + margins ≈ **2,500 px** for the section body.

### 3.2 A bead (one alum with a published role)

```
┆ ● [photo 32×42]  Shikhar Uttam ⧉                  ← name = LinkedIn link, 600 15px, --ink; the small "in" after it
┆                  ◯ Amazon  ● 2023                 ← latest company disc 16 + name 600 13px --ink-2 · kind glyph · year mono --ink-3
┆                  Software Engineer         ○○     ← role 13px --ink-3, ellipsis; ghost discs = earlier companies (≤ 3)
```

Markup:

```jsx
<li className={s.bead} data-co={l.companyId} data-slug={p.slug}
    onPointerEnter={(e) => e.pointerType !== "touch" && setKin(l.companyId)}
    onPointerLeave={(e) => e.pointerType !== "touch" && setKin(null)}
    onFocus={() => setKin(l.companyId)} onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setKin(null)}>
  <Photo person={p} width={32} className={s.beadPhoto} />
  <div className={s.beadBody}>
    <p className={s.beadName}>
      {p.linkedin
        ? <a href={p.linkedin} target="_blank" rel="noreferrer" aria-label={`${p.name} — LinkedIn`} title={p.name} data-cursor="lock">{p.name}<SocialIcon name="linkedin" size={11} /></a>
        : <span title={p.name}>{p.name}</span>}
    </p>
    <p className={s.beadNow}>
      <LegacyCircle logo={l.company.logo} name={l.company.name} size={16} className={s.beadDisc} />
      <span className={s.beadCo} title={l.company.fullName ?? l.company.name}>{l.company.name}</span>
      <Glyph kind={l.kind} /><span className={ui.srOnly}>({l.kind})</span>
      {l.year != null && <span className={s.beadYear}>{l.year}</span>}
    </p>
    <p className={s.beadRole}>
      <span className={s.beadRoleText} title={roleOf(l)}>{roleOf(l)}</span>
      {prev.length > 0 && (
        <span className={s.ghosts} title={`Previously ${prev.map((c) => c.name).join(", ")}`}>
          {prev.slice(0, 3).map((c) => <LegacyCircle key={c.id} logo={c.logo} name={c.name} size={12} />)}
          {prev.length > 3 && <span className={s.ghostMore}>+{prev.length - 3}</span>}
          <span className={ui.srOnly}>Previously {prev.map((c) => c.name).join(", ")}</span>
        </span>
      )}
    </p>
  </div>
</li>
```

CSS (tokens from `v8.module.css`):

- `.bead`: `position: relative; display: grid; grid-template-columns: 32px minmax(0, 1fr); column-gap: var(--s-3); align-items: start; min-height: 56px; padding: 7px 6px 7px 0; border-radius: var(--radius); transition: background-color 150ms ease`. **The bead on the thread**: `.bead::before { content: ""; position: absolute; left: -17px; top: 28px; width: 5px; height: 5px; border-radius: 50%; background: rgba(69, 230, 255, .55); box-shadow: 0 0 6px rgba(69, 230, 255, .35) }` — a node where the person hangs on the team's thread. `left: −17` = the cell's 14 px padding + 3 px, so the 5 px dot sits centred on the 1 px dashed border; `top: 28` = the bead's 7 px padding + the photo's 2 px margin + half of 42 − half of 5, i.e. level with the photo's middle (check by eye).
- `.beadName`: `margin: 0; font: var(--t-strong) var(--f-sans); font-size: 0.9375rem; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--ink)`. The `a` inherits colour, no underline; `svg` 11 px inline, `margin-left: 5px; vertical-align: -1px; color: var(--ink-3); transition: color 150ms`; `a:hover svg, a:focus-visible svg { color: var(--teal) }`; `a:hover { text-decoration: underline; text-underline-offset: 3px; text-decoration-color: rgba(69,230,255,.5) }`; `a:focus-visible { outline: 2px solid var(--teal); outline-offset: 2px; border-radius: 2px }`.
- `.beadNow`: `display: flex; align-items: center; gap: 6px; margin: 3px 0 0; min-width: 0; font: var(--t-small) var(--f-sans); font-size: 0.8125rem; line-height: 1.25; color: var(--ink-2)`. `.beadDisc { --node: 16px }` (the `LegacyCircle` rest grey, as the old cards). `.beadCo { font-weight: 600; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis }`. `.glyph` as is (7 px). `.beadYear { flex: none; font: var(--t-meta) var(--f-mono); font-size: 0.6875rem; letter-spacing: var(--ls-mono); text-transform: none; color: var(--ink-3); font-variant-numeric: tabular-nums }`.
- `.beadRole`: `display: flex; align-items: center; gap: var(--s-2); margin: 2px 0 0; min-width: 0; font: var(--t-small) var(--f-sans); font-size: 0.8125rem; line-height: 1.25; color: var(--ink-3)`. `.beadRoleText { min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis }` (the `title` carries the full role — 8 of 87 are longer than ≈ 30 characters). `.ghosts { flex: none; margin-left: auto; display: inline-flex; align-items: center; gap: 3px; opacity: .7 }` with the 12 px `LegacyCircle`s (they stay grey; their `title` names them; `--node: 12px`); `.ghostMore { font: var(--t-meta) var(--f-mono); font-size: 0.625rem; color: var(--ink-3) }`.
- **Hover / focus (the bead itself)**: `Bead` keeps `const [hot, setHot] = useState(false)` (set on pointerenter / pointerleave / focus / blur — today's `AlumCard` does exactly this) and passes `lit={hot}` to its 16 px `LegacyCircle`, so the logo goes full-colour the way the old card's did. `(hover: hover)`: `.bead:hover { background: rgba(17, 20, 23, .72) }`. (`LegacyCircle.module.css` lights on `.lit` only and is not ours to edit, so the lit logo needs the prop, not CSS.)
- **Kin (the other beads at the same company, set imperatively by §2)**: CSS only, no re-render: `.bead[data-kin] { background: rgba(69, 230, 255, .05) } .bead[data-kin]::before { background: var(--teal); box-shadow: 0 0 10px rgba(69, 230, 255, .7) } .bead[data-kin] .beadCo, .bead[data-kin] .beadName { color: var(--ink) }` — kin beads light their node and their names, not their logo. That is enough to spot "the other four at Amazon".
- `.beadPhoto` — the `Photo` component (32 × 42, `ui.frame`), `margin-top: 2px`.

### 3.3 Quiet names (no published role)

```jsx
<ul className={s.quiet} aria-label={`${team.label} ${batch}, no published role`}>
  {quiet.map((p) => (
    <li key={p.slug} className={s.quietName}>
      {p.linkedin ? <a href={p.linkedin} target="_blank" rel="noreferrer" aria-label={`${p.name} — LinkedIn`} data-cursor="lock">{p.name}</a> : p.name}
    </li>
  ))}
</ul>
```

- `.quiet`: `margin: 6px 0 0; padding: 6px 0 0 0; list-style: none; border-top: 1px dotted var(--line)` (only when the cell also has beads: `.beads + .quiet`; a cell with no beads has no rule).
- `.quietName`: `font: var(--t-small) var(--f-sans); font-size: 0.8125rem; line-height: 24px; color: var(--ink-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis`. Links inherit colour; `:hover` → `--ink-2` + the same underline recipe; `:focus-visible` ring as above. No node on the thread for a quiet name (the thread's beads are the published ones — that is what the legend says).

### 3.4 Legend row (replaces the controls; same recipe as `.mapLegend`)

Left (`ui.meta`, `--ink-2`): `164 ALUMNI · 87 WITH A PUBLISHED ROLE · 7 BATCHES · 5 TEAMS` from `STATS.people`, `STATS.withLatest`, `BATCHES.length`, `TEAMS.length`. Right (`ui.meta`, `--ink-3`, the `.mapKey` layout): `<Glyph full-time/> FULL-TIME` · `<Glyph intern/> INTERN` · `<KeyDisc/> DISC · LATEST COMPANY` · `NAME ONLY · NO PUBLISHED ROLE`. `KeyDisc` = a 12 px `.keySvg` circle (reuse `.keySvg`). `title` on the row: "Hover a person to light their company on the map above." Below 760 the two halves stack.

### 3.5 760–1279 — team blocks

The matrix gives way to blocks, the same elements: the legend; then per batch the **rail** (full width, same head); under it a 2-column grid (`.blocks { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--s-4) var(--col-gap) }`) of **team blocks**: each a `.cell` (same thread border, same padding) with its own caption on top — `.cellHead` (`ui.meta`: `FRONTEND` in `--ink` + `3 / 5` in `--ink-3`, `margin: 0 0 6px; padding-left: 0`) — then the beads and quiet names. **Empty teams are omitted** here (no captions for nobody). The sticky `.threadHead` row is not rendered. Blocks fill left → right, top → bottom in `TEAM_ORDER` (CSS grid default; 5 blocks → 3 rows, the last one half empty — fine). Lane width at 1024: (932 − 24) / 2 = 454 px, so nothing truncates.

### 3.6 Phones (< 760, 390 × 844)

One column: legend (two lines), per batch the rail (year left; `16 OF 22` + bar 120 px + `●16 ◌0` wrap under the year on a second line when the row is narrower than 360 px — `flex-wrap: wrap`), then the team blocks stacked (`.blocks { grid-template-columns: minmax(0, 1fr) }`), beads 56 px, quiet names 24 px. Photo stays 32 × 42 (the old card's 36 is not needed: the name has the full width). ≈ 8,000 px for the section (from 18,634). No horizontal scroll; name links are the tap targets (≥ 24 px tall lines; the bead's name line is 18 px tall but the whole `a` box plus the 7 px bead padding gives 24+).

---

## 4. Motion

Rail by rail as each comes into view (`IntersectionObserver`, `threshold: 0.1`, once; the attribute set on the node outside React, exactly as the map does with `data-in` on its panels). Under `data-in` and `(prefers-reduced-motion: no-preference)`:

- the rail's bottom rule draws left → right: `.rail::after` (the rule, instead of `border-bottom`: `position: absolute; left: 0; right: 0; bottom: 0; height: 1px; background: var(--line-2); transform-origin: left; transition: transform 600ms var(--ease-out)`; `.rail:not([data-in])::after { transform: scaleX(0) }`);
- the rail's five cells: `opacity 0 → 1, translate 0 8px → 0`, 400 ms `--ease-out`, `transition-delay: calc(120ms + var(--t) * 60ms)` (`--t` = thread index 0–4);
- beads inside: `.bead::before` (the node) `scale .4 → 1`, 300 ms, delay `calc(200ms + var(--t) * 60ms + var(--k) * 25ms)` (`--k` = bead index in the cell, capped 8);
- the bar's two fills: `width` from 0, 600 ms, delay 100 ms (set the widths inline as today; the `:not([data-in])` rule forces `width: 0 !important`… no `!important`: put the inline width on a `--w` custom property and the rule reads `width: var(--w)`, `:not([data-in])` → `width: 0`).

Reduced motion: everything simply there — one `@media (prefers-reduced-motion: reduce)` block zeroes every transition in these rules, and the observer is skipped (`data-in` set on all rails at mount), as the map does. Hover transitions 150 ms; none under reduced motion. The `Photo` components keep `loading="lazy"`.

---

## 5. Accessibility

- Outline: h1 Legacy · h2 Companies · h3 × 9 sectors · h2 Alumni · **h3 2017 … 2023** (the rail years, `tabIndex` not needed) · h2 Year by year. Thread captions are `<p>`s in the `.loom` grid, not headings (they are column heads; the matrix is not a `<table>` because the cells hold lists, not single values — if you prefer `role="table"` semantics, do it fully: `role="table"` on `.loom`, `role="columnheader"` on captions, `role="row"` groups … it does not map onto a CSS grid with spanning rails cleanly; **don't**: use lists + headings as above).
- Each cell: `<ul class="beads" aria-label="Frontend 2018">` with one `<li>` per person; the quiet list labelled "Frontend 2018, no published role". A bead's text order is name, company, kind (sr-only), year, role, previously (sr-only) — complete without the visuals.
- The LinkedIn link is the only control; its name is `"{name} — LinkedIn"`; it has the focus ring; Tab order = reading order (thread captions have nothing focusable).
- Kin highlight is additive (nothing dims, nothing moves); `data-kin` beads and stars remain fully readable; it also triggers on keyboard focus of the name link, so keyboard users see the company light on the map (when it is on screen).
- Contrast: names `--ink` (≥ 15:1), company `--ink-2` (≥ 7:1), role / quiet names `--ink-3` on `--bg` ≈ 4.6:1 — the floor for 13 px text; do not go darker.
- Touch: no hover; names are links; nothing else to do.

---

## 6. Files

| file | action |
|---|---|
| `legacy/page/roster.js` | **new** — §1 (`RAILS`, `THREADS`, `MAX_WITH_ROLE`, `KIN_OF`) |
| `legacy/page/kin.js` | **new** — §2 store (`setKin`, `onKin`, `getKin`) |
| `legacy/page/Alumni.jsx` | **rewrite** — header comment updated; delete the search, `ALL`, `*_OPTS`, `PREV_MAX`, `visible`, `groups`, `filtered`, `clear`, the empty state, `Chips` usage, the `useId`-driven ids; add `Legend`, `ThreadHead`, `Rail`, `Cell`, `Bead`, `Quiet`, the `data-in` observer and the kin effect. Imports: `RAILS, THREADS, MAX_WITH_ROLE` from `./roster`, `setKin, onKin` from `./kin`, `previousCompanies, STATS, BATCHES, TEAMS` from `../alumniData`, `Glyph, Photo` from `./PersonCard`, `SocialIcon` from `../../chrome/SocialIcon`, `LegacyCircle`, `roleOf`, `useMedia, useReducedMotion` |
| `legacy/page/Companies.jsx` | **small edit** — the two kin effects of §2 and nothing else |
| `legacy/page/PersonCard.jsx` | **delete** `Chips` (its only consumer was Alumni); update the header comment; keep `Glyph`, `Photo`, `LinkedIn` (still used by `PersonRow`), `PersonRow` |
| `legacy/page/legacyPage.module.css` | **remove** `.controls .searchBox .search(+::placeholder, ::-webkit-search-cancel-button, :focus) .chipGroup .chipKey .chipRow .chip(+::before, [aria-pressed], :focus-visible, :hover) .result .legend .legendEnd .clear .empty .aSearch .aRoleChips .aTeamChips .aResult .aGroups .aGroup .aGroupHead .aGroupHeadIn(+::before, container rules) .aGrid .aCard .aBody .aName .aTeam .aLatest .aDisc .aRole .aWhen .aGlyph .aCo .aYear .aNone(+::before) .aPrev .aPrevKey .aPrevList .aLink` and their copies in the `(hover: hover)`, `max-width: 1099px`, `max-width: 759px`, reduced-motion blocks — **keep** `.aGroupYear` renamed `.railYear`, keep the scroll-state floor rule (moved onto `.threadHead::before`); **add** `.loomLegend` (= `.mapLegend` — share the class, don't duplicate), `.loom .threadHead .rail .railYear .railNums .blocks .cell .cellHead .beads .bead(+::before) .beadPhoto .beadBody .beadName .beadNow .beadDisc .beadCo .beadYear .beadRole .beadRoleText .ghosts .ghostMore .quiet .quietName`, the `[data-kin]` rules for beads and stars, the entrance block, the 760–1279 and < 760 blocks. Expect the file to end ≈ 1,150–1,200 lines (the Alumni part shrinks slightly; the map part is untouched) |
| `pages/LegacyPage.jsx` | **one string**: the Alumni lede → **"All {STATS.people} of us on one loom — a rail per batch, a thread per team, and where each of us is now. Hover a person to light their company on the map."** Header comment line 3: "a loom by batch and team" instead of "a searchable directory". Jump row unchanged |
| `legacy/alumniData.js`, `format.js`, `Readout.jsx`, `sectors.js`, `mapLayout.js`, `legacy/*` outside `page/`, `home/*` | **not touched** (`search()` in alumniData becomes unused — leave it; the module is another round's contract) |

---

## 7. Work items and acceptance (shots to `/tmp/v8cdp/F7/`, your own dev port)

**A1 · Roster data.** `roster.js`. Browser eval: `import('/src/variants/v8/legacy/page/roster.js').then(m => ({ rails: m.RAILS.map(r => [r.batch, r.total, r.withRole, r.fullTime, r.intern, r.cells.map(c => c.beads.length), r.cells.map(c => c.quiet.length)]), threads: m.THREADS.map(t => [t.team.label, t.withRole, t.total]), max: m.MAX_WITH_ROLE, amazon: m.KIN_OF.get('amazon') }))` equals §1 row for row; `max === 20`; `amazon` has 5 slugs (Ishita Aggarwal, Shikhar Uttam, Pritish Dakhole, Ritik Chandra, Shiven Sharma); no `console.warn`.

**A2 · The loom at 1440 × 900.** `a2-loom.png` (eval-scroll so the Alumni h2 is at y ≈ 40): legend row, five sticky captions with `16 / 29` etc., the 2017 and 2018 rails with year, `16 OF 22 PUBLISHED`, bar and `●16 ◌0`; beads with photo, name + small "in", disc + company + glyph + year, role; quiet names in the dimmer ink under a dotted rule; dashed threads down each lane; a node on each thread per bead. `a2-full.png` at `VH=2800`: all seven rails. Eval: `document.querySelectorAll('li[class*=bead]').length === 87`, `document.querySelectorAll('li[class*=quietName]').length === 77`, `document.getElementById('v8-legacy-alumni').getBoundingClientRect().height < 3000` (was 7,469), `document.documentElement.scrollWidth === innerWidth`, headings eval = §5 outline, no element with `type="search"` and no `[aria-pressed]` anywhere in the section.

**A3 · Kin.** `a3-kin.png`: `HOVER` on Shikhar Uttam's bead (2019 · AppDev) with the map's Big Tech panel scrolled into the same viewport is impossible (they are 2,000 px apart) — so assert by eval: after dispatching `pointerenter` (`pointerType: "mouse"`) on his bead, `document.querySelector('[data-star="amazon"]').hasAttribute('data-kin') === true` and `document.querySelectorAll('li[class*=bead][data-kin]').length === 5`; after `pointerleave`, both 0. Reverse: `pointerenter` on the Amazon star → the same five beads carry `data-kin`; `pointerleave` + 400 ms → none. Shot the hovered bead region (`a3-kin.png`): the bead's floor tinted, its disc lit (full-colour Amazon), the four other Amazon beads with a bright node and a white company name. Also: no card, no dimming on the loom.

**A4 · Keyboard.** Eval: focus Anant Verma's link (`[data-slug="anant-verma"] a`) → `[data-star="microsoft"][data-kin]` exists; the focus ring is visible (`a4-kb.png`); Tab moves to the next bead's link in reading order (Devansh Agarwal). Lint clean (`npm run lint`, oxlint).

**A5 · 1024 × 768.** `a5-1024.png`: the rail, then team blocks in two columns with captions `FRONTEND 3 / 5`; no sticky caption row; nothing truncated. Eval: `document.querySelectorAll('p[class*=threadHead]').length === 0`.

**A6 · Phone 390 × 844 (DPR 2).** `a6-m.png`: legend on two lines, 2018's rail with its numbers wrapped under the year, team blocks stacked, beads 56 px, quiet names 24 px; `a6-m-full` eval: section height < 9,000 (was 18,634); no horizontal scroll.

**A7 · Motion.** `a7-rm.png` with `prefers-reduced-motion: reduce` emulated: identical at 0 ms and 3 s; the rail rules, cells and bars present at once. Without it, a shot 150 ms after a rail enters (`a7-in.png`) shows its rule part-drawn. Console clean on `/v/v8/legacy` across all shots. Delete `/tmp/v8cdp/prof-*`, kill your Chrome.

**A8 · The map unchanged.** `a8-map.png` of the Companies section at 1440 pixel-equivalent to `/tmp/v8cdp/F7/companies-full.png` (nothing changed there but two effects). The head, readout and jump row unchanged.

---

## 8. Calls I made (say if you disagree; don't silently change)

- **Everyone stays, published roles are the beads.** The user asked for "the list of alums as well"; the 77 without a public role are names in their batch-and-team cell, not cards. One phrase for both `unconfirmed` and `none` as before — here the phrase is the legend's "NAME ONLY · NO PUBLISHED ROLE", not a per-person line.
- **Name is the link.** The separate LinkedIn icon column costs 28 px in a 214 px lane; the name with the small "in" is the same affordance with a bigger target. `LinkedIn` in `PersonCard.jsx` stays for the map's `PersonRow`.
- **Beads sorted by name within a cell**, not full-time first: the loom is a finder; alphabetical is what a finder wants. The glyph shows the kind.
- **Grey discs at rest, lit on hover** (the page's rule since tier-1 §5); the map above is the tinted one. 87 tinted 16 px logos would be confetti.
- **Ghost discs** for earlier companies rather than a "Previously" text line: they cost no height, they are the same disc vocabulary, and the `title` + sr-only carry the names. If they look like dirt at 12 px, drop them to a `title` on the role line before dropping the idea.
- **No touch kin, no card, no sheet.** Everything a bead knows is printed on it.
- **Matrix breakpoint 1280**, not the map's 1100: five lanes of text need 214 px each. Between 1100 and 1279 the loom is team blocks like 1024 — a reader there loses the team axis across rows but keeps everything else.
