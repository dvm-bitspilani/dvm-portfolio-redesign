// The project catalogue behind /projects and /projects/:name: one entry per immersive record
// (src/immersive/data/projects.ts, the richer and cleaner source), in catalogue order. A record
// the base list (src/projects.json) also has keeps that row's pk as its id, so the original
// /projects/<pk> routes keep resolving; the rest use their slug. Only the record images under
// /assets/projects are ever referenced (never the base list's PNGs, never img.youtube.com).
import { fests, projects as records, team, verticals } from "../../../immersive/data";
import { redesignProjectHref } from "../../../immersive/kit/timeline/data";
import { P } from "./paths";

export const KIND_LABEL = { website: "Website", app: "App", portal: "Portal", video: "Film" };
const KIND_RANK = { website: 0, app: 1, portal: 2, video: 3 };

/** The team tabs, in tab order; id = the record's vertical id. */
export const TEAMS = [
  { id: "design", label: "Design" },
  { id: "frontend", label: "Frontend" },
  { id: "backend", label: "Backend" },
  { id: "video", label: "Video" },
  { id: "app", label: "AppDev" },
];
const TEAM_LABEL = Object.fromEntries(TEAMS.map((t) => [t.id, t.label]));

/** Screenshots too narrow to show (a few px wide sliver of a page). */
const SKIP = new Set([
  "/assets/projects/apogee-22-website/page-1.jpg",
  "/assets/projects/apogee-22-website/mobile-1.jpg",
  "/assets/projects/apogee-22-app/page-1.jpg",
]);
const usable = (src) => (src && !SKIP.has(src) ? src : null);

export const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

/** The way out: the live site (named by its host: several old fest links now serve the current
 *  year's site), the store listing, or the film on YouTube. */
function outOf(r) {
  if (r.links.live) return { url: r.links.live, label: hostOf(r.links.live) };
  if (r.links.playStore) return { url: r.links.playStore, label: "Google Play" };
  if (r.links.youtube) return { url: r.links.youtube, label: "YouTube" };
  return null;
}

function toEntry(r, i) {
  const base = redesignProjectHref(r);
  const id = base?.startsWith("/projects/") ? base.slice("/projects/".length) : r.slug;
  return {
    r,
    i,
    id,
    href: P(`/projects/${id}`),
    title: r.title,
    kind: KIND_LABEL[r.kind] ?? r.kind,
    isFilm: r.kind === "video",
    cover: r.cover ?? null,
    page: usable(r.gallery?.[0]),
    mobile: usable(r.mobileGallery?.[0]),
    mockup: r.mockup ?? null,
    out: outOf(r),
    season: r.year ? `${r.fest} ${r.year}` : r.fest,
    /** team labels in the record's order */
    teams: r.verticals.map((v) => ({ id: v, label: TEAM_LABEL[v] ?? v })),
  };
}

/** Year descending (undated last); inside a year builds (website, app, portal) then films;
 *  otherwise the source order. */
export const catalog = records
  .map((r, src) => ({ r, src }))
  .sort((a, b) => {
    const ya = a.r.year ?? -1;
    const yb = b.r.year ?? -1;
    if (ya !== yb) return yb - ya;
    const ka = KIND_RANK[a.r.kind] ?? 9;
    const kb = KIND_RANK[b.r.kind] ?? 9;
    return ka - kb || a.src - b.src;
  })
  .map(({ r }, i) => toEntry(r, i));

/** pk string and slug → entry, so /projects/5 and /projects/apogee-21-website both resolve. */
export const catalogById = new Map();
for (const e of catalog) {
  catalogById.set(e.id, e);
  catalogById.set(e.r.slug, e);
}

/** Every project in the catalogue (the home strip's "All N projects"). */
export const catalogCount = catalog.length;

/** "13 websites · 4 apps · 2 portals · 22 films · 2018–2025" */
export const catalogSummary = (() => {
  const n = (k) => catalog.filter((e) => e.r.kind === k).length;
  const word = (k, c) => `${c} ${{ website: "website", app: "app", portal: "portal", video: "film" }[k]}${c === 1 ? "" : "s"}`;
  const years = catalog.map((e) => e.r.year).filter(Boolean);
  return [...["website", "app", "portal", "video"].map((k) => word(k, n(k))), `${Math.min(...years)}–${Math.max(...years)}`].join(" · ");
})();

/** The dated years, newest first, then null for the undated group. */
export const catalogYears = [...new Set(catalog.map((e) => e.r.year ?? null))];

export const inTeam = (e, team) => !team || e.r.verticals.includes(team);

export const teamCount = (team) => catalog.filter((e) => inTeam(e, team)).length;

export const festOf = (r) => fests.find((f) => f.id === r.fest) ?? null;

export const verticalOf = (id) => verticals.find((v) => v.id === id) ?? null;

export const rosterCount = (id) => team.filter((m) => m.vertical === id).length;

/** The neighbours in the catalogue, wrapping at both ends. */
export function neighbours(e) {
  const n = catalog.length;
  return { prev: catalog[(e.i - 1 + n) % n], next: catalog[(e.i + 1) % n] };
}
