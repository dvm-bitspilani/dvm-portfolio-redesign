// Artwork: a photos app. A justified-ish library grouped by year or by artist, a size
// slider, and a lightbox (arrows / Esc, info panel, links to the original post) that zooms
// out of the clicked thumbnail.
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight, Info, X } from "lucide-react";
import { artworks } from "../../../immersive/data";
import { reducedNow } from "../lib/hooks";
import a from "./app.module.css";
import s from "./artwork.module.css";

const byDate = [...artworks].sort((x, y) => y.date.localeCompare(x.date));

function Lightbox({ list, index, setIndex, origin }) {
  const ref = useRef(null);
  const img = useRef(null);
  const [info, setInfo] = useState(true);
  const art = list[index];
  useEffect(() => {
    ref.current?.focus();
    const o = origin.current;
    const el = img.current;
    if (!o || !el || reducedNow()) return;
    const go = () => {
      const r = el.getBoundingClientRect();
      if (!r.width) return;
      el.animate(
        [
          { transform: `translate(${o.left + o.width / 2 - (r.left + r.width / 2)}px, ${o.top + o.height / 2 - (r.top + r.height / 2)}px) scale(${o.width / r.width})`, opacity: 0.6 },
          { transform: "none", opacity: 1 },
        ],
        { duration: 420, easing: "cubic-bezier(.16,1,.3,1)" },
      );
    };
    if (el.complete) go();
    else el.addEventListener("load", go, { once: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const step = (d) => setIndex((i) => (i + d + list.length) % list.length);
  const links = [art.links.artwork && { label: `View on ${art.platform ?? "the web"}`, href: art.links.artwork }, art.links.portfolio && { label: "Artist portfolio", href: art.links.portfolio }].filter(Boolean);
  return (
    <div
      ref={ref}
      className={s.lightbox}
      role="dialog"
      aria-label={`${art.title} by ${art.artist}`}
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          setIndex(null);
        } else if (e.key === "ArrowRight") step(1);
        else if (e.key === "ArrowLeft") step(-1);
        else if (e.key === "i") setInfo((x) => !x);
      }}
    >
      <div className={s.lbBar}>
        <span className={s.lbCount}>
          {index + 1} / {list.length}
        </span>
        <button className={a.iconBtn} onClick={() => setInfo((x) => !x)} aria-pressed={info} aria-label="Info" title="Info (I)">
          <Info />
        </button>
        <button className={a.iconBtn} onClick={() => setIndex(null)} aria-label="Close" title="Close (Esc)">
          <X />
        </button>
      </div>
      <div className={s.lbBody}>
        <div className={s.lbStage} onClick={(e) => e.target === e.currentTarget && setIndex(null)}>
          <button className={`${s.nav} ${s.prev}`} onClick={() => step(-1)} aria-label="Previous">
            <ChevronLeft />
          </button>
          <img ref={img} key={art.slug} src={art.image} alt={art.title} className={s.lbImg} />
          <button className={`${s.nav} ${s.next}`} onClick={() => step(1)} aria-label="Next">
            <ChevronRight />
          </button>
        </div>
        {info && (
          <aside className={s.info}>
            <h2>{art.title}</h2>
            <p className={s.by}>{art.artist}</p>
            <p className={s.when}>
              {new Date(art.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
              {art.platform ? `, ${art.platform}` : ""}
            </p>
            {art.description && <p className={s.desc}>{art.description}</p>}
            <div className={s.links}>
              {links.map((l) => (
                <a key={l.href} className={a.btn} href={l.href} target="_blank" rel="noreferrer">
                  {l.label} <ArrowUpRight />
                </a>
              ))}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function Artwork({ props }) {
  const [group, setGroup] = useState("year");
  const [size, setSize] = useState(190);
  const [open, setOpen] = useState(null);
  const origin = useRef(null);

  const groups = useMemo(() => {
    const m = new Map();
    for (const x of byDate) {
      const k = group === "year" ? String(x.year) : x.artist;
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(x);
    }
    const arr = [...m.entries()];
    if (group === "artist") arr.sort((p, q) => q[1].length - p[1].length || p[0].localeCompare(q[0]));
    return arr;
  }, [group]);
  const flat = useMemo(() => groups.flatMap(([, list]) => list), [groups]);

  useEffect(() => {
    if (!props?.select) return;
    const i = flat.findIndex((x) => x.slug === props.select);
    if (i >= 0) {
      origin.current = null;
      setOpen(i);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props?.select, props?.nonce]);

  return (
    <div className={a.app}>
      <div className={a.toolbar}>
        <div className={a.crumbs}>
          <b>Library</b>
          <span className={s.count}>{artworks.length} artworks</span>
        </div>
        <div className={a.seg} role="group" aria-label="Group by">
          <button className={a.segBtn} aria-pressed={group === "year"} onClick={() => setGroup("year")}>
            Years
          </button>
          <button className={a.segBtn} aria-pressed={group === "artist"} onClick={() => setGroup("artist")}>
            Artists
          </button>
        </div>
        <label className={s.zoom}>
          <span>Thumbnail size</span>
          <input type="range" min="120" max="320" step="10" value={size} onChange={(e) => setSize(Number(e.target.value))} aria-label="Thumbnail size" />
        </label>
      </div>
      <div className={a.scroll}>
        {groups.map(([k, list]) => (
          <section key={k} className={s.group} aria-label={k}>
            <h2 className={s.groupHead}>
              {k}
              <span>{list.length}</span>
            </h2>
            <div className={s.grid} style={{ "--size": `${size}px` }}>
              {list.map((x) => {
                const i = flat.indexOf(x);
                return (
                  <button
                    key={x.slug}
                    className={s.ph}
                    onClick={(e) => {
                      const r = e.currentTarget.getBoundingClientRect();
                      origin.current = { left: r.left, top: r.top, width: r.width, height: r.height };
                      setOpen(i);
                    }}
                    aria-label={`${x.title} by ${x.artist}`}
                  >
                    <img src={x.image} alt="" loading="lazy" decoding="async" />
                    <span className={s.cap}>
                      <b>{x.title}</b>
                      {group === "year" ? x.artist : x.year}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      {open != null && <Lightbox list={flat} index={open} setIndex={setOpen} origin={origin} />}
    </div>
  );
}

export default memo(Artwork);
