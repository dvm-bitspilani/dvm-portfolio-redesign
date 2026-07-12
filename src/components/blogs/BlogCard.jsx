import styles from "./BlogCard.module.css";
import data from "./BlogData";
import { Link } from "react-router-dom";
const BlogCard = ({ limit , clickedCard, setClickedCard , landingPage }) => {
  const handleClick = (id) => {
    setClickedCard((prev) => (prev === id ? null : id));
  };
  if(landingPage === null) landingPage = true;
  return (
    <>

      {data.slice(0, limit).map((item) => (

        <div
          key={item.id}
          className={`${styles.card} ${
            clickedCard === item.id ? styles.clicked : ""
          }`}
          onClick={() => handleClick(item.id)}
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
              <div >
                {landingPage ? <Link to="/blog" className={styles.readMore}>READ AHEAD</Link> : <a href={item.link} className={styles.readMore}>FULL BLOG</a>}
              </div>
            )}
          </div>
        </div>
      ))}
    </>
  );
};

export default BlogCard;
