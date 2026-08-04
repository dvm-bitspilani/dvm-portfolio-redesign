import { useEffect, useState } from "react";
import styles from "./Preloader.module.css";
import logo from "../assests/Vector.svg";
import logo1 from "../assests/Vector1.svg";

export default function Preloader({ onFinish, waitForLoad = false, minDuration = 900 }) {
  const [exit, setExit] = useState(false);

  useEffect(() => {
    let settled = false;

    const finishLoading = () => {
      if (settled) return;
      settled = true;
      setTimeout(() => {
        setExit(true);
      }, waitForLoad ? 2500 : minDuration);
    };

    if (!waitForLoad) {
      // Route-change mode: don't wait on document `load`, just show
      // briefly for a consistent transition feel.
      finishLoading();
      return;
    }

    if (document.readyState === "complete") {
      finishLoading();
    } else {
      window.addEventListener("load", finishLoading, { once: true });
    }

    const safetyTimer = setTimeout(finishLoading, 4000);

    return () => {
      clearTimeout(safetyTimer);
      window.removeEventListener("load", finishLoading);
    };
  }, [waitForLoad, minDuration]);

  useEffect(() => {
    if (!exit) return;
    const timer = setTimeout(() => {
      onFinish();
    }, 1000);
    return () => clearTimeout(timer);
  }, [exit, onFinish]);

  return (
    <div className={`${styles.loader} ${exit ? styles.exit : ""}`}>
      <div className={styles.logo}>
        <img src={logo} alt="logo" className={styles.vector} />
        <img src={logo1} alt="logo1" className={styles.vector1} />
      </div>
    </div>
  );
}