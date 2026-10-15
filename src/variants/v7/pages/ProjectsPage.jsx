// Projects, inside the expanded "Now shipping" tile. Filters live in the URL (?fest=&kind=).
import { Link, useSearchParams } from "react-router-dom";
import Page from "./Page";
import { projectsSorted, KIND_LABEL } from "../lib/data";
import { P } from "../lib/paths";
import p from "./pages.module.css";

const FESTS = ["APOGEE", "BOSM", "Oasis", "Campus"].filter((f) => projectsSorted.some((x) => x.fest === f));
const KINDS = [
  { id: "builds", label: "Websites and apps", test: (x) => x.kind !== "video" },
  { id: "films", label: "Films", test: (x) => x.kind === "video" },
];

export default function ProjectsPage() {
  const [params, setParams] = useSearchParams();
  const fest = params.get("fest");
  const kind = params.get("kind");
  const set = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true, preventScrollReset: true });
  };
  const list = projectsSorted.filter((x) => (!fest || x.fest === fest) && (!kind || KINDS.find((k) => k.id === kind)?.test(x)));
  return (
    <Page id="ticker" label="Now shipping" title="Projects" readout={`${list.length} of ${projectsSorted.length}`}>
      <p className={p.lead}>Websites, apps, portals and films for BOSM, Oasis and APOGEE, newest first.</p>
      <div className={p.filters} role="group" aria-label="Filter projects">
        <div className={p.filterGroup}>
          <button type="button" className={p.chip} aria-pressed={!fest} onClick={() => set("fest", null)}>
            All fests
          </button>
          {FESTS.map((f) => (
            <button key={f} type="button" className={p.chip} aria-pressed={fest === f} onClick={() => set("fest", fest === f ? null : f)}>
              {f}
            </button>
          ))}
        </div>
        <div className={p.filterGroup}>
          {KINDS.map((k) => (
            <button key={k.id} type="button" className={p.chip} aria-pressed={kind === k.id} onClick={() => set("kind", kind === k.id ? null : k.id)}>
              {k.label}
            </button>
          ))}
        </div>
      </div>
      {list.length ? (
        <div className={p.cards}>
          {list.map((x) => (
            <Link
              key={x.slug}
              to={P(`/projects/${x.slug}`)}
              className={p.card}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                // shared-element morph: this cover becomes the detail page's hero
                document.querySelectorAll("[data-cover]").forEach((el) => (el.style.viewTransitionName = ""));
                const media = e.currentTarget.querySelector("[data-cover]");
                if (media) media.style.viewTransitionName = "v7-cover";
              }}
            >
              <div className={p.cardMedia} data-cover="">
                {x.cover ? <img src={x.cover} alt="" loading="lazy" decoding="async" /> : <span className={p.cardType}>{x.title}</span>}
              </div>
              <div className={p.cardBody}>
                <h2 className={p.cardTitle}>{x.title}</h2>
                <p className={p.cardMeta}>
                  {x.fest}, {KIND_LABEL[x.kind]}
                  {x.year ? `, ${x.year}` : ""}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className={p.empty}>
          Nothing on record for this filter.{" "}
          <button type="button" className={p.chip} onClick={() => setParams({}, { replace: true })}>
            Clear filters
          </button>
        </p>
      )}
    </Page>
  );
}
