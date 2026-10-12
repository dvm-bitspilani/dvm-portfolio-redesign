import { useState } from "react";
import { Link } from "react-router-dom";
import projects from "../../../components/Project/projectsData";
import Tabs from "../../../components/Project/Tabs";
import "../../../components/Project/Projects.css";
import "../../../components/Project/ProjectGrid.css";
import "../../../components/Project/ProjectCard.css";
import { AsciiImage } from "../../../immersive/kit/ascii";
import V3Nav from "../shell/V3Nav";
import bg3 from "../../../assests/bg_3.png";
import s from "./projects.module.css";

const CATEGORY_ORDER = ["Design", "Frontend", "Backend", "Video", "AppDev"];
const present = new Set(projects.flatMap((p) => p.categories));
const categories = [
  ...CATEGORY_ORDER.filter((c) => present.has(c)),
  ...[...present].filter((c) => !CATEGORY_ORDER.includes(c)),
];

const thumbOf = (p) => (p.type === "video" && p.youtubeId ? `https://img.youtube.com/vi/${p.youtubeId}/hqdefault.jpg` : p.heroImage);

/** The redesign's project card; hovering or focusing prints its cover in glyphs. */
function Card({ project }) {
  const [hot, setHot] = useState(false);
  const thumb = thumbOf(project);
  const on = () => setHot(true);
  const off = () => setHot(false);
  return (
    <Link
      to={`/projects/${project.id}`}
      className={`project-card ${s.card}`}
      onPointerEnter={on}
      onPointerLeave={off}
      onFocus={on}
      onBlur={off}
    >
      <span className={`project-card__thumb ${s.thumb}`}>
        {thumb && <img src={thumb} alt="" loading="lazy" />}
        {project.type === "video" && <span className="project-card__play" />}
        {hot && thumb && (
          <span className={s.ascii} aria-hidden="true">
            <AsciiImage src={thumb} palette="teal" reveal="scan" revealDuration={0.45} transparent={false} background="#04090b" cellSize={7} interactive />
          </span>
        )}
      </span>
      <span className="project-card__meta">
        <span className="project-card__name">{project.name}</span>
        <span className={s.cats}>{project.categories.join(" / ")}</span>
      </span>
    </Link>
  );
}

export default function ProjectsPage() {
  const [active, setActive] = useState(categories[0] || "");
  const list = projects.filter((p) => p.categories.includes(active));
  return (
    <div className={s.page}>
      <div className={s.texture} style={{ backgroundImage: `url(${bg3})` }} aria-hidden="true" />
      <div className={s.grid} aria-hidden="true" />
      <V3Nav />
      <div className="proj-page">
        <h1 className={s.heading}>
          <span className={s.ghost} aria-hidden="true">PROJECTS</span>
          <span className={s.solid}>PROJECTS</span>
        </h1>
        <p className={s.lede}>Hover a cover to see it the way DVM://BOOT does.</p>
        <Tabs categories={categories} active={active} onChange={setActive} />
        <div className="project-grid">
          {list.map((p) => (
            <Card key={p.id} project={p} />
          ))}
        </div>
      </div>
    </div>
  );
}
