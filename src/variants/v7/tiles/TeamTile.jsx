// Team pulse: one member at a time, position holders first. Pauses on hover/focus, off screen,
// in a hidden tab, and entirely with reduced motion. Expands into the Team page.
import { useEffect, useState } from "react";
import Head from "./Head";
import TeamPage from "../pages/TeamPage";
import { pulseMembers, VERTICAL_LABEL } from "../lib/data";
import { useReducedMotion, useVisible } from "../lib/hooks";
import t from "./tiles.module.css";

const EVERY = 4200;

export default function TeamTile({ role, tileRef, label }) {
  const reduced = useReducedMotion();
  const visible = useVisible(tileRef);
  const [i, setI] = useState(0);
  const [held, setHeld] = useState(false);
  const running = role !== "primary" && !reduced && visible && !held;

  useEffect(() => {
    const el = tileRef.current;
    if (!el) return;
    const on = () => setHeld(true);
    const off = () => setHeld(el.matches(":hover") || el.contains(document.activeElement));
    el.addEventListener("pointerenter", on);
    el.addEventListener("pointerleave", off);
    el.addEventListener("focusin", on);
    let tid = 0;
    const out = () => {
      clearTimeout(tid);
      tid = window.setTimeout(off, 0);
    };
    el.addEventListener("focusout", out);
    return () => {
      clearTimeout(tid);
      el.removeEventListener("pointerenter", on);
      el.removeEventListener("pointerleave", off);
      el.removeEventListener("focusin", on);
      el.removeEventListener("focusout", out);
    };
  }, [tileRef]);

  useEffect(() => {
    if (!running) return;
    const id = window.setTimeout(() => !document.hidden && setI((v) => (v + 1) % pulseMembers.length), EVERY);
    return () => clearTimeout(id);
  }, [running, i]);

  // warm the next portrait so the swap never shows an empty frame
  useEffect(() => {
    const img = new Image();
    img.src = pulseMembers[(i + 1) % pulseMembers.length].photo;
  }, [i]);

  if (role === "primary") return <TeamPage />;
  const m = pulseMembers[i];
  return (
    <>
      <Head id="team" label={label} led={running ? "live" : "idle"}>
        {i + 1}/{pulseMembers.length}
      </Head>
      <div className={t.pulse} data-role={role} key={m.slug}>
        <img className={t.pulsePhoto} src={m.photo} alt="" decoding="async" />
        <div className={t.pulseText}>
          <p className={t.pulseName}>{m.name}</p>
          <p className={t.pulseMeta}>
            {VERTICAL_LABEL[m.vertical]}, batch of {m.batch}
          </p>
          {m.designation && <p className={t.pulseRole}>{m.designation}</p>}
        </div>
      </div>
      <div className={t.pulseBar} aria-hidden="true">
        <span key={`${m.slug}-${running}`} data-run={running ? "" : undefined} style={{ animationDuration: `${EVERY}ms` }} />
      </div>
    </>
  );
}
