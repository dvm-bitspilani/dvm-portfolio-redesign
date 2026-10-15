// One teal-glass window. Position/size come from the WM (geom); drags and resizes write the
// DOM directly and commit once on release. Open zooms from the launching element, close
// shrinks away, minimise funnels into its dock icon (genie) and restore plays it back.
import { Suspense, memo, useEffect, useLayoutEffect, useRef } from "react";
import { Copy, Minus, Square, X } from "lucide-react";
import { COMPONENTS, appById, projectBySlug } from "./apps";
import { AppIcon } from "./icons";
import { geom, useWm } from "./wm";
import { reducedNow, ALT } from "../lib/hooks";
import { useMenu } from "./menus";
import s from "./window.module.css";

const HANDLES = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];

/* ---------- genie: a curved funnel into the dock icon (rail on the left) ---------- */
const N = 10;
const smooth = (t) => t * t * (3 - 2 * t);
function funnel(lt, lb, rt, rb) {
  const top = [];
  const bot = [];
  for (let i = 0; i <= N; i++) {
    const x = i / N;
    const k = smooth(x);
    top.push(`${(x * 100).toFixed(2)}% ${(lt + (rt - lt) * k).toFixed(2)}%`);
    bot.unshift(`${(x * 100).toFixed(2)}% ${(lb + (rb - lb) * k).toFixed(2)}%`);
  }
  return `polygon(${[...top, ...bot].join(", ")})`;
}
function genieFrames(r, t) {
  const lyRaw = ((t.y - r.top) / r.height) * 100;
  const ly = Math.max(6, Math.min(94, lyRaw));
  const oy = r.top + (ly / 100) * r.height;
  const dx = t.x - r.left;
  const dy = t.y - oy;
  const cl = (v) => Math.max(0, Math.min(100, v));
  return {
    origin: `0px ${ly}%`,
    frames: [
      { offset: 0, clipPath: funnel(0, 100, 0, 100), transform: "translate(0px, 0px) scale(1, 1)", opacity: 1 },
      { offset: 0.38, clipPath: funnel(cl(ly - 9), cl(ly + 9), 0, 100), transform: `translate(${dx * 0.04}px, ${dy * 0.05}px) scale(0.96, 1)`, opacity: 1 },
      { offset: 0.72, clipPath: funnel(cl(ly - 4), cl(ly + 4), cl(ly - 30), cl(ly + 30)), transform: `translate(${dx * 0.5}px, ${dy * 0.55}px) scale(0.5, 0.86)`, opacity: 0.95 },
      { offset: 1, clipPath: funnel(cl(ly - 1.5), cl(ly + 1.5), cl(ly - 6), cl(ly + 6)), transform: `translate(${dx}px, ${dy}px) scale(0.05, 0.3)`, opacity: 0 },
    ],
  };
}
function dockTarget(key) {
  const el = document.querySelector(`[data-dock-key="${CSS.escape(key)}"]`);
  if (!el) return { x: 40, y: window.innerHeight / 2 };
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function Suspended({ win, onResume }) {
  return (
    <div className={s.suspended}>
      <AppIcon app={win.app} size={64} />
      <p className={s.susTitle}>Paused to save graphics memory</p>
      <p className={s.susBody}>Only one 3D app runs at a time. Bring this window to the front to resume it.</p>
      <button className={s.resume} onClick={onResume}>
        Resume
      </button>
    </div>
  );
}

function Loading() {
  return (
    <div className={s.loading} aria-label="Loading">
      <span />
    </div>
  );
}

function Window({ win, z, focused, live, desk, title }) {
  const wm = useWm();
  const W = useRef(wm);
  W.current = wm;
  const menu = useMenu();
  const outer = useRef(null);
  const frame = useRef(null);
  const drag = useRef(null);
  const g = geom(win, desk);
  const def = appById(win.app);
  const App = COMPONENTS[win.app];
  const cover = win.app === "project" ? projectBySlug(win.param)?.cover : undefined;

  // ---- open: zoom from the launching element (or rise in place)
  useLayoutEffect(() => {
    if (!win.opening) return;
    const el = frame.current;
    const done = () => W.current.patch(win.id, { opening: false, origin: null });
    if (reducedNow()) {
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 140 }).onfinish = done;
      return;
    }
    const r = el.getBoundingClientRect();
    const o = win.origin;
    let a;
    if (o && r.width > 0) {
      const sx = Math.max(0.04, o.width / r.width);
      const sy = Math.max(0.04, o.height / r.height);
      el.style.transformOrigin = "0 0";
      a = el.animate(
        [
          { transform: `translate(${o.left - r.left}px, ${o.top - r.top}px) scale(${sx}, ${sy})`, opacity: 0.3, borderRadius: "22px" },
          { opacity: 1, offset: 0.35 },
          { transform: "translate(0px, 0px) scale(1, 1)", opacity: 1, borderRadius: "14px" },
        ],
        { duration: 520, easing: "cubic-bezier(.16,1,.3,1)" },
      );
    } else {
      el.style.transformOrigin = "50% 40%";
      a = el.animate(
        [
          { transform: "translateY(14px) scale(.94)", opacity: 0 },
          { transform: "none", opacity: 1 },
        ],
        { duration: 380, easing: "cubic-bezier(.16,1,.3,1)" },
      );
    }
    a.onfinish = () => {
      el.style.transformOrigin = "";
      done();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- close
  useEffect(() => {
    if (!win.closing) return;
    const el = frame.current;
    const fin = () => W.current.remove(win.id);
    if (reducedNow()) return void (el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: "forwards" }).onfinish = fin);
    el.style.transformOrigin = "50% 45%";
    el.animate(
      [
        { transform: "none", opacity: 1 },
        { transform: "translateY(6px) scale(.93)", opacity: 0 },
      ],
      { duration: 220, easing: "cubic-bezier(.4,0,1,1)", fill: "forwards" },
    ).onfinish = fin;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [win.closing]);

  // ---- minimise (genie into the dock icon)
  useEffect(() => {
    if (!win.minimizing) return;
    const el = frame.current;
    const fin = () => {
      delete el.dataset.genie;
      W.current.minDone(win.id);
    };
    if (reducedNow()) return void (el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: "forwards" }).onfinish = fin);
    const { origin, frames } = genieFrames(el.getBoundingClientRect(), dockTarget(win.key));
    el.style.transformOrigin = origin;
    // Chrome drops a backdrop-filtered layer while its clip-path animates: go opaque glass
    el.dataset.genie = "";
    const a = el.animate(frames, { duration: 560, easing: "cubic-bezier(.55,.05,.45,1)", fill: "forwards" });
    a.onfinish = fin;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [win.minimizing]);

  // ---- restore (genie in reverse)
  useLayoutEffect(() => {
    if (!win.restoring) return;
    const el = frame.current;
    el.getAnimations().forEach((x) => x.cancel());
    const fin = () => {
      el.style.transformOrigin = "";
      delete el.dataset.genie;
      W.current.patch(win.id, { restoring: false });
    };
    if (reducedNow()) return void (el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 120 }).onfinish = fin);
    const { origin, frames } = genieFrames(el.getBoundingClientRect(), dockTarget(win.key));
    el.style.transformOrigin = origin;
    el.dataset.genie = "";
    const a = el.animate([...frames].reverse().map((f) => ({ ...f, offset: 1 - f.offset })), {
      duration: 520,
      easing: "cubic-bezier(.2,.7,.25,1)",
    });
    a.onfinish = fin;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [win.restoring]);

  // ---- drag (title bar) with snap zones
  const onTitleDown = (e) => {
    if (e.button !== 0 || e.target.closest("button")) return;
    wm.focus(win.id);
    const deskEl = outer.current.parentElement.getBoundingClientRect();
    drag.current = { kind: "move", px: e.clientX, py: e.clientY, g: { ...g }, desk: deskEl, moved: false, zone: null, unsnapped: !(win.max || win.snap) };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onResizeDown = (dir) => (e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    wm.focus(win.id);
    drag.current = { kind: "resize", dir, px: e.clientX, py: e.clientY, g: { ...g }, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.px;
    const dy = e.clientY - d.py;
    if (!d.moved && Math.hypot(dx, dy) < 4) return;
    if (!d.moved) {
      d.moved = true;
      outer.current.dataset.dragging = "";
    }
    const el = outer.current;
    if (d.kind === "move") {
      if (!d.unsnapped) {
        // pull a maximised/snapped window off: back to its normal size under the cursor
        const w = Math.min(win.w, desk.w);
        const h = Math.min(win.h, desk.h);
        const fx = (d.px - d.desk.left - d.g.x) / d.g.w;
        d.g = { x: d.px - d.desk.left - fx * w, y: d.g.y, w, h };
        el.style.width = `${w}px`;
        el.style.height = `${h}px`;
        d.unsnapped = true;
      }
      const x = Math.round(d.g.x + dx);
      const y = Math.round(Math.max(0, Math.min(desk.h - 40, d.g.y + dy)));
      d.x = x;
      d.y = y;
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      const lx = e.clientX - d.desk.left;
      const ly = e.clientY - d.desk.top;
      const ry = ly / desk.h;
      let zone = null;
      if (ly < 4) zone = "max";
      else if (lx < 12) zone = ry < 0.22 ? "tl" : ry > 0.78 ? "bl" : "left";
      else if (lx > desk.w - 12) zone = ry < 0.22 ? "tr" : ry > 0.78 ? "br" : "right";
      if (zone !== d.zone) {
        d.zone = zone;
        wm.setPreview(zone);
      }
    } else {
      const min = def.min ?? [360, 300];
      let { x, y, w, h } = d.g;
      if (d.dir.includes("e")) w = Math.max(min[0], d.g.w + dx);
      if (d.dir.includes("s")) h = Math.max(min[1], d.g.h + dy);
      if (d.dir.includes("w")) {
        w = Math.max(min[0], d.g.w - dx);
        x = d.g.x + d.g.w - w;
      }
      if (d.dir.includes("n")) {
        h = Math.max(min[1], d.g.h - dy);
        y = Math.max(0, d.g.y + d.g.h - h);
        h = d.g.y + d.g.h - y;
      }
      d.r = { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
      el.style.transform = `translate3d(${d.r.x}px, ${d.r.y}px, 0)`;
      el.style.width = `${d.r.w}px`;
      el.style.height = `${d.r.h}px`;
    }
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d || !d.moved) return;
    const el = outer.current;
    delete el.dataset.dragging;
    if (d.kind === "move") {
      wm.setPreview(null);
      if (d.zone) {
        // keep the dragged size as the restore size
        wm.patch(win.id, { x: d.x, y: d.y, w: d.g.w, h: d.g.h });
        wm.snap(win.id, d.zone);
      } else wm.setRect(win.id, { x: d.x, y: d.y, w: d.g.w, h: d.g.h });
    } else if (d.r) wm.setRect(win.id, d.r);
    // the committed geometry is re-applied by the layout effect on the next render
  };

  // geometry is written imperatively (not through React's style diff) so a drag's inline
  // values can never outlive the committed state
  useLayoutEffect(() => {
    const el = outer.current;
    if (!el || drag.current?.moved) return;
    el.style.transform = `translate3d(${g.x}px, ${g.y}px, 0)`;
    el.style.width = `${g.w}px`;
    el.style.height = `${g.h}px`;
  });

  const onTitleMenu = (e) => {
    e.preventDefault();
    wm.focus(win.id);
    menu.open(e.clientX, e.clientY, [
      { label: "Minimise", shortcut: `${ALT} M`, run: () => wm.minimize(win.id) },
      { label: win.max ? "Restore size" : "Maximise", shortcut: `${ALT} ↑`, run: () => wm.toggleMax(win.id) },
      { sep: true },
      { label: "Snap left", shortcut: `${ALT} ←`, run: () => wm.snap(win.id, "left") },
      { label: "Snap right", shortcut: `${ALT} →`, run: () => wm.snap(win.id, "right") },
      { sep: true },
      { label: "Close", shortcut: `${ALT} W`, run: () => wm.close(win.id) },
    ]);
  };

  const hidden = win.min;
  const maxed = win.max || !!win.snap;
  return (
    <section
      ref={outer}
      className={s.win}
      data-focused={focused || undefined}
      data-max={win.max || undefined}
      data-app={win.app}
      data-win-key={win.key}
      style={{
        zIndex: z,
        visibility: hidden ? "hidden" : undefined,
      }}
      aria-label={title}
      aria-hidden={hidden || undefined}
      inert={hidden || win.closing ? true : undefined}
      onPointerDownCapture={() => !focused && wm.focus(win.id)}
    >
      <div ref={frame} className={s.frame}>
        <header className={s.titlebar} onPointerDown={onTitleDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onDoubleClick={(e) => !e.target.closest("button") && wm.toggleMax(win.id)} onContextMenu={onTitleMenu}>
          <AppIcon app={win.app} cover={cover} size={20} />
          <h2 className={s.title}>{title}</h2>
          <div className={s.controls}>
            <button className={s.ctl} onClick={() => wm.minimize(win.id)} aria-label={`Minimise ${title}`} title={`Minimise (${ALT} M)`}>
              <Minus />
            </button>
            <button className={s.ctl} onClick={() => wm.toggleMax(win.id)} aria-label={maxed ? `Restore ${title}` : `Maximise ${title}`} title={maxed ? `Restore (${ALT} ↓)` : `Maximise (${ALT} ↑)`}>
              {maxed ? <Copy /> : <Square />}
            </button>
            <button className={`${s.ctl} ${s.close}`} onClick={() => wm.close(win.id)} aria-label={`Close ${title}`} title={`Close (${ALT} W)`}>
              <X />
            </button>
          </div>
        </header>
        <div className={s.body}>
          {def.heavy === true && !live ? (
            <Suspended win={win} onResume={() => wm.focus(win.id)} />
          ) : (
            <Suspense fallback={<Loading />}>
              <App param={win.param} props={win.props} focused={focused} live={live} winId={win.id} />
            </Suspense>
          )}
        </div>
      </div>
      {!win.max &&
        HANDLES.map((h) => (
          <span key={h} className={s.handle} data-h={h} onPointerDown={onResizeDown(h)} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} aria-hidden="true" />
        ))}
    </section>
  );
}

export default memo(Window);
