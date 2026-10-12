# `immersive` branch — DVM redesign + lab components

Built on `ujaas` (the version deployed at dvm-portfolio-redesign.vercel.app). The original site is untouched at `/`; everything new is additive.

```bash
npm install
npm run dev     # then open the routes below; a floating switcher (bottom-left, V to hide) moves between them
```

| Route | What |
|---|---|
| `/` | The original redesign, unchanged |
| `/v/v1` | **V1 · Faithful** — original hero layout, paper logo replaced by the live Mercury logo; ASCII boot preloader hands off to it; teal origami timeline ("Our Story") on home + /about; swarm behind Legacy and as hover-portraits on Team; `/v/v1/archive` |
| `/v/v2` | **V2 · Reframed** — "Mercury Lake" hero; ONE persistent live mercury mark (`chrome/mark.jsx`): hero chrome → clear glass beside About (kit `backdrop.clarity`) → x-ray → collapse/flip/dock into the navbar slot, docked on every page, flies into the new full-screen menu; original preloader + original Projects; V1-style Legacy swarm; `/v/v2/legacy` (Legacy + teal origami year-by-year); terminal contact; `/v/v2/archive` |
| `/v/v3` | **V3 · Medium shift** — one scroll story: ASCII boot → Mercury → swarm (About, teams, stats, fests) → paper mark → origami timeline → archive wall teaser; `/v/v3/archive` |
| `/kit/mercury` `/kit/ascii` `/kit/timeline` `/kit/swarm` `/kit/archive` | Sandboxes for the reusable components |

## Layout
- `src/immersive/kit/<name>/` — reusable components (each has a `README.md` with props/embedding): `MercuryLogo`, `AsciiLogo`/`AsciiBoot`/`AsciiImage`, `FoldTimeline`, `SwarmField`/`SwarmProvider`, `ArchiveWall`.
- `src/immersive/Hosts.tsx` — auto-discovers kit demos and variants; `src/main.jsx` routes `/kit/*` and `/v/*`.
- `src/immersive/shared/logo.ts`, `src/immersive/data/*` — DVM mark geometry and real content; images in `public/assets/`.
- `src/variants/v1|v2|v3/` — full-site variants (copies of base pages where modified; links stay inside the variant).
- `docs/kit/*.png`, `docs/variants/*.png` — screenshots.

## Notes
- Base CSS leaks globally (`* { overflow-x: hidden }` in HomePage.module.css, `footer { position: absolute }` in ArtworkPage.css); kit/variants work around it.
- Contact in the variants posts to the same web3forms endpoint as the base.
- Heavy WebGL pieces mount only near the viewport (≤ 2 live contexts on any page) and dispose on unmount.
