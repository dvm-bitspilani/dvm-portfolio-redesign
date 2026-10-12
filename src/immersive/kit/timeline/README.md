# timeline: `<FoldTimeline />`

The ORIGAMI scroll timeline, ported from the hero lab. The DVM mark is one strip of black paper with seven real creases. As you scroll, it unfolds into a long, lit strip with foil-stamped years, a ruler, crease notation and a perforation. Each year's projects and posts hang from it on copper (or teal) threads. Demo: `/kit/timeline`.

```tsx
import { FoldTimeline, buildArchiveStops, buildMilestoneStops } from '@/immersive/kit/timeline'

<FoldTimeline tone="teal" title="The archive, year by year" intro={<h2>Archive</h2>} />
```

## Props

| prop | default | notes |
|---|---|---|
| `items` | `buildArchiveStops()` | `FoldTimelineStop[]`: `{ year, label?, note?, entries: { label, kind?, href?, external?, data? }[] }`. Stamped labels read best at 7 characters or fewer. Fourteen stops or fewer keep the captions roomy. |
| `tone` | `'copper'` | `'copper'` is the original warm foil on black paper. `'teal'` is silver/teal foil (#45e6ff) with Stretch Pro years and faint grid rules on the wall. |
| `startFolded` | `true` | `true` starts as the folded mark, unfolds, then pans. `false` starts with the flat strip in overview, zooms in, then pans. |
| `foldOnEnter` | `true` | The flat strip folds itself into the mark the first time the section comes into view. |
| `height` | `0.9` | Scroll length per stop, in viewport heights. |
| `unfoldLength` | `1.6` | Scroll length of the unfold, in viewport heights. |
| `scrollMode` | `'self'` | `'self'` renders a section that pins itself with ScrollTrigger and maps its own scroll. `'external'` fills its parent; drive it with `progress` (0..1) or `ref.setProgress()`. |
| `scroller` | window | ScrollTrigger `scroller` (a selector or an element) for custom scroll containers. |
| `pin` | `'scrolltrigger'` | `'sticky'` uses CSS sticky instead. Sticky does not work under the redesign's global `* { overflow-x: hidden }` (from `HomePage.module.css`), so keep the default there. |
| `layout` | `'auto'` | `'auto'` switches to the vertical strip when the container is narrower than `verticalBelow` (760), when reduced motion is on, or when WebGL2 is missing. Also `'horizontal'` and `'vertical'`. |
| `background` | `'standalone'` | `'standalone'` is the dark lit wall with a halo. `'transparent'` drops the wall and post-processing, so the page shows through. The cast shadow still lands. |
| `quality` | `'auto'` | `'high'` uses an 8k print texture, 2k shadows, N8AO and bloom. `'low'` uses 4k, 1k shadows, no AO and DPR ≤ 1.5. `'auto'` picks low on coarse pointers or ≤ 4 cores. |
| `interactive` | `true` | Cursor glint across the foil, crease lift and tilt on the mark, and camera sway. |
| `physics` | `false` | Grab and throw the folded mark. This lazy-loads `@react-three/rapier` (a separate chunk of about 850 kB gzipped), and only when on. |
| `maxEntries` | `7` | The rest go behind a "N more from YEAR" toggle. The vertical layout shows everything. |
| `onSelect(entry, stop, event)` | | Runs on every entry click. Call `event.preventDefault()` to stop the link. Internal `/…` hrefs render as router `<Link>` when a router is present. |
| `onActiveChange(index, stop)` | | Fires when the stop under the camera changes. |
| `intro` | | An overlay beside the mark that fades as the strip unfolds. When it is present, the mark sits right of centre. It also becomes the header of the vertical strip. |
| `title` | | Accessible name, and the vertical-strip heading when there's no `intro`. |

Ref (`FoldTimelineHandle`): `setProgress(p)`, `getProgress()`, `scrollToStop(i)` (smooth-scrolls the page to that stop, or jumps in external mode), `refresh()` (`ScrollTrigger.refresh()`).

Data helpers:
- `buildArchiveStops({ includeBlogs, projectHref, blogHref })` covers every dated project and blog, by year. A project links to the redesign's `/projects/:pk`, matched by name against `src/projects.json`, or to its live/YouTube link.
- `buildMilestoneStops()` is a history-flavoured set: fest themes, firsts, and team intake per year.

## Embedding

- **In a page flow (default):** drop it between sections. It renders a `100vh` stage plus ScrollTrigger pin spacing of about `(0.15 + unfold + 0.7 + (n-1)·height + tail)` viewports. If content above it changes height later, call `ref.current.refresh()`.
- **Driven by a parent timeline:** `<div style={{position:'relative',height:'100vh'}}><FoldTimeline scrollMode="external" progress={p} /></div>`, or call `ref.setProgress(p)` from your own ScrollTrigger `onUpdate`, which avoids React renders. Progress is eased inside the render loop.
- **Over the teal texture:** use `background="transparent"` with `tone="teal"`.
- **As a list only:** `layout="vertical"`. This needs no three.js. The canvas lives in a lazy chunk (`TimelineCanvas`, about 115 kB gzipped plus the shared three chunk), so the vertical/mobile path never downloads WebGL code.

## Performance

- On an M-series Mac in Chrome at 1440×900 / DPR 2: a steady 60 fps on the folded mark, during the pan, and during continuous scrolling, with about 84 MB JS heap for the whole demo page. The heaviest frames are the unfold, when nine panels are posed per frame. There are no per-frame allocations, and caption DOM writes are skipped when nothing moved.
- Rendering stops (`frameloop="never"`) when the stage is off-screen (IntersectionObserver) or the tab is hidden.
- On unmount it disposes the print canvases, textures, geometries and materials. R3F disposes the renderer. The ScrollTrigger is killed and its pin reverted before React removes the DOM.
- The core module (FoldTimeline, the vertical strip and the data glue) is about 8 kB gzipped.

## Accessibility and motion

- Captions are real lists of links. Tabbing into a caption that's off-screen scrolls the page to that stop.
- `prefers-reduced-motion` switches `auto` layout to the static vertical strip. A forced `horizontal` layout still drops the intro fold, glint, sway and progress easing.
- The vertical strip keeps the paper language: gilt edges, a ruler, valley and mountain crease marks, foil-stamped years whose sheen follows the scroll, threads with beads, the folded mark at the head and an angled tail.

## Limitations

- The strip has a fixed length (the unfolded mark is about 3.6 logo-heights long), so stops get closer together as you add more. Caption width shrinks with the spacing, down to 170px. Past about 16 stops, labels shrink and captions get tight; group them, for example by fest edition.
- On the folded mark the print shows through faintly (5%), as in the lab.
- Glint and tilt are disabled on touch devices, which normally get the vertical layout anyway.
