// The site as a set of reels (routes), in running order.
import { P } from "./paths";

export const REELS = [
  { path: "/", n: 1, name: "The feature", menu: "Home", blurb: "The whole story on one strip: who we are, the work, the legacy, the cast, the journal and the credits." },
  { path: "/about", n: 2, name: "About", menu: "About", blurb: "What DVM does for BOSM, Oasis and APOGEE, and the five crews that do it." },
  { path: "/projects", n: 3, name: "Work", menu: "Work", blurb: "Every website, app, portal and film we have shipped, newest first." },
  { path: "/legacy", n: 4, name: "Legacy", menu: "Legacy", blurb: "One long take through the years: what shipped, who joined, who led." },
  { path: "/team", n: 5, name: "Team", menu: "Team", blurb: "The full cast, batch by batch, since 2017." },
  { path: "/blog", n: 6, name: "Journal", menu: "Blogs", blurb: "Notes from the crew: case studies, tooling and how we built things." },
  { path: "/artwork", n: 7, name: "Artwork", menu: "Artwork", blurb: "Renders, illustrations and UI shots by our designers and animators." },
  { path: "/archive", n: 8, name: "Contact sheet", menu: "Archive", blurb: "Every record on one wall. Drag, zoom and open anything." },
  { path: "/contactus", n: 9, name: "Credits", menu: "Contact", blurb: "Roll the end credits and send us a message." },
];

export function reelFor(pathname) {
  const rel = pathname.replace(/^\/v\/v5/, "").replace(/\/$/, "") || "/";
  if (rel.startsWith("/projects/")) return { ...REELS[2], scene: decodeURIComponent(rel.slice("/projects/".length)) };
  return REELS.find((r) => r.path === rel) || REELS[0];
}

export const reelHref = (r) => P(r.path);
