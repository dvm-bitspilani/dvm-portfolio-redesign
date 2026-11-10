// The archive, from V3 (src/variants/v3/home/Home.jsx + ArchiveTeaser.jsx): the outlined DVM
// mark draws itself as one teal line, exactly where the archive wall's centre mark will be, and
// the wall fades in around it as a living backdrop (no input) with the door to /archive. Once
// wall and copy are in they hold for a beat, then the pin lets go and the whole stage (wall,
// scrim and copy as one) scrolls up with Contact right beneath it: the copy is never left
// standing without the wall, and no empty viewport opens between the two sections.
// On the desktop home this track starts under the end of Year by year (Story.jsx pulls it up with
// a negative margin), so the line draws while the timeline fades out over it; the stage lets
// clicks through to the timeline until its own copy is in.
// The wall is decorative: inert and hidden from assistive tech (the kit renders a link per record
// for its own keyboard navigation); "Open the archive" is the way in. It is its own WebGL
// context: it exists only while the section is near the viewport and is unmounted (not latched)
// once the reader has moved on.
// Reduced motion: no pin and no scrubbed fades; the wall, scrim and copy simply sit in the flow.
import { useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArchiveWall } from "../../../immersive/kit/archive";
import { LOGO_PATHS } from "../../../immersive/shared/logo";
import { projects, artworks, team } from "../../../immersive/data";
import { P } from "../lib/paths";
import { useNear, useReducedMotion } from "../lib/hooks";
import { smooth } from "../lib/math";
import ui from "../ui.module.css";
import s from "./end.module.css";

gsap.registerPlugin(ScrollTrigger);

const LOGO_VIEWBOX = "-470.31 -227.2 250.53 326.78";

/* Pinned progress (0..1 over 60vh): the line draws, the wall takes over from it, the copy comes
   in over the wall, then everything holds until the pin lets go. Nothing fades out. */
const LINE_IN = [0, 0.1];
const DRAW = [0.02, 0.42];
const LINE_OUT = [0.62, 0.86];
const WALL_IN = [0.36, 0.74];
const COPY_IN = [0.54, 0.8];

export default function ArchiveEnd() {
  const wrapRef = useRef(null);
  const stageRef = useRef(null);
  const bridgeRef = useRef(null);
  const wallRef = useRef(null);
  const scrimRef = useRef(null);
  const copyRef = useRef(null);
  const reduced = useReducedMotion();
  // mounts as the track comes 60% of the way up the viewport (the line has the stage first) and
  // a quarter viewport early when coming back up from Contact
  const near = useNear(wrapRef, "25% 0px -40% 0px");

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const stage = stageRef.current;
    if (reduced || !wrap || !stage) return;
    const copy = copyRef.current;
    const layers = [wallRef.current, scrimRef.current, copy];
    const apply = (p) => {
      const bridge = bridgeRef.current;
      if (bridge) {
        bridge.style.setProperty("--draw", (1 - smooth(DRAW[0], DRAW[1], p)).toFixed(3));
        bridge.style.opacity = (smooth(LINE_IN[0], LINE_IN[1], p) * (1 - smooth(LINE_OUT[0], LINE_OUT[1], p))).toFixed(3);
      }
      // the scrim only exists where the wall does, so the room's grid never shows a seam
      const wallO = smooth(WALL_IN[0], WALL_IN[1], p).toFixed(3);
      if (wallRef.current) wallRef.current.style.opacity = wallO;
      if (scrimRef.current) scrimRef.current.style.opacity = wallO;
      if (copyRef.current) {
        const enter = smooth(COPY_IN[0], COPY_IN[1], p);
        copyRef.current.style.opacity = enter.toFixed(3);
        copyRef.current.style.visibility = enter < 0.01 ? "hidden" : "visible";
        copyRef.current.style.transform = `translate3d(0, ${((1 - enter) * 24).toFixed(1)}px, 0)`;
      }
    };
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: wrap,
        start: "top top",
        end: "bottom bottom",
        pin: stage,
        pinSpacing: false,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => apply(self.progress),
        onRefresh: (self) => apply(self.progress),
      });
    }, wrap);
    return () => {
      ctx.revert();
      // hand the layers back to the stylesheet (e.g. reduced motion switched on)
      for (const el of layers) el?.style.removeProperty("opacity");
      copy?.style.removeProperty("visibility");
      copy?.style.removeProperty("transform");
    };
  }, [reduced]);

  return (
    <section ref={wrapRef} id="archive" className={`${s.track} ${reduced ? s.still : ""}`} data-light="50% 43% 30vw" data-chapter="The archive" aria-labelledby="v8-archive-title">
      <div ref={stageRef} className={s.stage}>
        <div ref={wallRef} className={s.wall} aria-hidden="true" inert>
          {near && (
            <ArchiveWall
              interactive={false}
              showTabs={false}
              showHud={false}
              showMinimap={false}
              showList={false}
              title={false}
              intro={false}
              keyboard={false}
              detail="none"
              quality="auto"
              background="transparent"
              texture={false}
            />
          )}
        </div>
        <div ref={scrimRef} className={s.scrim} aria-hidden="true" />

        {!reduced && (
          <svg className={s.bridge} ref={bridgeRef} viewBox={LOGO_VIEWBOX} aria-hidden="true">
            {LOGO_PATHS.map((d) => (
              <path key={d.slice(0, 16)} d={d} pathLength="1" />
            ))}
          </svg>
        )}

        <div ref={copyRef} className={s.copy}>
          <h2 id="v8-archive-title" className={ui.h2}>
            The archive
          </h2>
          <p className={ui.lede}>
            {projects.length} projects, {artworks.length} artworks and {team.length} members on one wall.
          </p>
          <p className={s.action}>
            <Link to={P("/archive")} className={`${ui.btn} ${ui.btnPrimary}`}>
              Open the archive
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
