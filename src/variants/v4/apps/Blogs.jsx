// Blogs: a reader. Essays on the left (newest first, filter by tag, search), the reader
// on the right: cover, title, byline, the lead, and a hand-off to the full post where it
// was published (Medium / BITS ACM). Up / Down or J / K step through essays.
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, ChevronLeft, ChevronDown, ChevronUp, Search } from "lucide-react";
import { blogs } from "../../../immersive/data";
import a from "./app.module.css";
import s from "./blogs.module.css";

const sorted = [...blogs].sort((x, y) => y.isoDate.localeCompare(x.isoDate));
const TAGS = [...new Set(blogs.flatMap((b) => b.tags))].sort();

function Blogs({ props }) {
  const [sel, setSel] = useState(props?.select ?? sorted[0].slug);
  const [tag, setTag] = useState(null);
  const [q, setQ] = useState("");
  const [reading, setReading] = useState(!!props?.select);
  const readerRef = useRef(null);

  useEffect(() => {
    if (props?.select) {
      setSel(props.select);
      setTag(null);
      setQ("");
      setReading(true);
    }
  }, [props?.select, props?.nonce]);
  useEffect(() => {
    readerRef.current?.scrollTo(0, 0);
  }, [sel]);

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    return sorted.filter((b) => (!tag || b.tags.includes(tag)) && (!query || `${b.title} ${b.authors.join(" ")} ${b.tags.join(" ")}`.toLowerCase().includes(query)));
  }, [tag, q]);
  const b = blogs.find((x) => x.slug === sel) ?? sorted[0];
  const i = list.findIndex((x) => x.slug === b.slug);
  const step = (d) => {
    const n = list[i + d];
    if (n) setSel(n.slug);
  };
  const onKey = (e) => {
    if (e.target.closest("input")) return;
    if (e.key === "ArrowDown" || e.key === "j") step(1);
    else if (e.key === "ArrowUp" || e.key === "k") step(-1);
    else return;
    e.preventDefault();
  };

  return (
    <div className={a.app} onKeyDown={onKey}>
      <div className={s.layout} data-reading={reading || undefined}>
        <div className={s.listCol}>
          <div className={a.toolbar}>
            <label className={a.search} style={{ flex: 1, width: "auto" }}>
              <Search />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search essays" aria-label="Search essays" />
            </label>
          </div>
          <div className={s.tags} role="group" aria-label="Filter by tag">
            <button className={a.chipBtn} aria-current={!tag} onClick={() => setTag(null)}>
              All
            </button>
            {TAGS.map((t) => (
              <button key={t} className={a.chipBtn} aria-current={tag === t} onClick={() => setTag(tag === t ? null : t)}>
                {t}
              </button>
            ))}
          </div>
          <ul className={`${a.scroll} ${s.list}`}>
            {list.length === 0 && <li className={a.empty}>No essays match.</li>}
            {list.map((x) => (
              <li key={x.slug}>
                <button
                  className={s.item}
                  aria-current={x.slug === b.slug}
                  onClick={() => {
                    setSel(x.slug);
                    setReading(true);
                  }}
                >
                  <img src={x.cover} alt="" loading="lazy" className={s.itemImg} />
                  <span className={s.itemText}>
                    <span className={s.itemTitle}>{x.shortTitle ?? x.title}</span>
                    <span className={s.itemMeta}>
                      {x.authors.join(", ")}
                      <br />
                      <span className={s.mono}>
                        {x.date}, {x.readMinutes} min
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className={a.status}>
            {list.length} of {blogs.length} essays
          </div>
        </div>

        <article className={s.reader} ref={readerRef} aria-label={b.title}>
          <div className={s.readBar}>
            <button className={s.back} onClick={() => setReading(false)}>
              <ChevronLeft size={16} /> Essays
            </button>
            <span className={s.readPos}>
              {i + 1} / {list.length}
            </span>
            <button className={a.iconBtn} onClick={() => step(-1)} disabled={i <= 0} aria-label="Previous essay" title="Previous (K)">
              <ChevronUp />
            </button>
            <button className={a.iconBtn} onClick={() => step(1)} disabled={i < 0 || i >= list.length - 1} aria-label="Next essay" title="Next (J)">
              <ChevronDown />
            </button>
          </div>
          <div className={s.page} key={b.slug}>
            <img className={s.cover} src={b.cover} alt="" />
            <div className={s.tagRow}>
              {b.tags.map((t) => (
                <span key={t} className={a.chip}>
                  {t}
                </span>
              ))}
            </div>
            <h1 className={s.title}>{b.title}</h1>
            <p className={s.byline}>
              By <b>{b.authors.join(" and ")}</b>
              <span className={s.mono}>
                {b.date}, {b.readMinutes} min read, {b.platform}
              </span>
            </p>
            <p className={s.lead}>{b.excerpt}</p>
            <div className={s.handoff}>
              <p>The full essay is published on {b.platform}.</p>
              <a className={a.btnPrimary} href={b.url} target="_blank" rel="noreferrer">
                Continue on {b.platform} <ArrowUpRight />
              </a>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}

export default memo(Blogs);
