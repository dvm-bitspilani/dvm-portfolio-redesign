import { useRef, useState } from "react";
import styles from "./BlogCard.module.css";
import data from "./BlogData";
import { Link } from "react-router-dom";

const BlogCard = ({ limit, clickedCard, setClickedCard, landingPage }) => {
  const cardRefs = useRef({});

  if (landingPage === null) landingPage = true;

  const handleClick = (id) => {
    const node = cardRefs.current[id];

    if (node) {
      // 1. Lock in the height the card has RIGHT NOW as a fixed px
      //    value. This gives the browser a real starting point to
      //    transition from — "auto" has no defined starting value,
      //    which is what caused the snap/jump.
      const startHeight = node.getBoundingClientRect().height;
      node.style.height = `${startHeight}px`;
      // Force a reflow so that height is committed before the class
      // (and therefore layout) changes below.
      // eslint-disable-next-line no-unused-expressions
      node.offsetHeight;
    }

    setClickedCard((prev) => (prev === id ? null : id));

    // 2. Wait two frames for React to re-render with the new class
    //    (open or closed) and for the browser to lay it out, THEN
    //    read its natural final height and transition to that exact
    //    px value.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = cardRefs.current[id];
        if (!el) return;
        el.style.height = `${el.scrollHeight}px`;
      });
    });
  };

  const handleTransitionEnd = (id) => {
    // 3. Once the animation finishes, release the fixed px height
    //    back to "auto" so the card still adapts correctly if the
    //    window is resized afterward.
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