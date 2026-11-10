// /blog: write-ups from the team, newest first (src/immersive/data/blogs). Every post is
// hosted elsewhere, so each row is an external link.
import { useRef } from "react";
import { blogs } from "../../../immersive/data";
import Navbar from "../chrome/Navbar";
import { useReveal } from "../lib/reveal";
import ui from "../ui.module.css";
import s from "./pages.module.css";

const POSTS = [...blogs].sort((a, b) => b.isoDate.localeCompare(a.isoDate));

export default function BlogPage() {
  const headRef = useRef(null);
  useReveal(headRef, { start: "top 95%" });
  return (
    <>
      <Navbar />
      <main className={ui.page}>
        <header ref={headRef} className={ui.pageHead} data-light="80% 22% 36vw">
          <div>
            <h1 className={ui.h1} data-reveal="head">
              Blog
            </h1>
          </div>
        </header>

        <div className={s.pageBody}>
          <ul className={`${ui.wrap} ${s.rows}`}>
            {POSTS.map((b) => (
              <li key={b.slug}>
                <a href={b.url} target="_blank" rel="noreferrer" className={`${ui.card} ${s.row}`}>
                  <span className={`${ui.frame} ${s.rowFrame}`}>
                    <img src={b.cover} alt="" loading="lazy" />
                  </span>
                  <span className={s.rowText}>
                    <span className={ui.h3}>{b.title} ↗</span>
                    <span className={ui.cardMeta}>
                      {b.authors.join(" & ")} · {b.date} · {b.readMinutes} min
                    </span>
                    <span className={s.rowLine}>{b.excerpt}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </>
  );
}
