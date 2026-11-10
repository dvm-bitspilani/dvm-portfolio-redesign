// The room's pool of light: mounts the controller (chrome/lightControl.js) once above the routes
// and keeps it pointed at the section that holds the viewport centre.
import { useEffect, useMemo } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { LightContext, LightController } from "./lightControl";
import { useReducedMotion } from "../lib/hooks";

gsap.registerPlugin(ScrollTrigger);

/** Mount once above the routes. `routeKey` changes re-scan for the new page's sections. */
export function LightProvider({ children, routeKey }) {
  const ctl = useMemo(() => new LightController(), []);
  const reduced = useReducedMotion();

  useEffect(() => {
    ctl.setReduced(reduced);
  }, [ctl, reduced]);

  useEffect(() => () => ctl.dispose(), [ctl]);

  useEffect(() => {
    let raf = 0;
    const scan = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        ctl.scan();
      });
    };
    const onResize = () => {
      ctl.resize();
      scan();
    };
    window.addEventListener("scroll", scan, { passive: true });
    window.addEventListener("resize", onResize);
    ScrollTrigger.addEventListener("refresh", scan);
    scan();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", scan);
      window.removeEventListener("resize", onResize);
      ScrollTrigger.removeEventListener("refresh", scan);
    };
  }, [ctl]);

  // a new page: forget the old section and take the new page's spot
  useEffect(() => {
    ctl.decl = null;
    ctl.declStr = "";
    const id = requestAnimationFrame(() => ctl.scan());
    return () => cancelAnimationFrame(id);
  }, [ctl, routeKey]);

  return <LightContext.Provider value={ctl}>{children}</LightContext.Provider>;
}
