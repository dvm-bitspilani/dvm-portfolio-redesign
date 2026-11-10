# V8 · Hologram — round 11: the work strip, Legacy rebuilt, the About hero, the heart

For the two Opus engineers (workstreams **A** and **B**, §9). Spec only; nothing here is implemented. Everything lives in `src/variants/v8/` unless named otherwise. No new packages, no runtime network calls for assets. Do not touch `chrome/holo/*`, `home/HeroStage.tsx`, the preloaders (`chrome/Boot.jsx`, `chrome/boot/*`), the Year-by-year stage (`home/Story.jsx`, `home/YearPanel.jsx`, `story.module.css`) or the archive.

The system from `research/v8-cohesion.md` stays: one chapter skeleton (title at `--head-y`, the one forward link in the head row), one panel (`ui.panel`), one frame (`ui.frame`), the chapter line in the navbar, the **reel** motif (the strip, the gate, the beam from the lamp). This round moves pieces of that system, it does not replace it.

Measured on the live build (`https://dvm-portfolio-redesign-sigma.vercel.app/v/v8`) at 1440 × 900 DPR 1 and 390 × 844 DPR 2 with `/tmp/v8cdp/cdp.mjs` and `/tmp/v8cdp/sweep2.mjs`; screenshots in `/tmp/v8cdp/F2/` (`d-*.png` home desktop every 600 px, `about-*.png`, `legacy-*.png`, `lh-hover-*.png` Legacy with a company under the pointer, `m-*.png` / `mabout-*.png` phone). Pre-round-10 code (the old Selected work) is in `/tmp/v8-backup-round10-20261108-203555/v8/home/` (`Work.jsx`, `sections.module.css`).

The user's rule applies: **refine means tune, never strip** — except where the user asked for a removal (the Five teams strip leaves the home page; the swarm stops re-forming into company names).

---

## 0. What the user asked for, in one place

1. **Selected work:** "the old design for this was better" (the round-10 reel: one stage + five rows). Bring the old card design back, as a **pinned horizontal strip** (the Teams strip's mechanics). **Remove Five teams from the home page; keep it on the About page.**
2. **Legacy:** "I do not really like it at all … a lot of scope for improvement." The DVM mark behind the companies "does not look that good", because hovering the companies distorts it. On hover a company should show **the people who worked there**, "or come up with a unique design for it". Real alumni → company data is being compiled (`research/v8-alumni-companies.json`, people keyed by `src/components/TeamInfo.json` ids; expect 15–40 companies, 1–15 people each). Keep the Legacy → Year-by-year glide (the dots into the folded paper).
3. **About page:** the hero's right ~45 % is empty — design what goes there. Reverse the Year-by-year timeline (most recent first). Place the Five teams strip on this page.
4. **Footer:** the ❤️ emoji becomes a heart drawn in the page's language.

Home page order after this round: Hero → About DVM → **Selected work (the strip)** → Legacy → Year by year → The archive → Contact. The chapter line renumbers itself (it reads `data-chapter`), 01 … 06.

---

## 1. Diagnosis (from the screenshots)

- **D1 · The reel reads as a list, not a showcase** (`d-01800.png`). One 15:8 stage and five 96 px thumbs in a ledger. The old grid (`/tmp/v8cdp/F/d-01800.png`) showed five full-colour covers at 867 / 421 / 644 px wide: the user's "better". What the reel got right and the strip must keep: the chapter fits one viewport of scroll per project, every frame is one gesture away, and the film language (gate indicator, rails) is already there.
- **D2 · Five teams on the home is the second long pin** (`pin-spacer` 2 579 px, `d-02400`…`d-04200.png`). It is also the chapter whose content the About page repeats word for word (`about-01200.png`: the same five stills, the same descriptions, as rows). Moving the strip to About removes the duplicate and gives the home its strip back in the chapter that deserves it.
- **D3 · Legacy's mark is the thing the cursor crosses most** (`d-04800.png`, `lh-hover-*.png`). The swarm fills the centre of the section (`LEGACY_PLACE` x 0.18–0.82) and every company node sits on top of it. The cursor repels particles at rest (`ignoreCursor` is only true *while a name shows*), and the name morph passes through a shapeless cloud for ~0.8 s (`lh-hover-204x345@300.png` is the Meta hover mid-morph: a blob). "MICROSOFT" in dust (`lh-hover-692x404@300.png`) is legible, but it is the *only* thing the hover gives: no people, no count, no way on.
- **D4 · Four hard-coded companies, eight hand-placed circles** (`Legacy.jsx NODES`). Echo nodes duplicate companies to fill the graph. Nothing scales to 15–40 companies with variable headcounts, and nothing links a company to a person.
- **D5 · Phones** (`m-03600.png`): the swarm at 0.32 brightness still fills the whole 390 px width behind four 56 px discs; the mark is unreadable as a mark and the discs float on noise.
- **D6 · About hero** (`about-00000.png`): h1 + four paragraphs + three stats in a 620 px column; x 700–1376 is black. The pool of light is at 90 % 10 %, lighting nothing. The page has no faces at all, although "About" is the page about who the department is.
- **D7 · About timeline** runs 2018 → 2025 (`about-03000.png`), the home's runs latest first; the user wants latest first here too.
- **D8 · Footer** (`d-13200.png`): the credit is a plain `<p>` ("Made with ❤️ by DVM"); the Apple emoji is the only non-system glyph on the page, red on a teal page. It links nowhere today.

---

## 2. Selected work → the strip (workstream B)

**Files:** `home/Work.jsx`, `home/sections.module.css`, `home/Home.jsx`, `home/Teams.jsx`, `home/teams.module.css` → split into `home/strip.module.css` (shared) + `home/teams.module.css` (Teams-only), new `home/useFilmStrip.js`, `home/Spotlight.jsx` (import path only).

### 2.1 Shared strip mechanics

Pull the pin out of `Teams.jsx` into a hook so Work (home) and Teams (About) run the same film:

```js
// home/useFilmStrip.js
export function useFilmStrip({ sectionRef, trackRef, enabled, scrub = 0.75 })
// returns { onFocus, onScroll } — exactly Teams.jsx's useLayoutEffect (pin, end = distance() * scrub,
// scrub: 0.6, invalidateOnRefresh, anticipatePin), its onFocus (scroll the page to the frame,
// same ratio) and its onScroll (undo the browser's focus scroll of the clipped box).
```

`home/strip.module.css` takes from `teams.module.css` everything that is film, not team: `.strip` (was `.teams`), `.travel`, `.stack`, `.beamLayer`, `.cone`, `.motes`, `.rail/.railT/.railB`, `.track` (+ `.travel .track`, `.stack .track`), `.lead`, `.leadLink`, `.stack .lead`, `.tail`, `.tailLede`, `.stack .tail`, and the phone rules for `.stack .track` / `.stack .tail`. `teams.module.css` keeps `.frame`, `.gate`, `.frameCopy`, `.desc`, `.meta`, `.still` and their stack / phone variants. `Spotlight.jsx` imports `s from "./strip.module.css"` (its three classes moved there; nothing else in it changes — see §2.5).

`Teams.jsx` composes the hook and the two stylesheets; its rendered output is unchanged on the About page except for the props in §4.3.

### 2.2 Work.jsx

Same skeleton as Teams: `section#work.strip.travel|stack`, `data-chapter="Selected work"`, `data-light` `"50% 50% 36vw"` travelling / `"50% 8% 60vw"` stacked, `aria-labelledby="v8-work-title"`, rails when travelling, `onFocus`/`onScroll` from the hook, then the track:

- **Lead** (`.lead`, 24 vw, min 300): `h2` "Selected work", `p.lede` "What the five teams shipped for BOSM, Oasis and APOGEE.", `Link.link.leadLink` to `P("/projects")` "All {catalogCount} projects →". Top-aligned (the lead already lands the h2 at `--head-y`).
- **Frames**, one per project, **the old card** (`/tmp/v8-backup-round10-…/home/Work.jsx`): `article.frame[data-frame][data-spot="0.5,0.46"]` → `Tag.card` (Link / `a` / `div`, the old `linkProps` logic) → `span.frame.still` with `img` (or `ui.initial` — see the note), `ui.play` for films; `span.cardTitle`; `span.cardMeta` ("APOGEE 2025 · Website"); the **feature** also gets `span.cardLine` (summary, 2-line clamp) and the `workFeatureTitle` register (`--t-sub`). No panel: the user's "old design" is covers in the open; the gate (panel) stays Teams' treatment.
  - Feature (`i === 0`): `.frameFeature` width 44 vw, min 560; still 16:9. Others: `.frameStd` width 32 vw, min 420; still 16:10. All `justify-content: center` in the slot (as Teams' `.frame`), so the feature's 634 × 357 + ≈ 110 px of copy sits beside the others' 461 × 288 + ≈ 70: the old grid's hierarchy, on one strip.
  - Items: `pickWork()` **as the round-10 reel has it** (featured projects *with a cover or YouTube still* first, newest covered projects to pad to five). The old grid showed APOGEE'24 App as an empty frame with a 60 px "A"; keep it off the strip until it has a cover (it stays on `/projects` and in the timeline). If the user wants it back, the coverless frame shows title + meta centred on `--bg-3` (cohesion §3.4 fallback), never the initial.
- **Tail** (`.tail`, 27 vw, min 340): `p.lede.tailLede` "Five teams, {team.length} people, since {YEARS[0].year} — these are the ones we show." and `a.link[href="#legacy"]` "Where they went next ↓" with Teams' `toLegacy` handler (smooth / auto under reduced motion). The tail is the hand-over to Legacy; §2.5.

Delete from `Work.jsx` and `sections.module.css`: the reel (`.reel*`, auto-advance, the stacked-image stage). Delete from `Home.jsx`: `<Teams />` and its import. `About.jsx`'s comment ("the five teams get their own film strip after the work") becomes "the five teams are on /about".

**Geometry at 1440 × 900:** lead 346 + feature 634 + 4 × 461 + tail 389 + 6 × 24 gaps + 64 right padding = **3 421 px** track; travel 1 981; pin `1981 × 0.75 = 1 486`; spacer ≈ **2 386 px** (the Teams spacer was 2 579). Home total: 13 449 − 894 (reel) − 2 579 (Teams) + 2 386 ≈ **12 360 px** (≤ 12 700 ✓).

### 2.3 States

- Hover / focus on a card: `ui.card`'s own 1.02 zoom and `--line-2` border. Nothing else.
- Keyboard: the hook's `onFocus` scrolls the page so the focused frame is centred (ratio 0.75). The lead's and the tail's links are in the track too and work the same way (they are inside `[data-frame]`-less boxes: give the lead and tail `data-frame` as well so Tab into "All projects" or "Where they went next" also parks the strip on them).
- Phones (≤ 759): `.stack`, the native horizontal snap strip (`strip.module.css` phone rules): lead above the track, frames 80 vw (max 420) **all 16:9**, cardTitle / meta / (feature) line under each, the tail as the last snap. Height ≈ 90 + 160 (lead) + 380 + 90 ≈ 720 (the reel is 1 049 today).
- Reduced motion ≥ 760: `.stack`, frames stacked full width, still beside copy (`grid 1fr 1fr`, `align-items: center`, still `order: 1` — Teams' `.stack .gate` rule, without the panel), tail paragraph after them.

### 2.4 Copy thread

`About.jsx` (home) stays. Work's lede stays. The tail (above) carries "five teams / people" into Legacy, which opens "Where DVM alumni went next."

### 2.5 The beam hand-off, re-homed

`Spotlight.jsx` is mounted by `Work.jsx` now (`<Spotlight sectionRef trackRef enabled={travel} />` after the section, exactly as Teams did). Nothing in its logic changes: it finds `#legacy`, computes `q`, sweeps the spot from the last frame to the mark's centre (`MARK_CX`, `MARK_CY` from `LEGACY_PLACE` in `swarmChain.js`) and fades the cone over Legacy's entry. **Workstream A moves `LEGACY_PLACE` to the right half of the section (§3.4), so the beam lands on the new mark position automatically — B must not hard-code the mark's position anywhere.** `data-spot` on the Work frames is `"0.5,0.46"` (the still's centre, a little above the card's centre).

Acceptance (desktop): `WHEEL=<px>` shots at Legacy's h2 top = 126 + {0.75, 0.5, 0.25, 0} × 900 show the cone from the navbar mark pointing at the dots on the **right** half, the pool centred there, the cone gone at 0; the dots then glide as before. The tail's copy is the last thing on the film when the pin lets go.

---

## 3. Legacy — the tray and the screen (workstream A)

**Files:** `legacy/Legacy.jsx` (rewrite), `legacy/Legacy.module.css` (rewrite), new `legacy/LegacyTray.jsx`, new `legacy/LegacyScreen.jsx`, `legacy/LegacyCircle.jsx` + `.module.css` (monogram fallback), `legacy/LegacySwarm.jsx` + `.module.css` (placement, phone box, no names), new `legacy/alumniData.js` + `legacy/alumni.json`, `home/swarmChain.js` (`LEGACY_PLACE`, chain state, remove the name morph), `home/LegacyStory.jsx` (`ignoreCursor`, brightness, `RELEASE_AT`), `pages/LegacyPage.jsx`, assets under `public/assets/legacy/`.

### 3.1 The idea

The projector is idling: the DVM mark glows dim on the right of the room — the department's own slide, the one it shows when nothing else is in the gate. On the left is the **tray**: every company an alumnus went to, as slides. Hover (or focus, or tap) a slide and it goes into the gate: the people who went there are **projected onto the screen** on the right, over the mark, which dims further behind them. Leave the section and the mark comes back. Then, as the reader scrolls on, the dots glide into the folded paper exactly as today.

What changes for the mark: it stops being hovered over (it sits where the cursor has no reason to go), it never re-forms into text (no more blob), the cursor never repels it (`ignoreCursor` is always on in the chain), and it has one more state — dimmed behind the screen. What the hover gives: the company, in colour, with its people — photo, name, batch, team, role, LinkedIn — not a word in dust.

This is the same device as Selected work's gate indicator and the /team page's viewer ("the row under the pointer is the slide in the projector"), so it reads as this site, not a new widget.

### 3.2 Layout (≥ 1100 px, measured at 1440 × 900; wrap 1 312, column 87.3, gap 24)

```
section#legacy.sec.container   min-height: 100vh; display: flex; flex-direction: column
  .wrap.inner (flex: 1; display: flex; flex-direction: column)
    ui.headRow                 h2 "Legacy" · lede · "Our legacy →" (cols 9–12)      y 90 … 198
    .body                      flex: 1; display: grid; 12 cols; column-gap 24; margin-top 48
      .tray     cols 1–6       (644 px)
      .screenBox cols 7–12     (644 px) position: relative   ← the mark is behind this box
      svg.thread               absolute over .body, pointer-events none
```

Body height at 900 tall = 900 − 90 − 108 − 48 − 90 = **564 px**. The mark region (`LEGACY_PLACE`, §3.4) is the screen box's column: x 0.52 → 0.96 of the section, y 0.26 → 0.98.

### 3.3 The tray (`LegacyTray.jsx`)

Data: companies sorted by `people.length` desc, then name asc. **Tier 1** = the first `min(12, n)`; **tier 2** = the rest, shown only when `n > 14` (otherwise everything is tier 1, up to 14 rows in two columns).

- Tray head (one row, `--s-4` under it): left `.meta` `{N} ALUMNI · {M} COMPANIES`; right `.meta` `HOVER OR TAP A COMPANY` (`(hover: none)`: `TAP A COMPANY`). `--ink-3`.
- **Tier 1 list** `ul.slides` — `display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: var(--col-gap); row-gap: 0`. Each `li > button.slide`:
  - `display: grid; grid-template-columns: 36px minmax(0, 1fr) auto; column-gap: var(--s-4); align-items: center; height: 52px; width: 100%; padding: 0; border: 0; border-top: 1px solid var(--line); background: none; text-align: left; position: relative; border-radius: 0`. The last row of each column also `border-bottom`.
  - disc: `LegacyCircle` at `--node: 36px` (grayscale at rest, colour when `.on` / `:hover` / `:focus-visible`; border `--ink-2` when `.on`).
  - name: `font: var(--t-strong) var(--f-sans); color: var(--ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis`; `.on`, hover, focus → `--ink`.
  - count: `.meta` `×{people.length}` (`--ink-3`; `.on` → `--ink-2`), `font-variant-numeric: tabular-nums`.
  - gate indicator: `::before` — the reel row's bar (`left: -12px; top: 50%; width: 2px; height: 24px; margin-top: -12px; background: var(--teal); box-shadow: 0 0 8px rgba(69,230,255,.35); opacity: 0; transform: scaleY(.4); transition: opacity 200ms ease, transform 200ms var(--ease-out)`); `.on::before { opacity: 1; transform: none }`.
  - `aria-pressed={on}`, `aria-controls="v8-legacy-screen"`.
- **Tier 2** (`n > 14`): `p.meta` "ALSO" (`margin: var(--s-5) 0 var(--s-3)`), then `ul.chips` — `display: flex; flex-wrap: wrap; gap: var(--s-3)`. Each `li > button.chip` = `LegacyCircle` at 36 px, `aria-label={name}`, `title={name}`, same `.on` / hover treatment (ring `--ink-2`, colour); `:hover` `transform: scale(1.04)`. 28 chips at 644 px wide = 3 rows ≈ 156 px.
- Tray total at 12 + 28 companies: 20 + 16 + 6 × 52 + 24 + 20 + 12 + 156 ≈ **560 px** — fits the 564 px body. At 40 companies with the tier-1 rows at 52 the tray never exceeds this; if a build measures taller, drop the tier-1 cap to 10 before touching row heights.

**Selection model** (one `selected: companyId | null` in `Legacy.jsx`):
- `mouseenter` on a slide/chip → select. **Leaving a slide does not clear** (the reader must be able to cross to the screen and click a LinkedIn link). `mouseleave` of the whole `section` → clear after 400 ms (cancelled if the pointer re-enters).
- `focus` on a slide/chip → select. `focusout` of the section (relatedTarget outside) → clear.
- `click` on the selected slide → clear; on another → select. `(hover: none)`: click is the only way in; the same toggle.
- `Enter` / `Space` on a selected slide → focus moves to the screen's first focusable (the close button); `Escape` anywhere in the section → clear and focus the last selected slide.
- The chain says Legacy is leaving (`legacyOwns` → false, §3.6) → clear.
- Initial state: nothing selected; the mark idles at `LEGACY_BRIGHTNESS`.

Keyboard order: tier-1 buttons are each tabbable (≤ 12 stops). Tier-2 chips are one stop: `ul.chips[role="group"][aria-label="More companies"]` with a roving `tabIndex` (the selected chip, else the first, is 0; the rest −1; `←/→` move, `Home/End` jump; moving focus selects).

### 3.4 The mark (swarm) — where it sits and how it behaves

`home/swarmChain.js`:
```js
export const LEGACY_PLACE = { x0: 0.52, y0: 0.26, x1: 0.96, y1: 0.98 }; // the screen's column (cols 7–12 at 1440: x 732–1376)
export const LEGACY_FILL = 0.88;          // was 0.92 — keeps the mark off the panel's edges
export const LEGACY_BRIGHTNESS = 0.5;     // idle (unchanged)
export const LEGACY_DIM = 0.22;           // a company is on the screen
export const LEGACY_PARALLAX = 0.25;
```
Mark at 1440 × 900 (section 900 tall): region 634 × 648 → mark 583 px tall × 449 wide, centre ≈ (0.74 W, 0.62 H). `Legacy.jsx` `data-light="74% 62% 30vw"` (the pool is the mark's centre; the beam from the Work strip lands there, §2.5).

- **Remove** `NAMES`, `NAME_FILL` and `useSwarmNames` from `swarmChain.js`; remove their uses in `Legacy.jsx` and `LegacySwarm.jsx`. The swarm forms the logo and nothing else during Legacy.
- Chain state: `naming` → **`screenOn`** (boolean: a company is on the screen). `LegacyStory.jsx` `ChainSwarm`: `ignoreCursor` **always `true`** (the cursor never repels the dots anywhere in the chain; parallax is unaffected — the glide the user likes keeps its parallax). Brightness: `idle = screenOn ? LEGACY_DIM : LEGACY_BRIGHTNESS; b = idle + (1 − idle) × smooth(BRIGHTEN, q)` (still rounded to `BRIGHT_STEP`; the engine eases between steps, so the dim-in / dim-out is a soft 300–400 ms, nothing to animate by hand).
- `RELEASE_AT` 0.3 → **0.08**: the selection clears (and the panel fades, the mark brightens) just before the glide begins at `GLIDE[0] = 0.1`, so the dots are whole and at idle brightness when they start to move. Everything else in `LegacyStory` (GLIDE, BRIGHTEN, SQUARE_AT, paperRegion, the sticky layer, the edge band) is unchanged.
- `LegacySwarm.jsx` (standalone: `/legacy`, phones, reduced motion, no WebGL2): `brightness={screenOn ? (narrow ? 0.16 : LEGACY_DIM) : (narrow ? 0.32 : LEGACY_BRIGHTNESS)}`, `ignoreCursor` always true, `placement` = `LEGACY_PLACE` ≥ 760; on phones the layer is **not the section** but a `div.markBox` placed in the flow between the head and the tray (§3.8), `placement: 'full'`, `fill: 0.9`.

### 3.5 The screen (`LegacyScreen.jsx`)

Rendered inside `.screenBox` (cols 7–12), `id="v8-legacy-screen"`, `role="region"`, `aria-label="Alumni at {company}"` (or "Alumni" when empty), `aria-live="polite"`. Empty state renders nothing visible (the mark shows); the box keeps its grid cell.

When a company is selected, `div.screen.panel` (`ui.panel` + `.screen`):
```
position: absolute; inset: 0;                 /* fills the screen box: 644 × 564 */
display: flex; flex-direction: column;
background: rgba(10, 12, 14, 0.78);           /* a hair denser than .panel's .72: text sits on it */
-webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
opacity: 0; transform: translateY(6px);
transition: opacity 200ms var(--ease-out), transform 200ms var(--ease-out);
```
`.screenOn { opacity: 1; transform: none }`. Unmount 200 ms after clearing (`onTransitionEnd`), so the fade-out plays over the brightening mark.

- **Head** (`.screenHead`: `display: grid; grid-template-columns: 48px minmax(0, 1fr) auto; column-gap: var(--s-4); align-items: center; padding-bottom: var(--s-4); border-bottom: 1px solid var(--line)`):
  - disc 48 px, logo **in colour** (`filter: none`), ring `--line-2`;
  - `h3.screenTitle` company name in `font: var(--t-sub) var(--f-display)` (the reel stage's title register), `--ink`, one line, ellipsis; under it `p.meta` `{k} ALUMNI · {teams, distinct, in TEAM_ORDER} · {minBatch}–{maxBatch}` (one batch → `BATCH {y}`);
  - right: `a.link` "Site ↗" when the company has `url` (external, `rel="noreferrer"`), then `button.close` (32 × 32, `aria-label="Close"`, `×` in `--t-ui`, `--ink-2`, hover `--ink`; `data-cursor="lock"`).
- **People** `ul.people` — `flex: 1; min-height: 0; overflow-y: auto; scrollbar-width: thin; margin: 0; padding: 0; list-style: none; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: var(--col-gap); align-content: start`. ≤ 1100 px one column. Mask the scroll edge: `mask-image: linear-gradient(to bottom, #000 calc(100% − 32px), transparent)` only when the list overflows (set a `data-overflow` attribute after measuring `scrollHeight > clientHeight`).
  Each `li.person` — `display: grid; grid-template-columns: 32px minmax(0, 1fr) 24px; column-gap: var(--s-3); align-items: center; min-height: 56px; padding: var(--s-2) 0; border-bottom: 1px solid var(--line)`:
  - `span.frame.photo` 32 × 42 (`aspect-ratio: 3 / 4`, `ui.frame`, `object-fit: cover; object-position: top`), `ui.initial` at `--t-strong` size for a missing photo;
  - `span.who`: `span.strong` name (`--t-strong`, `--ink`), then `span.meta` `{batch} · {TEAM}` and, when present, `span.small.role` the role at the company (`--t-small`, `--ink-2`, one line, ellipsis);
  - `a.linkIcon` LinkedIn (`chrome/SocialIcon` `name="linkedin" size={16}`, `aria-label="LinkedIn — {name}"`, `target="_blank" rel="noreferrer"`, `data-cursor="lock"`), absent when no link.
  - People order: batch desc, then name.
- **Develop-in**: each `li` animates `opacity 0 → 1, translateY(8px → 0)` over 240 ms `var(--ease-out)`, delayed `calc(var(--i) * 30ms)` (`style="--i: {index}"`), capped at 12 × 30 ms; keyed by company so a swap replays it. Reduced motion: no animation.
- Capacity: 12 people fill 6 rows × 56 = 336 + head 88 = 424 px; 15 → 8 rows = 448 + 88 = 536 ✓ inside 564. Beyond that the list scrolls.

### 3.6 The thread

One dotted line from the selected slide to the screen's logo disc — today's constellation line, kept as one line that means something. `svg.thread` is `position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; z-index: 2` over `.body`. On select (and on `ResizeObserver` of `.body`): `x1,y1` = the slide's disc centre + 18 px right (tier 1) or the chip's centre (tier 2); `x2,y2` = the screen disc's centre − 24 px left; both measured with `getBoundingClientRect` relative to `.body`. Style = `Legacy.module.css .line` today (`stroke: rgba(242,245,247,.35); stroke-width: 1; stroke-dasharray: 4 6; vector-effect: non-scaling-stroke`), `pathLength="1"`, drawn `strokeDashoffset 1 → 0` over 240 ms `power2.out` (GSAP, as the lines draw today), and faded with the screen. Reduced motion: no draw, the line is simply there while the screen is on. Phones: no thread.

### 3.7 Logos and the monogram fallback (`LegacyCircle`)

`LegacyCircle({ logo, name, size })`: when `logo` is set, the `img` as today (`grayscale(1) opacity(.72)` at rest, `filter: none` when lit). When not, a **monogram**: `span.mono` with the company's initial(s) — the first letter of the first word, plus the first letter of the second word when the name has two or more words and is not a single brand word (`"Goldman Sachs"` → `GS`, `"Google"` → `G`) — in `font: var(--t-ui) var(--f-display)` scaled to `calc(var(--node) * 0.36)`, `--ink-2` at rest, `--ink` when lit. Same disc (`--bg-2`, `--line-2` ring).

**Logo source strategy (no package, no runtime fetch):** one file per company in `public/assets/legacy/<companyId>.svg|png`, referenced from the data as `logo: "/assets/legacy/<id>.svg"`. Sources, in order: (1) the four PNGs already in `src/assests/Legacy/` (google, meta, microsoft, imc — copy them to `public/assets/legacy/`); (2) for companies that have one, a Simple Icons SVG saved once into the repo (`https://cdn.simpleicons.org/<slug>/f2f5f7` — a white glyph; CC0; ≤ 4 KB each; save, do not hot-link; Microsoft/Meta are not in Simple Icons — the PNGs cover them); (3) anything else → no `logo`, the monogram. Record what was used in `legacy/alumni.json`'s `logo` field. White/monochrome SVGs render identically at rest (grayscale is a no-op) and **do not** "light up" in colour on hover — that is fine; the disc ring and the name do.

### 3.8 Phones (≤ 759 px) and narrow (760–1099)

- **760–1099:** the body is two columns still (`.tray` 1–6, `.screenBox` 7–12), people in one column, tier-1 slides one column (`ul.slides { grid-template-columns: minmax(0, 1fr) }`, cap 10). The mark region is the same fractions.
- **Phones:** one column, in flow: head → `div.markBox` (height 220 px, `margin: 0 0 var(--s-6)`, the standalone swarm's layer sits inside it, `placement: 'full'`, `fill: 0.9`, `brightness 0.32`) → tray head → tier-1 slides (one column, 48 px rows, all companies with ≥ 2 people, cap 10) → "ALSO" chips (36 px, gap 12) → `.screenBox` (`position: relative; min-height: 0; margin-top: var(--s-5)`; the panel is `position: static` here, grows with content, `max-height: none`). On select, `screenBox.scrollIntoView({ block: "nearest", behavior: smooth|auto })` 60 ms after the panel mounts (only if its top is below the fold). Tap the selected slide, the close button, or outside the section → clear. No hover states (`@media (hover: hover)` guards the hover rules). The `data-light` for phones is widened by `lightControl` already.
- Reduced motion (any width): no develop-in, no thread draw, no panel transition; the swarm keeps its own reduced-motion handling (the kit reads the media query).

### 3.9 Data plumbing (`legacy/alumniData.js`, `legacy/alumni.json`)

- Copy `research/v8-alumni-companies.json` → `src/variants/v8/legacy/alumni.json` (A owns the copy; the research file stays the source — note the copy date at the top of `alumniData.js`). Importing from `research/` would reach outside `src/` and Vite's root; do not.
- `alumniData.js` is the **only** file that knows the raw shape (whatever the research agent ends up with). It exports:
  ```js
  export const COMPANIES = [ { id, name, logo?, url?, people: [ { slug, name, photo, batch, team /* label, e.g. "Frontend" */, teamId, role?, linkedin? } ] } ]  // sorted: people desc, name asc; people: batch desc, name asc
  export const ALUMNI_COUNT  // distinct people across companies
  ```
  People resolution: raw person → `TeamInfo.json` entry by `id` → `name.trim()` → `team.find(m => m.name === name)` from `immersive/data` (all 192 names match after `trim()`; five TeamInfo names carry a trailing space) → `slug`, `photo` (`/assets/team/<slug>.jpg`, 480 px), `batch`, `vertical` → label via `verticals`, `socials.linkedin`. `role` from the raw record (`role` / `title` / `position`, whichever it has). A person the lookup cannot resolve is logged once in dev (`console.warn`) and skipped — never a blank row. A company with zero resolved people is dropped.
- `id`: the raw id if present, else `name` slugified (`lower, non-alnum → "-"`). `logo` per §3.7.

### 3.10 /legacy page (`pages/LegacyPage.jsx`)

`<Legacy link={false} head={false} id="legacy" className={s.legacyGraph} />` stays; the section gets `min-height: auto` there (`.legacyGraph` already zeroes `padding-top`; add `min-height: 0` and `.body { min-height: 560px }`). The page's Year-by-year: `toFoldStops(YEARS_LATEST_FIRST, P)` for consistency with /about (§4.2) — one import change; flag it in the hand-over in case the user wants this page ascending.

### 3.11 Acceptance

- Desktop, Legacy topped (`scrollTo(0, legacy.offsetTop)`): h2 at y 90 ± 4; the tray in cols 1–6 with ≥ 12 slides and the "ALSO" chips (if n > 14); the mark whole, dim, centred at ≈ (0.74 W, 0.62 H), **no slide or chip overlapping it**; nothing selected.
- `HOVER=` a tier-1 slide: within 300 ms the screen panel is on at cols 7–12 with the company's logo in colour, name, meta, people rows (photo, name, batch · team, role, LinkedIn glyph), the thread drawn from the slide to the screen disc, the gate bar on the slide; the mark behind reads as a soft glow (brightness 0.22). Move the pointer onto a LinkedIn glyph: the screen stays. Move it out of the section: the screen fades within 600 ms and the mark is back at 0.5.
- Tab through: every tier-1 slide selects on focus; the chip group is one Tab stop and arrows move within it; Enter on a selected slide moves focus to Close; Escape clears and returns focus.
- Scroll on: with a company selected, start scrolling Legacy out — the screen is gone before the dots move; the glide into the paper is unchanged (`chain-*.png`-style shots at q 0.25 / 0.5 / 0.75 match today's).
- Phone (390 × 844): the mark is a 220 px band under the lede, no disc over it; tapping a slide opens the panel under the tray and scrolls it into view; tapping Close clears.
- No `console.warn` about unresolved people in a production data set; the monogram renders for a company without a logo file.

---

## 4. About page (workstream B)

**Files:** `pages/AboutPage.jsx`, `pages/pages.module.css`, `home/Teams.jsx` (props), `home/teams.module.css` (Teams-only rules after the §2.1 split).

### 4.1 The hero's right side — the contact sheet

The hero's left column (h1, four paragraphs, three stats) is unchanged. The right column (cols 8–12 of a 12-column `.heroGrid` replacing the single `<div>`; left = cols 1–7) gets the one thing this page lacks: **faces**. The latest batch, as a contact sheet — a film object, the stills of the people who are the department right now.

```
.heroGrid { display: grid; grid-template-columns: repeat(12, minmax(0,1fr)); column-gap: var(--col-gap); align-items: start }
.heroCopy { grid-column: 1 / span 7 }
.sheet    { grid-column: 8 / -1; align-self: center; justify-self: end; width: min(100%, 440px) }
```
- Data: `team.filter(m => m.batch === maxBatch)` (28 today), sorted `TEAM_ORDER` rank then name. If the latest batch has < 14 members, take the latest two batches.
- `nav.sheet[aria-label="Batch of {maxBatch}"]` → `ul.sheetGrid` `display: grid; grid-template-columns: repeat(7, minmax(0,1fr)); gap: var(--s-2)` → each `li > Link.card.sheetCell` to `P("/team?q=" + encodeURIComponent(name))` (`?q=` is the roster's search — it filters to that person) containing `span.frame.sheetFrame` (`aspect-ratio: 3 / 4`, `ui.frame`, img `object-position: top`), `aria-label="{name}, {TEAM}"`. Images `loading="lazy"` except the first row.
- Rest: `filter: grayscale(1) opacity(.72); transition: filter 240ms ease`. Hover / focus-visible: `filter: none` and the card's `--line-2` border. One cell lit at a time, like the companies.
- Caption row under the grid (`.sheetCap`: `display: flex; justify-content: space-between; align-items: baseline; gap: var(--s-4); margin-top: var(--s-4); border-top: 1px solid var(--line); padding-top: var(--s-3)`): left `span.meta` **live**: `BATCH OF {maxBatch} · {n} OF {team.length} ON RECORD` at rest, `{NAME} · {TEAM}` while a cell is hovered or focused (set from `mouseenter` / `focus`, reset on `mouseleave` of the grid / `blur`; `aria-hidden` — the cells carry their own labels); right `Link.link` to `P("/team?b=" + maxBatch)` "Meet the team →".
- Light: `data-light="76% 34% 28vw"` on the header (was `90% 10% 30vw`), so the pool sits behind the sheet.
- Size at 1440: 7 × 56 + 6 × 8 = 440 wide; 4 rows × 75 + 24 = 324 + caption 44 ≈ **368 px**; `align-self: center` against the ≈ 600 px copy column.
- Reveal: the sheet is one `data-reveal` block (the head's existing `useReveal`), cells do not stagger individually (28 tweens is noise).
- ≤ 1100: `.heroCopy` 1–7 / `.sheet` 8–12 stays (cells ≈ 44 px). **Phones:** `.heroCopy`, `.sheet` both `1 / -1`; the sheet after the stats, `grid-template-columns: repeat(6, …)`, `width: 100%`; 28 → 5 rows (≈ 390 px). Reduced motion: no transitions.

Fallback if the user does not want faces in the hero: the room's hologram print (`chrome/Navbar.jsx StaticMark`, exported, at `height: clamp(280px, 30vw, 420px)` with its gradient fill and hairline edge) in cols 8–12, in the pool of light, with a `ui.panel` "slate" under it — a mono key/value ledger of the derived stats (`ON RECORD 2017–2024 · MEMBERS 192 · SHIPPED {sites} sites, apps & portals · {films} films · ALSO {artworks} artworks · {blogs} essays`). Build the sheet first; ask before building the fallback.

### 4.2 Timeline reversed

`toFoldStops(YEARS, P)` → `toFoldStops(YEARS_LATEST_FIRST, P)` (export already exists in `home/storyData.ts`). Lede: "Fest themes, what shipped and every year's intake, latest first, on one folded strip." Nothing in the kit assumes ascending order (the home stage already runs latest first); the folded notes ("1 joined in 2017") stay attached to 2018 wherever it lands.

### 4.3 Five teams: the strip, on this page

Replace the `.teamRows` section with `<Teams page />` (the pin, the rails, the beam):

- `Teams.jsx` props: `page` (boolean). When `page`: no `data-chapter`; the tail's link becomes `<Link to={P("/legacy")} className={ui.link}>Where they went next →</Link>` (no `#legacy` on this page), the tail's lede unchanged ("{team.length} people have passed through these five teams since {YEARS[0].year}."); `aria-labelledby` and `id="teams"` unchanged; `<Spotlight … />` still mounted — on a page without `#legacy`, `q` stays 0 and the beam dies with the strip as it did before round 10 (correct here).
- Section placement: directly after the header. The pinned section's top meets the viewport's top under the translucent bar as on home (`ui.page` has `padding-top: var(--nav-h)`; `position: relative; z-index: 1` so the pin-spacer is fine inside it).
- Delete `.teamRows`, `.teamRow`, `.teamFrame`, `.teamText`, `.teamDesc`, `.teamMeta` from `pages.module.css` and the `useReveal(teamsRef)` for it (the strip's head is the lead; the room's reveal is not used on pinned stages).
- Phones / reduced motion: the stacked / native-snap variants Teams already has.

Acceptance: `/v/v8/about` at 1440 × 900 — the hero shows copy left and a 7 × 4 sheet right with the caption and "Meet the team →"; hovering a cell lights it and the caption reads the name; the Five teams strip pins after the hero and travels (spacer ≈ 2 500 px), beam on; the vertical timeline's first year is the latest (2025 today). Phone: the sheet is 6 across under the stats; the strip swipes; the timeline is latest first.

---

## 5. The footer heart (workstream B)

**Files:** `contact/Contact.jsx`, `contact/contact.module.css`.

The credit is `site.taglines.footer` = "Made with ❤️ by DVM" (`immersive/data/site.ts`; leave the data alone). Render it as `Made with <Heart /> by DVM`: split on the emoji (`text.split(/❤️|❤/)`), so the data stays the source of the words.

`Heart` (inline in `Contact.jsx`): the mark's print, in a heart — angular like the mark (the mark is chevrons; a round heart would be the only soft shape on the page):

```jsx
<svg className={s.heart} viewBox="0 0 24 22" aria-hidden="true" focusable="false">
  <defs><linearGradient id="v8-heart" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stopColor="#8df0ff" /><stop offset=".55" stopColor="#45e6ff" /><stop offset="1" stopColor="#2cb8d6" />
  </linearGradient></defs>
  <path d="M12 21 2 11V6l4-4h3.5L12 4.5 14.5 2H18l4 4v5Z" fill="url(#v8-heart)" />
  <path d="M12 21 2 11V6l4-4h3.5L12 4.5 14.5 2H18l4 4v5Z" className={s.heartEdge} />
</svg>
```
`.heart { width: 13px; height: 12px; margin: 0 .15em; vertical-align: -1px }`, `.heartEdge { fill: none; stroke: rgba(242,245,247,.35); stroke-width: 1; vector-effect: non-scaling-stroke }` (the same gradient stops and hairline as `chrome.module.css .print / .printEdge`). The `<span class="srOnly">love</span>` beside it keeps the sentence readable ("Made with love by DVM").

Link: the credit links nowhere today (D8). Make **"DVM"** in the credit a `Link` to `P("/")` with `className={s.footLink}` (the lockup's behaviour: home; on home it scrolls to top — reuse `Lockup`'s `onClick` logic or just the Link). If the user meant the live site, swap to `<a href={site.url} target="_blank" rel="noreferrer">`. Hover on the link: the heart's gradient brightens (`filter: brightness(1.15)`), 150 ms.

Acceptance: `d-13200`-style shot shows a teal faceted heart in the credit, same height as the x-height, no emoji anywhere in the footer; "DVM" underlined-on-hover like the other footer links; the ContactPage footer shows the same.

---

## 6. Phones and reduced motion — checklist

- Home (390 × 844): About → Work as a native snap strip (80 vw cards) → Legacy (mark band, slides, chips, panel under) → the vertical timeline → archive → contact. Total ≈ 12 245 − 1 049 − 922 + 720 + (Legacy ≈ 1 250 − 743) ≈ **11 500 px**.
- About (390): hero copy + stats + 6-across sheet; Teams snap strip; timeline latest first.
- Reduced motion: no pins (Work and Teams stack), no beam, no develop-in, no thread draw, no panel fade, swarm per the kit; the chapter line still updates.

---

## 7. Measurements and targets (1440 × 900)

| Chapter | Now | After | Notes |
|---|---|---|---|
| Hero | 900 | 900 | |
| About DVM | 519 | 519 | |
| Selected work | 894 (reel) | ≈ 2 386 (pin-spacer) | §2.2 |
| Five teams | 2 579 (pin-spacer) | — (on /about) | |
| Legacy | ≈ 900 | 900 (100vh) | §3.2 |
| Year by year + archive + contact | unchanged | unchanged | |
| **Total** | **13 449** | **≈ 12 360** | ≤ 12 700 ✓ |

Whole-page check: `node /tmp/v8cdp/sweep2.mjs <url> /tmp/v8cdp/F2/after 600` prints `[info]` with `total` and the sections (the Work `pin-spacer` ≤ 2 500; no `teams` entry on home; `legacy` ≥ 880).

---

## 8. Work items, in order, with acceptance

**Workstream A — Legacy**
- A1 · Data: `legacy/alumni.json` (copy), `legacy/alumniData.js` (adapter per §3.9), logo files in `public/assets/legacy/` (§3.7). *Accept:* `COMPANIES.length ≥ 15`, every person has `slug`, `photo`, `batch`, `team`; no dev warnings.
- A2 · Swarm: `swarmChain.js` (`LEGACY_PLACE`, `LEGACY_FILL`, `LEGACY_DIM`, `screenOn`, remove the name morph), `LegacyStory.jsx` (`ignoreCursor` true, brightness from `screenOn`, `RELEASE_AT` 0.08), `LegacySwarm.jsx` (placement, brightness, phone box). *Accept:* the mark is on the right half, still under the cursor, dims when `chain.set("screenOn", true)`; the glide is unchanged.
- A3 · Tray: `LegacyTray.jsx`, selection model + keyboard (§3.3), `LegacyCircle` monogram. *Accept:* §3.11 lines 1 and 3.
- A4 · Screen + thread: `LegacyScreen.jsx`, `Legacy.module.css`, develop-in, scroll mask, Close/Escape, the thread (§3.5–3.6). *Accept:* §3.11 line 2.
- A5 · Phones, narrow, reduced motion (§3.8). *Accept:* §3.11 line 5.
- A6 · `/legacy` page (§3.10). *Accept:* the page shows the same tray/screen under its h1; timeline latest first.

**Workstream B — strip, About, footer**
- B1 · Split the strip: `useFilmStrip.js`, `strip.module.css`, `teams.module.css` (Teams-only), `Spotlight.jsx` import (§2.1). *Accept:* Teams still works unchanged (test it on /about after B4, or temporarily on home).
- B2 · `Work.jsx` as the strip with the old cards (§2.2–2.3); `Home.jsx` drops Teams; `sections.module.css` loses the reel. *Accept:* §2.2 geometry (spacer ≤ 2 500), five covers on the strip with the feature larger, tail copy last; phone snap strip; reduced-motion stack.
- B3 · Beam hand-off from the Work strip (§2.5). *Accept:* §2.5 shots. ⚠ Depends on A2's `LEGACY_PLACE` for the landing spot; until A lands, the beam lands on the old centre — fine for B's own testing.
- B4 · About: Teams strip on the page (§4.3), timeline reversed (§4.2). *Accept:* §4 acceptance (strip + timeline parts).
- B5 · About hero contact sheet (§4.1). *Accept:* §4 acceptance (hero part).
- B6 · Footer heart (§5). *Accept:* §5.

Order: A1 → A2 → A3 → A4 → A5 → A6; B1 → B2 → B3 → B4 → B5 → B6 (B5 and B6 can be done any time after B1).

---

## 9. Two engineers, no shared files

| Workstream A (Legacy) owns | Workstream B (strip · About · footer) owns |
|---|---|
| `legacy/*` (all, incl. new files), `legacy/alumni.json`, `public/assets/legacy/*` | `home/Work.jsx`, `home/Teams.jsx`, `home/Home.jsx`, `home/sections.module.css`, `home/teams.module.css`, new `home/strip.module.css`, new `home/useFilmStrip.js`, `home/Spotlight.jsx` |
| `home/swarmChain.js`, `home/LegacyStory.jsx`, `home/chain.module.css` | `pages/AboutPage.jsx`, `pages/pages.module.css`, `contact/Contact.jsx`, `contact/contact.module.css` |
| `pages/LegacyPage.jsx` | |

**Contracts across the line (do not edit the other side's file to meet them):**
- `home/swarmChain.js` exports `LEGACY_PLACE` as a section-fraction region — B's `Spotlight.jsx` keeps importing it (as today) and derives the beam's landing spot from it; A changes its values, not its name or meaning.
- `#legacy` stays the section's id and `data-chapter="Legacy"` stays on it (the chapter line and Spotlight look for both).
- `Legacy.jsx` keeps the `{ link, id, head, className }` props (`LegacyPage.jsx` is A's; `LegacyStory.jsx` is A's — no B file renders Legacy).
- `Teams.jsx` grows a `page` prop (B); nothing of A's imports Teams.
- `ui.module.css`, `v8.module.css`, `chrome/*`, `lib/*`: **nobody edits them this round.** If a shared style seems needed, put it in the owning module and say so in the hand-over.
- Spotlight's hand-off (B3) and the mark's new position (A2) meet only through `LEGACY_PLACE`; test the seam together once both are in.

---

## 10. Not in this round

The hero projector and preloaders; the Year-by-year stage, its pacing, the archive wall; the menu, cursor, fonts, chapter line; the home About chapter; any dependency. Nothing is committed or deployed from this spec.
