// A build's screens: the mockup spread across the wrap, then the full-page screenshots in browser /
// phone windows. A window shows the top of the page; hover (or keyboard focus) pans it down to the
// end at a steady reading speed and back on leave. Clicking opens the whole page in the lightbox
// (same file, no second request). Phones, coarse pointers and reduced motion: no pan, the fade
// at the bottom says there is more.
import { useCallback, useEffect, useRef, useState } from "react";
import Lightbox from "./Lightbox";
import ui from "../../ui.module.css";
import p from "../projects.module.css";

function Window({ src, kind, onOpen }) {
  const viewRef = useRef(null);
  const imgRef = useRef(null);
  const [travel, setTravel] = useState(0);

  const measure = useCallback(() => {
    const v = viewRef.current;
    const img = imgRef.current;
    if (!v || !img || !img.complete || !img.naturalHeight) return;
    const t = Math.round(img.clientHeight - v.clientHeight);
    setTravel(t > 24 ? t : 0);
  }, []);

  useEffect(() => {
    measure();
    const v = viewRef.current;
    if (!v) return;
    const ro = new ResizeObserver(measure);
    ro.observe(v);
    return () => ro.disconnect();
  }, [measure]);

  const phone = kind === "phone";
  return (
    <button
      type="button"
      data-cursor="lock"
      className={`${p.win} ${p.ticks} ${phone ? p.winPhone : p.winDesk}`}
      aria-label={phone ? "Open the full phone page" : "Open the full desktop page"}
      data-pan={travel ? "" : undefined}
      style={travel ? { "--travel": `${travel}px`, "--dur": `${Math.min(22, Math.max(2, travel / 140)).toFixed(2)}s` } : undefined}
      onClick={() => onOpen({ src, kind })}
    >
      <span className={p.winBar}>
        <span className={p.winDots} aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className={ui.meta}>{phone ? "Phone" : "Desktop"}</span>
      </span>
      <span ref={viewRef} className={p.winView}>
        <img ref={imgRef} src={src} alt="" loading="lazy" decoding="async" onLoad={measure} />
      </span>
    </button>
  );
}

export default function Screens({ e }) {
  const [shot, setShot] = useState(null);
  const { mockup, page, mobile } = e;
  if (!mockup && !page && !mobile) return null;
  const both = page && mobile;

  return (
    <section className={p.sec} aria-labelledby="v8-p-screens">
      <div className={ui.wrap}>
        <h2 id="v8-p-screens" className={`${ui.meta} ${p.secLabel}`}>
          Screens
        </h2>
        {mockup && (
          <div className={`${ui.frame} ${p.spread}`}>
            <img src={mockup} alt="" loading="lazy" decoding="async" />
          </div>
        )}
        {(page || mobile) && (
          <div className={`${p.windows} ${both ? p.windowsBoth : ""} ${mockup ? "" : p.windowsFirst}`}>
            {page && <Window src={page} kind="desktop" onOpen={setShot} />}
            {mobile && <Window src={mobile} kind="phone" onOpen={setShot} />}
          </div>
        )}
      </div>
      <Lightbox shot={shot} title={e.title} onClose={() => setShot(null)} />
    </section>
  );
}
