// /alumni · People as a loom (research/v8-legacy-alumni-viz.md §1): everyone, arranged by the two
// facts everyone knows about an alum — the batch and the team. Pure: reads alumniData, computes once
// at import.
import { BATCHES, PEOPLE, TEAMS } from "../alumniData";

/**
 * @typedef {import("../alumniData").Person} Person
 * @typedef {{ team: { id: string, label: string }, beads: readonly Person[], quiet: readonly Person[] }} Cell
 *   beads: latest !== null (PEOPLE order: name); quiet: latest === null (PEOPLE order)
 * @typedef {{ batch: number, cells: readonly Cell[] }} Rail
 *   cells in TEAM_ORDER, one per team, present even when empty
 */

const freeze = (a) => Object.freeze(a);

/** @type {readonly Rail[]} BATCHES asc. */
export const RAILS = freeze(
  BATCHES.map((batch) => {
    const all = PEOPLE.filter((p) => p.batch === batch);
    const cells = TEAMS.map((team) => {
      const mine = all.filter((p) => p.teamId === team.id);
      return freeze({ team, beads: freeze(mine.filter((p) => p.latest)), quiet: freeze(mine.filter((p) => !p.latest)) });
    });
    return freeze({ batch, cells: freeze(cells) });
  }),
);
