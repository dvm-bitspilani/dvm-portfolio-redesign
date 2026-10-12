// /projects: the base page (tabs + grid) over a fixed swarm. The swarm holds the
// DVM mark on the right; hovering or focusing a card re-forms it into that cover.
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { SwarmField, useSwarmHover } from "../../../immersive/kit/swarm";
import Tabs from "../../../components/Project/Tabs";
import "../../../components/Project/Projects.css";
import "../../../components/Project/ProjectGrid.css";
import "../../../components/Project/ProjectCard.css";
import Navbar from "../chrome/Navbar";
import Ham from "../chrome/Ham";
import { P } from "../lib/paths";
import { projects, swarmTargetFor, yearOf } from "../lib/projects";
import { useMedia, useReducedMotion } from "../lib/hooks";
import s from "./pages.module.css";

const CATEGORY_ORDER = ["Design", "Frontend", "Backend", "Video", "AppDev"];
const present = new Set(projects.flatMap((p) => p.categories));
const categories = [...CATEGORY_ORDER.filter((c) => present.has(c)), ...[...present].filter((c) => !CATEGORY_ORDER.includes(c))];

function Card({ project, bind, onActive }) {
  const isVideo = project.type === "video";
  const thumb = isVideo ? `https://img.youtube.com/vi/${project.youtubeId}/hqdefault.jpg` : project.heroImage;
  const h = bind(swarmTargetFor(project));
  return (
    <Link
      to={P(`/projects/${project.id}`)}
      className={`project-card ${s.card}`}
      onPointerEnter={() => { onActive(project); h.onPointerEnter(); }}
      onPointerLeave={() => { onActive(null); h.onPointerLeave(); }}
      onFocus={() => { onActive(project); h.onFocus(); }}
      onBlur={() => { onActive(null); h.onBlur(); }}
    >
      <span className="project-card__thumb">
        {thumb && <img src={thumb} alt="" loading="lazy" />}
        {isVideo && <span className="project-card__play" />}
        <span className="project-card__glow" />
      </span>
      <span className="project-card__meta">
        <span className="project-card__name">{project.name}</span>
      </span>
    </Link>
  );
}

export default function ProjectsPage() {
  const [hamOpen, setHamOpen] = useState(false);
  const [category, setCategory] = useState(categories[0] || "");
  const [active, setActive] = useState(null);
  const swarmRef = useRef(null);
  const reduced = useReducedMotion();
  const narrow = useMedia("(max-width: 760px)");
  const list = useMemo(() => projects.filter((p) => p.categories.includes(category)), [category]);
  const placement = narrow ? { x0: 0.06, y0: 0.1, x1: 0.94, y1: 0.42 } : { x0: 0.58, y0: 0.16, x1: 0.97, y1: 0.86 };
  const bind = useSwarmHover({ controller: swarmRef, placement, fill: 0.92, morphDuration: reduced ? 0.6 : 1.1, leaveDelay: 500 });

  useEffect(() => {
    const t = setTimeout(() => swarmRef.current?.preload(list.slice(0, 10).map(swarmTargetFor)), 1200);
    return () => clearTimeout(t);
  }, [list]);

  return (
    <>
      <Navbar onHamClick={() => setHamOpen(true)} />
      <div className={s.swarmBg} aria-hidden="true">
        <SwarmField ref={swarmRef} target="logo" placement={placement} background="transparent" palette="teal" holdToAttract />
      </div>
      <main className={`proj-page ${s.projPage}`}>
        <div className={s.projHead}>
          <h1 className={s.headFill}>Projects</h1>
          <span className={s.headOutline} aria-hidden="true">Projects</span>
        </div>
        <p className={s.projLede}>
          {active ? (
            <>
              <strong>{active.name}</strong> {[active.categories.join(" / "), yearOf(active)].filter(Boolean).join(", ")}
            </>
          ) : (
            "Hover a project and the swarm rebuilds its cover."
          )}
        </p>
        <Tabs categories={categories} active={category} onChange={setCategory} />
        <div className={`project-grid ${s.grid}`}>
          {list.map((p) => (
            <Card key={p.id} project={p} bind={bind} onActive={setActive} />
          ))}
        </div>
      </main>
      {hamOpen && <Ham onClose={() => setHamOpen(false)} />}
    </>
  );
}
