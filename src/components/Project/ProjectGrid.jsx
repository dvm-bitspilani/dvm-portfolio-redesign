import React from "react";
import ProjectCard from "./ProjectCard";
import "./ProjectGrid.css";

export default function ProjectGrid({ projects }) {
  return (
    <div className="project-grid">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}