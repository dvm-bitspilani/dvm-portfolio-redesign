// /team: four versions to choose from (research/v8-team-page.md), picked by the visitor's "Team"
// knob (controls.ts: ?team=wall|credits|lineage|current, remembered in localStorage["v8:team"];
// the hub switcher shows it on this page). Each lives in pages/team/, sharing its data, URL
// state (?v= team, ?q= search, ?p= pinned member, ?b= batch from old links), the sticky bar, the
// dossier (detail panel) and the socials, which are always brand glyphs.
//   A · Wall     every face on one wall, batch by batch (team/Wall.jsx)
//   B · Credits  type-led film credits; the portrait follows the cursor (team/Credits.jsx)
//   C · Lineage  the five teams × eight batches on one board (team/Lineage.jsx)
//   Current      the hairline ledger, kept to compare (team/Current.jsx)
import { useV8Controls } from "../lib/fonts";
import Credits from "./team/Credits";
import Current from "./team/Current";
import Lineage from "./team/Lineage";
import Wall from "./team/Wall";

const VERSIONS = { wall: Wall, credits: Credits, lineage: Lineage, current: Current };

export default function TeamPage() {
  const { team } = useV8Controls();
  const Version = VERSIONS[team] ?? Wall;
  return <Version key={team} />;
}
