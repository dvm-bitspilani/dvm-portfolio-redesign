// Where a lit company's people go in the Legacy constellation (legacy/Legacy.jsx): a column of pills
// beside, under or over its circle, each joined to the circle by its own teal connector, like the
// original's people branching out of the Google circle. Pure arithmetic on measured px, no DOM.
//
// Candidates (each scored, the cheapest wins):
//   right / left – a column beside the circle (centred on it, or hanging from / standing on its
//                  level); each connector leaves the rim towards its pill, then turns level into it
//                  (the original's elbow)
//   below / above – a column under / over the circle, on one side of a spine that drops from the
//                  rim; each pill branches off the spine (phones, and circles hemmed in at the sides)
// Hard rules: every pill inside the bounds (the graph box, short of the DVM mark), pills apart, no
// connector through a pill. Soft: pills and connectors off the other circles and their names, the
// side the original used (right) first.

/** Pills this far apart (px), at least FAN.gapMin when the column is tall. */
export const FAN = { gap: 8, gapMin: 4, off: 26, offPer: 4, knee: 16, branch: 16, drop: 12, corner: 6, rimPad: 3, lift: 1.08, spread: (11 * Math.PI) / 180 };

/** Lean of a side connector off the rim, at most (rad). */
const MAX_LEAN = (70 * Math.PI) / 180;

/**
 * Where each side connector leaves the ring (rad off level): towards its knee, then spread so
 * neighbours are at least FAN.spread apart around the ring (kept in order, so none cross).
 */
function leans(want) {
  const n = want.length;
  const a = want.map((v) => Math.max(-MAX_LEAN, Math.min(MAX_LEAN, v)));
  if (n < 2) return a;
  const step = Math.min(FAN.spread, (2 * MAX_LEAN) / (n - 1));
  // forward and back passes push neighbours apart; then the run is slid back inside the limits
  for (let i = 1; i < n; i++) a[i] = Math.max(a[i], a[i - 1] + step);
  for (let i = n - 2; i >= 0; i--) a[i] = Math.min(a[i], a[i + 1] - step);
  const lo = -MAX_LEAN - a[0];
  const hi = MAX_LEAN - a[n - 1];
  const shift = lo > 0 ? lo : hi < 0 ? hi : 0;
  // (centre the run on what was wanted, as far as the limits let it)
  const mid = (want.reduce((s, v) => s + v, 0) - a.reduce((s, v) => s + v, 0)) / n;
  const k = shift || Math.max(lo, Math.min(hi, mid));
  return a.map((v) => v + k);
}

const rectDist = (x, y, q) => Math.hypot(Math.max(q.l - x, 0, x - q.r), Math.max(q.t - y, 0, y - q.b));
const overlap = (p, q, m = 0) => p.l < q.r + m && q.l < p.r + m && p.t < q.b + m && q.t < p.b + m;
const box = (p) => ({ l: p.x, t: p.y, r: p.x + p.w, b: p.y + p.h });

/** Distance from point p to segment ab. */
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
/** Segment ab enters rectangle q grown by m (Liang–Barsky). */
function segHitsRect(ax, ay, bx, by, q, m = 0) {
  const dx = bx - ax;
  const dy = by - ay;
  let t0 = 0;
  let t1 = 1;
  for (const [p, d] of [
    [-dx, ax - (q.l - m)],
    [dx, q.r + m - ax],
    [-dy, ay - (q.t - m)],
    [dy, q.b + m - ay],
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

/** A polyline as an SVG path with its corners rounded (radius FAN.corner, less on short legs). */
export function roundedPath(pts) {
  const p = pts.filter((q, i) => i === 0 || Math.hypot(q[0] - pts[i - 1][0], q[1] - pts[i - 1][1]) > 0.5);
  const f = (v) => Math.round(v * 10) / 10;
  let d = `M${f(p[0][0])} ${f(p[0][1])}`;
  for (let i = 1; i < p.length - 1; i++) {
    const [ax, ay] = p[i - 1];
    const [kx, ky] = p[i];
    const [bx, by] = p[i + 1];
    const la = Math.hypot(kx - ax, ky - ay);
    const lb = Math.hypot(bx - kx, by - ky);
    const c = Math.min(FAN.corner, la / 2, lb / 2);
    d += ` L${f(kx - ((kx - ax) / la) * c)} ${f(ky - ((ky - ay) / la) * c)} Q${f(kx)} ${f(ky)} ${f(kx + ((bx - kx) / lb) * c)} ${f(ky + ((by - ky) / lb) * c)}`;
  }
  const z = p[p.length - 1];
  return `${d} L${f(z[0])} ${f(z[1])}`;
}

/** Stack heights into a column with the given gap: each pill's top offset. */
function stack(sizes, gap) {
  const tops = [];
  let y = 0;
  for (const s of sizes) {
    tops.push(y);
    y += s.h + gap;
  }
  return { tops, h: y - gap };
}

/**
 * @param {{
 *   node: { x: number, y: number, r: number },
 *   sizes: { w: number, h: number }[],
 *   bounds: { l: number, t: number, r: number, b: number },
 *   circles?: { id?: string, x: number, y: number, r: number }[],
 *   rects?: { l: number, t: number, r: number, b: number, own?: boolean }[],
 *   prefer?: string[],
 *   floor?: number,
 * }} o  everything in one px space (Legacy's field). circles: the other companies; rects: names
 *   (own: the lit company's own). prefer: side order (earlier is cheaper). floor: a soft bottom
 *   (phones: the graph's own; past it the page makes room, at a cost per px, up to bounds.b).
 * @returns {{ side: string, pills: { x: number, y: number, w: number, h: number }[], paths: { d: string, pts: number[][] }[],
 *   bridge: number[][], cost: number } | null}
 */
export function layoutFan({ node, sizes, bounds, circles = [], rects = [], prefer = ["right", "left", "below", "above"], floor = Infinity }) {
  if (!sizes.length) return null;
  const n = sizes.length;
  const rr = node.r * FAN.lift + FAN.rimPad;
  const bh = bounds.b - bounds.t;
  const sumH = sizes.reduce((s, q) => s + q.h, 0);
  const gap = n > 1 ? Math.max(FAN.gapMin, Math.min(FAN.gap, (bh - sumH) / (n - 1))) : 0;
  const col = stack(sizes, gap);
  const wMax = Math.max(...sizes.map((s) => s.w));
  const cands = [];

  /* ---- beside: the elbow fan */
  const off = FAN.off + FAN.offPer * Math.min(n, 6);
  for (const side of ["right", "left"]) {
    const dir = side === "right" ? 1 : -1;
    // the column's inner edge
    const edge = node.x + dir * (rr + off);
    const ideal = node.y - col.h / 2;
    const tops = new Set([ideal, node.y - sizes[0].h / 2, node.y + sizes[n - 1].h / 2 - col.h].map((t) => Math.round(Math.max(bounds.t, Math.min(bounds.b - col.h, t)))));
    for (const top of tops) {
      const pills = sizes.map((s, i) => ({ x: dir > 0 ? edge : edge - s.w, y: top + col.tops[i], w: s.w, h: s.h }));
      const kx = edge - dir * FAN.knee;
      const lean = leans(pills.map((p) => Math.atan2(p.y + p.h / 2 - node.y, Math.abs(kx - node.x))));
      const paths = pills.map((p, i) => {
        const cy = p.y + p.h / 2;
        const sx = node.x + dir * rr * Math.cos(lean[i]);
        const sy = node.y + rr * Math.sin(lean[i]);
        const pts = [
          [sx, sy],
          [kx, cy],
          [edge, cy],
        ];
        return { d: roundedPath(pts), pts };
      });
      const a = paths[0].pts[0];
      const z = paths[n - 1].pts[0];
      const bridge = [a, [edge, top], [edge, top + col.h], z];
      cands.push({ side, pills, paths, bridge });
    }
  }

  /* ---- under / over: a spine off the rim, the pills branching from it */
  for (const side of ["below", "above"]) {
    const dir = side === "below" ? 1 : -1;
    const first = node.y + dir * (rr + FAN.drop + 6);
    const top = dir > 0 ? first : first - col.h;
    for (const hand of ["right", "left"]) {
      const h = hand === "right" ? 1 : -1;
      // the spine: under the centre when the pills fit beside it, else shifted towards the room
      let sx = node.x;
      if (h > 0) sx = Math.max(bounds.l + 2, Math.min(sx, bounds.r - FAN.branch - wMax));
      else sx = Math.min(bounds.r - 2, Math.max(sx, bounds.l + FAN.branch + wMax));
      const pills = sizes.map((s, i) => ({ x: h > 0 ? sx + FAN.branch : sx - FAN.branch - s.w, y: top + col.tops[i], w: s.w, h: s.h }));
      // where the spine leaves the rim (straight down/up when it is under the circle)
      const rx = Math.max(node.x - rr * 0.6, Math.min(node.x + rr * 0.6, sx));
      const ry = node.y + dir * Math.sqrt(Math.max(0, rr * rr - (rx - node.x) ** 2));
      const y1 = node.y + dir * (rr + FAN.drop);
      const paths = pills.map((p) => {
        const cy = p.y + p.h / 2;
        const ex = h > 0 ? p.x : p.x + p.w;
        const pts = Math.abs(sx - rx) < 1 ? [[sx, ry], [sx, cy], [ex, cy]] : [[rx, ry], [rx, y1], [sx, y1], [sx, cy], [ex, cy]];
        return { d: roundedPath(pts), pts };
      });
      const ys = pills.map((p) => p.y);
      const bridge = [
        [Math.min(rx, sx) - 6, ry],
        [Math.max(rx, sx) + 6, ry],
        [Math.max(rx, sx) + 6, dir > 0 ? Math.min(...ys) : Math.max(...ys.map((y, i) => y + pills[i].h))],
        [Math.min(rx, sx) - 6, dir > 0 ? Math.min(...ys) : Math.max(...ys.map((y, i) => y + pills[i].h))],
      ];
      cands.push({ side, hand, pills, paths, bridge });
    }
  }

  /* ---- one person: straight under / over the circle on a short stem */
  if (n === 1) {
    const s0 = sizes[0];
    for (const side of ["below", "above"]) {
      const dir = side === "below" ? 1 : -1;
      const x = Math.max(bounds.l, Math.min(bounds.r - s0.w, node.x - s0.w / 2));
      // the stem: under the centre, or as near it as the pill's straight part allows
      const sx = Math.max(x + s0.h / 2, Math.min(x + s0.w - s0.h / 2, node.x));
      if (Math.abs(sx - node.x) > rr * 0.6) continue;
      const ry = node.y + dir * Math.sqrt(Math.max(0, rr * rr - (sx - node.x) ** 2));
      const y = dir > 0 ? node.y + rr + FAN.drop + 6 : node.y - rr - FAN.drop - 6 - s0.h;
      const pts = [
        [sx, ry],
        [sx, dir > 0 ? y : y + s0.h],
      ];
      const pills = [{ x, y, w: s0.w, h: s0.h }];
      const bridge = [
        [sx - 10, ry],
        [sx + 10, ry],
        [sx + 10, pts[1][1]],
        [sx - 10, pts[1][1]],
      ];
      cands.push({ side, hand: "stem", pills, paths: [{ d: roundedPath(pts), pts }], bridge });
    }
  }

  /* ---- score */
  let best = null;
  for (const c of cands) {
    let cost = Math.max(0, prefer.indexOf(c.side)) * 12 + (c.hand === "left" ? 3 : c.hand === "stem" ? -6 : 0);
    for (const p of c.pills) {
      const q = box(p);
      // outside the bounds: by how far (hard)
      const out = Math.max(0, bounds.l - q.l) + Math.max(0, q.r - bounds.r) + Math.max(0, bounds.t - q.t) + Math.max(0, q.b - bounds.b);
      if (out > 0.5) cost += 1e5 + out * 100;
      if (q.b > floor) cost += 20 + (q.b - floor) * 0.5;
      // on the lit circle itself (hard)
      if (rectDist(node.x, node.y, q) < rr + 2) cost += 1e5;
      for (const m of circles) {
        const d = rectDist(m.x, m.y, q);
        if (d < m.r + 6) cost += 40 + (m.r + 6 - d);
      }
      for (const r of rects) if (overlap(q, r, 3)) cost += r.own ? 400 : 14;
    }
    for (const path of c.paths) {
      const pts = path.pts;
      for (let i = 1; i < pts.length; i++) {
        const [ax, ay] = pts[i - 1];
        const [bx, by] = pts[i];
        for (const m of circles) if (segDist(m.x, m.y, ax, ay, bx, by) < m.r + 2) cost += 24;
        for (const r of rects) if (segHitsRect(ax, ay, bx, by, r, 2)) cost += r.own ? 60 : 6;
        cost += Math.hypot(bx - ax, by - ay) * 0.02;
      }
    }
    c.cost = Math.round(cost * 10) / 10;
    if (!best || c.cost < best.cost) best = c;
  }
  best.pills = best.pills.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y), w: p.w, h: p.h }));
  return best;
}

/**
 * The fan's hard rules against what is on screen (Legacy's __v8LegacyCheck): pills inside the
 * bounds, apart, off the mark; no connector through a pill (its own pill's end excepted).
 * @param {{ pills: { x: number, y: number, w: number, h: number }[], paths: { pts: number[][] }[] }} fan
 * @param {{ l: number, t: number, r: number, b: number }} bounds
 * @param {{ l: number, t: number, r: number, b: number }[]} [drawn] the pills as drawn (else planned)
 */
export function checkFan(fan, bounds, drawn) {
  const problems = [];
  const q = drawn ?? fan.pills.map(box);
  q.forEach((p, i) => {
    if (p.l < bounds.l - 0.5 || p.t < bounds.t - 0.5 || p.r > bounds.r + 0.5 || p.b > bounds.b + 0.5) problems.push(`pill ${i} outside the bounds`);
    for (let j = i + 1; j < q.length; j++) if (overlap(p, q[j], 1)) problems.push(`pills ${i} and ${j} overlap`);
  });
  fan.paths.forEach((path, i) => {
    const pts = path.pts;
    for (let s = 1; s < pts.length; s++)
      q.forEach((p, j) => {
        // (the last leg ends on its own pill's edge)
        const inset = { l: p.l + 2, t: p.t + 2, r: p.r - 2, b: p.b - 2 };
        if (segHitsRect(pts[s - 1][0], pts[s - 1][1], pts[s][0], pts[s][1], inset, 0) && !(j === i && s === pts.length - 1)) problems.push(`connector ${i} crosses pill ${j}`);
      });
  });
  return problems;
}
