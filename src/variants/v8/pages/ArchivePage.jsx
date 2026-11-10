// /archive: the ArchiveWall kit (src/immersive/kit/archive), fixed full screen under V8's bar.
// Only the wall, its HUD and minimap: no title chip, no filter tabs, no List toggle (so the L key
// does nothing either). The kit keeps the built-in dossier and the URL (?item=, routing on; the
// Artwork page deep-links with it). V8 only refines it: the bar's height as the inset, V8's panel
// / ink colours through the kit's theme, and V8's faces through the kit's own CSS custom
// properties (pages.module.css .archive). No kit file changes.
//
// It settles a little further out than the kit's default framing: the kit has no initial-zoom
// option, so once its close-up pull-back intro is nearly done, V8 eases the camera out to 0.7×
// with the handle's zoomBy() (at once under reduced motion, which has no intro). Skipped when a
// deep link opens a tile or the visitor has already moved the wall. "Return to 0, 0" still flies
// to the kit's own default framing.
//
// With the tabs hidden, a filter can still be set (the dossier's "Show only … on the wall", or a
// ?f= link), so V8 shows the active filter with a "Show everything" reset.
import { useEffect, useRef, useState } from "react";
import { ArchiveWall, BUILTIN_FILTERS } from "../../../immersive/kit/archive";
import Navbar from "../chrome/Navbar";
import { useMedia } from "../lib/hooks";
import ui from "../ui.module.css";
import s from "./pages.module.css";

/** The kit's five theme keys: V8's --teal, --bg, --bg-2, --ink, --ink-2. */
const ARCHIVE_THEME = { accent: "#45e6ff", bg: "#050506", panel: "#0a0c0e", ink: "#f2f5f7", muted: "#a9b2b8" };
/** Resting zoom relative to the kit's default framing. */
const START_ZOOM = 0.7;
/** The kit's intro flight ends at 450 ms delay + 2600 ms (engine/WallEngine.ts); start the
 *  zoom-out in its last stretch so the two read as one pull-back. */
const INTRO_TAIL_MS = 2850;

export default function ArchivePage() {
  const narrow = useMedia("(max-width: 759px)");
  const mainRef = useRef(null);
  const wallRef = useRef(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    let item = null;
    try {
      item = new URLSearchParams(window.location.search).get("item");
    } catch {
      item = null;
    }
    if (item) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let moved = false;
    const note = () => {
      moved = true;
    };
    const onKey = (e) => {
      if (e.key.startsWith("Arrow") || ["+", "=", "-", "_", "0", "Enter"].includes(e.key)) moved = true;
    };
    main.addEventListener("pointerdown", note, { capture: true, passive: true });
    main.addEventListener("wheel", note, { capture: true, passive: true });
    window.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => {
      if (!moved) wallRef.current?.zoomBy(START_ZOOM);
    }, reduced ? 0 : INTRO_TAIL_MS);
    return () => {
      window.clearTimeout(t);
      main.removeEventListener("pointerdown", note, { capture: true });
      main.removeEventListener("wheel", note, { capture: true });
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <>
      <Navbar />
      <main ref={mainRef} className={s.archive} data-light="50% 45% 40vw" data-cursor="grab">
        <h1 className={ui.srOnly}>Archive</h1>
        <ArchiveWall
          ref={wallRef}
          routing
          insetTop={narrow ? 64 : 72}
          quality="auto"
          texture
          background="standalone"
          theme={ARCHIVE_THEME}
          title={false}
          showTabs={false}
          showList={false}
          showHud
          showMinimap
          onFilterChange={setFilter}
        />
        {filter !== "all" && (
          <p className={s.archiveFilter} role="status">
            <span>Showing {BUILTIN_FILTERS[filter]?.label ?? filter}</span>
            <button type="button" className={ui.link} onClick={() => wallRef.current?.setFilter("all")}>
              Show everything
            </button>
          </p>
        )}
      </main>
    </>
  );
}
