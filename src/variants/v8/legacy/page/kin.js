// /alumni: the companies in the light across the whole page (research/v8-alumni-page-r3.md §3.7, §3.11).
// One module-level store, so the wall, the map and the people light each other without a context:
// the discs read it (CompanyDisc), the people list applies it to its own DOM (data-cos).
// Two layers, so a passing hover never wipes a deliberate choice:
//   base  – the open company (openCompany.js: its branch or sheet is out)
//   hover – a person in the list under the pointer / focus
// The light is `hover ?? base`. Ids are company ids; a merged tier-1 company passes several.
// Also two request channels: a person's company asks the map to bring its disc into view and pin it
// (openCompany.js answers); a pill or a sheet row asks the people list to show a person (Alumni.jsx).

/** @typedef {readonly string[]} Ids */
/** @type {Ids | null} */
let base = null;
/** @type {Ids | null} */
let hover = null;
/** @type {Ids | null} */
let lit = null;
/** @type {Set<(ids: Ids | null) => void>} */
const subs = new Set();

/** @param {string | readonly string[] | null | undefined} x @returns {Ids | null} */
const norm = (x) => (x == null ? null : typeof x === "string" ? [x] : x.length ? x : null);
const same = (a, b) => a === b || (!!a && !!b && a.length === b.length && a.every((v, i) => v === b[i]));

function emit() {
  const next = hover ?? base;
  if (same(next, lit)) return;
  lit = next;
  for (const f of subs) f(lit);
}

/** The open company (persists while its people are out). */
export const setKinBase = (/** @type {string | readonly string[] | null} */ id) => {
  base = norm(id);
  emit();
};
/** A transient hover / focus (a person); null hands the light back to the base. */
export const setKinHover = (/** @type {string | readonly string[] | null} */ id) => {
  hover = norm(id);
  emit();
};
/** @param {(ids: Ids | null) => void} f @returns {() => void} unsubscribe */
export const onKin = (f) => {
  subs.add(f);
  return () => {
    subs.delete(f);
  };
};
export const getKin = () => lit;

/* ---- "show this company on the map" (openCompany.js registers) */
/** @type {((id: string) => void) | null} */
let starHandler = null;
/** One handler per page. @param {((id: string) => void) | null} f */
export const onStarRequest = (f) => {
  starHandler = f;
  return () => {
    if (starHandler === f) starHandler = null;
  };
};
/** Scroll the map to a company's disc and pin it. */
export const requestStar = (/** @type {string} */ id) => starHandler?.(id);

/* ---- "show this person in the list" */
/** @type {((slug: string) => void) | null} */
let personHandler = null;
/** @param {((slug: string) => void) | null} f */
export const onPersonRequest = (f) => {
  personHandler = f;
  return () => {
    if (personHandler === f) personHandler = null;
  };
};
/** Scroll the people section to a person and pulse them. */
export const requestPerson = (/** @type {string} */ slug) => personHandler?.(slug);
