import { useState } from "react";
import Navbar from "../components/Navbar";
import projects from "../components/Project/projectsData";
import Tabs from "../components/Project/Tabs";
import Ham from "../components/Ham";
import ProjectGrid from "../components/Project/ProjectGrid";
import "../components/Project/Projects.css";
import ProjectHeading from "../assests/Projects/projects.png"
import ProjectHeadingOutline from "../assests/Projects/projects-outline.png"


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
    const [isHamOpen, setIsHamOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(
    categories[0] || ""
  );

  const filteredProjects = projects.filter((project) =>
    project.categories.includes(activeCategory)
  );

  return (
    <>
      <Navbar onHamClick={() => setIsHamOpen(true)} />
        
      <div className="proj-page">
       <img
       src={ProjectHeading}
       className="project-heading"
       style={{ width: "80%", height: "auto", margin: "2rem",paddingLeft:"10rem" }}
       />

        <Tabs
          categories={categories}
          active={activeCategory}
          onChange={setActiveCategory}
        />

        <ProjectGrid projects={filteredProjects} />
        {isHamOpen && <Ham onClose={() => setIsHamOpen(false)} />}
      </div>
    </>
  );
}