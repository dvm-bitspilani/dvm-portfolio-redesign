# `immersive` branch — the DVM portfolio preview app

Built on `ujaas` (the version deployed at dvm-portfolio-redesign.vercel.app). One app shows everything: a hub at `/`, the original redesign (unmodified) at `/original`, the full-site variants, the concept lab and the component sandboxes. Deployed as a Vercel preview from this branch; production (`ujaas`) is untouched.

```bash
npm install
npm run dev     # a switcher (bottom-left, V to hide) moves between everything; the hub at / lists it all
npm run build   # → dist/ (SPA; vercel.json rewrites every path to index.html, static files win)
```

## Routes

| Route | What |
|---|---|
| `/` | **Hub** — the live mercury mark, then: The redesign (V2 featured as the chosen direction, Original, V1, V3), New directions (V4–V7), Concept lab (9 designs), Components (5 sandboxes) |
| `/original` `/original/about` `/original/blog` `/original/team` `/original/projects` `/original/projects/:name` `/original/artwork` `/original/contactus` | The original redesign, unchanged (preloader, swipe transitions, `#about` / `#legacy` anchors). Old root URLs (`/team`, `/projects/x`, …) redirect here |
| `/v/v1` | **V1 · Faithful** — original hero layout, paper logo replaced by the live Mercury logo; ASCII boot preloader hands off to it; teal origami timeline ("Our Story") on home + /about; swarm behind Legacy and as hover-portraits on Team; `/v/v1/archive` |
| `/v/v2` | **V2 · Reframed** (the chosen direction) — "Mercury Lake" hero; ONE persistent live mercury mark (`chrome/mark.jsx`): hero chrome → clear glass beside About → x-ray → collapse/flip/dock into the navbar slot, docked on every page, flies into the full-screen menu; original preloader + original Projects; V1-style Legacy swarm; `/v/v2/legacy` (Legacy + teal origami year-by-year); terminal contact; `/v/v2/archive` |
| `/v/v3` | **V3 · Medium shift** — one scroll story: ASCII boot → Mercury → swarm (About, teams, stats, fests) → paper mark → origami timeline → archive wall teaser; `/v/v3/archive` |
| `/v/v4` … `/v/v7` | **New directions** coherent with V2's brand: V4 DVM OS, V5 Reel, V6 Constellation, V7 Signal Board (each renders its own routes under `/v/<id>/*`) |
| `/lab` | **Concept lab** gallery (the 9 first concepts, from `../dvm-hero-lab`) |
| `/lab/d/<slug>` `/lab/d/<slug>/work\|team\|journal\|contact` | A lab design with the lab HUD (`[` `]` switch design, `H` hide, `Hub` back to `/`) |
| `/kit/mercury` `/kit/ascii` `/kit/timeline` `/kit/swarm` `/kit/archive` | Sandboxes for the reusable components |

## Layout
- `src/main.jsx` — the router: hub, `/original/*`, `/v/*`, `/lab/*` (lazy), `/kit/*`, legacy redirects, and the universal `Switcher`.
- `src/hub/` — `Hub.tsx` (+ `hub.module.css`), `catalog.ts` (what the hub and switcher list; variants, lab designs and kit demos are discovered from their registries), `Switcher.tsx`, `OriginalHost.jsx` (mounts `src/App.jsx` under a nested `<Router basename="/original">` driven by the app's own location/history, so the original's absolute routes and links work without edits), `isolation.ts`, `posters.json`.
- `src/App.jsx`, `src/pages`, `src/components` — the original redesign, not edited.
- `src/immersive/Hosts.tsx` — auto-discovers kit demos (`kit/*/demo.tsx`) and variants (`variants/*/meta.ts` + `index.jsx|tsx`; a meta without an index shows as "being built" on the hub and switcher).
- `src/immersive/kit/<name>/` — reusable components (each has a `README.md`): `MercuryLogo`, `AsciiLogo`/`AsciiBoot`/`AsciiImage`, `FoldTimeline`, `SwarmField`/`SwarmProvider`, `ArchiveWall`.
- `src/immersive/shared/logo.ts`, `src/immersive/data/*` — DVM mark geometry and real content; images in `public/assets/`.
- `src/variants/<id>/` — full-site variants (copies of base pages where modified; links stay inside the variant).
- `src/lab/` — the concept lab copied from `dvm-hero-lab/src/{designs,gallery,shared,data}` (`LabHost.tsx` replaces the lab's `App.tsx`; `lab.css` is its old global `index.css`, now active only on `/lab`). Paths go through `designBase()` / `LAB_BASE` in `designs/registry.ts`. Posters: `public/lab-posters/`.
- `public/hub/` — hub posters (≤1200 px JPEG) + the brand texture. Regenerate after new screenshots land with `sh scripts/hub-posters.sh` (macOS `sips`; rewrites `src/hub/posters.json` — the hub only shows posters listed there, so missing ones never 404).
- `docs/hub.png`, `docs/hub-mobile.png`, `docs/original-hero.png`, `docs/kit/*.png`, `docs/variants/*.png` — screenshots.

## Notes
- **CSS isolation.** The original's global CSS (`* { margin:0; padding:0; overflow-x:hidden }`, `html, body {…}`, `footer { position:absolute }`, …) loads with the app. A small PostCSS step in `vite.config.js` rewrites every element-level selector in `src/**` CSS (except `src/hub`, `src/lab`, `src/immersive`) to `:where(html:not([data-iso])) …` — same specificity and order, so the original and the variants render exactly as before — and the hub / lab set `<html data-iso>` while mounted, which makes those rules inert there. The lab's own reset is scoped to `html[data-iso="lab"]`.
- The variants work around the same leaks (no `position: sticky`, no bare `<footer>`).
- Contact in the variants posts to the same web3forms endpoint as the base.
- Heavy WebGL pieces mount only near the viewport (≤ 2 live contexts on any page) and dispose on unmount; the hub runs exactly one (its mercury mark).
- Build: `chunkSizeWarningLimit` is 2500 kB because `@react-three/rapier` (~2.3 MB with its inlined WASM, used only by the lab's Fold design) is one chunk. `dist/` is ~240 MB, almost all of it the original's images in `src/assests` (~190 MB) and `public/` (~36 MB).
