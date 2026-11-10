// /alumni · the readout under the h1 (research/v8-alumni-page-r3.md §3.4): three counters — alumni,
// companies, batches — value over key, between hairlines. The values count up once when the row
// comes into view (900 ms, power2.out, whole numbers); with reduced motion they are simply there.
// The final numbers are in the markup from the start, so nothing depends on the tween.
import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { BATCHES, STATS } from "../alumniData";
import ui from "../../ui.module.css";
import s from "./legacyPage.module.css";

gsap.registerPlugin(ScrollTrigger);

const ITEMS = [
  { key: "Alumni", value: STATS.people, label: `${STATS.people} alumni` },
  { key: "Companies", value: STATS.companies, label: `${STATS.companies} companies` },
  { key: "Batches", value: BATCHES.length, label: `${BATCHES.length} batches, ${BATCHES[0]} to ${BATCHES.at(-1)}` },
];

export default function Readout() {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const els = /** @type {HTMLElement[]} */ ([...root.querySelectorAll("[data-n]")]);
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: root, start: "top 92%", once: true },
      });
      els.forEach((el, i) => {
        const o = { v: 0 };
        const to = Number(el.dataset.n);
        el.textContent = "0";
        tl.to(
          o,
          {
            v: to,
            duration: 0.9,
            ease: "power2.out",
            snap: { v: 1 },
            onUpdate: () => {
              el.textContent = String(o.v);
            },
          },
          i * 0.06,
        );
      });
    }, root);
    return () => {
      ctx.revert();
      els.forEach((el) => {
        el.textContent = el.dataset.n ?? "";
      });
    };
  }, []);

  return (
    <dl ref={ref} className={s.readout} data-reveal>
      {ITEMS.map((it) => (
        <div key={it.key} className={s.counter}>
          <dt className={`${ui.meta} ${s.counterKey}`}>{it.key}</dt>
          <dd className={s.counterVal}>
            <span aria-hidden="true" data-n={it.value}>
              {it.value}
            </span>
            <span className={ui.srOnly}>{it.label}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
