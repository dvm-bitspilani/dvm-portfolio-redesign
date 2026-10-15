// Reel 8: the contact sheet. The ArchiveWall projected into the gate, between the rails;
// no travel here: the wall takes the wheel (zoom), drag and keys itself.
import { useMemo } from "react";
import { ArchiveWall } from "../../../immersive/kit/archive";
import { useNative } from "../lib/hooks";
import s from "./archive.module.css";

const THEME = { accent: "#45e6ff" };

export default function Archive() {
  const native = useNative();
  const insets = useMemo(() => (native ? { top: 64, bottom: 44 } : { top: 70, bottom: 58 }), [native]);
  return (
    <main className={s.archive}>
      <h1 className={s.srOnly}>Contact sheet: the DVM archive</h1>
      <span className={s.railT} aria-hidden="true" />
      <span className={s.railB} aria-hidden="true" />
      <div className={s.gate}>
        <ArchiveWall insets={insets} routing title="Contact sheet" theme={THEME} />
      </div>
    </main>
  );
}
