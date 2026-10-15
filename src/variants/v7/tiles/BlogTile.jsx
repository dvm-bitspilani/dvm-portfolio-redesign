// The latest post. Expands into the Blog.
import Head from "./Head";
import BlogPage from "../pages/BlogPage";
import { latestBlog as b } from "../lib/data";
import t from "./tiles.module.css";

export default function BlogTile({ role, label }) {
  if (role === "primary") return <BlogPage />;
  return (
    <>
      <Head id="blog" label={label} led="idle">
        {b.platform}
      </Head>
      <div className={t.blog} data-role={role}>
        <img className={t.blogCover} src={b.cover} alt="" loading="lazy" decoding="async" />
        <div className={t.blogText}>
          <p className={t.blogTitle}>{b.shortTitle || b.title}</p>
          <p className={t.blogMeta}>
            {b.authors.join(", ")}, {b.date}. {b.readMinutes} min read
          </p>
        </div>
      </div>
    </>
  );
}
