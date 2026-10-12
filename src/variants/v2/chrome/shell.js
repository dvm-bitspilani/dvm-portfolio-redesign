import { createContext, useContext } from "react";

/** Variant-wide chrome state: preloader reveal + the full-screen menu. */
export const ChromeContext = createContext({ revealed: true, menuOpen: false, openMenu: () => {}, closeMenu: () => {} });
export const useChrome = () => useContext(ChromeContext);
