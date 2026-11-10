# V8 · Hologram — /legacy → /alumni: rename, critique, refinement plan

User, verbatim: *"change the legacy page to alumni because legacy does not make sense to anyone who does
not previously know what it actually is. I think the idea behind that page is good but it requires a
lot of refinement and improvement."*

Standing direction: keep the core ideas (sector map of companies; batch × team loom; no search or
filter inputs; info visible at a glance); "refine means tune, never strip"; the tier-1 companies are
the headline; *where alumni work now* is the point of the page; one designed page in the V8 room.

Before shots: `/tmp/v8cdp/ALUMPAGE/before/` (`full-1440.png` 9,639 px, `full-1024.png` 13,985 px,
`full-390.png` 19,933 px, `hero-1440.png`, slices `s1440-*`, `s1024-*`, `s390-*`).

---

## 1. Critique (as a design lead seeing it cold)

**First impression, 5 seconds, 1440 × 900.** The fold says *"Legacy"*, a sentence, and four numbers
(164 · 87 · 121 · 61/26). Not one company is visible. A visitor who does not know DVM learns that
"legacy" has numbers; they do not learn the one thing the page exists to say — *DVM alumni work at
Amazon, Google, Microsoft, Goldman Sachs…* The first logo appears at y ≈ 960. The word "Legacy" itself
reads as "old stuff" (or "legacy code") to an outsider. The tier-1 list that the home leads with is
not on this page at all.

**Hero / readout.** The counters are well set but unexplained: "61 / 26 FULL-TIME / INTERN" is a
puzzle (of what? latest role). "Alumni traced" is research jargon. The jump row is fine but points
at three sections, one of which (Year by year) is not about alumni.

**Story and connection.** Three sections that do not talk to each other on screen:
- the map and the loom are linked only by hover-kin, and the two are ~2,000 px apart, so the link is
  invisible in practice (you light a star you cannot see);
- the section intros use private vocabulary — "one loom", "a rail per batch, a thread per team" —
  that explains the metaphor instead of the content;
- *Year by year* (≈ 3,800 px, 40 % of the page at 1440, ≈ 5,000 px on a phone) is the department's
  shipped-work timeline. It is the same strip that is on the home and on /about, it is not about
  alumni, and it ends the page on a different subject. It is the main reason the page feels long and
  like a stack of components.

**Map (Companies).** The strongest part: sectors, sized discs, rings, traces read as one picture.
Problems: (1) logos are small — 36 px discs with a 70 × 56 % glyph box make wordmarks (Samsung,
Goldman Sachs, Cisco, AmEx, Uber, AMD, Wells Fargo, Samsung Semi, WEX) illegible smudges; (2) the
discs are flat `--bg-2` on `--bg`, so logos sit in holes rather than on plates; (3) tier-1 names are
not distinguished at all — Google (1 alum) is just another small disc in the last row; (4) the card
lists people but gives no way to *find* them in the list below.

**Loom (Alumni).** Dense but legible at 1440, and it is the list the user asked for. Problems: the
intro is metaphor; the bead's company is plain text — the natural "where is that?" question has no
answer; the 2017 rail (one person) is a near-empty full-width row; on a phone it is ≈ 8,000 px.

**Interactions.** The known bug: pin a company on the map, then hover any person on the loom — on
pointer-leave the bead calls `setKin(null)`, wiping the pinned company's highlight on the loom while
its card is still pinned. Cause: one kin slot shared by a persistent source (the open star) and a
transient one (hover). Also: the pinned card follows the viewport (clamped under the nav) all the
way down the loom — useful, because it is the "legend" for the lit beads, but only once the bug is
fixed.

**Phone (390).** 19,933 px. The map is one column with 3 stars a row (≈ 5,600 px); the loom stacks
team blocks (≈ 8,000 px); Year by year adds ≈ 5,000. Stars in 3 columns waste width (each cell 105 px
for a 36 px disc).

**Motion.** Fine and restrained (panels rise, traces draw, rails draw). Nothing to add; it should
not get louder.

**Type / rhythm.** Consistent with V8. The lede's oldstyle "2017–2023" figures look odd in the
display face; numbers in running text should use lining figures.

---

## 2. Plan (what this round does)

### 2.1 Rename (/legacy → /alumni)
- Route `alumni` → `AlumniPage` (pages/AlumniPage.jsx, renamed from LegacyPage.jsx); `legacy`
  redirects to `alumni` keeping `?query` and `#hash` (`LegacyToAlumni` in index.jsx).
- Every link and label in the variant and the hub: Menu "Alumni", contact site links, home Year-by-year
  button "Our alumni", /about Teams tail, /team Wall · Credits · Lineage · Dossier, hub catalog (a v8
  entry, so other variants' default links are untouched). Section ids become `v8-alumni-*`.
- Not touched (another agent): the home's Legacy section files, `#legacy` anchor.

### 2.2 Hero — say it in five seconds
- h1 **Alumni**; lede *"Where DVM's alumni work now — {164} people from the {2017}–{2023} batches,
  at {121} companies. These are the names you'll know."* (lining figures).
- **The big-names wall** right under the lede: the 20 `TIER1` companies as logo plates (disc 56, tinted
  real logos, count badge, name, "6 alumni · 5 now"). A mono caption: `20 OF 121 COMPANIES · TAP ONE
  TO FIND IT ON THE MAP`. Hover / focus a plate lights its people below (kin); click / Enter scrolls to
  its star on the map and pins its card. 10 × 2 at ≥ 1100, 5 × 4 at 760–1099, 4 × 5 on phones.
- Readout: four counters with plain keys — `Alumni`, `With a public role`, `Companies`,
  `Full-time · intern now`.
- Jump row: `Companies ↓ · People ↓`.

### 2.3 Sections that hand over to each other
- Numbered mono kickers in the theme: `01 · Where they work` → h2 **Companies**; `02 · Who they are`
  → h2 **People**. Ledes describe the content, not the metaphor.
- **Map → loom**: in a company's card every person row gets a "find in batch ↓" control that scrolls
  to their bead on the loom and pulses it.
- **Loom → map**: a bead's company name is a button that scrolls up to its star and pins its card.
- Kin keeps lighting across both, now on two layers (§2.5).
- A closing band instead of the department timeline: one line on where the years live, with links to
  /about (year by year), /team and /projects. *Year by year* is removed from this page (it stays on
  the home and /about); that is the one cut, it removes duplication, not alumni content. Easy to
  restore (one section) if the user wants it back.

### 2.4 Map polish
- Discs bigger: 1 → 40, 2 → 48, 3 → 56, 4 → 62, 5 → 68, 6+ → 76 px (phones cap at 64).
- Logo plates: a lifted plate (radial gradient, faint inner rim) behind every disc via the star's own
  wrapper; wordmark glyphs get a wider box (`--glyph-w: 84%; --glyph-h: 60%`, inherited by
  LegacyCircle — no edit to it).
- Tier-1 stars: name in `--ink`, semibold, so the headline names stand out on the map too.
- Phones: 4 stars a row (narrow cells), panel padding 12 px, so the map is ~25 % shorter.

### 2.5 Interaction fixes
- `kin.js` gets two layers: `setKinBase(id | ids)` (the map's open star, a hero plate) and
  `setKinHover(id | ids)` (a bead, a plate hover); the effective kin is `hover ?? base`. Hovering a
  person no longer clears a pinned company's highlight.
- An external "open this star" request (`requestStar(id)` in kin.js) so the hero and the loom can pin
  a star's card after scrolling to it.

### 2.6 People (the loom) polish
- Intro: *"Everyone who has passed through DVM, by the batch they joined and the team they were on.
  The {87} with a public role show where they are now — tap a company to find it on the map."*
- Bead company → button (§2.3). Pulse state for "find in batch".
- Phones: tighter beads (photo 28, 4 px less padding).

### 2.7 Not doing
- No search, filters or toggles. No change to the data module, LegacyCircle, or the home files.
- No new motion beyond the find-pulse and the hero plates' hover.

Targets: 1440 page ≤ 6,000 px (from 9,639); phone ≤ 12,000 px (from 19,933).

---

## 3. Result (implemented)

Page height: 1440 × 900 9,639 → 6,343 px · 1024 × 768 13,985 → 11,026 px · 390 × 844 19,933 → 15,431 px.
After shots: `/tmp/v8cdp/ALUMPAGE/after/` — `full-1440.png`, `full-1024.png`, `full-390.png`, `hero-1440.png`,
`map-hover.png` (Amazon card), `plate-click.png` (Goldman Sachs plate → its star pinned), `find.png` (a
name in Amazon's card → the person found in People, card stepped aside, the other Amazon people still
lit), `loom-hover.png`, `phone-hero.png`, `phone-map.png`, `phone-sheet.png`, `phone-people.png`,
`reduced-hero.png`.
Kin bug: pin Amazon → 5 beads lit; hover Anant Verma → Microsoft lit; leave → the 5 Amazon beads are
lit again, card still pinned (eval in `/tmp/v8cdp/ALUMPAGE/tools/kin.js`).
Also fixed on the way: a pinned card used to stay clamped under the nav while the reader scrolled on,
and painted *under* the People section (each section is its own stacking context); it now steps aside
while its star is off screen and comes back with it.
