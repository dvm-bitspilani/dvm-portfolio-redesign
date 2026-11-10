// Project helpers shared by the home sections and /projects (links stay inside the variant).
import { featuredProjects, projects } from "../../../immersive/data";
import { catalogById } from "./catalog";

/** Route of a project inside the variant: every record has a page (/projects/<pk or slug>). */
export function projectHref(p) {
  return catalogById.get(p.slug)?.href ?? null;
}

/** Cover, else the YouTube still, else the mockup. */
export function projectThumb(p) {
  if (p.cover) return p.cover;
  if (p.youtubeId) return `https://img.youtube.com/vi/${p.youtubeId}/hqdefault.jpg`;
  return p.mockup || null;
}

const REEL = 5;

/** The five the home strip shows (the same pick as home/Work.jsx): the featured projects with a
 *  picture, padded with the newest other covered ones. As catalogue entries. */
export function featuredReel() {
  const featured = featuredProjects.filter((p) => p.cover || p.youtubeId).slice(0, REEL);
  const pad = projects
    .filter((p) => !p.featured && p.cover && p.year)
    .sort((a, b) => b.year - a.year)
    .slice(0, Math.max(0, REEL - featured.length));
  return [...featured, ...pad].map((p) => catalogById.get(p.slug)).filter((e) => e?.cover);
}
