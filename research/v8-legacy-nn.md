# V8 · Hologram — home Legacy as a neural network (one round, one engineer)

Spec for one Opus engineer. Everything lives in `src/variants/v8/legacy/`; no new packages, no installs, no downloads. Don't run vercel, don't commit; the user deploys after review. Back up `src/variants/v8/legacy/` to `/tmp/v8-backup-round15-<stamp>/` before the first edit.

Screenshots: `node /tmp/v8cdp/cdp.mjs <url> <out.png> <waitMs> [jsExpr]` (env `VW VH DPR WHEEL SHOTS HOVER HOVER2`, see its header); `/tmp/v8cdp/TA/drive.mjs` for hover / key / tap sequences (`MOBILE`, `REDUCED` env). Save to `/tmp/v8cdp/F5/`; delete `/tmp/v8cdp/prof-*` and kill any Chrome you started when done. What is being replaced: `/tmp/v8cdp/TA/a3-rest.png` (the fan), `a4-amazon.png` (its card). What must not come back: `/tmp/v8cdp/NA/final-rest.png` (72-node label cloud).

---

## 0. What the user said, and what this round does

Verbatim: **"for the home page, represent the info as a neural network only."** Earlier: *"The neural net idea is fine. I think it requires better execution"* and *"the goal is to show the main big companies in which employees are dvm alums (the tier 1 companies) on the home page."*

Today's fan (`a3-rest.png`) is twenty logo discs on dotted orbits with a few wires into the mark. It is a logo fan, not a network: no layers, no neurons, no propagation. The round before (`final-rest.png`) was a 72-node force cloud: a network, but noise.

This round keeps the **content** — the 20 tier-1 companies with real logos and counts, the people reveal on hover / focus / tap — and changes the **representation** to a textbook layered network:

```
  OUTPUT · 20 COMPANIES    ←    HIDDEN · 34 ALUMNI    ←    INPUT · 5 TEAMS    ←   the DVM mark
  logo neurons, names            one dot per person          one node per team       (source; untouched)
```

Every line is a real relationship (a person's team; a person's step at a company), signals run mark → team → person → company, and hovering an output neuron lights the exact path back to the source and names the people. Three layers, 59 nodes, 80 edges: few enough to read, structured enough to be unmistakably a neural net.

Kept: `alumniData.js` (untouched), `LegacyCircle`, `LegacyScreen` (the card, re-cut narrower), `LegacyList` (phones and 760–1099, untouched), `LegacySwarm`, the selection model in `Legacy.jsx` (hover selects; leave clears after 400 ms; focus / Escape / quiet-focus; tap-outside), the chain contract (`chain.set("active")`, `legacyOwns`), `legacyMarkBox`. **Not edited:** `home/LegacyStory.jsx`, `home/swarmChain.js`, `home/Work.jsx`, `home/Spotlight.jsx`, `home/Story.jsx`, `legacy/alumniData.js`, `legacy/LegacyList.jsx`, `legacy/LegacySwarm.jsx`, anything under `legacy/page/` or `pages/`.

---

## 1. The data as a network (exact, from `alumniData.js`)

Computed from `alumni.json` + the team records; these are the numbers `TIER1` / `TIER1[i].people` produce today. Build the graph from `TIER1` only — nothing else is read.

| layer | nodes | source |
|---|---|---|
| **output** | **20** companies | `TIER1` (each `t`: `id, name, logo, count, people[]`) |
| **hidden** | **34** alumni | `new Set(TIER1.flatMap(t => t.people.map(r => r.person)))` by `slug` |
| **input** | **5** teams | `TEAMS` (in `TEAM_ORDER`: Frontend 8, Design 5, Backend 8, AppDev 8, Video 5 alumni) |
| source | the DVM mark | `legacyMarkBox` (right of the field; edges end at `rx`) |

| edges | count | from | weight / kind |
|---|---|---|---|
| alum → company | **41** | each `(t, row)` of `TIER1[i].people` (a person at two tier-1 companies has two edges: 6 people do — Mohul Maheshwari has 3) | `row.kind` → solid (full-time) / dashed (intern) |
| team → alum | **34** | each person's `teamId` | one per person |
| mark → team (root) | **5** | each team | — |

Batches (2018 ×10 … 2023 ×1) are *not* a layer: they order the alumni within a team (oldest at the top), which is all the diagram needs.

---

## 2. Geometry (≥ 1100 px; numbers at 1440 × 900, DPR 1, in the body's px)

Section, head row, link ("All 121 companies →"), `.body` (y 246 … 810 in the section, 564 tall, x 64 … 1376) — unchanged. `Legacy.jsx` keeps measuring the mark with `legacyMarkBox` and derives `x1 = markLeft − bodyLeft − 86` (= 696) and `rx = markLeft − bodyLeft − 10` (= 772), `cx/cy` of the mark (1001, 312). Nothing — node, label, card, tooltip, stroke — has a right edge past `x1`, except the five roots, which end at `rx` and fade over their last 24 px (today's `fade` mask, kept). **No element and no stroke ever enters the mark's box.**

Field: `F = x1` wide; `y0 = 20` (layer captions above), `y1 = bodyH − 24` (hint line below) → `H = 520`.

### 2.1 Layer x positions — `netLayout.js` (pure, deterministic, ~150 lines)

```
r      = 20                      // company disc radius (d = 40), see sizing below
xA     = 260                     // output layer, far sub-column   (disc 240 … 280)
xB     = xA + 48 = 308           // output layer, near sub-column  (disc 288 … 328)
xLabel = xA − r − 16 = 224       // company names, right-aligned here (room 0 … 224: "Texas Instruments" at 600 13px ≈ 116 px — no ellipsis needed)
xOut   = xB + r = 328            // where alum→company edges end (near column) / pass (far column)
xTeam  = F − 44 = 652            // input layer (team label centred below, ≤ 60 px wide ⇒ ≤ 682 ≤ x1)
xAlum  = xOut + 0.60 × (xTeam − xOut) = 522   // hidden layer
```

The left stack (labels + discs = 0 … 328) is fixed px; the two edge spans stretch with `F` (at 1280 × 800, `F ≈ 626`: `xAlum 480`, `xTeam 582`; at 1920 × 1080 the spans open up). Guard: the network needs `F ≥ 480` and `H ≥ 340`; below that `Legacy.jsx` renders nothing in the body (same guard it has today: `box.x1 < 300 || box.h < 320 → null`, update the numbers).

### 2.2 Output layer — the 20 companies as one zigzag column

Twenty discs do not fit one straight column (20 × 40 px > 520), so the layer is a tight **zigzag**: slot `k` (0 … 19, top → bottom) at `y_k = y0 + (H / 20) × (k + 0.5)` (pitch `pc = 26`), on sub-column A when `k` is even and B when odd. Neighbouring discs are `√(48² + 26²) = 54.6` px apart centre to centre (14.6 px clear), same-column discs 52 px apart (12 px clear). It reads as one thick layer, not two.

Disc diameter `d = min(40, 2·pc − 6, round(√(48² + pc²)) − 10)` → 40 at 1440 × 900, 28 at 1280 × 720 (`H ≈ 340`, `pc = 17`). Labels: `600 13px "Hubot Sans"`, `--ink-2`, right-aligned at `xLabel`, vertically centred on `y_k` (12 px when `pc < 20`). Count badge: a teal disc `max(14, d × 0.4)` px at the disc's top-right (as today), mono 600 `max(9, d × 0.25)` px.

**Order of the 20 (barycentre, not count).** Alumni are placed first (§2.3); each company's `bary = mean(y of its alumni)`; companies sort by `bary` asc, ties by `count` desc, then `TIER1` order. This is the standard one-sweep crossing reduction: with it the 41 edges have median |Δy| 57 px and only 6 exceed 150 px (simulated on today's data); count order would weave every edge across the whole height — the noise the user rejected. Count is still visible: the badge, and Amazon's six edges make it the obvious hub. Expected order at 1440 × 900 (verify in A2): Barclays, Microsoft, Texas Instruments, American Express, Samsung, Google, Goldman Sachs, Meta, Salesforce, Cisco, Walmart, Oracle, Amazon, D. E. Shaw, Uber, Stripe, Credit Suisse, JPMorgan Chase, AMD, UBS.

### 2.3 Hidden layer — 34 alumni dots

Order: `TEAM_ORDER`, then `batch` asc, then `name`. One empty slot between teams: 34 + 4 = 38 slots, `pa = H / 38 = 13.7`, `y = y0 + pa × (slot + 0.5)`. Dot diameter 7 (`pa ≥ 12`), else 5. Hit area: a `button` of `min(16, pa − 1)` px square, centred. Teams are therefore visible as five groups along the column before any hover.

### 2.4 Input layer — 5 team nodes

`y_t = mean(y of the team's alumni)` (at 1440 × 900 ≈ 75, 177, 280, 403, 506 — ≥ 100 px apart). Node: ring `r = 11`, 1.5 px stroke `--ink-3`, fill `--bg-2`, the alumni count inside (`mono 600 10px`, `--ink-2`). Label below (`y_t + r + 4`): the team name in `--t-mono` 10 px uppercase `--ink-3`, centred on `xTeam`.

### 2.5 Edges

All edges are cubic S-curves with horizontal tangents at both ends — `M x0 y0 C (x0 − Δx/2) y0, (x1 + Δx/2) y1, x1 y1` where `Δx = x0 − x1` — so every edge arrives level at its target and threads the output zigzag cleanly:

- **alum → company**: from the dot's left edge `(xAlum − 4, ya)` to `(xOut + 2, yc)`. For a **far-column (A)** company the curve ends at `(xB + r + 6, yc)` and a straight segment continues to `(xA + r + 2, yc)`: it passes sub-column B exactly mid-gap between the discs at `yc ± pc` (clearance `pc − r = 6` px at 1440; the curve is within ±1 px of `yc` there, since it is 6 px from its own end). Solid for `row.kind === "full-time"`, `stroke-dasharray: 2 3` for intern.
- **team → alum**: from `(xTeam − r_t − 2, y_t)` to `(xAlum + 4, ya)`. Solid.
- **root**: straight, from `(xTeam + r_t + 2, y_t)` to `(rx, y_t + (cy − y_t) × (rx − xTeam) / (cx − xTeam))` — aimed at the mark's centre like today's `aim()`; fades over its last 24 px (`fade` mask kept).

### 2.6 Checks the layout asserts (dev only, `window.__v8LegacyGeom`; eval in A2)

1. Every node, label, caption, tooltip and card rect inside the body and `right ≤ x1`; every root ends at `x ≤ rx`; nothing with `x > rx`.
2. Company discs pairwise `dist ≥ d + 4`; company labels pairwise non-overlapping and not intersecting any disc.
3. Every alum → company path, sampled every 4 px, stays `≥ r + 3` from every company centre except its target's.
4. Every team → alum path, sampled every 4 px, stays `≥ 5` px from every alum dot centre except its target's.
5. Team nodes pairwise `≥ 2·r_t + 24` apart (label room).
6. With a company selected: the card rect does not intersect the lit disc and has `right ≤ x1`.

Run at 1280 × 720, 1280 × 800, 1440 × 900, 1920 × 1080 — all six pass at all four.

---

## 3. Visual spec (rest)

Palette as the room: `--ink #f2f5f7`, `--ink-2 #a9b2b8`, `--ink-3 #6c767d`, `--teal #45e6ff`, `--line`, `--line-2`, `--bg-2`. Teal only for signal; logos tinted at rest (`LegacyCircle rest="tinted"`, as the fan).

- **Captions** (one `ui.meta` line at body y 0 … 16, `--ink-3` 10 px mono): `20 COMPANIES` centred on `(xA + xB) / 2`; `34 ALUMNI` centred on `xAlum`; `5 TEAMS` right-aligned at `x1`. If two captions would be < 12 px apart (narrow `F`), drop the numbers (`COMPANIES · ALUMNI · TEAMS`).
- **Hint line** (body `y = bodyH − 14`, left 0, `ui.meta`): `HOVER A COMPANY, A PERSON OR A TEAM` (`(hover: none)`: `TAP A COMPANY`) `· — FULL-TIME · ╌ INTERN` with the two glyphs drawn as 14 px line samples (`span` with a border-top solid / dashed), not characters.
- **Company neuron**: `button.co` positioned at `(x, y_k)`, containing `LegacyCircle` at `--node: d` (`--glyph-w 84%`, `--glyph-h 60%`, `border-color --line-2`), the badge, and the label `span` absolutely placed to the left (`right: calc(100% + (x − xLabel − r)px)` — compute per node: `labelRight = x − r − xLabel`). The label is inside the button so hovering the name lights the company.
- **Alum neuron**: `button.al`, `tabIndex -1`, `aria-hidden`; the dot `rgba(69,230,255,.55)` fill, `box-shadow 0 0 6px rgba(69,230,255,.18)`.
- **Team neuron**: `button.tm` (focusable, in the tab order after the companies), ring + count + label as §2.4.
- **Edges** (`svg` under the DOM, `aria-hidden`): alum → company `stroke #45e6ff`, 1 px, opacity **0.26**; team → alum **0.20**; roots **0.30** with the fade. `vector-effect: non-scaling-stroke`, round caps. One `path` per edge with `data-co`, `data-al`, `data-tm` attributes for the state CSS.
- **Pulse dots**: as today (`.pulse`, r 2.5, `#e8fcff`, drop-shadow teal), two of them.

---

## 4. States

| state | companies / labels | alumni | teams / roots | edges | mark | card |
|---|---|---|---|---|---|---|
| **rest** | tinted, 1 | 0.55 teal | ring `--ink-3` | rest opacities | `LEGACY_BRIGHTNESS` | — |
| **boot** (§5) | pop in top→bottom | pop in | pop in | draw in, mark side first | unchanged | — |
| **idle** | the reached disc's ring teal 400 ms | the reached dot 10 px 400 ms | the reached team ring teal 400 ms | one 3-hop pulse in flight | unchanged | — |
| **company lit** (hover / focus / tap → `selected`) | the one: logo colour, ring teal .6, glow `0 0 18px rgba(69,230,255,.18)`, label `--ink`; others **0.18** | its people 10 px, fill `.95`, glow `.55`; others 0.18 | its people's teams lit (ring teal, count `--ink`); their roots .9; other teams/roots 0.18 | its 41-set: `.9`, 1.5 px; its teams' edges to those people `.9`; its roots; all others **0.06** | `LEGACY_ACTIVE` (chain `active`, as today) | open, §6 |
| **alum hot** (pointer or none; local state, only while nothing is selected) | its companies 0.9 (logo colour); others 0.3 | the one 10 px; others 0.3 | its team lit; its root .9 | its edges `.9`; others 0.08 | unchanged | tooltip §4.1 |
| **team hot** (pointer / focus; local) | the companies its people reached 0.9; others 0.3 | its people 9 px; others 0.3 | the one lit; its root .9 | its team→alum edges and those people's alum→company edges `.9`; others 0.08 | unchanged | tooltip §4.2 |
| **released** (`legacyOwns === false`) | rest | rest | roots fade out (`data-released`, as today) | rest | glide | — |

Transitions 220 ms `var(--ease-out)` on opacity / transform / stroke (CSS; SVG paths get `transition: opacity, stroke-width`). The lit set is computed in JS (`Set`s of ids) and written as `data-lit` on buttons and paths, `data-sel` / `data-hot` on the root; no per-frame React renders.

**Back-propagation ripple on company lit**: its alum→company edges light at 0 ms, the team→alum edges at +90 ms, the roots at +180 ms (`transition-delay` by edge class while entering; 0 while leaving). Then one pulse per person runs **forward** mark → team → person → company (§5), staggered 70 ms, so the picture is: the path lights back to the source, then the source fires along it.

### 4.1 Alum tooltip
`div.tip role="tooltip"`, `ui.panel`, padding 8 × 10, max-width 240, above the dot (`bottom = bodyH − ya + 12`), centred on `xAlum`, clamped to `[0, x1]`. Lines: `strong` name · `meta` `{batch} · {TEAM}` · `small` `{row.role ?? kind} · {company.name}` for each of their tier-1 edges (max 3), with `· now` when `row.now`. Pointer and focus only via the alum button's `:hover` / parent state; appears after 80 ms, leaves at once.

### 4.2 Team tooltip
Same panel, below the team label (or above if `y_t > bodyH − 120`), right-aligned at `x1`: `strong` `{TEAM}` · `meta` `{n} ALUMNI AT THESE COMPANIES` · `small` the companies with counts, desc, max 4 then `+k`.

### 4.3 Selection and intent (`Legacy.jsx`, kept)
`select / clear / leave / stay / onPointerMove (out past rx or above/below the body) / onBlur / Escape / tap-outside / released` all as today. New: company `pointerenter` → `onPoint(id)` (mouse only, with today's `SWITCH_MS` when a card is open); alum / team `pointerenter` → local `hot` (cleared on `pointerleave` of the layer and whenever `selected` is set); `focus` on a team → `hot` (no card); Escape with `hot` clears it.

---

## 5. Motion

- **Boot** (once, `IntersectionObserver` at `rootMargin 0 0 −25% 0`, as today): roots draw (dash 0 → 1, 280 ms) and team nodes pop (`scale .6 → 1`, opacity 0 → 1, 320 ms) at 0 ms; team → alum edges draw 240 ms with stagger `8 ms × alumIndex` from 200 ms, alum dots pop 120 ms after their edge starts; alum → company edges draw 260 ms with stagger `6 ms × edgeIndex` from 560 ms; company discs + labels pop (`scale .8 → 1`, 300 ms) with stagger `24 ms × k` from 760 ms. Total ≈ 1.5 s. Dash draw: `stroke-dasharray: L; stroke-dashoffset: L → 0` with `L = path.getTotalLength()` set once after mount (`--L` custom property). Reduced motion: everything simply there (`data-boot="done"`).
- **Idle signal** (nothing selected or hot, in view, tab visible, not reduced; seeded `mulberry32(20261109)` as today): every 3–5 s one pulse leaves the mark: `rx` → team node along the root, → one of that team's people along the team→alum edge, → one of that person's companies along the alum→company edge; speed **620 px/s** constant (≈ 1.1 s for a typical path); each node it reaches pings 400 ms (ring / dot as §4). Path = a random `(alum, company)` edge; its team follows. Never the same company twice in a row; one in flight. Implement as today's `getPointAtLength` runner over an ordered list of `path` elements.
- **Company lit pulses**: per person one pulse along `[root(team), edge(team→alum), edge(alum→company)]` at 800 px/s, staggered 70 ms, after the ripple (start at 180 ms). Not repeated while the selection holds. Reduced: none.
- **Hover response**: dim 220 ms; ripple as §4; card 200 ms (`opacity 0 → 1`, `translateY 6 → 0`). Leave: everything back over 220 ms, no reverse ripple.
- **Nothing drifts.** No breathing, no parallax on nodes; the swarm already moves.

---

## 6. The people card (`LegacyScreen.jsx` `variant="card"`, re-cut)

The card docks **over the label column, beside the lit disc**: `left = 0`, `width = min(248, xLabel + 8) = 232`, `top = clamp(y_k − H_card / 2, 0, bodyH − H_card)`, `max-height = bodyH − 16` (scrolls inside past that; today's `data-overflow` mask). Its right edge (232) is 8 px short of the far sub-column's discs (240), so it covers only the dimmed names — never a disc, an edge, a dot or a team. The lit company's own name may be under it; the card's head shows the logo and name. Lead: none (the disc is 8–56 px from the card's edge; drop today's `.lead` and `placeCard`).

Narrow cut of the existing card (same markup; CSS in `Legacy.module.css .card`): padding 12; head `grid 32px 1fr 24px` — disc 32 lit, `h3` name `font: 600 15px/1.2 var(--f-display)` (`fullName` as `title`), meta line `{count} ALUMNI · ●{fullTime} ○{intern}` then `Site ↗` on the same meta line (drop the teams line — the teams are lit in the network), close `×` 24 px. Rows (`.person`, kept): photo 28 × 37, name `600 13px` (wraps to 2 lines if needed), `meta` `{batch} · {TEAM}` under the name (not beside), role line `small` 12 px with the kind glyph, `· now` teal, LinkedIn 14 px icon top-right. Row ≈ 58–70 px; Amazon's six ≈ 400 px + head 76 → fits at 1440 × 900 without scrolling; scrolls at 1280 × 720. `data-few` sizing kept for 1–2 people (photo 40 × 53).

`role="region" aria-live="polite" aria-label="Alumni at Amazon"`, focus handling as today (Enter on the lit node → Close; Escape → back to the node). `variant="inline"` (phones / 760–1099) unchanged.

---

## 7. Phones (≤ 759 px) and 760–1099 px

Unchanged: `LegacyList` (mark band → readout → 20 rows → inline card; at 760–1099 the rows in the left half, the shared mark on the right). The network needs the room beside the mark and is a hover instrument; the list is the accepted compact form. `useMedia("(min-width: 1100px)")` chooses the network. Do not touch `LegacyList.jsx`.

(Not this round: a static mini-network band above the phone list. Note it as a follow-up in the file header.)

## 8. Reduced motion (any width)

No boot, no idle signal, no pulses, no ripple delays, no card rise; hover / focus / selection still dim and light — instantly. `useReducedMotion()` as today.

## 9. Accessibility

- Companies: `button`, DOM order = layer order (top → bottom), `aria-label="Amazon, 6 alumni"` (`1 alum`), `aria-pressed`, `aria-expanded`, `aria-controls="v8-legacy-screen"`; focus selects (quiet-focus guard kept); Enter on the lit one → card's Close; Escape → back. Focus ring `2px solid var(--teal)` offset 3 on the disc.
- Teams: `button`, after the companies, `aria-label="Frontend, 8 alumni at these companies"`; focus = team hot (tooltip visible via `:focus-visible`), no card; Escape clears.
- Alumni: `aria-hidden`, `tabIndex -1` — their names, roles and links are in the card; the tooltip is pointer-only.
- `svg aria-hidden`. A visually-hidden paragraph before the nodes: "A network of five DVM teams, 34 alumni and the 20 companies they went to. Select a company to list its alumni." Captions are real text (`aria-hidden` false).
- Colour never alone: full-time / intern is solid / dashed and said in words on the card; dimming is decorative (the tree keeps full names).
- Contrast: labels `--ink-2` on `--bg` ≥ 7:1; badge `--teal-ink` on `--teal` ≥ 10:1.

---

## 10. Files

**New**
- `legacy/netLayout.js` — pure: `layoutNet({ tier1: TIER1, teams: TEAMS, F, H, y0, cx, cy, rx })` → `{ companies: [{ id, x, y, d, col: "A"|"B", k }], alumni: [{ slug, x, y, teamId, i }], teams: [{ id, x, y, n }], edges: { ac: [{ id, slug, co, kind, d }], ta: [{ id, slug, team, d }], roots: [{ team, d }] }, labelX, caption: { out, hid, inp } }`; plus `checkNet(layout, geom)` returning the §2.6 report (dev only).
- `legacy/LegacyNet.jsx` — the svg + nodes + tooltips + boot / idle / pulses (replaces `LegacyFan.jsx`; lift its PRNG, IntersectionObserver boot gate, `inView`, pulse runner, pointer-intent `enter()` with `SWITCH_MS`, `fade` mask; generalise the runner to a path list).
- `legacy/LegacyNet.module.css` — replaces `LegacyFan.module.css` (keep `.wires`, `.pulse`, `.fan[data-released]`, the node / disc / badge rules; add layers, labels, captions, hint, tooltips, state and boot rules).

**Edit**
- `legacy/Legacy.jsx` — import `LegacyNet` + `layoutNet` instead of `LegacyFan` + `fanLayout`; `FIELD_TOP 20`, `FIELD_BOTTOM 24`; the guard numbers; the readout `<p>` becomes the three captions (`layout.caption`) and the hint line; `place()` → the §6 dock (ten lines; delete `placeCard`, `CARD_GAP`, `lead`); add `hot` plumbing only if you keep it in Legacy (preferred: local to `LegacyNet`). Header comment rewritten.
- `legacy/LegacyScreen.jsx` — `variant="card"` drops `place`'s lead, keeps `place(id, w, h) → { left, top }`; the teams line moves out of the card head; `Site ↗` into the meta line. Header updated.
- `legacy/Legacy.module.css` — `.card` narrow cut (§6), `.readout` → `.captions` + `.hint`, remove `.lead` / `.more` if unused.

**Delete** — `legacy/LegacyFan.jsx`, `legacy/LegacyFan.module.css`, `legacy/fanLayout.js` (grep for `fanLayout`, `LegacyFan`, `footprint`, `makeRouter`, `LABEL_H` first; only `Legacy.jsx` and `LegacyFan.jsx` import them).

**Untouched** — everything in `home/`, `legacy/alumniData.js`, `legacy/alumni.json`, `legacy/LegacyList.jsx`, `legacy/LegacySwarm.*`, `legacy/LegacyCircle.*`, `legacy/page/*`, `pages/*`, `scripts/*`, `public/*`.

---

## 11. Work items, in order, with acceptance

Dev server `npm run dev`, `/v/v8`; 1440 × 900 unless stated; files under `/tmp/v8cdp/F5/`. Legacy's head at y 90 is `WHEEL=-156` (as `TA/a3-rest.png` was taken).

**N1 · Graph + layout.** `netLayout.js` with `layoutNet` and `checkNet`; `Legacy.jsx` wired; `LegacyNet.jsx` renders plain circles and paths only (no styling yet); `LegacyFan*`, `fanLayout.js` deleted. Acceptance: eval `window.__v8LegacyGeom.check` (expose `checkNet`'s report) → all six §2.6 checks pass at `VW/VH` 1280 × 720, 1280 × 800, 1440 × 900, 1920 × 1080 (`n1-check-<w>x<h>.json`); the company order at 1440 × 900 is §2.2's (or report why the data differs). `n1-skeleton.png`: three columns of circles, curves between, five roots fading short of the mark, nothing right of `x1` but the roots.

**N2 · Rest state.** §3 complete: logos, labels, badges, dots, team rings with counts, captions, hint line, edge kinds. Acceptance `n2-rest.png`: reads as a layered network at a glance (test: cover the captions with your thumb — still three layers); all 20 names legible, no two labels or discs touching; the mark exactly as in `TA/a3-rest.png` (overlay at 50 %: edges within 2 px); solid vs dashed edges distinguishable at 100 %. `n2-1280x720.png`, `n2-1920.png`: same, `d` and pitches scaled per §2.

**N3 · States + card.** §4, §6, §9. Acceptance via `drive.mjs`: `n3-amazon.png` — move to Amazon's disc: Amazon in colour, its 6 edges, 6 dots, 3 teams (Frontend, Design, AppDev) and their roots lit, everything else at 0.18 / 0.06, the card at `left 0` beside the disc with six rows (4 ●, 2 ○, "now" on five), no part of the card over a disc; `n3-mohul.png` — move to Mohul Maheshwari's dot (eval its rect): tooltip with name, `2018 · DESIGN`, three company lines; Amazon, Google and Walmart at 0.9; his team and root lit; `n3-backend.png` — move to the Backend ring: its 8 dots and their 9 companies lit, tooltip right-aligned at `x1`; `n3-key.json` — `Tab` ×1 from the head link lands on Barclays (first in layer order) and lights it with the card; `Tab` ×20 lands on Frontend (team, no card); `Enter` on a lit company moves focus to Close; `Escape` returns it (`document.activeElement.getAttribute("aria-label")`); `n3-leave.json` — pointer moved to `x > rx` → selection cleared within 500 ms, mark back to idle brightness (`chain active` false).

**N4 · Motion.** §5. Acceptance: `n4-boot-a.png` / `-b.png` at 300 ms and 900 ms after Legacy enters (`SHOTS` or `drive.mjs` waits): the first shows roots + teams, partial team→alum edges, no companies yet; the second everything but the last companies popping. `n4-pulse-a.png` / `-b.png` 400 ms apart, 4 s after settle: a bright dot at two points along one root / edge path, the reached node pinged. `n4-rm-*.png` with `REDUCED=1`: no dot, all at rest; `n4-rm-amazon.png`: lit state, no transition artefacts. Frame cost: the runner's `performance.now()` delta ≤ 3 ms per frame (log once in dev).

**N5 · Hand-off.** `SHOTS=0,0.25,0.5,0.75,1 … n5-chain.png`: the mark's position and size in each frame match `TA/a4-chain-*.png` (overlay within 2 px); the paper takes over at 1; `WHEEL=-300` with `HOVER2` on Amazon → nothing lights after the release (as `TA/a4-release.png`); the Work strip's beam lands on the mark as in `TA/a4-beam-050.png`. `VW=390 VH=844 DPR=2 MOBILE=1`: `n5-m-rest.png` identical in content to `TA/a5-m-rest.png` (the list is untouched); `VW=1024 VH=768`: `n5-1024.png` as `TA/a5-1024.png`.

**N6 · Tidy.** Headers of every touched file say what the file is now; `npx eslint src/variants/v8/legacy` clean (eslint is a dev dependency; install nothing); `grep -rn "LegacyFan\|fanLayout\|placeCard" src/` empty; `/tmp/v8cdp/prof-*` removed; Chrome killed. Full-page sweep `n6-home-*.png` (`SHOTS=-1,0,0.5,1,1.5`) for the user.

---

## 12. Risks and knobs

- **The zigzag threading** (§2.5) is exact for far-column edges because the last run is straight at `yc`; if check 3 still fails at some size, raise the A/B offset `48 → 56` (clearance grows, the threading gap does not change) — one knob. Do not shrink `d` below `2·pc − 6`.
- **Barycentre order** puts Barclays at the top and Amazon mid-column. If the user wants the big names on top, switch the sort to `count desc, TIER1 order` — the layout, states and checks are unchanged; the picture gets more crossings. Make the sort a named constant (`ORDER = "bary"`), not a rewrite.
- **1280 × 720** is the floor: `d = 28`, alumni pitch 8.9 (dots 5 px). Legible, cramped; the hit areas are 8 px, which is why keyboard and the card carry the people, not the dots.
- Not in scope: the /legacy page, phones beyond the existing list, the swarm, the chain, the beam, any dependency.
