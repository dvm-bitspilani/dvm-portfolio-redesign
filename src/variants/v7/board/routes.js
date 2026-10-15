// The board's tile system. Each route is an arrangement of the same twelve tiles:
// one primary tile expands into the page, optional companions stay at board size beside it,
// and every other tile shrinks into the side rail.
import { P, BASE } from "../lib/paths";

/** Canonical (reading) order on the home board. `route` = where the tile expands to. */
export const TILES = [
  { id: "mark", label: "DVM", route: "about" },
  { id: "clock", label: "Pilani time", route: "about" },
  { id: "stats", label: "By the numbers", route: "about" },
  { id: "team", label: "Team pulse", route: "team" },
  { id: "art", label: "Artwork of the day", route: "artwork" },
  { id: "blog", label: "Latest post", route: "blog" },
  { id: "ticker", label: "Now shipping", route: "projects" },
  { id: "fests", label: "Fests", route: "about" },
  { id: "map", label: "Campus", route: "contactus" },
  { id: "legacy", label: "Projects per year", route: "legacy" },
  { id: "archive", label: "Archive", route: "archive" },
  { id: "contact", label: "Contact", route: "contactus" },
];
export const TILE = Object.fromEntries(TILES.map((t) => [t.id, t]));

export const ROUTES = {
  about: { primary: "mark", companions: ["clock", "stats", "fests"], title: "About" },
  projects: { primary: "ticker", companions: [], title: "Projects" },
  legacy: { primary: "legacy", companions: [], title: "Our legacy" },
  team: { primary: "team", companions: [], title: "Team" },
  blog: { primary: "blog", companions: [], title: "Blog" },
  artwork: { primary: "art", companions: [], title: "Artwork" },
  archive: { primary: "archive", companions: [], title: "Archive" },
  contactus: { primary: "contact", companions: ["map"], split: 12, title: "Contact" },
};

/** pathname → { key, sub } ('home' for the board), or null for an unknown path. */
export function parsePath(pathname) {
  const rest = pathname.replace(/\/+$/, "").slice(BASE.length).replace(/^\/+/, "");
  if (!rest) return { key: "home", sub: null };
  const [key, sub, extra] = rest.split("/");
  if (!ROUTES[key] || extra !== undefined) return null;
  if (sub !== undefined && key !== "projects") return null;
  return { key, sub: sub ? decodeURIComponent(sub) : null };
}

export const routeHref = (key) => (key === "home" ? P("/") : P(`/${key}`));

// ---- placements ------------------------------------------------------------------------------
// Desktop: a 24-column grid. Home has five rows (the ticker is a thin strip across the middle);
// routes use twelve row units so the rail can be split evenly whatever its tile count.
const HOME = {
  rows: "minmax(0,1fr) minmax(0,1fr) 46px minmax(0,.82fr) minmax(0,.82fr)",
  place: {
    mark: [1, 9, 1, 3],
    clock: [9, 15, 1, 2],
    stats: [15, 25, 1, 2],
    team: [9, 15, 2, 3],
    art: [15, 19, 2, 3],
    blog: [19, 25, 2, 3],
    ticker: [1, 25, 3, 4],
    fests: [1, 9, 4, 6],
    map: [9, 15, 4, 6],
    legacy: [15, 21, 4, 5],
    archive: [15, 21, 5, 6],
    contact: [21, 25, 4, 6],
  },
};

// Mobile: a two-column stack. [span] for the home board.
const MOBILE_HOME_SPAN = { mark: 2, clock: 2, stats: 2, ticker: 2, team: 1, art: 1, blog: 2, fests: 2, map: 1, legacy: 1, archive: 1, contact: 1 };

const area = ([c0, c1, r0, r1]) => ({ gridColumn: `${c0} / ${c1}`, gridRow: `${r0} / ${r1}` });

/**
 * → { rows, roles: {id: 'home'|'primary'|'companion'|'rail'}, style: {id: CSSProperties} }
 */
export function computeLayout(view, mobile) {
  const roles = {};
  const style = {};
  if (view.key === "home") {
    for (const t of TILES) {
      roles[t.id] = "home";
      style[t.id] = mobile ? { gridColumn: `span ${MOBILE_HOME_SPAN[t.id]}` } : area(HOME.place[t.id]);
    }
    return { rows: mobile ? undefined : HOME.rows, roles, style };
  }

  const r = ROUTES[view.key];
  const companions = r.companions;
  const rail = TILES.filter((t) => t.id !== r.primary && !companions.includes(t.id)).map((t) => t.id);
  roles[r.primary] = "primary";
  companions.forEach((id) => (roles[id] = "companion"));
  rail.forEach((id) => (roles[id] = "rail"));

  if (mobile) {
    style[r.primary] = { gridColumn: "1 / -1", order: 0 };
    companions.forEach((id, i) => (style[id] = { gridColumn: "1 / -1", order: 1 + i }));
    const others = rail.filter((id) => id !== "ticker");
    if (rail.includes("ticker")) style.ticker = { gridColumn: "1 / -1", order: 10 };
    others.forEach((id, i) => {
      const lastOdd = i === others.length - 1 && others.length % 2 === 1;
      style[id] = { gridColumn: lastOdd ? "1 / -1" : "span 1", order: 11 + i };
    });
    return { rows: undefined, roles, style };
  }

  const U = 12;
  const split = companions.length ? r.split || 15 : 19;
  style[r.primary] = area([1, split, 1, U + 1]);
  companions.forEach((id, i) => {
    const per = U / companions.length;
    style[id] = area([split, 19, 1 + i * per, 1 + (i + 1) * per]);
  });

  // rail: the ticker (if present) gets a thin full-width row, the rest go two per row.
  const hasTicker = rail.includes("ticker");
  const others = rail.filter((id) => id !== "ticker");
  const pairRows = Math.ceil(others.length / 2);
  let units = U - (hasTicker ? 1 : 0);
  const rowUnits = Array.from({ length: pairRows }, (_, i) => Math.floor(units / pairRows) + (i < units % pairRows ? 1 : 0));
  let row = 1;
  if (hasTicker) {
    style.ticker = area([19, 25, 1, 2]);
    row = 2;
  }
  others.forEach((id, i) => {
    const pr = Math.floor(i / 2);
    const r0 = row + rowUnits.slice(0, pr).reduce((a, b) => a + b, 0);
    const r1 = r0 + rowUnits[pr];
    const lastOdd = i === others.length - 1 && others.length % 2 === 1;
    const c = lastOdd ? [19, 25] : i % 2 === 0 ? [19, 22] : [22, 25];
    style[id] = area([c[0], c[1], r0, r1]);
  });
  return { rows: `repeat(${U}, minmax(0,1fr))`, roles, style };
}
