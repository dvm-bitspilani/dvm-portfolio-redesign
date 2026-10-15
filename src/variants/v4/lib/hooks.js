import { useEffect, useState } from "react";

export function useMedia(query) {
  const [match, setMatch] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const on = () => setMatch(mql.matches);
    on();
    mql.addEventListener("change", on);
    return () => mql.removeEventListener("change", on);
  }, [query]);
  return match;
}

export const useReducedMotion = () => useMedia("(prefers-reduced-motion: reduce)");
export const reducedNow = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Pilani wall clock (IST), re-rendering on the minute (or second). */
export function useClock(seconds = false) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let t = 0;
    const tick = () => {
      const d = new Date();
      setNow(d);
      const ms = seconds ? 1000 - d.getMilliseconds() : 60000 - (d.getSeconds() * 1000 + d.getMilliseconds());
      t = setTimeout(tick, ms + 5);
    };
    tick();
    return () => clearTimeout(t);
  }, [seconds]);
  return now;
}

const TZ = "Asia/Kolkata";
export const fmtTime = (d, seconds = false) =>
  d.toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", ...(seconds ? { second: "2-digit" } : null) });
export const fmtDay = (d) => d.toLocaleDateString("en-GB", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" });
export const fmtLongDate = (d) => d.toLocaleDateString("en-GB", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });

/** Read/write a small preference in localStorage. */
export function usePref(key, initial) {
  const [v, setV] = useState(() => {
    try {
      const s = localStorage.getItem(key);
      return s == null ? initial : JSON.parse(s);
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch {
      /* private mode */
    }
  }, [key, v]);
  return [v, setV];
}

/** Modifier labels as the visitor's keyboard prints them. */
export const IS_MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
export const MOD = IS_MAC ? "⌘" : "Ctrl";
export const ALT = IS_MAC ? "⌥" : "Alt";
