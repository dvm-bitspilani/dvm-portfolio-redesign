// /about: the mark in glass beside the department copy and its five teams, then the
// origami strip unfolding the department's milestones (teal foil, to sit with the glass).
import { useEffect, useMemo, useRef, useState } from "react";
import { MercuryLogo, paintHeroBackdrop } from "../../../immersive/kit/mercury";
import { FoldTimeline } from "../../../immersive/kit/timeline";
import { site, stats, verticals } from "../../../immersive/data";
import bg3 from "../../../assests/bg_3.png";
import Navbar from "../chrome/Navbar";
import Ham from "../chrome/Ham";
import { buildMilestoneStops, useScopedSelect } from "../lib/timeline";
import { loadImage, useMedia } from "../lib/hooks";
import s from "./pages.module.css";

const ABOUT_STATS = stats.filter((x) => ["users on our apps and websites", "fests: BOSM, Oasis & APOGEE", "teams"].includes(x.label));

export default function AboutPage() {
  const [hamOpen, setHamOpen] = useState(false);
  const stageRef = useRef(null);
  const mercRef = useRef(null);
  const [backdrop, setBackdrop] = useState(null);
  const narrow = useMedia("(max-width: 768px)");
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
      <Navbar onHamClick={() => setHamOpen(true)} />
      <main className={s.about}>
        <section className={s.aboutTop} aria-labelledby="v2-about-page-title">
          <div className={s.gridBg} aria-hidden="true" />
          <div ref={stageRef} className={s.aboutMark}>
            <div className={s.aboutTexture} style={{ backgroundImage: `url(${bg3})` }} aria-hidden="true" />
            <MercuryLogo
              ref={mercRef}
              material="glass"
              backdrop={backdrop ? { source: backdrop, element: stageRef, frost: 1 } : null}
              fit={{ padding: narrow ? 0.14 : 0.16 }}
              introDelay={0.4}
              label="DVM mark in glass"
            />
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
      </main>
      {hamOpen && <Ham onClose={() => setHamOpen(false)} />}
    </>
  );
}
