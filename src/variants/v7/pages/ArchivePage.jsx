// The Archive: the kit's ArchiveWall as the giant expanded tile (filter + open item in the URL).
import { ArchiveWall } from "../../../immersive/kit/archive";
import Head from "../tiles/Head";
import { useMobile } from "../lib/hooks";
import p from "./pages.module.css";

export default function ArchivePage() {
  const mobile = useMobile();
  return (
    <>
      <Head id="archive" label="Archive" led="live">
        Drag, scroll or use the arrow keys
      </Head>
      <div className={p.archiveWrap}>
        <h1 className={p.srOnly} tabIndex={-1} data-v7-focus="">
          Archive
        </h1>
        <ArchiveWall insetTop={mobile ? 52 : 48} routing title={false} quality={mobile ? "low" : "auto"} />
      </div>
    </>
  );
}
