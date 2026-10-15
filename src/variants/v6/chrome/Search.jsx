// ⌘K / "/" — jump to any node. Results light up their neighbourhood in the graph as you
// move through them; Enter flies the camera there.
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { KIND_NAMES, routeFor } from "../graph/model";
import { P } from "../lib/paths";
import { useShell } from "../lib/hooks";
import s from "./chrome.module.css";

const ORDER = { fest: 0, vertical: 1, hub: 2, project: 3, year: 4, blog: 5, art: 6, member: 7, core: 8 };
const SUGGEST = ["fest:APOGEE", "fest:Oasis", "fest:BOSM", "vertical:design", "project:apogee-24-website", "journal", "year:2019", "archive"];

function score(n, q) {
  const label = n.label.toLowerCase();
  if (label === q) return 0;
  if (label.startsWith(q)) return 1;
  if (label.split(/[\s'’-]+/).some((w) => w.startsWith(q))) return 2;
  if (label.includes(q)) return 3;
  if (n.search.includes(q)) return 4;
  return -1;
}

export default function Search({ onClose }) {
  const { graph, preview, state } = useShell();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return SUGGEST.map((id) => graph.byId.get(id)).filter(Boolean);
    const terms = query.split(/\s+/);
    const out = [];
    for (const n of graph.nodes) {
      let total = 0;
      let ok = true;
      for (const t of terms) {
        const sc = score(n, t);
        if (sc < 0) {
          ok = false;
          break;
        }
        total += sc;
      }
      if (ok) out.push([total, ORDER[n.kind], n]);
    }
    out.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2].label.localeCompare(b[2].label));
    return out.slice(0, 14).map((r) => r[2]);
  }, [q, graph]);

  useEffect(() => {
    inputRef.current?.focus();
    return () => preview(null);
  }, [preview]);

  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    const n = results[active];
    preview(n ? n.id : null);
    listRef.current?.querySelector(`[data-k="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, results, preview]);

  const go = (n) => {
    if (!n) return;
    const to = state.route === "legacy" && n.kind !== "hub" && n.kind !== "core" ? `/legacy?n=${encodeURIComponent(n.id)}` : routeFor(n);
    onClose();
    navigate(P(to));
  };

  const onKey = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(results[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "Tab") {
      e.preventDefault();
    }
  };

  return (
    <div className={s.searchLayer} onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={s.searchBox} role="dialog" aria-modal="true" aria-label="Find a node">
        <div className={s.searchField}>
          <svg viewBox="0 0 20 20" aria-hidden="true" className={s.searchIcon}>
            <circle cx="8.5" cy="8.5" r="5.5" />
            <path d="M13 13l4.5 4.5" />
          </svg>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="Projects, people, fests, years, posts…"
            role="combobox"
            aria-expanded="true"
            aria-controls="v6-search-list"
            aria-activedescendant={results[active] ? `v6-opt-${active}` : undefined}
            aria-autocomplete="list"
            spellCheck={false}
          />
          <kbd className={s.kbd}>Esc</kbd>
        </div>
        <ul id="v6-search-list" role="listbox" className={s.results} ref={listRef} aria-label={q ? "Matches" : "Suggestions"}>
          {!q && <li className={s.resultsHead} role="presentation">Try one of these</li>}
          {results.map((n, k) => (
            <li
              key={n.id}
              id={`v6-opt-${k}`}
              data-k={k}
              role="option"
              aria-selected={k === active}
              className={s.result}
              onPointerMove={() => setActive(k)}
              onClick={() => go(n)}
            >
              <span className={s.resultKind} data-kind={n.kind}>{KIND_NAMES[n.kind]}</span>
              <span className={s.resultText}>
                <span className={s.resultLabel}>{n.label}</span>
                <span className={s.resultSub}>{n.sub}</span>
              </span>
            </li>
          ))}
          {q && !results.length && (
            <li className={s.empty} role="presentation">
              Nothing called “{q}”. Try a fest, a year, or part of someone’s name.
            </li>
          )}
        </ul>
        <p className={s.searchHint}>
          <span><kbd className={s.kbd}>↑</kbd><kbd className={s.kbd}>↓</kbd> move</span>
          <span><kbd className={s.kbd}>Enter</kbd> fly there</span>
          <span>{graph.nodes.length - 1} nodes</span>
        </p>
      </div>
    </div>
  );
}
