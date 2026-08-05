import { useState } from "react";
import Navbar from "../components/Navbar";
import projects from "../components/Project/projectsData";
import Tabs from "../components/Project/Tabs";
import Ham from "../components/Ham";
import ProjectGrid from "../components/Project/ProjectGrid";
import "../components/Project/Projects.css";
import ProjectHeading from "../assests/Projects/projects.png"
import ProjectHeadingOutline from "../assests/Projects/projects-outline.png"
import bg3 from "../assests/bg_3.png";


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
    <div
     
    ></div>
      <Navbar onHamClick={() => setIsHamOpen(true)} />
        
      <div className="proj-page">
       <div className="proj-heading">PROJECTS</div>

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