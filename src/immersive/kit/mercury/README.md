# mercury

The DVM mark as raymarched liquid mercury (raw WebGL2, one fullscreen fragment shader, no three.js).
Exact polygon SDF of the logo, extruded with rounded edges and smooth-unioned with metaball droplets.
Demo: `/kit/mercury` (add `?stats` for a live stats line, `?quality=high` to force a tier).

```tsx
import { MercuryLogo, MercuryBadge, paintHeroBackdrop } from './immersive/kit/mercury' // src/immersive/kit/mercury
```

## `<MercuryLogo />`

Fills its positioned parent (`position:absolute; inset:0`). The canvas never takes pointer events.

| prop | default | |
|---|---|---|
| `background` | `'transparent'` | `'transparent'`: premultiplied alpha (SDF hit + cone-traced edge coverage, soft drop shadow, x-ray lines), composites over the hero's texture and grid with no box. `'studio'`: its own cyclorama plus a glossy floor reflection and caustics. |
| `material` | `'chrome'` | `'chrome' \| 'glass' \| 'xray'`. Ignored when `progress` is set. |
| `progress` | – | 0 chrome → 1 glass → 2 x-ray (fractions blend). `progressRange={1}` makes it 0..1. |
| `smoothing` | `6` | Approach rate (1/s) toward a new progress. `0` = follow exactly. |
| `env` | `'teal'` | `'teal'` (cool cyan soft boxes, #45e6ff rim) or `'neutral'` (the lab's original, violet card), or a custom `MercuryEnv`. |
| `tint` | – | Hex accent: re-colours the low card, rim strip, x-ray lines and studio glow. |
| `sheen` | `1` | Oil-slick thin-film strength (0 = clean chrome, 2 = heavy). |
| `exposure` | `1` | |
| `shadow` | `0.6` / `0` studio | Soft shadow on an implicit plane behind the mark. |
| `floor` | `1` | Studio floor reflection and caustics. |
| `reflection` | `0` | Transparent mode only: a liquid-mirror pool under the mark (the studio floor's raymarched reflection + caustics), composited as light over the page. 0 = off (default, unchanged behaviour); values above 1 strengthen it. Used by variant v2's "mercury lake" hero. |
| `contours` | `1` | X-ray distance-field contour lines around the mark. |
| `fit` | `{ mode:'contain', padding:0.12, scale:1, x:0, y:0 }` | Sizes the mark inside the box. `padding` is a fraction per side. `x`/`y` offset the centre in half-box units (x right, y down). `mode:'height'\|'width'` fits one axis. |
| `rotation` | `{ yaw:0.08, pitch:-0.13 }` | Base orientation (radians). |
| `tilt` | `1` | How far the mark turns toward the cursor. |
| `sway` | `1` | Idle drift. |
| `interactive` | `true` | Cursor droplets: a neck pulls out of the nearest edge and snaps into a free bead past ~0.36 mark heights, then re-attaches. Click drops a bead with a ripple. Touch: drag pulls, tap drops. Active below progress 1.6. |
| `pointerTarget` | `'parent'` | `'parent' \| 'self' \| 'window' \| HTMLElement \| RefObject`. Listen on the element that holds your overlaid DOM (e.g. the hero). Clicks on `a, button, input, label, [data-noblob], [data-mercury-ignore]` are ignored. While the cursor is over the mark the target gets `data-mercury-hover` (for custom cursors). |
| `backdrop` | – | What glass refracts: `{ source: url \| img \| canvas \| video, element?, fit?: 'cover', live?, frost?: 1.2, clarity?: 0 }`. `clarity` (0..1) makes the glass clearer: less frost toward the edges, less body haze, milky veil, thin-film tint and chromatic split, a thinner lens, and (transparent background) faces turned toward the viewer let the live page through under the refraction. Added for variant v2; 0 keeps the original look. `element` is the box the image is laid out over (as CSS `background-size: cover`). Without it, studio glass refracts the cyclorama and transparent glass is see-through (body tint + reflections). |
| `quality` | `'auto'` | `'low' \| 'medium' \| 'high' \| { scale, steps }`. Auto starts at tier 2 (1.2 device px per CSS px, 80 steps; tier 1 on touch) and drops a tier when frames run slower than ~51 fps. DPR is capped at 2. |
| `fps` | `0` | Frame cap (0 = display rate). |
| `animate` | `true` | `false` renders still frames on demand. `prefers-reduced-motion` forces this (no intro, droplets, sway or tilt; material changes are instant). |
| `intro`, `introDelay` | `true`, `0` | Fade in while three beads fall into the mark and ripple it. |
| `label` | `'DVM'` | `role="img"` label. |
| `onReady` | – | After the first frame. |

Ref handle (`MercuryLogoHandle`): `setProgress(p, immediate?)`, `setRotation(yaw, pitch?, immediate?)`, `drop(x?, y?)`, `ripple(amount?)`, `playIntro(delay?)`, `refreshBackdrop()`, `getStats()`, `canvas`.

## `<MercuryBadge />`

`size` (36), `env`, `tint`, `material`, `sheen`, `hoverRipple`, `animate`. Uses its own small WebGL context: full density, 56 steps, 30 fps cap, no droplets, tilts toward the cursor while hovered. Fine for a navbar plus a footer. Each badge is one context (browsers allow about 16), so don't use it for long lists.

## Embedding

**Homepage hero (replacing `Logo.jsx`'s paper logo).** Keep Logo.jsx's pin/scale/move wrapper and put the mark inside it. The wrapper is `pointer-events:none`, so take events from the hero:

```jsx
const heroRef = useRef(null), merc = useRef(null)
// in Logo.jsx's floating wrapper (sized like the old image):
<div style={{ position: 'absolute', inset: 0 }}>
  <MercuryLogo ref={merc} pointerTarget={heroRef} fit={{ padding: 0.19, y: 0.035 }} introDelay={0.9} />
</div>
```

`fit={{ padding: 0.19 }}` on a full-viewport box matches the old logo's ~55% height. Rather than CSS `rotateY` for the scroll spin, scrub `merc.current.setRotation(progress * Math.PI * 2)` so the metal relights as it turns.

**Scroll-driven material** (parent owns the ScrollTrigger):

```js
ScrollTrigger.create({ trigger, start: 'top top', end: 'bottom bottom', pin: stage,
  onUpdate: (st) => merc.current.setProgress(st.progress * 2) })
```

**Glass that refracts the hero.** Paint the hero's layers (bg_3 through its mask, grid, outlined letters, colour wash) into a canvas, then call `refreshBackdrop()` after repainting (when the mask moves):

```js
paintHeroBackdrop(canvas, { width, height, texture: bg3Img, letters: lettersImg, mask: { x, y, r } })
<MercuryLogo backdrop={{ source: canvas, element: heroRef }} />
```

**Standalone** (404, loader): `<MercuryLogo background="studio" />` inside any sized, positioned box.

## Performance and lifecycle

- One draw call per frame. Bounding-sphere early-out, so pixels away from the mark cost a ray-sphere test (plus one 2D SDF for the shadow or x-ray lines). CPU is about 0.1–0.2 ms per frame with no per-frame allocation.
- Measured on an Apple-silicon Mac (headless Chrome, Metal): full-viewport hero at 1440×900 holds 60 fps at tier 2 (1728×1080 buffer at DPR 2) and at `quality="high"` (2477×1548).
- Pauses off-screen (IntersectionObserver, 120px margin) and while the tab is hidden. ResizeObserver handles layout. On unmount it disposes the program, buffers and textures, then calls `WEBGL_lose_context`. A restored context remounts itself. Without WebGL2 it shows a static silver SVG mark.
- No three.js. The logo polygons are parsed from the SVG path data in `logoSdf.ts`.
