// The live brand mark — the board's only big WebGL piece. On the board: hover pulls droplets out
// of the mercury, "Drop a bead" drops one. Expanded (About): the mark holds the left of the tile and
// its material follows your reading position, chrome → glass → x-ray, as on V2's home page.
import { useEffect, useMemo, useRef } from "react";
import { MercuryLogo } from "../../../immersive/kit/mercury";
import Head from "./Head";
import AboutPage from "../pages/AboutPage";
import { useMobile, useReducedMotion } from "../lib/hooks";
import t from "./tiles.module.css";

const FITS = {
  home: { padding: 0.17, y: -0.06 },
  rail: { padding: 0.12, y: 0.08 },
  companion: { padding: 0.15 },
  primary: { padding: 0.2, y: -0.02 },
  primaryMobile: { padding: 0.16, y: 0.04 },
};

export default function MarkTile({ role, tileRef, label }) {
  const merc = useRef(null);
  const scroller = useRef(null);
  const mobile = useMobile();
  const reduced = useReducedMotion();
  const primary = role === "primary";
  const rail = role === "rail";
  const fit = FITS[primary && mobile ? "primaryMobile" : role] || FITS.home;

  // About: progress follows the article's scroll (desktop: the tile's own scroller; mobile: the page).
  useEffect(() => {
    const m = merc.current;
    if (!primary) {
      m?.setProgress(0, reduced);
      return;
    }
    const el = scroller.current;
    const read = () => {
      let p;
      if (mobile) {
        const r = el.getBoundingClientRect();
        p = (window.innerHeight * 0.5 - r.top) / Math.max(1, r.height - window.innerHeight * 0.5);
      } else p = el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight);
      merc.current?.setProgress(Math.max(0, Math.min(1, p)) * 2, reduced);
    };
    read();
    const target = mobile ? window : el;
    target.addEventListener("scroll", read, { passive: true });
    return () => target.removeEventListener("scroll", read);
  }, [primary, mobile, reduced]);

  const rotation = useMemo(() => ({ yaw: 0.1, pitch: -0.12 }), []);

  return (
    <>
      <Head id="mark" label={primary ? "About DVM" : label} led="live">
        {primary ? <span className={t.hideNarrow}>Scroll: chrome, glass, x-ray</span> : rail ? null : "Live render"}
      </Head>
      <div className={t.mercBox} data-role={role}>
        <MercuryLogo
          ref={merc}
          fit={fit}
          rotation={rotation}
          pointerTarget={tileRef}
          interactive={!rail}
          fps={rail ? 30 : 0}
          tilt={rail ? 0.35 : 1}
          sway={rail ? 0.5 : 0.8}
          sheen={0.95}
          shadow={0.45}
          contours={0.9}
          introDelay={0.5}
          label="DVM logo in liquid mercury"
        />
      </div>
      {!rail && !primary && (
        <div className={t.markCaption}>
          <p className={t.markName}>
            Department of
            <br />
            Visual Media
          </p>
          <p className={t.markSub}>BITS Pilani. Code, design, animate.</p>
          <button type="button" className={t.dropBtn} data-mercury-ignore="" onClick={() => merc.current?.drop()}>
            Drop a bead
          </button>
        </div>
      )}
      {primary && <AboutPage scrollRef={scroller} />}
    </>
  );
}
