// /artwork: posters, illustrations and 3D work by the designers (src/immersive/data/artworks),
// each at its natural aspect, each opening on the archive wall.
import { useRef } from "react";
import { Link } from "react-router-dom";
import { artworks } from "../../../immersive/data";
import Navbar from "../chrome/Navbar";
import { P } from "../lib/paths";
import { useReveal } from "../lib/reveal";
import ui from "../ui.module.css";
import s from "./pages.module.css";

export default function ArtworkPage() {
  const headRef = useRef(null);
  useReveal(headRef, { start: "top 95%" });
  return (
    <>
      <Navbar />
      <main className={ui.page}>
        <header ref={headRef} className={ui.pageHead} data-light="80% 22% 36vw">
          <div>
            <h1 className={ui.h1} data-reveal="head">
              Artwork
            </h1>
          </div>
        </header>

        <div className={s.pageBody}>
          <ul className={`${ui.wrap} ${s.artGrid}`}>
            {artworks.map((a) => (
              <li key={a.slug} className={s.artItem}>
                <Link to={`${P("/archive")}?item=${encodeURIComponent(a.slug)}`} className={ui.card}>
                  <span className={`${ui.frame} ${s.artFrame}`}>
                    <img src={a.image} alt="" loading="lazy" />
                  </span>
                  <span className={ui.cardTitle}>{a.title}</span>
                  <span className={ui.cardMeta}>
                    by {a.artist}, {a.year}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </>
  );
}
