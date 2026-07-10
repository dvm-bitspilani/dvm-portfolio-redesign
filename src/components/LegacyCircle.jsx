import styles from "./LegacyCircle.module.css";
import { useState, useRef } from "react";
import LegacyCard from "./LegacyCard";
const LegacyCircle = (img) => {
  const [clicked, setIsClicked] = useState(false);

  const clickHandler = () => {
    setIsClicked((prev) => !prev);
  };
  return (
    <>
      <div className={styles.circle} onClick={clickHandler}>
        <img src={img.img} alt="Google" className={styles.img} />
      </div>

      {clicked && <div className={styles.overlay}><LegacyCard /></div>}
    </>
  );
};

export default LegacyCircle;
