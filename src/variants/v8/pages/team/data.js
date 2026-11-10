// /team, every version: the roster and what each version derives from it (no React here).
// Source: immersive/data/team.ts (192 members, batches 2017–2024, five teams; 55 have a
// designation, i.e. a role: research/v8-team-page.md §5.12 recommends all 55 as the "role" tier,
// not the 35 flagged `isPorHolder`, which misses Creative and Projects Heads).
import { batches, projectsByVertical, team, verticals } from "../../../../immersive/data";
import { TEAMS, TEAM_ORDER, TEAM_STILLS } from "../../home/teamStills";

export { TEAMS, TEAM_ORDER, TEAM_STILLS };

export const TEAM_LABEL = Object.fromEntries(verticals.map((v) => [v.id, v.label]));
const TEAM_RANK = Object.fromEntries(TEAM_ORDER.map((id, i) => [id, i]));
export const teamRank = (id) => TEAM_RANK[id] ?? 9;

/** Batches, latest first (2024 … 2017). */
export const BATCHES = batches;
/** The year the roster is read in (who is still here: joined within the last four years). */
const NOW = new Date().getFullYear();
/** A BITS first degree is four years (dual degrees five, so this is a hint, never printed as fact). */
export const isAlum = (m) => m.batch + 4 <= NOW;

/** The social links each member may have, in the order they are drawn. */
export const SOCIALS = [
  { key: "linkedin", label: "LinkedIn" },
  { key: "github", label: "GitHub" },
  { key: "instagram", label: "Instagram" },
  { key: "twitter", label: "X (Twitter)" },
  { key: "dribbble", label: "Dribbble" },
  { key: "behance", label: "Behance" },
  { key: "facebook", label: "Facebook" },
];
export const linksOf = (m) => SOCIALS.filter((x) => m.socials?.[x.key]).map((x) => ({ ...x, url: m.socials[x.key], handle: handleOf(m.socials[x.key]) }));

/** The handle in a profile URL: its last meaningful path segment ("in/yashbhagat99/" → "yashbhagat99"). */
export function handleOf(url) {
  try {
    const u = new URL(url);
    const id = u.searchParams.get("id");
    const parts = u.pathname.split("/").filter(Boolean).filter((p) => !["in", "pub", "profile.php", "u", "user"].includes(p.toLowerCase()));
    const last = parts.at(-1) ?? id ?? u.hostname;
    return `@${decodeURIComponent(last).replace(/^@/, "")}`;
  } catch {
    return url;
  }
}

/** Case- and accent-insensitive text, for search. */
export const fold = (str) =>
  String(str ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();

/**
 * A designation as roles: "Creative Head 2024-25" → [{ role: "Creative Head", tenure: "2024–25" }];
 * double posts ("A 2021-22 / B 2022-23", "A 2024-25 & B 2025-26") give two. Anything that does not
 * end in a tenure prints whole as the role.
 */
export function rolesOf(designation) {
  if (!designation) return [];
  return designation
    .split(/\s+(?:\/|&)\s+/)
    .map((part) => {
      const t = part.trim().match(/^(.*?)\s+(\d{4})-(\d{2})$/);
      return t ? { role: t[1].replace(/Joint Coordinator/i, "Joint-Coordinator"), tenure: `${t[2]}–${t[3]}` } : { role: part.trim(), tenure: "" };
    })
    .filter((r) => r.role);
}

/** Everyone, in the one order every version uses: batch descending, then team, role first, then name. */
export const ROSTER = [...team]
  .map((m) => ({ ...m, name: m.name.trim() }))
  .sort(
    (a, b) =>
      b.batch - a.batch ||
      teamRank(a.vertical) - teamRank(b.vertical) ||
      Number(!a.designation) - Number(!b.designation) ||
      a.name.localeCompare(b.name),
  );

const HAY = new Map(ROSTER.map((m) => [m.slug, fold(`${m.name} ${m.designation ?? ""} ${TEAM_LABEL[m.vertical] ?? ""} ${m.batch}`)]));
export const BY_SLUG = new Map(ROSTER.map((m) => [m.slug, m]));
/** Each member's place in the roster, 1-based (the dossier's "024 / 192"). */
export const INDEX = new Map(ROSTER.map((m, i) => [m.slug, i + 1]));

/** The slugs that match a query (every word somewhere in name / role / team / batch), or null for no query. */
export function matchSet(query) {
  const terms = fold(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return null;
  return new Set(ROSTER.filter((m) => terms.every((t) => HAY.get(m.slug).includes(t))).map((m) => m.slug));
}

/** The posts a set of people held, each once ("Creative Head", "CoStAAn", …). */
export const postsOf = (people) => [...new Set(people.flatMap((m) => rolesOf(m.designation).map((r) => r.role)))];

/** The roster by batch, latest first: [{ batch, people, roles: ["Creative Head", …] }]. */
export const BLOCKS = BATCHES.map((batch) => {
  const people = ROSTER.filter((m) => m.batch === batch);
  return { batch, people, roles: postsOf(people) };
});

/** BLOCKS narrowed to a set of slugs (a search); empty batches dropped. */
export const narrowBlocks = (slugs) =>
  BLOCKS.map((bl) => {
    const people = bl.people.filter((m) => slugs.has(m.slug));
    return { ...bl, people, roles: postsOf(people) };
  }).filter((bl) => bl.people.length);

/** The board: team → batch → people (oldest batch first, as a timeline reads). */
export const YEARS_ASC = [...BATCHES].reverse();
export const BOARD = TEAM_ORDER.map((id) => ({
  id,
  label: TEAM_LABEL[id],
  total: ROSTER.filter((m) => m.vertical === id).length,
  cells: YEARS_ASC.map((batch) => ({ batch, people: ROSTER.filter((m) => m.vertical === id && m.batch === batch) })),
}));

/** The two posts that run the department's work, year to year: who held them, by tenure. */
export const CHAINS = [
  { id: "creative", label: "Creative Heads", test: /creative head/i },
  { id: "projects", label: "Projects Heads", test: /projects? head/i },
].map((c) => ({
  id: c.id,
  label: c.label,
  people: ROSTER.filter((m) => c.test.test(m.designation ?? "")).sort((a, b) => a.batch - b.batch),
}));

export const STATS = {
  people: ROSTER.length,
  batches: BATCHES.length,
  teams: TEAM_ORDER.length,
  roles: ROSTER.filter((m) => m.designation).length,
  first: BATCHES.at(-1),
  last: BATCHES[0],
};

/** A team's card (the idle dossier when the page is filtered to one team). */
export function teamCard(id) {
  const v = TEAMS.find((t) => t.id === id);
  if (!v) return null;
  return {
    ...v,
    members: ROSTER.filter((m) => m.vertical === id).length,
    projects: projectsByVertical(id).length,
    still: TEAM_STILLS[id],
  };
}

/** Batch-mates for the dossier: same team first, then the rest, up to `n`. */
export function batchMates(m, n = 8) {
  const same = ROSTER.filter((x) => x.batch === m.batch && x.slug !== m.slug);
  return [...same.filter((x) => x.vertical === m.vertical), ...same.filter((x) => x.vertical !== m.vertical)].slice(0, n);
}

/** Two-digit years for tight labels: 2021 → ’21. */
export const yy = (y) => `’${String(y).slice(-2)}`;
