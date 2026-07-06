import styles from "./Navbar.module.css";
import ham from "../assests/ham.png"
import { useRef, useEffect } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { gsap } from "gsap";
const Navbar = ({ onHamClick }) => {
  const logo = useRef(null);
  const ham = useRef(null);
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
    gsap.from(ham.current, {
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
        <img ref={ham} src={ham} alt="ham" />
      </div>
    </div>
  );
};

export default Navbar;
