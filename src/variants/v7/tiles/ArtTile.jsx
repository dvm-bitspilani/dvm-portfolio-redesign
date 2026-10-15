// Artwork of the day (one piece per IST calendar day). Expands into the Artwork gallery.
import Head from "./Head";
import ArtworkPage from "../pages/ArtworkPage";
import { artworkOfDay } from "../lib/data";
import t from "./tiles.module.css";

export default function ArtTile({ role, label }) {
  if (role === "primary") return <ArtworkPage />;
  const a = artworkOfDay();
  const day = new Date(Date.now() + 5.5 * 3600e3).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  return (
    <>
      <Head id="art" label={label} led="idle">
        {day}
      </Head>
      <div className={t.art} data-role={role}>
        <img className={t.artImg} src={a.image} alt="" loading="lazy" decoding="async" />
        <div className={t.artText}>
          <p className={t.artTitle}>{a.title}</p>
          <p className={t.artBy}>{a.artist}</p>
        </div>
      </div>
    </>
  );
}
