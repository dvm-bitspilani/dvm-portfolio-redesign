import styles from "./Navbar.module.css";
import ham from "../assests/ham.png"
import { useRef, useEffect } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { gsap } from "gsap";
import { Link } from "react-router-dom";
const Navbar = ({ onHamClick }) => {
  const logo = useRef(null);
  const hamRef = useRef(null);
  useEffect(() => {
    gsap.from(logo.current, {
      scrollTrigger: {
        trigger: logo.current,
        start: "top top",
        end: "bottom top",
        scrub: true,
      },
      y: -50,
      opacity: 0,
    });
  }, []);
  useEffect(() => {
    gsap.from(hamRef.current, {
      scrollTrigger: {
        trigger: ham.current,
        start: "top top",
        end: "bottom top",
        scrub: true,
      },
      y: -20,
      opacity: 0,
    });
  }, []);
  

  return (
    <div className={styles.container}>
      <div className={styles.heading} ref={logo}>
        DVM
      </div>

      <div className={styles.ham} onClick={onHamClick}>
        <Link to="/ham">
          <img ref={hamRef} src={ham} alt="ham" />
        </Link>
      </div>
    </div>
  );
};

export default Navbar;
