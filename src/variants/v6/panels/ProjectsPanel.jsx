// /projects — the project cluster: fests with their projects orbiting. /projects/:name and
// /projects?n=fest:… focus one node and show its detail.
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useShell } from "../lib/hooks";
import Panel, { NodeLink, Section, panelStyles as s } from "./Panel";
import NodeDetail, { ProjectRows } from "./NodeDetail";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "web", label: "Sites, apps, portals" },
  { id: "video", label: "Films" },
];

export default function ProjectsPanel() {
  const { state, graph } = useShell();
  const { name } = useParams();
  const [filter, setFilter] = useState("all");
  const fests = useMemo(() => graph.nodes.filter((n) => n.kind === "fest"), [graph]);
  if (state.selectedNode) return <NodeDetail node={state.selectedNode} />;
  if (name) {
    return (
      <Panel kicker="Projects" title="Not on the map">
        <p className={s.body}>There is no project at this address. Every project DVM has shipped is in the list on the Projects page.</p>
      </Panel>
    );
  }
  const keep = (n) => filter === "all" || (filter === "video" ? n.project.kind === "video" : n.project.kind !== "video");
  const total = graph.nodes.filter((n) => n.kind === "project").filter(keep).length;
  return (
    <Panel kicker={`${total} projects, ${fests.length} orbits`} title="Projects">
      <p className={s.body}>
        Every site, app, portal and film DVM has shipped circles the fest it was made for: websites and apps on the inner ring, films outside.
      </p>
      <div className={s.filters} role="group" aria-label="Show">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" className={s.filter} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </div>
      {fests.map((f) => {
        const list = graph.nodes
          .filter((n) => n.parent === f.i)
          .filter(keep)
          .sort((a, b) => (b.year || 0) - (a.year || 0) || a.label.localeCompare(b.label));
        if (!list.length) return null;
        return (
          <Section key={f.id} title={<NodeLink node={f} className={s.h2Link} />} count={list.length}>
            <ProjectRows nodes={list} />
          </Section>
        );
      })}
    </Panel>
  );
}
