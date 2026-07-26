import { useEffect, useState } from "react";
import styles from "./Preloader.module.css";
import logo from "../assests/Vector.svg"
import logo1 from "../assests/Vector1.svg"
export default function Preloader({ onFinish }) {
  const [exit, setExit] = useState(false);

  useEffect(() => {
    let settled = false;

    const finishLoading = () => {
      if (settled) return;
      settled = true;
      setTimeout(() => {
        setExit(true);
      }, 2500);
    };

    if (document.readyState === "complete") {
      finishLoading();
    } else {
      window.addEventListener("load", finishLoading, { once: true });
    }

    // Hard safety net: guarantees the loader can never hang
    // indefinitely even if `load` somehow never fires.
    const safetyTimer = setTimeout(finishLoading, 4000);

    return () => {
      clearTimeout(safetyTimer);
      window.removeEventListener("load", finishLoading);
    };
  }, []);

  useEffect(() => {
    if (!exit) return;

    const timer = setTimeout(() => {
      onFinish();
    }, 1000);

    return () => clearTimeout(timer);
  }, [exit]);

  return (
    <div className={`${styles.loader} ${exit ? styles.exit : ""}`}>
      <div className={styles.logo}>
        <img src={logo} alt="logo" className={styles.vector} />
        <img src={logo1} alt="logo1" className={styles.vector1} />
      </div>


    </div>
  );
}