// /alumni · Companies: the sector map's geometry (research/v8-legacy-companies-viz.md §2; round 3:
// research/v8-alumni-page-r3.md §3.5). Pure and deterministic.
//   lattice        – the companies of one sector on a strict grid (exact columns and rows, one disc size)
//   balanceColumns – sectors into panel columns, each to the currently shortest column
//   placePanels    – the same, as positions (DOM order = reading order)
//
// Self-check (node): latticeCols(387) = 4 (1440: cell 96.8); latticeCols(420) = 4 (1024);
// latticeCols(328) = 4 (390: cell 82, rows 100); lattice(15, 387) → cols 4, rows 4, height 432;
// balanceColumns(SECTOR_GROUPS, 3, () => 4) →
// [Big Tech, Software, Research] [AI, Consumer, Consulting] [Banks, Fintech, Hardware].

export const MIN_CELL = 96;
/** Below this box width (phones) a cell may be as narrow as NARROW_CELL. */
export const NARROW_W = 360;
export const NARROW_CELL = 76;
/** A row: the disc (48, 6 from the top), the name (≤ 2 lines) and the count line. */
export const ROW_H = 108;
/** Phones (a box narrower than NARROW_W): the names a size down, so the row is shorter. */
export const ROW_H_NARROW = 100;
/** The row height for a lattice box `W` px wide. */
export const rowH = (W) => (W < NARROW_W ? ROW_H_NARROW : ROW_H);
/** The disc centre's distance from its row's top. */
export const DISC_Y = 30;
/** Every disc on the map. */
export const DISC = 48;
/** A panel's side padding (px): less on phones, where the width is the discs'. */
export const panelPad = (vw) => (vw < 760 ? 10 : 16);
/** A panel's head (20) and the gap under it (16): legacyPage.module.css .panelHead. */
export const HEAD = 36;
/** The panel's vertical padding (13 + 13) and its two borders. */
export const PAD = 28;

/** Lattice columns for a box `W` px wide. */
export const latticeCols = (W) => Math.max(3, Math.min(6, Math.floor(W / (W < NARROW_W ? NARROW_CELL : MIN_CELL))));

/**
 * The cells of one sector: `ids` in reading order (COMPANIES order: alumni desc), row by row, the
 * last row left-aligned.
 * @param {number | string[]} idsOrN  the ids (or just a count, for the self-check)
 * @param {number} W  the lattice box's width
 */
export function lattice(idsOrN, W) {
  const ids = typeof idsOrN === "number" ? Array.from({ length: idsOrN }, (_, i) => `#${i}`) : idsOrN;
  const cols = latticeCols(W);
  const cellW = W / cols;
  const rows = Math.ceil(ids.length / cols);
  const rh = rowH(W);
  const cells = ids.map((id, i) => ({ id, r: Math.floor(i / cols), c: i % cols }));
  return { cols, cellW, rows, rowH: rh, height: rows * rh, cells };
}

/**
 * Sectors into `panelCols` columns, in order, each to the currently shortest column (ties → the
 * lowest index), by estimated height HEAD + rows × rh + PAD.
 * @template {{ count: number }} G
 * @param {readonly G[]} groups
 * @param {number} panelCols
 * @param {(g: G) => number} latticeColsOf
 * @param {number} [rh] the row height
 * @returns {{ group: G, i: number }[][]}  i = the group's index in `groups`
 */
export function balanceColumns(groups, panelCols, latticeColsOf, rh = ROW_H) {
  const cols = Array.from({ length: panelCols }, () => /** @type {{ group: G, i: number }[]} */ ([]));
  const h = new Array(panelCols).fill(0);
  groups.forEach((group, i) => {
    let k = 0;
    for (let j = 1; j < panelCols; j++) if (h[j] < h[k]) k = j;
    cols[k].push({ group, i });
    h[k] += panelHeight(group.count, latticeColsOf(group), rh);
  });
  return cols;
}

/** A panel's height (border box): head, its rows, padding and borders. */
export const panelHeight = (n, cols, rh = ROW_H) => HEAD + Math.ceil(n / cols) * rh + PAD;

/**
 * balanceColumns, as positions: every group's column and top, in `groups` order. The greedy fill
 * puts each group in the column whose bottom is highest, so the tops never decrease in `groups`
 * order: the DOM (groups order) is the reading order.
 * @template {{ count: number }} G
 * @param {readonly G[]} groups
 * @param {number} panelCols
 * @param {(g: G) => number} latticeColsOf
 * @param {number} gap  between panels in a column
 * @param {number} [rh] the row height
 */
export function placePanels(groups, panelCols, latticeColsOf, gap, rh = ROW_H) {
  const panels = /** @type {{ group: G, i: number, col: number, top: number, height: number }[]} */ (new Array(groups.length));
  let height = 0;
  balanceColumns(groups, panelCols, latticeColsOf, rh).forEach((col, k) => {
    let y = 0;
    for (const { group, i } of col) {
      const h = panelHeight(group.count, latticeColsOf(group), rh);
      panels[i] = { group, i, col: k, top: y, height: h };
      y += h + gap;
    }
    height = Math.max(height, y - gap);
  });
  return { panels, height };
}
