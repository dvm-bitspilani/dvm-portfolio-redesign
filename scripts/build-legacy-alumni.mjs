#!/usr/bin/env node
// Generator for V8's Legacy data (research/v8-legacy-net.md §2.1). Re-runnable.
//
//   node scripts/build-legacy-alumni.mjs [--logos <dir>]
//
// Source: research/v8-alumni-v2.json (every TeamInfo member of the 2017–2023 batches: their latest
// step — a job, else their latest internship — and their history, newest first). When that file is
// missing, the round-11 research/v8-alumni-companies.json is adapted into the same shape.
//
// Only experiences the research marks confidence "high" are published (MIN_CONFIDENCE; the medium
// ones come from data brokers and inference). A person whose latest step is not high-confidence is
// kept as traced-but-unconfirmed (confidence "unconfirmed"): no latest, no history (so
// `history[0] === latest` always holds).
// Entries for companies in HIDE (a stealth startup, student ventures with no site) are dropped; if
// one was the latest step, the next published entry takes its place.
//
// Each TeamInfo id resolves to the member's name (src/components/TeamInfo.json); the app's adapter
// (src/variants/v8/legacy/alumniData.js) resolves those names against the team records the site
// already uses (src/immersive/data/team.ts) for photos, batches, teams and LinkedIn. Logos come from
// the LOGOS table (files committed under public/assets/legacy/logos/); companies without one get
// the monogram (LegacyCircle). Writes src/variants/v8/legacy/alumni.json.
//
// --logos <dir>: also copy logo files found in <dir> (the downloads, paths as in LOGOS) into
// public/assets/legacy/logos/<company id>.<ext>. The repo PNGs (google, meta, microsoft, imc) are
// copied from src/assests/Legacy/. Without the flag only the JSON is written.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RESEARCH_V2 = join(ROOT, "research/v8-alumni-v2.json");
const RESEARCH_V1 = join(ROOT, "research/v8-alumni-companies.json");
const TEAMINFO = join(ROOT, "src/components/TeamInfo.json");
const OUT = join(ROOT, "src/variants/v8/legacy/alumni.json");
const LOGO_DIR = join(ROOT, "public/assets/legacy/logos");
const REPO_LOGOS = join(ROOT, "src/assests/Legacy");

/** The lowest confidence published. Flip to "medium" only if the user asks. */
const MIN_CONFIDENCE = "high";
const RANK = { high: 2, medium: 1, low: 0 };
const published = (c) => (RANK[c] ?? 0) >= RANK[MIN_CONFIDENCE];

/** Companies never shown: no outside identity (a stealth startup, student ventures without a site). */
const HIDE = new Set(["Stealth startup", "Stealth", "BuildShift"]);

const SI = "simple-icons@16.30.0 (CC0)";
const SI9 = "simple-icons@9.21.0 (CC0; since removed from Simple Icons)";

/**
 * Company (as named in the research) → [file, kind, source, colour?].
 *   file: relative to --logos <dir>, or "repo:<name>" for src/assests/Legacy/<name>
 *   kind: "glyph" – a one-colour shape used as a CSS mask: grey at rest, `colour` when lit
 *         "mark"  – a full-colour image on a transparent ground, contained in the disc
 *         "tile"  – a full-colour square icon that fills the disc
 *   colour (glyphs only): the brand colour when lit; lifted toward white below when too dark to
 *         read on the disc. Without one a glyph lights to --ink.
 * Companies not listed get the monogram (LegacyCircle).
 * Round 14: the committed copies of the wide wordmark glyphs (AMD, Cisco, Goldman Sachs, Oracle,
 * PwC, Samsung ×2, Uber) have their viewBox tightened to the drawing (simple-icons pads every
 * glyph to a square, which shrank them in the disc); re-copying them with --logos undoes that.
 */
const LOGOS = {
  Google: ["repo:google.png", "mark", "repo (src/assests/Legacy)"],
  Meta: ["repo:meta.png", "mark", "repo (src/assests/Legacy)"],
  Microsoft: ["repo:microsoft.png", "mark", "repo (src/assests/Legacy)"],
  "IMC Trading": ["repo:imc.png", "mark", "repo (src/assests/Legacy)"],

  Amazon: ["si/amazon.svg", "glyph", SI9, "#FF9900"],
  AMD: ["si/amd.svg", "glyph", SI, "#ED1C24"],
  "American Express": ["si/americanexpress.svg", "glyph", SI, "#2E77BC"],
  "Axis Bank": ["si/axisbank.svg", "glyph", SI, "#971A4D"],
  Barclays: ["si/barclays.svg", "glyph", SI, "#00AEEF"],
  Cisco: ["si/cisco.svg", "glyph", SI, "#1BA0D7"],
  Ericsson: ["si/ericsson.svg", "glyph", SI, "#0082F0"],
  Flipkart: ["si/flipkart.svg", "glyph", SI9, "#2874F0"],
  "Goldman Sachs": ["si/goldmansachs.svg", "glyph", SI, "#7399C6"],
  "Google DeepMind": ["si/deepmind.svg", "glyph", SI, "#4285F4"],
  "Honda Motorcycle & Scooter India": ["si/honda.svg", "glyph", SI, "#E40521"],
  Indeed: ["si/indeed.svg", "glyph", SI, "#003A9B"],
  "Max Planck Institute for Biology Tübingen": ["si/maxplanckgesellschaft.svg", "glyph", SI, "#006C66"],
  Oracle: ["si/oracle.svg", "glyph", SI9, "#F80000"],
  "Polygon Labs": ["si/polygon.svg", "glyph", SI, "#7B3FE4"],
  Postman: ["si/postman.svg", "glyph", SI, "#FF6C37"],
  Razorpay: ["si/razorpay.svg", "glyph", SI, "#3395FF"],
  Salesforce: ["si/salesforce.svg", "glyph", SI9, "#00A1E0"],
  "Samsung R&D Institute India": ["si/samsung.svg", "glyph", SI, "#1428A0"],
  "Samsung Semiconductor": ["si/samsung.svg", "glyph", SI, "#1428A0"],
  Stripe: ["si/stripe.svg", "glyph", SI, "#635BFF"],
  Uber: ["si/uber.svg", "glyph", SI],
  "Wells Fargo": ["si/wellsfargo.svg", "glyph", SI, "#D71E28"],

  "Credit Suisse": ["final/credit-suisse.svg", "glyph", "Wikimedia Commons: Credit Suisse Logo 2022.svg (the sails)", "#1A3A6B"],
  // the square, contained (a tile cropped it to a bar), with a faint keyline so its black half reads on the dark disc
  "Societe Generale": ["final/societe-generale.svg", "mark", "Wikimedia Commons: Logo-SG-Société-Générale.svg (the square, with a keyline for dark grounds)"],
  PwC: ["wm/pwc.svg", "glyph", "Wikimedia Commons: PwC 2025 Logo.svg", "#FD5108"],
  Meesho: ["final/meesho.png", "tile", "Wikimedia Commons: Meesho logo.png"],
  Licious: ["final/licious.png", "mark", "Wikimedia Commons: Licious-Logo.png"],

  UBS: ["final/ubs.png", "glyph", "favicon ubs.com (white keyed out)"],
  "Media.net": ["final/media-net.png", "glyph", "favicon media.net (white keyed out)"],
  CRED: ["final/cred.png", "glyph", "cred.club icon (ground keyed out)"],
  "Capital One": ["final/capital-one.png", "mark", "apple-touch-icon capitalone.com (white keyed out)"],
  "Hexa Climate": ["final/hexa-climate.png", "mark", "favicon hexaclimate.com (white keyed out)"],
  LaunchDarkly: ["fav/launchdarkly.png", "glyph", "favicon launchdarkly.com"],
  Ola: ["hi/ola.png", "glyph", "olacabs.com favicon_logo.png"],

  AlphaGrep: ["fav/alphagrep.png", "mark", "favicon alphagrep.com"],
  Clueso: ["fav/clueso.png", "mark", "favicon clueso.io"],
  // navy on transparent: invisible as a tile on the dark disc, so drawn as a mask in its colour
  Confluent: ["ati/confluent.png", "glyph", "apple-touch-icon confluent.io (alpha used as the mask)", "#173361"],
  Cyberhaven: ["fav/cyberhaven.png", "tile", "favicon cyberhaven.com"],
  "Eightfold AI": ["ati/eightfold-ai.png", "mark", "apple-touch-icon eightfold.ai"],
  Elucidata: ["fav/elucidata.png", "mark", "favicon elucidata.io"],
  "Enkrypt AI": ["fav/enkrypt-ai.png", "mark", "favicon enkryptai.com"],
  "Entelligence AI": ["fav/entelligence-ai.png", "tile", "favicon entelligence.ai"],
  Fibr: ["fav/fibr.png", "tile", "favicon fibr.ai"],
  "Graviton Research Capital": ["hi/graviton.png", "mark", "gravitontrading.com favicon.png"],
  Harness: ["fav/harness.png", "mark", "favicon harness.io"],
  "JPMorgan Chase": ["fav/jpmorgan-chase.png", "tile", "favicon jpmorganchase.com"],
  Jupiter: ["fav/jupiter.png", "tile", "favicon jupiter.money"],
  "Mila - Quebec AI Institute": ["fav/mila-quebec-ai-institute.png", "mark", "favicon mila.quebec"],
  Navi: ["fav/navi.png", "tile", "favicon navi.com"],
  "Newton School": ["hi/newton.png", "mark", "newtonschool.co icon"],
  Nielsen: ["fav/nielsen.png", "mark", "favicon nielsen.com"],
  Nykaa: ["fav/nykaa.png", "tile", "favicon nykaa.com"],
  "Pepper Content": ["ati/pepper-content.png", "tile", "apple-touch-icon peppercontent.io"],
  "PixelUp Labs": ["fav/pixelup-labs.png", "tile", "favicon pixeluplabs.com"],
  Pixxel: ["fav/pixxel.png", "tile", "favicon pixxel.space"],
  PYOR: ["fav/pyor.png", "mark", "favicon pyor.xyz"],
  Rupeek: ["hi/rupeek.png", "mark", "rupeek.com 192 icon"],
  ShareChat: ["hi/sharechat.png", "mark", "sharechat.com favicon-96"],
  Simpl: ["fav/simpl.png", "tile", "favicon getsimpl.com"],
  Simplismart: ["fav/simplismart.png", "mark", "favicon simplismart.ai"],
  "Skit.ai": ["fav/skit-ai.png", "tile", "favicon skit.ai"],
  Slice: ["ati/slice.png", "tile", "apple-touch-icon sliceit.com"],
  Sundial: ["final/sundial.png", "tile", "favicon sundial.so"],
  UnifyApps: ["fav/unifyapps.png", "mark", "favicon unifyapps.com"],
  Upstox: ["fav/upstox.png", "tile", "favicon upstox.com"],
  Walmart: ["ati/walmart.png", "mark", "apple-touch-icon walmart.com"],
  WEX: ["fav/wex.png", "mark", "favicon wexinc.com"],

  // round 12 (v2 data): new companies, downloaded the same way (each checked by eye; companies
  // whose only icon was generic, unreadable at 36 px or not certainly theirs keep the monogram)
  Anaconda: ["si/anaconda.svg", "glyph", SI, "#44A833"],
  "Texas Instruments": ["wm/texas-instruments-glyph.svg", "glyph", "Wikimedia Commons: TexasInstruments-Logo.svg (the state shape)", "#CC0000"],
  Tenstorrent: ["ati/tenstorrent.png", "mark", "apple-touch-icon tenstorrent.com"],
  "C-DAC": ["wm/cdac-glyph.svg", "glyph", "Wikimedia Commons: Logo for the Centre for Development of Advanced Computing.svg", "#05186A"],
  Zenon: ["ati/zenon.png", "tile", "apple-touch-icon zenon.ai"],
  "Cenizas Labs": ["fav/cenizas-labs.png", "mark", "favicon cenizaslabs.com"],
  Cardboard: ["ati/cardboard.png", "tile", "apple-touch-icon cardboard.ai"],
  "Dodge AI": ["ati/dodge-ai.png", "tile", "apple-touch-icon getdodge.ai"],
  Schmooze: ["fav/schmooze-512.png", "mark", "schmoozedating.com icon-512"],
  HubbleMoney: ["wm/hubblemoney-glyph.svg", "glyph", "favicon myhubble.money (ground removed)"],
  FirstClub: ["fav/firstclub.png", "tile", "firstclub.co.in Logo.png"],
  "Spanda AI": ["fav/spanda-ai-180x180.png", "tile", "apple-icon spanda.ai"],
  "Jarvis Technology and Strategy Consulting": ["ati/jarvis.png", "mark", "apple-touch-icon jarvis.consulting"],
  "CRC-IB": ["ati/crc-ib.png", "mark", "apple-touch-icon crc-ib.com"],
  BCG: ["fav/s2-bcg.png", "tile", "favicon bcg.com (Google favicon service)"],
  Deloitte: ["fav/deloitte.png", "tile", "favicon deloitte.com"],
  "Jaguar Land Rover": ["fav/jlr.png", "glyph", "favicon jlr.com"],
  // WorldQuant: worldquant.png is a hollow orange frame (renders as a black square) — monogram until a proper icon exists.
  "D. E. Shaw": ["wm/d-e-shaw.svg", "glyph", "Wikimedia Commons: D. E. Shaw & Co. Logo.svg (public-domain text logo), viewBox cropped to the \"DE\" initials"],
  Mercari: ["fav/s2-mercari.png", "tile", "favicon mercari.com (Google favicon service)"],
  "Leena AI": ["wm/leena-ai-glyph.svg", "glyph", "leena.ai leenaLogo.svg (the icon)", "#0F72EE"],
  Hashlock: ["ati/hashlock.png", "mark", "apple-touch-icon hashlock.com"],
};
/** Names shown on the site where the research's is a description rather than a name. */
const DISPLAY = {
  "Mila - Quebec AI Institute": "Mila",
  "Max Planck Institute for Biology Tübingen": "Max Planck",
  "Graviton Research Capital": "Graviton",
  "Honda Motorcycle & Scooter India": "Honda",
  "Jarvis Technology and Strategy Consulting": "Jarvis Consulting",
  "Samsung R&D Institute India": "Samsung R&D",
  "MASTH (UltraHive Healthcare)": "MASTH",
  "Expert Systems, Inc.": "Expert Systems",
};
/** Sites for companies the research left without a domain but whose site is unambiguous. */
const DOMAINS = {
  Cardboard: "cardboard.ai",
  "Dodge AI": "getdodge.ai",
  Schmooze: "schmoozedating.com",
  HubbleMoney: "myhubble.money",
  FirstClub: "firstclub.co.in",
  "Spanda AI": "spanda.ai",
  "Jarvis Technology and Strategy Consulting": "jarvis.consulting",
  "CRC-IB": "crc-ib.com",
  GeneralMind: "generalmind.com",
  Vegapay: "vegapay.tech",
};

const slugify = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Lift a colour toward white until it reads on the dark disc (relative luminance ≥ 0.16). */
function readable(hex) {
  if (!hex) return undefined;
  const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lum = (c) => {
    const l = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
  };
  let c = rgb;
  for (let t = 0; t <= 1 && lum(c) < 0.16; t += 0.05) c = rgb.map((v) => v + (1 - v) * t);
  return `#${c.map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

/**
 * The role as a short title: the research's notes in parentheses, after a semicolon or a comma
 * ("Principal Engineer (backend lead; promoted …)" → "Principal Engineer") are dropped.
 */
function shortRole(r) {
  if (!r || typeof r !== "string") return undefined;
  let s = r;
  let prev;
  do {
    prev = s;
    s = s.replace(/\s*\([^()]*\)/g, "");
  } while (s !== prev);
  s = s.split(";")[0].split(", ")[0].replace(/\s+/g, " ").trim();
  s = s.replace(/^PS-(I{1,2}) intern\b/i, "PS-$1 Intern");
  if (!s) return undefined;
  return s[0].toUpperCase() + s.slice(1);
}

/** "2022-", "2023-2025", "2025 or earlier", 2024 → the year the step started (null when unknown). */
function startYear(y) {
  if (typeof y === "number") return y;
  const m = typeof y === "string" ? y.match(/\d{4}/) : null;
  return m ? Number(m[0]) : null;
}

/* ---- read the research, in v2's shape */

const teamInfo = JSON.parse(readFileSync(TEAMINFO, "utf8"));
const nameById = new Map(teamInfo.map((m) => [m.id, m.name.trim()]));

/** @returns {{ source: string, people: { id: number, name: string, batch?: string, latest: any, history: any[] }[], domains: Map<string, string|null> }} */
function readResearch() {
  if (existsSync(RESEARCH_V2)) {
    const r = JSON.parse(readFileSync(RESEARCH_V2, "utf8"));
    return {
      source: "research/v8-alumni-v2.json",
      people: r.people.map((p) => ({ ...p, history: p.history ?? [] })),
      domains: new Map((r.companies ?? []).map((c) => [c.company, c.domain ?? null])),
    };
  }
  // the round-11 file: each company entry is one history item, year unknown; latest = the
  // full-time entry if any, else the first
  const r = JSON.parse(readFileSync(RESEARCH_V1, "utf8"));
  const people = r.people.map((p) => {
    const history = p.companies.map((c) => ({
      company: c.company,
      kind: c.kind === "intern" || c.intern ? "intern" : "full-time",
      role: c.role,
      year: null,
      confidence: c.confidence,
    }));
    const ft = history.findIndex((h) => h.kind === "full-time" && published(h.confidence));
    if (ft > 0) history.unshift(...history.splice(ft, 1));
    return { id: p.id, name: p.name, latest: history[0] ?? null, history };
  });
  return { source: "research/v8-alumni-companies.json (adapted)", people, domains: new Map(r.companies.map((c) => [c.company, c.domain ?? null])) };
}

const research = readResearch();
const args = process.argv.slice(2);
const logoSrc = args.includes("--logos") ? resolve(args[args.indexOf("--logos") + 1]) : null;

/* ---- people */

const usedCompanies = new Set();
const people = [];
const batches = new Set();
let unconfirmed = 0;
let promoted = 0;
for (const p of research.people) {
  const name = nameById.get(p.id);
  if (!name) {
    console.warn(`TeamInfo has no id ${p.id} (${p.name}); skipped`);
    continue;
  }
  if (p.batch) batches.add(Number(p.batch));
  let history = [];
  if (p.latest && published(p.latest.confidence)) {
    history = p.history.filter((h) => h.company && published(h.confidence) && !HIDE.has(h.company));
    if (HIDE.has(p.latest.company) && history.length) promoted++;
    // one entry per company and kind (a person can list two roles at one company: keep the newest)
    const seen = new Set();
    history = history.filter((h) => {
      const k = `${h.company}|${h.kind}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  } else if (p.latest) unconfirmed++;
  const steps = history.map((h) => {
    usedCompanies.add(h.company);
    const role = shortRole(h.role);
    return { companyId: slugify(h.company), kind: h.kind === "intern" ? "intern" : "full-time", ...(role ? { role } : {}), year: startYear(h.year) };
  });
  // "high": published steps · "unconfirmed": the research found a step, below MIN_CONFIDENCE ·
  // "none": nothing found (or only a hidden company)
  const confidence = steps.length ? MIN_CONFIDENCE : p.latest && !published(p.latest.confidence) ? "unconfirmed" : "none";
  people.push({ name, confidence, latest: steps[0] ?? null, history: steps });
}

/* ---- companies */

if (logoSrc) mkdirSync(LOGO_DIR, { recursive: true });
const missingLogos = [];
const companies = [...usedCompanies]
  .map((raw) => {
    const id = slugify(raw);
    const domain = research.domains.get(raw) ?? DOMAINS[raw] ?? null;
    const out = { id, name: DISPLAY[raw] ?? raw };
    if (DISPLAY[raw]) out.fullName = raw;
    if (domain) out.url = `https://${domain}`;
    const logo = LOGOS[raw];
    if (logo) {
      const [file, kind, source, colour] = logo;
      const from = file.startsWith("repo:") ? join(REPO_LOGOS, file.slice(5)) : logoSrc && join(logoSrc, file);
      const dest = `${id}${extname(file)}`;
      if (from && existsSync(from)) copyFileSync(from, join(LOGO_DIR, dest));
      if (existsSync(join(LOGO_DIR, dest))) {
        out.logo = { src: `/assets/legacy/logos/${dest}`, kind, source };
        if (kind === "glyph" && colour) out.logo.color = readable(colour);
      } else missingLogos.push(`${raw} (${dest})`);
    }
    return out;
  })
  .sort((a, b) => a.name.localeCompare(b.name));

if (missingLogos.length) console.warn("logo files missing (monogram used):", missingLogos);
const unusedLogos = Object.keys(LOGOS).filter((k) => !usedCompanies.has(k));
if (unusedLogos.length) console.log(`(${unusedLogos.length} logos for companies not in the published data)`);

const data = {
  generatedAt: new Date().toISOString().slice(0, 10),
  source: `${research.source} (confidence ${MIN_CONFIDENCE} only)`,
  batches: [...batches].filter(Number.isFinite).sort((a, b) => a - b),
  companies,
  people,
};
writeFileSync(OUT, `${JSON.stringify(data, null, 2)}\n`);

const withLatest = people.filter((p) => p.latest);
const latestIds = new Set(withLatest.map((p) => p.latest.companyId));
console.log(
  [
    `${people.length} people (${withLatest.length} with a published latest step: ${withLatest.filter((p) => p.latest.kind === "full-time").length} full-time, ${withLatest.filter((p) => p.latest.kind === "intern").length} intern;`,
    `${unconfirmed} with an unconfirmed latest step, ${promoted} promoted past a hidden company)`,
    `${companies.length} companies (${latestIds.size} with someone there now), ${companies.filter((c) => c.logo).length} logos`,
    `→ ${OUT}`,
  ].join("\n"),
);
