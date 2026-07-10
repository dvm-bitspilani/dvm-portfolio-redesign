import styles from "./LegacyCircle.module.css";

const LegacyCircle = (img) => {
  return (
    <div className={styles.circle}>
      <img src={img.img} alt="Google" className={styles.img} />
    </div>
  );
};

export default LegacyCircle;