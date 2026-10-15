// One project in its own window: hero (mockup / cover), story, teams, the film (YouTube,
// loaded only on play), full-page screenshots with an in-window viewer, links, and more
// from the same fest (each opens its own window).
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight, Play, X } from "lucide-react";
import { projects, verticals, fests } from "../../../immersive/data";
import { projectBySlug } from "../os/apps";
import { rectOf, useOs } from "../os/shell";
import { Thumb, externalLinks } from "./Projects";
import a from "./app.module.css";
import s from "./detail.module.css";

const KIND = { website: "Website", app: "App", portal: "Portal", video: "Film" };

function Viewer({ shots, index, setIndex }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  useEffect(() => {
    ref.current?.querySelector("[data-scroll]")?.scrollTo(0, 0);
  }, [index]);
  const go = (d) => setIndex((i) => (i + d + shots.length) % shots.length);
  return (
    <div
      ref={ref}
      className={s.viewer}
      role="dialog"
      aria-label={`Screenshot ${index + 1} of ${shots.length}`}
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          setIndex(null);
        } else if (e.key === "ArrowRight") go(1);
        else if (e.key === "ArrowLeft") go(-1);
      }}
    >
      <div className={s.vBar}>
        <span>
          {shots[index].label} {index + 1} / {shots.length}
        </span>
        <div className={s.vBtns}>
          <button className={a.iconBtn} onClick={() => go(-1)} aria-label="Previous screenshot">
            <ChevronLeft />
          </button>
          <button className={a.iconBtn} onClick={() => go(1)} aria-label="Next screenshot">
            <ChevronRight />
          </button>
          <button className={a.iconBtn} onClick={() => setIndex(null)} aria-label="Close viewer">
            <X />
          </button>
        </div>
      </div>
      <div className={s.vScroll} data-scroll>
        <img src={shots[index].src} alt={`${shots[index].label} screenshot ${index + 1}`} className={shots[index].mobile ? s.vMobile : s.vDesk} />
      </div>
    </div>
  );
}

function ProjectDetail({ param }) {
  const { launch } = useOs();
  const p = projectBySlug(param);
  const [playing, setPlaying] = useState(false);
  const [shot, setShot] = useState(null);
  const shots = useMemo(
    () => [...(p?.gallery ?? []).map((src) => ({ src, label: "Desktop" })), ...(p?.mobileGallery ?? []).map((src) => ({ src, label: "Mobile", mobile: true }))],
    [p],
  );
  const more = useMemo(() => projects.filter((x) => x.fest === p?.fest && x.slug !== p?.slug).slice(0, 4), [p]);
  if (!p) return <p className={a.empty}>This project isn't on this machine.</p>;
  const fest = fests.find((f) => f.id === p.fest);
  const links = externalLinks(p);

  return (
    <div className={a.app}>
      <div className={a.scroll}>
        <header className={s.hero}>
          {p.cover && <img className={s.ambient} src={p.cover} alt="" aria-hidden="true" />}
          <div className={s.heroText}>
            <div className={s.chips}>
              <span className={a.chip}>{p.fest}</span>
              <span className={a.chip}>{KIND[p.kind]}</span>
              {p.date && <span className={s.date}>{p.date}</span>}
            </div>
            <h1 className={`${a.display} ${s.title}`}>{p.title}</h1>
            {p.subtitle && <p className={s.subtitle}>{p.subtitle}</p>}
            {p.theme && <p className={s.theme}>Theme: “{p.theme}”</p>}
            {links.length > 0 && (
              <div className={s.links}>
                {links.map((l, i) => (
                  <a key={l.href} className={i ? a.btn : a.btnPrimary} href={l.href} target="_blank" rel="noreferrer">
                    {l.label} <ArrowUpRight />
                  </a>
                ))}
              </div>
            )}
          </div>
          <div className={s.heroArt}>{p.mockup ? <img src={p.mockup} alt={`${p.title} on devices`} className={s.mockup} /> : <Thumb p={p} className={s.heroThumb} />}</div>
        </header>

        <div className={s.body}>
          {p.youtubeId && (
            <section className={s.film} aria-label="Film">
              {playing ? (
                <iframe
                  className={s.frame}
                  src={`https://www.youtube-nocookie.com/embed/${p.youtubeId}?autoplay=1&rel=0`}
                  title={p.title}
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                />
              ) : (
                <button className={s.poster} onClick={() => setPlaying(true)} aria-label={`Play ${p.title}`}>
                  {p.cover && <img src={p.cover} alt="" />}
                  <span className={s.bigPlay}>
                    <Play fill="currentColor" />
                  </span>
                </button>
              )}
            </section>
          )}

          <section className={s.story}>
            <div className={s.desc}>
              {(p.description ?? p.summary ?? "").split(/(?<=\.)\s+(?=[A-Z])/).reduce((acc, sentence, i) => {
                // group sentences into short paragraphs of about three
                const k = Math.floor(i / 3);
                acc[k] = acc[k] ? `${acc[k]} ${sentence}` : sentence;
                return acc;
              }, []).map((para) => (
                <p key={para.slice(0, 24)}>{para}</p>
              ))}
            </div>
            <aside className={s.facts}>
              <h2 className={s.h2}>Built by</h2>
              <ul className={s.teams}>
                {p.verticals.map((v) => (
                  <li key={v}>
                    <button className={s.teamLink} onClick={(e) => launch("team", undefined, { origin: rectOf(e.currentTarget), props: { group: "vertical", filter: v } })}>
                      {verticals.find((x) => x.id === v)?.name ?? v}
                    </button>
                  </li>
                ))}
              </ul>
              {fest && (
                <>
                  <h2 className={s.h2}>About {fest.name}</h2>
                  <p className={s.festBlurb}>{fest.blurb}</p>
                </>
              )}
            </aside>
          </section>

          {shots.length > 0 && (
            <section aria-label="Screenshots">
              <h2 className={s.h2}>Screens</h2>
              <div className={s.shots}>
                {shots.map((x, i) => (
                  <button key={x.src} className={`${s.shot} ${x.mobile ? s.shotMobile : ""}`} onClick={() => setShot(i)} aria-label={`Open ${x.label.toLowerCase()} screenshot ${i + 1}`}>
                    <img src={x.src} alt="" loading="lazy" decoding="async" />
                    <span>{x.label}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {more.length > 0 && (
            <section aria-label={`More from ${p.fest}`}>
              <h2 className={s.h2}>More from {p.fest}</h2>
              <div className={s.more}>
                {more.map((m) => (
                  <button key={m.slug} className={s.moreItem} onClick={(e) => launch("project", m.slug, { origin: rectOf(e.currentTarget) })}>
                    <Thumb p={m} />
                    <span>{m.title}</span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
      {shot != null && <Viewer shots={shots} index={shot} setIndex={setShot} />}
    </div>
  );
}

export default memo(ProjectDetail);
