// /team, every version: URL state, the sticky bar's height, the room's pool following the pointer,
// the batch the viewport is reading, and jumping to a batch.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useLight } from "../../chrome/lightControl";
import { BATCHES, BY_SLUG, TEAMS } from "./data";

const SEARCH_DEBOUNCE = 120;

/**
 * The page's state, all in the URL: ?v= team (lit / filtered), ?q= search (written after a short
 * pause), ?p= the pinned member (slug), ?b= a batch (old links from /about: jump there, then drop).
 */
export function useTeamParams() {
  const [params, setParams] = useSearchParams();
  const vParam = params.get("v");
  const qParam = params.get("q") ?? "";
  const pParam = params.get("p");
  const bParam = Number.parseInt(params.get("b") ?? "", 10);
  const v = TEAMS.some((t) => t.id === vParam) ? vParam : null;
  const pinned = pParam && BY_SLUG.has(pParam) ? pParam : null;
  const b = BATCHES.includes(bParam) ? bParam : null;

  const update = useCallback(
    (patch) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, val] of Object.entries(patch)) {
            if (val === null || val === undefined || val === "") next.delete(k);
            else next.set(k, String(val));
          }
          return next;
        },
        { replace: true, preventScrollReset: true },
      ),
    [setParams],
  );

  // search: filter on every keystroke, write ?q= after a short pause
  const [query, setQuery] = useState(qParam);
  const written = useRef(qParam);
  useEffect(() => {
    // the URL changed from outside (back / forward): follow it
    if (qParam !== written.current) {
      written.current = qParam;
      setQuery(qParam);
    }
  }, [qParam]);
  useEffect(() => {
    if (query === written.current) return;
    const t = window.setTimeout(() => {
      written.current = query;
      update({ q: query.trim() ? query : null });
    }, SEARCH_DEBOUNCE);
    return () => window.clearTimeout(t);
  }, [query, update]);
  const clearQuery = useCallback(() => {
    setQuery("");
    written.current = "";
    update({ q: null });
  }, [update]);

  const setTeam = useCallback((id) => update({ v: id }), [update]);
  const pin = useCallback((slug) => update({ p: slug }), [update]);
  const unpin = useCallback(() => update({ p: null }), [update]);

  return { v, b, pinned, query, setQuery, clearQuery, setTeam, pin, unpin, update };
}

/** The sticky bar's real height as --bar-h on `hostRef` (what sticks under the bar starts there). */
export function useBarHeight(barRef, hostRef) {
  useLayoutEffect(() => {
    const bar = barRef.current;
    const host = hostRef.current;
    if (!bar || !host) return;
    const set = () => host.style.setProperty("--bar-h", `${Math.round(bar.offsetHeight)}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(bar);
    return () => ro.disconnect();
  }, [barRef, hostRef]);
}

/**
 * The room's pool of light follows the pointer while it is over `ref` (fine pointers, motion
 * allowed): the faces under it come up. Released to the section's declared spot on leave.
 */
export function usePoolFollow(ref, enabled, radius = 0.2) {
  const light = useLight();
  useEffect(() => {
    const el = ref.current;
    if (!el || !light || !enabled) return;
    const id = `team-${Math.random().toString(36).slice(2)}`;
    let raf = 0;
    let pt = null;
    const paint = () => {
      raf = 0;
      if (!pt) return;
      const spot = { x: pt.x, y: pt.y, r: Math.max(180, window.innerWidth * radius), f: 1.1 };
      if (light.owns(id)) light.push(id, spot);
      else light.claim(id, spot);
    };
    const onMove = (e) => {
      if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      pt = { x: e.clientX, y: e.clientY };
      if (!raf) raf = requestAnimationFrame(paint);
    };
    const onLeave = () => {
      pt = null;
      cancelAnimationFrame(raf);
      raf = 0;
      light.release(id);
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
      light.release(id);
    };
  }, [ref, light, enabled, radius]);
}

/** Which batch block (elements with data-batch inside `ref`) holds the reading line (40 % down).
 *  `key` changes when the set of blocks does (a search hides some). */
export function useActiveBatch(ref, key = "") {
  const [active, setActive] = useState(BATCHES[0]);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const blocks = [...root.querySelectorAll("[data-batch]")];
    if (!blocks.length) return;
    // until the reading line meets a batch (the page's top), the first one shown is current
    if (blocks[0].getBoundingClientRect().top > window.innerHeight * 0.4) setActive(Number(blocks[0].dataset.batch));
    const seen = new Map();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen.set(e.target, e.isIntersecting);
        const hit = blocks.find((b) => seen.get(b));
        if (hit) setActive(Number(hit.dataset.batch));
      },
      { rootMargin: "-40% 0px -59% 0px" },
    );
    blocks.forEach((b) => io.observe(b));
    return () => io.disconnect();
  }, [ref, key]);
  return [active, setActive];
}

/** Scroll a batch block (id `v8-team-<batch>`) under the bar; its CSS scroll-margin clears the bar. */
export function jumpTo(batch, reduced) {
  const el = document.getElementById(`v8-team-${batch}`);
  if (!el) return false;
  el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  return true;
}

/** ?b=2021 (old links) or #2021 on arrival: jump to that batch once the page is laid out, drop ?b=. */
export function useArrivalJump(b, update, reduced) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const fromHash = Number.parseInt(window.location.hash.replace(/^#/, ""), 10);
    const target = b ?? (BATCHES.includes(fromHash) ? fromHash : null);
    if (!target) return;
    const id = requestAnimationFrame(() => {
      jumpTo(target, true);
      if (b) update({ b: null });
    });
    return () => cancelAnimationFrame(id);
  }, [b, update, reduced]);
}

/** Esc unpins (unless a field or a dialog has it). */
export function useEscape(active, fn) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (e.target?.closest?.('input, textarea, select, [role="dialog"]')) return;
      fn();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, fn]);
}

/**
 * Arrow keys across a wall of buttons (`selector` inside `root`, skipping [data-off]): left /
 * right step in reading order, up / down go to the nearest one in the row above / below, Home /
 * End the first / last in the group (`groupSel`), Page Up / Down the next group. Returns the
 * button moved to (focused and scrolled into view), or null when the key isn't ours.
 */
export function walkGrid(e, root, selector, groupSel) {
  const btn = e.target;
  if (!(btn instanceof HTMLElement) || !btn.matches(selector) || !root) return null;
  const all = [...root.querySelectorAll(`${selector}:not([data-off])`)];
  const i = all.indexOf(btn);
  if (i < 0) return null;
  const groupOf = (el) => el.closest(groupSel);
  let to = null;
  if (e.key === "ArrowRight") to = all[i + 1];
  else if (e.key === "ArrowLeft") to = all[i - 1];
  else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    const down = e.key === "ArrowDown";
    const r = btn.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    let best = null;
    let bestDy = Infinity;
    let bestDx = Infinity;
    for (const el of all) {
      if (el === btn) continue;
      const o = el.getBoundingClientRect();
      const dy = down ? o.top - r.top : r.top - o.top;
      if (dy <= 4) continue;
      const dx = Math.abs(o.left + o.width / 2 - cx);
      if (dy < bestDy - 4 || (Math.abs(dy - bestDy) <= 4 && dx < bestDx)) {
        best = el;
        bestDy = dy;
        bestDx = dx;
      }
    }
    to = best;
  } else if (e.key === "Home" || e.key === "End") {
    const mine = all.filter((el) => groupOf(el) === groupOf(btn));
    to = e.key === "Home" ? mine[0] : mine.at(-1);
  } else if (e.key === "PageDown" || e.key === "PageUp") {
    const here = groupOf(btn);
    const list = e.key === "PageDown" ? all.slice(i + 1) : all.slice(0, i).reverse();
    const next = list.find((el) => groupOf(el) !== here);
    to = next && e.key === "PageUp" ? all.find((el) => groupOf(el) === groupOf(next)) : next;
  }
  if (!to) return null;
  e.preventDefault();
  to.focus();
  to.scrollIntoView({ block: "nearest", behavior: "auto" });
  return to;
}
