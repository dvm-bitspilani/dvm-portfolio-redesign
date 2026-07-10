import styles from "./LegacyCard.module.css";
import praneel from "../assests/Legacy/praneel.png";

const LegacyCard = ({ onClose }) => {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h1 className={styles.name}>Praneel Maddula</h1>
        <div className={styles.links}>
          <a href="#" aria-label="LinkedIn" className={styles.iconLink}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.22 8.24h4.56V23H.22V8.24zM8.98 8.24h4.37v2.02h.06c.61-1.15 2.1-2.37 4.33-2.37 4.63 0 5.49 3.05 5.49 7.02V23h-4.56v-6.82c0-1.63-.03-3.72-2.27-3.72-2.27 0-2.62 1.77-2.62 3.6V23H8.98V8.24z"/>
            </svg>
          </a>
          <a href="#" aria-label="Email" className={styles.iconLink}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M2 4h20a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm0 2v.01L12 13 22 6.01V6H2zm0 2.24V18h20V8.24l-10 6.51-10-6.51z"/>
            </svg>
          </a>
          {onClose && (
            <button
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Close"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className={styles.headerDivider} />

      <div className={styles.body}>
        <div className={styles.imageContainer}>
          <img src={praneel} alt="Profile" />
        </div>
        <div className={styles.description}>
          <h2 className={styles.role}>GOOGLE SDE 2</h2>
          <h3 className={styles.prevRole}>Was &nbsp; UI/UX Designer</h3>
          <p className={styles.quote}>
            "lorem ipsum dolor sit amet lorem ipsum dolor sit amet lorem ipsum
            dolor sit amet lorem ipsum dolor sit amet lorem ipsum dolor sit
            amet lorem ipsum dolor sit amet lorem ipsum dolor sit amet lorem
            ipsum dolor"
          </p>
        </div>
      </div>

      <div className={styles.footerDivider}>
        <span className={styles.footerDot} />
      </div>
    </div>
  );
};

export default LegacyCard;