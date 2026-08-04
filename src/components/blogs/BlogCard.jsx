import { useRef, useState } from "react";
import styles from "./BlogCard.module.css";
import data from "./BlogData";
import { Link } from "react-router-dom";

const MOBILE_BREAKPOINT = 768;

const BlogCard = ({ limit, clickedCard, setClickedCard, landingPage }) => {
  const cardRefs = useRef({});

  if (landingPage === null) landingPage = true;

  const isMobile = () =>
    typeof window !== "undefined" && window.innerWidth <= MOBILE_BREAKPOINT;

  const handleClick = (id) => {
    // Only animate height on phones/small screens. On desktop the
    // card size never changes, so skip all the manual height logic.
    if (!isMobile()) {
      setClickedCard((prev) => (prev === id ? null : id));
      return;
    }

    const node = cardRefs.current[id];

    if (node) {
      const startHeight = node.getBoundingClientRect().height;
      node.style.height = `${startHeight}px`;
      // eslint-disable-next-line no-unused-expressions
      node.offsetHeight;
    }

    setClickedCard((prev) => (prev === id ? null : id));

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = cardRefs.current[id];
        if (!el) return;
        el.style.height = `${el.scrollHeight}px`;
      });
    });
  };

  const handleTransitionEnd = (id) => {
    if (!isMobile()) return;
    const el = cardRefs.current[id];
    if (el && clickedCard === id) {
      el.style.height = "auto";
    }
  };

  return (
    <>
      {data.slice(0, limit).map((item) => (
        <div
          key={item.id}
          ref={(el) => (cardRefs.current[item.id] = el)}
          className={`${styles.card} ${
            clickedCard === item.id ? styles.clicked : ""
          }`}
          onClick={() => handleClick(item.id)}
          onTransitionEnd={() => handleTransitionEnd(item.id)}
        >
          <img className={styles.cardImage} src={item.image} alt={item.title} />
          <div className={styles.content}>
            <div className={styles.cardTitle}>{item.title}</div>
            {clickedCard === item.id && (
              <div className={styles.cardMeta}>
                <span className={styles.by}>by {item.author}</span>
                <br />
                <div>
                  <span>{item.date}</span>
                  <span className={styles.con}>{item.readTime} minute read</span>
                </div>
              </div>
            )}
            <div className={styles.cardDescription}>
              {clickedCard === item.id ? item.bigdescription : item.description}
            </div>
            {clickedCard === item.id && (
              <div>
                {landingPage ? (
                  <Link to="/blog" className={styles.readMore}>READ AHEAD</Link>
                ) : (
                  <a href={item.link} className={styles.readMore}>FULL BLOG</a>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </>
  );
};

export default BlogCard;