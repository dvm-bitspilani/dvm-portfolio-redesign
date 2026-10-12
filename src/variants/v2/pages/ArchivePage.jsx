// /archive: the ArchiveWall kit as the page — fixed full screen under the navbar,
// filter + open item synced to the URL (?f=work&item=…).
import { ArchiveWall } from "../../../immersive/kit/archive";
import Navbar from "../chrome/Navbar";
import { useMedia } from "../lib/hooks";
import s from "./pages.module.css";

export default function ArchivePage() {
  const narrow = useMedia("(max-width: 768px)");
  return (
    <>
      <Navbar />
      <main className={s.archive}>
        <h1 className={s.srOnly}>Archive</h1>
        <ArchiveWall insetTop={narrow ? 76 : 92} routing />
      </main>
    </>
  );
}
