// Selected work, after About DVM and before Legacy: the featured projects (the ones the live site
// lists under "Selected Projects / Selected Videos") that have a cover or a YouTube still, padded
// to five with the newest other projects that have a cover, as covers in the open (the round-9
// grid's cards: the feature larger, with its summary) on the film strip that travels sideways
// while the section is pinned (useFilmStrip.js, the same film as Five teams on /about). The
// hologram docked in the navbar is the projector lamp: its beam sweeps across the cover in the
// gate and, as the pin lets go, swings onto the alumni dots in Legacy (Spotlight.jsx). The strip
// ends in a tail of copy that hands over to Legacy. Reduced motion and narrower screens get the
// cards stacked, no pin, no beam; phones get them as a strip of their own, swiped sideways.
// Cards link into the variant's project pages, or out to YouTube / the store for those without
// a page.
import { useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { featuredProjects, projects } from "../../../immersive/data";
import { catalogCount } from "../lib/catalog";
import { useMedia, useReducedMotion } from "../lib/hooks";
import { P } from "../lib/paths";
import { projectHref, projectThumb } from "../lib/projects";
import Spotlight from "./Spotlight";
import { toLegacy, useFilmStrip } from "./useFilmStrip";
import ui from "../ui.module.css";
import st from "./strip.module.css";
import s from "./sections.module.css";

const KIND = { website: "Website", app: "App", portal: "Portal", video: "Film" };
const COUNT = 5;

/** Featured projects with a picture first (one without a cover would be an empty frame; it stays
 *  on /projects and in the timeline), then the newest covered ones. */
function pickWork() {
  const featured = featuredProjects.filter((p) => p.cover || p.youtubeId).slice(0, COUNT);
  const pad = projects
    .filter((p) => !p.featured && p.cover && p.year)
    .sort((a, b) => b.year - a.year)
    .slice(0, Math.max(0, COUNT - featured.length));
  return [...featured, ...pad].map((p) => {
    const href = projectHref(p);
    return {
      p,
      href,
      thumb: projectThumb(p),
      external: Boolean(href && !href.startsWith("/")),
      meta: [`${p.fest}${p.year ? ` ${p.year}` : ""}`, KIND[p.kind] ?? p.kind].join(" · "),
    };
  });
}

function Card({ it, feature }) {
  const { p, href, thumb, external, meta } = it;
  const Tag = href ? (external ? "a" : Link) : "div";
  const linkProps = href ? (external ? { href, target: "_blank", rel: "noreferrer" } : { to: href }) : {};
  return (
    <Tag className={`${ui.card} ${s.workCard}`} {...linkProps}>
      <span className={`${ui.frame} ${s.workStill}`}>
        {thumb ? (
          <img src={thumb} alt="" loading={feature ? "eager" : "lazy"} />
        ) : (
          // (no cover: title and meta on the frame fill, never a lone initial)
          <span className={s.workBlank} aria-hidden="true">
            <span className={s.workBlankTitle}>{p.title}</span>
            <span className={ui.cardMeta}>{meta}</span>
          </span>
        )}
        {p.kind === "video" && <span className={ui.play} aria-hidden="true" />}
      </span>
      <span className={s.workCopy}>
        <span className={`${ui.cardTitle} ${feature ? s.workFeatureTitle : ""}`}>
          {p.title}
          {external ? " ↗" : ""}
        </span>
        <span className={ui.cardMeta}>{meta}</span>
        {feature && p.summary && <span className={`${ui.cardLine} ${s.workLine}`}>{p.summary}</span>}
      </span>
    </Tag>
  );
}

export default function Work() {
  const sectionRef = useRef(null);
  const trackRef = useRef(null);
  const reduced = useReducedMotion();
  const wide = useMedia("(min-width: 900px)");
  const travel = wide && !reduced;
  const items = useMemo(pickWork, []);
  const { onFocus, onScroll } = useFilmStrip({ sectionRef, trackRef, enabled: travel });

  // the chapter head: on the strip it is the film's leader (it travels with the frames); stacked,
  // it sits above them
  const lead = (
    <div className={st.lead} data-park="">
      <h2 id="v8-work-title" className={ui.h2}>
        Selected work
      </h2>
      <p className={ui.lede}>What the five teams shipped for BOSM, Oasis and APOGEE.</p>
      <Link to={P("/projects")} className={`${ui.link} ${st.leadLink}`}>
        All {catalogCount} projects →
      </Link>
    </div>
  );

  return (
    <>
      <section
        ref={sectionRef}
        id="work"
        className={`${st.strip} ${travel ? st.travel : `${st.stack} ${s.workStack}`}`}
        data-light={travel ? "50% 50% 36vw" : "50% 8% 60vw"}
        data-chapter="Selected work"
        aria-labelledby="v8-work-title"
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

          {items.map((it, i) => (
            <article
              key={it.p.slug}
              data-frame=""
              data-spot="0.5,0.46"
              className={`${s.workFrame} ${i === 0 ? s.workFeature : s.workStd}`}
              aria-label={it.p.title}
            >
              <Card it={it} feature={i === 0} />
            </article>
          ))}

          <div className={st.tail} data-park="">
            <a href="#legacy" className={ui.link} onClick={toLegacy}>
              Where they went next ↓
            </a>
          </div>
        </div>
      </section>
      {/* the beam: a viewport layer beside the section, so it can reach Legacy below */}
      <Spotlight sectionRef={sectionRef} trackRef={trackRef} enabled={travel} />
    </>
  );
}
