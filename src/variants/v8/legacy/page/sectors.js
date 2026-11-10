// /legacy · Companies: the nine sectors of the sector map (research/v8-legacy-companies-viz.md §1).
// Order = the order the map places them (alumni desc, ties by companies desc). Every id in
// COMPANIES must appear once; an unmapped id lands in "software" (dev-warned).
import { COMPANIES } from "../alumniData";

export const SECTORS = Object.freeze([
  { id: "bigtech", label: "Big Tech", ids: ["amazon", "microsoft", "google", "google-deepmind", "meta", "oracle", "salesforce", "uber", "walmart", "cisco", "indeed", "mercari", "nielsen", "media-net", "samsung-r-and-d-institute-india"] },
  { id: "ai", label: "AI & Data", ids: ["simplismart", "unifyapps", "eightfold-ai", "enkrypt-ai", "entelligence-ai", "leena-ai", "skit-ai", "spanda-ai", "dodge-ai", "interface-ai", "iterate-ai", "amikus-ai", "carscan-ai", "cardboard", "zenon", "generalmind", "fibr", "sundial", "anaconda", "elucidata", "smartqna", "windfall-research", "expert-systems-inc"] },
  { id: "finance", label: "Banks & Trading", ids: ["goldman-sachs", "jpmorgan-chase", "credit-suisse", "ubs", "barclays", "american-express", "wells-fargo", "capital-one", "societe-generale", "axis-bank", "d-e-shaw", "alphagrep", "graviton-research-capital", "worldquant", "wex"] },
  { id: "software", label: "Software & Startups", ids: ["confluent", "postman", "launchdarkly", "harness", "cyberhaven", "houseware", "reflexis-systems", "pepper-content", "petasense", "detrace", "evermorrow-labs", "flint", "ripplica", "radalis", "virtuelly", "yap-network", "cenizas-labs", "pixelup-labs", "gleebo"] },
  { id: "fintech", label: "Fintech & Web3", ids: ["stripe", "razorpay", "cred", "navi", "slice", "jupiter", "simpl", "rupeek", "upstox", "hubblemoney", "vegapay", "eddy-finance", "pyor", "polygon-labs", "hashlock"] },
  { id: "consumer", label: "Consumer & Commerce", ids: ["meesho", "nykaa", "licious", "ola", "sharechat", "schmooze", "firstclub", "newton-school", "flippy", "wander", "weswap-mobility"] },
  { id: "hardware", label: "Hardware, Auto & Energy", ids: ["amd", "texas-instruments", "samsung-semiconductor", "tenstorrent", "ericsson", "honda-motorcycle-and-scooter-india", "jaguar-land-rover", "amplus-solar", "hexa-climate", "pixxel", "mesh-ergonomics"] },
  { id: "research", label: "Research, Health & Public", ids: ["max-planck-institute-for-biology-tubingen", "mila-quebec-ai-institute", "bisag-n", "c-dac", "prashanu-hospital", "masth-ultrahive-healthcare", "medsupervision"] },
  { id: "consulting", label: "Consulting", ids: ["bcg", "pwc", "deloitte", "jarvis-technology-and-strategy-consulting", "crc-ib"] },
]);

const FALLBACK = "software";

/** @type {ReadonlyMap<string, string>} company id → sector id (every id in COMPANIES). */
export const SECTOR_OF = (() => {
  const table = new Map();
  for (const sec of SECTORS) for (const id of sec.ids) table.set(id, sec.id);
  const out = new Map();
  const unmapped = [];
  for (const c of COMPANIES) {
    const sid = table.get(c.id);
    if (!sid) unmapped.push(c.id);
    out.set(c.id, sid ?? FALLBACK);
  }
  if (import.meta.env.DEV && unmapped.length) console.warn(`[legacy] sectors: no sector for ${unmapped.join(", ")} (placed in "${FALLBACK}")`);
  return out;
})();

/**
 * @typedef {{ id: string, label: string, companies: readonly import("../alumniData").Company[], count: number, alumni: number, fullTime: number, intern: number, now: number }} SectorGroup
 * alumni / fullTime / intern / now are sums over the sector's companies: a person at two companies
 * counts at both.
 */

/** @type {readonly SectorGroup[]} SECTORS order; companies in COMPANIES order (ever desc, fullTime desc, name). */
export const SECTOR_GROUPS = Object.freeze(
  SECTORS.map((sec) => {
    const companies = Object.freeze(COMPANIES.filter((c) => SECTOR_OF.get(c.id) === sec.id));
    const sum = (f) => companies.reduce((n, c) => n + f(c), 0);
    return Object.freeze({
      id: sec.id,
      label: sec.label,
      companies,
      count: companies.length,
      alumni: sum((c) => c.ever.length),
      fullTime: sum((c) => c.fullTime),
      intern: sum((c) => c.intern),
      now: sum((c) => c.latest.length),
    });
  }).filter((g) => g.count > 0),
);
