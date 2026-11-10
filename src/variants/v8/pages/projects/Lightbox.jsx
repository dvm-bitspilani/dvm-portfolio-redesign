// The full-page screenshot, full screen: one native <dialog> (focus trap, Esc, focus back to the
// opener for free), its image swapped. A click anywhere but the image closes it. The page under
// it does not scroll while it is open.
import { useEffect, useRef } from "react";
import ui from "../../ui.module.css";
import p from "../projects.module.css";

export default function Lightbox({ shot, title, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (shot && !d.open) {
      d.showModal();
      document.documentElement.style.overflow = "hidden";
    } else if (!shot && d.open) d.close();
  }, [shot]);

  // leaving the page with it open
  useEffect(() => () => void (document.documentElement.style.overflow = ""), []);

  const closed = () => {
    document.documentElement.style.overflow = "";
    onClose();
  };

  return (
    <dialog
      ref={ref}
      className={p.lb}
      aria-label={title}
      onClose={closed}
      onClick={(ev) => {
        if (ev.target.tagName !== "IMG" && ev.target.tagName !== "BUTTON") ref.current?.close();
      }}
    >
      {shot && (
        <>
          <button type="button" className={`${ui.btn} ${p.lbClose}`} autoFocus onClick={() => ref.current?.close()}>
            Close
          </button>
          <div className={p.lbScroll}>
            <img
              src={shot.src}
              alt={`${title}, ${shot.kind === "phone" ? "phone" : "desktop"} page`}
              className={`${p.lbImg} ${shot.kind === "phone" ? p.lbPhone : ""}`}
            />
          </div>
        </>
      )}
    </dialog>
  );
}
