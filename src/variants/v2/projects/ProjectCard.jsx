// Copied from src/components/Project/ProjectCard.jsx; links stay inside /v/v2.
import { P } from "../lib/paths";
import React from "react";
import { Link } from "react-router-dom";
import "../../../components/Project/ProjectCard.css";

export default function ProjectCard({ project }) {
  const isVideo = project.type === "video";
  const thumb = isVideo
    ? `https://img.youtube.com/vi/${project.youtubeId}/hqdefault.jpg`
    : project.heroImage;

  return (
    <Link to={P(`/projects/${project.id}`)} className="project-card">
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