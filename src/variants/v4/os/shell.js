// What apps can ask of the OS, the same on desktop (windows) and phone (full-screen apps).
import { createContext, useContext } from "react";
import { MERCURY_ENVS } from "../../../immersive/kit/mercury";

export const OsContext = createContext({
  phone: false,
  launch: () => {},
  notify: () => {},
  booted: true,
});
export const useOs = () => useContext(OsContext);

// V2's mercury environment: the kit's teal studio with a near-clear glass body.
export const GLASS_ENV = { ...MERCURY_ENVS.teal, glass: [1.0, 1.05, 1.07] };

export const rectOf = (el) => {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
};
