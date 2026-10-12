// The original /projects page (src/pages/Projects.jsx) with the V2 navbar; links stay inside /v/v2.
import { useState } from "react";
import Navbar from "../chrome/Navbar";
import projects from "../../../components/Project/projectsData";
import Tabs from "../../../components/Project/Tabs";
import ProjectGrid from "./ProjectGrid";
import "../../../components/Project/Projects.css";
import ProjectHeading from "../../../assests/Projects/projects.png"
import ProjectHeadingOutline from "../../../assests/Projects/projects-outline.png"
import bg3 from "../../../assests/bg_3.png";


const CATEGORY_ORDER = [
  "Design",
  "Frontend",
  "Backend",
  "Video",
  "AppDev",
];

const presentCategories = new Set(
  projects.flatMap((project) => project.categories)
);


const categories = [
  ...CATEGORY_ORDER.filter((category) =>
    presentCategories.has(category)
  ),
  ...[...presentCategories].filter(
    (category) => !CATEGORY_ORDER.includes(category)
  ),
];

export default function Projects() {
  const [activeCategory, setActiveCategory] = useState(
    categories[0] || ""
  );

  const filteredProjects = projects.filter((project) =>
    project.categories.includes(activeCategory)
  );

  return (
    <>
    <div
     
    ></div>
      <Navbar />
        
      <div className="proj-page">
       <div className="proj-heading">PROJECTS</div>

        <Tabs
          categories={categories}
          active={activeCategory}
          onChange={setActiveCategory}
        />

        <ProjectGrid projects={filteredProjects} />
      </div>
    </>
  );
}