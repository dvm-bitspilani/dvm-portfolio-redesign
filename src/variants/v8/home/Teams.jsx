// The five teams on a short strip of film that travels sideways: one lead frame, then one frame
// per team. On /about since round 11 (`page`); the home page's strip is Selected work, which runs
// the same film (useFilmStrip.js, strip.module.css). The hologram docked in the navbar is the projector lamp; its spotlight (the room's
// pool of light) sweeps across the frame in the gate as the strip moves (home/Spotlight.jsx).
// Five frames is a bounded, equal-sized set, so the sideways stretch stays short (about two
// viewport widths). Reduced motion and narrower screens get the same frames stacked, no pin, no
// cone; phones get them as a strip of their own, swiped sideways (native scroll, snapping).
// Keyboard: tabbing to a link in a frame that is off to the side scrolls the page to where the
// strip shows that frame (the browser's own focus scrolling of the clipped section is undone).
// The strip runs a little faster than the scroll (SCRUB: 1.33 px of film per scrolled px), and it
// ends in open room: a tail of copy with no panel, pointing down to Legacy, so the last thing on
// the film as the pin lets go is copy, not a frame's hard edge (the beam swings from there onto
// the alumni dots, Spotlight.jsx). Each frame's gate is the shared panel: still on top (never
// cropped to a sliver), copy below.
import { useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { projectsByVertical, team, teamByVertical } from "../../../immersive/data";
import { P } from "../lib/paths";
import { useMedia, useReducedMotion } from "../lib/hooks";
import Spotlight from "./Spotlight";
import { YEARS } from "./storyData";
import { TEAMS, TEAM_STILLS } from "./teamStills";
import { toLegacy, useFilmStrip } from "./useFilmStrip";
import ui from "../ui.module.css";
import st from "./strip.module.css";
import s from "./teams.module.css";

function buildFrames() {
  return TEAMS.map((v) => ({
    ...v,
    members: teamByVertical(v.id).length,
    projects: projectsByVertical(v.id).length,
    still: TEAM_STILLS[v.id],
  }));
}

/** `page`: on /about (no chapter line there, and no #legacy below: the tail links to /alumni). */
export default function Teams({ page = false }) {
  const sectionRef = useRef(null);
  const trackRef = useRef(null);
  const reduced = useReducedMotion();
  const wide = useMedia("(min-width: 900px)");
  const travel = wide && !reduced;
  const frames = useMemo(buildFrames, []);
  const { onFocus, onScroll } = useFilmStrip({ sectionRef, trackRef, enabled: travel });

  // the chapter head: on the strip it is the film's leader (it travels with the frames); stacked,
  // it sits above them (on phones the frames are a strip of their own, swiped sideways)
  const lead = (
    <div className={st.lead} data-park="">
      <h2 id="v8-teams-title" className={ui.h2}>
        Five teams
      </h2>
      <p className={ui.lede}>Every fest site, app and film passes through all five.</p>
      <Link to={P("/team")} className={`${ui.link} ${st.leadLink}`}>
        Meet the teams →
      </Link>
    </div>
  );

  return (
    <>
      <section
        ref={sectionRef}
        id="teams"
        className={`${st.strip} ${travel ? st.travel : `${st.stack} ${s.stack}`}`}
        data-light={travel ? "50% 50% 36vw" : "50% 8% 60vw"}
        data-chapter={page ? undefined : "Five teams"}
        aria-labelledby="v8-teams-title"
        onFocus={travel ? onFocus : undefined}
        onScroll={travel ? onScroll : undefined}
      >
        {travel && (
          <>
            <span className={`${st.rail} ${st.railT}`} aria-hidden="true" />
            <span className={`${st.rail} ${st.railB}`} aria-hidden="true" />
          </>
        )}
        {!travel && lead}
        <div ref={trackRef} className={st.track}>
          {travel && lead}

          {frames.map((f) => (
            <article key={f.id} data-frame="" data-spot="0.5,0.5" className={s.frame} aria-labelledby={`v8-team-${f.id}`}>
              <div className={`${ui.panel} ${s.gate}`}>
                <div className={`${ui.frame} ${s.still}`}>
                  <img src={f.still.src} alt={f.still.alt} loading="lazy" />
                </div>
                <div className={s.frameCopy}>
                  <h3 id={`v8-team-${f.id}`} className={ui.h3}>
                    {f.name}
                  </h3>
                  <p className={s.desc}>{f.description}</p>
                  <p className={s.meta}>
                    {f.members} members · {f.projects} projects
                  </p>
                  <Link to={`${P("/team")}?v=${f.id}`} className={ui.link}>
                    Meet the team →
                  </Link>
                </div>
              </div>
            </article>
          ))}

          <div className={st.tail} data-park="">
            <p className={`${ui.lede} ${st.tailLede}`}>
              {team.length} people have passed through these five teams since {YEARS[0]?.year}.
            </p>
            {page ? (
              <Link to={P("/alumni")} className={ui.link}>
                Where they went next →
              </Link>
            ) : (
              <a href="#legacy" className={ui.link} onClick={toLegacy}>
                Where they went next ↓
              </a>
            )}
          </div>
        </div>
      </section>
      {/* the beam: a viewport layer beside the section, so it can reach Legacy below */}
      <Spotlight sectionRef={sectionRef} trackRef={trackRef} enabled={travel} />
    </>
  );
}
