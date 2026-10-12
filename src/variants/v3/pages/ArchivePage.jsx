import { useEffect, useState } from "react";
import { ArchiveWall } from "../../../immersive/kit/archive";
import V3Nav from "../shell/V3Nav";
import { RootNav } from "../shell/context";
import s from "./archive.module.css";

/** /archive: the infinite wall, full screen under the v3 navbar. */
export default function ArchivePage() {
  const [inset, setInset] = useState(() => (window.innerWidth <= 768 ? 76 : 88));
  useEffect(() => {
    const on = () => setInset(window.innerWidth <= 768 ? 76 : 88);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return (
    <div className={s.page}>
      <div className={s.wall}>
        {/* the wall syncs ?f=&item= with the full pathname, so give it the unprefixed router */}
        <RootNav>
          <ArchiveWall insetTop={inset} routing />
        </RootNav>
      </div>
      <V3Nav />
    </div>
  );
}
