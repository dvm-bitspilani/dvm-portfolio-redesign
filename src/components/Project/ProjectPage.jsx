import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Navbar from "../Navbar";
import projects from "./projectsData";
import "./ProjectPage.css";

export default function ProjectPage() {
  const { name } = useParams();
  const navigate = useNavigate();

  const index = projects.findIndex((p) => p.id === name);
  const project = index >= 0 ? projects[index] : null;

  const isVideo = project?.type === "video";

  const images = !project || isVideo
    ? []
    : Array.from(
        new Set(
          [project.heroImage, ...(project.gallery || []), project.mockup].filter(Boolean)
        )
      );

  const [activeImage, setActiveImage] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setActiveImage(0);
    setCopied(false);
  }, [name]);

  if (!project) {
    return (
      <div>
        <Navbar />
        <div className="proj-detail-page">
          <div className="proj-detail-page__not-found">
            <p>We couldn't find that project.</p>
            <Link to="/projects">Back to Projects</Link>
          </div>
        </div>
      </div>
    );
  }

  const goToOffset = (offset) => {
    const total = projects.length;
    const next = (index + offset + total) % total;
    navigate(`/projects/${projects[next].id}`);
  };

 

  return (
    <div>
      <Navbar />

      <div className="proj-detail-page">
        <Link to="/projects" className="proj-detail-page__back">
          ‹ Back to Projects
        </Link>

        <article className="proj-detail">
          <div className="proj-detail__stage">
           

            <div className="proj-detail__media">
              {isVideo ? (
                <div className="proj-detail__video">
                  <iframe
                    src={`https://www.youtube.com/embed/${project.youtubeId}`}
                    title={project.name}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <>
                  <img
                    src={images[activeImage]}
                    alt={project.name}
                    className="proj-detail__image"
                  />
                  {project.websiteLink && (
                    <a
                      className="proj-detail__cta"
                      href={project.websiteLink}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      Visit Site
                    </a>
                  )}
                </>
              )}
            </div>

            
          </div>

          {!isVideo && images.length > 1 && (
            <div className="proj-detail__thumbs">
              {images.map((src, i) => (
                <button
                  key={src + i}
                  type="button"
                  className={
                    "proj-detail__thumb" +
                    (i === activeImage ? " proj-detail__thumb--active" : "")
                  }
                  onClick={() => setActiveImage(i)}
                  aria-label={`Show image ${i + 1}`}
                >
                  <img src={src} alt="" />
                </button>
              ))}
            </div>
          )}

          <div className="proj-detail__body">
            <div className="proj-detail__heading">
              <h2 className="proj-detail__title">{project.name}</h2>
              <div className="proj-detail__tags">
                {project.categories.map((c) => (
                  <span key={c} className="proj-detail__tag">
                    {c}
                  </span>
                ))}
                {project.date && <span className="proj-detail__date">{project.date}</span>}
              </div>
            </div>

            {(project.text1 || project.text2) && (
              <div className="proj-detail__columns">
                {project.text1 && <p className="proj-detail__text">{project.text1}</p>}
                {project.text2 && <p className="proj-detail__text">{project.text2}</p>}
              </div>
            )}

            <div className="proj-detail__actions">
              {project.websiteLink && (
                <a
                  className="proj-detail__link-btn"
                  href={project.websiteLink}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {isVideo ? "Watch on YouTube ↗" : "Open Project ↗"}
                </a>
              )}
             
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}