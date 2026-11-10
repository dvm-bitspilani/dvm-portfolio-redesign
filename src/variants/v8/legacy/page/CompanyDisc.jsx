// /alumni: a company, wherever it is on the page (research/v8-alumni-page-r3.md §3.6) — the wall's
// plates and the map's discs are this one button. The disc with the logo, the name, and "3 alumni"
// when more than one person worked there; nothing else is encoded. States (CSS, legacyPage.module.css):
//   rest   · the logo tinted on the lifted plate
//   open   · hover / focus / its people out (data-open): full colour, teal rim, glow; the rest of the
//            page's discs dim (main[data-co-open])
//   pinned · open plus a solid outer circle (data-pinned): the page's only ring, and it means "selected"
//   kin    · the same company open from its other disc, or a person at it hovered below (data-kin):
//            the open look, no ring, no branch, not dimmed
// Behaviour: openCompany.js `ctl`; the people: Branch (pointer) or CompanySheet (touch).
import { useSyncExternalStore } from "react";
import LegacyCircle from "../LegacyCircle";
import ui from "../../ui.module.css";
import { getKin, onKin } from "./kin";
import { BRANCH_ID, ctl, useOpen } from "./openCompany";
import s from "./legacyPage.module.css";

/**
 * @param {{ k: string, ids: readonly string[], name: string, logo?: import("../alumniData").Logo, n: number, size: number,
 *   variant: "wall" | "map", long?: boolean }} props
 */
export default function CompanyDisc({ k, ids, name, logo, n, size, variant, long = false }) {
  const open = useOpen();
  const lit = useSyncExternalStore(onKin, getKin, getKin);
  const isOpen = open?.key === k;
  const pinned = isOpen && open.pinned;
  const kin = !isOpen && !!lit && ids.some((id) => lit.includes(id));
  return (
    <button
      type="button"
      className={s.co}
      data-variant={variant}
      data-co-key={k}
      data-open={isOpen || undefined}
      data-pinned={pinned || undefined}
      data-kin={kin || undefined}
      aria-expanded={isOpen}
      aria-controls={isOpen ? BRANCH_ID : undefined}
      aria-label={`${name}, ${n} ${n === 1 ? "alum" : "alumni"}`}
      onPointerEnter={(e) => ctl.enter(k, e)}
      onPointerLeave={(e) => ctl.leave(k, e)}
      onClick={(e) => ctl.click(k, e)}
      onFocus={() => ctl.focus(k)}
      onBlur={(e) => ctl.blur(k, e)}
      onKeyDown={(e) => ctl.keyDown(k, e)}
    >
      <span className={s.coDisc} data-branch-anchor={k} style={{ "--d": `${size}px` }}>
        <LegacyCircle logo={logo} name={name} size={size} rest="tinted" lit={isOpen || kin} />
      </span>
      <span className={s.coName} data-long={long || undefined} aria-hidden="true">
        {name}
      </span>
      {n >= 2 && (
        <span className={`${ui.meta} ${s.coCount}`} aria-hidden="true">
          {n} alumni
        </span>
      )}
    </button>
  );
}
