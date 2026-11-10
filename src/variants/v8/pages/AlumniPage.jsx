// /alumni (was /legacy; round 3: research/v8-alumni-page-r3.md): where DVM's alumni work now. The
// head says it at once — the h1 (the swarm mark beside it), three counters and the wall of big names
// (legacy/page/BigNames). Then Companies (every company, as a sector map: legacy/page/Companies) and
// People (everyone, by batch and team: legacy/page/Alumni), and three links on.
// One company language for the whole page: every company is the same disc (legacy/page/CompanyDisc);
// hover or focus one and its people branch out of it (legacy/page/Branch, one fixed layer), click
// pins them; on touch screens and phones they open in a sheet (CompanySheet). openCompany.js holds
// the open company; `data-co-open` on <main> dims every other disc while one is open. Companies and
// people light each other (legacy/page/kin). Data: legacy/alumniData.
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import Navbar from "../chrome/Navbar";
import LegacySwarm from "../legacy/LegacySwarm";
import Alumni from "../legacy/page/Alumni";
import BigNames from "../legacy/page/BigNames";
import Branch from "../legacy/page/Branch";
import Companies, { CompanySheet } from "../legacy/page/Companies";
import { onOpen, getOpen, useCompanyPage } from "../legacy/page/openCompany";
import Readout from "../legacy/page/Readout";
import lp from "../legacy/page/legacyPage.module.css";
import { useMedia, useReducedMotion } from "../lib/hooks";
import { P } from "../lib/paths";
import { useReveal } from "../lib/reveal";
import ui from "../ui.module.css";

/** Where the head's mark sits: the right of the intro, clear of the h1. */
const HEAD_MARK = { x0: 0.6, y0: 0.06, x1: 0.96, y1: 0.94 };

export default function AlumniPage() {
  const mainRef = useRef(/** @type {HTMLElement | null} */ (null));
  const headRef = useRef(null);
  const closeRef = useRef(null);
  useReveal(headRef, { start: "top 95%" });
  useReveal(closeRef);
  const wide = useMedia("(min-width: 760px)");
  const branch = useMedia("(hover: hover) and (pointer: fine) and (min-width: 760px)");
  const reduced = useReducedMotion();
  useCompanyPage({ hover: branch, reduced });

  // while a company is open every other disc dims (CSS); set on the node, so the page never re-renders
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return undefined;
    const apply = () => {
      const o = getOpen();
      if (o) main.dataset.coOpen = o.pinned ? "pinned" : "";
      else delete main.dataset.coOpen;
    };
    apply();
    return onOpen(apply);
  }, []);

  return (
    <>
      <Navbar />
      <main ref={mainRef} className={`${ui.page} ${lp.page}`}>
        <header ref={headRef} className={`${ui.pageHead} ${lp.head}`} data-light="22% 30% 40vw">
          <div className={lp.headIntro}>
            {/* the mark opens the page as it opens the chapter on the home: dim, right of the h1 */}
            {wide && (
              <div className={lp.headMark} aria-hidden="true">
                <LegacySwarm placement={HEAD_MARK} brightness={0.4} fill={0.8} />
              </div>
            )}
            <h1 className={`${ui.h1} ${lp.headTitle}`} data-reveal="head">
              Alumni
            </h1>
          </div>
          <Readout />
          <BigNames />
        </header>

        <section id="v8-alumni-companies" className={`${ui.sec} ${lp.sec}`} data-light="70% 20% 36vw" aria-labelledby="v8-alumni-companies-h">
          <div className={ui.wrap}>
            <h2 id="v8-alumni-companies-h" className={`${ui.h2} ${lp.secTitle}`} tabIndex={-1}>
              Companies
            </h2>
            <Companies />
          </div>
        </section>

        <section id="v8-alumni-people" className={`${ui.sec} ${lp.sec}`} data-light="30% 40% 34vw" aria-labelledby="v8-alumni-people-h">
          <div className={ui.wrap}>
            <h2 id="v8-alumni-people-h" className={`${ui.h2} ${lp.secTitle}`} tabIndex={-1}>
              People
            </h2>
            <Alumni />
          </div>
        </section>

        <section ref={closeRef} className={`${ui.sec} ${lp.sec} ${lp.close}`} aria-label="More">
          <div className={`${ui.wrap} ${lp.closeIn}`} data-reveal>
            <Link to={P("/projects")} className={ui.btn}>
              The work
            </Link>
            <Link to={P("/about")} className={ui.link}>
              DVM, year by year →
            </Link>
            <Link to={P("/team")} className={ui.link}>
              The team now →
            </Link>
          </div>
        </section>

        {branch ? <Branch /> : <CompanySheet />}
      </main>
    </>
  );
}
