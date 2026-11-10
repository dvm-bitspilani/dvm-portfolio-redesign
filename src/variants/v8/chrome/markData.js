// Static data of the V8 brand mark (no React, no three): the logo's paths, the navbar dock's
// resting pose and the live mark's stacking layers. Shared by the live mark (chrome/mark.jsx),
// the bar's print (chrome/Navbar.jsx), the preloaders (chrome/boot/*) and the home hero.

/** The DVM mark's two paths (the static print in the bar, the preloaders). */
export const LOGO_VIEWBOX = "-470.31 -227.2 250.53 326.78";
export const LOGO_D = [
  "M-470.31-189.24V-37.4l106.28,75.91l99.96-75.91v-151.83l-95.53,72.75l-55.04-37.33l-0.63,36.06l55.04,35.43l69.59-51.25v77.19l-72.75,56.3l-70.86-49.97l-1.26-120.84L-470.31-189.24z",
  "M-467.26-11.82l100.58,70.55l114.59-86.03v-177l32.31-22.9v212.9L-370.95,99.58l-99.36-72.4V-11.2L-467.26-11.82z",
];

/** The mark's resting turn in the navbar's slot. */
export const DOCK_YAW = 0.06;
export const DOCK_PITCH = -0.12;

/**
 * V8's stacking map (the live mark box is fixed and sits outside `.root`, so its layer is
 * written from here; the CSS values are noted beside each):
 *   0       room grid + pool (room.module.css)        1      `.pages` (v8.module.css)
 *   5       live mark resting in the hero  (Z.page)   1000   navbar (chrome.module.css `.nav`)
 *   1001    live mark docking over the bar (Z.dock)   9999   route swipe panel (App.module.css)
 *   20000   menu overlay (menu.module.css)            20001  live mark in the menu's well (Z.menu)
 *   boot overlay and cursor: chrome/boot/boot.module.css, chrome/cursor.module.css (above all).
 */
export const Z = { page: 5, dock: 1001, menu: 20001 };
