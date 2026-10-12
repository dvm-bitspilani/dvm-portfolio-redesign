# kit/ascii — DVM://BOOT shape-matched ASCII

Port of the lab BOOT engine (`dvm-hero-lab/src/designs/boot/engine`): a software rasteriser
lights the extruded DVM mark per pixel (key light, specular, rim, cursor light, crease
darkening). A summed-area table samples 6 inner and 10 neighbour taps per cell, and a 6-D
nearest-neighbour search over 95 ASCII glyph shapes picks each character (3-bit quantised
cache). Flat cells fall back to a ` .:-=+*#%@` brightness ramp. Output goes either through a
WebGL CRT pipeline (afterglow, bloom, curvature, scanlines, grille) or a flat 2D canvas.

Demo: `http://localhost:5200/kit/ascii` (`?once` tests the once-per-session boot).

```tsx
import { AsciiBoot, AsciiImage, AsciiLogo } from './immersive/kit/ascii'
```

## `<AsciiLogo />`

Fills its positioned parent (`position:absolute; inset:0`). Ref: `AsciiLogoHandle`.

| prop | default | |
|---|---|---|
| `palette` | `'teal'` | `'teal'` (#45e6ff) · `'green'` · `'amber'` · `'ice'` · `'pale'` |
| `color` / `hotColor` | – | custom ink / highlight hex (overrides palette) |
| `cellSize` | `'auto'` | glyph px; auto ≈ `min(h/56, w/38)` clamped 6–14 |
| `font` | `'vt323'` | `'jetbrains'` · `'plex'` · any loaded CSS family (shape table is built per font) |
| `crt` | `true` | `false` = flat terminal print (2D canvas, no WebGL). Object form: `{ curvature, scanlines, bloom, afterglow, grille, vignette, noise }` |
| `bezel` | `false` | dark plastic surround + recessed glass |
| `transparent` | `false` | glyphs composite over the page (premultiplied alpha) |
| `background` | `#000` CRT / `#050506` flat | when not transparent |
| `interactive` | `true` | drag to spin with inertia, cursor light (page-wide), denser glyphs near the cursor, dotted probe field, ←/→ keys |
| `autoRotate` | `0.32` | rad/s spin, `'sway'` (rock around `restPose`), or `false` |
| `rotation` | – | `{ yaw, pitch, roll }` offset added every frame (drive from ScrollTrigger progress) |
| `restPose` | `{ yaw: -0.5, pitch: 0.1 }` | start / sway centre |
| `reveal` | `'decode'` | `'decode'` scramble-in + light sweep · `'scan'` rows print top→bottom · `'print'` glyph by glyph with a block cursor · `'none'` |
| `revealDuration` / `revealDelay` | `1.7` / `0` | seconds |
| `scale` | `0.78` | share of the box height the mark spans |
| `quality` | `'auto'` | raster supersampling + rate: `low` 5px/20 Hz, `auto` 7px/30 Hz, `high` 9px/60 Hz |
| `probe` · `caption` · `paused` | `true` · `false` · `false` | |
| `renderer` | `'auto'` | WebGL when `crt`, 2D when flat; force either |
| `onRevealEnd` | – | |

Handle: `glitch(strength = 0.8)`, `replay(delay?)`, `spin(radPerSec)`, `setPose(yaw, pitch)`, `canvas`.

```tsx
// hero-side card over the teal texture
<div className={styles.card} style={{ position: 'relative' }}>
  <AsciiLogo transparent autoRotate="sway" caption
    crt={{ curvature: 0, grille: 0, vignette: 0, scanlines: 0.55, noise: 0.5 }} />
</div>

// scroll-driven
<AsciiLogo autoRotate={false} rotation={{ yaw: progress * Math.PI * 2 }} reveal="none" />
```

## `<AsciiBoot />`

Preloader overlay (`position:fixed; z-index:999999`, same slot as `PreLoader.jsx`). Power-on,
a BIOS POST written from `src/immersive/data` (5 teams, member count, batches, per-fest build
counts, projects/videos, posts/artworks, 5000+ users, the "up to no good" tagline), a small
2D-matched "energy star" mark, then the 3D mark spins in and decodes with the department name
typed under it, then the tube powers off onto the page. ≈ 3.9 s at `speed={1}`.

| prop | default | |
|---|---|---|
| `onDone` | – | after the exit finishes (or immediately if `once` already ran) |
| `onExit` | – | when the exit (power-off / fade) starts, i.e. as the page underneath begins to show (hand-off cue) |
| `once` | `false` | sessionStorage gate; `true` → key `imm-ascii-boot`, or pass your own key |
| `skippable` | `true` | any key / click / tap and a real "Skip intro" button |
| `waitForLoad` / `maxWait` | `false` / `4` | hold on the logo until `load` + fonts, capped (matches PreLoader) |
| `speed` | `1` | time multiplier |
| `palette` `color` `hotColor` `crt` | teal, CRT | as AsciiLogo (read at mount) |
| `exit` | `'auto'` | `'power-off'` (tube collapses while the overlay background fades, CRT default) or `'fade'` (opacity + scale like PreLoader) |
| `lines` | built-in POST | `BootLine[]`: strings, or `{ text, dur, bright, gap }` with `text(p, narrow)` animating 0..1 |
| `logo` | `true` | end on the assembling mark |
| `contained` | `false` | absolute inside the parent instead of the viewport |
| `lockScroll` | `!contained` | |

Replacing `PreLoader` in `App.jsx`: render the app underneath so the power-off reveals it.

```jsx
const [booting, setBooting] = useState(true)
return (
  <>
    {booting && <AsciiBoot waitForLoad once onDone={() => setBooting(false)} />}
    {/* …routes as before… */}
  </>
)
```

## `<AsciiImage src />`

Any same-origin / CORS image → ASCII (auto-levels at 2/99 %, edge-clamped sampling, tone ramp
for flat areas). Flat 2D by default (no WebGL context, so a grid of covers is fine). Props:
`src alt palette color cellSize('auto' ≈ w/52) font crt transparent background fit('cover')
focusY(0.4) gamma(0.9) invert reveal('scan'|'decode'|'none') revealDuration interactive onLoad onError`.
Hover raises glyph density under the cursor. Handle: `glitch()`, `replay()`, `canvas`.

## Performance

Measured on an M-series Mac, Chrome:

- Logo conversion (raster + SAT + match) runs at 30 Hz. A 126×56-cell hero card costs about
  3.7 ms, the boot screen at 1440×900 about 4.5 ms, and a small 34×48 tile about 0.9 ms. Wide boxes are cropped to a centred region about as wide as the
  mark, so a full-width background costs the same as a square card.
- Glyph matches are cached (262k-entry table per font), so steady-state matching is mostly lookups.
- The demo (hero + pair + 5 CRT tiles + 3 images, 7 WebGL contexts) holds 60 fps.
- CRT mode re-composites every frame (noise and flicker). Flat mode with `autoRotate={false}`
  goes idle. It only redraws on pointer or prop changes.
- DPR capped at 2. Rendering pauses off-screen (IntersectionObserver, 120px margin) and in hidden tabs.
- Each `crt` instance owns one WebGL context (browsers cap at about 16). If a context is lost,
  that instance falls back to the 2D renderer on its own. Use `crt={false}` for many-up grids.

## Lifecycle

- Fills the parent and follows it with a ResizeObserver. Atlases are rebaked only when the
  device-pixel font size changes.
- Unmount disposes render targets, textures, materials and the renderer, forces context
  loss, and removes the canvas and all listeners. Remounting creates a new canvas.
- `prefers-reduced-motion`: no auto-rotate, reveal, glitch, flicker or afterglow, and no
  power-on. The boot goes straight to the finished screen and fades after about 1 s. Drag still works.
- Scoped CSS module (`ascii.module.css`), no globals. Fonts come from the installed fontsource
  packages (VT323, JetBrains Mono, IBM Plex Mono).

## Limitations

- On touch screens `touch-action: pan-y` keeps the page scrollable, so a drag only spins the mark (no pitch).
- `AsciiBoot` theme and CRT props are read once at mount.
- `AsciiImage` needs CORS for cross-origin images. A tainted canvas leaves it blank.
