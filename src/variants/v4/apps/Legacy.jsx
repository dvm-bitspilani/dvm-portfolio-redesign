// Legacy: the origami timeline as an app. The kit's FoldTimeline in external mode; the
// wheel (or trackpad) over the stage unfolds and pans it, a scrubber shows where you are,
// the year list jumps, and entries open their project / essay in this OS.
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FoldTimeline, buildArchiveStops } from "../../../immersive/kit/timeline";
import { reducedNow } from "../lib/hooks";
import { rectOf, useOs } from "../os/shell";
import { P } from "../lib/paths";
import a from "./app.module.css";
import s from "./legacy.module.css";

let gl2 = null;
function hasWebGL2() {
  if (gl2 != null) return gl2;
  try {
    const c = document.createElement("canvas");
    const ctx = c.getContext("webgl2");
    gl2 = !!ctx;
    ctx?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    gl2 = false;
  }
  return gl2;
}

const VERTICAL_BELOW = 600;

function Legacy() {
  const { launch } = useOs();
  const items = useMemo(() => buildArchiveStops({ projectHref: (p) => P(`/projects/${p.slug}`) }), []);
  const tl = useRef(null);
  const stage = useRef(null);
  const target = useRef(0);
  const jumped = useRef(false);
  const [width, setWidth] = useState(1000);
  const [active, setActive] = useState(-1);
  const [shown, setShown] = useState(0);
  const [touched, setTouched] = useState(false);
  const vertical = reducedNow() || width < VERTICAL_BELOW || !hasWebGL2();

  useEffect(() => {
    const el = stage.current;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const set = useCallback((v) => {
    target.current = Math.max(0, Math.min(1, v));
    tl.current?.setProgress(target.current);
    setTouched(true);
  }, []);

  // wheel / trackpad drives the strip (horizontal layout only)
  useEffect(() => {
    if (vertical) return;
    const el = stage.current;
    const onWheel = (e) => {
      e.preventDefault();
      if (jumped.current) {
        target.current = tl.current?.getProgress() ?? target.current;
        jumped.current = false;
      }
      const d = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      set(target.current + (e.deltaMode === 1 ? d * 16 : d) / 5200);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [vertical, set]);

  // scrubber follows the eased progress
  useEffect(() => {
    if (vertical) return;
    let raf = 0;
    let last = -1;
    const tick = () => {
      const p = tl.current?.getProgress() ?? 0;
      if (Math.abs(p - last) > 0.002) {
        last = p;
        setShown(p);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [vertical]);

  const jump = (i) => {
    tl.current?.scrollToStop(i);
    jumped.current = true;
    setTouched(true);
  };
  const onKey = (e) => {
    if (vertical) return;
    if (e.key === "ArrowRight" || e.key === "PageDown") jump(Math.min(items.length - 1, active + 1));
    else if (e.key === "ArrowLeft" || e.key === "PageUp") jump(Math.max(0, active - 1));
    else if (e.key === "Home") set(0);
    else if (e.key === "End") set(1);
    else return;
    e.preventDefault();
  };

  const onSelect = useCallback(
    (entry, _stop, event) => {
      const d = entry.data;
      if (!d) return;
      event?.preventDefault?.();
      const origin = rectOf(event?.currentTarget);
      if (d.fest) launch("project", d.slug, { origin });
      else if (d.excerpt) launch("blogs", undefined, { origin, props: { select: d.slug } });
    },
    [launch],
  );

  const total = items.reduce((n, x) => n + x.entries.length, 0);

  return (
    <div className={a.app}>
      <div className={a.split}>
        <nav className={a.side} aria-label="Years">
          <div className={a.sideHead}>Years</div>
          {items.map((st, i) => (
            <button key={st.year} className={a.sideItem} aria-current={active === i} onClick={() => jump(i)}>
              <span className={s.year}>{st.year}</span>
              <span className={a.count}>{st.entries.length}</span>
            </button>
          ))}
          <p className={s.sideNote}>
            {total} pieces across {items.length} years. Scroll over the strip to unfold it; arrow keys step a year.
          </p>
        </nav>
        <div className={a.main}>
          <div ref={stage} className={`${s.stage} ${vertical ? s.vertical : ""}`} tabIndex={vertical ? undefined : 0} onKeyDown={onKey} aria-label="Timeline, use the wheel or arrow keys" data-kit>
            <FoldTimeline
              ref={tl}
              items={items}
              tone="teal"
              scrollMode="external"
              layout="auto"
              verticalBelow={VERTICAL_BELOW}
              title="Everything DVM has shipped, year by year"
              onSelect={onSelect}
              onActiveChange={(i) => setActive(i)}
              intro={
                <div className={s.intro}>
                  <h2>Legacy</h2>
                  <p>The mark is one strip of folded paper. Scroll over it and it unfolds into every site, app, film and essay DVM has shipped.</p>
                </div>
              }
            />
            {!vertical && !touched && <div className={s.hint}>Scroll to unfold</div>}
          </div>
          {!vertical && (
            <div className={s.scrub}>
              <span className={s.scrubLabel}>{shown < 0.12 ? "Folded" : active >= 0 ? items[active].year : "Unfolding"}</span>
              <input type="range" min="0" max="1000" value={Math.round(shown * 1000)} onChange={(e) => set(Number(e.target.value) / 1000)} aria-label="Timeline position" />
              <span className={s.scrubLabel}>{Math.round(shown * 100)}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(Legacy);
