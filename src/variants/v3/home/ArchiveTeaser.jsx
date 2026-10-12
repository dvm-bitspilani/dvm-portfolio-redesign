import { Link } from "react-router-dom";
import { ArchiveWall } from "../../../immersive/kit/archive";
import { RootNav } from "../shell/context";
import s from "./teaser.module.css";

/**
 * The end of the home story: the archive wall as a living backdrop (no input),
 * its centre mark exactly where the outlined bridge glyph was drawn.
 */
export default function ArchiveTeaser() {
  return (
    <div className={s.teaser}>
      <RootNav>
        <ArchiveWall
          interactive={false}
          showTabs={false}
          showHud={false}
          showMinimap={false}
          showList={false}
          title={false}
          intro={false}
          keyboard={false}
          detail="none"
          quality="auto"
        />
      </RootNav>
      <div className={s.scrim} aria-hidden="true" />
      <div className={s.copy}>
        <h2 className={s.h}>
          <span className={s.ghost} aria-hidden="true">ARCHIVE</span>
          <span className={s.solid}>ARCHIVE</span>
        </h2>
        <p className={s.p}>Every project, film, artwork, essay and member on one wall. Drag it, zoom it, filter it by team or fest.</p>
        <Link to="/archive" className={s.cta}>
          Open the archive
        </Link>
      </div>
    </div>
  );
}
