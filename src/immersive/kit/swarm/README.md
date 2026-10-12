# swarm

The GPGPU particle swarm from the hero lab, ported to plain three.js with `GPUComputationRenderer` + `postprocessing` bloom. About 200k particles (65k on touch devices) spring toward a target shape, with curl noise and a per-particle staggered morph. The cursor leaves a repel/vortex wake, and press-and-hold opens a black hole. Rendering uses additive soft points, a velocity colour ramp and bloom.

Demo: `/kit/swarm` (full-page ambient + hover index) and `/kit/swarm?view=embed` (bounded field + every prop).

## Three ways to use it

```tsx
import { SwarmField, SwarmProvider, SwarmSection, useSwarm, useSwarmHover, useSwarmSection } from '@/immersive/kit/swarm'
```

**1. Hero element.** `SwarmField` fills its positioned parent:

```tsx
const swarm = useRef<SwarmController>(null)
<section style={{ position: 'relative', height: '100vh' }}>
  <SwarmField ref={swarm} target="logo" placement="right" background="transparent" />
  <div className={styles.copy}>…</div>
</section>
// later: swarm.current?.setTarget({ text: 'APOGEE' })
```

**2. Full-page ambient background that re-targets on scroll.** Put `SwarmProvider` above your `<Routes>` so the canvas survives route changes. Each section names its formation, and the one crossing the middle of the viewport wins (one shared IntersectionObserver).

```tsx
<SwarmProvider zIndex={0}>            {/* fixed canvas behind everything */}
  <main style={{ position: 'relative', zIndex: 1 }}>
    <SwarmSection target="logo" placement="right">…</SwarmSection>
    <SwarmSection target={{ text: 'BOSM\nOASIS\nAPOGEE' }} placement="right">…</SwarmSection>
    <section ref={useSwarmSection('galaxy', { placement: 'left' })}>…</section>
  </main>
</SwarmProvider>
```

**3. Hover-driven.** The override sits on top of the base formation and is released when the pointer leaves:

```tsx
const bind = useSwarmHover({ placement: 'right' })        // nearest provider
// or useSwarmHover({ controller: swarmRef }) for a standalone SwarmField
<li {...bind({ image: project.cover })}>…</li>
```

## Targets

| target | notes |
|---|---|
| `'logo'` | DVM mark (area + 3D surface samples), sways in 3D |
| `{ text, font?, weight?, tracking? }` | `\n` for lines. Default font is Stretch Pro, with tracking 6 (non-zero tracking also kills Stretch Pro's doubled-letter ligatures) |
| `{ image, fit?, invert?, contrast? }` | Luminance-sampled. `fit`: `'contain'` (default) / `'cover'` (crops to the placement's aspect) / `'portrait'` (oval vignette for faces). `invert: 'auto'` (default) samples the dark detail of mostly-white images. Cross-origin images need CORS |
| `{ points: Float32Array, stride?: 3 \| 4, key? }` | Your own cloud, normalised and resampled. Pass `key` if you rebuild the array |
| `'cloud'` / `'galaxy'` / `'ring'` | Procedural presets (galaxy/ring are tilted and spin) |

## SwarmField props

| prop | default | |
|---|---|---|
| `target` | – | Declarative target; changing it morphs |
| `placement` | `'center'` | `'full' \| 'center' \| 'left' \| 'right'`, a `{x0,y0,x1,y1}` rect (0..1, y down) or `(w, h) => rect`. Presets collapse to a top band when the canvas is < 760px wide |
| `fill`, `spin`, `tilt`, `sway` | per target | Fraction of the rect, rad/s about Y, rad about X, sway amplitude |
| `morphDuration` | `1.4` | Seconds for the staggered morph |
| `kick`, `burst` | `0.55`, `0` | Turbulence / outward burst on change |
| `palette` | `'teal'` | `'teal'` (#127a92 → #45e6ff → #cfe8ff → white), `'violet'` (lab original) or 4 hex stops |
| `count` | `'auto'` | ≈200,704 desktop / 65,536 touch, or a number. Rebuilds the GPU side |
| `quality` | `'auto'` | `'low'` 102k / DPR 1, `'high'` 262k / DPR 2 (touch: 32k / 102k) |
| `interactive` | `true` | Cursor wake + parallax |
| `holdToAttract` | `true` | Mouse/pen hold on empty space (not on text, links or `[data-swarm-nohold]`) |
| `background` | `'#050506'` | `'transparent'` composites as light over your DOM, without dark discs |
| `bloom` | `true` | |
| `parallax`, `brightness` | `0.35`, `1` | |
| `paused`, `cursorRing` | `false`, `true` | |
| `ref` | – | `SwarmController` |

`SwarmProvider` takes the same props plus `zIndex`. `SwarmSection` takes `target`, the show options and `as`.

## Controller (`ref` / `useSwarm()`)

`setTarget(t, opts?)`, `override(t, opts?)`, `clearOverride()`, `preload(targets[])`, `scrub(a, b, t, optsA?, optsB?)` (drive from a GSAP ScrollTrigger `progress`; preload first), `explode(strength?)`, `stats()`. The controller outlives engine rebuilds and replays the current formation onto a new engine.

## Performance

- One WebGL context per field. Use a single `SwarmProvider` per app rather than many fields.
- On an M-series Mac, headless Chrome holds 60 fps at 200,704 particles (DPR 1 and DPR 1.75) with bloom.
- Sim cost is O(particles), render cost is O(pixels × bloom), DPR is capped at 1.75 (auto) or 2 (high).
- The loop pauses when off-screen (IntersectionObserver) or the tab is hidden. There are no per-frame allocations.
- Shapes are built on the main thread (~20–60 ms each), serialised one per task, and LRU-cached (12 targets × N² × 16 B; ~3 MB each at 200k). `preload()` hover targets if you want instant first hovers.
- `prefers-reduced-motion`: no noise, sway, cursor or parallax. Shapes form with stiff springs and the loop parks ~2.6 s after the last change.
- No WebGL: a static teal glow (`.noGL`) and a console warning.

## Cleanup

Unmounting disposes the GPGPU targets, geometry, material, composer and passes, and every cached target texture. It also calls `forceContextLoss()`, removes the canvas, and drops the window listeners and observers. Verified with repeated mount/unmount and route round-trips (always one canvas, zero console errors).

## Embedding notes

- The canvas has `pointer-events: none`, and the engine listens on `window`, mapping the pointer to the field's rect. Content above the field stays fully interactive.
- The redesign's global `* { overflow-x: hidden }` (HomePage.module.css) makes every element a scroll container, so `position: sticky` around a field resolves against the nearest ancestor rather than the viewport.
