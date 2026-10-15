// /legacy — the same nodes re-flowed onto a spiral time axis that unwinds from the mark.
import { useShell } from "../lib/hooks";
import Panel, { NodeLink, panelStyles as s } from "./Panel";
import NodeDetail from "./NodeDetail";

export default function LegacyPanel() {
  const { state, graph } = useShell();
  if (state.selectedNode) return <NodeDetail node={state.selectedNode} />;
  return (
    <Panel kicker={`${graph.years[0].year} to ${graph.years[graph.years.length - 1].year}`} title="Legacy">
      <p className={s.body}>
        The same network, re-arranged by time. The spiral starts at the mark with our earliest batch and winds outward one year per turn of copper; each year gathers what shipped, who joined, and what was written and drawn.
      </p>
      <ol className={s.years}>
        {graph.years.map((y) => {
          const items = graph.nodes.filter((n) => n.year === y.year && n.kind !== "year");
          const projects = items.filter((n) => n.kind === "project");
          const joined = items.filter((n) => n.kind === "member").length;
          const other = items.filter((n) => n.kind === "blog" || n.kind === "art").length;
          return (
            <li key={y.id}>
              <NodeLink node={y} className={s.yearRow}>
                <span className={s.yearNum}>{y.year}</span>
                <span className={s.rowText}>
                  <span className={s.rowTitle}>
                    {projects.length ? projects.slice(0, 2).map((p) => p.label).join(", ") + (projects.length > 2 ? ` and ${projects.length - 2} more` : "") : "No projects on record"}
                  </span>
                  <span className={s.rowMeta}>
                    {[joined && `${joined} joined`, other && `${other} posts and artworks`].filter(Boolean).join(", ") || "Quiet year"}
                  </span>
                </span>
              </NodeLink>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}
