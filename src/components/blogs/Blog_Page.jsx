import styles from "./Blog_Page.module.css";
import blog from "../../assests/blog.png";
import blog_out from "../../assests/blog_out.png";
import Card from "./BlogCard";
import { useState, useEffect, useRef } from "react";
import bg3 from "../../assests/bg_3.png";
import logo from "../../assests/logo.png";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Link } from "react-router-dom";
import ham from "../../assests/hamBtn.png";
gsap.registerPlugin(ScrollTrigger);

const BlogPage = () => {
  const [clickedCard, setClickedCard] = useState(null);
  const containerRef = useRef(null);
  const dvmRef = useRef(null);
  const textureRef = useRef(null);
  const textureRef2 = useRef(null);
  const blogRef = useRef(null);
  const gradientRef = useRef(null);
  const gradientPos = useRef({ x: 0, y: 0 });
  const gradientPos2 = useRef({ x: 0, y: 0 });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    document.documentElement.scrollTo({ top: 0, behavior: "smooth" });
    document.body.scrollTo({ top: 0, behavior: "smooth" });
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [clickedCard]);

  // Texture 1 (existing, top-right area)
  useEffect(() => {
    const updateMask = () => {
      if (!textureRef.current) return;
      const { x, y } = gradientPos.current;
      const centerX = x + window.innerWidth * 1;
      const centerY = y + window.innerHeight * 0.2;
      const mask = `radial-gradient(circle 30vw at ${centerX}px ${centerY}px, black 0%, transparent 100%)`;
      textureRef.current.style.webkitMaskImage = mask;
      textureRef.current.style.maskImage = mask;
    };

    updateMask();

    const ctx = gsap.context(() => {
      gsap.to(gradientPos.current, {
        x: -window.innerWidth * 1,
        y: window.innerHeight * 2,
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 10%",
          end: "bottom -100%",
          scrub: 1,
        },
        onUpdate: updateMask,
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  // Texture 2 (new, separate — middle of page, left side)
  useEffect(() => {
    const updateMask2 = () => {
      if (!textureRef2.current) return;
      const { x, y } = gradientPos2.current;
      const centerX = x + window.innerWidth * 0.15;
      const centerY = y + window.innerHeight * 1;
      const mask = `radial-gradient(circle 25vw at ${centerX}px ${centerY}px, black 0%, transparent 100%)`;
      textureRef2.current.style.webkitMaskImage = mask;
      textureRef2.current.style.maskImage = mask;
    };

    updateMask2();

    const ctx2 = gsap.context(() => {
      gsap.to(gradientPos2.current, {
        x: window.innerWidth * 1,
        y: window.innerHeight * 1,
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 10%",
          end: "bottom -100%",
          scrub: 1,
        },
        onUpdate: updateMask2,
      });
    }, containerRef);

    return () => ctx2.revert();
  }, []);

  useEffect(() => {
    gsap.to(blogRef.current, {
      scale: 0.3,
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 10%",
        end: "bottom -100%",
        scrub: 1,
      },
    });
  }, []);
  console.log(window.innerWidth, window.innerHeight);
  return (

    <>
    
      <div className={styles.navbar}>
        <Link to="/" className={styles.back}>
          Back To Portfolio
        </Link>
        <img src={logo} alt="logo" className={styles.logo} />
        <img src={ham} alt="logo" className={styles.ham_nav} />
      </div>
      <div className={styles.container} ref={containerRef}>
        <div className={styles.grid}></div>
        <div
          style={{ backgroundImage: `url(${bg3})` }}
          ref={textureRef}
          className={styles.texture}
        ></div>
        <div
          style={{ backgroundImage: `url(${bg3})` }}
          ref={textureRef2}
          className={styles.texture2}
        ></div>
        <div className={styles.blogImageGroup}>
          <img src={blog_out} alt="Blog Outx" className={styles.blogOutImage} />
          <img
            src={blog}
            alt="Blog"
            ref={blogRef}
            className={styles.blogImage}
          />
        </div>

        <div className={styles.blogs}>
          <Card
            clickedCard={clickedCard}
            setClickedCard={setClickedCard}
            landingPage={false}
          />
        </div>
      </div>
      <div className={styles.container2}>
        <div ref={dvmRef} className={styles.text}>
          <div>DEPARTMENT OF</div>
          <div className={styles.visualMedia}>VISUAL MEDIA</div>
        </div>

        <button className={styles.projects}>Made with ❤️ by DVM</button>
        <div ref={gradientRef} className={styles.gradient}></div>
      </div>
    </>
  );
};

export default BlogPage;
