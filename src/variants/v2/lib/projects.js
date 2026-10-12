// The redesign's own project list (ids = projects.json pk, so /projects/:name keeps working),
// plus the swarm formation each project re-forms into.
import projects from "../../../components/Project/projectsData";

export { projects };

const shortName = (name) =>
  name
    .replace(/website|app|portal/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()
    .slice(0, 16);

/** Hero screenshots are same-origin Vite assets (safe to sample); videos have only YouTube thumbs (cross-origin), so they form their title. */
export function swarmTargetFor(project) {
  if (project.type !== "video" && project.heroImage) return { image: project.heroImage, fit: "contain", contrast: 1.15 };
  return { text: shortName(project.name).replace(/ (?=\S+$)/, "\n") };
}

export const yearOf = (p) => (p.date ? (p.date.match(/\d{4}/) || [""])[0] : "");

/** Home index: the most recent builds that have a cover, plus the latest film. */
export function selectedProjects(n = 7) {
  const sites = projects.filter((p) => p.type !== "video" && p.heroImage).slice(0, n - 1);
  const film = projects.find((p) => p.type === "video");
  return film ? [...sites, film] : sites;
}
