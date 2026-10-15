// Frame contents shared by the reels: chapter title cards, inline films (YouTube only on
// click or hover intent), websites as framed stills that scroll through their full-page
// screenshot as the frame crosses the gate, and the project frame that picks between them.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Frame } from "../reel/Reel";
import { useBus, useWatch } from "../reel/context";
import { KIND_LABEL, stillOf } from "../lib/data";
import { P } from "../lib/paths";
import f from "./frames.module.css";

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const WORDS = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

/** A chapter title card: the title fills in as the card reaches the centre of the gate. */
export function ChapterCard({ id, n, title, line, w = 62, kind = "Chapter", children }) {
  const fill = useRef(null);
  const ref = useRef(null);
  const bus = useBus();
  useWatch(ref, ({ c }) => {
    const k = bus.reduced ? 1 : clamp01(1.25 - Math.abs(c) * 2.4);
    if (fill.current) fill.current.style.clipPath = `inset(0 ${((1 - k) * 100).toFixed(2)}% 0 0)`;
  });
  return (
    <Frame id={id} chapter={title} label={`${kind} ${n}: ${title}`} w={w} edge={`${kind === "Chapter" ? "CH" : "REEL "}${n} ${title}`} frameRef={ref}>
      <div className={f.card}>
        <svg className={f.reticle} viewBox="0 0 200 200" aria-hidden="true">
          <circle cx="100" cy="100" r="96" />
          <circle cx="100" cy="100" r="80" />
          <path d="M100 0v200M0 100h200" />
        </svg>
        <p className={f.cardNo}>
          {kind} {WORDS[n] || n}
        </p>
        <h2 className={f.cardTitle}>
          <span className={f.cardOutline}>{title}</span>
          <span ref={fill} className={f.cardFill} aria-hidden="true">
            {title}
          </span>
        </h2>
        {line && <p className={f.cardLine}>{line}</p>}
        {children}
      </div>
    </Frame>
  );
}

// one inline film at a time across the whole variant
const FILM_EVENT = "v5-film";

/** A film: local thumbnail; the YouTube player only after a click or a resting hover. */
export function Film({ project, className = "", caption = true }) {
  const bus = useBus();
  const [state, setState] = useState(null); // null | preview | play
  const timer = useRef(0);
  const ref = useRef(null);
  const id = project.youtubeId;

  useEffect(() => {
    const on = (e) => e.detail !== project.slug && setState(null);
    window.addEventListener(FILM_EVENT, on);
    return () => {
      window.removeEventListener(FILM_EVENT, on);
      clearTimeout(timer.current);
    };
  }, [project.slug]);
  useEffect(() => {
    if (state) window.dispatchEvent(new CustomEvent(FILM_EVENT, { detail: project.slug }));
  }, [state, project.slug]);

  // stop when the frame leaves the gate
  const stRef = useRef(state);
  stRef.current = state;
  useWatch(ref, ({ p }) => {
    if (stRef.current && (p < -0.02 || p > 1.02)) setState(null);
  });

  if (!id) return <Still project={project} className={className} />;

  const onEnter = (e) => {
    if (e.pointerType !== "mouse" || state) return;
    clearTimeout(timer.current);
    const arm = () => {
      timer.current = setTimeout(() => {
        if (bus.dragging || Math.abs(bus.vel) > 80) arm();
        else setState((s) => s || "preview");
      }, 650);
    };
    arm();
  };
  const onLeave = () => {
    clearTimeout(timer.current);
    setState((s) => (s === "preview" ? null : s));
  };
  const play = () => setState("play");
  const src =
    state === "preview"
      ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&controls=0&playsinline=1&rel=0&loop=1&playlist=${id}&modestbranding=1`
      : `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0&modestbranding=1`;

  return (
    <figure ref={ref} className={`${f.film} ${className}`} onPointerEnter={onEnter} onPointerLeave={onLeave}>
      <div className={f.screen} onClick={() => !state && play()}>
        <img src={project.cover} alt="" loading="lazy" draggable={false} className={f.poster} />
        {state && <iframe className={f.player} src={src} title={`${project.title} (YouTube)`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" />}
        {state === "preview" && (
          <button type="button" className={f.shield} onClick={play}>
            <span>Play with sound</span>
          </button>
        )}
        {!state && (
          <button type="button" className={f.play} onClick={play} aria-label={`Play ${project.title}`}>
            <span className={f.playIcon} aria-hidden="true" />
            <span className={f.playText}>Play film</span>
          </button>
        )}
      </div>
      {caption && <Caption project={project} />}
    </figure>
  );
}

/** Measure an image inside its box (for scroll-through) without layout reads per frame. */
function useScrollThrough(boxRef, imgRef, rootRef, { from = 0.1, to = 0.9 } = {}) {
  const dims = useRef({ box: 0, img: 0 });
  useLayoutEffect(() => {
    const box = boxRef.current;
    const img = imgRef.current;
    if (!box || !img) return;
    const measure = () => {
      dims.current = { box: box.clientHeight, img: img.offsetHeight };
    };
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    ro.observe(img);
    img.addEventListener("load", measure);
    measure();
    return () => {
      ro.disconnect();
      img.removeEventListener("load", measure);
    };
  }, [boxRef, imgRef]);
  useWatch(rootRef, ({ p }) => {
    const img = imgRef.current;
    if (!img) return;
    const travel = Math.max(0, dims.current.img - dims.current.box);
    const t = clamp01((p - from) / (to - from));
    img.style.transform = `translate3d(0, ${(-travel * t).toFixed(1)}px, 0)`;
  });
}

/** A website as a framed still: desktop page in a monitor, phone page beside it. */
export function Site({ project, className = "", caption = true, desktop, mobile }) {
  const root = useRef(null);
  const dBox = useRef(null);
  const dImg = useRef(null);
  const mBox = useRef(null);
  const mImg = useRef(null);
  const d = desktop ?? project.gallery?.[0] ?? null;
  const m = mobile ?? project.mobileGallery?.[0] ?? null;
  useScrollThrough(dBox, dImg, root, { from: 0.12, to: 0.88 });
  useScrollThrough(mBox, mImg, root, { from: 0.2, to: 0.8 });
  const still = !d && !m ? stillOf(project) : null;
  return (
    <figure ref={root} className={`${f.site} ${className}`}>
      <div className={f.devices}>
        {(d || still) && (
          <div className={f.monitor}>
            <span className={f.monitorBar} aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <div ref={dBox} className={f.monitorView}>
              <img ref={dImg} src={d || still} alt={`${project.title}, full page`} loading="lazy" draggable={false} className={f.page} />
            </div>
          </div>
        )}
        {m && (
          <div className={f.phone}>
            <div ref={mBox} className={f.phoneView}>
              <img ref={mImg} src={m} alt={`${project.title} on a phone`} loading="lazy" draggable={false} className={f.page} />
            </div>
          </div>
        )}
      </div>
      {caption && <Caption project={project} />}
    </figure>
  );
}

/** Apps and projects without screenshots: the mockup or cover as one still. */
export function Still({ project, className = "", caption = true }) {
  const src = project.mockup || stillOf(project);
  return (
    <figure className={`${f.stillFig} ${className}`}>
      <div className={f.still}>
        {src ? <img src={src} alt={project.title} loading="lazy" draggable={false} /> : <span className={f.noStill}>{project.title}</span>}
      </div>
      {caption && <Caption project={project} />}
    </figure>
  );
}

export function Caption({ project, link = true }) {
  const meta = [project.fest, project.year, KIND_LABEL[project.kind]].filter(Boolean);
  return (
    <figcaption className={f.caption}>
      <p className={f.capMeta}>
        {meta.map((m) => (
          <span key={m}>{m}</span>
        ))}
      </p>
      <h3 className={f.capTitle}>{project.title}</h3>
      {project.summary && <p className={f.capText}>{project.summary}</p>}
      {link && (
        <Link to={P(`/projects/${project.slug}`)} className={f.capLink}>
          Open the scene
        </Link>
      )}
    </figcaption>
  );
}

/** The right treatment for any project. */
export function ProjectMedia({ project, ...rest }) {
  if (project.kind === "video") return <Film project={project} {...rest} />;
  if (project.gallery?.length || project.mobileGallery?.length) return <Site project={project} {...rest} />;
  return <Still project={project} {...rest} />;
}

export function ProjectFrame({ project, w, edge }) {
  const isFilm = project.kind === "video";
  const width = w ?? (isFilm ? 78 : project.gallery?.length || project.mobileGallery?.length ? 84 : 70);
  return (
    <Frame id={project.slug} label={project.title} w={width} edge={edge || project.title} thumb={stillOf(project) || undefined}>
      <div className={f.projectInner}>
        <ProjectMedia project={project} />
      </div>
    </Frame>
  );
}
