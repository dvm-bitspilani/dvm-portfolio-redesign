// The film's mechanics, shared by the two strips (Selected work on the home page, Five teams on
// /about): while the section is pinned the track travels sideways, a little faster than the
// scroll (SCRUB: 1.33 px of film per scrolled px). Keyboard: focusing a link in a box that is off
// to the side ([data-frame], or a [data-park] box such as the lead or the tail) scrolls the page
// to where the strip centres that box; the browser's own focus scrolling of the clipped section
// is undone (the strip moves by transform only). Nothing runs unless `enabled` (wide screens,
// motion allowed); the stacked / swiped layouts need none of it.
import { useCallback, useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/** Scrolled px per px of film: the pin is this much of the strip's travel. */
export const SCRUB = 0.75;

export function useFilmStrip({ sectionRef, trackRef, enabled, scrub = SCRUB }) {
  const stRef = useRef(null);

  // the strip travels sideways while the section is pinned
  useLayoutEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!enabled || !section || !track) return;
    const distance = () => Math.max(0, track.scrollWidth - section.clientWidth);
    const ctx = gsap.context(() => {
      const tween = gsap.to(track, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${distance() * scrub}`,
          pin: true,
          pinSpacing: true,
          anticipatePin: 1,
          scrub: 0.6,
          invalidateOnRefresh: true,
        },
      });
      stRef.current = tween.scrollTrigger ?? null;
    }, section);
    const raf = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => {
      cancelAnimationFrame(raf);
      ctx.revert();
      stRef.current = null;
    };
  }, [enabled, scrub, sectionRef, trackRef]);

  // focus inside a box on the film: scroll the page to the point where the strip centres it
  const onFocus = useCallback(
    (e) => {
      const st = stRef.current;
      const section = sectionRef.current;
      const track = trackRef.current;
      const box = e.target.closest?.("[data-frame], [data-park]");
      if (!st || !section || !track || !box) return;
      section.scrollLeft = 0;
      const span = st.end - st.start;
      const x = box.offsetLeft + box.offsetWidth / 2 - section.clientWidth / 2;
      const top = Math.round(st.start + Math.min(span, Math.max(0, x) * scrub));
      if (Math.abs(window.scrollY - top) > 2) window.scrollTo({ top, behavior: "auto" });
    },
    [scrub, sectionRef, trackRef],
  );
  // the browser scrolls a clipped box to show a focused child; the strip moves by transform only
  const onScroll = useCallback((e) => {
    e.currentTarget.scrollLeft = 0;
    e.currentTarget.scrollTop = 0;
  }, []);

  return { onFocus, onScroll };
}

/** The tail's "where they went next": down to Legacy, without touching the URL. */
export function toLegacy(e) {
  const el = document.getElementById("legacy");
  if (!el) return;
  e.preventDefault();
  const smoothOk = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: smoothOk ? "smooth" : "auto" });
}
