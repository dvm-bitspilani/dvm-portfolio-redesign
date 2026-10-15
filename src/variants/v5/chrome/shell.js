import { createContext, useContext } from "react";

/** Shell-level chrome API: menu, lamp handle, leader state. */
export const ChromeContext = createContext({ menuOpen: false, openMenu: () => {}, closeMenu: () => {}, lamp: { current: null }, live: true });
export const useChrome = () => useContext(ChromeContext);
