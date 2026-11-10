# V8 · Hologram — Legacy as a network, done properly (home section + the /legacy page)

Spec for two Opus engineers working in parallel: **A** builds the home Legacy network and the shared data module, **B** builds the /legacy page on top of A's data interface. No file is touched by both (§15). Everything lives in `src/variants/v8/`; no new packages, no installs, no downloads without asking. Don't run vercel, don't commit; the user deploys after review.

Measured on the live build at 1440 × 900, DPR 1 (`/tmp/v8cdp/cdp.mjs`; `/tmp/v8cdp/LA/drive.mjs` for hover / tap / key sequences). Reference screenshots: old network design `/tmp/v8cdp/F2/lh-00000.png`, `lh-hover-204x345@300.png`; current tray + screen `/tmp/v8cdp/F3/live-rest.png`, `live-hover.png`, `live-phone.png`. Save new ones to `/tmp/v8cdp/F3/`.

---

## 0. What the user said, and what this round does

- Round 10 (old): a "neural net" of logo circles over the particle mark, the mark re-forming into the hovered company's name. User: the mark looked bad and got distorted on hover.
- Round 11 (current): a tray of rows + a wall of 100 discs, a people panel on the right over the dimmed mark. User now: **"The neural net idea is fine. I think it requires better execution for the alumni and legacy part so try implementing that."** And from round 11: when a company is hovered, **the people at that company must be shown**, or a unique design for it.
- Scope update: the data is being extended to batches **2017–2023** with each person's **latest** experience (job, else latest internship) and their history (`research/v8-alumni-v2.json`, §2). And: **"the legacy page should not just be a copy of the hero section … add more details and a better way to represent things there."**

So:

1. **Home Legacy = the network, rebuilt** (§1–§13). Companies and alumni as a real graph over honest data, the DVM mark as the network's source — *never* morphed, dimmed or displaced by hovering. Hovering a company lights its people along their wires and raises a card with their faces.
2. **/legacy = its own page** (§14): a readout, every alum's career path on a time axis with filters and search, a company directory, then the existing year-by-year strip.
3. **One data module** (§2) with a frozen interface, built first by A, consumed by B.

What is kept from round 11 because it is good: the data pipeline and logo set, `LegacyCircle` (grey at rest, colour when lit, monogram fallback), the people rows of `LegacyScreen` (photo, name, batch · team, role, LinkedIn), the selection model in `Legacy.jsx` (hover selects, leaving the section clears after 400 ms, focus/Escape/quiet-focus, tap-outside on touch), `LegacySwarm`, the chain and the glide.

---

## 1. Concept — "the signal leaves the mark"

The projector idles on the department's own slide: the DVM mark in dust, on the right, exactly where it is today. Out of its glow, to the left, hangs the **network**: every alum is a **neuron** — a small teal dot — and every company they went to is a **node** with its name. Each neuron is wired to one company (their latest step). The companies most alumni went to are the big nodes with logos; the long tail is small nodes with mono names. Nothing is wired to the mark at rest; the mark is whole and still.

Then it comes alive: every couple of seconds a **signal** leaves the mark — a bright point that runs along a hairline (the neuron's **root**) from the edge of the glow to one neuron, then on along its wire to the company, which brightens for a moment and settles. Hover a company and the signal is yours: the rest of the net dims, the company's neurons light, their roots draw in from the mark, pulses run mark → neuron → company, and a **card** rises beside the node with the people — faces, names, batch · team, role, LinkedIn. Hover a neuron and you see one person: name, where they are now, where they were before (their history, as ghost wires).

Reading direction is right → left (mark → people → companies): the mark is the source, the companies are the output layer. That is the neural-net picture — an input layer, a hidden layer, an output layer, weighted wires, signals — without any of it touching the mark.

Why this beats both earlier rounds: it is a network (what the user asked for) built from 110+ real companies and 110–130 real people with hierarchy (size = head-count, labels by tier), the people reveal is literal (the neurons *are* the people, the card names them), and the mark cannot be disturbed because hover changes nothing about the swarm except one brightness step.

---

## 2. Data — the shared module (workstream A, built first, interface frozen)

### 2.1 Sources and pipeline

- Source of truth: `research/v8-alumni-v2.json` (being written by the research agent). Expected shape: `people[] { id, name, batch, team, latest { company, kind: "intern" | "full-time", role, year }, history[] (same shape), confidence }`, `companies[]` aggregated. Until it exists, `research/v8-alumni-companies.json` (the round-11 source) is adapted into the same normalised shape so nobody is blocked.
- `scripts/build-legacy-alumni.mjs` (A): read v2 if present, else adapt the old file (each old `companies[]` entry becomes one `history` item of kind `intern` if `intern: true` else `full-time`, year unknown; `latest` = the full-time entry if any, else the only/first entry). Keep `MIN_CONFIDENCE = "high"` (one constant; flip to include `medium` if the user asks). Resolve the research `id` → TeamInfo name as today. Attach logos from the `LOGOS` table as today; new companies without a file get the monogram — **do not download anything new without asking the user**. Write **`src/variants/v8/legacy/alumni.json`** in the normalised shape:

```json
{
  "generatedAt": "2026-11-08", "source": "research/v8-alumni-v2.json",
  "batches": [2017, 2018, 2019, 2020, 2021, 2022, 2023],
  "companies": [{ "id": "amazon", "name": "Amazon", "fullName": "Amazon", "url": "https://amazon.com", "logo": { "src": "/assets/legacy/logos/amazon.svg", "kind": "glyph", "color": "#FF9900" } }],
  "people": [{ "name": "Mohul Maheshwari", "confidence": "high",
               "latest":  { "companyId": "walmart", "kind": "full-time", "role": "SDE-2", "year": 2024 },
               "history": [{ "companyId": "walmart", "kind": "full-time", "role": "SDE-2", "year": 2024 },
                           { "companyId": "amazon",  "kind": "full-time", "role": "SDE-1", "year": 2022 },
                           { "companyId": "google-deepmind", "kind": "intern", "role": "Research Intern", "year": 2021 }] }]
}
```

`history` is newest first and includes `latest` as its first item. `year` may be null. `batch`/`team` come from the team record (below), not from the research file (it only carries the name used to resolve).

### 2.2 `legacy/alumniData.js` — the interface B codes against

The only module that knows `alumni.json`'s shape. People resolve to `immersive/data` team records by trimmed name (slug, photo, batch, vertical → label via `verticals`, LinkedIn), unresolved ones skipped with one dev warning, companies left with nobody dropped. Exports (all plain, frozen arrays/maps; sort orders are part of the contract):

```js
/** @typedef {{ companyId: string, company: Company, kind: "intern"|"full-time", role?: string, year?: number|null }} Experience */
/** @typedef {{ slug, name, photo, batch: number, teamId, team, linkedin?, confidence,
 *              latest: Experience|null, history: Experience[] /* newest first, includes latest */ }} Person */
/** @typedef {{ id, name, fullName?, url?, logo?,
 *              latest: Person[]  /* people whose latest step is here; batch desc, name */,
 *              ever: Person[]    /* anyone with any experience here; batch desc, name */,
 *              tier: 1|2         /* 1: latest.length >= 2 */,
 *              teams: string[]   /* labels of latest people's teams, TEAM_ORDER */,
 *              batches: [min, max] /* of latest people */ }} Company */

export const PEOPLE;          // Person[] — batch asc, TEAM_ORDER, name
export const COMPANIES;       // Company[] — latest.length desc, ever.length desc, name  (includes companies with ever.length > 0 but latest.length === 0)
export const NET_COMPANIES;   // Company[] — COMPANIES with latest.length > 0 (the home network's nodes)
export const PERSON_BY_SLUG;  // Map
export const COMPANY_BY_ID;   // Map
export const EDGES_LATEST;    // { slug, companyId, kind, role }[] — exactly one per person with a latest
export const EDGES_HISTORY;   // { slug, companyId, kind, role, year }[] — every experience
export const BATCHES;         // number[] asc (from alumni.json)
export const TEAMS;           // { id, label }[] in TEAM_ORDER
export const STATS;           // { people, withLatest, companies, netCompanies, fullTime, intern (kinds of latest),
                              //   internedThenJob, stayedAfterInternship, moves (EDGES_HISTORY.length) }
export function transitions(); // for every person with ≥ 2 history items, consecutive pairs (older → newer):
                               // { slug, from: Experience, to: Experience, sameCompany: boolean }[]
export function search(q);    // Person[] whose name or any experience company name includes q (case-insensitive)
```

`ALUMNI_COUNT` (today) = `STATS.people`; keep it as an alias for one round. Acceptance (A1): `node`-free check in the browser — `import('/src/variants/v8/legacy/alumniData.js')` in dev prints `STATS` with `people === withLatest + (people without latest)`, `EDGES_LATEST.length === STATS.withLatest`, no `console.warn` on the production set.

Today's numbers for sizing (old data): 110 companies, 82 people, 134 experiences, 13 companies with ≥ 2 people, 37 people with ≥ 2 companies. With v2 expect ~110–130 people with a latest step, ~80–100 net companies, ~15–20 of tier 1. Everything below is parameterised on those counts, not hard-coded.

---

## 3. Home section — geometry (≥ 1100 px; numbers at 1440 × 900)

```
section#legacy.sec.container  min-height: 100vh; overflow hidden; isolation; flex column; data-light="74% 62% 30vw" (unchanged)
  .wrap.inner
    ui.headRow                h2 "Legacy" · lede · "Our legacy →" (cols 9–12)          y 90 … 198
    .body (position relative; flex 1; margin-top 48)                                   y 246 … 810  (564 tall)
      .readout   (absolute, top 0, left 0 / right of field)  mono meta line + hint       y 246 … 262
      canvas.wires  (absolute inset 0; DPR-aware)             wires, roots, pulses, glows
      .nodes        (absolute inset 0)                        company buttons, neuron buttons, labels
      LegacyScreen  variant="card"                             the anchored people card
```

The mark (swarm) stays exactly where round 11 put it: `LEGACY_PLACE = { x0 .52, y0 .26, x1 .96, y1 .98 }`, `LEGACY_FILL .88` → at 1440 × 900 the formed mark is 570 × 439 px, centre (1066, 558), **bounding box x 846–1285, y 273–843**. Export the maths once so both the layout and the card clamp use it — `home/swarmChain.js` (A):

```js
/** The formed mark's box inside a Legacy section of w × h px (what LegacyStory/LegacySwarm will draw). */
export function legacyMarkBox(w, h) { const m = markRect(LEGACY_PLACE, LEGACY_FILL, LOGO_ASPECT, w, h); const mw = m.h * LOGO_ASPECT; return { left: m.cx - mw/2, right: m.cx + mw/2, top: m.cy - m.h/2, bottom: m.cy + m.h/2, cx: m.cx, cy: m.cy, w: mw, h: m.h }; }
```

(`LOGO_ASPECT` from `immersive/shared/logo`.) `Legacy.jsx` measures the section (`ResizeObserver`) and derives, in body coordinates:

- **field** (where company nodes live): `x0 = 0`, `x1 = markBox.left − bodyLeft − 86` (= 760 at 1440), `y0 = 20` (under the readout line), `y1 = bodyH − 8`.
- **neuron wall**: `nx1 = markBox.left − bodyLeft − 40` (= 806). Neurons never pass it.
- **root end**: `rx = markBox.left − bodyLeft − 10` (= 836): roots stop here and fade over their last 24 px into the glow. **No DOM element and no drawn line ever enters the mark's box.** The card clamps to `x1` too.

On the /legacy page nothing from this section is used (§14); `Legacy.jsx` keeps its `link / id / head / className` props for safety but `pageMode` CSS can go.

---

## 4. Layout algorithm — `legacy/netLayout.js` (A)

A small deterministic force layout (no d3; ~150 lines), run synchronously in a `useMemo` keyed by the field size rounded to 8 px and the data; ~30 ms for 230 nodes. Same inputs → same output (seeded RNG). On resize it re-runs and nodes snap (no tween; resizes are rare).

**Inputs.** `NET_COMPANIES` (nodes `c`), `EDGES_LATEST` (neurons `p`, one per person, wired to one company), field `{x0,y0,x1,y1}`, `nx1`, label widths (measured once with an offscreen canvas `measureText`: tier-1 `600 16px Hubot Sans` + 28 px for the `×n`, tier-2 `400 12px JetBrains Mono`, capped at **120 px** — longer names ellipsise in CSS; `fullName` shows on the card).

**Sizes.** Company radius `r = tier === 1 ? 18 + 2 × min(latest.length − 2, 5) : 3.5` (×2 → 18, ×3 → 20, ×4 → 22, ×5 → 24, ×6 → 26, cap 28). Each company's **footprint box** = disc ∪ label: label sits to the LEFT of the disc, vertically centred: `[x − r − 8 − labelW, x + r] × [y − lh/2, y + lh/2]`, `lh = 20` (tier 1) / `14` (tier 2), plus 4 px padding all round. Neurons have radius 2.5 and no label.

**Seed and initial positions** (`mulberry32(20261108)`): companies sorted by (dominant team rank in `TEAM_ORDER`, −latest.length, name); `c.x = tierX[c.tier] + rnd(−60, 60)`, `c.y = y0 + (i + 0.5) / n × (y1 − y0)`. `tierX[1] = x0 + 0.78 × fw`, `tierX[2] = x0 + 0.40 × fw` (`fw = x1 − x0`). Neurons start at `(c.x + 36 + rnd(−6, 6), c.y + rnd(−10, 10))`.

**Team bands.** Five horizontal bands, `TEAM_ORDER` top → bottom, each `(y1 − y0) / 5` tall; `bandY(team)` = its centre. A gentle gravity (below) groups the five teams into strata — the net's "layers" are the teams, which ties Legacy back to Five teams without labelling anything.

**Iterate 300 times**, `alpha = 0.9 × 0.985^i` (ends ≈ 0.01), velocities damped ×0.55 each step, positions += v:

| force | pairs / targets | formula |
|---|---|---|
| repulsion | company–company | `F = 2600 × alpha / max(d², 300)` along the offset; `d` between centres |
| repulsion | company–neuron, neuron–neuron | `900 × alpha / max(d², 120)`, `350 × alpha / max(d², 60)` |
| spring | each neuron ↔ its company | rest `L = r + 24` (tier 1) / `26` (tier 2), `F = 0.08 × (d − L)` toward rest |
| gravity x | company → `tierX[tier]` | `0.025 × (tx − x)` |
| gravity x | neuron → `company.x + r + 26`, plus a pull to the mark | `0.05 × (tx − x)` + `0.004 × (nx1 − x)` |
| gravity y | company → `bandY(dominant team)`; neuron → `bandY(own team)` | `0.012 × (ty − y)` |

After each step, **hard constraints**: (1) clamp companies to `x ∈ [x0 + labelW + r + 8, x1 − r]`, `y ∈ [y0 + lh/2 + 4, y1 − lh/2 − 4]`; neurons to `x ∈ [x0 + 20, nx1]`, `y ∈ [y0 + 4, y1 − 4]`. (2) **Box separation** for every company pair whose footprint boxes (padded) overlap: push both apart by half the overlap along the axis of smaller overlap (the standard AABB resolve). Run the separation pass twice per step after iteration 150 (when alpha is low) so the end state has **zero overlapping labels**. (3) A neuron inside a company's disc (any company, `d < r + 4`) is pushed out radially.

**Density rule.** `areaPerCompany = fw × (y1 − y0) / n`. If `< 2600 px²` (narrow 760–1099 layouts), tier-2 labels are **hidden at rest** (`data-dense` on `.nodes`; labels show on hover/focus/selected, and the dot grows to r 4.5 so it is findable). At 1440 (≈ 736 × 544 / 100 ≈ 4000 px²) labels are on.

**Output.** `{ companies: [{ id, x, y, r, labelW, labelSide: "left" }], neurons: [{ slug, companyId, x, y }], dense }`, coordinates rounded to 0.5 px. Acceptance (A2): an eval over the rendered DOM finds **0 pairs of overlapping `[data-label]` rects**, every `[data-node]` rect inside the body, `max(right) of [data-neuron] ≤ markBox.left − 40 + 3`, min centre distance between companies ≥ 24 — at 1440 × 900, 1280 × 800 and 1920 × 1080.

If the engineer finds the field too even (a lattice look), raise the position jitter to ±90 and lower gravity x to 0.018; if too clumpy, raise company repulsion to 3200. One of those two knobs, not both.

---

## 5. Visual specs (rest)

Palette: `--ink #f2f5f7`, `--ink-2 #a9b2b8`, `--ink-3 #6c767d`, `--teal #45e6ff`, `--line`, `--line-2`, `--bg-2`. Nothing in brand colour at rest (cohesion D6); logos use `LegacyCircle`'s grey treatment.

**Readout line** (top of body, mono `.meta`): left `{STATS.withLatest} ALUMNI · {NET_COMPANIES.length} COMPANIES · {STATS.fullTime} FULL-TIME · {STATS.intern} INTERN`; right (at the field's right edge) `HOVER OR TAP A COMPANY` (`(hover: none)`: `TAP A COMPANY`). A 4 px legend inline after the hint: `● FULL-TIME  ○ INTERN` using the neuron glyphs.

**Company node, tier 1** (`button.node.t1`, absolute at `x − r, y − r`, size `2r`): `LegacyCircle` at `--node: 2r` (grey logo/monogram, `--bg-2` fill, `--line-2` ring). Label (`span.label`, absolute, right edge at `x − r − 8`, vertically centred): name in `font: var(--t-strong) var(--f-sans)` (600 16 px) `--ink-2`, then `span.count` `.meta` `×{latest.length}` `--ink-3` with 6 px gap; one line, ellipsis at 120 px (the label box the layout reserved).

**Company node, tier 2** (`button.node.t2`): a 7 px dot (`r 3.5`) `rgba(242,245,247,0.5)`, no ring. Inside the button a `LegacyCircle` at 28 px exists but is `transform: scale(0.25); opacity: 0` — it blooms on hover (§6). Label: `font: var(--t-mono) var(--f-mono)` (12 px) `--ink-3`, same placement. Hit area: the button is 24 × 24 centred on the dot (padding), so the dot is easy to hover.

**Neuron** (`button.neuron`, 16 × 16 hit box centred on `(x, y)`, `tabIndex -1`, `aria-hidden`): a 5 px dot. `kind === "full-time"`: filled `rgba(69,230,255,0.62)`; `intern`: 1 px ring, same colour, hollow. `box-shadow: 0 0 8px rgba(69,230,255,0.22)`.

**Wires** (canvas): neuron → company disc edge (end the line at `r + 2` from the company centre so it meets the ring, not the logo). 1 px. Full-time: solid `rgba(242,245,247,0.16)`; intern: dashed `[2, 3]`, `rgba(242,245,247,0.14)`. Tier-1 wires `0.18`. Drawn once; the canvas is only redrawn while something animates.

**Roots** (canvas): invisible at rest (alpha 0). Geometry: from the neuron, a straight line to `(rx, y′)` where `y′ = lerp(neuron.y, markBox.cy − bodyTop, 0.35)` — roots converge slightly toward the mark's centre like rays into a lamp — with the last 24 px fading to 0 (`createLinearGradient`). When drawn: `rgba(69,230,255,0.42)` at the neuron → `0.14` at the fade start.

**Signal pulse** (canvas): a 3 px radius disc `#45e6ff` with `shadowBlur 10, shadowColor rgba(69,230,255,0.9)` and a 36 px tail (gradient from `rgba(69,230,255,0.5)` to 0) behind it; speed **900 px/s**, constant.

**Company glow when lit** (DOM): disc `box-shadow: 0 0 0 1px rgba(69,230,255,0.35), 0 0 18px rgba(69,230,255,0.25)`; logo in colour (`LegacyCircle .lit`); label `--ink`; count `--ink-2`.

The old `Legacy.module.css` tray/chips/thread blocks go; the screen/card/people blocks stay (§8).

---

## 6. States

| state | field | the company | its neurons & wires | roots | mark |
|---|---|---|---|---|---|
| **rest** | all nodes/labels at their rest opacity (1) | — | — | hidden | `LEGACY_BRIGHTNESS 0.5`, idle sway |
| **booting** (first in view, §7) | wavefront from the mark leftward | — | wires draw in | 12 random roots fire once | unchanged |
| **idle** (in view, nothing hovered) | rest | the fired company brightens 0.6 → 1 for 600 ms | one neuron lights for 600 ms | one root fires at a time | unchanged |
| **hover / focus / selected company** | everything unrelated → opacity **0.22** (nodes, labels, wires); related 1 | lit (§5 glow), tier-2 dot blooms into its 28 px disc (160 ms), label `--ink` | neurons 5 → 8 px, alpha 1, glow `0 0 14px rgba(69,230,255,.55)`; wires `rgba(69,230,255,0.85)` 1.25 px | all its roots draw in (dash 0 → 1 over 240 ms, staggered 40 ms) and one pulse runs mark → neuron → company per neuron (staggered 60 ms) | `LEGACY_ACTIVE 0.58` (one step brighter — the source fires) |
| **hover neuron** (pointer only) | unrelated → 0.35 | its company lit; its **history** companies (if present in the net) at 0.8 with a dashed teal ghost wire `[3,4]` `rgba(69,230,255,.45)` from the neuron; a history company not in the net appears as a ghost label (mono, `--ink-3`, 0.7) 14 px below the tooltip | this neuron 8 px lit | its root draws in, one pulse | unchanged |
| **card open** | as hover | as hover | as hover; hovering a row in the card lights that neuron to 10 px and its ghost wires | as hover | `LEGACY_ACTIVE` |
| **released** (chain `legacyOwns` → false) | rest | cleared | cleared | hidden | brightening for the glide (LegacyStory) |

Transitions 200 ms `var(--ease-out)` on opacity/transform/colour (DOM); canvas alphas lerp over 200 ms. Leaving a node does **not** clear (the reader must reach the card); leaving the section clears after 400 ms (existing `LEAVE_MS`); Escape clears; focus leaving the section clears; on touch a tap outside clears (all existing in `Legacy.jsx`).

**Neuron tooltip** (`div.tip`, `role="tooltip"`, `ui.panel` at 8 px padding, max-width 260): `span.strong` name · `.meta` `{batch} · {TEAM}` · line 2 `.small` `{latest.role ?? kind} · {company.name}{year ? ` · ${year}` : ""}` · line 3 (if history > 1) `.meta` `BEFORE · {history[1..].map(c.name).join(" · ")}` (max 3, then `+k`). Positioned above the neuron (below if `y < 80`), clamped to the body. Pointer only; keyboard users get the people in the card.

---

## 7. Motion

- **Boot** (once, when `.body` crosses 70 % of the viewport, `IntersectionObserver`): nodes start at `opacity 0; transform scale(.6)`, labels at 0, wires undrawn. Each company's delay = `(x1 − c.x) / fw × 600 ms` (nearest the mark first — the signal spreads out of the mark), 500 ms `var(--ease-out)` to rest; its neurons 100 ms later; its wires draw (dash 0 → 1, 300 ms) 150 ms later. Over the boot's last 1.6 s, **12 roots fire** in sequence (120 ms apart, random neurons, seeded) — the hello. Total ≈ 2.4 s. Reduced motion: everything is simply there.
- **Idle firing** (while in view, nothing hovered/selected, document visible): every `2.4 s ± 1.2 s` (seeded) one random neuron fires: pulse mark-edge → neuron along its root (root alpha rises to 0.35 ahead of the pulse and decays to 0 over 800 ms behind it), then neuron → company along the wire (wire to `0.6` teal then back over 600 ms), company node brightens (`filter: brightness(1.6)` on the dot / `.lit` ring on a disc) for 600 ms. Never more than 2 in flight. Stops immediately on hover/selection (in-flight pulses finish). Off under reduced motion and when the tab is hidden.
- **Hover response**: field dim 200 ms; roots draw 240 ms staggered 40 ms; pulses leave 60 ms apart; card 200 ms (opacity 0 → 1, translateY 6 → 0). Leave: everything back over 200 ms; roots fade (no reverse draw).
- **Tier-2 bloom**: dot → 28 px disc, `transform: scale(.25 → 1)`, `opacity 0 → 1`, 160 ms `var(--ease-out)`; the label shifts left by `14 − 3.5` px so it stays clear of the bigger disc (CSS `translateX`).
- **Idle drift**: none on nodes (labels must stay legible; the swarm already moves). The neurons breathe: `box-shadow` alpha oscillates 0.16 ↔ 0.28 over 4 s with a per-neuron phase (CSS animation, `animation-delay: calc(var(--ph) * -4s)`). Off under reduced motion.
- **Canvas loop**: one `requestAnimationFrame` loop that runs only while `dirty` (boot, pulses in flight, hover transition) and the section is near the viewport; otherwise the canvas holds its last frame. Never a React render per frame.

---

## 8. The people reveal — the card (`LegacyScreen.jsx`, `variant="card"`)

The round-11 screen, re-cut as a 320 px card anchored to the node. Reuse its header and rows; what changes is size, placement and the lead.

- **Anchor**: node centre `(x, y)`. Horizontal: if `x > 0.5 × x1` the card sits to the LEFT: `right = x − r − 28`; else to the RIGHT: `left = x + r + 28` — but never past `x1` (the field edge; the mark is sacred), so it flips left if it would. Vertical: centred on `y`, clamped to `[0, bodyH − cardH]`. Measured after mount (`useLayoutEffect`), position set as inline `left/top`.
- **Lead**: one dotted line (today's `.line`: 1 px, `stroke-dasharray 4 6`, `rgba(242,245,247,.4)`) from the disc edge to the card's nearest edge at the node's y (clamped to the card's vertical span), in the canvas layer, drawn with the roots (240 ms).
- **Size**: width 320 (≤ 1300 px viewports: 300); `max-height: min(bodyH, 56 + 6 × 56 + 16)` → at most six rows before the list scrolls (existing `data-overflow` mask). Padding `--s-4` (16; the screen used 24).
- **Head** (`.screenHead` at `40px minmax(0,1fr) auto`): disc 40 in colour; `h3` company name in `font: var(--t-h3) var(--f-display)` (not `--t-sub` — 320 px); `.meta` line `{latest.length} HERE NOW · {ever.length − latest.length} BEFORE` (omit the second when 0) then `{teams}` on the next line (`text-wrap: pretty`); actions: `Site ↗` (if `url`) and Close `×` 32 px, `data-cursor="lock"`.
- **Rows** (`.person`, as today: photo 32 × 42 `ui.frame`, name `.strong`, `.meta` `{batch} · {TEAM}`, `.small.role` `{latest.role ?? (kind === "intern" ? "Intern" : "")}{year ? ` · ${year}` : ""}`, LinkedIn glyph). People = `company.latest` (batch desc, name). If `company.ever` has others, a final mono row `ALSO PASSED THROUGH · {names, max 4, +k}` in `--ink-3` (one line, ellipsis). Row hover → `onRowPoint(slug)` lights that neuron (§6). Develop-in animation and `data-few` sizing kept (1–2 people get the 54 px photos).
- `id="v8-legacy-screen" role="region" aria-live="polite"`, focus handling as today (Enter on a selected node → Close button; Escape → back to the node).
- Phones use `variant="inline"` (§12).

---

## 9. The mark, the hand-offs, and what changes in the chain (A)

Nothing about the swarm's geometry moves: `LEGACY_PLACE`, `LEGACY_FILL`, `LEGACY_BRIGHTNESS`, `LEGACY_PARALLAX`, `paperRegion`, `markRect`, `GLIDE`, `BRIGHTEN`, `SQUARE_AT`, `RELEASE_AT` all stay. `Spotlight.jsx` reads `LEGACY_PLACE` for `MARK_CX/CY` and `data-light` stays `74% 62% 30vw` — **untouched**. `ignoreCursor` stays on everywhere in the chain; the swarm forms the logo and nothing else.

Two renames and one new helper in `home/swarmChain.js`:

- `LEGACY_DIM = 0.22` → **`LEGACY_ACTIVE = 0.58`** (a company is lit: the source glows one step brighter instead of dimming behind a panel; the engine eases the step over ~300 ms).
- chain state `screenOn` → **`active`** (same semantics: Legacy sets it while anything is hovered/selected; `LegacyStory`'s `idle = active ? LEGACY_ACTIVE : LEGACY_BRIGHTNESS` — one line; `LegacySwarm` likewise, phones `0.32 / 0.38`).
- `legacyMarkBox(w, h)` (§3).

Hand-off acceptance (A7): with Amazon selected, scroll Legacy out: the selection clears at `RELEASE_AT` (q 0.08) before `GLIDE[0]` (0.1); shots at q 0.25 / 0.5 / 0.75 / 1 (`/tmp/v8cdp/LA/drive.mjs` with the same scroll steps that produced `/tmp/v8cdp/LA/chain-*.png`) match those images in mark position and brightness within eyeballing; the network scrolls away with the section and nothing of it is left in the viewport at q 1. The Work strip's beam still lands on the mark (`WHEEL` shots at Legacy top = 0.5 H and 0.25 H show the cone pointing at the dots, as in round 11).

---

## 10. Rendering tech

- **DOM** for everything a person points at or a screen reader needs: company nodes and neurons are `<button>`s absolutely positioned inside `.nodes`, labels are spans. ~230 small elements; CSS transitions for their states. Positions are set once per layout (inline `transform: translate(x, y)`), never per frame.
- **Canvas2D** (`canvas.wires`, `inset 0`, `pointer-events: none`, DPR-aware up to 2) for wires, roots, pulses, the card lead and transient glows: these animate every frame while a signal is in flight, and 300+ SVG paths with dash offsets would churn the DOM. One loop, `dirty`-gated (§7).
- **Not** SVG for wires (per-frame attribute writes on 200+ paths), not WebGL (the swarm already owns a GL context behind this section; a second one for 300 lines is waste), not three/R3F.
- Hit-testing is DOM (`pointerenter` on buttons), so no canvas picking code.

---

## 11. Accessibility

- Company buttons carry everything: `aria-label="Amazon, 6 alumni"` (tier 2: `"Clueso, 1 alum"`), `aria-pressed`, `aria-controls="v8-legacy-screen"`. **Tab order**: tier-1 nodes are individual stops in `NET_COMPANIES` order (≤ 20); tier-2 nodes are **one** stop — `.nodes` wraps them in a `role="group"` `aria-label="{n} more companies"` with a roving `tabIndex` and `← → ↑ ↓ / Home / End` moving alphabetically (reuse today's `chipKeys`). Focus selects (as today, with the quiet-focus guard); Enter on the selected node moves focus to the card's Close; Escape clears and returns focus.
- Neurons are `aria-hidden`, `tabIndex -1`: their information is in the card (names, roles, LinkedIn) and the tooltip is pointer-only.
- The canvas is `aria-hidden`. A visually-hidden paragraph before the nodes: "A network of {n} companies and {m} alumni. Select a company to list the alumni who went there."
- The card is `role="region" aria-live="polite"` as today; its rows keep their link labels (`LinkedIn — {name}`).
- Focus rings: `:focus-visible` outline on the button (2 px `--teal` at 0.8, offset 2) — on a 7 px dot that is a 24 px ring; fine.
- Colour is never the only carrier: full-time vs intern is filled vs hollow (neuron) and solid vs dashed (wire), and the card says the kind in words.

---

## 12. Phones (≤ 759 px) and 760–1099

**Phones** — a force field of 100 labels does not fit 350 px, and the user already has an accepted phone pattern (mark band → list). Replace the tray + disc wall with **`LegacyList.jsx`** (A):

1. head → `div.markBox` (220 px band, standalone `LegacySwarm band`, `0.32 / 0.38`) → readout line (two lines allowed).
2. **Tier-1 rows** (all companies with `latest.length ≥ 2`, 52 px): disc 36 · name (`--t-strong`) · **a neuron strip** — the company's neurons as 5 px dots (filled / hollow by kind) in a row, right-aligned before the count `×n`. Tap → the card opens **inline under the row** (`LegacyScreen variant="inline"`: static position, full width, grows with content, no max-height) with the same rows; tap again or Close → closes; opening another closes the first. `scrollIntoView({ block: "nearest" })` 60 ms after it opens if its top is below 55 % of the viewport (existing logic).
3. `p.meta` `ALSO · {k} MORE` then the long tail as **text**, not discs: `ul.tags` of `button.tag` — company names in `--t-mono` 12 px `--ink-2`, separated by ` · ` (`li + li::before`), wrapping, alphabetical, each 44 px tall hit area via padding. Tap → the inline card opens in a single host directly under the list and scrolls into view; the tapped tag gets `.on` (`--ink`, teal underline).
4. No wires, no canvas, no tooltips. Hover rules behind `@media (hover: hover)`.

**760–1099**: the network as on desktop, with the density rule hiding tier-2 labels at rest (§4) and the card at 300 px wide. Tablets in portrait (≥ 1000 tall) get a taller body and the labels come back on their own.

---

## 13. Reduced motion (any width)

No boot, no idle firing, no pulses, no neuron breathing, no develop-in, no tier-2 bloom animation (state switches at 0 ms). Hover/focus/selected still dim the field and light the company, neurons, wires and roots — statically. The swarm keeps the kit's own reduced-motion handling; on the desktop home with reduced motion `LegacyStory` already renders Legacy without the chain (standalone `LegacySwarm`).

---

## 14. The /legacy page — its own piece (workstream B)

Today the page is the home section minus its head, then the year-by-year strip. The user wants more detail and better representations. The home shows *where people are now*; the page shows **how they got there and the whole picture**: every alum's path over time, the company directory, the numbers — in the same room, light and type. The network itself stays on the home (a later follow-up may mount `LegacyNet` in a history mode here once A has landed; not in this round).

Page order (desktop 1440; all in `ui.page`, chapter skeleton: `ui.sec` + `ui.headRow`/`secHead`, `ui.panel`, `.meta` keys):

### 14.1 Head + Readout
`ui.pageHead` with h1 "Legacy" and a new lede: *"{STATS.people} alumni from the {BATCHES[0]}–{BATCHES.at(-1)} batches, and where each of them went next."* Under it (inside the head, full wrap width) the **readout**: a row of five counters separated by `--line` hairlines — value in `font: var(--t-num) var(--f-display)` `--ink`, key in `.meta` under it:
`ALUMNI TRACED {people}` · `WITH A NEXT STEP {withLatest}` · `COMPANIES {companies}` · `FULL-TIME / INTERN {fullTime} / {intern}` · `STAYED AFTER AN INTERNSHIP {stayedAfterInternship} of {internedThenJob}`. Values count up on reveal (GSAP, 900 ms, `power2.out`, `snap`); reduced motion: static. Behind the head's right half, the standalone `LegacySwarm` (`placement { x0 .56, y0 .05, x1 .98, y1 1 }`, brightness 0.4, `fill 0.8`) — the mark opens the page as it opens the chapter; optional, last item.

### 14.2 Paths — every career on one time axis (`legacy/page/Paths.jsx`)
The representation the data deserves: a **time axis** `BATCHES[0] … currentYear + 1` across the top (mono years, `--ink-3`, hairline ticks), and **one row per person**, grouped under sticky batch headers (`2018 · 22 PEOPLE · 19 WITH A NEXT STEP`). Two columns at ≥ 1100 (`grid-template-columns: repeat(2, minmax(0,1fr)); column-gap: var(--col-gap)`), one below.

Row (28 px, `border-bottom: 1px solid var(--line)`): `grid-template-columns: 180px minmax(0,1fr)`. Left: name `.strong` 14 px `--ink-2` + `.meta` team (one line). Right: the **track** — a hairline `--line-2` from the batch year (a 6 px hollow square: joined DVM) to the latest experience's year (unknown year → drawn at the right end with a dotted segment); each experience a dot on the year: intern = 7 px hollow teal ring, full-time = 7 px filled teal; the latest dot has the glow (`0 0 10px rgba(69,230,255,.45)`); the latest company's name sits to the right of the last dot in `--t-mono` 12 px `--ink-2` (ellipsis 140 px). People without a next step: the square only, name `--ink-3`, track dotted to the end — they are counted, not hidden.

Controls above the chapter (one row, under the head): **search** (`input.search`, `ui.panel` recipe, mono placeholder `SEARCH A NAME OR COMPANY`, uses `search(q)`), **Team** chips (All / 5 teams), **Kind** chips (All / Full-time now / Interning / No step yet), **Batch** chips (All / each batch). Chips are `button.chip` in `.meta` type with the gate-indicator teal bar when on (the reel/tray's `::before` bar). Filtering: non-matching rows collapse (`grid-template-rows: 0fr` trick or `max-height` 0, 240 ms); a `.meta` result line `{n} OF {m}`; reduced motion: instant. URL state not needed.

Hover a row → the row lights (name `--ink`, dots 1.0), and a **person card** appears beside the track (`ui.panel`, 300 wide, anchored right of the pointer's row, clamped): photo 54 × 72, name `.h3`, `.meta` `{batch} · {TEAM}`, then the history as lines newest first — `{year ?? "—"}  {role ?? kind}  ·  {company}` with the kind glyph — and LinkedIn. Click/tap or Enter pins the card (`aria-pressed`), Escape/close unpins. Hover a company name on a track → every row with that company lights (0.35 dim on the rest, 200 ms). Rows are `<button>`s (keyboard: Tab through rows within the visible filter; `aria-label="{name}, {team}, batch {batch}, now {role} at {company}"`).

Sizing: 130 rows × 28 / 2 columns ≈ 1 900 px + 7 headers. Long but it is the directory and the filters cut it. Phones: one column, rows 32 px with the name above a shorter track (`grid-template-rows`), controls wrap, the card becomes an inline expansion under the row.

### 14.3 Destinations — the company directory (`legacy/page/Companies.jsx`)
Head: "Destinations" + lede *"Every company an alum has worked at, by how many are there now and how many ever passed through."* Sort control (`.meta` buttons): `NOW` (default, `latest.length` desc) · `EVER` · `A–Z`. A 3-column list at ≥ 1100 (2 at 760–1099, 1 on phones) of rows 56 px (`border-top: 1px solid var(--line)`): disc 36 (`LegacyCircle`, grey → colour on hover/open) · name `.strong` `--ink-2` (+ `fullName` as `title`) · right: `.meta` `{latest.length} NOW · {ever.length} EVER` and under it a **1 px bar** `--line-2` with a teal fill proportional to `ever.length / max` (the rail/chapter-line glow style). Shows the top 36 by default with a `Show all {n}` `ui.btn` (expands in place). Click a row → it opens inline below itself spanning its column: the people — `company.latest` lit rows, then `ever − latest` as dim rows with their year and kind (`ALSO PASSED THROUGH`), using the same row recipe as the card (photo 32 × 42, name, meta, role, LinkedIn); one open at a time per column; `aria-expanded`.

### 14.4 Steps — intern → job (`legacy/page/Steps.jsx`, small)
A compact panel between Paths and Destinations, not a full chapter: *"{internedThenJob} alumni went from an internship to a job; {stayedAfterInternship} stayed where they interned."* Below it the ten most common internship → job pairs from `transitions()` (`to.kind === "full-time"`, `from.kind === "intern"`), as rows `{from.company} → {to.company} · ×k` in `--t-mono`, the arrow in `--teal`; `sameCompany` rows say `→ stayed`. If the data yields fewer than 6 pairs, render only the sentence (no half-empty list).

### 14.5 Year by year
The existing `FoldTimeline` (latest first) and the closing row stay exactly as they are.

Visual language throughout: dark floor, the room's grid showing through `ui.panel` fills, teal only for data marks (dots, bars, the gate bar on chips), mono `.meta` for keys and years, Hubot for names. `data-light` per chapter as today (`22% 30% 40vw` head, `50% 45% 34vw` timeline; Paths `70% 20% 36vw`, Destinations `30% 60% 34vw`).

Phones: counters wrap to 2 + 3; controls wrap; Paths single column; Destinations single column; no hover cards (inline expansions). Reduced motion: no count-up, no collapse animation, no glow breathing.

---

## 15. Files — who owns what

**Workstream A (home network + data)** — owns and may edit:
- `scripts/build-legacy-alumni.mjs` (v2 reader + old-shape adapter + normalised output), `legacy/alumni.json` (generated), **`legacy/alumniData.js`** (the interface, §2.2 — build this first, then do not change exports without telling B).
- `legacy/Legacy.jsx` (keep the selection model; swap the body), `legacy/Legacy.module.css` (remove tray/chips/thread blocks; keep container/body/card/people blocks), **new** `legacy/netLayout.js`, **new** `legacy/LegacyNet.jsx` + `LegacyNet.module.css` (nodes, neurons, labels, canvas, tooltip, motion), **new** `legacy/LegacyList.jsx` (phones), `legacy/LegacyScreen.jsx` (`variant="card" | "inline"`, head at 40 px, `onRowPoint`), `legacy/LegacyCircle.jsx` + `.module.css` (unchanged unless a bug), `legacy/LegacySwarm.jsx` (`screenOn` → `active`, phone brightness), `home/swarmChain.js` (`LEGACY_ACTIVE`, `active`, `legacyMarkBox`), `home/LegacyStory.jsx` (the constant/key rename only).
- **Delete**: `legacy/LegacyTray.jsx`. Keep `public/assets/legacy/logos/*`.
- **Do not touch**: `home/Spotlight.jsx`, `home/Work.jsx`, `home/Story.jsx`, `pages/*`, anything under `chrome/`.

**Workstream B (/legacy page)** — owns and may edit:
- `pages/LegacyPage.jsx`, **new** `legacy/page/Readout.jsx`, `legacy/page/Paths.jsx`, `legacy/page/PersonCard.jsx`, `legacy/page/Companies.jsx`, `legacy/page/Steps.jsx`, `legacy/page/legacyPage.module.css`; `pages/pages.module.css` only to delete `.legacyGraph` and add page-level spacing (no other page's block).
- **Imports only** (never edits): `legacy/alumniData.js`, `legacy/LegacyCircle.jsx`, `legacy/LegacySwarm.jsx`, `chrome/SocialIcon`, `ui.module.css`, `home/storyData`, `immersive/kit/timeline`.
- Until A1 lands, B codes against the interface in §2.2 and may keep a private stub `legacy/page/_stub.js` mirroring it from today's `alumni.json`; delete the stub when A1 is in.

Shared contract: `LegacyScreen` is A's; B does not use it (B has its own row recipe in `legacyPage.module.css`, copied from `Legacy.module.css .person` so the two look identical). `LegacyPage.jsx` stops importing `Legacy`.

---

## 16. Work items, in order, with acceptance

### A — home network

**A1 · Data module first (≤ 1 h, then frozen).** `build-legacy-alumni.mjs` adapter + normalised `alumni.json`; `alumniData.js` exports per §2.2. Acceptance: in dev, `STATS`, `EDGES_LATEST.length === STATS.withLatest`, `COMPANIES[0]` has `latest`/`ever`/`tier`, `transitions()` returns pairs, no warnings. Re-run the script once `research/v8-alumni-v2.json` exists; exports unchanged.

**A2 · Layout.** `netLayout.js`, rendered as plain dots first (no styling) to verify. Acceptance (eval, three viewports): 0 overlapping `[data-label]` rects; all nodes inside `.body`; `max(right)` of neurons ≤ `markBox.left − 37`; min company distance ≥ 24. Screenshot `F3/net-layout-1440.png`: the field reads as a loose constellation with five faint horizontal strata, big nodes toward the mark, small toward the left edge.

**A3 · Rest state.** Nodes, labels, neurons (DOM) + wires (canvas) per §5; readout line; `Legacy.module.css` cleaned. Acceptance screenshot `F3/net-rest.png` (`WHEEL=90`): h2 at y 90 ± 4; the mark whole and still at its round-11 place (compare `F3/live-rest.png`); tier-1 names legible at 16 px with grey logos, tier-2 names in 12 px mono; wires meet the disc rings; no element over the mark's box; the Hub pill aside, nothing else changed on the page.

**A4 · Hover / focus / selected + card.** States §6, card §8, keyboard §11. Acceptance: `drive.mjs` steps — eval the Amazon node's rect, `move` to it, `shot` `F3/net-hover-amazon.png`: field at 0.22, Amazon lit in colour, its neurons at 8 px, roots drawn to the glow's edge, card to the left of the node with its people rows and the dotted lead; `move` onto a LinkedIn glyph: card stays; `move` to (1200, 100): card gone within 600 ms, mark back at 0.5. Keys: `Tab` ×N lands on tier-1 nodes in order, then one stop on the tier-2 group; `ArrowRight` moves within it and the card follows; `Enter` focuses Close; `Escape` returns focus. `F3/net-hover-t2.png`: a tier-2 dot bloomed into its logo disc, label white. `F3/net-hover-neuron.png`: tooltip with name/now/before, ghost wire to a history company.

**A5 · Motion.** Boot wave, idle firing, pulses, neuron breathing; `dirty`-gated loop. Acceptance: two shots 400 ms apart 3 s after Legacy tops the viewport show a bright point at two positions along a root/wire (`F3/net-pulse-a.png`, `-b.png`); with `REDUCED=1` the same shots show no pulse and all nodes at rest; `performance.now()` deltas in the loop ≤ 4 ms per frame at 1440 (log once in dev).

**A6 · Phones.** `LegacyList.jsx`; `LegacyTray.jsx` deleted. Acceptance `VW=390 VH=844 DPR=2 MOBILE=1`: `F3/net-m-rest.png` — band, readout, tier-1 rows with neuron strips, the long tail as text; `tap` Microsoft → `F3/net-m-open.png`: inline card under the row, scrolled into view; tap a tag → card under the tags.

**A7 · Mark + chain.** `LEGACY_ACTIVE`, `active`, `legacyMarkBox`; `LegacyStory`/`LegacySwarm` one-liners. Acceptance per §9 (glide shots match `LA/chain-*.png`; beam hand-off unchanged; selection clears before the glide).

**A8 · Tidy.** Remove dead CSS, `pageMode` if unused, update file headers; `ALUMNI_COUNT` alias kept one round.

### B — /legacy page

**B1 · Page skeleton + Readout** (§14.1, counters static first). Acceptance `F3/page-head.png` (`/v/v8/legacy`): h1, new lede, five counters with real `STATS`, hairlines between; page scroll height reported.

**B2 · Paths** (§14.2) with controls and the person card. Acceptance `F3/page-paths.png`: axis years across the top, batch headers sticky, two columns of rows with squares/dots/latest labels; `F3/page-paths-filter.png` after clicking the `Design` chip and typing `ama` in search: only matching rows, result line `n OF m`; `F3/page-paths-card.png` hovering a row with ≥ 2 experiences: the card lists them newest first with the kind glyphs; Tab reaches rows in order, Enter pins the card, Escape unpins.

**B3 · Destinations** (§14.3). Acceptance `F3/page-companies.png`: three columns, sorted by NOW, bars proportional; click the sort `EVER` → order changes; click a row → inline people (now lit, before dim) `F3/page-company-open.png`; `Show all` expands without layout jump elsewhere.

**B4 · Steps** (§14.4). Acceptance: the sentence with real numbers; the pair list only if ≥ 6 pairs.

**B5 · Year by year + closing row** unchanged; `Legacy` import removed; `.legacyGraph` deleted. Acceptance: the timeline still renders latest first; no console errors.

**B6 · Phones + reduced motion.** `F3/page-m-*.png` at 390 wide: counters 2 + 3, single-column Paths with inline expansion, Destinations single column; `REDUCED=1`: counters static, no collapse animation.

**B7 · Head swarm** (optional, last). `LegacySwarm` behind the head's right half; acceptance `F3/page-head-mark.png`: the mark at 0.4 behind the counters, not under the h1.

Ordering across streams: A1 before anything in B that needs real numbers (B1 can start on the stub). A2 → A3 → A4 → A5; A6 and A7 any time after A3. B2 is the biggest item; start it right after B1.

---

## 17. Risks and non-goals

- ⚠ The force layout's look is only provable in a screenshot. The two knobs in §4 are the fix; the acceptance checks (no overlaps, inside bounds, clear of the mark) are the floor. Do not shrink labels below 12 px mono or hide tier-1 labels to make it fit.
- ⚠ v2 data may arrive with companies that lack logos → monograms; fine. If a company name exceeds 120 px it ellipsises on the net and shows whole on the card.
- ⚠ Two engineers: B must not edit `alumniData.js`; if B needs a derived value, B computes it locally from the exports and tells A, who may add it at A8.
- Not in this round: the projector, `chrome/*`, the Work strip, `Story.jsx`, the archive, mounting the network on /legacy (follow-up once A lands), medium-confidence data, any dependency.
