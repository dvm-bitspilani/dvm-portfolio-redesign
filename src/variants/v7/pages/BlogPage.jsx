// The blog, inside the expanded latest-post tile. Posts are hosted externally.
import Page from "./Page";
import { blogsSorted } from "../lib/data";
import p from "./pages.module.css";

export default function BlogPage() {
  return (
    <Page id="blog" label="Latest post" title="Blog" readout={`${blogsSorted.length} posts`}>
      <p className={p.lead}>Case studies and write-ups from the people who built the fest apps and sites.</p>
      <ul className={p.posts}>
        {blogsSorted.map((b) => (
          <li key={b.slug} className={p.post}>
            <img src={b.cover} alt="" loading="lazy" decoding="async" />
            <div>
              <h2>{b.title}</h2>
              <p className={p.postMeta}>
                {b.authors.join(", ")}, {b.date}. {b.readMinutes} min read
              </p>
              <p>{b.excerpt}</p>
              <a className={p.textLink} href={b.url} target="_blank" rel="noreferrer">
                Read on {b.platform}
              </a>
            </div>
          </li>
        ))}
      </ul>
    </Page>
  );
}
