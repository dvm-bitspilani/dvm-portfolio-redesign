// /blog — the journal hub and its posts, each wired to its author on the team side.
import { useShell } from "../lib/hooks";
import Panel, { NodeLink, panelStyles as s } from "./Panel";
import NodeDetail from "./NodeDetail";

export default function BlogPanel() {
  const { state, graph } = useShell();
  if (state.selectedNode) return <NodeDetail node={state.selectedNode} />;
  const posts = graph.nodes.filter((n) => n.kind === "blog").sort((a, b) => b.blog.isoDate.localeCompare(a.blog.isoDate));
  return (
    <Panel kicker={`${posts.length} posts`} title="Blogs">
      <p className={s.body}>Write-ups by members on how things were built. The lines leaving each post run to its author.</p>
      <ul className={s.posts}>
        {posts.map((n) => (
          <li key={n.id}>
            <NodeLink node={n} className={s.post}>
              <span className={s.postCover}><img src={n.blog.cover} alt="" loading="lazy" decoding="async" /></span>
              <span className={s.rowText}>
                <span className={s.rowTitle}>{n.blog.title}</span>
                <span className={s.rowMeta}>{n.blog.authors.join(" and ")}, {n.blog.date}, {n.blog.readMinutes} min</span>
              </span>
            </NodeLink>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
