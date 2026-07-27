import React, { useState } from "react";
import "../components/ProjectLanding.css";
import bg3 from "../assests/bg_3.png";

// Data lives right here for now — swap in real content/images whenever.
const cards = [
  {
    name: "Project 1",
    image: "",
    paragraph:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  },
  {
    name: "Project 2",
    image: "",
    paragraph:
      "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
  },
  {
    name: "Project 3",
    image: "",
    paragraph:
      "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
  },
  {
    name: "Project 4",
    image: "",
    paragraph:
      "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
  },
];

export default function ProjectLanding() {
  const [index, setIndex] = useState(0);

  const goPrev = () => {
    setIndex((current) => (current - 1 + cards.length) % cards.length);
  };

  const goNext = () => {
    setIndex((current) => (current + 1) % cards.length);
  };

  const card = cards[index];

  return (
    <div className="project-landing">
    <div
     style={{ backgroundImage: `url(${bg3})` }}
     className="texture"
    ></div>
    <div className="project-landing-heading" >
      <h1>PROJECTS</h1>
    </div>
    <div className="project-carousel">
      <div className="project-carousel-card">
        <div className="project-carousel-image">
          { <img src={card.image} alt={card.name} /> }

          <button
            type="button"
            className="project-carousel-nav project-carousel-nav-left"
            onClick={goPrev}
          >
            ‹
          </button>

          <button
            type="button"
            className="project-carousel-nav project-carousel-nav-right"
            onClick={goNext}
          >
            ›
          </button>
        </div>

        <div className="project-carousel-content">
          <h3 className="project-carousel-name">{card.name}</h3>
          <p className="project-carousel-paragraph">{card.paragraph}</p>
        </div>
      </div>
    </div>
   </div>
  );
}
