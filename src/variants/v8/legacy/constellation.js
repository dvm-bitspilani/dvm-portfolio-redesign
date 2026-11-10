// The Legacy constellation's geometry (legacy/Legacy.jsx): where each tier-1 company's circle sits,
// how big it is, where its name label goes, and which dotted lines join them. Pure arithmetic, no
// DOM — node can import it to check the geometry (checkConstellation), and Legacy redoes it on
// every resize.
//
// Positions are hand-placed per mode (TEMPLATES, in a reference field's px), scaled into the field
// the section has left of the DVM mark, then nudged apart until no two circles (each with its name
// under it) come too close. Lines are computed on the final px: first every pair of companies that
// share an alum (someone interned at one and works at the other: the "strong" lines, brighter,
// with the idle pulse), then each circle to its nearest neighbours until it has two, then the
// shortest bridges that make the figure one piece. A line is only drawn if it crosses no other
// line, passes no third circle (CLEAR px off its ring) and both its ends still have fewer than
// MAX_DEG lines. Last, each name label takes the first side of its circle (under it, else right,
// left, above) where it touches no line, no circle and no other label, like the names on a star
// chart.

/** Circle diameter (px at scale 1) by alumni count. */
const DIAMETER = { 1: 56, 2: 70, 3: 80, 4: 90, 5: 98, 6: 108 };
export const diameterFor = (count) => DIAMETER[Math.min(6, Math.max(1, count))];

/** Closest two circles' rings may come (px at scale 1; leaves room for the count chip). */
const GAP = 24;
/** A line keeps this far off any third circle's ring (px). */
const CLEAR = 7;
const MIN_DEG = 2;
const MAX_DEG = 4;

/**
 * The name label (Legacy.module.css .label: JetBrains Mono, uppercase): font size per mode (px),
 * letter-spacing (em), line height (px), its distance off the ring (px). The mono's advance is
 * 0.6 em, so a label's width is known without the DOM. Names longer than WRAP characters break
 * onto two lines at the space nearest their middle.
 */
export const LABEL = { font: { wide: 11, tight: 11, phone: 10 }, ls: 0.06, lh: { wide: 13, tight: 13, phone: 12 }, off: 7, wrap: 13 };
/** A label keeps this far off another circle's ring / another label (px)… */
const LABEL_M = 8;
/** …and every line keeps this far off a label (px). */
const LABEL_CLEAR = 5;
/** Where a label may sit, in the order tried (the diagonals start off the ring at 45°; above-right
 *  clears the count chip, which sits on the ring there). */
const SIDES = ["below", "right", "left", "below-right", "below-left", "above", "above-left", "above-right"];

/** A name's label lines. */
export function labelLines(name) {
  const s = name.toUpperCase();
  if (s.length <= LABEL.wrap || !s.includes(" ")) return [s];
  let best = -1;
  for (let i = 0; i < s.length; i++) if (s[i] === " " && (best < 0 || Math.abs(i - s.length / 2) < Math.abs(best - s.length / 2))) best = i;
  return [s.slice(0, best), s.slice(best + 1)];
}

/**
 * Hand-placed centres per mode, in a reference field of w × h px. wide (≥ 1100): all twenty, the
 * one-alum companies as the back layer around the edge; tight (760–1099): the twelve with two or
 * more alumni; phone: the top eight. Companies that share an alum sit next to each other.
 */
export const TEMPLATES = {
  wide: {
    w: 900,
    h: 540,
    scale: 1,
    at: {
      barclays: [56, 58],
      "goldman-sachs": [222, 104],
      "d-e-shaw": [400, 40],
      microsoft: [588, 92],
      amd: [770, 40],
      "jpmorgan-chase": [70, 206],
      google: [372, 214],
      meta: [862, 178],
      samsung: [226, 318],
      amazon: [596, 296],
      salesforce: [848, 330],
      "american-express": [48, 372],
      uber: [318, 452],
      walmart: [430, 394],
      cisco: [752, 420],
      oracle: [96, 482],
      "texas-instruments": [218, 486],
      ubs: [540, 488],
      "credit-suisse": [652, 486],
      stripe: [860, 486],
    },
  },
  tight: {
    w: 520,
    h: 560,
    scale: 0.86,
    at: {
      "goldman-sachs": [72, 84],
      microsoft: [330, 70],
      "jpmorgan-chase": [60, 222],
      google: [210, 180],
      amazon: [362, 270],
      samsung: [140, 340],
      walmart: [262, 410],
      oracle: [52, 480],
      ubs: [190, 510],
      "credit-suisse": [330, 510],
      cisco: [460, 420],
      stripe: [462, 150],
    },
  },
  phone: {
    w: 340,
    h: 400,
    scale: 0.78,
    at: {
      "goldman-sachs": [50, 68],
      google: [166, 44],
      microsoft: [288, 66],
      samsung: [66, 204],
      amazon: [190, 190],
      cisco: [296, 222],
      "jpmorgan-chase": [96, 338],
      "credit-suisse": [242, 340],
    },
  },
};

/** Which companies each mode shows: those it has a place for, in the order given (count desc). */
export const companiesFor = (mode, tier1) => tier1.filter((c) => TEMPLATES[mode].at[c.id]);

/**
 * Pairs of companies (ids) that share at least one alum, with how many.
 * @param {readonly { id: string, people: readonly { person: { slug: string } }[] }[]} companies
 * @returns {Map<string, number>} key "a|b" (a < b)
 */
export function sharedPairs(companies) {
  const out = new Map();
  for (let i = 0; i < companies.length; i++) {
    const a = new Set(companies[i].people.map((r) => r.person.slug));
    for (let j = i + 1; j < companies.length; j++) {
      const n = companies[j].people.filter((r) => a.has(r.person.slug)).length;
      if (n) out.set(pairKey(companies[i].id, companies[j].id), n);
    }
  }
  return out;
}
const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/* ---- geometry helpers */

/** Distance from point p to segment ab. */
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
const orient = (ax, ay, bx, by, cx, cy) => Math.sign((bx - ax) * (cy - ay) - (by - ay) * (cx - ax));
/** Segments ab and cd cross properly (sharing an end does not count). */
function crosses(a, b, c, d) {
  if (a === c || a === d || b === c || b === d) return false;
  return (
    orient(a.x, a.y, b.x, b.y, c.x, c.y) * orient(a.x, a.y, b.x, b.y, d.x, d.y) < 0 &&
    orient(c.x, c.y, d.x, d.y, a.x, a.y) * orient(c.x, c.y, d.x, d.y, b.x, b.y) < 0
  );
}
/** The line a–b passes within CLEAR of a third circle's ring. */
function grazes(a, b, nodes) {
  return nodes.some((n) => n !== a && n !== b && segDist(n.x, n.y, a.x, a.y, b.x, b.y) < n.r + CLEAR);
}
/** Segment ab enters rectangle q grown by m on every side (Liang–Barsky). */
function segHitsRect(ax, ay, bx, by, q, m) {
  const l = q.l - m;
  const r = q.r + m;
  const t = q.t - m;
  const b = q.b + m;
  const dx = bx - ax;
  const dy = by - ay;
  let t0 = 0;
  let t1 = 1;
  for (const [p, d] of [
    [-dx, ax - l],
    [dx, r - ax],
    [-dy, ay - t],
    [dy, b - ay],
  ]) {
    if (p === 0) {
      if (d < 0) return false;
    } else {
      const u = d / p;
      if (p < 0) {
        if (u > t1) return false;
        if (u > t0) t0 = u;
      } else {
        if (u < t0) return false;
        if (u < t1) t1 = u;
      }
    }
  }
  return t0 <= t1;
}
/** Distance from point (x, y) to rectangle q (0 inside). */
const rectDist = (x, y, q) => Math.hypot(Math.max(q.l - x, 0, x - q.r), Math.max(q.t - y, 0, y - q.b));
/** Gap between two rectangles along the axis that separates them (negative: they overlap). */
const rectGap = (p, q) => Math.max(p.l - q.r, q.l - p.r, p.t - q.b, q.t - p.b);

/** A node's label box on a side of its circle (field px). */
function labelBox(n, side) {
  const { w, h } = n.label;
  const o = n.r + LABEL.off;
  if (side === "below") return { l: n.x - w / 2, r: n.x + w / 2, t: n.y + o, b: n.y + o + h };
  if (side === "above") return { l: n.x - w / 2, r: n.x + w / 2, t: n.y - o - h, b: n.y - o };
  if (side === "right") return { l: n.x + o, r: n.x + o + w, t: n.y - h / 2, b: n.y + h / 2 };
  if (side === "left") return { l: n.x - o - w, r: n.x - o, t: n.y - h / 2, b: n.y + h / 2 };
  const c = o * Math.SQRT1_2;
  if (side === "below-right") return { l: n.x + c, r: n.x + c + w, t: n.y + c, b: n.y + c + h };
  if (side === "below-left") return { l: n.x - c - w, r: n.x - c, t: n.y + c, b: n.y + c + h };
  if (side === "above-left") return { l: n.x - c - w, r: n.x - c, t: n.y - c - h, b: n.y - c };
  // (past the chip, when there is one)
  const cr = n.count > 1 ? n.r + LABEL.off : c;
  return { l: n.x + cr, r: n.x + cr + w, t: n.y - cr - h, b: n.y - cr };
}

/**
 * The constellation in a field of fw × fh px (origin top-left).
 * @param {{ mode: "wide" | "tight" | "phone", companies: readonly import("./alumniData").Tier1Company[], fw: number, fh: number, shared: Map<string, number> }} o
 * @returns {{ mode: string, k: number, fw: number, fh: number,
 *   nodes: { id: string, x: number, y: number, r: number, d: number, depth: 0 | 1, count: number,
 *     label: { lines: string[], w: number, h: number, side: string, box: { l: number, t: number, r: number, b: number } } }[],
 *   edges: { a: string, b: string, strong: boolean, far: boolean }[] }}
 */
export function layoutConstellation({ mode, companies, fw, fh, shared }) {
  const T = TEMPLATES[mode];
  // the circles grow and shrink with the field's area (within reason) on top of the mode's scale
  const k = T.scale * Math.max(0.78, Math.min(1.16, Math.sqrt((fw * fh) / (T.w * T.h))));
  const gap = GAP * Math.max(0.75, Math.min(1.1, k));
  const pad = 4;
  const font = LABEL.font[mode];
  const lh = LABEL.lh[mode];
  // (the mono's advance is 0.6 em; letter-spacing follows every character, the last one too)
  const charW = font * (0.6 + LABEL.ls);
  const nodes = companies.map((c) => {
    const [tx, ty] = T.at[c.id];
    const d = Math.round(diameterFor(c.count) * k);
    const lines = labelLines(c.name);
    const label = { lines, w: Math.ceil(Math.max(...lines.map((s) => s.length)) * charW) + 2, h: lines.length * lh, side: "below", box: null };
    return { id: c.id, x: (tx / T.w) * fw, y: (ty / T.h) * fh, r: d / 2, d, depth: mode === "wide" && c.count === 1 ? 1 : 0, count: c.count, label };
  });
  // while placing, every label is under its circle: the room it is given is the room it needs most often
  const below = (n) => labelBox(n, "below");
  const clamp = (n) => {
    const hw = Math.max(n.r, n.label.w / 2);
    n.x = Math.max(hw + pad, Math.min(fw - hw - pad, n.x));
    n.y = Math.max(n.r + pad, Math.min(fh - n.r - LABEL.off - n.label.h - pad, n.y));
  };
  nodes.forEach(clamp);
  // nudge apart: the field's aspect differs from the template's, so neighbours may come too close
  const shove = (a, b, ux, uy, by) => {
    const l = Math.hypot(ux, uy) || 1;
    const s = by / 2 + 0.25;
    a.x -= (ux / l) * s;
    a.y -= (uy / l) * s;
    b.x += (ux / l) * s;
    b.y += (uy / l) * s;
    clamp(a);
    clamp(b);
  };
  /** b's circle against a's label: push b off it */
  const circleOffLabel = (a, b) => {
    const q = below(a);
    const dist = rectDist(b.x, b.y, q);
    const want = b.r + LABEL_M;
    if (dist >= want) return false;
    const cx = Math.max(q.l, Math.min(b.x, q.r));
    const cy = Math.max(q.t, Math.min(b.y, q.b));
    let ux = b.x - cx;
    let uy = b.y - cy;
    if (Math.hypot(ux, uy) < 0.01) {
      ux = b.x - a.x;
      uy = b.y - a.y;
    }
    shove(a, b, ux, uy, want - dist);
    return true;
  };
  for (let it = 0; it < 300; it++) {
    let moved = false;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const want = a.r + b.r + gap;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dist = Math.hypot(dx, dy);
        if (dist < want) {
          if (dist < 0.01) {
            dx = 1;
            dy = 0.5;
            dist = Math.hypot(dx, dy);
          }
          shove(a, b, dx, dy, want - dist);
          moved = true;
        }
        if (circleOffLabel(a, b)) moved = true;
        if (circleOffLabel(b, a)) moved = true;
        // the two labels
        const p = below(a);
        const q = below(b);
        const gx = Math.max(p.l - q.r, q.l - p.r);
        const gy = Math.max(p.t - q.b, q.t - p.b);
        if (gx < LABEL_M && gy < LABEL_M) {
          // apart along the cheaper axis
          if (LABEL_M - gx < LABEL_M - gy) shove(a, b, Math.sign(b.x - a.x) || 1, 0, LABEL_M - gx);
          else shove(a, b, 0, Math.sign(b.y - a.y) || 1, LABEL_M - gy);
          moved = true;
        }
      }
    }
    if (!moved) break;
  }
  nodes.forEach((n) => {
    n.x = Math.round(n.x * 10) / 10;
    n.y = Math.round(n.y * 10) / 10;
  });

  /* ---- the lines */
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const deg = new Map(nodes.map((n) => [n.id, 0]));
  const edges = [];
  const has = new Set();
  // union-find: the figure should be one piece
  const parent = new Map(nodes.map((n) => [n.id, n.id]));
  const root = (id) => (parent.get(id) === id ? id : root(parent.get(id)));
  /** the names already placed (none while the lines are first drawn) */
  const placed = [];
  const ok = (a, b) =>
    !has.has(pairKey(a.id, b.id)) &&
    deg.get(a.id) < MAX_DEG &&
    deg.get(b.id) < MAX_DEG &&
    !grazes(a, b, nodes) &&
    !edges.some((e) => crosses(a, b, byId.get(e.a), byId.get(e.b))) &&
    !placed.some((n) => segHitsRect(a.x, a.y, b.x, b.y, n.label.box, LABEL_CLEAR));
  const add = (a, b, strong) => {
    edges.push({ a: a.id, b: b.id, strong, far: a.depth + b.depth > 0 });
    has.add(pairKey(a.id, b.id));
    deg.set(a.id, deg.get(a.id) + 1);
    deg.set(b.id, deg.get(b.id) + 1);
    parent.set(root(a.id), root(b.id));
  };
  const drop = (e) => {
    edges.splice(edges.indexOf(e), 1);
    has.delete(pairKey(e.a, e.b));
    deg.set(e.a, deg.get(e.a) - 1);
    deg.set(e.b, deg.get(e.b) - 1);
  };
  const pairs = [];
  for (let i = 0; i < nodes.length; i++)
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      pairs.push({ a, b, len: Math.hypot(a.x - b.x, a.y - b.y) - a.r - b.r, strong: shared.has(pairKey(a.id, b.id)) });
    }
  pairs.sort((p, q) => p.len - q.len || p.a.id.localeCompare(q.a.id) || p.b.id.localeCompare(q.b.id));
  const wire = () => {
    // (re)start the pieces from the lines there are
    nodes.forEach((n) => parent.set(n.id, n.id));
    edges.forEach((e) => parent.set(root(e.a), root(e.b)));
    // 1. shared alumni
    for (const p of pairs) if (p.strong && ok(p.a, p.b)) add(p.a, p.b, true);
    // 2. nearest neighbours, until every circle has two lines
    for (const p of pairs) if ((deg.get(p.a.id) < MIN_DEG || deg.get(p.b.id) < MIN_DEG) && ok(p.a, p.b)) add(p.a, p.b, false);
    // 2b. the bigger names (three or more alumni) are hubs: a third line
    for (const p of pairs)
      if (((p.a.count >= 3 && deg.get(p.a.id) < 3) || (p.b.count >= 3 && deg.get(p.b.id) < 3)) && p.a.depth + p.b.depth === 0 && ok(p.a, p.b)) add(p.a, p.b, false);
    // 3. bridges: the shortest lines that join two pieces
    for (const p of pairs) if (root(p.a.id) !== root(p.b.id) && ok(p.a, p.b)) add(p.a, p.b, p.strong);
  };
  wire();

  /* ---- the names: each on the first side of its circle that is free */
  const through = (q) =>
    edges.filter((e) => {
      const a = byId.get(e.a);
      const b = byId.get(e.b);
      return segHitsRect(a.x, a.y, b.x, b.y, q, LABEL_CLEAR);
    });
  /** what is in the way of a name at q: off the field / on a circle / on a name (hard), lines (soft) */
  const cost = (n, q) => {
    let c = 0;
    if (q.l < pad || q.t < pad || q.r > fw - pad || q.b > fh - pad) c += 1000;
    // and it must read as its own circle's: no other ring nearer the name's middle
    const mx = (q.l + q.r) / 2;
    const my = (q.t + q.b) / 2;
    const own = Math.hypot(mx - n.x, my - n.y) - n.r;
    for (const m of nodes) if (m !== n && (rectDist(m.x, m.y, q) < m.r + LABEL_M || Math.hypot(mx - m.x, my - m.y) - m.r < own + 6)) c += 1000;
    for (const m of placed) if (rectGap(m.label.box, q) < LABEL_M) c += 1000;
    for (const e of through(q)) c += e.strong ? 20 : 1;
    return c;
  };
  const free = (n) => SIDES.filter((s) => cost(n, labelBox(n, s)) === 0);
  const todo = new Set(nodes);
  let rewire = false;
  while (todo.size) {
    // the most hemmed-in circle first
    let pick = null;
    let opts = null;
    for (const n of todo) {
      const f = free(n);
      if (!pick || f.length < opts.length) {
        pick = n;
        opts = f;
      }
    }
    todo.delete(pick);
    let side = opts[0];
    if (!side) {
      // nowhere free: the side with the least in the way (plain lines before shared ones), and
      // the lines through it go; the circles they leave short are wired again below
      side = SIDES.reduce((s, t) => (cost(pick, labelBox(pick, t)) < cost(pick, labelBox(pick, s)) ? t : s));
      through(labelBox(pick, side)).forEach(drop);
      rewire = true;
    }
    pick.label.side = side;
    pick.label.box = roundBox(labelBox(pick, side));
    placed.push(pick);
  }
  // lines lost to the names: new ones, around every name now
  if (rewire) wire();

  // a circle still short of lines (a tight field): try its name, or a neighbour's, on another side
  const short = () => nodes.filter((n) => deg.get(n.id) < MIN_DEG).length + (connected(nodes, edges) ? 0 : 1);
  const setEdges = (list) => {
    edges.length = 0;
    has.clear();
    nodes.forEach((n) => deg.set(n.id, 0));
    list.forEach((e) => {
      edges.push(e);
      has.add(pairKey(e.a, e.b));
      deg.set(e.a, deg.get(e.a) + 1);
      deg.set(e.b, deg.get(e.b) + 1);
    });
  };
  for (let round = 0; round < 8 && short(); round++) {
    const base = short();
    let best = null;
    const lacking = nodes.filter((n) => deg.get(n.id) < MIN_DEG);
    const near = new Set();
    for (const d of lacking.length ? lacking : nodes) {
      near.add(d);
      [...nodes]
        .filter((n) => n !== d)
        .sort((a, b) => Math.hypot(a.x - d.x, a.y - d.y) - Math.hypot(b.x - d.x, b.y - d.y))
        .slice(0, 4)
        .forEach((n) => near.add(n));
    }
    const saved = edges.slice();
    for (const c of near) {
      const was = c.label.side;
      const wasBox = c.label.box;
      for (const sd of SIDES) {
        if (sd === was) continue;
        const q = labelBox(c, sd);
        // (judged without its own old box)
        c.label.box = { l: -1e4, t: -1e4, r: -1e4, b: -1e4 };
        const hard = cost(c, q) >= 1000;
        c.label.box = wasBox;
        if (hard) continue;
        c.label.side = sd;
        c.label.box = roundBox(q);
        through(q).forEach(drop);
        wire();
        const score = short();
        if (score < base && (!best || score < best.score)) best = { c, sd, box: c.label.box, score, edges: edges.slice() };
        c.label.side = was;
        c.label.box = wasBox;
        setEdges(saved);
      }
    }
    if (!best) break;
    best.c.label.side = best.sd;
    best.c.label.box = best.box;
    setEdges(best.edges);
  }
  return { mode, k, fw, fh, font, lh, nodes, edges };
}

const roundBox = (q) => ({ l: Math.round(q.l * 10) / 10, t: Math.round(q.t * 10) / 10, r: Math.round(q.r * 10) / 10, b: Math.round(q.b * 10) / 10 });

/** All the nodes are one piece over these edges. */
function connected(nodes, edges) {
  if (!nodes.length) return true;
  const seen = new Set([nodes[0].id]);
  const stack = [nodes[0].id];
  while (stack.length) {
    const id = stack.pop();
    for (const e of edges) {
      const o = e.a === id ? e.b : e.b === id ? e.a : null;
      if (o && !seen.has(o)) {
        seen.add(o);
        stack.push(o);
      }
    }
  }
  return seen.size === nodes.length;
}

/**
 * The rules, against a layout (and optionally rectangles nothing may touch, in field px): circles
 * and names inside the field and apart, every circle 2–4 lines, no crossings, no line through a
 * third circle or through any name, one piece. `labels`: the names' boxes as drawn (field px, by
 * id), to check what is on screen rather than what was planned. Returns the problems found
 * (empty: all good).
 * @param {ReturnType<typeof layoutConstellation>} L
 * @param {{ avoid?: { name: string, l: number, t: number, r: number, b: number }[], labels?: Map<string, { l: number, t: number, r: number, b: number }> }} [o]
 */
export function checkConstellation(L, o = {}) {
  const problems = [];
  const byId = new Map(L.nodes.map((n) => [n.id, n]));
  const box = (n) => o.labels?.get(n.id) ?? n.label?.box;
  for (const n of L.nodes) {
    if (n.x - n.r < -0.5 || n.y - n.r < -0.5 || n.x + n.r > L.fw + 0.5 || n.y + n.r > L.fh + 0.5) problems.push(`${n.id} outside the field`);
    const q = box(n);
    if (q && (q.l < -0.5 || q.t < -0.5 || q.r > L.fw + 0.5 || q.b > L.fh + 0.5)) problems.push(`${n.id}'s name outside the field`);
    for (const a of o.avoid ?? []) {
      const cx = Math.max(a.l, Math.min(n.x, a.r));
      const cy = Math.max(a.t, Math.min(n.y, a.b));
      if (Math.hypot(n.x - cx, n.y - cy) < n.r + 4) problems.push(`${n.id} touches ${a.name}`);
      if (q && rectGap(q, a) < 4) problems.push(`${n.id}'s name touches ${a.name}`);
    }
    if (q) {
      const mx = (q.l + q.r) / 2;
      const my = (q.t + q.b) / 2;
      const own = Math.hypot(mx - n.x, my - n.y) - n.r;
      for (const m of L.nodes) {
        if (rectDist(m.x, m.y, q) < m.r + 2) problems.push(`${n.id}'s name touches ${m.id}`);
        else if (m !== n && Math.hypot(mx - m.x, my - m.y) - m.r < own) problems.push(`${n.id}'s name reads as ${m.id}'s`);
      }
    }
  }
  for (let i = 0; i < L.nodes.length; i++)
    for (let j = i + 1; j < L.nodes.length; j++) {
      const a = L.nodes[i];
      const b = L.nodes[j];
      const g = Math.hypot(a.x - b.x, a.y - b.y) - a.r - b.r;
      if (g < 12) problems.push(`${a.id} and ${b.id} ${g.toFixed(1)}px apart`);
      const p = box(a);
      const q = box(b);
      if (p && q && rectGap(p, q) < 2) problems.push(`${a.id}'s and ${b.id}'s names touch`);
    }
  const deg = new Map(L.nodes.map((n) => [n.id, 0]));
  L.edges.forEach((e, i) => {
    deg.set(e.a, deg.get(e.a) + 1);
    deg.set(e.b, deg.get(e.b) + 1);
    const a = byId.get(e.a);
    const b = byId.get(e.b);
    for (const n of L.nodes) {
      if (n !== a && n !== b && segDist(n.x, n.y, a.x, a.y, b.x, b.y) < n.r + 2) problems.push(`${e.a}–${e.b} passes through ${n.id}`);
      const q = box(n);
      if (q && segHitsRect(a.x, a.y, b.x, b.y, q, 1)) problems.push(`${e.a}–${e.b} passes through ${n.id}'s name`);
    }
    for (const f of L.edges.slice(i + 1)) if (crosses(a, b, byId.get(f.a), byId.get(f.b))) problems.push(`${e.a}–${e.b} crosses ${f.a}–${f.b}`);
  });
  for (const [id, d] of deg) if (d < MIN_DEG || d > MAX_DEG) problems.push(`${id} has ${d} lines`);
  if (!connected(L.nodes, L.edges)) problems.push("some circles are not joined to the rest");
  return problems;
}
