import styles from "./Blog_Page.module.css";
import blog from "../../assests/BLOG.png";
import Card from "./Blog_grid";
import { useState } from "react";

const BlogPage = () => {
  const [clickedCard, setClickedCard] = useState(null);

  return (
    <div className={styles.container}>
      <img src={blog} alt="Blog" className={styles.image} />

      <div className={styles.text}>
        <div>DEPARTMENT OF</div>
        <div className={styles.visualMedia}>VISUAL MEDIA</div>
      </div>

      <div className={clickedCard ? styles.blogs : styles.blogsShifted}>
        <Card clickedCard={clickedCard} setClickedCard={setClickedCard} />
      </div>
    </div>
  );
};

export default BlogPage;