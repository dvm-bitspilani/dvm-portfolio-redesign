// One project, inside the same expanded tile. The list card's cover morphs into the hero.
import { Link } from "react-router-dom";
import Page from "./Page";
import { projectsSorted, projectBySlug, KIND_LABEL, VERTICAL_NAME } from "../lib/data";
import { P } from "../lib/paths";
import p from "./pages.module.css";

export default function ProjectDetail({ slug }) {
  const x = projectBySlug.get(slug);
  if (!x) {
    return (
      <Page id="ticker" label="Now shipping" title="Project not found">
        <p className={p.body}>There is no project at this address.</p>
        <Link className={p.btn} to={P("/projects")}>
          See all projects
        </Link>
      </Page>
    );
  }
  const i = projectsSorted.indexOf(x);
  const prev = projectsSorted[(i - 1 + projectsSorted.length) % projectsSorted.length];
  const next = projectsSorted[(i + 1) % projectsSorted.length];
  const media = x.cover || x.mockup;
  const yt = x.youtubeId ? `https://www.youtube.com/watch?v=${x.youtubeId}` : x.links.youtube;
  const shots = [...(x.gallery || []), ...(x.mobileGallery || [])];
  return (
    <Page id="ticker" label="Projects" title={x.title} readout={`${i + 1} of ${projectsSorted.length}`}>
      {x.subtitle && <p className={p.subtitle}>{x.subtitle}</p>}
      <div className={p.detailTop}>
        <div className={p.hero} style={{ viewTransitionName: "v7-cover" }}>
          {media ? <img src={media} alt={`${x.title}, ${x.kind === "video" ? "film still" : "screenshot"}`} /> : <span className={p.cardType}>{x.title}</span>}
          {yt && (
            <a className={p.heroPlay} href={yt} target="_blank" rel="noreferrer">
              <span>Watch on YouTube</span>
            </a>
          )}
        </div>
        <div>
          <dl className={p.metaGrid}>
            <dt>Fest</dt>
            <dd>{x.fest}</dd>
            <dt>Type</dt>
            <dd>{KIND_LABEL[x.kind]}</dd>
            {x.date && (
              <>
                <dt>Date</dt>
                <dd>{x.date}</dd>
              </>
            )}
            {x.theme && (
              <>
                <dt>Theme</dt>
                <dd>{x.theme}</dd>
              </>
            )}
            <dt>Teams</dt>
            <dd>{x.verticals.map((v) => VERTICAL_NAME[v]).join(", ")}</dd>
          </dl>
          <div className={p.linkRow}>
            {x.links.live && (
              <a className={p.btn} href={x.links.live} target="_blank" rel="noreferrer">
                Visit the site
              </a>
            )}
            {x.links.playStore && (
              <a className={p.btn} href={x.links.playStore} target="_blank" rel="noreferrer">
                Get it on Google Play
              </a>
            )}
            {yt && (
              <a className={p.btnGhost} href={yt} target="_blank" rel="noreferrer">
                Watch on YouTube
              </a>
            )}
          </div>
        </div>
      </div>
      <hr className={p.rule} />
      {x.description ? <p className={p.lead}>{x.description}</p> : x.summary && <p className={p.lead}>{x.summary}</p>}
      {x.festContext && (
        <details className={p.details}>
          <summary>About {x.fest}</summary>
          <p className={p.body}>{x.festContext}</p>
        </details>
      )}
      {shots.length > 0 && (
        <>
          <h2 className={p.h2}>Screens</h2>
          <div className={p.gallery}>
            {shots.map((src) => (
              <img key={src} src={src} alt={`${x.title} screen`} loading="lazy" decoding="async" />
            ))}
          </div>
        </>
      )}
      <nav className={p.pager} aria-label="More projects">
        <Link to={P(`/projects/${prev.slug}`)}>
          <small>Previous</small>
          <span>{prev.title}</span>
        </Link>
        <Link to={P(`/projects/${next.slug}`)}>
          <small>Next</small>
          <span>{next.title}</span>
        </Link>
      </nav>
    </Page>
  );
}
