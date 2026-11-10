// One coalesced ScrollTrigger.refresh() per frame for the whole variant. Callers that need the
// page re-measured (a route commit, a font switch, fonts finishing late, the hero's resize)
// schedule it here instead of refreshing on their own; each gets a cancel for its cleanup, and
// the frame is dropped only when every request in it has been cancelled.
import { ScrollTrigger } from "gsap/ScrollTrigger";

let raf = 0;
const pending = new Set();

/** Refresh every ScrollTrigger on the next frame. Returns a cancel for this request. */
export function scheduleRefresh() {
  const token = {};
  pending.add(token);
  if (!raf) {
    raf = requestAnimationFrame(() => {
      raf = 0;
      pending.clear();
      ScrollTrigger.refresh();
    });
  }
  return () => {
    if (!pending.delete(token) || pending.size) return;
    cancelAnimationFrame(raf);
    raf = 0;
  };
}
