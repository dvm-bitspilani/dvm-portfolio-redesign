import { useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import styles from "../../../components/Navbar.module.css";
import ham from "../../../assests/hamBtn.png";
import V3Ham from "./V3Ham";

/** The redesign's navbar (DVM wordmark + hamburger), owning its own menu. */
export default function V3Nav({ onBrandClick }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className={styles.container}>
        <Link
          to="/"
          className={styles.heading}
          onClick={() => {
            onBrandClick?.();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          DVM
        </Link>
        <HamButton onClick={() => setOpen(true)} />
      </div>
      {open && createPortal(<V3Ham onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}

export function HamButton({ onClick }) {
  return (
    <div
      className={styles.ham}
      onClick={onClick}
      role="button"
      aria-label="Open menu"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <img src={ham} alt="" className={styles.hamIcon} />
    </div>
  );
}

/** Only the menu, for pages that bring their own hamburger button (blog). */
export function useV3Menu() {
  const [open, setOpen] = useState(false);
  const menu = open ? createPortal(<V3Ham onClose={() => setOpen(false)} />, document.body) : null;
  return [menu, () => setOpen(true)];
}
