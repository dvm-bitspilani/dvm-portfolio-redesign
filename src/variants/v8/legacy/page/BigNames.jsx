// /alumni · the head's wall of big names (research/v8-alumni-page-r3.md §3.4): the tier-1 companies
// (alumniData TIER1, the list the home leads with) in the sector panels' frame, so the page says in
// five seconds where DVM's alumni work. Each plate is the page's one company disc (CompanyDisc) and
// behaves exactly like the map's: hover / focus branches its people out of it, click pins them.
// Google and Samsung are merged entries (several company ids): their branch lists everyone at any.
import { TIER1 } from "../alumniData";
import { useMedia } from "../../lib/hooks";
import CompanyDisc from "./CompanyDisc";
import s from "./legacyPage.module.css";

export default function BigNames() {
  const wide = useMedia("(min-width: 760px)");
  const D = wide ? 56 : 48;
  return (
    <div className={s.names} data-reveal data-cursor="dot">
      <ul className={s.namesGrid} aria-label="Best-known companies">
        {TIER1.map((t, k) => (
          <li key={t.id} className={s.plate} style={{ "--k": k }}>
            <CompanyDisc k={`wall:${t.id}`} ids={t.ids} name={t.name} logo={t.logo} n={t.count} size={D} variant="wall" />
          </li>
        ))}
      </ul>
    </div>
  );
}
