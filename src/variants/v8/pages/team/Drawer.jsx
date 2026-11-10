// The dossier as a dialog where there is no column for it: a panel from the right (760 px and up)
// or a bottom sheet (phones: drag the handle down, or tap the backdrop, to close). Focus moves in
// and comes back to what opened it; Esc closes; Tab stays inside while it is open.
import { useEffect, useRef } from "react";
import sh from "./shared.module.css";

const FOCUSABLE = 'a[href], button:not(:disabled), input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function Drawer({ open, onClose, labelledBy, children, reduced }) {
  const ref = useRef(null);
  const drag = useRef(null);

  useEffect(() => {
    if (!open) return;
    const panel = ref.current;
    const before = document.activeElement;
    panel?.focus({ preventScroll: true });
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Tab" && panel) {
        const list = [...panel.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
        if (!list.length) return;
        const first = list[0];
        const last = list.at(-1);
        if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      html.style.overflow = prevOverflow;
      if (before && document.contains(before)) before.focus?.({ preventScroll: true });
    };
  }, [open, onClose]);

  if (!open) return null;

  // phones: drag the grip down to close
  const onDown = (e) => {
    drag.current = { y: e.clientY, id: e.pointerId };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e) => {
    const d = drag.current;
    if (!d || !ref.current) return;
    const dy = Math.max(0, e.clientY - d.y);
    ref.current.style.transform = dy ? `translateY(${dy}px)` : "";
  };
  const onUp = (e) => {
    const d = drag.current;
    drag.current = null;
    if (!d || !ref.current) return;
    const dy = e.clientY - d.y;
    ref.current.style.transform = "";
    if (dy > 80) onClose();
  };

  return (
    <div className={`${sh.drawerWrap} ${reduced ? sh.still0 : ""}`}>
      <div className={sh.backdrop} onClick={onClose} aria-hidden="true" />
      <div ref={ref} className={sh.drawer} role="dialog" aria-modal="true" aria-labelledby={labelledBy} tabIndex={-1}>
        <div className={sh.grip} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} aria-hidden="true">
          <span />
        </div>
        {children}
      </div>
    </div>
  );
}
