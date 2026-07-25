import styles from "./Blog.module.css";
import blogImg from "../assests/blog.png";
import blogOutImg from "../assests/blog_out.png";
import arrow from "../assests/arrow.png";
import Card from "./blogs/BlogCard";
import { Link } from "react-router-dom";
import bg3 from "../assests/bg_3.png";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef, useEffect, useState, use } from "react";

gsap.registerPlugin(ScrollTrigger);

const Blog = () => {
  const textureRef = useRef(null);
  const gradientRef = useRef(null);
  const containerRef = useRef(null);
  const logoRef = useRef(null);
  const blog_out = useRef(null);
  const blog = useRef(null);
  const dvmRef = useRef(null);
  const projectRef = useRef(null);
  const gradientPos = useRef({ x: 0, y: 0 });
  const blogsRef = useRef(null);
  const [clickedCard, setClickedCard] = useState(null);

  useEffect(() => {
    const updateMask = () => {
      if (!textureRef.current) return;

      const { x, y } = gradientPos.current;
      const centerX = x + window.innerWidth * 0.4;
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

  useEffect(() => {
    gsap.from(blog.current, {
      y: 100,
      x: -20,
      opacity: 0,
      duration: 1,
      scrollTrigger: {
        start: "top 85%",
        trigger: blog.current,
      },
    });
  }, []);
  useEffect(() => {
    gsap.from(blog_out.current, {
      y: -100,
      x: 20,
      opacity: 0,
      duration: 1,
      scrollTrigger: {
        start: "top 85%",
        trigger: blog.current,
      },
    });
  }, []);
  useEffect(() => {
    gsap.from(dvmRef.current.children, {
      x: -100,
      opacity: 0,
      duration: 1,
      stagger: 0.4,

      scrollTrigger: {
        trigger: blog.current,
        start: "top 40%",
        end: "top 20%",
      },
    });
  }, []);
  useEffect(() => {
    gsap.from(projectRef.current, {
      x: 100,
      opacity: 0,
      duration: 1,
      stagger: 0.4,

      scrollTrigger: {
        trigger: blog.current,
        start: "top 20%",
        end: "top",
      },
    });
  }, []);
  useEffect(() => {
    const cards = blogsRef.current.children;

    const animations = [
      {
        x: -window.innerWidth * 0.2,
        y: window.innerHeight * 0.2,
        rotate: -20,
      },
      {
        y: window.innerHeight * 0.25,
        scale: 0.7,
        rotate: 0,
      },
      {
        x: window.innerWidth * 0.2,
        y: window.innerHeight * 0.2,
        rotate: 20,
      },
    ];

    [...cards].forEach((card, i) => {
      gsap.from(card, {
        ...animations[i],
        opacity: 0,
        duration: 1.2,

        scrollTrigger: {
          trigger: blogsRef.current,
          start: "top 75%",
          end: "top 30%",
          scrub: 1,
        },
      });
    });
  }, []);

  return (
    <div ref={containerRef} className={styles.container}>
      <div className={styles.grid}></div>
      <div
        style={{ backgroundImage: `url(${bg3})` }}
        ref={textureRef}
        className={styles.texture}
      ></div>
      <img ref={blog} src={blogImg} alt="Blog" className={styles.image} />
      <img
        ref={blog_out}
        src={blogOutImg}
        alt="Blog"
        className={styles.image1}
      />

      <div
        ref={blogsRef}
        className={clickedCard ? styles.blogs : styles.blogsShifted}
      >
        <Card
          limit={3}
          clickedCard={clickedCard}
          setClickedCard={setClickedCard}
        />
      </div>

      <Link
        to="/blog"
        className={styles.button}
        state={{ selectedCard: clickedCard }}
      >
        <span>See All Posts</span>
        <img src={arrow} alt="Arrow" className={styles.arrow} />
      </Link>

      <div className={styles.footer}>
        <div ref={dvmRef} className={styles.text}>
          <div>DEPARTMENT OF</div>
          <div className={styles.visualMedia}>VISUAL MEDIA</div>
        </div>

        <button ref={projectRef} className={styles.projects}>
          PROJECTS
        </button>
      </div>

      <div ref={gradientRef} className={styles.gradient}></div>
    </div>
  );
};

export default Blog;
