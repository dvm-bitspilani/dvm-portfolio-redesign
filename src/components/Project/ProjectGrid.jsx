import React from "react";
import ProjectCard from "./ProjectCard";
import "./ProjectGrid.css";

export default function ProjectGrid({ projects }) {
  if (!projects.length) {
    return (
      <div className="project-grid__empty">
        Nothing here yet for this team — try another tab.
      </div>
    );
  }

  return (
    <div className="project-grid">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}
