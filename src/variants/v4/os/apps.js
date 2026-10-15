// The app registry: one entry per route of the variant. Every route is a window (desktop)
// or a full-screen app (phone); the URL is always the focused window.
import { lazy } from "react";
import { projects } from "../../../immersive/data";
import { P } from "../lib/paths";

export const APPS = [
  { id: "about", title: "About DVM", label: "About DVM", path: "/about", size: [860, 600], min: [520, 420], heavy: "mark", blurb: "System information" },
  { id: "projects", title: "Projects", label: "Projects", path: "/projects", size: [1140, 700], min: [460, 360], blurb: "Every site, app and film" },
  { id: "legacy", title: "Legacy", label: "Legacy", path: "/legacy", size: [1120, 680], min: [480, 400], heavy: true, blurb: "The origami timeline" },
  { id: "team", title: "Team", label: "Team", path: "/team", size: [1020, 660], min: [460, 380], blurb: "Contacts by vertical and batch" },
  { id: "blogs", title: "Blogs", label: "Blogs", path: "/blog", size: [1080, 680], min: [460, 380], blurb: "Essays from the team" },
  { id: "artwork", title: "Artwork", label: "Artwork", path: "/artwork", size: [1100, 700], min: [420, 360], blurb: "Photos of the work" },
  { id: "archive", title: "Archive", label: "Archive", path: "/archive", size: "max", min: [560, 420], heavy: true, blurb: "The infinite wall" },
  { id: "contact", title: "Mail", label: "Contact", path: "/contactus", size: [860, 620], min: [420, 420], blurb: "Write to DVM" },
];

/** Not on the desktop: one window per project, opened from Projects / search / timeline. */
export const PROJECT_APP = { id: "project", title: "Project", label: "Project", path: "/projects/:slug", size: [980, 720], min: [440, 380] };

export const appById = (id) => (id === "project" ? PROJECT_APP : APPS.find((a) => a.id === id));
export const projectBySlug = (slug) => projects.find((p) => p.slug === slug);

/** Window identity: one window per app, one per project. */
export const winKey = (app, param) => (app === "project" ? `project:${param}` : app);

export function pathFor(app, param) {
  if (!app) return P("/");
  if (app === "project") return P(`/projects/${param}`);
  return P(appById(app).path);
}

export function titleFor(app, param) {
  if (app === "project") return projectBySlug(param)?.title ?? "Project";
  return appById(app)?.title ?? app;
}

export const COMPONENTS = {
  about: lazy(() => import("../apps/About.jsx")),
  projects: lazy(() => import("../apps/Projects.jsx")),
  project: lazy(() => import("../apps/ProjectDetail.jsx")),
  legacy: lazy(() => import("../apps/Legacy.jsx")),
  team: lazy(() => import("../apps/Team.jsx")),
  blogs: lazy(() => import("../apps/Blogs.jsx")),
  artwork: lazy(() => import("../apps/Artwork.jsx")),
  archive: lazy(() => import("../apps/Archive.jsx")),
  contact: lazy(() => import("../apps/Contact.jsx")),
};
