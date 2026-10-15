// The desktop: wallpaper, desk (icons + windows + snap preview), rail, menu bar, start
// menu, notification centre, toasts, the shortcuts sheet and global keyboard shortcuts.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import Wallpaper from "./Wallpaper";
import Window from "./Window";
import Rail from "./Rail";
import MenuBar from "./MenuBar";
import StartMenu from "./StartMenu";
import DesktopIcons from "./DesktopIcons";
import { APPS, appById, titleFor } from "./apps";
import { useWm, zoneRect } from "./wm";
import { useMenu } from "./menus";
import { NotificationList, Toasts, useNotify } from "./notify";
import { fmtLongDate, fmtTime, useClock, useMedia, usePref, MOD, ALT } from "../lib/hooks";
import s from "./desktop.module.css";

const SHORTCUTS = [
  [`${MOD} K`, "Search everything (start menu)"],
  [`${ALT} 1 … 8`, "Open an app"],
  [`${ALT} W`, "Close the window"],
  [`${ALT} M`, "Minimise the window"],
  [`${ALT} ↑ / ↓`, "Maximise / restore"],
  [`${ALT} ← / →`, "Snap left / right"],
  [`${ALT} \``, "Next window"],
  [`${ALT} T`, "Tile windows"],
  [`${ALT} D`, "Show desktop"],
  ["Esc", "Close menus and panels"],
  ["?", "This sheet"],
];

function Center({ open, onClose }) {
  const now = useClock(true);
  const { markRead } = useNotify();
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    markRead();
    const onDown = (e) => !ref.current?.contains(e.target) && !e.target.closest("[data-menu-trigger]") && onClose();
    addEventListener("pointerdown", onDown, true);
    return () => removeEventListener("pointerdown", onDown, true);
  }, [open, onClose, markRead]);
  if (!open) return null;
  return (
    <aside ref={ref} className={s.center} aria-label="Notification centre" onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <div className={s.centerClock}>
        <span className={s.cTime}>{fmtTime(now, true)}</span>
        <span className={s.cDate}>{fmtLongDate(now)}</span>
        <span className={s.cPlace}>Pilani, Rajasthan (IST)</span>
      </div>
      <div className={s.centerList}>
        <NotificationList onRun={onClose} />
      </div>
    </aside>
  );
}

function Sheet({ onClose }) {
  const ref = useRef(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <div className={s.sheetScrim} onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} tabIndex={-1} className={s.sheet} role="dialog" aria-label="Keyboard shortcuts" onKeyDown={(e) => e.key === "Escape" && onClose()}>
        <div className={s.sheetHead}>
          <h2>Keyboard shortcuts</h2>
          <button onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <dl className={s.keys}>
          {SHORTCUTS.map(([k, v]) => (
            <div key={k}>
              <dt>
                <kbd>{k}</kbd>
              </dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <p className={s.sheetNote}>Drag a title bar to an edge to snap it, to the top to maximise. Right-click the desktop, the dock or a title bar for more.</p>
      </div>
    </div>
  );
}

export default function Desktop({ phase, onLock, onRestart }) {
  const wm = useWm();
  const menu = useMenu();
  const desk = useRef(null);
  const startRef = useRef(null);
  const [startOpen, setStartOpen] = useState(false);
  const [centerOpen, setCenterOpen] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [selected, setSelected] = useState(null);
  const [wall, setWall] = usePref("v4-wallpaper", "horizon");
  const coarse = useMedia("(hover: none), (pointer: coarse)");
  const { wins, order, focus } = wm.state;
  const setDesk = wm.setDesk;
  const booted = phase === "done";

  useLayoutEffect(() => {
    const el = desk.current;
    const set = () => setDesk((d) => (d.w === el.clientWidth && d.h === el.clientHeight ? d : { w: el.clientWidth, h: el.clientHeight }));
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, [setDesk]);

  // one 3D app at a time: the front-most heavy window is live, the others pause
  const liveHeavy = useMemo(() => {
    if (phase === "boot" || phase === "login") return null;
    for (let i = order.length - 1; i >= 0; i--) {
      const w = wins[order[i]];
      if (w && appById(w.app)?.heavy && !w.min && !w.minimizing && !w.closing) return w.id;
    }
    return null;
  }, [order, wins, phase]);

  const toggleStart = useCallback(() => {
    setStartOpen((o) => !o);
    setCenterOpen(false);
    startRef.current?.poke();
  }, []);

  const deskMenu = (e) => {
    if (e.target.closest("[data-win-key], [data-icon]")) return;
    e.preventDefault();
    setSelected(null);
    const any = order.some((id) => !wins[id].closing);
    menu.open(e.clientX, e.clientY, [
      { label: "Search", shortcut: `${MOD} K`, run: () => setStartOpen(true) },
      { label: "New message", run: () => wm.launch("contact", undefined, { origin: { left: e.clientX, top: e.clientY, width: 2, height: 2 } }) },
      { sep: true },
      { label: "Tile windows", shortcut: `${ALT} T`, run: wm.tile, disabled: !any },
      { label: "Show desktop", shortcut: `${ALT} D`, run: wm.minimizeAll, disabled: !any },
      { label: "Close all windows", run: wm.closeAll, disabled: !any },
      { sep: true },
      { heading: "Wallpaper" },
      { label: "Horizon", checked: wall === "horizon", run: () => setWall("horizon") },
      { label: "X-ray", checked: wall === "xray", run: () => setWall("xray") },
      { label: "Quiet", checked: wall === "quiet", run: () => setWall("quiet") },
      { sep: true },
      { label: "Keyboard shortcuts", shortcut: "?", run: () => setSheet(true) },
      { label: "About DVM", run: () => wm.launch("about", undefined, { origin: { left: e.clientX, top: e.clientY, width: 2, height: 2 } }) },
      { label: "Lock screen", run: onLock },
      { label: "Restart", run: onRestart },
    ]);
  };

  // global shortcuts
  useEffect(() => {
    if (!booted) return;
    const onKey = (e) => {
      const typing = e.target.closest?.("input, textarea, select, [contenteditable]");
      if ((e.ctrlKey || e.metaKey) && e.code === "KeyK") {
        e.preventDefault();
        setCenterOpen(false);
        setStartOpen((o) => !o);
        return;
      }
      if (e.key === "Escape") {
        setStartOpen(false);
        setCenterOpen(false);
        return;
      }
      if (typing) return;
      if (e.key === "?" && !e.altKey && !e.ctrlKey && !e.metaKey) {
        setSheet((x) => !x);
        return;
      }
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      const st = wm.state;
      const f = st.focus;
      const digit = /^Digit([1-8])$/.exec(e.code);
      let handled = true;
      if (digit) wm.launch(APPS[Number(digit[1]) - 1].id);
      else if (e.code === "KeyD") wm.minimizeAll();
      else if (e.code === "KeyT") wm.tile();
      else if (e.code === "Backquote") {
        const vis = st.order.filter((id) => !st.wins[id].min && !st.wins[id].closing);
        if (vis.length > 1) wm.focus(vis[0]);
      } else if (!f) handled = false;
      else if (e.code === "KeyW") wm.close(f);
      else if (e.code === "KeyM") wm.minimize(f);
      else if (e.code === "ArrowUp") wm.snap(f, "max");
      else if (e.code === "ArrowDown") {
        const w = st.wins[f];
        if (w.max || w.snap) wm.toggleMax(f);
        else wm.minimize(f);
      } else if (e.code === "ArrowLeft") wm.snap(f, "left");
      else if (e.code === "ArrowRight") wm.snap(f, "right");
      else handled = false;
      if (handled) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    addEventListener("keydown", onKey, true);
    return () => removeEventListener("keydown", onKey, true);
  }, [booted, wm]);

  const pv = wm.preview ? zoneRect(wm.preview, wm.desk) : null;

  return (
    <div className={s.desktop}>
      <Wallpaper mode={wall} />
      <div
        ref={desk}
        className={s.desk}
        onContextMenu={deskMenu}
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) {
            setSelected(null);
            if (focus) wm.focus(null);
          }
        }}
      >
        <DesktopIcons desk={wm.desk} selected={selected} setSelected={setSelected} coarse={coarse} />
        {pv && <div className={s.snapPreview} style={{ transform: `translate(${pv.x}px, ${pv.y}px)`, width: pv.w, height: pv.h, zIndex: 9 + order.length }} />}
        {order.map((id, i) => {
          const w = wins[id];
          return (
            <Window
              key={id}
              win={w}
              z={10 + i}
              focused={focus === id}
              live={liveHeavy === id}
              desk={wm.desk}
              title={titleFor(w.app, w.param)}
            />
          );
        })}
      </div>
      <Rail startOpen={startOpen} onStart={toggleStart} startRef={startRef} startLive={booted} />
      <MenuBar
        centerOpen={centerOpen}
        onCenter={() => {
          setCenterOpen((o) => !o);
          setStartOpen(false);
        }}
        onShortcuts={() => setSheet(true)}
        onSearch={() => setStartOpen(true)}
        onLock={onLock}
        onRestart={onRestart}
      />
      <StartMenu
        open={startOpen}
        onClose={() => setStartOpen(false)}
        launch={wm.launch}
        onLock={() => {
          setStartOpen(false);
          onLock();
        }}
        onRestart={() => {
          setStartOpen(false);
          onRestart();
        }}
      />
      <Center open={centerOpen} onClose={() => setCenterOpen(false)} />
      <Toasts />
      {sheet && <Sheet onClose={() => setSheet(false)} />}
    </div>
  );
}
