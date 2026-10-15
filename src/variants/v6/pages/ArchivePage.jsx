// /archive — "every node as a tile". The shell first folds the graph's nodes into a grid
// around the mark, then this page swaps in the ArchiveWall kit (fixed, full screen under the
// header, filter + open item synced to ?f=&item=). The graph unmounts once the wall is up,
// so at most two WebGL contexts are alive during the handoff.
import { ArchiveWall } from "../../../immersive/kit/archive";
import { useShell } from "../lib/hooks";
import s from "./archive.module.css";

export default function ArchivePage({ ready }) {
  const { compact, reduced } = useShell();
  return (
    <section className={s.archive} aria-labelledby="v6-archive-title">
      <h1 id="v6-archive-title" className={s.srOnly}>Archive</h1>
      {ready && (
        <div className={s.wall}>
          <ArchiveWall insetTop={compact ? 98 : 80} routing intro={!reduced} />
        </div>
      )}
    </section>
  );
}
