// Projects: a file explorer over all 41 projects. Library / fest sidebar, grid or list
// view (sortable columns), search, keyboard selection and a preview pane. Double-click
// (or Enter, or a tap on phones) opens the project in its own window.
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, ChevronRight, FolderOpen, Globe, LayoutGrid, List, Play, Search, Smartphone, Sparkles, Film, LayoutPanelTop } from "lucide-react";
import { projects, verticals } from "../../../immersive/data";
import { rectOf, useOs } from "../os/shell";
import { usePref } from "../lib/hooks";
import a from "./app.module.css";
import s from "./projects.module.css";

const KIND = { website: "Website", app: "App", portal: "Portal", video: "Film" };
const KIND_ICON = { website: Globe, app: Smartphone, portal: LayoutPanelTop, video: Film };
const FESTS = ["APOGEE", "BOSM", "Oasis", "Campus"];
const vlabel = (id) => verticals.find((v) => v.id === id)?.label ?? id;

const FILTERS = [
  { id: "all", label: "All projects", icon: FolderOpen, test: () => true },
  { id: "featured", label: "Featured", icon: Sparkles, test: (p) => p.featured },
  ...Object.keys(KIND).map((k) => ({ id: `kind:${k}`, label: `${KIND[k]}s`, icon: KIND_ICON[k], test: (p) => p.kind === k })),
  ...FESTS.map((f) => ({ id: `fest:${f}`, label: f, test: (p) => p.fest === f })),
];

export function Thumb({ p, className = "" }) {
  if (p.cover)
    return (
      <span className={`${s.thumb} ${className}`}>
        <img src={p.cover} alt="" loading="lazy" decoding="async" />
        {p.kind === "video" && (
          <span className={s.play} aria-hidden="true">
            <Play size={14} fill="currentColor" />
          </span>
        )}
      </span>
    );
  return (
    <span className={`${s.thumb} ${s.typeset} ${className}`} aria-hidden="true">
      <span className={s.tsFest}>{p.fest}</span>
      <span className={s.tsKind}>{KIND[p.kind]}</span>
    </span>
  );
}

export function externalLinks(p) {
  const out = [];
  if (p.links.live) out.push({ label: "Visit site", href: p.links.live });
  if (p.links.playStore) out.push({ label: "Play Store", href: p.links.playStore });
  if (p.links.youtube) out.push({ label: "Watch on YouTube", href: p.links.youtube });
  return out;
}

function Projects({ props }) {
  const { launch, phone } = useOs();
  const [filter, setFilter] = useState(props?.filter ?? "all");
  const [view, setView] = usePref("v4-projects-view", "grid");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState({ key: "year", dir: -1 });
  const [sel, setSel] = useState(phone ? null : "apogee-25-website");
  const listRef = useRef(null);

  useEffect(() => {
    if (props?.filter) setFilter(props.filter);
  }, [props?.filter, props?.nonce]);

  const f = FILTERS.find((x) => x.id === filter) ?? FILTERS[0];
  const items = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = projects.filter(f.test).filter((p) => !query || `${p.title} ${p.fest} ${p.year ?? ""} ${p.theme ?? ""} ${KIND[p.kind]}`.toLowerCase().includes(query));
    const val = (p) => (sort.key === "name" ? p.title.toLowerCase() : sort.key === "fest" ? p.fest : sort.key === "kind" ? p.kind : (p.year ?? 0));
    return [...list].sort((x, y) => (val(x) < val(y) ? -1 : val(x) > val(y) ? 1 : 0) * sort.dir || x.title.localeCompare(y.title));
  }, [f, q, sort]);
  const selected = items.find((p) => p.slug === sel) ?? null;

  const open = (p, el) => launch("project", p.slug, { origin: rectOf(el?.querySelector?.("img, span") ?? el) });
  const count = (flt) => projects.filter(flt.test).length;

  const onKey = (e) => {
    if (!items.length) return;
    const i = Math.max(0, items.findIndex((p) => p.slug === sel));
    let cols = 1;
    if (view === "grid" && listRef.current) {
      const kids = [...listRef.current.children];
      const top = kids[0]?.offsetTop;
      cols = Math.max(1, kids.filter((k) => k.offsetTop === top).length);
    }
    let n = null;
    if (e.key === "ArrowRight" && view === "grid") n = i + 1;
    else if (e.key === "ArrowLeft" && view === "grid") n = i - 1;
    else if (e.key === "ArrowDown") n = sel ? i + cols : 0;
    else if (e.key === "ArrowUp") n = i - cols;
    else if (e.key === "Enter" && selected) {
      e.preventDefault();
      return open(selected, listRef.current.querySelector(`[data-slug="${selected.slug}"]`));
    }
    if (n == null) return;
    e.preventDefault();
    const p = items[Math.max(0, Math.min(items.length - 1, n))];
    setSel(p.slug);
    listRef.current.querySelector(`[data-slug="${p.slug}"]`)?.focus();
  };

  const sortBy = (key) => setSort((x) => ({ key, dir: x.key === key ? -x.dir : key === "year" ? -1 : 1 }));
  const th = (key, label) => (
    <button className={s.th} data-key={key} onClick={() => sortBy(key)} aria-sort={sort.key === key ? (sort.dir > 0 ? "ascending" : "descending") : undefined}>
      {label}
      {sort.key === key && <span className={s.arrow}>{sort.dir > 0 ? "↑" : "↓"}</span>}
    </button>
  );

  const pick = (p) => (e) => {
    setSel(p.slug);
    if (phone) open(p, e.currentTarget);
  };

  return (
    <div className={a.app}>
      <div className={a.split}>
        <nav className={a.side} aria-label="Locations">
          <div className={a.sideHead}>Library</div>
          {FILTERS.slice(0, 6).map((x) => (
            <button key={x.id} className={a.sideItem} aria-current={filter === x.id} onClick={() => setFilter(x.id)}>
              <x.icon />
              {x.label}
              <span className={a.count}>{count(x)}</span>
            </button>
          ))}
          <div className={a.sideHead}>Fests</div>
          {FILTERS.slice(6).map((x) => (
            <button key={x.id} className={a.sideItem} aria-current={filter === x.id} onClick={() => setFilter(x.id)}>
              <span className={s.festDot} data-fest={x.label} />
              {x.label}
              <span className={a.count}>{count(x)}</span>
            </button>
          ))}
        </nav>

        <div className={a.main}>
          <div className={a.chips}>
            {FILTERS.map((x) => (
              <button key={x.id} className={a.chipBtn} aria-current={filter === x.id} onClick={() => setFilter(x.id)}>
                {x.label}
              </button>
            ))}
          </div>
          <div className={a.toolbar}>
            <div className={a.crumbs}>
              DVM <ChevronRight /> Projects
              {filter !== "all" && (
                <>
                  <ChevronRight /> <b>{f.label}</b>
                </>
              )}
            </div>
            <label className={a.search}>
              <Search />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${f.label.toLowerCase()}`} aria-label="Search projects" />
            </label>
            <div className={a.seg} role="group" aria-label="View">
              <button className={a.segBtn} aria-pressed={view === "grid"} onClick={() => setView("grid")} aria-label="Grid view" title="Grid view">
                <LayoutGrid />
              </button>
              <button className={a.segBtn} aria-pressed={view === "list"} onClick={() => setView("list")} aria-label="List view" title="List view">
                <List />
              </button>
            </div>
          </div>

          <div className={a.split}>
            <div className={a.scroll} onKeyDown={onKey} onPointerDown={(e) => e.target === e.currentTarget && setSel(null)}>
              {items.length === 0 ? (
                <p className={a.empty}>No projects match “{q}”. Try a fest name or a year.</p>
              ) : view === "grid" ? (
                <div ref={listRef} className={s.grid} role="listbox" aria-label={f.label}>
                  {items.map((p) => (
                    <button
                      key={p.slug}
                      data-slug={p.slug}
                      role="option"
                      aria-selected={sel === p.slug}
                      tabIndex={sel === p.slug || (!sel && p === items[0]) ? 0 : -1}
                      className={s.tile}
                      onClick={pick(p)}
                      onDoubleClick={(e) => open(p, e.currentTarget)}
                    >
                      <Thumb p={p} />
                      <span className={s.name}>{p.title}</span>
                      <span className={s.meta}>
                        {p.year ?? "Undated"} {KIND[p.kind]}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className={s.table} role="grid" aria-label={f.label}>
                  <div className={s.thead} role="row">
                    {th("name", "Name")}
                    {th("fest", "Fest")}
                    {th("kind", "Kind")}
                    {th("year", "Year")}
                    <span className={s.th}>Teams</span>
                  </div>
                  <div ref={listRef} role="rowgroup">
                    {items.map((p) => (
                      <button
                        key={p.slug}
                        data-slug={p.slug}
                        role="row"
                        aria-selected={sel === p.slug}
                        tabIndex={sel === p.slug || (!sel && p === items[0]) ? 0 : -1}
                        className={s.tr}
                        onClick={pick(p)}
                        onDoubleClick={(e) => open(p, e.currentTarget)}
                      >
                        <span className={s.tdName}>
                          <Thumb p={p} className={s.mini} />
                          {p.title}
                        </span>
                        <span>{p.fest}</span>
                        <span>{KIND[p.kind]}</span>
                        <span className={s.mono}>{p.year ?? "–"}</span>
                        <span className={s.dim}>{p.verticals.map(vlabel).join(", ")}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <aside className={a.pane} aria-label="Preview">
              {selected ? (
                <div className={s.preview}>
                  <div className={s.pvImg}>
                    {selected.mockup ? <img src={selected.mockup} alt="" className={s.mock} /> : <Thumb p={selected} className={s.pvThumb} />}
                  </div>
                  <h2 className={s.pvTitle}>{selected.title}</h2>
                  {selected.theme && <p className={s.pvTheme}>“{selected.theme}”</p>}
                  {selected.summary && <p className={s.pvSum}>{selected.summary}</p>}
                  <dl className={`${a.kv} ${s.pvKv}`}>
                    <dt>Fest</dt>
                    <dd>{selected.fest}</dd>
                    <dt>Kind</dt>
                    <dd>{KIND[selected.kind]}</dd>
                    {selected.date && (
                      <>
                        <dt>Date</dt>
                        <dd>{selected.date}</dd>
                      </>
                    )}
                    <dt>Teams</dt>
                    <dd>{selected.verticals.map(vlabel).join(", ")}</dd>
                  </dl>
                  <div className={s.pvActions}>
                    <button className={a.btnPrimary} onClick={(e) => open(selected, e.currentTarget)}>
                      Open
                    </button>
                    {externalLinks(selected).slice(0, 1).map((l) => (
                      <a key={l.href} className={a.btn} href={l.href} target="_blank" rel="noreferrer">
                        {l.label} <ArrowUpRight />
                      </a>
                    ))}
                  </div>
                </div>
              ) : (
                <p className={s.pvEmpty}>Select a project to preview it. Double-click to open.</p>
              )}
            </aside>
          </div>

          <div className={a.status}>
            <span>
              {items.length} {items.length === 1 ? "item" : "items"}
            </span>
            {selected && <span>1 selected</span>}
            <span style={{ marginLeft: "auto" }}>{view === "grid" ? "Grid" : "List"} view</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(Projects);
