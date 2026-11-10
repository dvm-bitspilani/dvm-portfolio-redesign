import { createContext, useContext } from "react";
import { clamp01 } from "../lib/math";

/** Variant-wide chrome state: preloader reveal + the full-screen menu. */
export const ChromeContext = createContext({ revealed: true, menuOpen: false, openMenu: () => {}, closeMenu: () => {} });
export const useChrome = () => useContext(ChromeContext);

/** The bar's static print opacity (`--mark-static` on <html>): the home hero crossfades it with
 *  the live hologram as the mark docks; 1 everywhere else. */
export function setStaticMark(v) {
  const k = clamp01(v);
  document.documentElement.style.setProperty("--mark-static", String(Math.round(k * 1000) / 1000));
}
