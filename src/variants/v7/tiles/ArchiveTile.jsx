// A window onto the Archive wall: everything we've kept, drifting slowly. Expands into the
// ArchiveWall (kit), the board's second WebGL context, mounted only on /archive.
import Head from "./Head";
import ArchivePage from "../pages/ArchivePage";
import { projects, artworks, team, blogs } from "../lib/data";
import t from "./tiles.module.css";

const THUMBS = (() => {
  const covers = projects.filter((p) => p.cover).map((p) => p.cover);
  const art = artworks.map((a) => a.image);
  const out = [];
  for (let i = 0; out.length < 24; i++) {
    if (covers[i]) out.push(covers[i]);
    if (art[i]) out.push(art[i]);
  }
  return out.slice(0, 24);
})();

export default function ArchiveTile({ role, label }) {
  if (role === "primary") return <ArchivePage />;
  return (
    <>
      <Head id="archive" label={label} led="idle">
        {projects.length + artworks.length + team.length + blogs.length} records
      </Head>
      <div className={t.archive} data-role={role} aria-hidden="true">
        <div className={t.archiveDrift}>
          {THUMBS.map((src, i) => (
            <img key={src + i} src={src} alt="" loading="lazy" decoding="async" />
          ))}
        </div>
      </div>
      <p className={t.archiveNote}>Every project, artwork, post and member on one wall</p>
    </>
  );
}
