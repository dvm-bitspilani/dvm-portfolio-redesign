import React from "react";
import { Link } from "react-router-dom";
import "./ProjectCard.css";

export default function ProjectCard({ project }) {
  const isVideo = project.type === "video";
  const thumb = isVideo
    ? `https://img.youtube.com/vi/${project.youtubeId}/hqdefault.jpg`
    : project.heroImage;

  return (
    <Link to={`/projects/${project.id}`} className="project-card">
      <span className="project-card__thumb">
        <img src={thumb} alt="" loading="lazy" />
        {isVideo && <span className="project-card__play"  />}
        <span className="project-card__glow"  />
      </span>

      <span className="project-card__meta">
        <span className="project-card__name">{project.name}</span>
      </span>
    </Link>
  );
}