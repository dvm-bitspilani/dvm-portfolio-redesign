// /about: the mark in glass beside the department copy and its five teams, then the
// origami strip unfolding the department's milestones (teal foil, to sit with the glass).
import { useEffect, useMemo, useRef, useState } from "react";
import { MercuryLogo, paintHeroBackdrop } from "../../../immersive/kit/mercury";
import { GLASS_ENV } from "../lib/glass";
import { FoldTimeline } from "../../../immersive/kit/timeline";
import { site, stats, verticals } from "../../../immersive/data";
import bg3 from "../../../assests/bg_3.png";
import Navbar from "../chrome/Navbar";
import { buildMilestoneStops, useScopedSelect } from "../lib/timeline";
import { loadImage, useMedia, useNear, useOnceNear } from "../lib/hooks";
import s from "./pages.module.css";

const ABOUT_STATS = stats.filter((x) => ["users on our apps and websites", "fests: BOSM, Oasis & APOGEE", "teams"].includes(x.label));

export default function AboutPage() {
  const stageRef = useRef(null);
  const mercRef = useRef(null);
  const [backdrop, setBackdrop] = useState(null);
  const narrow = useMedia("(max-width: 768px)");
  // The big glass mark only lives while the top of the page is near: with the docked
  // navbar mark and the milestones strip below, never more than two GL contexts render.
  const near = useNear(stageRef, "40% 0px");
  const tlRef = useRef(null);
  const tlNear = useOnceNear(tlRef, "60% 0px");
  const milestones = useMemo(() => buildMilestoneStops(), []);
  const onSelect = useScopedSelect();

  useEffect(() => {
    let alive = true;
    const el = stageRef.current;
    const c = document.createElement("canvas");
    let ro;
    loadImage(bg3).then((texture) => {
      if (!alive || !el) return;
      const paint = () => {
        const w = el.clientWidth, h = el.clientHeight;
        paintHeroBackdrop(c, { width: w, height: h, texture, mask: { x: w * 0.5, y: h * 0.45, r: Math.max(w, h) * 0.55 } });
        mercRef.current?.refreshBackdrop();
      };
      paint();
      setBackdrop(c);
      ro = new ResizeObserver(paint);
      ro.observe(el);
    });
    return () => {
      alive = false;
      ro?.disconnect();
    };
  }, []);

  return (
    <>
      <Navbar />
      <main className={s.about}>
        <section className={s.aboutTop} aria-labelledby="v2-about-page-title">
          <div className={s.gridBg} aria-hidden="true" />
          <div ref={stageRef} className={s.aboutMark}>
            <div className={s.aboutTexture} style={{ backgroundImage: `url(${bg3})` }} aria-hidden="true" />
            {near && (
              <MercuryLogo
                ref={mercRef}
                material="glass"
                env={GLASS_ENV}
                backdrop={backdrop ? { source: backdrop, element: stageRef, frost: 0.35, clarity: 0.85 } : null}
                fit={{ padding: narrow ? 0.14 : 0.16 }}
                introDelay={0.4}
                label="DVM mark in glass"
              />
            )}
          </div>
          <div className={s.aboutText}>
            <div className={`${s.projHead} ${s.aboutHead}`}>
              <h1 id="v2-about-page-title" className={s.headFill}>About us</h1>
              <span className={s.headOutline} aria-hidden="true">About us</span>
            </div>
            {site.about.map((p) => (
              <p key={p.slice(0, 20)} className={s.aboutPara}>{p}</p>
            ))}
            <dl className={s.stats}>
              {ABOUT_STATS.map((x) => (
                <div key={x.label}>
                  <dt>{x.label}</dt>
                  <dd>{x.display}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className={s.teams} aria-labelledby="v2-teams-title">
          <h2 id="v2-teams-title" className={s.teamsTitle}>Five teams, one department</h2>
          <ul className={s.teamList}>
            {verticals.map((v) => (
              <li key={v.id}>
                <h3>{v.name}</h3>
                <p>{v.description}</p>
              </li>
            ))}
          </ul>
        </section>

        <div ref={tlRef} className={s.tlSlot}>
          {tlNear && (
          <FoldTimeline
            items={milestones}
            tone="teal"
            title="Milestones"
            onSelect={onSelect}
            intro={
              <div className={s.tlIntro}>
                <h2>Milestones</h2>
                <p>Fest themes, firsts and every year's intake, printed on one folded strip.</p>
              </div>
            }
          />
          )}
        </div>
      </main>
    </>
  );
}
