// Warm the archive before anyone opens it: once the hero has booted and the browser is idle,
// fetch the /archive page's chunk and decode the wall's tile images into the HTTP / image cache,
// six at a time, in the order the wall itself asks for them (nearest to 0, 0 first; same items,
// same packing, same torus distance as the kit's WallEngine.distTo). Never blocks anything: one
// image per idle slot, stops on Save-Data or a 2g connection, and stops when V8 unmounts.
import { defaultArchiveItems } from "../../../immersive/kit/archive";
import { WallModel } from "../../../immersive/kit/archive/model";

/** The /archive route's own chunk (index.jsx lazy-loads it from here, so it is one module). */
export const loadArchivePage = () => import("../pages/ArchivePage");

const IN_FLIGHT = 6;
const wrapD = (d, p) => d - p * Math.round(d / p);

function constrained() {
  const c = navigator.connection;
  if (!c) return false;
  return Boolean(c.saveData) || /(^|-)2g$/.test(String(c.effectiveType || ""));
}

const idle = (fn) =>
  typeof window.requestIdleCallback === "function"
    ? window.requestIdleCallback(fn, { timeout: 2000 })
    : window.setTimeout(() => fn({ timeRemaining: () => 8, didTimeout: true }), 200);
const cancelIdle = (id) => (typeof window.cancelIdleCallback === "function" ? window.cancelIdleCallback(id) : window.clearTimeout(id));

/** Tile image URLs, nearest to the wall's origin first. */
function archiveQueue() {
  const model = new WallModel(defaultArchiveItems());
  const L = model.layout("all");
  const P = model.period;
  const seen = new Set();
  return model.items
    .filter((it) => it.img)
    .map((it) => {
      const i = it.index;
      const dx = wrapD(L.rects[i * 4] + L.rects[i * 4 + 2] / 2, P.w);
      const dy = wrapD(L.rects[i * 4 + 1] + L.rects[i * 4 + 3] / 2, P.h);
      return { src: it.img, d: Math.hypot(dx, dy) };
    })
    .sort((a, b) => a.d - b.d)
    .map((e) => e.src)
    .filter((src) => (seen.has(src) ? false : (seen.add(src), true)));
}

let warmed = false;

/** Start warming (once per page load). Returns a stop function. */
export function warmArchive() {
  if (warmed || constrained()) return () => {};
  warmed = true;
  let stopped = false;
  let queue = null;
  let inflight = 0;
  let handle = 0;

  const pump = (deadline) => {
    handle = 0;
    if (stopped) return;
    if (constrained()) {
      stopped = true;
      return;
    }
    if (!queue) {
      // first slot: the route chunk, then build the order (a few ms of packing)
      loadArchivePage().catch(() => {});
      queue = archiveQueue();
      schedule();
      return;
    }
    while (inflight < IN_FLIGHT && queue.length && (deadline.didTimeout || deadline.timeRemaining() > 2)) {
      const src = queue.shift();
      inflight++;
      const img = new Image();
      img.decoding = "async";
      img.src = src;
      const done = () => {
        inflight--;
        schedule();
      };
      (img.decode ? img.decode() : Promise.resolve()).then(done, done);
    }
    if (queue.length && inflight < IN_FLIGHT) schedule();
  };
  const schedule = () => {
    if (!stopped && !handle && queue?.length !== 0) handle = idle(pump);
  };

  schedule();
  return () => {
    stopped = true;
    if (handle) cancelIdle(handle);
    handle = 0;
    // a later mount (same page load) warms again from the start (cached files are cheap)
    warmed = false;
  };
}
