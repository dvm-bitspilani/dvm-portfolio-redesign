// One flat index over everything on the machine: apps, projects, people, essays, artwork.
import { artworks, blogs, projects, team, verticals } from "../../../immersive/data";
import { APPS } from "./apps";

const KIND = { website: "Website", app: "App", portal: "Portal", video: "Film" };
const vlabel = (id) => verticals.find((v) => v.id === id)?.label ?? id;

let index = null;
export function searchIndex() {
  if (index) return index;
  index = [
    ...APPS.map((a) => ({ group: "Apps", id: `app:${a.id}`, title: a.label, sub: a.blurb, app: a.id, open: { app: a.id } })),
    ...projects.map((p) => ({
      group: "Projects",
      id: `p:${p.slug}`,
      title: p.title,
      sub: [p.fest, KIND[p.kind], p.year].filter(Boolean).join("  "),
      app: "project",
      cover: p.cover,
      hay: `${p.title} ${p.subtitle ?? ""} ${p.fest} ${p.kind} ${p.year ?? ""} ${p.theme ?? ""} ${p.tags.join(" ")}`,
      open: { app: "project", param: p.slug },
    })),
    ...team.map((m) => ({
      group: "People",
      id: `m:${m.slug}`,
      title: m.name,
      sub: m.designation ?? `${vlabel(m.vertical)}, batch of ${m.batch}`,
      photo: m.photo,
      app: "team",
      hay: `${m.name} ${m.designation ?? ""} ${vlabel(m.vertical)} ${m.batch}`,
      open: { app: "team", props: { select: m.slug } },
    })),
    ...blogs.map((b) => ({
      group: "Essays",
      id: `b:${b.slug}`,
      title: b.shortTitle ?? b.title,
      sub: `${b.authors.join(", ")}, ${b.date}`,
      app: "blogs",
      hay: `${b.title} ${b.authors.join(" ")} ${b.tags.join(" ")}`,
      open: { app: "blogs", props: { select: b.slug } },
    })),
    ...artworks.map((a) => ({
      group: "Artwork",
      id: `a:${a.slug}`,
      title: a.title,
      sub: `${a.artist}, ${a.year}`,
      photo: a.image,
      app: "artwork",
      hay: `${a.title} ${a.artist} ${a.year}`,
      open: { app: "artwork", props: { select: a.slug } },
    })),
  ];
  return index;
}

const ORDER = ["Apps", "Projects", "People", "Essays", "Artwork"];

/** Prefix/word matches rank above substring matches; groups capped at `per`. */
export function search(q, per = 4) {
  const query = q.trim().toLowerCase();
  if (!query) return [];
  const words = query.split(/\s+/);
  const scored = [];
  for (const it of searchIndex()) {
    const title = it.title.toLowerCase();
    const hay = (it.hay ?? `${it.title} ${it.sub ?? ""}`).toLowerCase();
    if (!words.every((w) => hay.includes(w))) continue;
    let score = 0;
    if (title.startsWith(query)) score += 100;
    else if (title.split(/[\s'’-]+/).some((w) => w.startsWith(words[0]))) score += 50;
    else if (title.includes(query)) score += 25;
    scored.push({ it, score });
  }
  const out = [];
  for (const g of ORDER) {
    const list = scored
      .filter((x) => x.it.group === g)
      .sort((a, b) => b.score - a.score)
      .slice(0, per)
      .map((x) => x.it);
    out.push(...list);
  }
  return out;
}
