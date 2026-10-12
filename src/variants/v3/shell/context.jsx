import { createContext, useContext, useMemo } from "react";
import { UNSAFE_NavigationContext as NavigationContext } from "react-router-dom";

export const V3_BASE = "/v/v3";

/** "booting" while the DVM://BOOT overlay is up, then "done". */
export const BootContext = createContext("done");
export const useBoot = () => useContext(BootContext);

const RootNavContext = createContext(null);

/**
 * Re-provides react-router's navigation context with basename /v/v3, so every
 * absolute link in the reused base pages ("/projects", "/#about", navigate("/"))
 * stays inside the variant without forking those pages.
 */
export function V3Router({ children }) {
  const nav = useContext(NavigationContext);
  const value = useMemo(() => ({ ...nav, basename: V3_BASE }), [nav]);
  return (
    <RootNavContext.Provider value={nav}>
      <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>
    </RootNavContext.Provider>
  );
}

/**
 * For kit pieces that navigate with the full current pathname (ArchiveWall's
 * ?f=&item= sync): give them back the unprefixed navigator.
 */
export function RootNav({ children }) {
  const nav = useContext(RootNavContext);
  if (!nav) return children;
  return <NavigationContext.Provider value={nav}>{children}</NavigationContext.Provider>;
}

/** Path relative to the variant root ("/v/v3/projects" → "/projects"). */
export const localPath = (pathname) =>
  pathname.startsWith(V3_BASE) ? pathname.slice(V3_BASE.length) || "/" : pathname;
