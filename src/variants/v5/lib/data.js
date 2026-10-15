// Content for the reels, derived from the shared data layer (real DVM content only).
import { projects, team, blogs, artworks, site, socials, verticals, fests, featuredBlogs as fb, featuredArtworks } from "../../../immersive/data";

export { projects, team, blogs, artworks, site, socials, verticals, fests };

export const KIND_LABEL = { website: "Website", app: "App", portal: "Portal", video: "Film" };
export const VERTICAL_LABEL = Object.fromEntries(verticals.map((v) => [v.id, v.label]));
export const VERTICAL_NAME = Object.fromEntries(verticals.map((v) => [v.id, v.name]));

export const projectBySlug = new Map(projects.map((p) => [p.slug, p]));

/** Newest first; undated (e.g. 50 Years of Oasis) at the end. */
export const projectsByDate = [...projects].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));

/** A still that represents the project (films: the YouTube thumbnail saved locally). */
export const stillOf = (p) => p.cover || p.mockup || p.gallery?.[0] || p.mobileGallery?.[0] || null;

const featuredFilmSlugs = ["apogee-24-curtain-raiser", "oasis-19-curtain-raiser", "apogee-21-theme-release", "oasis-20-theme-release"];
const featuredSiteSlugs = ["bosm-19-website", "rocktaves-website", "oasis-19-app", "armageddon-20-website"];
export const featuredFilms = featuredFilmSlugs.map((s) => projectBySlug.get(s)).filter(Boolean);
export const featuredSites = featuredSiteSlugs.map((s) => projectBySlug.get(s)).filter(Boolean);
/** Alternate film / site so the Work chapter has a rhythm. */
export const featuredWork = featuredFilms.flatMap((f, i) => [f, featuredSites[i]].filter(Boolean));

/** Years in film order (oldest first) with what shipped and who joined. */
export function yearTake() {
  const years = new Set();
  projects.forEach((p) => p.year && years.add(p.year));
  team.forEach((m) => years.add(m.batch));
  return [...years]
    .sort((a, b) => a - b)
    .map((year) => ({
      year,
      shipped: projects.filter((p) => p.year === year),
      joined: team.filter((m) => m.batch === year),
    }));
}

export const batches = [...new Set(team.map((m) => m.batch))].sort((a, b) => b - a);

/** People who held a position of responsibility, newest tenure first. */
export const leaders = team
  .filter((m) => m.designation)
  .sort((a, b) => b.batch - a.batch || a.name.localeCompare(b.name));

/** The current cast: the most recent batch with designations. */
export const currentCast = (() => {
  const latest = leaders[0]?.batch;
  return leaders.filter((m) => m.batch === latest);
})();

export const tenureOf = (designation = "") => {
  const m = designation.match(/(20\d\d)\s*-\s*(\d\d)/);
  return m ? `${m[1]}–${m[2]}` : "";
};

export const featuredBlogs = fb.slice(0, 3);
export const journalArt = featuredArtworks;

/** Timecode at 24 fps: HH:MM:SS:FF */
export function timecode(seconds) {
  const s = Math.max(0, seconds);
  const total = Math.floor(s * 24);
  const ff = total % 24;
  const sec = Math.floor(total / 24);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(Math.floor(sec / 3600))}:${pad(Math.floor(sec / 60) % 60)}:${pad(sec % 60)}:${pad(ff)}`;
}
