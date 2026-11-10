// /alumni: the open company (research/v8-alumni-page-r3.md §3.7). One disc behaviour for the whole
// page — the wall's plates and the map's discs (CompanyDisc) both call `ctl` — and one store, so
// the people layer (Branch on pointer devices, CompanySheet on touch / phones) and every disc read
// the same state. Module-level like kin.js (one page, one open company).
//
// Keys say which disc the branch grows from: `wall:{tier-1 id}` or `map:{company id}` (a company
// can be on both). Opening a company lights its people (kin base) and, through kin, its other disc.
//
// Behaviour: the pointer opens after OPEN_DELAY and closes CLOSE_DELAY after it leaves the disc and
// its people, unless pinned. A click pins (and replaces any pin); a second click, Escape or a press
// outside the disc and its people closes. While something is pinned, hovering other discs opens
// nothing. Keyboard: focus opens (unpinned), Enter / Space pins, Tab from a pinned disc goes into
// its pills, Escape closes and hands the focus back to the disc. Touch (sheet mode): only a tap opens.
import { useEffect, useSyncExternalStore } from "react";
import { COMPANY_BY_ID, TIER1, companyPeople } from "../alumniData";
import { onStarRequest, setKinBase } from "./kin";

export const OPEN_DELAY = 120;
export const CLOSE_DELAY = 260;
/** The people region's id (the branch layer, or the sheet): the open disc's aria-controls. */
export const BRANCH_ID = "v8-alumni-branch";

/**
 * @typedef {import("../alumniData").CompanyPerson} CompanyPerson
 * @typedef {{ key: string, name: string, logo?: import("../alumniData").Logo, ids: readonly string[], rows: readonly CompanyPerson[] }} OpenCompany
 * @typedef {{ key: string, pinned: boolean }} Open
 */

const T1 = new Map(TIER1.map((t) => [t.id, t]));
/** @type {Map<string, OpenCompany | null>} */
const cache = new Map();

/** A disc's company and the people its branch lists. @param {string} key */
export function companyOf(key) {
  if (cache.has(key)) return cache.get(key) ?? null;
  const at = key.indexOf(":");
  const where = key.slice(0, at);
  const id = key.slice(at + 1);
  /** @type {OpenCompany | null} */
  let out = null;
  if (where === "wall") {
    const t = T1.get(id);
    if (t) out = { key, name: t.name, logo: t.logo, ids: t.ids, rows: t.people };
  } else {
    const c = COMPANY_BY_ID.get(id);
    if (c) out = { key, name: c.name, logo: c.logo, ids: [c.id], rows: companyPeople(c.id) };
  }
  cache.set(key, out);
  return out;
}

/* ---- the store */
/** @type {Open | null} */
let open = null;
/** @type {Set<() => void>} */
const subs = new Set();

export const getOpen = () => open;
/** @param {() => void} f */
export const onOpen = (f) => {
  subs.add(f);
  return () => {
    subs.delete(f);
  };
};
/** @param {Open | null} next */
export function setOpen(next) {
  if (next === open || (next && open && next.key === open.key && next.pinned === open.pinned)) return;
  open = next ? { key: next.key, pinned: !!next.pinned } : null;
  setKinBase(open ? (companyOf(open.key)?.ids ?? null) : null);
  for (const f of subs) f();
}
/** The open company, for a component. */
export const useOpen = () => useSyncExternalStore(onOpen, getOpen, getOpen);

/* ---- the controller */
const timers = { open: 0, close: 0, request: 0 };
/** Pointer devices ≥ 760 (the branch); otherwise the sheet, which only a tap or Enter opens. */
let hoverMode = false;
/** A disc asked for from the people list is on its way: hovers wait (the page scrolls under the pointer). */
let requesting = false;
/** Focus moved by us (back to a disc): not a reader's focus, opens nothing. */
let quietFocus = false;
/** The last pin came from the keyboard (Enter / Space): the sheet takes the focus. */
let keyboard = false;

const clear = () => {
  clearTimeout(timers.open);
  clearTimeout(timers.close);
};
/** @param {string} key @returns {HTMLButtonElement | null} */
export const buttonOf = (key) => document.querySelector(`[data-co-key="${CSS.escape(key)}"]`);
export const pinnedFromKeyboard = () => keyboard;

/** @param {HTMLElement | null | undefined} el */
function focusQuietly(el) {
  if (!el) return;
  quietFocus = true;
  el.focus({ preventScroll: true });
  quietFocus = false;
}

export const ctl = {
  /** @param {string} key @param {import("react").PointerEvent} e */
  enter(key, e) {
    if (!hoverMode || e.pointerType === "touch" || requesting) return;
    clearTimeout(timers.close);
    if (open?.pinned || open?.key === key) return;
    clearTimeout(timers.open);
    timers.open = window.setTimeout(() => {
      if (!open?.pinned) setOpen({ key, pinned: false });
    }, OPEN_DELAY);
  },
  /** The pointer left a disc, its pills or the band between them. @param {string} _key @param {import("react").PointerEvent} e */
  leave(_key, e) {
    if (!hoverMode || e.pointerType === "touch") return;
    clearTimeout(timers.open);
    if (!open || open.pinned) return;
    clearTimeout(timers.close);
    timers.close = window.setTimeout(() => {
      if (open && !open.pinned) setOpen(null);
    }, CLOSE_DELAY);
  },
  /** The pointer reached the pills (or the band to them): keep the branch. @param {import("react").PointerEvent} e */
  stay(e) {
    if (e.pointerType === "touch") return;
    clear();
  },
  /** @param {string} key @param {import("react").MouseEvent} e */
  click(key, e) {
    clear();
    keyboard = e.detail === 0;
    setOpen(open?.key === key && open.pinned ? null : { key, pinned: true });
  },
  /** Keep a company open where it is (a pill was chosen: its people stay lit below). @param {string} key */
  pin(key) {
    clear();
    setOpen({ key, pinned: true });
  },
  /** @param {string} key */
  focus(key) {
    if (!hoverMode || quietFocus) return;
    clear();
    if (open?.key !== key) setOpen({ key, pinned: false });
  },
  /** @param {string} key @param {import("react").FocusEvent} e */
  blur(key, e) {
    const to = /** @type {Element | null} */ (e.relatedTarget);
    if (to?.closest?.("[data-branch], [data-sheet]")) return;
    if (!open || open.key !== key || open.pinned) return;
    if (buttonOf(key)?.matches(":hover") || document.querySelector("[data-branch] :hover")) return;
    setOpen(null);
  },
  /** @param {string} key @param {import("react").KeyboardEvent} e */
  keyDown(key, e) {
    if (open?.key !== key) return;
    if (e.key === "Escape") {
      e.stopPropagation();
      ctl.close(true);
      return;
    }
    // a pinned disc: Tab goes on into its people
    if (e.key === "Tab" && !e.shiftKey && open.pinned && hoverMode) {
      const first = /** @type {HTMLElement | null} */ (document.querySelector("[data-branch] [data-pill]"));
      if (!first) return;
      e.preventDefault();
      first.focus();
    }
  },
  /** @param {boolean} [refocus] hand the focus back to the disc */
  close(refocus = false) {
    clear();
    const was = open;
    setOpen(null);
    if (refocus && was) focusQuietly(buttonOf(was.key));
  },
  /** From the pills: back to their disc (Shift+Tab off the first, Escape). */
  toDisc() {
    if (open) focusQuietly(buttonOf(open.key));
  },
};

const TABBABLE = 'a[href], button:not(:disabled), input, select, textarea, [tabindex]:not([tabindex="-1"])';
/** The control after `el` in the page's tab order, skipping the branch layer (Tab off the last pill). */
export function nextTabbable(el) {
  const all = [...document.querySelectorAll(TABBABLE)].filter((x) => !x.closest("[data-branch]") && /** @type {HTMLElement} */ (x).offsetParent !== null);
  const i = all.indexOf(el);
  return /** @type {HTMLElement | undefined} */ (i >= 0 ? all[i + 1] : undefined);
}

/**
 * The page's side of it (AlumniPage, once): the mode, the outside press / Escape that close a pin,
 * the people list's "show this company" requests, and a clean slate on unmount.
 * @param {{ hover: boolean, reduced: boolean }} o
 */
export function useCompanyPage({ hover, reduced }) {
  useEffect(() => {
    hoverMode = hover;
    // a hover-opened branch has nowhere to go in sheet mode
    if (!hover && open && !open.pinned) setOpen(null);
  }, [hover]);

  useEffect(() => {
    const down = (/** @type {PointerEvent} */ e) => {
      if (!open?.pinned) return;
      const t = /** @type {Element} */ (e.target);
      if (t.closest?.(`[data-co-key="${CSS.escape(open.key)}"], [data-branch], [data-sheet]`)) return;
      ctl.close(false);
    };
    const key = (/** @type {KeyboardEvent} */ e) => {
      if (e.key === "Escape" && open) ctl.close(open.pinned);
    };
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("keydown", key);
    };
  }, []);

  // "show this company" (a person's company in the list): bring its map disc to the middle of the
  // viewport, then pin it once the page has (mostly) arrived, so the branch opens where the reader looks
  useEffect(
    () =>
      onStarRequest((id) => {
        const key = `map:${id}`;
        const btn = buttonOf(key);
        if (!btn) return;
        clear();
        clearTimeout(timers.request);
        setOpen(null);
        requesting = true;
        btn.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
        timers.request = window.setTimeout(
          () => {
            requesting = false;
            clear();
            focusQuietly(btn);
            keyboard = false;
            setOpen({ key, pinned: true });
          },
          reduced ? 0 : 650,
        );
      }),
    [reduced],
  );

  useEffect(
    () => () => {
      clear();
      clearTimeout(timers.request);
      requesting = false;
      setOpen(null);
    },
    [],
  );
}
