import { createContext, useContext, useLayoutEffect } from "react";

export const BusContext = createContext(null);
export const useBus = () => useContext(BusContext);

/** Call fn({ p, c, left, w, size }) as the element crosses the gate (no React renders). */
export function useWatch(ref, fn, deps = []) {
  const bus = useBus();
  useLayoutEffect(() => {
    if (!bus || !ref.current) return;
    return bus.watch(ref.current, fn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bus, ref, ...deps]);
}

/** Mark the element the lamp (mercury mark) sits in while this page is on screen. */
export function useHeroSlot(ref) {
  const bus = useBus();
  useLayoutEffect(() => {
    const el = ref.current;
    if (!bus || !el) return;
    bus.setHero(el);
    return () => {
      if (bus.hero?.el === el) bus.setHero(null);
    };
  }, [bus, ref]);
}
