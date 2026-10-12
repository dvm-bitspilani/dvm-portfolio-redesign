import { createContext, useContext } from "react";

/**
 * `revealed` flips to true the moment the AsciiBoot power-off starts, i.e. when
 * the page underneath becomes visible. Hero intros wait for it so they play
 * after the hand-off instead of behind the CRT.
 */
export const BootContext = createContext({ revealed: true });
export const useBoot = () => useContext(BootContext);

// Like the base PreLoader: once per page load (survives route changes and
// switching variants, resets on reload).
let bootedThisLoad = false;
export const hasBooted = () => bootedThisLoad;
export const markBooted = () => {
  bootedThisLoad = true;
};
