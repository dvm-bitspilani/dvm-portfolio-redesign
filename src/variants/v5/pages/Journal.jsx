// Reel 6: Journal. One blog post per frame.
import { Frame, Reel } from "../reel/Reel";
import { NextReel, TitleCard } from "../frames/ends";
import { blogs } from "../lib/data";
import f from "../frames/frames.module.css";
import i from "./inner.module.css";

export default function Journal() {
  const list = [...blogs].sort((a, b) => b.isoDate.localeCompare(a.isoDate));
  return (
    <Reel label="Journal">
      <TitleCard n={6} title="Journal" line="Notes from the crew: case studies, tooling and how we built things." />
      {list.map((bl) => (
        <Frame key={bl.slug} id={bl.slug} label={bl.title} w={84} edge={bl.platform.toUpperCase()} thumb={bl.cover}>
          <article className={`${f.inner} ${i.post}`}>
            <a href={bl.url} target="_blank" rel="noreferrer" className={i.postCover} tabIndex={-1} aria-hidden="true">
              <img src={bl.cover} alt="" loading="lazy" draggable={false} />
            </a>
            <div className={i.postText}>
              <p className={i.mono}>
                {bl.date}, {bl.readMinutes} min read on {bl.platform}
              </p>
              <h2 className={i.postTitle}>{bl.title}</h2>
              <p className={i.body}>{bl.excerpt}</p>
              <p className={i.by}>By {bl.authors.join(" and ")}</p>
              <ul className={i.tags}>
                {bl.tags.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
              <a href={bl.url} target="_blank" rel="noreferrer" className={f.pill}>
                Read on {bl.platform}
              </a>
            </div>
          </article>
        </Frame>
      ))}
      <NextReel n={7} />
    </Reel>
  );
}
