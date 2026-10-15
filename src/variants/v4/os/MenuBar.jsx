// Top bar: the focused app's name and real menus (App / Window / Go / Help) on the left,
// notifications and the Pilani clock on the right. Menus switch on hover once one is open.
import { Bell } from "lucide-react";
import { APPS, titleFor } from "./apps";
import { useWm } from "./wm";
import { useMenu } from "./menus";
import { useNotify } from "./notify";
import { fmtDay, fmtTime, useClock, MOD, ALT } from "../lib/hooks";
import s from "./menubar.module.css";

export default function MenuBar({ onCenter, centerOpen, onShortcuts, onSearch, onRestart, onLock }) {
  const wm = useWm();
  const menu = useMenu();
  const { unread } = useNotify();
  const now = useClock();
  const { wins, order, focus } = wm.state;
  const fw = focus ? wins[focus] : null;
  const appName = fw ? (fw.app === "project" ? "Project" : titleFor(fw.app)) : "DVM OS";

  const menus = {
    app: () =>
      fw
        ? [
            { label: "Minimise", shortcut: `${ALT} M`, run: () => wm.minimize(fw.id) },
            { label: fw.max ? "Restore size" : "Maximise", shortcut: `${ALT} ↑`, run: () => wm.toggleMax(fw.id) },
            { label: "Snap left", shortcut: `${ALT} ←`, run: () => wm.snap(fw.id, "left") },
            { label: "Snap right", shortcut: `${ALT} →`, run: () => wm.snap(fw.id, "right") },
            { sep: true },
            { label: "Close window", shortcut: `${ALT} W`, run: () => wm.close(fw.id) },
          ]
        : [
            { label: "About DVM", run: () => wm.launch("about") },
            { label: "Search", shortcut: `${MOD} K`, run: onSearch },
            { sep: true },
            { label: "Lock screen", run: onLock },
            { label: "Restart", run: onRestart },
          ],
    window: () => {
      const open = order.map((id) => wins[id]).filter((w) => !w.closing);
      return [
        { label: "Tile windows", shortcut: `${ALT} T`, run: wm.tile, disabled: !open.length },
        { label: "Show desktop", shortcut: `${ALT} D`, run: wm.minimizeAll, disabled: !open.length },
        { label: "Close all", run: wm.closeAll, disabled: !open.length },
        ...(open.length ? [{ sep: true }, { heading: "Open windows" }] : []),
        ...[...open].reverse().map((w) => ({
          label: titleFor(w.app, w.param) + (w.min ? " (minimised)" : ""),
          checked: w.id === focus,
          run: () => wm.launch(w.app, w.param),
        })),
      ];
    },
    go: () => [
      { label: "Desktop", run: wm.minimizeAll },
      { sep: true },
      ...APPS.map((a, i) => ({ label: a.label, shortcut: `${ALT} ${i + 1}`, run: () => wm.launch(a.id) })),
    ],
    help: () => [
      { label: "Keyboard shortcuts", shortcut: "?", run: onShortcuts },
      { label: "Search everything", shortcut: `${MOD} K`, run: onSearch },
      { sep: true },
      { label: "Visit bits-dvm.org", run: () => window.open("https://bits-dvm.org", "_blank", "noopener") },
    ],
  };

  const openMenu = (id, el) => {
    const r = el.getBoundingClientRect();
    menu.open(r.left, r.bottom + 4, menus[id](), { id: `bar:${id}` });
  };
  const trigger = (id, label, cls = "") => (
    <button
      key={id}
      className={`${s.menuBtn} ${cls}`}
      data-menu-trigger
      aria-haspopup="menu"
      aria-expanded={menu.openId === `bar:${id}`}
      onClick={(e) => (menu.openId === `bar:${id}` ? menu.close() : openMenu(id, e.currentTarget))}
      onPointerEnter={(e) => menu.openId?.startsWith("bar:") && menu.openId !== `bar:${id}` && openMenu(id, e.currentTarget)}
    >
      {label}
    </button>
  );

  return (
    <header className={s.bar}>
      <div className={s.left}>
        {trigger("app", appName, s.appName)}
        {trigger("window", "Window")}
        {trigger("go", "Go")}
        {trigger("help", "Help")}
      </div>
      <div className={s.right}>
        <button className={s.tray} data-menu-trigger onClick={onCenter} aria-expanded={centerOpen} aria-label={`Notifications${unread ? `, ${unread} new` : ""}`}>
          <Bell size={15} strokeWidth={1.7} />
          {unread > 0 && <span className={s.badge}>{unread}</span>}
        </button>
        <button className={s.clock} data-menu-trigger onClick={onCenter} aria-label={`Pilani time ${fmtTime(now)}, open notification centre`}>
          <span className={s.day}>{fmtDay(now)}</span>
          <span className={s.time}>{fmtTime(now)}</span>
        </button>
      </div>
    </header>
  );
}
