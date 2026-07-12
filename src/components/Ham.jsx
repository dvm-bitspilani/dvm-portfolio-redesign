import styles from "./Ham.module.css";
import logo from "../assests/logo.png";
import{Link} from "react-router-dom";



const Ham = ({ onClose }) => {
  return (
    <div className={styles.body}>
      
      {/* Close Button */}
      <button className={styles.closeBtn} onClick={onClose}>
        ✕
      </button>

      <div className={styles.heading}>DVM</div>

      <div className={styles.dep}>DEPARTMENT OF</div>

      <div className={styles.vm}>VISUAL MEDIA</div>

      <div className={styles.text_sub}>
        <div>DESIGN.</div>
        <div>EDIT.</div>
        <div>CODE.</div>
      </div>
     

      <div className={styles.container}>
        <div className={styles.aboutUsText}>ABOUT US</div>
        <Link to="/contactus">
        <div className={styles.contactUsText}>CONTACT US</div>
        </Link>
       <Link to="/projects">
          <div className={styles.projects}>PROJECTS</div>
        </Link>
        <div className={styles.team}>TEAM</div>

        {/* Outer Ring */}
        <svg className={styles.outerSvg} viewBox="0 0 300 300">
          <circle
            className={styles.outerStroke}
            cx="150"
            cy="150"
            r="120"
          />
        </svg>

        {/* Inner Ring */}
        <div className={styles.inner_circle}>
          <img src={logo} alt="DVM Logo" className={styles.logo} />
        </div>
      </div>

    </div>
  );
};

export default Ham;