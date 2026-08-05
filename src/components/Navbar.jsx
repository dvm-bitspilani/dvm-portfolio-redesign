import styles from "./Navbar.module.css";
import ham from "../assests/hamBtn.png";
import { useRef, useEffect } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { gsap } from "gsap";
import { Link } from "react-router-dom";

const Navbar = ({ onHamClick }) => {





  return (
    <div className={styles.container}>
      <Link
        to="/"
        className={styles.heading}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        DVM
      </Link>

      <div
        className={styles.ham}
        onClick={onHamClick}
        role="button"
        aria-label="Open menu"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onHamClick();
          }
        }}
      >
        <img src={ham} alt="Menu" className={styles.hamIcon} />
      </div>
    </div>
  );
};

export default Navbar;
