import styles from "./Ham.module.css";
import projects from "../assests/ham/projects.svg"
import about from "../assests/ham/about.svg"
const Ham = ({ onClose }) => {
  return (
    <div className={styles.body}>
      <div className={styles.container_ham}>
          <img src={projects} alt="projects" className={styles.projects} />
          <img src={about} alt="about" className={styles.projects} />
      </div>
    </div>
  );
};

export default Ham;