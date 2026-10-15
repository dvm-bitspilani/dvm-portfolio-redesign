// Reel 7: Artwork. Each piece in a frame cut to its own aspect ratio.
import { Frame, Reel } from "../reel/Reel";
import { NextReel, TitleCard } from "../frames/ends";
import { artworks } from "../lib/data";
import f from "../frames/frames.module.css";
import i from "./inner.module.css";

export default function Artwork() {
  const list = [...artworks].sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));
  return (
    <Reel label="Artwork">
      <TitleCard n={7} title="Artwork" line={`${artworks.length} renders, illustrations and UI shots by our designers and animators.`} />
      {list.map((a) => (
        <Frame key={a.slug} id={a.slug} label={a.title} w="auto" edge={a.artist.toUpperCase()} thumb={a.image}>
          <figure className={i.piece}>
            <div className={i.pieceImg}>
              <img src={a.image} alt={a.title} loading="lazy" draggable={false} />
            </div>
            <figcaption className={i.pieceCap}>
              <h2 className={i.pieceTitle}>{a.title}</h2>
              <p className={i.by}>
                {a.artist}, {a.year}
                {a.platform ? ` on ${a.platform}` : ""}
              </p>
              {a.description && <p className={i.pieceText}>{a.description}</p>}
              <p className={i.pieceLinks}>
                {a.links.artwork && (
                  <a href={a.links.artwork} target="_blank" rel="noreferrer" className={f.pill}>
                    View the original
                  </a>
                )}
                {a.links.portfolio && (
                  <a href={a.links.portfolio} target="_blank" rel="noreferrer" className={i.textLink}>
                    {a.artist.split(" ")[0]}'s portfolio
                  </a>
                )}
              </p>
            </figcaption>
          </figure>
        </Frame>
      ))}
      <NextReel n={8} />
    </Reel>
  );
}
