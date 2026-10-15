// /about — the mark and the three sections closest to it.
import { site, socials, stats } from "../../../immersive/data";
import { useShell } from "../lib/hooks";
import Panel, { NodeLink, Section, panelStyles as s } from "./Panel";
import NodeDetail from "./NodeDetail";

const ext = { target: "_blank", rel: "noreferrer noopener" };
const SHOW = ["users on our apps and websites", "websites, apps & portals in the archive", "teasers, promos & curtain raisers", "members on record", "batches"];

export default function AboutPanel() {
  const { state, graph } = useShell();
  if (state.selectedNode) return <NodeDetail node={state.selectedNode} />;
  const verts = graph.nodes.filter((n) => n.kind === "vertical");
  const fests = graph.nodes.filter((n) => n.kind === "fest" && n.id !== "fest:Campus");
  return (
    <Panel kicker={`${site.fullName}, ${site.institution}`} title={site.headline}>
      {site.about.map((p) => (
        <p key={p.slice(0, 20)} className={s.body}>{p}</p>
      ))}
      <dl className={s.stats}>
        {SHOW.map((label) => {
          const st = stats.find((x) => x.label === label);
          return st ? (
            <div key={label}>
              <dt>{st.label.replace("&", "and")}</dt>
              <dd>{st.display}</dd>
            </div>
          ) : null;
        })}
      </dl>
      <Section title="The three fests">
        <ul className={s.tags}>
          {fests.map((f) => (
            <li key={f.id}><NodeLink node={f} className={s.chip} /></li>
          ))}
        </ul>
      </Section>
      <Section title="The five teams">
        <ul className={s.tags}>
          {verts.map((v) => (
            <li key={v.id}><NodeLink node={v} className={s.chip} /></li>
          ))}
        </ul>
      </Section>
      <Section title="Elsewhere">
        <div className={s.links}>
          {socials.map((x) => (
            <a key={x.id} href={x.url} {...ext} className={s.btn}>{x.label}</a>
          ))}
        </div>
      </Section>
    </Panel>
  );
}
