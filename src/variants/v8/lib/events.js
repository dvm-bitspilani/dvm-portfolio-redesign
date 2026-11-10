/** A click the browser should handle itself (new tab / window, download, not the main button):
 *  in-page interceptions (back to top, "you are here") leave these alone. */
export const isModifiedClick = (e) => e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;
