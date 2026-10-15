// Desktop icons in a right-hand column grid. Click selects, double-click (or Enter) opens
// with a zoom from the icon, drag rearranges (snaps to the grid, swaps on collision,
// remembered). Arrow keys move between icons.
import { useMemo, useRef, useState } from "react";
import { APPS } from "./apps";
import { AppIcon } from "./icons";
import { useWm } from "./wm";
import { useMenu } from "./menus";
import { usePref } from "../lib/hooks";
import { rectOf } from "./shell";
import s from "./desktop.module.css";

const CW = 104;
const CH = 100;

export default function DesktopIcons({ desk, selected, setSelected, coarse }) {
  const wm = useWm();
  const menu = useMenu();
  const [saved, setSaved] = usePref("v4-icon-cells", {});
  const [dragKey, setDragKey] = useState(null);
  const drag = useRef(null);
  const rows = Math.max(1, Math.floor((desk.h - 20) / CH));

  const cells = useMemo(() => {
    const used = new Set();
    const out = {};
    APPS.forEach((a) => {
      const c = saved[a.id];
      if (c && c.r < rows && !used.has(`${c.c},${c.r}`)) {
        out[a.id] = c;
        used.add(`${c.c},${c.r}`);
      }
    });
    let i = 0;
    APPS.forEach((a) => {
      if (out[a.id]) return;
      let c;
      do {
        c = { c: Math.floor(i / rows), r: i % rows };
        i++;
      } while (used.has(`${c.c},${c.r}`));
      out[a.id] = c;
      used.add(`${c.c},${c.r}`);
    });
    return out;
  }, [saved, rows]);

  const pos = (c) => ({ x: desk.w - 14 - (c.c + 1) * CW, y: 12 + c.r * CH });
  const open = (id, el) => wm.launch(id, undefined, { origin: rectOf(el.querySelector("span")) });

  const onDown = (id) => (e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    setSelected(id);
    drag.current = { id, px: e.clientX, py: e.clientY, moved: false, el: e.currentTarget };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.px;
    const dy = e.clientY - d.py;
    if (!d.moved && Math.hypot(dx, dy) < 5) return;
    if (!d.moved) setDragKey(d.id);
    d.moved = true;
    d.dx = dx;
    d.dy = dy;
    d.el.style.translate = `${dx}px ${dy}px`;
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    d.el.style.translate = "";
    setDragKey(null);
    if (!d.moved) {
      if (coarse) open(d.id, d.el);
      return;
    }
    const p = pos(cells[d.id]);
    const x = p.x + d.dx;
    const y = p.y + d.dy;
    const c = Math.max(0, Math.round((desk.w - 14 - x - CW) / CW));
    const r = Math.max(0, Math.min(rows - 1, Math.round((y - 12) / CH)));
    const next = { ...cells };
    const other = Object.keys(next).find((k) => k !== d.id && next[k].c === c && next[k].r === r);
    if (other) next[other] = cells[d.id];
    next[d.id] = { c, r };
    setSaved(next);
  };

  const onKey = (id) => (e) => {
    const c = cells[id];
    let t = null;
    if (e.key === "Enter") {
      e.preventDefault();
      return open(id, e.currentTarget);
    }
    if (e.key === "ArrowDown") t = { c: c.c, r: c.r + 1 };
    else if (e.key === "ArrowUp") t = { c: c.c, r: c.r - 1 };
    else if (e.key === "ArrowLeft") t = { c: c.c + 1, r: c.r };
    else if (e.key === "ArrowRight") t = { c: c.c - 1, r: c.r };
    if (!t) return;
    e.preventDefault();
    const hit = Object.keys(cells).find((k) => cells[k].c === t.c && cells[k].r === t.r);
    if (hit) {
      setSelected(hit);
      document.querySelector(`[data-icon="${hit}"]`)?.focus();
    }
  };

  return (
    <div className={s.icons} role="group" aria-label="Desktop">
      {APPS.map((a) => {
        const p = pos(cells[a.id]);
        return (
          <button
            key={a.id}
            data-icon={a.id}
            className={s.icon}
            data-selected={selected === a.id || undefined}
            data-dragging={dragKey === a.id || undefined}
            style={{ transform: `translate(${p.x}px, ${p.y}px)` }}
            onPointerDown={onDown(a.id)}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            onDoubleClick={(e) => open(a.id, e.currentTarget)}
            onKeyDown={onKey(a.id)}
            onFocus={() => setSelected(a.id)}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSelected(a.id);
              const el = e.currentTarget;
              menu.open(e.clientX, e.clientY, [
                { label: `Open ${a.label}`, run: () => open(a.id, el) },
                { sep: true },
                { label: "Arrange icons", run: () => setSaved({}) },
              ]);
            }}
            aria-label={`${a.label}: ${a.blurb}`}
          >
            <AppIcon app={a.id} size={58} />
            <span className={s.iconLabel}>{a.label}</span>
          </button>
        );
      })}
    </div>
  );
}
