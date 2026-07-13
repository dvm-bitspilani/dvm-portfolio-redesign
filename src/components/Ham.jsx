import styles from "./Ham.module.css";
import d from "../assests/ham/D.svg";
import m from "../assests/ham/M.svg";
import arrow from "../assests/legacy/arrow.png";
import { Link } from "react-router-dom";
const Ham = ({ onClose }) => {
  return (
    <div className={styles.body}>
      <img
        src={d}
        className={`${styles.d} ${styles.enterTop}`}
        style={{ animationDelay: "0.1s" }}
        alt="D"
      />
      <img
        src={m}
        className={`${styles.m} ${styles.enterTop}`}
        style={{ animationDelay: "0.2s" }}
        alt="M"
      />
      <Link to="/">
        <img
          src={arrow}
          className={`${styles.arrow} ${styles.enterFade}`}
          style={{ animationDelay: "0.6s" }}
          alt="Arrow"
        />
      </Link>

      <div className={styles.logoWrapper}>
        <svg width="0" height="0" style={{ position: "absolute" }}>
          <defs>
            <linearGradient
              id="hamHoverGradient"
              x1="45%"
              y1="0%"
              x2="55%"
              y2="100%"
            >
              <stop
                offset="7.83%"
                stopColor="rgb(112,112,112)"
                stopOpacity="1"
              />
              <stop offset="100%" stopColor="rgb(67,67,67)" stopOpacity="1" />
            </linearGradient>
            <linearGradient
              id="lineHoverGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="rgba(255,255,255,0)" />
              <stop offset="50%" stopColor="rgba(255,255,255,0.9)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
          </defs>
        </svg>

        <Link to="/blog">
          <svg
            viewBox="0 0 43 205"
            className={`${styles.segmentSvg} ${styles.blog} ${styles.segmentEnter}`}
            style={{ animationDelay: "0.15s" }}
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              className={styles.segment}
              d="M41.8755 30.9828L0.5 0.980469V204.011L41.8755 185.519V30.9828Z"
              stroke="black"
            />
            <path
              className={styles.segmentFill}
              d="M41.8755 30.9828L0.5 0.980469V204.011L41.8755 185.519V30.9828Z"
            />
          </svg>
        </Link>
        <Link to="/#about">
          <svg
            viewBox="0 0 166 142"
            className={`${styles.segmentSvg} ${styles.about} ${styles.segmentEnter}`}
            style={{ animationDelay: "0.25s" }}
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              className={styles.segment}
              d="M0.5 99.7651V140.873L164.4 13.2025L129.451 0.5625L0.5 99.7651Z"
              stroke="black"
            />
            <path
              className={styles.segmentFill}
              d="M0.5 99.7651V140.873L164.4 13.2025L129.451 0.5625L0.5 99.7651Z"
            />
          </svg>
        </Link>

        <Link to="/projects">
          <svg
            viewBox="0 0 45 286"
            className={`${styles.segmentSvg} ${styles.projects} ${styles.segmentEnter}`}
            style={{ animationDelay: "0.35s" }}
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              className={styles.segment}
              d="M43.5591 0.982422L0.5 32.3572L0.501079 268.587L43.5591 284.348V0.982422Z"
              stroke="black"
            />
            <path
              className={styles.segmentFill}
              d="M43.5591 0.982422L0.5 32.3572L0.501079 268.587L43.5591 284.348V0.982422Z"
            />
          </svg>
        </Link>

        <Link to="/#legacy">
          <svg
            viewBox="0 0 222 98"
            className={`${styles.segmentSvg} ${styles.legacy} ${styles.segmentEnter}`}
            style={{ animationDelay: "0.05s" }}
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              className={styles.segment}
              d="M34.5195 0.604782L0.996094 15.8899L115.481 97.077L220.844 15.8867L192.547 0.59375L115.481 59.1442L34.5195 0.604782Z"
              stroke="black"
            />
            <path
              className={styles.segmentFill}
              d="M34.5195 0.604782L0.996094 15.8899L115.481 97.077L220.844 15.8867L192.547 0.59375L115.481 59.1442L34.5195 0.604782Z"
            />
          </svg>
        </Link>

        <Link to="/">
          <svg
            viewBox="0 0 143 154"
            className={`${styles.segmentSvg} ${styles.contact} ${styles.segmentEnter}`}
            style={{ animationDelay: "0.45s" }}
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              className={styles.segment}
              d="M0.5 51.1657V0.972656L141.862 102.288L141.286 152.689L0.5 51.1657Z"
              stroke="black"
            />
            <path
              className={styles.segmentFill}
              d="M0.5 51.1657V0.972656L141.862 102.288L141.286 152.689L0.5 51.1657Z"
            />
          </svg>
        </Link>

        <Link to="/">
          <svg
            viewBox="0 0 164 121"
            className={`${styles.segmentSvg} ${styles.team} ${styles.segmentEnter}`}
            style={{ animationDelay: "0.2s" }}
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              className={styles.segment}
              d="M0.5 77.2672V42.7672L57.5312 82.9551L162.881 0.392578L134.565 59.8255L57.5273 120.103L0.5 77.2672Z"
              stroke="black"
            />
            <path
              className={styles.segmentFill}
              d="M0.5 77.2672V42.7672L57.5312 82.9551L162.881 0.392578L134.565 59.8255L57.5273 120.103L0.5 77.2672Z"
            />
          </svg>
        </Link>
        <Link to="/">
          <svg
            viewBox="0 0 30 166"
            className={`${styles.segmentSvg} ${styles.artwork} ${styles.segmentEnter}`}
            style={{ animationDelay: "0.3s" }}
            xmlns="http://www.w3.org/2000/svg"
          >
          <path
            className={styles.segment}
            d="M0.5 149.636L28.8066 164.933L28.7969 0.214844L0.5 59.7148V149.636Z"
            stroke="black"
          />
          <path
            className={styles.segmentFill}
            d="M0.5 149.636L28.8066 164.933L28.7969 0.214844L0.5 59.7148V149.636Z"
          />
        </svg>
        </Link>
      </div>

      <div className={styles.labels}>
        <div
          className={`${styles.label} ${styles.left} ${styles.legacyPos} ${styles.labelEnterLeft}`}
          style={{ animationDelay: "0.5s" }}
        >
          <span className={styles.text}>OUR LEGACY</span>
          <span className={styles.dot} />
          <span className={styles.line} />
        </div>

        <div
          className={`${styles.label} ${styles.left} ${styles.artworkPos} ${styles.labelEnterLeft}`}
          style={{ animationDelay: "0.55s" }}
        >
          <span className={styles.line} />
          <span className={styles.dot} />
          <span className={styles.text}>ARTWORK</span>
        </div>

        <div
          className={`${styles.label} ${styles.left} ${styles.blogsPos} ${styles.labelEnterLeft}`}
          style={{ animationDelay: "0.6s" }}
        >
          <span className={styles.text}>BLOGS</span>
          <span className={styles.dot} />
          <span className={styles.line} />
        </div>

        <div
          className={`${styles.label} ${styles.left} ${styles.contactPos} ${styles.labelEnterLeft}`}
          style={{ animationDelay: "0.65s" }}
        >
          <span className={styles.text}>CONTACT US</span>
          <span className={styles.dot} />
          <span className={styles.line} />
        </div>

        <div
          className={`${styles.label} ${styles.right} ${styles.teamPos} ${styles.labelEnterRight}`}
          style={{ animationDelay: "0.5s" }}
        >
          <span className={styles.dot} />
          <span className={styles.line} />
          <span className={styles.text}>TEAM</span>
        </div>

        <div
          className={`${styles.label} ${styles.right} ${styles.projectsPos} ${styles.labelEnterRight}`}
          style={{ animationDelay: "0.55s" }}
        >
          <span className={styles.text}>PROJECTS</span>
          <span className={styles.dot} />
          <span className={styles.line} />
        </div>

        <div
          className={`${styles.label} ${styles.right} ${styles.aboutPos} ${styles.labelEnterRight}`}
          style={{ animationDelay: "0.6s" }}
        >
          <span className={styles.text}>ABOUT US</span>
          <span className={styles.dot} />
          <span className={styles.line} />
        </div>
      </div>
    </div>
  );
};

export default Ham;
