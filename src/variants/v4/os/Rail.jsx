// The dock: a vertical glass rail on the left. The live mercury mark at the top is the
// start button; below it the eight apps (pip = running, ring = minimised), then one tile
// per open project window. Windows minimise into their tile here.
import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { MercuryLogo } from "../../../immersive/kit/mercury";
import { APPS, projectBySlug, titleFor } from "./apps";
import { AppIcon, MarkSvg } from "./icons";
import { useWm } from "./wm";
import { useMenu } from "./menus";
import { GLASS_ENV, rectOf } from "./shell";
import s from "./rail.module.css";
import { MOD } from "../lib/hooks";

export const StartMark = forwardRef(function StartMark({ live, open }, ref) {
  const merc = useRef(null);
  const [ready, setReady] = useState(false);
  useImperativeHandle(ref, () => ({
    poke() {
      merc.current?.drop();
      merc.current?.ripple(0.016);
    },
    ripple: () => merc.current?.ripple(0.012),
  }));
  return (
    <span className={s.markBox} data-mark-target="desktop">
      <MarkSvg className={`${s.markSvg} ${live && ready ? s.hide : ""}`} fill="url(#v4-mark-grad)" />
      {live && (
        <span className={s.gl} data-kit>
          <MercuryLogo
            ref={merc}
            env={GLASS_ENV}
            progress={open ? 1 : 0}
            smoothing={5}
            fit={{ mode: "height", padding: 0.17 }}
            interactive={false}
            pointerTarget="window"
            tilt={0.7}
            sway={0.6}
            sheen={0.9}
            shadow={0}
            contours={0.8}
            intro={false}
            fps={30}
            quality="low"
            label="DVM"
            onReady={() => setReady(true)}
          />
        </span>
      )}
    </span>
  );
});

function DockItem({ k, app, label, cover, wins, focus, onClick, onMenu }) {
  const running = wins.length > 0;
  const focused = wins.some((w) => w.id === focus);
  const allMin = running && wins.every((w) => w.min || w.minimizing);
  return (
    <li className={s.li}>
      <button
        className={s.item}
        data-dock-key={k}
        data-running={running || undefined}
        data-min={allMin || undefined}
        data-focused={focused || undefined}
        onClick={(e) => onClick(e.currentTarget)}
        onContextMenu={(e) => {
          e.preventDefault();
          onMenu(e);
        }}
        aria-label={`${label}${running ? (allMin ? ", minimised" : ", open") : ""}`}
      >
        <AppIcon app={app} cover={cover} size={44} />
        <span className={s.tip}>{label}</span>
      </button>
    </li>
  );
}

export default function Rail({ startOpen, onStart, startRef, startLive }) {
  const wm = useWm();
  const menu = useMenu();
  const { wins, focus } = wm.state;
  const alive = Object.values(wins).filter((w) => !w.closing);
  const byKey = (k) => alive.filter((w) => w.key === k);
  const projectWins = alive.filter((w) => w.app === "project");

  const click = (app, param) => (el) => {
    const [w] = byKey(app === "project" ? `project:${param}` : app);
    if (w && focus === w.id && !w.min) wm.minimize(w.id);
    else wm.launch(app, param, { origin: rectOf(el.querySelector("span")) });
  };
  const ctx = (app, param) => (e) => {
    const [w] = byKey(app === "project" ? `project:${param}` : app);
    const items = [{ label: w ? (w.min ? "Restore" : "Show") : "Open", run: () => wm.launch(app, param, { origin: rectOf(e.currentTarget) }) }];
    if (w) {
      if (!w.min) items.push({ label: "Minimise", run: () => wm.minimize(w.id) });
      items.push({ sep: true }, { label: "Close", run: () => wm.close(w.id) });
    }
    menu.open(e.clientX + 6, e.clientY, items);
  };

  return (
    <nav className={s.rail} aria-label="Dock">
      <button
        className={s.start}
        data-menu-trigger
        onClick={onStart}
        aria-label="Start menu"
        aria-expanded={startOpen}
        aria-haspopup="dialog"
        title={`Start (${MOD} K)`}
      >
        <StartMark ref={startRef} live={startLive} open={startOpen} />
      </button>
      <ul className={s.list}>
        {APPS.map((a) => (
          <DockItem key={a.id} k={a.id} app={a.id} label={a.label} wins={byKey(a.id)} focus={focus} onClick={click(a.id)} onMenu={ctx(a.id)} />
        ))}
      </ul>
      {projectWins.length > 0 && (
        <ul className={`${s.list} ${s.extra}`} aria-label="Open projects">
          {projectWins.map((w) => (
            <DockItem key={w.key} k={w.key} app="project" label={titleFor("project", w.param)} cover={projectBySlug(w.param)?.cover} wins={[w]} focus={focus} onClick={click("project", w.param)} onMenu={ctx("project", w.param)} />
          ))}
        </ul>
      )}
    </nav>
  );
}
