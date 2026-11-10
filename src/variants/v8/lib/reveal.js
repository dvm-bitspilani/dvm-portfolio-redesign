// The one reveal (direction §3.5): elements marked data-reveal inside `ref` rise and fade in
// once, 60ms apart, when the block reaches 75% of the viewport. Two speeds: section heads
// (data-reveal="head") rise 40px over 0.9s, everything else 24px over 0.6s. Reduced motion: no
// tween.
import { useLayoutEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function useReveal(ref, { start = "top 75%" } = {}) {
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const els = [...root.querySelectorAll("[data-reveal]")];
    if (!els.length) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ scrollTrigger: { trigger: root, start, once: true } });
      els.forEach((el, i) => {
        const head = el.dataset.reveal === "head";
        tl.from(el, { autoAlpha: 0, y: head ? 40 : 24, duration: head ? 0.9 : 0.6, ease: "power3.out" }, i * 0.06);
      });
    }, root);
    return () => ctx.revert();
  }, [ref, start]);
}
