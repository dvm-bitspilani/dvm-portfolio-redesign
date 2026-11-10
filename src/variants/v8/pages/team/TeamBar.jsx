// The sticky bar every version shares: three controls, three verbs (research/v8-team-page.md
// §5.7). Team tabs LIGHT one team (the others dim, nothing leaves the page), years JUMP (a scroll
// index, not a filter), search NARROWS. The live count sits under it. Pieces a version doesn't
// use are left out: `tabs`, `years`, `search` (phones put the search in the page head instead).
import { TEAMS } from "./data";
import ui from "../../ui.module.css";
import sh from "./shared.module.css";

export function SearchField({ query, setQuery, onClear, placeholder = "Search names, roles, years", className = "" }) {
  return (
    <label className={`${sh.search} ${className}`}>
      <span className={ui.srOnly}>Search the team</span>
      <svg className={sh.searchGlyph} viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
        <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M10.8 10.8 14.5 14.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        className={`${ui.input} ${sh.searchInput}`}
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && query) {
            e.preventDefault();
            onClear();
          }
        }}
      />
    </label>
  );
}

/**
 * @param {{ barRef?: any, v?: string | null, onTeam?: (id: string | null) => void, tabs?: boolean,
 *   query?: string, setQuery?: (q: string) => void, onClear?: () => void, search?: boolean,
 *   years?: { list: number[], active: number, onJump: (y: number) => void, off?: Set<number> } | null,
 *   count: string, extra?: any, className?: string }} props
 */
export default function TeamBar({ barRef, v = null, onTeam, tabs = true, query = "", setQuery, onClear, search = true, years = null, count, extra = null, className = "" }) {
  return (
    <div ref={barRef} className={`${sh.bar} ${years ? "" : sh.barCompact} ${className}`} data-team-bar="">
      <div className={`${ui.wrap} ${sh.barGrid}`}>
        {tabs && (
          <div className={`${ui.tabs} ${sh.tabs}`} role="tablist" aria-label="Light one team">
            <button type="button" role="tab" className={ui.tab} aria-selected={!v} onClick={() => onTeam(null)} data-cursor="link">
              All
            </button>
            {TEAMS.map((t) => (
              <button key={t.id} type="button" role="tab" className={ui.tab} aria-selected={v === t.id} onClick={() => onTeam(v === t.id ? null : t.id)} data-cursor="link">
                {t.label}
              </button>
            ))}
          </div>
        )}
        {extra}
        {search && <SearchField query={query} setQuery={setQuery} onClear={onClear} className={sh.barSearch} />}
        <div className={sh.barFoot}>
          {years && (
            <nav className={sh.years} aria-label="Jump to a batch">
              {years.list.map((y) => (
                <button
                  key={y}
                  type="button"
                  className={sh.year}
                  aria-current={years.active === y ? "true" : undefined}
                  disabled={years.off?.has(y)}
                  onClick={() => years.onJump(y)}
                >
                  {y}
                </button>
              ))}
            </nav>
          )}
          <p className={sh.count} aria-live="polite">
            {count}
          </p>
        </div>
      </div>
    </div>
  );
}
