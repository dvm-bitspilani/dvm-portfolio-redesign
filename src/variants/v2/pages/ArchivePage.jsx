// /archive: the ArchiveWall kit as the page — fixed full screen under the navbar,
// filter + open item synced to the URL (?f=work&item=…).
import { useState } from "react";
import { ArchiveWall } from "../../../immersive/kit/archive";
import Navbar from "../chrome/Navbar";
import Ham from "../chrome/Ham";
import { useMedia } from "../lib/hooks";
import s from "./pages.module.css";

export default function ArchivePage() {
  const [hamOpen, setHamOpen] = useState(false);
  const narrow = useMedia("(max-width: 768px)");
  return (
    <>
      <Navbar onHamClick={() => setHamOpen(true)} />
      <main className={s.archive}>
        <h1 className={s.srOnly}>Archive</h1>
        <ArchiveWall insetTop={narrow ? 76 : 92} routing />
      </main>
      {hamOpen && <Ham onClose={() => setHamOpen(false)} />}
    </>
  );
}
