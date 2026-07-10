import styles from "./LegacyCard.module.css";
import praneel from "../assests/Legacy/praneel.png";
const LegacyCard = () => {
  return (
    <>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1>Praneel Maddula</h1>
          <div className={styles.links}>
            <a>LinkedIn</a>
            <a>GitHub</a>
          </div>
        </div>

        <div className={styles.body}>
          <div className={styles.imageContainer}>
            <img src={praneel} alt="Profile" />
          </div>
          <div className={styles.description}>
            <h1>GOOGLE SDE 2</h1>
            <h3>Was UI/UX Designer</h3>
            <p>
              “lorem ipsum dolor sit amet lorem ipsum dolor sit amet lorem ipsum
              dolor sit amet lorem ipsum dolor sit amet lorem ipsum dolor sit
              amet lorem ipsum dolor sit amet lorem ipsum dolor sit amet lorem
              ipsum dolor”
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default LegacyCard;
