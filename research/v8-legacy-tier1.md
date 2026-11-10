# V8 · Hologram — Legacy, corrective round: the tier-1 companies (home) and the two lists (/legacy)

Spec for two Opus engineers in parallel: **A** = data module + home section, **B** = the /legacy page on A's agreed interface (§2). No file is touched by both (§6). Everything lives in `src/variants/v8/`; no new packages, no installs. Don't run vercel, don't commit; the user deploys after review. Back up `src/variants/v8/legacy/` and `src/variants/v8/pages/LegacyPage.jsx` to `/tmp/v8-backup-round14-<stamp>/` before the first edit (the round-13 copy is at `/tmp/v8-backup-round13-20261109-023608`).

Screenshots: `node /tmp/v8cdp/cdp.mjs <url> <out.png> <waitMs> [jsExpr]` (env `VW VH DPR WHEEL SHOTS HOVER`, see its header); save to `/tmp/v8cdp/F4/`; delete `/tmp/v8cdp/prof-*` and kill any Chrome you started when done. Reference screens of what is being replaced: home `/tmp/v8cdp/NA/final-rest.png`, `final-amazon.png`; page `/tmp/v8cdp/NB/*.png`; the logo probe for this round `/tmp/v8cdp/F4/probe-logos.png` (every tier-1 candidate's logo at 64 px on the room's dark).

---

## 0. What the user said, and what this round does

Verbatim: *"no the current design is too bad. understand the goal, the goal is to show the main big companies in which employees are dvm alums (the tier 1 companies) on the home page. for the legacy section, you dont need to add the history of every dvm engineer, you just need to show the comprehensive list and the list of alums as well."*

What is wrong today (`NA/final-rest.png`): the home is a 72-node force cloud of 11 px mono names — Zenon, Windfall Research, Prashanu Hospital — with the eight logos that matter lost among them. It does not say "our alumni are at Google, Microsoft, Amazon". The /legacy page (`NB/paths.png`) is per-person career timelines, which the user does not want.

This round:

1. **Home = a curated wall of the 20 tier-1 companies** (§1, §3): big real logos with the alumni count on each, wired to the DVM mark as a clean fan (the "neural net" the user accepted, with 20 nodes instead of 230). Hover / focus / tap a logo → the alumni there, each marked intern or full-time. One link: "All 121 companies →".
2. **/legacy = two lists** (§4): every company (121) with logo, counts, sort / filter / search, expandable to its alumni; and every alum (164) as a searchable, filterable directory — photo, name, batch, team, latest company + role, intern / full-time, LinkedIn. No timelines. Compact stats head; the year-by-year DVM strip stays at the end (department history, not engineer history).
3. **Data** (§2): a `TIER1` list that is a one-line edit, and `companyPeople()` that counts anyone with *any* published experience at a company, intern or full-time, saying which.

Kept because it works: `LegacyCircle` (logo kinds glyph / mark / tile, monogram fallback), the people-row recipe of `LegacyScreen` (photo 32 × 42, name, batch · team, role line, LinkedIn), the selection model in `Legacy.jsx` (hover selects; leaving clears after 400 ms; focus / Escape / quiet-focus; tap-outside on touch), `LegacySwarm`, the swarm chain and the glide into Year by year, `LEGACY_PLACE` and everything in `home/swarmChain.js`, `home/LegacyStory.jsx`, `home/Spotlight.jsx` — **none of those four files is edited this round.**

---

## 1. The tier-1 list

Computed from `legacy/alumni.json` (high-confidence only; all 164 names resolve to team records, so these are the numbers `alumniData` will produce). *Alumni* = distinct people with any published step at the company; *FT* = of those, people with at least one full-time step there; *intern* = the rest (intern-only). *Now* = people whose latest step is there.

| # | Company (display) | ids in `alumni.json` | Alumni | FT | Intern | Now | Logo |
|---|---|---|---|---|---|---|---|
| 1 | Amazon | `amazon` | **6** | 4 | 2 | 5 | glyph `amazon.svg` ✓ |
| 2 | Samsung | `samsung-r-and-d-institute-india` + `samsung-semiconductor` | **4** | 1 | 3 | 1 | glyph `samsung-r-and-d-institute-india.svg` (wordmark, see §1.2) |
| 3 | Microsoft | `microsoft` | **3** | 1 | 2 | 1 | mark `microsoft.png` ✓ |
| 4 | Cisco | `cisco` | **3** | 1 | 2 | 0 | glyph `cisco.svg` ✓ |
| 5 | Credit Suisse | `credit-suisse` | **3** | 1 | 2 | 1 | glyph `credit-suisse.svg` ✓ |
| 6 | Google | `google` + `google-deepmind` | **2** | 1 | 1 | 1 | mark `google.png` ✓ |
| 7 | Goldman Sachs | `goldman-sachs` | **2** | 1 | 1 | 0 | glyph `goldman-sachs.svg` (wordmark box) |
| 8 | JPMorgan Chase | `jpmorgan-chase` | **2** | 1 | 1 | 2 | tile `jpmorgan-chase.png` ✓ |
| 9 | Oracle | `oracle` | **2** | 2 | 0 | 2 | glyph `oracle.svg` ✓ |
| 10 | Stripe | `stripe` | **2** | 1 | 1 | 2 | glyph `stripe.svg` ✓ |
| 11 | UBS | `ubs` | **2** | 1 | 1 | 2 | glyph `ubs.png` ✓ |
| 12 | Walmart | `walmart` | **2** | 0 | 2 | 1 | mark `walmart.png` ✓ |
| 13 | Meta | `meta` | **1** | 1 | 0 | 1 | mark `meta.png` ✓ |
| 14 | Uber | `uber` | **1** | 0 | 1 | 1 | glyph `uber.svg` ✓ |
| 15 | Salesforce | `salesforce` | **1** | 1 | 0 | 0 | glyph `salesforce.svg` ✓ |
| 16 | AMD | `amd` | **1** | 1 | 0 | 1 | glyph `amd.svg` ✓ |
| 17 | Texas Instruments | `texas-instruments` | **1** | 0 | 1 | 1 | glyph `texas-instruments.svg` ✓ |
| 18 | D. E. Shaw | `d-e-shaw` | **1** | 1 | 0 | 1 | **none yet — §1.2** |
| 19 | Barclays | `barclays` | **1** | 1 | 0 | 0 | glyph `barclays.svg` ✓ |
| 20 | American Express | `american-express` | **1** | 1 | 0 | 1 | glyph `american-express.svg` (wordmark box) |

Sum: 41 alumni-at-company pairs, 34 distinct people (some are at two of these). Total published people: 87 of 164.

**Why these 20.** Every company in the data with ≥ 2 alumni that a reader anywhere recognises (all 12 of them except Nielsen, which is benched), then the eight single-alum names that carry the most weight for a BITS audience: the three big-tech names left (Meta, Uber, Salesforce), two silicon (AMD, TI), one quant (D. E. Shaw) and two banks (Barclays, AmEx). Not included because they are not "main big companies" to this audience or their logo is poor: Simplismart 5, UnifyApps 3, DeTrace 2, Navi 2, Schmooze 2 (startups), Nielsen 2, and every other single. 20 fills four rings of five (§3.2) at 1280–1920 wide.

**The bench** (singles with good logos, in the order they would be added): Nielsen (2), Wells Fargo, Capital One, BCG, PwC, Confluent, Razorpay, CRED, Meesho, Indeed, Media.net, Postman, Graviton Research Capital, AlphaGrep, Ericsson, Tenstorrent, Societe Generale, Deloitte (64 px tile, soft), WorldQuant (`worldquant.png` is a hollow orange frame — renders as a black square; needs a proper icon before it can be shown anywhere as a logo: A, one line in the LOGOS table → `undefined`, monogram "WQ", see §2.4).

**Order on the home**: alumni count desc, then the position in the `TIER1` array (so the array is the prominence order and a count change re-sorts automatically). Adding a company is one line: push its id (or a group) onto `TIER1_IDS`; the data module validates it (§2.1).

### 1.1 Merged groups

`Samsung` = Samsung R&D Institute India + Samsung Semiconductor; `Google` = Google + Google DeepMind. On the home node and in `companyPeople()` they count as one company; each person's row still names the unit when it differs from the display name ("Software Engineer · Google DeepMind · 2025"). On /legacy the 121 companies stay separate (the comprehensive list is the raw directory); the Tier 1 filter there matches any id in a group.

### 1.2 Logos to fix (A)

- **D. E. Shaw** — no file. Fetch from Wikimedia Commons (public-domain text logo): `File:D. E. Shaw & Co. Logo.svg` (the wordmark "D.E.Shaw & Co" with the rising rule; a copy is already at `/tmp/v8cdp/NA/d-e-shaw.svg.removed`, white fills, viewBox `0 0 447.31 94.29`) and also look at `File:DE Shaw logo.png` / `File:D. E. Shaw & Co. logo.png` (Commons API `action=query&list=search&srsearch=D.%20E.%20Shaw%20logo&srnamespace=6`). Rule: if one of the PNGs is a square icon that reads at 64 px, use it as `kind: "mark"`; else crop the SVG to the **"D.E." initials** by editing its `viewBox` (roughly the first 150 of 447 units wide, below the rule — verify by eye on the probe page), save as `public/assets/legacy/logos/d-e-shaw.svg`, `kind: "glyph"`, no colour (lights to `--ink`). The full wordmark is illegible in a disc; the initials are the logo's own letterforms, which is honest. Add the LOGOS entry in `scripts/build-legacy-alumni.mjs` with its source note and re-run the script (it only rewrites `alumni.json`; diff must be the one logo).
- **Wordmark glyphs** (Samsung, Goldman Sachs, American Express, Wells Fargo, D. E. Shaw crop): legible at 64 px only if the mask is wider. `LegacyCircle` gets a `--glyph-w` / `--glyph-h` pair (defaults 70 % / 56 % as today); the fan's discs set `--glyph-w: 80%; --glyph-h: 60%`. No per-logo flags.
- **WorldQuant**: LOGOS entry → remove (monogram). Nothing else is downloaded.

---

## 2. Data — `legacy/alumniData.js` (A, first; interface frozen for B)

Keep the module's job (only it knows `alumni.json`; people resolve to `immersive/data` team records; sort orders are the contract). Keep `Person`, `Experience`, `Logo` as they are. Changes:

### 2.1 New exports

```js
/** The tier-1 list. A string is a company id; an object merges several ids under one name/logo.
 *  Order = prominence (ties in alumni count keep this order). One line to add or remove. */
export const TIER1_IDS = [
  "amazon",
  { id: "samsung", name: "Samsung", ids: ["samsung-r-and-d-institute-india", "samsung-semiconductor"], logoOf: "samsung-r-and-d-institute-india", url: "https://samsung.com" },
  "microsoft", "cisco", "credit-suisse",
  { id: "google", name: "Google", ids: ["google", "google-deepmind"], logoOf: "google", url: "https://google.com" },
  "goldman-sachs", "jpmorgan-chase", "oracle", "stripe", "ubs", "walmart",
  "meta", "uber", "salesforce", "amd", "texas-instruments", "d-e-shaw", "barclays", "american-express",
  // bench: "nielsen", "wells-fargo", "capital-one", "bcg", "pwc", "confluent", "razorpay", "cred", "meesho", "indeed", "media-net", "postman"
];

/**
 * @typedef {{ person: Person, kind: "intern" | "full-time", now: boolean, steps: Experience[], role?: string, year?: number | null, unit?: string }} CompanyPerson
 *   kind: "full-time" if any step at the company is full-time, else "intern"; now: the person's latest
 *   step is at the company; steps: their steps there, newest first; role/year: of the newest step;
 *   unit: the member company's name when the group has several ids and it differs from the display name.
 * @typedef {{ id: string, name: string, fullName?: string, url?: string, logo?: Logo, ids: string[], companies: Company[],
 *   people: CompanyPerson[], count: number, fullTime: number, intern: number, now: number, teams: string[] }} Tier1Company
 *   people sorted: now first, then full-time before intern, then batch desc, then name. count = people.length.
 */

/** @type {readonly Tier1Company[]} count desc, then TIER1_IDS order. Dev-warns and skips an id with no company or no people. */
export const TIER1;
/** @type {ReadonlySet<string>} every company id in a TIER1 entry. */
export const TIER1_COMPANY_IDS;

/** Everyone with any published step at one company (or at any of several ids): the CompanyPerson rows, sorted as above. */
export function companyPeople(companyOrIds /* Company | string | string[] */): CompanyPerson[];

/** Distinct companies in a person's history other than their latest step's, newest first (for a "Previously" line). */
export function previousCompanies(person): Company[];
```

### 2.2 Changed exports

- `Company` gains `fullTime: number`, `intern: number` (people counts with the §1 definition; `fullTime + intern === ever.length`) and `tier` becomes `1` iff `TIER1_COMPANY_IDS.has(id)` (it was `latest.length >= 2`).
- `COMPANIES` sort → `ever.length desc, fullTime desc, name` (the comprehensive list is by alumni ever, not by "now").
- `STATS` → `{ people, withLatest, companies, tier1: TIER1.length, fullTime, intern }` (`fullTime` / `intern` still = kinds of latest steps, the "now" split). Drop `netCompanies`, `internedThenJob`, `stayedAfterInternship`, `moves`.
- `search(q)` stays (name or any company in history). `PEOPLE`, `PERSON_BY_SLUG`, `COMPANY_BY_ID`, `BATCHES`, `TEAMS` stay.

### 2.3 Deleted exports

`NET_COMPANIES`, `EDGES_LATEST`, `EDGES_HISTORY`, `transitions()`, `ALUMNI_COUNT` — their only consumers are files this round deletes (§6). Grep before deleting; nothing outside `legacy/` imports them (checked: `Legacy.jsx`, `LegacyNet.jsx`, `LegacyList.jsx`, `page/Steps.jsx`, `page/Paths.jsx` only).

### 2.4 Pipeline

`scripts/build-legacy-alumni.mjs`: add the D. E. Shaw LOGOS entry, remove WorldQuant's; re-run; the `alumni.json` diff is those two logos only. `alumni.json` shape unchanged.

**Acceptance A1** (dev server, in the browser via cdp eval): `import('/src/variants/v8/legacy/alumniData.js').then(m => ({ n: m.TIER1.length, rows: m.TIER1.map(t => [t.name, t.count, t.fullTime, t.intern, t.now, !!t.logo]), amazon: m.companyPeople('amazon').map(p => [p.person.name, p.kind, p.now]), stats: m.STATS }))` prints `n === 20`, the rows equal to §1's table (Amazon 6/4/2/5 … American Express 1/1/0/1), every `logo` true, `amazon` = 6 rows with 4 full-time and 2 intern, and no `console.warn`.

---

## 3. Home — "the twenty, wired to the mark" (A)

### 3.1 Concept

The DVM mark idles in dust on the right, exactly where it is (§3.6). Out of its glow, to the left, **twenty big logo discs** stand on four concentric arcs centred on the mark, the companies with the most alumni on the inner arc: *the nearer the mark, the more of us are there.* Each disc wears its alumni count as a small teal badge and its name beneath. One hairline wire runs from each disc straight toward the mark and fades into the glow. Every few seconds a signal leaves the mark along one wire and the disc it reaches brightens. Hover, focus or tap a disc and the signal is yours: the rest dims, the wire lights, and a card rises beside the disc with the people — faces, names, batch · team, their role there, intern or full-time, LinkedIn.

That is still the network the user accepted, executed as he asked: few big nodes, real logos, clear wiring to the mark, generous spacing, no label cloud. It beats a flat logo grid because the geometry says something (closeness = headcount), keeps the mark as the source of the chapter, and gives the Spotlight's beam and the glide into Year by year the same mark in the same place.

### 3.2 Geometry (≥ 1100 px; numbers at 1440 × 900, DPR 1)

Section and head unchanged (`section#legacy.sec.container`, `min-height: 100vh`, `data-light="74% 62% 30vw"`, `data-chapter="Legacy"`; the head row with h2 "Legacy", lede "Where DVM alumni went next.", and **the one forward link, now "All 121 companies →"** to `P("/legacy")` — `ui.headAction`, text from `STATS.companies`).

Body (`.body`, position relative, flex 1): y 246 … 810 in the section (564 tall), x 64 … 1376. Mark box (from `legacyMarkBox`, unchanged): section x 846–1285, y 273–843, centre (1066, 558). In **body px**:

- `C` = mark centre = (1001, 312).
- `x1` (field's right edge) = markLeft − 86 = **696**. Nothing — disc, label, badge, card — ever has a right edge past `x1`.
- `rx` (wire end) = markLeft − 10 = **772**: wires stop here and fade over their last 24 px. No drawn line enters the mark box.
- Field: x 0 … 696, y 20 … 556 (the readout line sits above y 20).

**Discs.** Size by alumni count: 1 → 52, 2 → 58, 3 → 64, 4–5 → 70, ≥ 6 → 76 px. Badge: 20 px disc, `--teal` fill, `--teal-ink` mono 600 11 px count, at the disc's top-right (`right: -2px; top: -2px`), 1 px `--bg` ring so it cuts cleanly over the disc. Label: company name, `600 14px "Hubot Sans"` sentence case, `--ink-2`, centred 6 px under the disc, one line, max 128 px (ellipsis; `fullName` on the card). Node footprint = disc ∪ label with 4 px slack: half-width `max(r, 64)`, top `y − r − 4`, bottom `y + r + 6 + 18 + 4`.

**Rings** (`legacy/fanLayout.js`, pure, ~120 lines; same inputs → same output, no RNG):

```
rMin = C.x − x1 + 38            // inner ring's disc right edge ≤ x1   (= 343)
rMax = C.x − 38 − 8             // outer ring's disc left edge ≥ 8     (= 955)
K = 4;  r_k = rMin + 58 + (rMax − rMin − 58) × k / (K − 1)            // 401, 586, 770, 955
band: node centres y ∈ [y0 + 38, y1 − 38 − 28] = [58, 490]  → sinθ ∈ [(58 − C.y)/r, (490 − C.y)/r]
capacity_k = floor(arc_k / 108) + 1, arc_k = r_k × (θhi_k − θlo_k)      // ≈ 5 on every ring at 1440 × 900
fill: TIER1 in display order, inner ring first, greedy; a ring takes min(capacity, remaining, ceil(remaining / ringsLeft)) so the rings stay even (5 / 5 / 5 / 5, never 6 / 6 / 6 / 2)
angles: n nodes spread evenly over [θlo, θhi]; odd rings inset by half a step (interleaved with their neighbours)
position: x = C.x − r cosθ, y = C.y + r sinθ ; wire = segment (x, y) → (rx, C.y + (rx − C.x) × tanθ)  — radial, so it points at the mark's centre
clearance pass (≤ 4 rounds): for every wire and every other disc, if the disc centre is within r_disc + 10 px of the wire, rotate that disc ±2° (toward the side with more arc room). Then assert no two footprints overlap and every footprint is inside the field; if not, spacing 108 → 100 once; still not → the last ring loses its last node to a "+n more" label at the field's bottom-left (not expected at ≥ 1280 × 720 with 20 companies — it is a safety net, not a layout).
```

Result at 1440 × 900 (approx.): ring 1 at r 401 — Amazon, Samsung, Microsoft, Cisco, Credit Suisse, x ≈ 600–690; ring 2 at 586 — Google, Goldman Sachs, JPMorgan Chase, Oracle, Stripe; ring 3 at 770 — UBS, Walmart, Meta, Uber, Salesforce; ring 4 at 955 — AMD, Texas Instruments, D. E. Shaw, Barclays, American Express, x ≈ 50–120. Neighbours on a ring ≈ 112 px apart, rings 185 px apart, every wire 16–20 px from its neighbours where they meet the glow.

Other widths: the same formulas on the measured section (`ResizeObserver`, as `Legacy.jsx` does now; re-run on a size change, nodes snap). At 1280 × 800 the field is 640 × 470 and the rings fit 5 / 5 / 5 / 5 with spacing 100; at 1920 × 1080 the field is 1000 × 700 and the rings are 250 px apart — fine, the fan opens up. Label fonts are measured nowhere: labels are a fixed 128 px box, so the layout does not wait for fonts (drop the FontFaceSet dance from `Legacy.jsx`).

### 3.3 Rendering

- **`LegacyFan.jsx`** (replaces `LegacyNet.jsx`): an `svg` (absolute, inset 0, `aria-hidden`) for wires and pulses, and a `div.nodes` (absolute, inset 0) with one `button` per company, positioned by `left/top` transforms. ~200 lines. No canvas; 20 lines and one moving dot do not need it (`netCanvas.js` goes).
- Wire: `line`, `stroke: rgba(69,230,255,.22)`, 1 px, `vector-effect: non-scaling-stroke`; the last 24 px fade via a `linearGradient` along the line (or a second short line with a 0-alpha end). Lit wire: `rgba(69,230,255,.85)`, 1.5 px, plus a blurred twin (`filter: drop-shadow(0 0 6px rgba(69,230,255,.45))`).
- Pulse: a `circle r=2.5` with a 6 px glow, moved along its wire by `requestAnimationFrame` (position = lerp(markEnd → node, easeOutCubic(t)), 700 ms). Idle: every 3–5 s (random, deterministic enough) on a random wire; on arrival the disc's ring goes `--line-2` → `rgba(69,230,255,.6)` for 400 ms and back. At most one idle pulse at a time; none while a company is selected, none when the section is off-screen (`useNear`), none under reduced motion.
- Disc: `LegacyCircle` with `--node` = size. **At rest the logo keeps its colour, dimmed** — `filter: saturate(.55) brightness(.85)` on `.img` / `.tile`, glyphs drawn in `color-mix(in srgb, var(--brand, var(--ink-2)) 55%, var(--ink-3))` — so Google reads as Google at a glance (the user's ask: *recognisable* logos). Lit: full colour, ring `--teal` at .6, `box-shadow: 0 0 18px rgba(69,230,255,.18)`. (`LegacyCircle.module.css` gets a `data-rest="tinted"` variant for this; the /legacy page and the card keep the grey-at-rest look.)
- Button: `aria-label="Amazon, 6 alumni"` (`1 alum`), `aria-pressed`, `aria-expanded`, `aria-controls="v8-legacy-screen"`; focus-visible ring `2px solid var(--teal)` offset 3 px around the disc.
- Readout line (`.readout`, as today, above the field): left `87 ALUMNI WITH A PUBLISHED ROLE · 121 COMPANIES · THE 20 BIG NAMES` (`ui.meta`, from `STATS`), right `HOVER OR TAP A LOGO` / `TAP A LOGO` with the legend `● FULL-TIME ○ INTERN`. Width ≤ `x1`.

### 3.4 States and motion

| state | discs | wires | mark | card |
|---|---|---|---|---|
| rest | tinted colour, ring `--line-2` | .22 | idle (`LEGACY_BRIGHTNESS`) | — |
| idle pulse | the reached disc's ring lights 400 ms | one pulse running | idle | — |
| selected (hover / focus / tap) | the one lit; the other 19 `opacity: .42` (labels too), 220 ms `--ease-out` | its wire lit + one pulse mark → disc (280 ms); the others .12 | one step brighter (`chain.set("active", true)`, as today) | shown beside the disc (§3.5) |
| leaving | all back over 220 ms, 400 ms after the pointer leaves the section / crosses into the mark's box (the `LEAVE_MS` + `onPointerMove` logic in `Legacy.jsx`, kept) | | | fades 200 ms |
| released (glide about to start) | nothing lights (`legacyOwns === false`, kept) | | | — |

Reduced motion: no pulses, no dimming transition (states swap at once), the card appears without its 6 px rise. Nothing moves the discs after the first layout except a resize.

### 3.5 The people reveal — `LegacyScreen.jsx` `variant="card"` (A)

Content from `companyPeople` (the `Tier1Company.people` rows):

- Head: disc 40 (lit), name (`fullName` as `title`), meta line `6 ALUMNI · 4 FULL-TIME · 2 INTERN` then the teams line (labels of the people's teams in `TEAM_ORDER`), `Site ↗`, `×`.
- Rows (`.person`, as today): photo 32 × 42, name, `2020 · APPDEV`, role line = `glyph` (● full-time / ○ intern) + `role` (or the kind in words when the role lacks it) + ` · Google DeepMind` (the unit, groups only) + ` · 2025` + ` · now` when `now`. No "also passed through" line any more — everyone is a row.
- Placement (`placeCard` in `Legacy.jsx`, simplified): candidates **left of the disc** (preferred — the mark is on the right), below, above, right; score = number of other discs the card would cover × 100 + distance moved by the clamp; clamp to the field (`0 ≤ left`, `left + w ≤ x1`, `0 ≤ top`, `top + h ≤ bodyH`). Card 320 wide, `max-height: min(100%, 520px)`, scrolls inside past 7 rows; the dotted lead from disc edge to card edge stays.
- Fade in 200 ms (`.screenOn`), out 200 ms; `role="region" aria-label="Alumni at Amazon"`, `aria-live="polite"`.

### 3.6 Invariants — the mark, the beam, the glide (do not break)

- `LEGACY_PLACE`, `LEGACY_FILL`, `LEGACY_BRIGHTNESS`, `LEGACY_ACTIVE`, `legacyMarkBox`, `createSwarmChain` — untouched. `home/LegacyStory.jsx`, `home/Spotlight.jsx`, `home/swarmChain.js`, `legacy/LegacySwarm.jsx` — not edited.
- The section keeps `id="legacy"`, `min-height: 100vh`, the chain contract (`chain.set("active", bool)` on selection, clearing on `legacyOwns === false`), and renders `LegacySwarm` only when standalone (`!chain && !narrow`), as today.
- No DOM element and no SVG stroke right of `x1` except the wires, which end at `rx` (10 px short of the mark box). Hover never calls anything on the swarm but the brightness step.

**Acceptance A4 (hand-off).** `SHOTS=0,0.25,0.5,0.75,1 node /tmp/v8cdp/cdp.mjs <home> /tmp/v8cdp/F4/chain.png 12000`: the mark's position and size in each frame match `/tmp/v8cdp/NA/chain-{0,0.25,0.5,0.75,1}.png` (overlay at 50 %: edges coincide within 2 px); the paper takes over at 1 as before. `WHEEL=-300` with `HOVER2=<Amazon disc>` — nothing lights after the release (`release-009.png` behaviour). The Work strip's beam: `SHOTS` over the strip's end as in `NA/beam-050.png` — the spot lands on the mark's centre.

### 3.7 Phones (≤ 759 px) and 760–1099 px

- **≤ 759**: `LegacyList` kept, simplified: the mark band under the head (as today), the readout (two lines), then **the 20 tier-1 rows** — disc 44 (tinted colour), name, `6 alumni` meta right — a tap opens the inline card under the row (`LegacyScreen variant="inline"`, same rows as §3.5); no "Also · n more" tag run. Under the list, the chapter link is in the head row already (it stacks on phones); nothing else.
- **760–1099** (the chain is live here, the mark in the right 44 % of the section): no fan — the same rows as the phone list in **columns 1–6** (one column, disc 40, 48 px rows, 20 rows ≈ 960 px; the section grows past 100 vh and the chain re-measures, which it already handles), the inline card under the open row, the mark untouched on the right. `useMedia("(min-width: 1100px)")` chooses the fan.

### 3.8 Accessibility (home)

- Discs are buttons in DOM order = display order (count desc), each with the count in its name; the card is `aria-controls`'d and `aria-live`; Escape closes and returns focus to the disc; Enter / Space on a lit disc moves focus into the card (the existing `onActivate` logic).
- The wires and pulses are `aria-hidden`; the badge is `aria-hidden` (the count is in the button's name).
- Contrast: label `--ink-2` on `--bg` ≥ 7:1; the badge's `--teal-ink` on `--teal` ≥ 10:1; dimmed discs at .42 are decorative while another is lit (their names remain in the accessibility tree at full value).
- `prefers-reduced-motion`: §3.4.

---

## 4. The /legacy page — two lists (B)

`pages/LegacyPage.jsx`: head → Companies → Alumni → Year by year. Everything in `legacy/page/`; styles in `legacyPage.module.css` (prune what Paths / Steps / the floating card used; it is 1247 lines and should end ≤ 700).

### 4.1 Head

As today (`ui.pageHead`, the dim mark behind the right half via `LegacySwarm placement={HEAD_MARK}`), lede → **"{164} alumni from the {2017}–{2023} batches, the {121} companies they went to, and who they are."** Then `Readout` with **four** counters (drop "Stayed after an internship"): `164 ALUMNI TRACED` · `87 WITH A PUBLISHED ROLE` · `121 COMPANIES` · `61 / 26 FULL-TIME / INTERN` (`STATS`). Under it a jump row (`ui.meta` links, `--ink-3` → `--ink` on hover): `Companies ↓ · Alumni ↓ · Year by year ↓` to the three section ids.

### 4.2 Companies (`page/Companies.jsx`, rewritten) — `section#v8-legacy-companies`

h2 **Companies**, lede "Every company a DVM alum has worked at, and everyone who was there — intern or full-time."

Controls row (one line ≥ 1100, wraps below; all `role="group"`-labelled):
- **Filter** input (`ui.input`, 280 px, placeholder "Filter companies", `aria-label`), matches `name` / `fullName`, case-insensitive, instant.
- **Sort** chips (`aria-pressed`): `Alumni` (default: `COMPANIES` order) · `A–Z`.
- **Show** chips: `All` · `Tier 1` (`c.tier === 1`, label shows the count `Tier 1 · 20`) · `Full-time` (`c.fullTime > 0`) · `Internships` (`c.intern > 0`).
- Right: `{n} OF 121 · ● FULL-TIME ○ INTERN` (`aria-live="polite"`).

List: **all matching companies, no "show all" button** (the user asked for the comprehensive list). 3 columns ≥ 1100, 2 at 760–1099, 1 below; items go to columns in turn (left to right) as today. Row (56 px, hairline under):

```
[disc 40]  Amazon                      6   ●4 ○2
```

`name` (`--t-strong`, ellipsis, `title=fullName`), count (`--t-strong`, `--ink`), the kind split in `ui.meta` with the glyphs (`page/PersonCard.jsx`'s `Glyph`). Button: `aria-expanded`, `aria-controls`, `aria-label="Amazon: 6 alumni, 4 full-time, 2 intern"`. Open (click / Enter): the people under the row, spanning the column — `PersonRow` for each of `companyPeople(c)` with the role line `glyph + role + year + " · now"`; then `Site ↗`. One open per column (today's `Map` by column). Opening a row that is open closes it. Disc lit while open; row hover = name → `--ink`.

### 4.3 Alumni (`page/Alumni.jsx`, new) — `section#v8-legacy-alumni`

h2 **Alumni**, lede "All {164} of us, batch by batch: where each went, and how to find them."

Controls (two rows at 1440, as Paths had them, reusing its chip styles):
- **Search** (`ui.input`, 320 px, "Search a name or company") → `search(q)`.
- **Batch** chips: `All` · `2017` … `2023` (`BATCHES`).
- **Team** chips: `All` · the five (`TEAMS`).
- **Role** chips: `All` · `Full-time` (latest.kind) · `Intern` · `No public role` (`latest === null`).
- `{n} OF 164 · {m} WITH A PUBLISHED ROLE` (`aria-live="polite"`); an empty result shows "Nobody matches — clear a filter." with a `Clear` button.

Groups by batch, ascending (hidden when empty): h3 `2018` (`--t-sub`) + meta `22 ALUMNI · 16 WITH A PUBLISHED ROLE`. Within a group, `PEOPLE` order (team, name). Cards in a grid: 3 columns ≥ 1100, 2 at 760–1099, 1 below; `gap: 1px` with hairline borders (a table feel, not floating cards).

Card (min-height 76 px, `padding: var(--s-3) var(--s-4)`):

```
[photo 40×53]  Mohul Maheshwari                                  [in]
               DESIGN
               [disc 18] Google DeepMind · Software Engineer ● 2025
               PREVIOUSLY  Amazon · Walmart
```

- Name `--t-strong`; team `ui.meta`.
- Latest line (`ui.small`): the company's `LegacyCircle` at 18 px (grey; lit on card hover), `company.name · role` (role from `format.js roleOf`, i.e. the kind in words when there is none), the kind glyph, the year when known. Nobody's earlier steps are listed as a timeline.
- `PREVIOUSLY` (`ui.meta`, `--ink-3`): `previousCompanies(p)` names, up to 3, `+n` after; omitted when none.
- No published role (`latest === null`): the latest line reads **"No public role yet"** in `--ink-3` (one phrase for both `unconfirmed` and `none`; the research's confidence tiers are not a public fact), no previously line. They stay in the list — the user wants the list of alums — and the `No public role` chip isolates them.
- LinkedIn icon (`LinkedIn` from `PersonCard.jsx`) top-right; a blank slot when none.
- No hover card, no expansion. The whole card is static; only the LinkedIn link is interactive.

Phones: one column; chips wrap in two rows; the photo 36 × 48.

### 4.4 Year by year

Unchanged (`FoldTimeline`, the closing row with "All projects" / "Open the archive →").

### 4.5 Accessibility (page)

Headings h1 → h2 (Companies, Alumni, Year by year) → h3 (batches). Chips: `button aria-pressed` in a `role="group" aria-label`; the search inputs labelled; counts `aria-live="polite"`; expanded company rows `aria-expanded` + `aria-controls`; the people list under a row is a `region` named "Alumni at Amazon"; tab order follows reading order; focus-visible rings on every control (`outline: 2px solid var(--teal); outline-offset: 2px`). Reduced motion: the readout's count-up is already skipped; nothing else animates but the reveal fades (`useReveal`), which GSAP skips under reduced motion.

---

## 5. Visual language (both)

Dark floor, the room's grid through everything (`ui.panel` material, translucent), teal only for signal (wires, badge, lit ring, chip's on-bar), mono `ui.meta` labels uppercase, Hubot Sans for names, the chapter skeleton of `research/v8-cohesion.md` §3 (title slot, one forward link in the head row, `--section` rhythm). Logo colour is the one new colour: tinted at rest on the home discs (§3.3), grey at rest everywhere else (page rows, cards) and full when lit — the page lists are reference material, the home wall is the headline.

---

## 6. Files — who owns what

**A (data + home)**
- edit: `legacy/alumniData.js`, `legacy/Legacy.jsx`, `legacy/Legacy.module.css`, `legacy/LegacyScreen.jsx`, `legacy/LegacyList.jsx`, `legacy/LegacyCircle.jsx`, `legacy/LegacyCircle.module.css`, `scripts/build-legacy-alumni.mjs`, `legacy/alumni.json` (generated).
- new: `legacy/fanLayout.js`, `legacy/LegacyFan.jsx`, `legacy/LegacyFan.module.css`, `public/assets/legacy/logos/d-e-shaw.svg` (or `.png`).
- delete: `legacy/LegacyNet.jsx`, `legacy/LegacyNet.module.css`, `legacy/netLayout.js`, `legacy/netCanvas.js`.
- not touched: `legacy/LegacySwarm.jsx` + css, `home/*`, `research/v8-legacy-net.md` (superseded by this file; leave it).

**B (page)**
- edit: `pages/LegacyPage.jsx`, `legacy/page/Companies.jsx`, `legacy/page/Readout.jsx`, `legacy/page/PersonCard.jsx` (keep `Glyph`, `Photo`, `LinkedIn`, `PersonRow`; delete the default `PersonCard` timeline card), `legacy/page/legacyPage.module.css`, `legacy/page/format.js` (unchanged unless needed).
- new: `legacy/page/Alumni.jsx`.
- delete: `legacy/page/Paths.jsx`, `legacy/page/Steps.jsx`.
- imports from A: `alumniData` (§2 interface), `LegacyCircle`, `LegacySwarm` — read-only.

B starts against the §2 interface at once; A lands `alumniData.js` first (A1, before any home work) so B's dev build is green within the first hour. If A must change the interface, it edits this file's §2 and tells B; B never edits `alumniData.js`.

---

## 7. Work items, in order, with acceptance

Every acceptance is a screenshot or a cdp eval on the dev server (`npm run dev`, `/v/v8` and `/v/v8/legacy`) at 1440 × 900 unless stated; file names under `/tmp/v8cdp/F4/`.

**A1 · Data.** §2 implemented; old exports gone; `grep -rn "NET_COMPANIES\|EDGES_LATEST\|EDGES_HISTORY\|transitions(\|ALUMNI_COUNT" src/` empty. Acceptance: §2.4's eval (`a1-data.json`).

**A2 · Logos.** D. E. Shaw file + LOGOS entries (§1.2), WorldQuant → monogram, `--glyph-w/-h` in `LegacyCircle`. Acceptance: `/tmp/v8cdp/F4/probe/logos.html` is self-contained (it sits next to copies of every logo and the D. E. Shaw wordmark; refresh the copies after A2); serve it with `python3 -m http.server 8765 --bind 127.0.0.1` from the probe dir (no installs; `file://` blocks the CSS masks) and shoot `http://127.0.0.1:8765/logos.html` to `a2-logos.png`: all 20 tier-1 logos legible at 64 px, D. E. Shaw's initials readable, Samsung / Goldman / AmEx wider than before.

**A3 · The fan.** `fanLayout.js` + `LegacyFan.jsx` + `Legacy.jsx` wiring; `LegacyNet*`, `netLayout`, `netCanvas` deleted. Acceptance `a3-rest.png` (`WHEEL=-156`: Legacy's head at y 90): 20 discs with badges and names, four visible arcs, wires fading short of the mark, no label overlap; and `a3-geom.json` from an eval that reads every `[data-node]` button's rect, every `line`, the body rect and the mark box (`legacyMarkBox` via `window.__v8LegacyGeom` that Legacy exposes in dev only): asserts (1) all 20 node footprints inside the field, (2) no two footprints intersect, (3) every disc's right edge ≤ body.left + x1, (4) every wire's end x ≤ body.left + rx, (5) for every wire, every *other* disc centre ≥ r + 8 px from the segment. Repeat at `VW=1280 VH=800` (`a3-1280.png`) and `VW=1920 VH=1080` (`a3-1920.png`) — same five assertions.

**A4 · States, card, hand-off.** §3.4–3.6. Acceptance: `a4-amazon.png` (`HOVER` on Amazon's disc): card left of the disc with 6 rows (4 ●, 2 ○, "now" on five), the wire lit, the other 19 at .42, the mark unmoved vs `a3-rest.png` (overlay within 2 px); `a4-key.png`: Tab to the 3rd disc lights it, Enter moves focus into the card, Escape returns it (eval `document.activeElement.getAttribute("aria-label")`); `a4-leave.json`: pointer moved into the mark's box → selection cleared after ≤ 500 ms; the §3.6 chain / beam checks (`a4-chain-*.png`, `a4-release.png`, `a4-beam-050.png`).

**A5 · Phones and 760–1099.** `VW=390 VH=844 DPR=2`: `a5-m-rest.png` (band, readout, 20 rows), `a5-m-open.png` (a tap opens the inline card with the kind glyphs); `VW=1024 VH=768`: `a5-1024.png` (rows in the left half, the mark on the right, nothing overlapping the mark box).

**A6 · Reduced motion.** Emulate `prefers-reduced-motion: reduce` (cdp `Emulation.setEmulatedMedia`): `a6-rm-rest.png` after 8 s shows no pulse dot; `a6-rm-hover.png` the lit state without transition artefacts. Lint clean (`npx eslint src/variants/v8/legacy` — eslint is already a dev dependency; do not install anything).

**B1 · Page skeleton + head.** `LegacyPage.jsx` restructured, `Readout` to four counters, jump row; Paths / Steps / PersonCard-card deleted; build green with A1 (or a local stub of §2 until A1 lands — delete the stub before finishing). Acceptance `b1-head.png`: h1, lede with the three numbers, four counters, jump row.

**B2 · Companies.** §4.2. Acceptance `b2-list.png` (121 rows in three columns, the first seven in `COMPANIES` order: Amazon 6, Simplismart 5, UnifyApps 3, Cisco 3, Credit Suisse 3, Microsoft 3, Samsung R&D 3); `b2-open.png` (Amazon open: 6 people rows with ● / ○ and "now"); `b2-tier1.png` (Tier 1 chip: 22 rows — the 18 single ids plus both units of each merged group: Samsung R&D, Samsung Semiconductor, Google, Google DeepMind); `b2-filter.png` ("gold" typed → Goldman Sachs only); `b2-az.png`.

**B3 · Alumni.** §4.3. Acceptance `b3-list.png` (2017 group with 1 card, 2018 with 22; cards show photo, name, team, latest line, previously, LinkedIn); `b3-norole.png` (`No public role` chip → 77 cards, each reading "No public role yet"); `b3-search.png` ("amazon" → the 6); `b3-team.png` (Design → counts match `PEOPLE.filter(p => p.teamId === "design").length`); `b3-empty.png` (batch 2017 + Video → the empty state with Clear).

**B4 · Phones.** `VW=390 VH=844 DPR=2`: `b4-m-head.png`, `b4-m-companies.png` (one column, chips wrapped, a row open), `b4-m-alumni.png`.

**B5 · Keyboard + screen reader.** `b5-kb.png`: Tab through the controls to the first company row, Enter opens it, focus ring visible; eval of the headings outline (`[...document.querySelectorAll("h1,h2,h3")].map(h => h.tagName + " " + h.textContent)`) = h1 Legacy, h2 Companies, h2 Alumni, h3 2017 … h3 2023, h2 Year by year. Lint clean.

**B6 · Prune.** `legacyPage.module.css` ≤ 700 lines with no selectors for deleted markup (`grep -c "paths\|steps\|cardFloat\|track" …` → 0); `page/` has `Alumni.jsx Companies.jsx PersonCard.jsx Readout.jsx format.js legacyPage.module.css` only.

**Both, last.** Full-page sweeps `f-home-*.png` (`SHOTS=-1,0,0.5,1,1.5`) and `f-page-*.png` (every 900 px) for the user's review; `/tmp/v8cdp/prof-*` removed; Chrome processes you started killed.

---

## 8. Risks and non-goals

- **Counts are small.** The badges read 6, 4, 3, 3, 3, 2 … 1. That is the honest data (87 published roles). Do not pad with medium-confidence research; the user can flip `MIN_CONFIDENCE` later.
- **Logo rights.** Everything is CC0 / public-domain text logos / favicons already in the repo; D. E. Shaw's is a text logo from Commons. No Clearbit, no scraping.
- **Credit Suisse** is in the data as a destination of three alumni; it is shown as the data says, no footnote.
- Not in scope: medium-confidence people, company "now vs ever" bars on the home, per-person timelines anywhere, any change to the swarm, the chain, the Spotlight, the timeline, or the menu.
