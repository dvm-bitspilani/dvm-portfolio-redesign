// /artwork — the gallery hub; each piece is linked to the member who made it.
import { useShell } from "../lib/hooks";
import Panel, { panelStyles as s } from "./Panel";
import NodeDetail, { ArtGrid } from "./NodeDetail";

export default function ArtworkPanel() {
  const { state, graph } = useShell();
  if (state.selectedNode) return <NodeDetail node={state.selectedNode} />;
  const art = graph.nodes.filter((n) => n.kind === "art");
  const artists = new Set(art.map((n) => n.art.artist)).size;
  return (
    <Panel kicker={`${art.length} pieces by ${artists} members`} title="Artwork">
      <p className={s.body}>Illustration, 3D and interface work by the design and video teams. Hover a piece to see who made it.</p>
      <ArtGrid nodes={art} />
    </Panel>
  );
}
