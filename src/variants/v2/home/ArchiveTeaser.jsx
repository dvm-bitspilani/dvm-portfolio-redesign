import { Link } from "react-router-dom";
import { projects, artworks, team } from "../../../immersive/data";
import { P } from "../lib/paths";
import s from "./sections.module.css";

export default function ArchiveTeaser() {
  return (
    <section className={s.teaser} aria-labelledby="v2-archive-title">
      <Link to={P("/archive")} className={s.teaserLink}>
        <span className={s.teaserCount}>
          {projects.length} projects, {artworks.length} artworks and {team.length} members on one infinite wall
        </span>
        <h2 id="v2-archive-title" className={s.teaserTitle}>Archive</h2>
        <span className={s.pill}>Enter the archive</span>
      </Link>
    </section>
  );
}
