// The projection gate: a frame between two sprocket rails. Two uses:
//  - ReelGate (the /projects hero): the featured reel, one still at a time. The current pip's teal
//    fill is the timer (its animationend advances the reel, so the fill and the change cannot
//    drift); on each change the outgoing still slides out left, the next slides in from the right
//    and both rails move on two perforations. Hover or focus inside, or a hidden tab, pauses it.
//    Reduced motion: no auto-advance, instant swaps, the pips still select.
//  - FilmGate (a film's page): the cover with a play button (a facade: YouTube loads only when it
//    is pressed), or a leader marked "Not online" when the film has no video.
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Leader from "./Leader";
import ui from "../../ui.module.css";
import p from "../projects.module.css";

function Rails() {
  return (
    <>
      <span className={`${p.rail} ${p.railT}`} aria-hidden="true" />
      <span className={`${p.rail} ${p.railB}`} aria-hidden="true" />
    </>
  );
}

export function ReelGate({ items, reel, className = "" }) {
  const [held, setHeld] = useState(false);
  const [hidden, setHidden] = useState(() => typeof document !== "undefined" && document.hidden);
  const hover = useRef(false);
  const focus = useRef(false);
  const sync = () => setHeld(hover.current || focus.current);
  useEffect(() => {
    const on = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);
  const cur = items[reel.cur];
  const paused = held || hidden;

  return (
    <div
      className={`${p.reel} ${className}`}
      onMouseEnter={() => {
        hover.current = true;
        sync();
      }}
      onMouseLeave={() => {
        hover.current = false;
        sync();
      }}
      onFocus={() => {
        focus.current = true;
        sync();
      }}
      onBlur={(ev) => {
        if (!ev.currentTarget.contains(ev.relatedTarget)) {
          focus.current = false;
          sync();
        }
      }}
    >
      <div className={p.gateBox} style={{ "--n": reel.adv }} data-reveal>
        <Rails />
        <Link to={cur.href} aria-label={cur.title} className={`${ui.frame} ${p.gateFrame} ${p.ticks} ${p.ticksOn}`}>
          {items.map((e, i) => (
            <img
              key={e.id}
              src={e.cover}
              alt=""
              loading={i === 0 ? "eager" : "lazy"}
              fetchPriority={i === 0 ? "high" : undefined}
              decoding="async"
              className={`${p.still} ${i === reel.cur ? p.stillOn : i === reel.prev ? p.stillOut : ""}`}
            />
          ))}
          <span className={p.scan} aria-hidden="true" />
          {cur.isFilm && <span className={`${ui.play} ${p.playTop}`} aria-hidden="true" />}
        </Link>
      </div>
      <div className={p.pips}>
        {items.map((e, i) => (
          <button
            key={e.id}
            type="button"
            className={p.pip}
            aria-label={`Show ${e.title}`}
            aria-current={i === reel.cur ? "true" : undefined}
            onClick={() => reel.select(i)}
          >
            <span className={p.pipBar}>
              {i === reel.cur && (
                <span
                  key={reel.step}
                  className={p.pipFill}
                  style={{ animationPlayState: paused ? "paused" : "running" }}
                  onAnimationEnd={reel.next}
                />
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Keyed by the project in the page, so the facade comes back on the next film. */
export function FilmGate({ e }) {
  const id = e.r.youtubeId;
  const [playing, setPlaying] = useState(false);
  const frameRef = useRef(null);
  useEffect(() => {
    if (playing) frameRef.current?.focus();
  }, [playing]);

  return (
    <div className={p.filmGate}>
      <div className={`${p.gateBox} ${p.gateBoxFilm}`}>
        <Rails />
        <div className={`${ui.frame} ${p.filmFrame} ${p.ticks} ${p.ticksOn}`}>
          {playing ? (
            <iframe
              ref={frameRef}
              src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
              title={e.title}
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : id && e.cover ? (
            <>
              <img src={e.cover} alt={e.title} loading="eager" fetchPriority="high" />
              <span className={p.scan} aria-hidden="true" />
              <button type="button" className={p.playBtn} aria-label={`Play ${e.title}`} onClick={() => setPlaying(true)} />
            </>
          ) : (
            <Leader title={e.title} />
          )}
        </div>
      </div>
      {!id && <p className={`${ui.meta} ${p.offline}`}>Not online</p>}
    </div>
  );
}
