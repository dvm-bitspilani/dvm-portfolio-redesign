// About DVM, second on the page (right under the hero, before Selected work): the department's
// own copy (verbatim) and three numbers. No images here; the five teams are on /about. The long
// form lives on /about. The head is the chapter head every chapter shares (title left, the one
// forward link right on the same row); the numbers sit beside the copy as a short ledger
// (number, then its label), so the chapter is one viewport-third tall.
import { useRef } from "react";
import { Link } from "react-router-dom";
import { site, stats } from "../../../immersive/data";
import { P } from "../lib/paths";
import { useReveal } from "../lib/reveal";
import ui from "../ui.module.css";
import s from "./sections.module.css";

const ABOUT_STATS = stats.filter((x) => ["users on our apps and websites", "fests: BOSM, Oasis & APOGEE", "teams"].includes(x.label));

export default function About() {
  const ref = useRef(null);
  useReveal(ref);
  return (
    <section ref={ref} id="about" className={ui.sec} data-light="14% 70% 30vw" data-chapter="About DVM" aria-labelledby="v8-about-title">
      <div className={ui.wrap}>
        <div className={ui.headRow}>
          <div className={ui.secHead}>
            <h2 id="v8-about-title" className={ui.h2} data-reveal="head">
              About DVM
            </h2>
          </div>
          <Link to={P("/about")} className={`${ui.link} ${ui.headAction}`} data-reveal>
            More about DVM →
          </Link>
        </div>
      </div>
      <div className={ui.inner}>
        <div className={`${ui.prose} ${s.aboutCopy}`}>
          {site.about.slice(0, 2).map((p) => (
            <p key={p.slice(0, 24)} data-reveal>
              {p}
            </p>
          ))}
        </div>
        <dl className={`${ui.stats} ${s.aboutStats}`} data-reveal>
          {ABOUT_STATS.map((x) => (
            <div key={x.label}>
              <dt>{x.label}</dt>
              <dd>{x.display}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
