// Derived, real content for the board (src/immersive/data). Nothing here is invented except
// the fest calendar estimate below, which is flagged as such in the UI.
import { projects, team, blogs, artworks, verticals, fests, site, socials } from "../../../immersive/data";

export { projects, team, blogs, artworks, verticals, fests, site, socials };

export const projectsSorted = [...projects].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
export const projectBySlug = new Map(projects.map((p) => [p.slug, p]));
export const blogsSorted = [...blogs].sort((a, b) => (a.isoDate < b.isoDate ? 1 : -1));
export const latestBlog = blogsSorted[0];

export const KIND_LABEL = { website: "Website", app: "App", portal: "Portal", video: "Film" };
export const VERTICAL_LABEL = Object.fromEntries(verticals.map((v) => [v.id, v.label]));
export const VERTICAL_NAME = Object.fromEntries(verticals.map((v) => [v.id, v.name]));

/** Projects per year, every year from the first to the last (zero years stay in: 2023 has none on record). */
export const years = (() => {
  const ys = projects.map((p) => p.year).filter(Boolean);
  const lo = Math.min(...ys);
  const hi = Math.max(...ys);
  const out = [];
  for (let y = lo; y <= hi; y++) {
    const list = projects.filter((p) => p.year === y);
    out.push({
      year: y,
      count: list.length,
      films: list.filter((p) => p.kind === "video").length,
      builds: list.filter((p) => p.kind !== "video").length,
      list,
    });
  }
  return out;
})();

export const batches = (() => {
  const m = new Map();
  for (const t of team) if (t.batch) m.set(t.batch, (m.get(t.batch) || 0) + 1);
  return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([batch, count]) => ({ batch, count }));
})();

export const STATS = [
  { id: "users", value: 5000, suffix: "+", label: "users on our apps and sites during a fest", short: "users" },
  { id: "projects", value: projects.length, suffix: "", label: "projects on record", short: "projects" },
  { id: "members", value: team.length, suffix: "", label: "members since 2017", short: "members" },
  { id: "teams", value: verticals.length, suffix: "", label: "teams", short: "teams" },
];

/** Team pulse order: position holders first (they carry a designation), then everyone else, interleaved by team. */
export const pulseMembers = (() => {
  const por = team.filter((m) => m.designation);
  const rest = team.filter((m) => !m.designation);
  const out = [];
  const n = Math.max(por.length, rest.length);
  for (let i = 0; i < n; i++) {
    if (por[i]) out.push(por[i]);
    if (rest[i * 2]) out.push(rest[i * 2]);
  }
  return out;
})();

/** Artwork of the day: one piece per calendar day (IST), cycling through the collection. */
export function artworkOfDay(now = Date.now()) {
  const day = Math.floor((now + 5.5 * 3600e3) / 86400e3);
  return artworks[day % artworks.length];
}

// ---- Fest calendar ---------------------------------------------------------------------------
// ASSUMPTION: the fest dates are not in the data layer and are announced every year, so the board
// estimates them from recent editions: BOSM opens around the third week of September (5 days),
// Oasis around 31 October (4 days, "96 hours"), APOGEE around the first week of April (3 days).
// The countdown is labelled "est." in the UI. Times are midnight IST.
export const FEST_CALENDAR = [
  { id: "BOSM", month: 9, day: 18, days: 5, kind: "Sports" },
  { id: "Oasis", month: 10, day: 31, days: 4, kind: "Cultural" },
  { id: "APOGEE", month: 4, day: 3, days: 3, kind: "Technical" },
];
const IST = 5.5 * 3600e3;
const istMidnight = (y, m, d) => Date.UTC(y, m - 1, d) - IST;

/** Every fest's current/next window relative to `now`, sorted by start. */
export function festWindows(now = Date.now()) {
  const y = new Date(now + IST).getUTCFullYear();
  return FEST_CALENDAR.map((f) => {
    for (const yy of [y - 1, y, y + 1]) {
      const start = istMidnight(yy, f.month, f.day);
      const end = start + f.days * 86400e3;
      if (end > now) return { ...f, start, end, live: now >= start, year: yy };
    }
    return null;
  })
    .filter(Boolean)
    .sort((a, b) => a.start - b.start);
}

/** The fest the countdown points at (a live one wins), plus the previous edition for the progress bar. */
export function nextFest(now = Date.now()) {
  const list = festWindows(now);
  const live = list.find((f) => f.live);
  const next = live || list[0];
  // previous fest end = the latest end before now (any fest, any year)
  let prevEnd = -Infinity;
  const y = new Date(now + IST).getUTCFullYear();
  for (const f of FEST_CALENDAR)
    for (const yy of [y - 1, y]) {
      const e = istMidnight(yy, f.month, f.day) + f.days * 86400e3;
      if (e <= now && e > prevEnd) prevEnd = e;
    }
  const span = next.start - prevEnd;
  const progress = next.live ? 1 : Math.max(0, Math.min(1, (now - prevEnd) / span));
  return { ...next, progress };
}

export const festInfo = Object.fromEntries(fests.map((f) => [f.id, f]));
export const festProjectCount = (id) => projects.filter((p) => p.fest === id).length;

export function istParts(now = Date.now()) {
  const d = new Date(now + IST);
  const p2 = (n) => String(n).padStart(2, "0");
  return {
    hh: p2(d.getUTCHours()),
    mm: p2(d.getUTCMinutes()),
    ss: p2(d.getUTCSeconds()),
    date: d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }),
    hourFrac: (d.getUTCHours() + d.getUTCMinutes() / 60) / 24,
  };
}

export function splitDuration(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}
