// The team, inside the expanded team-pulse tile. ?team=<vertical> and ?batch=<year> filter.
import { useSearchParams } from "react-router-dom";
import Page from "./Page";
import { team, verticals, batches, VERTICAL_LABEL } from "../lib/data";
import p from "./pages.module.css";

const SOCIAL_LABEL = { github: "GitHub", linkedin: "LinkedIn", instagram: "Instagram", twitter: "Twitter", dribbble: "Dribbble", behance: "Behance", facebook: "Facebook" };
const sorted = [...team].sort((a, b) => b.batch - a.batch || (b.designation ? 1 : 0) - (a.designation ? 1 : 0) || a.name.localeCompare(b.name));

export default function TeamPage() {
  const [params, setParams] = useSearchParams();
  const v = params.get("team");
  const batch = Number(params.get("batch")) || null;
  const set = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true, preventScrollReset: true });
  };
  const list = sorted.filter((m) => (!v || m.vertical === v) && (!batch || m.batch === batch));
  return (
    <Page id="team" label="Team pulse" title="The team" readout={`${list.length} of ${team.length}`}>
      <p className={p.lead}>Everyone who has worked in DVM since 2017, by team and by the year they joined.</p>
      <div className={p.filters} role="group" aria-label="Filter members">
        <div className={p.filterGroup}>
          <button type="button" className={p.chip} aria-pressed={!v} onClick={() => set("team", null)}>
            All teams
          </button>
          {verticals.map((x) => (
            <button key={x.id} type="button" className={p.chip} aria-pressed={v === x.id} onClick={() => set("team", v === x.id ? null : x.id)}>
              {x.label}
            </button>
          ))}
        </div>
        <div className={p.filterGroup}>
          {batches.map((b) => (
            <button key={b.batch} type="button" className={p.chip} aria-pressed={batch === b.batch} onClick={() => set("batch", batch === b.batch ? null : String(b.batch))}>
              {b.batch}
            </button>
          ))}
        </div>
      </div>
      {list.length ? (
        <ul className={p.members} style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {list.map((m) => (
            <li key={m.slug} className={p.member}>
              <img className={p.memberPhoto} src={m.photo} alt="" loading="lazy" decoding="async" />
              <div className={p.memberBody}>
                <p className={p.memberName}>{m.name}</p>
                <p className={p.memberMeta}>
                  {VERTICAL_LABEL[m.vertical]}, {m.batch}
                </p>
                {m.designation && <p className={p.memberRole}>{m.designation}</p>}
                <div className={p.socials}>
                  {Object.entries(m.socials).map(([k, url]) => (
                    <a key={k} href={url} target="_blank" rel="noreferrer" aria-label={`${m.name} on ${SOCIAL_LABEL[k] || k}`}>
                      {SOCIAL_LABEL[k] || k}
                    </a>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className={p.empty}>
          No members match.{" "}
          <button type="button" className={p.chip} onClick={() => setParams({}, { replace: true })}>
            Clear filters
          </button>
        </p>
      )}
    </Page>
  );
}
