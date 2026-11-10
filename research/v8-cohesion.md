# V8 · Hologram — one reel under one lamp (cohesion + length round)

For the Opus engineer. Spec only; nothing here is implemented. Everything lives in `src/variants/v8/`; no new packages (if something seems to need one, stop and say so). Do not touch `chrome/holo/*`, `home/HeroStage.tsx`, the projector model or shaders (another engineer is in them); the Hero's copy block and its exit are fair game but nothing here needs them.

Every number below was measured on the live build (`https://dvm-portfolio-redesign-sigma.vercel.app/v/v8`) at 1440 × 900, DPR 1, with the headless-Chrome tool in `/tmp/v8cdp/cdp.mjs`; the screenshots the diagnosis is based on are in `/tmp/v8cdp/F/` (`d-*.png` every 600 px of scroll on desktop, `seam-*.png` every 150 px over the Teams → Legacy seam, `m-*.png` on a 390 × 844 phone).

The user's rule applies throughout: **refine means tune, never strip.** Every element below keeps its job; what changes is where it sits, how big it is, and what carries the eye from one to the next.

---

## 0. The thesis

The round-1 direction gave V8 one floor, one grid, one pool of light, one mark, one type system. The tokens are in place and the sections obey them — and the page still reads as stacked components. The screenshots say why: **the chapters do not share a composition, a pace, or a hand-over.** Each one puts its title somewhere else, ends on a different kind of edge, uses a different panel recipe, and starts the next chapter cold after 126 px of empty room. The only hand-over the user praises (dots → folded paper) is the one place where the *subject* of one chapter physically becomes the subject of the next.

So this round does three things, in priority order:

1. **Give every chapter the same skeleton** (§3): the title in the same slot at the same moment, the one forward link in the same place, the same breathing room, the same panel, the same frame — and one persistent wayfinding device in the navbar that says "these are chapters of one piece".
2. **Make the two cold seams warm** (§4, §5): Selected work becomes a *reel* that pre-figures the film strip; the film strip ends in open room and hands the projector's beam to the alumni dots, the way the dots hand themselves to the paper.
3. **Cut the scroll** (§1): 15 039 px → ≤ 12 700 px at 1440 × 900 (16.7 → ≈ 14 viewport heights), mostly from Selected work (1597 → ≤ 900), the strip's pin (3071 → ≈ 2500) and the chapters' dead padding; a smaller, reversible pace tune on Year by year.

The recurring motif, named once so everyone uses the same word: **the reel.** Selected work is the reel in the projector (one frame projected, the others queued on the strip); Five teams is the strip running through the gate; Legacy is the dust in the beam; Year by year is the paper strip; the archive is the wall the frames end up on; Contact prints the mark in text. The lamp is the docked mark in the navbar, and the chapter line beside it (§3.6) is the film counter.

---

## 1. Measurements and targets (1440 × 900, DPR 1)

Measured with `document.documentElement.scrollHeight` and `offsetTop / offsetHeight` of `main > *` (the pinned Teams section is measured as its `.pin-spacer`; Year by year as its track minus the −130 vh margin that pulls the archive under it).

| Chapter | Now (px) | vh | Target (px) | What gives |
|---|---|---|---|---|
| Hero | 900 | 1.00 | 900 | keep |
| About | 611 | 0.68 | ≤ 540 | `--section` 126 → 90 top and bottom; link into the head row |
| Selected work | 1597 | 1.77 | ≤ 900 | the reel (§4): one frame + a list, not a 2-screen grid |
| Five teams (pin) | 3071 = 900 + 2171 travel | 3.41 | ≤ 2560 | frames 42 vw → 38 vw, lead 28 → 24 vw, a 20 vw tail, strip travels 1.33 px per scrolled px |
| Legacy | 899 | 1.00 | ≤ 860 | `--section`; link into the head row |
| Year by year | 5151 (+1 vh stage, −1.3 vh margin) | 5.72 | 4200 (optional, §6.4) else 5151 | `TL_PACE` 0.76 → 0.62: same stops, same animations, less scroll per year |
| The archive | 1440 | 1.60 | 1440 | keep (user approves) |
| Contact + footer | 1370 | 1.52 | ≤ 1180 | `min-height: 100vh` off, footer gap 128 → 96, `--section` |
| **Total** | **15 039** | **16.7** | **≤ 12 700** (≤ 13 650 without the timeline tune) | −16 % (−9 %) |

Inner geometry used below: About head at y 1066 (section top + 126 + 40); Work grid 1312 × 1191 (feature 867 × 616, sides 421 × 332, wides 644 × 431); Teams lead 403 px wide (28 vw), frames 605 × 776 (42 vw), 5 of them, track 3612 px wide; Legacy head at section top + 126, graph 1312 × 432, "Our legacy →" 470 px under the head; Year by year 8 stops, rail at y 92; Contact head at section top + 126, footer 268 tall after a 128 px gap.

**Acceptance (whole page).** `node /tmp/v8cdp/cdp.mjs <url> /tmp/v8cdp/F/after.png 12000 "JSON.stringify({total:document.documentElement.scrollHeight, secs:[...document.querySelectorAll('main > *')].map(e=>[e.id||e.className.slice(0,20),e.offsetTop,e.offsetHeight])})"` prints `total ≤ 12700` (≤ 13650 if §6.4 is deferred), `#work` height ≤ 900, the Teams `pin-spacer` ≤ 2600, `#contact` ≤ 1180. Phone (`VW=390 VH=844 DPR=2 MOBILE=1`): total ≤ 0.85 × today's 15 354.

---

## 2. Diagnosis — what breaks the "one piece" reading (from the screenshots)

Numbered so the work items can point at them.

- **D1 · Three title slots.** About / Work / Legacy / Contact put the h2 at section top + 126 (top-left, in flow). Five teams centres its title vertically in the strip's lead (`teams.module.css .lead { justify-content: center }`, h2 at y 460–580 while pinned). Year by year centres its copy beside the mark (`story.module.css .copy { top: 50% }`). The archive captions bottom-left (`end.module.css .copy { bottom: 12vh }`). Three different places for "here is the next chapter" is the single biggest reason the chapters feel like different sites.
- **D2 · The forward link wanders.** "More about DVM →" sits under About's copy (y 1672); "All 41 projects →" sits in Work's head row, right; "Meet the team →" is per frame; "Our legacy →" dangles 470 px below Legacy's head at the bottom-left of the graph (`d-07200.png`, y 339, alone on the left with nothing above it); Year by year has none on desktop; the archive has a primary button bottom-left.
- **D3 · Selected work is a second website.** Five full-colour fest covers (gold, purple, deep blue) in a 1191 px grid: two viewports of content in a different register from everything around it, with a 421 × 263 empty frame showing a 60 px "A" for APOGEE'24 App (no cover exists anywhere in the repo, per round 3). It is also the one chapter with no light, no mark, no film language — a grid of cards.
- **D4 · The strip's stills are slivers.** The gate is a two-column panel 605 wide; the still column is ~250 × 700, so a 16:9 cover is cropped to a vertical sliver (`d-04800.png`: "OFFICIAL CURTAIN RAISER" reads "FFICI / URTA / RAISE"; the vaccination portal shows one third of a browser window). The frames read as cut-off, not framed.
- **D5 · Cold seam, Teams → Legacy** (`seam-05550` … `seam-06150`). The pin releases and five boxed panels with hairline borders scroll up as a block; the rails fade with `--strip-on`; 126 px of empty room; then "Legacy" + a cloud of dust + eight discs. Nothing of the strip survives into Legacy and nothing of Legacy was announced by the strip. The spotlight (the room's pool) is released as the strip leaves and glides to Legacy's declared spot off at 78 % 30 %, away from the dots. This is the seam the user named.
- **D6 · Legacy's discs are the only off-palette colour on the page besides stills.** Google's four colours, Microsoft's four, Meta's blue gradient on `--bg-2` discs. They are correct brand marks, but at rest they are the brightest saturated things in a chapter that is otherwise dust and teal.
- **D7 · Year by year speaks a dialect nobody else does.** The rail across the top (`YEAR BY YEAR … 01 / 08`, mono meta + teal progress line), the dossier panel with blur, the thread. It is good — it is just unique. Nothing earlier prepares the reader for a rail; nothing later echoes it.
- **D8 · Three panel recipes.** Strip gate: translucent gradient + 0.055 border (`teams.module.css .gate`). Year dossier: `rgba(10,12,14,.86)` + `backdrop-filter`. Contact's ASCII and terminal: solid `--bg-2`. The eye reads each as a different material.
- **D9 · Dead room.** `--section` is 126 px at 900 tall, top *and* bottom, on About, Work, Legacy, Contact: 1008 px of black between chapters, plus Contact's `min-height: 100vh` and the footer's 128 px gap. The pool of light at 0.8 × 0.11 alpha is invisible on About and Work (`d-01200.png`, `d-01800.png`: pure `#050506`), so this room is empty, not lit.
- **D10 · Phone-only breaks.** The vertical timeline's per-year note falls back to a serif (`m-08400.png`: "2 essays shipped" in Georgia) because the `capNote` override in `story.module.css` is scoped to `.stage`, which the flow layout does not use. The phone sweep at scroll 12 000 (`m-12000.png`) shows an empty viewport where the archive stage should be: verify after this round (the wall may mount late or the pin may open a gap; out of scope unless it reproduces).

---

## 3. The system — one skeleton for every chapter

### 3.1 Rhythm tokens (`v8.module.css` `.root`)

```
--section: clamp(80px, 10vh, 120px);      /* was clamp(96px, 14vh, 160px): 126 → 90 at 900 tall */
--head-y:  var(--section);                /* the y the chapter title sits at when its chapter tops the viewport */
@media (max-width: 759px) { --section: clamp(64px, 8vh, 80px); }
```

Nothing else in the scale changes. `.secHead` / `.headRow` keep `margin-bottom: var(--s-7)` (48). `.inner` keeps its 64 / 24 gaps.

### 3.2 The chapter head — one pattern, one slot

Every chapter opens with the same block, in the same place, at the same moment:

- `h2.h2` in columns 1–6, `p.lede` under it, and **the chapter's one forward link in columns 9–12, baseline-aligned with the h2** (`ui.headRow` + `ui.headAction` as Work has today). Apply to About (`More about DVM →`, moved up from under the copy), Legacy (`Our legacy →`, moved up from under the graph), Contact (no link; the head row renders without an action), Five teams (`Meet the teams →` to `P("/team")`, under the lede in the lead; the frames keep their own links). Work already has it.
- **Flowing chapters** (About, Work, Legacy, Contact): the head is the first child, so when the chapter's top reaches the viewport top the h2 sits at y = `--head-y` (90).
- **Pinned stages** put the head at the same y: Five teams' lead becomes `justify-content: flex-start; padding-top: calc(var(--head-y) - var(--rail) - var(--s-5))` (the track already pads `--rail + 24` at the top, so the h2 lands at 90). Year by year's `.copy` becomes `top: var(--head-y); transform: none` (it currently centres at 50 %; at 90 px the copy column (≤ 380 px wide from x 64) stays clear of the mark, whose left edge is at x 508 at 1440). The timeline's rail is at y 92 and only appears after the copy has gone (`COPY_OUT` ends at settle 0.9; the rail comes in with `CARD_IN`), so **the rail's "YEAR BY YEAR" label takes over the exact slot the h2 vacated** — the title becomes the counter; keep the rail's `top: 92px` as is.
- **Bookends keep their bottom caption**: the hero ("We are / DVM") and the archive ("The archive" over the fading wall) caption bottom-left like a projected slide. That is a deliberate two-rule system — chapters title at the top, the two full-bleed walls caption at the bottom — not an exception.

Acceptance: screenshots with each chapter's top at the viewport top (`scrollTo(0, section.offsetTop)` and for Teams / Years the pin start) show the h2's top edge within ±4 px of the same y across About, Work, Teams, Legacy, Years, Contact.

### 3.3 Panels — one material

`ui.module.css .panel` becomes the one recipe everyone composes:

```
.panel { background: rgba(10, 12, 14, 0.72); border: 1px solid var(--line); border-radius: var(--radius); padding: var(--s-5); }
```

- `teams.module.css .gate`: delete its own `background` gradient and `border-color: rgba(255,255,255,.055)`; it inherits `.panel`.
- `story.module.css .panel.panel`: keep `backdrop-filter: blur(6px)` (it floats over a moving strip) and drop the `.86` background in favour of the shared one.
- Contact's `.ascii` and the terminal (`terminal.module.css`, whatever sets a solid `--bg-2`): inherit `.panel`'s translucent fill so the room's grid reads through them like it does through the gate.

### 3.4 Frames and stills — one treatment, no slivers

`.frame` stays (16:10 default, `--line` border, 4 px radius, 1.02 hover). Two tunes:

- **Still never cropped to a sliver.** The strip's gate changes from two columns to rows: still on top at `aspect-ratio: 16 / 10` across the frame's width, copy below (this is the ≤ 899 px layout `teams.module.css` already has, promoted to all widths). With a 38 vw frame (547 px at 1440) the still is 547 × 342, the copy block (h3, 3–4 lines of `--t-body`, meta, link) ≈ 280, the gate ≈ 670 inside the 776 px slot: `.frameCopy { padding: var(--s-5) var(--s-2) 0 }`, `.still.still { height: auto; min-height: 0; aspect-ratio: 16 / 10 }`, `.gate.gate { grid-template-columns: minmax(0,1fr); gap: var(--s-5); align-content: start }`. Fallback if the user wants the side-by-side back: keep two columns but `.still { aspect-ratio: 4 / 5; height: auto; align-self: center; object-position: top }`.
- **No empty frames on the home.** `Work.jsx pickWork()` takes featured projects *with a cover or a YouTube id* first, then pads with the newest covered projects. APOGEE'24 App (featured, no cover anywhere) drops off the home reel until it has one; it stays on `/projects` and in the timeline. (If the user wants it kept regardless: the coverless frame shows the title in `--t-sub` + meta in `.meta`, centred on `--bg-3`, instead of a 60 px initial.)

Stills keep their colour. No filters, no scrims except under text.

### 3.5 Light — make the room read as lit

`room.module.css .light`: `rgba(69,230,255,0.11)` → `0.14` at the centre, `0.05` → `0.06` at 38 %. Radius unchanged. On About and Work the pool should be *visible* in a screenshot (a teal-grey gradient against `#050506`, not flat black). Every chapter's `data-light` stays except Legacy's (§5.3).

### 3.6 The chapter line — one wayfinding device in the navbar (`chrome/Navbar.jsx`, `chrome.module.css`)

The timeline's rail is right; it is just alone (D7). Put its parent in the bar, so the rail reads as the same device zoomed in:

- Markup, rendered only on the home route, between the lockup and the Menu button (the bar is `justify-content: space-between`; this is the middle child, `pointer-events: none`, `aria-hidden="true"` — the menu remains the navigation):
  ```
  <div class="chapter"><span class="chapterIndex">02</span><span class="chapterLine" style="--p: .37"></span><span class="chapterName">Selected work</span></div>
  ```
- Type: `.meta` (JetBrains Mono 11 px, uppercase, `--ls-meta`), index `--ink-2`, name `--ink-3`. Line: 96 × 1 px `--line-2`, `::after` `--teal` `transform: scaleX(var(--p))`, `transform-origin: 0 50%`, `box-shadow: 0 0 8px rgba(69,230,255,.35)` — the exact rail styling from `story.module.css .railTrack::after`. Gap `--s-4` between the three.
- Chapters are the sections with a new `data-chapter="Selected work"` attribute (About, Work, Teams, Legacy, Years, Archive, Contact → 01 … 07; the hero has none). Progress `p` = `(viewportCentre − top) / height` of the chapter's *scroll box* (its `.pin-spacer` parent when ScrollTrigger pinned it, else the section), clamped; the current chapter is the one containing the viewport centre. One scroll listener + rAF, writes `textContent` / `--p` imperatively; React renders nothing per frame. Fades in (200 ms) once `scrollY > hero.offsetHeight * 0.4` (the mark has docked), out again above it; not rendered on inner pages.
- Phones: `.chapterName` hidden, the line 48 px.

Acceptance: at scrollY = Work's top + 300 the bar shows `02 ── Selected work` with the line ≈ 35 % teal; on `/v/v8/projects` nothing renders between the lockup and Menu.

### 3.7 Copy thread

One sentence changes: Work's lede `Sites, apps and films for the fests.` → `What the five teams shipped for BOSM, Oasis and APOGEE.` (points forward to Five teams, whose lede — "Every fest site, app and film passes through all five." — already points back). The strip's new tail (§5.1) carries the thread into Legacy. Everything else stays.

---

## 4. Selected work → the reel (`home/Work.jsx`, `home/sections.module.css`)

**Layout (≥ 760 px).** Under the unchanged head row, a 12-column body:

- **Stage, columns 1–8**: one `.frame` at `aspect-ratio: 16 / 9` (867 × 488 at 1440) showing the active project's cover; the frame is the link to the active project (same `Tag` / `linkProps` logic as today; `↗` for externals, the play glyph for films). Two stacked `<img>`s inside, the incoming one crossfading over 280 ms `var(--ease-out)` on a swap (opacity only; no slide, no scale). Under the frame a one-row caption: title left in `--t-sub` (the current `workFeatureTitle`), meta right in `.cardMeta` (`APOGEE 2025 · Website`), then `.cardLine` (the summary, 2-line clamp) — ≈ 100 px.
- **Reel, columns 9–12**: an `<ol>` of the five projects as rows, `grid-template-columns: 96px minmax(0, 1fr); column-gap: var(--s-4); padding: var(--s-3) 0; border-top: 1px solid var(--line)`, last row also `border-bottom`. Each row: a 96 × 60 `.frame` (16:10) thumb, `.cardTitle` (title register, `--ink-2` at rest), `.cardMeta`. Each row is a `Link` to its project (click navigates, like every card). **Hover or focus on a row selects it**: the stage swaps, the row's title goes `--ink`, and a 2 × 24 px `--teal` bar with the rail's glow (`::before`, left edge, vertically centred) marks it — the gate indicator. Keyboard: rows are in the tab order; `onFocus` selects. Rows: 5 × 84 + borders ≈ 426 px, under the 488 px stage.
- Initial selection: the first featured project (APOGEE '25 Website today). Optional (lowest priority, do last): auto-advance every 6 s while the section is in view and nothing is hovered / focused; off under reduced motion.
- Section height: 90 + 108 (head) + 488 + 100 + 90 = **876 px** (was 1597). Acceptance: `#work` offsetHeight ≤ 900; a screenshot with the section topped shows the whole reel (stage, caption, five rows, head) inside one viewport; hovering row 3 (`HOVER=x,y` on cdp.mjs) shows its cover on the stage and the teal bar on row 3.

**≤ 1100 px**: stage 1–7, reel 8–12 (thumb 80 × 50). **Phones (≤ 759 px)**: stage full width (16:9), caption, then the reel rows full width; no hover, rows just navigate; height ≈ 880 px (was ≈ 1900). **Reduced motion**: the crossfade is 0 ms.

Why this is a showcase and not a list: the stage is the largest frame on the page after the hero, every project is one hover away at full size, and the row-with-gate-indicator is the strip's language before the strip appears. It also removes 700 px and the empty "A".

---

## 5. Five teams → Legacy — the beam hand-off (`home/Teams.jsx`, `home/Spotlight.jsx`, `home/teams.module.css`, `legacy/Legacy.jsx`, `legacy/Legacy.module.css`, `legacy/LegacyCircle.module.css`)

The model is the dots → paper glide: the *subject* of one chapter becomes the subject of the next, under scroll, with nothing cutting. Here the subject that can travel is **the projector's beam**. The docked mark in the bar is the lamp; `Spotlight.jsx` already draws its cone from the lamp to the frame in the gate and owns the room's pool while the strip holds the viewport. Today the beam dies with the strip. Instead it swings down onto the alumni dots and lights them until the glide takes the dots away — lamp → film → dust → paper → line → wall, one light the whole way.

### 5.1 The strip ends in open room, with a line that points down (`Teams.jsx`, `teams.module.css`)

After the fifth frame, a **tail** on the track: `.tail { flex: none; width: 20vw; min-width: 280px; display: flex; flex-direction: column; justify-content: center; padding: 0 var(--gutter) 0 var(--s-6); }` containing

```
<p class="lede">{team.length} people have passed through these five teams since {YEARS[0].year}.</p>
<a class="link" href="#legacy">Where they went next ↓</a>
```

(`team` from `immersive/data`, `YEARS` from `home/storyData.ts`; the anchor scrolls to `#legacy` with `behavior: smooth`, `auto` under reduced motion.) No panel, no border, no still: the last thing on the film is copy in the room, so the frames' hard edges are not what scrolls up into Legacy. On the stacked layout (phones / reduced motion) the tail renders as the same paragraph after the last frame.

Geometry: lead 28 → 24 vw (min 300), frames 42 → 38 vw (min 500), tail 20 vw. Track = 346 + 5 × 547 + 288 + 6 × 24 + 64 = 3577 px; travel 2137 px.

**Scrub ratio.** The pin's `end` becomes `+=${distance() * 0.75}` while the tween still moves the track by `−distance()`: the strip travels 1.33 px per scrolled px. Pin length 1603 px (was 2171); spacer ≈ 2503. `onFocus` (the keyboard scroll-to-frame) must use the same ratio: `top = st.start + min(span, x * 0.75)`.

### 5.2 The beam swings onto the dots (`Spotlight.jsx`, `teams.module.css`)

- **Move the cone and the motes canvas out of the section** so they can draw past its bottom edge: render them with `createPortal` into the V8 root (`document.querySelector('[data-v8-root]')`) as one `position: fixed; inset: 0; z-index: 2; pointer-events: none` layer (`.beamLayer`, inside `.root` so the tokens resolve). `.cone` and `.motes` keep their styles; `--lx/--ly` and the mote coordinates become viewport px (drop the `− sr.left / − sr.top`), the canvas sizes to `innerWidth × innerHeight`. (The section is pinned with `position: fixed` by ScrollTrigger and has `overflow: hidden` + `isolation: isolate`; a fixed child *should* escape, but a portal is the certain route.)
- **Target.** Let `L = #legacy.getBoundingClientRect()`, `q = clamp01(1 − L.top / H)` (0 when Legacy's top is at the viewport bottom — the instant the pin releases — and 1 when it reaches the top, where `LegacyStory`'s glide begins). The dots' formed mark sits in `LEGACY_PLACE` (`swarmChain.js`: y 0.24–0.98 of the section): its centre is `(W × 0.5, L.top + L.height × 0.61)`. While `q === 0` the target is the nearest frame as today; for `q > 0` the target is `lerp(lastFrameSpot, markCentre, smooth(0, 0.5, q))` — the spring (`k = 26`) carries the sweep over the first half-viewport of scroll, then the beam rests on the mark.
- **Cone opacity.** `co = clamp01((dist − 150) / 320) × flicker × max(on, 1 − smooth(0.6, 1, q))`: full while the strip is pinned, still full as Legacy rides in, fading over the last 40 % of Legacy's entry so it is gone exactly as the dots start their glide (`LegacyStory` `GLIDE[0] = 0.1` of Legacy's exit). The motes keep flowing in the cone with the same gating; nothing else changes in the mote code.
- **The pool.** Spotlight keeps ownership of `chrome/Light` through the hand-off (`light.push` with the spring position, `f: flicker × lerp(0.35, 1, max(on, 1 − q))`) and releases at `q ≥ 1`. Legacy's `data-light` becomes `"50% 60% 34vw"` (the mark's centre) so the release blends into the same spot — no jump.
- **Range.** Spotlight's `IntersectionObserver` (`rootMargin: "25% 0px"`) still intersects the Teams section until Legacy's top is at 0 (the section's bottom is then at 0): the loop runs through the whole hand-off. Keep it; also keep `S.near` false → `light.release` as the safety.
- Reduced motion / phones: `enabled = travel` is already false; nothing renders; Legacy keeps its own swarm and declared light.

Acceptance (desktop): screenshots at Legacy's top = 0.75 H, 0.5 H, 0.25 H, 0 (use `WHEEL=<px>` on cdp.mjs with the Legacy h2 at 126 + those offsets) show the cone from the navbar mark pointing at the dots at 0.5 H and 0.25 H, the pool centred on the dots, and no cone at 0; the dots then glide as before. Nothing clips at the Teams section's bottom edge. No frame reaches the page end.

### 5.3 Legacy is lit, not coloured (`Legacy.module.css`, `LegacyCircle.module.css`)

- Logos: `.img { filter: grayscale(1) opacity(.72); transition: filter 240ms ease }`; the hovered / focused / pressed company (`.nodeFocused`, `.node:hover`, and the echo rules) → `filter: none`. The beam lands, the company lights up in its own colours — the same "lit by the light" behaviour the dots have when they re-form into the name. At rest the chapter is dust and teal like everything around it (D6).
- The head gets the forward link in the head row (§3.2); `.more` is removed from under the graph; `.graph` keeps `flex: 1; min-height: 48vh`.
- `data-light="50% 60% 34vw"` (was `78% 30% 32vw`).

---

## 6. Chapter tunes

### 6.1 About
Head row with the link right (§3.2). Copy and stats unchanged. Height ≈ 90 + 60 + 48 + 240 + 90 ≈ 530.

### 6.2 Five teams
§3.2 (lead top-aligned, `Meet the teams →`), §3.3 (gate = `.panel`), §3.4 (stacked gate, still 16:10), §5.1 (tail, widths, scrub). Rails unchanged. `data-light` unchanged.

### 6.3 Legacy
§5.3. `min-height: 88vh` stays.

### 6.4 Year by year — pace only (optional, reversible, ask the user if in doubt)
The user approves the timeline and its exit; nothing about it changes except how much scroll each year takes. `Story.jsx`: `TL_PACE` 0.76 → 0.62 (≈ 0.4 vh per year instead of 0.5). `SETTLE`, `OUT`, `TL_REST`, the kit units, the dossier, the rail, the masks: unchanged. Saves ≈ 940 px. If the strip feels rushed under a trackpad, 0.68 is the halfway point. Also §3.2 (copy at `--head-y`).

### 6.5 The archive
Unchanged (bookend caption, §3.2). It gets `data-chapter="The archive"` for the chapter line.

### 6.6 Contact
`.contact { min-height: auto }` (was 100vh); `.footer { margin-top: var(--s-9) }` (was `--s-10`); panels per §3.3. Height ≈ 90 + 108 + 533 (the rig) + 96 + 268 + 90 ≈ 1185.

---

## 7. Phones (≤ 759 px) and reduced motion

- Work: stage + caption + rows (§4). About / Legacy / Contact: head row stacks (`ui.headRow` already does), the link under the lede.
- Teams: stacked frames with the stacked gate they already have, the tail paragraph after them, no beam.
- Legacy: own swarm (`LegacySwarm`), logos grayscale at rest, colour on tap / focus.
- Year by year: the vertical strip; **fix D10**: in `Story.jsx` the flow `<section>` gets `s.flow`, and `story.module.css` scopes the `capNote` override to `.stage, .flow`.
- Chapter line: index + 48 px line.
- Reduced motion: no pin, no beam, no crossfade duration, chapter line still updates (it is a scroll readout, not an animation); the tail's anchor scrolls `auto`.

---

## 8. Work items, in order

Each: files · values · acceptance. Risks flagged ⚠.

1. **Rhythm + head slot + links + panels + light** (D1, D2, D8, D9). `v8.module.css` (§3.1), `ui.module.css` (`.panel` §3.3), `room.module.css` (§3.5), `home/About.jsx` + `sections.module.css` (head row with `More about DVM →` right; delete `.aboutMore`), `legacy/Legacy.jsx` + `Legacy.module.css` (head row with `Our legacy →` right; delete `.more`), `home/Teams.jsx` + `teams.module.css` (lead `justify-content: flex-start; padding-top: calc(var(--head-y) - var(--rail) - var(--s-5))`, `Meet the teams →` under the lede, `.gate` inherits `.panel`), `home/Story.jsx` + `story.module.css` (`.copy { top: var(--head-y); transform: none }`, `.panel.panel` background from `.panel`), `contact/Contact.jsx` + `contact.module.css` + `terminal.module.css` (`min-height: auto`, footer `--s-9`, panels). Acceptance: §3.2's ±4 px screenshot set; About ≤ 540, Legacy ≤ 860, Contact ≤ 1180; the pool visible on About/Work.
2. **The reel** (D3). `home/Work.jsx`, `home/sections.module.css`, `lib/projects.js` if `projectThumb` needs the YouTube fallback. Values in §4. Acceptance in §4. ⚠ Keep the card's focus ring on rows and the stage; the stage `img` swap must not re-mount the frame (no layout shift).
3. **Strip tail + widths + scrub** (D5 part 1). `home/Teams.jsx`, `home/teams.module.css`. Values in §5.1. Acceptance: spacer ≤ 2600; the last thing on the strip at the end of the pin is the tail copy, with ≥ 20 vw of empty film to its right; Tab into the fifth frame still scrolls the page to show it (ratio applied in `onFocus`). ⚠ `invalidateOnRefresh` already recomputes `distance()`; make sure the tail's width is in `track.scrollWidth`.
4. **Stacked gate, no slivers** (D4). `home/teams.module.css` (§3.4). Acceptance: every still shows its full 16:10 crop (the curtain-raiser title reads whole); gate ≤ 700 px tall at 1440 × 900 inside the 776 slot. ⚠ This is the one visible layout change to a thing the user has been tuning; the two-column fallback is in §3.4 if rejected.
5. **The beam hand-off** (D5 part 2). `home/Spotlight.jsx`, `home/teams.module.css` (`.beamLayer`), `legacy/Legacy.jsx` (`data-light`), `legacy/LegacyCircle.module.css` + `Legacy.module.css` (§5.3). Values in §5.2. Acceptance in §5.2. ⚠ The portal target must be inside `.root` (tokens, `mix-blend-mode: screen` over the dark floor); the layer must sit above the swarm layer (`chain.module.css .layer` is z 0 inside the chain; a fixed z 2 layer in `.root`'s stacking context paints over `.pages` z 1 — verify the cone is visible over the dots and under the navbar z 1000). ⚠ Do not let Spotlight claim the light after `q ≥ 1`: `LegacyStory`'s glide region expects the declared pool.
6. **Chapter line** (D7). `chrome/Navbar.jsx`, `chrome/chrome.module.css`, `data-chapter` on the seven sections (`About.jsx`, `Work.jsx`, `Teams.jsx`, `legacy/Legacy.jsx`, `Story.jsx`, `ArchiveEnd.jsx`, `contact/Contact.jsx`). Values in §3.6. ⚠ The bar is `pointer-events: none` with each control opting back in; the chapter block stays `none`. ⚠ Measure the `.pin-spacer` for Teams; Years and the archive use `pinSpacing: false` so their own tracks are the scroll boxes.
7. **Copy thread** (§3.7). `home/Work.jsx` lede. Trivial.
8. **Phone fixes** (D10). `home/Story.jsx`, `home/story.module.css`. Acceptance: `m-*.png` at the vertical strip shows the note in JetBrains Mono. Then re-run the phone sweep and check the archive stage renders (`m-12000.png` today is empty); report if it does not.
9. **Year by year pace** (§6.4, optional). `home/Story.jsx` `TL_PACE`. Acceptance: total ≤ 12 700; every year still rests with its dossier readable at the same `HOLD` window. ⚠ User-approved chapter; one constant, revert if asked.
10. **Reel auto-advance** (§4, optional, last). `home/Work.jsx`. 6 s, in view only, paused on hover/focus, off under reduced motion.

Order matters: 1 before 2–6 (they compose the new head and panel), 3 before 5 (the hand-off's `q` assumes the tail exists so no frame is under the beam when it swings), 5 after 4 (the mark-centre maths does not depend on the gate, but screenshots for 4 and 5 should be taken on the same build).

---

## 9. Not in this round

- The projector, `chrome/holo/*`, `HeroStage.tsx`, the hero's layout and flight.
- The swarm, its glide, `swarmChain.js` geometry, the timeline kit, the archive wall, the ASCII print, the terminal's behaviour.
- The menu, the preloaders, the cursor, the fonts.
- Any new dependency.
