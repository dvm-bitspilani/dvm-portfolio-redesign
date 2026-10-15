// Artwork, inside the expanded artwork-of-the-day tile. ?a=<slug> opens the viewer (Esc closes it).
import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import Page from "./Page";
import { artworks, artworkOfDay } from "../lib/data";
import p from "./pages.module.css";

export default function ArtworkPage() {
  const [params, setParams] = useSearchParams();
  const slug = params.get("a");
  const open = slug ? artworks.find((a) => a.slug === slug) : null;
  const today = artworkOfDay();
  const closeRef = useRef(null);
  const lastFocus = useRef(null);

  const close = () => {
    const next = new URLSearchParams(params);
    next.delete("a");
    setParams(next, { replace: true, preventScrollReset: true });
  };
  useEffect(() => {
    if (!open) {
      lastFocus.current?.focus?.({ preventScroll: true });
      return;
    }
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const list = [today, ...artworks.filter((a) => a !== today)];
  return (
    <>
      <Page id="art" label="Artwork of the day" title="Artwork" readout={`${artworks.length} pieces`}>
        <p className={p.lead}>Illustration, 3D and interface work by DVM’s designers. Today’s pick comes first.</p>
        <div className={p.artGrid}>
          {list.map((a) => (
            <button
              key={a.slug}
              type="button"
              className={p.artItem}
              onClick={(e) => {
                lastFocus.current = e.currentTarget;
                const next = new URLSearchParams(params);
                next.set("a", a.slug);
                setParams(next, { preventScrollReset: true });
              }}
            >
              <img src={a.image} alt={`${a.title} by ${a.artist}`} loading="lazy" decoding="async" />
              <span>
                {a.title}
                <small>{a.artist}</small>
              </span>
            </button>
          ))}
        </div>
      </Page>
      {open && (
        <div className={p.viewer} role="dialog" aria-modal="true" aria-label={`${open.title} by ${open.artist}`}>
          <button ref={closeRef} type="button" className={p.viewerClose} onClick={close}>
            Close
          </button>
          <div className={p.viewerImg}>
            <img src={open.image} alt={`${open.title} by ${open.artist}`} />
          </div>
          <div className={p.viewerText}>
            <h2>{open.title}</h2>
            <p className={p.body}>
              {open.artist}, {open.year}
              {open.platform ? `, on ${open.platform}` : ""}
            </p>
            {open.description && <p className={p.body}>{open.description}</p>}
            <div className={p.linkRow}>
              {open.links.artwork && (
                <a className={p.btn} href={open.links.artwork} target="_blank" rel="noreferrer">
                  View the original
                </a>
              )}
              {open.links.portfolio && (
                <a className={p.btnGhost} href={open.links.portfolio} target="_blank" rel="noreferrer">
                  {open.artist.split(" ")[0]}’s portfolio
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
