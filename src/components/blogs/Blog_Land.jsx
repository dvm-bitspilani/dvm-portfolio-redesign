import styles from "./Blog.module.css";
import blog from "../../assests/blog.png";
import arrow from "../../assests/arrow.png";
import Card from "./BlogCard";

import bg3 from "../../assests/bg_3.png";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef, useEffect, useState } from "react";

gsap.registerPlugin(ScrollTrigger);

const Blog = () => {
  const textureRef = useRef(null);
  const gradientRef = useRef(null);
  const containerRef = useRef(null);
  const logoRef = useRef(null);

  const gradientPos = useRef({ x: 0, y: 0 });

  const [clickedCard, setClickedCard] = useState(null);

  useEffect(() => {
    const updateMask = () => {
      if (!textureRef.current) return;

      const { x, y } = gradientPos.current;
      const centerX = x + window.innerWidth * 0.6;
      const centerY = y + window.innerHeight * 0.2;

      const mask = `radial-gradient(circle 40vw at ${centerX}px ${centerY}px, black 0%, transparent 100%)`;

      textureRef.current.style.webkitMaskImage = mask;
      textureRef.current.style.maskImage = mask;
    };

    updateMask();

    const ctx = gsap.context(() => {
      gsap.to(gradientPos.current, {
        x: -window.innerWidth * 1.5,
        y: window.innerHeight,
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 10%",
          end: "bottom -100%",
          scrub: 1,
        },
        onUpdate: updateMask,
      });

      gsap.to(gradientRef.current, {
        x: -window.innerWidth * 1.5,
        y: window.innerHeight,
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 10%",
          end: "bottom -100%",
          scrub: 1,
        },
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className={styles.container}>
      <div className={styles.grid}></div>
      <div
        style={{ backgroundImage: `url(${bg3})` }}
        ref={textureRef}
        className={styles.texture}
      ></div>
      <img src={blog} alt="Blog" className={styles.image} />

      <div className={styles.text}>
        <div>DEPARTMENT OF</div>
        <div className={styles.visualMedia}>VISUAL MEDIA</div>
      </div>
      <button className={styles.button}>
        <span>See All Posts</span>
        <img src={arrow} alt="Arrow" className={styles.arrow} />
      </button>
      <button className={styles.projects}>PROJECTS</button>
      <div className={clickedCard ? styles.blogs : styles.blogsShifted} >

        <Card clickedCard={clickedCard}  setClickedCard={setClickedCard} />
      </div>
      <div ref={gradientRef} className={styles.gradient}></div>
    </div>
  );
};

export default Blog;