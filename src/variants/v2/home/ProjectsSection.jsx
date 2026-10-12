// Home "Projects": a typographic index on the left, a GPGPU swarm on the right.
// The swarm holds the DVM mark; hovering (or focusing) a project re-forms it into
// that project's cover, and it falls back to the mark when you leave.
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { SwarmField, useSwarmHover } from "../../../immersive/kit/swarm";
import { P } from "../lib/paths";
import { selectedProjects, swarmTargetFor, yearOf } from "../lib/projects";
import { useMedia, useNear, useReducedMotion } from "../lib/hooks";
import s from "./sections.module.css";

export default function ProjectsSection() {
  const sectionRef = useRef(null);
  const swarmRef = useRef(null);
  const near = useNear(sectionRef, "-22% 0px");
  const reduced = useReducedMotion();
  const narrow = useMedia("(max-width: 760px)");
  const list = useMemo(() => selectedProjects(7), []);
  const [active, setActive] = useState(null);
  const placement = narrow ? { x0: 0.04, y0: 0.02, x1: 0.96, y1: 0.36 } : { x0: 0.5, y0: 0.14, x1: 0.97, y1: 0.9 };
  const bind = useSwarmHover({ controller: swarmRef, placement, fill: 0.9, morphDuration: reduced ? 0.6 : 1.2, leaveDelay: 450 });

  // warm the hover shapes once the field exists
  useEffect(() => {
    if (!near) return;
    const t = setTimeout(() => swarmRef.current?.preload(list.map(swarmTargetFor)), 900);
    return () => clearTimeout(t);
  }, [near, list]);

  return (
    <section ref={sectionRef} id="projects" className={s.projects} aria-labelledby="v2-projects-title">
      <div className={s.projectsField} aria-hidden="true">
        {near && (
          <SwarmField
            ref={swarmRef}
            target="logo"
            placement={placement}
            background="transparent"
            palette="teal"
            quality="auto"
            holdToAttract
          />
        )}
      </div>
      <div className={s.projectsGrid} aria-hidden="true" />

      <div className={s.projectsInner}>
        <div className={s.sectionHead}>
          <h2 id="v2-projects-title" className={s.headFill}>Projects</h2>
          <span className={s.headOutline} aria-hidden="true">Projects</span>
        </div>
        <p className={s.projectsLede}>Hover a project and the swarm rebuilds its cover from 200,000 particles. Press and hold on empty space to pull them into a black hole.</p>
        <ol className={s.index}>
          {list.map((p) => {
            const h = bind(swarmTargetFor(p));
            return (
              <li key={p.id} className={active === p.id ? s.indexActive : undefined}>
                <Link
                  to={P(`/projects/${p.id}`)}
                  className={s.indexLink}
                  onPointerEnter={() => { setActive(p.id); h.onPointerEnter(); }}
                  onPointerLeave={() => { setActive(null); h.onPointerLeave(); }}
                  onFocus={() => { setActive(p.id); h.onFocus(); }}
                  onBlur={() => { setActive(null); h.onBlur(); }}
                >
                  <span className={s.indexName}>{p.name}</span>
                  <span className={s.indexMeta}>
                    {p.categories.join(" / ")}
                    {yearOf(p) && <em>{yearOf(p)}</em>}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
        <Link to={P("/projects")} className={s.pill}>
          See all projects
        </Link>
      </div>
    </section>
  );
}
