// /team — the people cluster: five teams, each member on its team's batch ring.
import { useShell } from "../lib/hooks";
import Panel, { NodeLink, Section, panelStyles as s } from "./Panel";
import NodeDetail from "./NodeDetail";

export default function TeamPanel() {
  const { state, graph } = useShell();
  if (state.selectedNode) return <NodeDetail node={state.selectedNode} />;
  const verts = graph.nodes.filter((n) => n.kind === "vertical");
  const members = graph.nodes.filter((n) => n.kind === "member");
  const heads = members.filter((m) => m.member.designation).sort((a, b) => b.member.batch - a.member.batch || a.label.localeCompare(b.label));
  return (
    <Panel kicker={`${members.length} members, ${verts.length} teams`} title="Team">
      <p className={s.body}>
        Each team is a small solar system. Its members sit on rings by batch: the newest batch closest in, alumni further out.
      </p>
      <ul className={s.teams}>
        {verts.map((v) => {
          const ms = members.filter((m) => m.parent === v.i);
          const batches = [...new Set(ms.map((m) => m.member.batch))].sort();
          return (
            <li key={v.id}>
              <NodeLink node={v} className={s.team}>
                <span className={s.teamHead}>
                  <span className={s.teamName}>{v.label}</span>
                  <span className={s.count}>{ms.length}</span>
                </span>
                <span className={s.teamDesc}>{v.vertical.description}</span>
                <span className={s.rowMeta}>Batches {batches[0]} to {batches[batches.length - 1]}</span>
              </NodeLink>
            </li>
          );
        })}
      </ul>
      <Section title="Coordinators and heads" count={heads.length}>
        <ul className={s.list}>
          {heads.map((m) => (
            <li key={m.id}>
              <NodeLink node={m} className={s.rowThumb}>
                <span className={`${s.thumb} ${s.thumbRound}`}><img src={m.member.photo} alt="" loading="lazy" decoding="async" /></span>
                <span className={s.rowText}>
                  <span className={s.rowTitle}>{m.label}</span>
                  <span className={s.rowMeta}>{m.member.designation}</span>
                </span>
              </NodeLink>
            </li>
          ))}
        </ul>
      </Section>
    </Panel>
  );
}
