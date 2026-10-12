import { useEffect, useState } from "react";
import { ArchiveWall } from "../../../immersive/kit/archive";
import Navbar from "../components/Navbar";
import Ham from "../components/Ham";
import styles from "./ArchivePage.module.css";

/**
 * /archive — every DVM record on one infinite pan/zoom wall. Owns the
 * viewport while mounted; the base Navbar + hamburger float above it.
 * Filters and the open item live in the URL (?f=art&item=…).
 */
export default function ArchivePage() {
  const [isHamOpen, setIsHamOpen] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prev = [html.style.overflow, body.style.overflow];
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      [html.style.overflow, body.style.overflow] = prev;
    };
  }, []);

  return (
    <div className={styles.page}>
      <h1 className={styles.srOnly}>DVM archive</h1>
      <div className={styles.wall}>
        <ArchiveWall insetTop={88} routing />
      </div>
      <Navbar onHamClick={() => setIsHamOpen(true)} />
      {isHamOpen && <Ham onClose={() => setIsHamOpen(false)} />}
    </div>
  );
}
