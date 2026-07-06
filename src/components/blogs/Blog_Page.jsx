import styles from "./Blog_Page.module.css";
import blog from "../../assests/blog.png";
import blog_out from "../../assests/blog_out.png";
import Card from "./BlogCard";
import { useState, useEffect, useRef } from "react";

const BlogPage = () => {
  const [clickedCard, setClickedCard] = useState(null);
  const containerRef = useRef(null);
  const dvmRef = useRef(null);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    document.documentElement.scrollTo({ top: 0, behavior: "smooth" });
    document.body.scrollTo({ top: 0, behavior: "smooth" });
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [clickedCard]);

  return (
    <>
    <div className={styles.container} ref={containerRef}>
      <img src={blog} alt="Blog" className={styles.blogImage} />
      <img src={blog_out} alt="Blog Out" className={styles.blogOutImage} />

      <div className={styles.blogs}>
        <Card clickedCard={clickedCard} setClickedCard={setClickedCard} />
      </div>

    </div>
    <div className={styles.container2}>
        <div ref={dvmRef} className={styles.text}>
            <div>DEPARTMENT OF</div>
            <div className={styles.visualMedia}>VISUAL MEDIA</div>
      </div>

  

      <button className={styles.projects}>
        Made with ❤️ by DVM
      </button>
    </div>
  </>
  );
};

export default BlogPage;