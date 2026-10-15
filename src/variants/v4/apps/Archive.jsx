// Archive: the kit's ArchiveWall as a full-screen app (opens maximised). When a tile with
// a project or person behind it is open, a chip offers to open it as a window here.
import { memo, useCallback, useState } from "react";
import { AppWindow } from "lucide-react";
import { ArchiveWall } from "../../../immersive/kit/archive";
import { rectOf, useOs } from "../os/shell";
import s from "./archive.module.css";

function Archive() {
  const { launch, phone } = useOs();
  const [item, setItem] = useState(null);
  const onOpen = useCallback((it) => setItem(it && it.id !== "about" ? it : null), []);
  const target = item?.project
    ? { label: `Open ${item.project.title}`, run: (o) => launch("project", item.project.slug, { origin: o }) }
    : item?.artwork
      ? { label: "Open in Artwork", run: (o) => launch("artwork", undefined, { origin: o, props: { select: item.artwork.slug } }) }
      : item?.blog
        ? { label: "Open in Blogs", run: (o) => launch("blogs", undefined, { origin: o, props: { select: item.blog.slug } }) }
        : item?.member
          ? { label: "Open in Team", run: (o) => launch("team", undefined, { origin: o, props: { select: item.member.slug } }) }
          : null;
  return (
    <div className={s.wrap} data-kit>
      <ArchiveWall title={false} detail="builtin" onOpen={onOpen} insetTop={0} quality={phone ? "low" : "auto"} />
      {target && (
        <button className={s.bridge} onClick={(e) => target.run(rectOf(e.currentTarget))}>
          <AppWindow size={15} />
          {target.label}
        </button>
      )}
    </div>
  );
}

export default memo(Archive);
