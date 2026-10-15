// Context menus and menu-bar dropdowns share one floating menu: keyboard navigable
// (arrows / Home / End / Enter / Esc), dismissed by any outside press.
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";
import s from "./menus.module.css";

const MenuContext = createContext(null);
export const useMenu = () => useContext(MenuContext);

export function MenuProvider({ children }) {
  const [menu, setMenu] = useState(null); // { x, y, items, id, onClose }
  const close = useCallback(() => {
    setMenu((m) => {
      m?.onClose?.();
      return null;
    });
  }, []);
  const open = useCallback((x, y, items, opts = {}) => setMenu({ x, y, items, id: opts.id ?? null, onClose: opts.onClose, returnFocus: document.activeElement }), []);
  const value = useMemo(() => ({ open, close, openId: menu?.id ?? null, isOpen: !!menu }), [open, close, menu]);
  return (
    <MenuContext.Provider value={value}>
      {children}
      {menu && <FloatingMenu menu={menu} onClose={close} />}
    </MenuContext.Provider>
  );
}

function FloatingMenu({ menu, onClose }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ x: menu.x, y: menu.y });
  const items = menu.items;

  useLayoutEffect(() => {
    const r = ref.current.getBoundingClientRect();
    const x = Math.min(menu.x, window.innerWidth - r.width - 8);
    const y = menu.y + r.height > window.innerHeight - 8 ? Math.max(8, menu.y - r.height) : menu.y;
    setPos({ x: Math.max(8, x), y });
    ref.current.querySelector("[role=menuitem]:not([disabled]), [role=menuitemradio]:not([disabled])")?.focus({ preventScroll: true });
  }, [menu]);

  useEffect(() => {
    const onDown = (e) => {
      if (!ref.current?.contains(e.target) && !e.target.closest?.("[data-menu-trigger]")) onClose();
    };
    const onBlur = () => onClose();
    addEventListener("pointerdown", onDown, true);
    addEventListener("blur", onBlur);
    addEventListener("resize", onBlur);
    return () => {
      removeEventListener("pointerdown", onDown, true);
      removeEventListener("blur", onBlur);
      removeEventListener("resize", onBlur);
    };
  }, [onClose]);

  const onKey = (e) => {
    const list = [...ref.current.querySelectorAll("[role^=menuitem]:not([disabled])")];
    const i = list.indexOf(document.activeElement);
    if (e.key === "ArrowDown") list[(i + 1) % list.length]?.focus();
    else if (e.key === "ArrowUp") list[(i - 1 + list.length) % list.length]?.focus();
    else if (e.key === "Home") list[0]?.focus();
    else if (e.key === "End") list[list.length - 1]?.focus();
    else if (e.key === "Escape" || e.key === "Tab") {
      onClose();
      menu.returnFocus?.focus?.({ preventScroll: true });
    } else return;
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div ref={ref} className={s.menu} role="menu" style={{ left: pos.x, top: pos.y }} onKeyDown={onKey} onContextMenu={(e) => e.preventDefault()}>
      {items.map((it, i) =>
        it.sep ? (
          <div key={`sep${i}`} className={s.sep} role="separator" />
        ) : it.heading ? (
          <div key={`h${i}`} className={s.heading}>
            {it.heading}
          </div>
        ) : (
          <button
            key={it.label}
            role={it.checked != null ? "menuitemradio" : "menuitem"}
            aria-checked={it.checked != null ? !!it.checked : undefined}
            className={s.item}
            disabled={it.disabled}
            onClick={() => {
              onClose();
              it.run?.();
            }}
          >
            <span className={s.check}>{it.checked ? <Check size={13} /> : it.icon ?? null}</span>
            <span className={s.label}>{it.label}</span>
            {it.shortcut && <kbd className={s.kbd}>{it.shortcut}</kbd>}
          </button>
        ),
      )}
    </div>
  );
}
